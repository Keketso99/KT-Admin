// =========================================================
// KT ADMIN — EVERY MODAL ALWAYS STARTS AT THE TOP
//
// Whenever any modal opens OR closes, its scroll position (and the scroll of
// everything scrollable inside it) is reset to 0, so a modal never reopens
// half-way down from last time.
//
// No per-page code is needed: any element whose class contains "modal"
// (or whose id contains "modal") is watched automatically, including modals
// on pages that are loaded later. To keep a scroll area out of this (for
// example a chat list that must stay at the newest message) give it
// the attribute  data-keep-scroll.
// =========================================================
(function(){
    "use strict";
    if(window.__ktModalScroll) return;
    window.__ktModalScroll = true;

    var SELECTOR = '[class*="modal"],[id*="modal"]';
    var state = new WeakMap();     // element -> was it open the last time we looked?

    function isOpen(el){
        try{
            var cs = getComputedStyle(el);
            return cs.display !== "none" &&
                   cs.visibility !== "hidden" &&
                   parseFloat(cs.opacity) > 0.01 &&
                   el.getClientRects().length > 0;
        }catch(e){ return false; }
    }

    function skip(el){
        return el.id === "messages" || el.hasAttribute("data-keep-scroll") ||
               (el.closest && el.closest("[data-keep-scroll]"));
    }

    function toTop(el){
        if(!skip(el) && el.scrollTop !== 0) el.scrollTop = 0;
        var all = el.getElementsByTagName("*");
        for(var i = 0; i < all.length; i++){
            var c = all[i];
            if(c.scrollTop !== 0 && !skip(c)) c.scrollTop = 0;
        }
    }

    function check(el){
        if(!el || !el.isConnected) return;
        var now = isOpen(el);
        var was = state.get(el);
        if(was === now) return;
        state.set(el, now);
        if(was === undefined && !now) return;   // first sight and hidden: nothing to do
        toTop(el);
    }

    // A modal toggles by class/style, sometimes with a fade; look right away
    // (before the browser paints) and again after typical transitions finish.
    var pending = new Set();
    function schedule(el){
        check(el);
        pending.add(el);
        if(schedule.t) return;
        schedule.t = true;
        requestAnimationFrame(function(){ pending.forEach(check); });
        [120, 400, 800].forEach(function(ms){
            setTimeout(function(){ pending.forEach(check); }, ms);
        });
        setTimeout(function(){ pending.clear(); schedule.t = false; }, 850);
    }

    function baseline(root){
        if(root.nodeType !== 1) return;
        if(root.matches(SELECTOR)){ state.set(root, false); schedule(root); }
        var list = root.querySelectorAll(SELECTOR);
        for(var i = 0; i < list.length; i++){ state.set(list[i], false); schedule(list[i]); }
    }

    function start(){
        // modals already on the page: remember whether they are open right now
        var cur = document.querySelectorAll(SELECTOR);
        for(var i = 0; i < cur.length; i++) state.set(cur[i], isOpen(cur[i]));

        new MutationObserver(function(muts){
            for(var i = 0; i < muts.length; i++){
                var m = muts[i];
                if(m.type === "attributes"){
                    var t = m.target;
                    if(t.nodeType === 1 && t.matches(SELECTOR)) schedule(t);
                }else{
                    for(var j = 0; j < m.addedNodes.length; j++) baseline(m.addedNodes[j]);
                }
            }
        }).observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ["class", "style", "hidden", "open"]
        });

        // fades that end without another class/style change
        document.addEventListener("transitionend", function(e){
            var t = e.target;
            if(t && t.nodeType === 1 && t.matches && t.matches(SELECTOR)) check(t);
        }, true);
    }

    if(document.body) start();
    else document.addEventListener("DOMContentLoaded", start);
})();
