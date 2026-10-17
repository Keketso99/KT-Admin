// =========================================================
// KT ADMIN — PHONE BACK BUTTON
//
// The Android back button / swipe-back now works inside the app instead of
// closing it. Each press does ONE thing, in this order:
//   1. closes the top-most open pop-up (dialog, modal, sheet)
//   2. closes the side menu
//   3. leaves an open support chat (back to the chat list)
//   4. goes to the page you were on before
//   5. on the first page: "Press back again to exit", and a second press
//      within 2.5 seconds closes the app.
// Sign-in / security screens that cannot be dismissed ignore the back button.
// =========================================================

(function(){

    var stack = [];            // pages visited, last = current
    var going = false;         // true while going back (so it is not recorded)
    var guardOn = false;
    var lastExitTry = 0;

    function visible(el){
        if(!el) return false;
        var s = window.getComputedStyle(el);
        return s.display !== "none" && s.visibility !== "hidden";
    }

    function appShown(){
        var app = document.getElementById("admin-app");
        return !!(app && app.style.display !== "none" && visible(app));
    }

    // Click the pop-up's own close / cancel button so the page can clean up.
    function pressClose(box){
        var btn = box.querySelector(
            '.close-modal, .close-btn, .media-modal-close, .cancel-btn, .cancel-rate-btn, .notification-cancel-btn, ' +
            '[onclick*="close"], [onclick*="Close"], [onclick*="cancel"], [onclick*="Cancel"]'
        );
        if(btn){ btn.click(); return true; }
        return false;
    }

    function lastVisible(list){
        var found = null;
        Array.prototype.forEach.call(list, function(n){ if(visible(n)) found = n; });
        return found;
    }

    function closePopup(){

        // 1. KT dialogs (alert / confirm / prompt)
        var dlg = lastVisible(document.querySelectorAll(".kt-ui-overlay"));
        if(dlg){
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
            // if the dialog cannot be cancelled it stays; either way the press is used
            return true;
        }

        // 2. security screens: only the ones with a Cancel button can be left
        var sec = lastVisible(document.querySelectorAll(".kt-mfa-overlay"));
        if(sec){
            var links = sec.querySelectorAll("button.kt-mfa-link");
            Array.prototype.forEach.call(links, function(b){
                if(/^(cancel|close|back)/i.test((b.textContent || "").trim())) b.click();
            });
            return true;
        }

        // 3. support chat pop-ups
        var sc = lastVisible(document.querySelectorAll(".support-modal-overlay:not(.hidden)"));
        if(sc){
            if(!pressClose(sc)) sc.classList.add("hidden");
            return true;
        }

        // 4. other page modals (names ending in "-modal", shown on top of the page)
        var modals = document.querySelectorAll('#admin-body [class$="-modal"]');
        var top = null;
        Array.prototype.forEach.call(modals, function(m){
            if(window.getComputedStyle(m).position === "fixed" && visible(m)) top = m;
        });
        if(top){
            if(!pressClose(top)){
                top.style.display = "none";     // same as tapping the blurred backdrop
            }
            return true;
        }

        return false;
    }

    function handleBack(){

        if(!appShown()) return false;           // signed-out: let the phone leave

        if(closePopup()) return true;

        var sb = document.getElementById("sidebar");
        if(sb && sb.classList.contains("show") && typeof closeSidebar === "function"){
            closeSidebar();
            return true;
        }

        var chatMain = document.getElementById("chatMain");
        if(chatMain && chatMain.classList.contains("chat-open") && typeof closeChat === "function"){
            closeChat();
            return true;
        }

        if(stack.length > 1){
            stack.pop();
            var prev = stack[stack.length - 1];
            going = true;
            try{ window.loadAdminPage(prev); } finally { going = false; }
            return true;
        }

        // first page: ask once, then exit
        var now = Date.now();
        if(now - lastExitTry < 2500) return false;
        lastExitTry = now;
        if(window.KTUI && KTUI.info) KTUI.info("Press back again to exit", 2200);
        return true;
    }

    function onPop(){
        var st = history.state;
        if(st && st.ktGuard) return;            // moved onto the guard entry itself

        if(handleBack()){
            history.pushState({ ktGuard: true }, "");   // put the guard back
        } else {
            history.back();                              // really leave
        }
    }

    function installGuard(){
        if(guardOn) return;
        guardOn = true;
        try{
            history.pushState({ ktGuard: true }, "");
            window.addEventListener("popstate", onPop);
        }catch(e){ guardOn = false; }
    }

    // Record every page opened, and switch the guard on after the first one.
    function wrapLoader(){
        var original = window.loadAdminPage;
        if(typeof original !== "function" || original._ktBack) return;

        var wrapped = function(page){
            if(!going){
                if(stack[stack.length - 1] !== page){
                    // coming back to a page already in the trail: cut the trail there
                    var at = stack.lastIndexOf(page);
                    if(at !== -1) stack.length = at + 1; else stack.push(page);
                }
            }
            installGuard();
            return original.apply(this, arguments);
        };
        wrapped._ktBack = true;
        window.loadAdminPage = wrapped;
    }

    // Sign-out (or a fresh sign-in) starts a new trail.
    window.ktBackReset = function(){ stack = []; lastExitTry = 0; };

    wrapLoader();

})();
