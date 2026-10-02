// =========================================================
// KT ADMIN — LIVE UPDATES (realtime)
// One shared Supabase Realtime connection for the whole panel.
//
//  - Pages register a refresh function:  KTRealtime.register(page, tables, fn)
//  - When a watched table changes, the current page refreshes itself
//    (debounced, never while a modal is open, so nothing you are working
//    on is disturbed).
//  - Sidebar badges (pending counts + unread support) stay live.
//  - New requests pop a small toast (+ optional beep).
//  - After a dropped connection / phone sleep, everything refetches once.
//
// Loaded after supabase-client.js. Requires `sb` and `loadAdminPage`.
// =========================================================

(function(){

    var WATCHED_TABLES = [
        "deposits",
        "withdrawals",
        "kyc_submissions",
        "account_reset_requests",
        "profile_signals",
        "transactions",
        "activity_log",
        "exchange_rates",
        "plans",
        "support_messages",
        "support_conversations"
    ];

    var REFRESH_DELAY_MS  = 700;
    var MODAL_RETRY_MS    = 2000;
    var BADGE_DELAY_MS    = 900;
    var HEARTBEAT_MS      = 60000;
    var HIDDEN_REFRESH_MS = 20000;

    var channel = null;
    var started = false;
    var everSubscribed = false;
    var wasDown = false;

    var currentPage = null;
    var current = null;               // { tables: [], fn: function }
    var refreshTimer = null;
    var badgeTimer = null;
    var heartbeat = null;
    var hiddenAt = 0;

    // ---------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------

    function modalOpen(){
        var overlay = document.getElementById("modal-overlay");
        if(overlay && overlay.classList.contains("show")) return true;
        // settings-style self-managed modals
        return !!document.querySelector("#admin-body .settings-modal.active, #admin-body .modal.active");
    }

    function safeCall(fn){
        try{ return fn(); }catch(e){ console.warn("[KTRealtime]", e); }
    }

    // ---------------------------------------------------------
    // Page refresh
    // ---------------------------------------------------------

    function runPageRefresh(){
        refreshTimer = null;
        if(!current || typeof current.fn !== "function") return;

        if(modalOpen()){
            refreshTimer = setTimeout(runPageRefresh, MODAL_RETRY_MS);
            return;
        }

        safeCall(current.fn);
    }

    function schedulePageRefresh(){
        if(refreshTimer) return;               // already queued (throttle, not debounce)
        refreshTimer = setTimeout(runPageRefresh, REFRESH_DELAY_MS);
    }

    // ---------------------------------------------------------
    // Sidebar badges (pending counts + unread support)
    // ---------------------------------------------------------

    var BADGE_STYLE_ID = "kt-live-style";

    function injectStyles(){
        if(document.getElementById(BADGE_STYLE_ID)) return;
        var css =
        ".kt-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;margin-left:8px;border-radius:9px;background:#e53935;color:#fff;font-size:11px;font-weight:700;line-height:1;vertical-align:middle}" +
        "#kt-live-toasts{position:fixed;top:calc(env(safe-area-inset-top,0px) + 64px);right:10px;left:10px;display:flex;flex-direction:column;align-items:flex-end;gap:8px;z-index:100000;pointer-events:none}" +
        ".kt-toast{pointer-events:auto;max-width:340px;width:100%;background:#0f1b33;color:#fff;border-left:4px solid #1b8ef2;border-radius:10px;padding:10px 14px;box-shadow:0 6px 20px rgba(0,0,0,.35);font-size:13px;cursor:pointer;opacity:0;transform:translateY(-8px);transition:opacity .2s,transform .2s}" +
        ".kt-toast.show{opacity:1;transform:translateY(0)}" +
        ".kt-toast b{display:block;font-size:13px;margin-bottom:2px}" +
        ".kt-toast span{opacity:.8;font-size:12px}" +
        "#kt-sound-toggle{margin-left:12px;cursor:pointer}";
        var style = document.createElement("style");
        style.id = BADGE_STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function menuItemFor(page){
        var needle = "loadAdminPage('" + page + "')";
        var items = document.querySelectorAll(".side-item, .submenu div");
        for(var i = 0; i < items.length; i++){
            var oc = items[i].getAttribute("onclick");
            if(oc && oc.indexOf(needle) !== -1) return items[i];
        }
        return null;
    }

    function setBadge(page, count){
        var item = menuItemFor(page);
        if(!item) return;
        var badge = item.querySelector(":scope > .kt-badge");
        if(!count || count < 1){
            if(badge) badge.remove();
            return;
        }
        if(!badge){
            badge = document.createElement("span");
            badge.className = "kt-badge";
            item.appendChild(badge);
        }
        badge.textContent = count > 99 ? "99+" : String(count);
    }

    function refreshBadges(){
        badgeTimer = null;
        if(typeof sb === "undefined") return;

        sb.rpc("get_pending_counts").then(function(res){
            if(res.error || !res.data || !res.data[0]) return;
            var r = res.data[0];
            setBadge("deposits",     r.deposits_pending     || 0);
            setBadge("withdrawals",  r.withdrawals_pending  || 0);
            setBadge("verification", (r.kyc_pending || 0) + (r.kyc_resets_pending || 0));
            setBadge("users",        (r.password_resets_pending || 0) +
                                     (r.pin_resets_pending || 0) +
                                     (r.change_requests_pending || 0) +
                                     (r.unblock_requests_pending || 0));
        });

        sb.rpc("admin_list_support_conversations").then(function(res){
            if(res.error || !res.data) return;
            var unread = 0;
            res.data.forEach(function(row){ unread += (row.unread_count || 0); });
            setBadge("support-chat", unread);
        });
    }

    function scheduleBadges(){
        if(badgeTimer) return;
        badgeTimer = setTimeout(refreshBadges, BADGE_DELAY_MS);
    }

    // ---------------------------------------------------------
    // Toasts + sound
    // ---------------------------------------------------------

    var audioCtx = null;

    function soundOn(){
        try{ return localStorage.getItem("kt.admin.sound") !== "off"; }catch(e){ return true; }
    }

    function beep(){
        if(!soundOn()) return;
        try{
            var AC = window.AudioContext || window.webkitAudioContext;
            if(!AC) return;
            if(!audioCtx) audioCtx = new AC();
            if(audioCtx.state === "suspended") audioCtx.resume();
            var o = audioCtx.createOscillator();
            var g = audioCtx.createGain();
            o.type = "sine";
            o.frequency.value = 880;
            g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
            o.connect(g); g.connect(audioCtx.destination);
            o.start();
            o.stop(audioCtx.currentTime + 0.27);
        }catch(e){}
    }

    function toast(title, text, page){
        injectStyles();
        var wrap = document.getElementById("kt-live-toasts");
        if(!wrap){
            wrap = document.createElement("div");
            wrap.id = "kt-live-toasts";
            document.body.appendChild(wrap);
        }
        var el = document.createElement("div");
        el.className = "kt-toast";
        var b = document.createElement("b"); b.textContent = title;
        var s = document.createElement("span"); s.textContent = text || "";
        el.appendChild(b); el.appendChild(s);
        el.addEventListener("click", function(){
            if(page && typeof loadAdminPage === "function") loadAdminPage(page);
            el.remove();
        });
        wrap.appendChild(el);
        requestAnimationFrame(function(){ el.classList.add("show"); });
        setTimeout(function(){
            el.classList.remove("show");
            setTimeout(function(){ el.remove(); }, 250);
        }, 6000);
        while(wrap.children.length > 3) wrap.removeChild(wrap.firstChild);
        beep();
    }

    function installSoundToggle(){
        if(document.getElementById("kt-sound-toggle")) return;
        var logout = document.getElementById("logout-btn");
        if(!logout || !logout.parentNode) return;
        var i = document.createElement("i");
        i.id = "kt-sound-toggle";
        i.title = "Toggle alert sound";
        function paint(){
            i.className = "fa-solid " + (soundOn() ? "fa-volume-high" : "fa-volume-xmark");
        }
        paint();
        i.addEventListener("click", function(){
            try{ localStorage.setItem("kt.admin.sound", soundOn() ? "off" : "on"); }catch(e){}
            paint();
            if(soundOn()) beep();
        });
        logout.parentNode.insertBefore(i, logout);
    }

    function announce(table, payload){
        if(payload.eventType !== "INSERT") return;
        var row = payload.new || {};

        if(table === "deposits"){
            toast("New deposit request", "A user submitted a deposit.", "deposits");
        } else if(table === "withdrawals"){
            toast("New withdrawal request", "A user submitted a withdrawal.", "withdrawals");
        } else if(table === "kyc_submissions"){
            toast("New verification request", "A user submitted KYC documents.", "verification");
        } else if(table === "account_reset_requests"){
            if(row.kind === "password")      toast("Password reset request", "A user needs a password reset.", "users");
            else if(row.kind === "pin")      toast("PIN reset request", "A user needs a withdrawal PIN reset.", "users");
            else if(row.kind === "kyc")      toast("KYC resubmission request", "A user asked to resubmit KYC.", "verification");
            else if(row.kind === "unblock")  toast("Reactivation request", "A blocked user asked to be reactivated.", "users");
        } else if(table === "support_messages"){
            if(row.sender_type === "user" && currentPage !== "support-chat"){
                toast("New support message", "A user sent you a message.", "support-chat");
            }
        }
    }

    // ---------------------------------------------------------
    // Event routing
    // ---------------------------------------------------------

    function onChange(table, payload){
        safeCall(function(){ announce(table, payload); });
        scheduleBadges();

        if(current && current.tables.indexOf(table) !== -1){
            schedulePageRefresh();
        }
    }

    function fullResync(){
        scheduleBadges();
        if(current) schedulePageRefresh();
    }

    // ---------------------------------------------------------
    // Connection
    // ---------------------------------------------------------

    function start(){
        if(started || typeof sb === "undefined") return;
        started = true;

        injectStyles();
        installSoundToggle();

        channel = sb.channel("kt-admin-live");

        WATCHED_TABLES.forEach(function(table){
            channel.on(
                "postgres_changes",
                { event: "*", schema: "public", table: table },
                function(payload){ onChange(table, payload); }
            );
        });

        channel.subscribe(function(status){
            if(status === "SUBSCRIBED"){
                if(everSubscribed && wasDown) fullResync();   // reconnected: catch up
                everSubscribed = true;
                wasDown = false;
                scheduleBadges();
            } else if(status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED"){
                wasDown = true;
            }
        });

        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("online", fullResync);

        heartbeat = setInterval(function(){
            if(!document.hidden) scheduleBadges();
        }, HEARTBEAT_MS);
    }

    function onVisibility(){
        if(document.hidden){
            hiddenAt = Date.now();
            return;
        }
        if(hiddenAt && Date.now() - hiddenAt > HIDDEN_REFRESH_MS){
            fullResync();
        }
        hiddenAt = 0;
    }

    function stop(){
        if(!started) return;
        started = false;
        everSubscribed = false;
        wasDown = false;
        try{ if(channel) sb.removeChannel(channel); }catch(e){}
        channel = null;
        clearTimeout(refreshTimer); refreshTimer = null;
        clearTimeout(badgeTimer);   badgeTimer = null;
        clearInterval(heartbeat);   heartbeat = null;
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("online", fullResync);
        document.querySelectorAll(".kt-badge").forEach(function(b){ b.remove(); });
    }

    // ---------------------------------------------------------
    // Page registration
    // ---------------------------------------------------------

    function setPage(page){
        currentPage = page;
        current = null;                   // cleared until the page registers
        clearTimeout(refreshTimer);
        refreshTimer = null;
    }

    function register(page, tables, fn){
        currentPage = page;
        current = { tables: tables || [], fn: fn };
    }

    window.KTRealtime = {
        start: start,
        stop: stop,
        setPage: setPage,
        register: register,
        toast: toast
    };

    // Safety net: if the admin signs out by any route, tear down.
    if(typeof sb !== "undefined" && sb.auth && sb.auth.onAuthStateChange){
        sb.auth.onAuthStateChange(function(event){
            if(event === "SIGNED_OUT") stop();
        });
    }

})();
