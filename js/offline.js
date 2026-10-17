// =========================================================
// KT ADMIN — "You're offline" SCREEN (while the app is open)
//
// Covers the app with the same screen as the start-up offline page when the
// connection is lost, and removes it by itself when the connection is back
// (the page underneath keeps its state, nothing is reloaded).
// =========================================================

(function(){

    var overlay = null;
    var timer = null;

    function build(){
        if(overlay) return overlay;

        var css = document.createElement("style");
        css.textContent =
            "#kt-offline{position:fixed;top:0;right:0;bottom:0;left:0;z-index:100000;background:#fff;display:none;" +
            "flex-direction:column;align-items:center;justify-content:center;gap:34px;padding:24px;box-sizing:border-box;" +
            "text-align:center;color:#111827;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}" +
            "#kt-offline.show{display:flex}" +
            "#kt-offline img{width:96px;height:96px;object-fit:contain}" +
            "#kt-offline .kt-off-msg{display:flex;align-items:center;gap:12px;font-size:24px;font-weight:500}" +
            "#kt-offline svg{width:30px;height:30px;flex:none}";
        document.head.appendChild(css);

        overlay = document.createElement("div");
        overlay.id = "kt-offline";
        overlay.setAttribute("role", "alert");
        overlay.innerHTML =
            '<img src="icons/icon-192.png" alt="KT">' +
            '<div class="kt-off-msg">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3"/><path d="m2 2 20 20"/></svg>' +
            "<span>You're offline</span></div>";
        document.body.appendChild(overlay);
        return overlay;
    }

    function show(){
        build().classList.add("show");
        if(!timer) timer = setInterval(probe, 3000);
    }

    function hide(){
        if(overlay) overlay.classList.remove("show");
        if(timer){ clearInterval(timer); timer = null; }
    }

    // The phone can say "online" while there is no real internet, so confirm
    // by reaching our own site before taking the screen away.
    function probe(){
        if(!navigator.onLine) return;
        var ctrl = (typeof AbortController !== "undefined") ? new AbortController() : null;
        var t = ctrl ? setTimeout(function(){ ctrl.abort(); }, 4000) : null;
        fetch("manifest.json?t=" + Date.now(), { cache: "no-store", signal: ctrl ? ctrl.signal : undefined })
            .then(function(r){ if(t) clearTimeout(t); if(r.ok) hide(); })
            .catch(function(){ /* still offline: keep the screen */ });
    }

    function start(){
        window.addEventListener("offline", show);
        window.addEventListener("online", probe);
        if(navigator.onLine === false) show();
    }

    if(document.body) start();
    else document.addEventListener("DOMContentLoaded", start);

})();
