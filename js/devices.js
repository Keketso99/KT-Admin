// =========================================================
// KT ADMIN — APPROVED-DEVICE CHECK
//
// After password + authenticator code, the database is asked whether this
// browser/app is an approved device. Unknown devices are saved as "pending"
// and wait for the MAIN ADMIN (Settings > Trusted Devices).
//
// The device secret is a long random value kept on this device only; the
// database stores just its fingerprint. The real enforcement is in the
// database (has_role), this file only shows the right screen.
// =========================================================

(function(){

    var KEY = "kt_admin_device_secret";
    var memorySecret = null;
    var watchTimer = null;

    function randomSecret(){
        var bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        var out = "";
        for(var i = 0; i < bytes.length; i++){
            out += ("0" + bytes[i].toString(16)).slice(-2);
        }
        return out;
    }

    function getSecret(){
        try{
            var s = localStorage.getItem(KEY);
            if(s && s.length >= 32) return s;
            s = randomSecret();
            localStorage.setItem(KEY, s);
            return s;
        }catch(e){
            if(!memorySecret) memorySecret = randomSecret();
            return memorySecret;
        }
    }

    function resetSecret(){
        var s = randomSecret();
        try{ localStorage.setItem(KEY, s); }catch(e){ memorySecret = s; }
        return s;
    }

    function browserName(){
        var ua = navigator.userAgent || "";
        if(/SamsungBrowser/i.test(ua)) return "Samsung Internet";
        if(/Edg\//i.test(ua)) return "Edge";
        if(/OPR\//i.test(ua)) return "Opera";
        if(/Firefox\//i.test(ua)) return "Firefox";
        if(/; wv\)/i.test(ua)) return "App browser";
        if(/Chrome\//i.test(ua)) return "Chrome";
        if(/Safari\//i.test(ua)) return "Safari";
        return "Browser";
    }

    function callCheck(secret){
        var info = (typeof getAdminClientInfo === "function") ? getAdminClientInfo() : {};
        return sb.rpc("admin_device_check", {
            p_secret: secret,
            p_device_name: info.deviceName || null,
            p_os: info.osName ? (info.osName + (info.osVersion && info.osVersion !== "Unknown" ? " " + info.osVersion : "")) : null,
            p_browser: browserName()
        });
    }

    // -> { status: "approved" | "pending" | "missing" | "error", message? }
    function check(){
        return callCheck(getSecret()).then(function(res){
            if(res.error) return res;
            if(res.data && res.data.status === "rotate"){
                return callCheck(resetSecret());
            }
            return res;
        }).then(function(res){
            if(res.error){
                var msg = String(res.error.message || "");
                if(res.error.code === "PGRST202" || /could not find the function|does not exist/i.test(msg)){
                    return { status: "missing" };
                }
                return { status: "error", message: msg };
            }
            var st = res.data && res.data.status;
            if(st === "locked"){ return { status: "locked", until: res.data.until }; }
            return { status: st === "approved" ? "approved" : "pending" };
        }).catch(function(e){
            return { status: "error", message: (e && e.message) || "Network problem" };
        });
    }

    function el(tag, cls, text){
        var n = document.createElement(tag);
        if(cls) n.className = cls;
        if(text) n.textContent = text;
        return n;
    }

    // Blocking screen for devices that are not approved (yet).
    function waitScreen(first){
        return new Promise(function(resolve){
            var wrap = el("div", "kt-mfa-overlay");
            var card = el("div", "kt-mfa-card");
            card.appendChild(el("i", "fa-solid fa-mobile-screen-button kt-mfa-icon"));
            card.appendChild(el("h2", "", "Device not approved"));
            card.appendChild(el("p", "kt-mfa-text",
                "This device is waiting for approval by the main admin. " +
                "You will be let in automatically once it is approved."));
            var status = el("p", "kt-mfa-error");
            status.style.color = "#4b5563";
            status.textContent = "Waiting for approval...";
            card.appendChild(status);

            var again = el("button", "kt-mfa-btn", "Check again");
            again.type = "button";
            card.appendChild(again);

            var out = el("button", "kt-mfa-link", "Sign out");
            out.type = "button";
            card.appendChild(out);

            wrap.appendChild(card);
            document.body.appendChild(wrap);

            var done = false;
            var timer = null;

            function finish(ok){
                if(done) return;
                done = true;
                clearInterval(timer);
                if(wrap.parentNode) wrap.parentNode.removeChild(wrap);
                resolve(ok);
            }

            function poll(manual){
                if(done) return;
                if(manual){ again.disabled = true; }
                check().then(function(r){
                    if(done) return;
                    again.disabled = false;
                    if(r.status === "approved" || r.status === "missing"){
                        finish(true);
                    }else if(r.status === "error"){
                        status.textContent = "Could not check: " + r.message;
                    }else{
                        status.textContent = manual
                            ? "Still waiting for approval."
                            : "Waiting for approval...";
                    }
                });
            }

            again.onclick = function(){ poll(true); };
            out.onclick = function(){ finish(false); };
            timer = setInterval(function(){ poll(false); }, 6000);
        });
    }

    // Called by the sign-in flow. true = continue into the app.
    function gate(){
        return check().then(function(r){
            if(r.status === "approved" || r.status === "missing") return true;
            if(r.status === "error"){
                return waitScreenError(r.message);
            }
            if(r.status === "locked"){
                return lockedScreen(r.until);
            }
            return waitScreen();
        });
    }

    // Account locked after too many wrong codes
    function lockedScreen(until){
        return new Promise(function(resolve){
            var when = "";
            try{ when = new Date(until).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }catch(e){}
            var wrap = el("div", "kt-mfa-overlay");
            var card = el("div", "kt-mfa-card");
            card.appendChild(el("i", "fa-solid fa-lock kt-mfa-icon"));
            card.appendChild(el("h2", "", "Account locked"));
            card.appendChild(el("p", "kt-mfa-text",
                "Too many wrong codes were entered for this account. It is locked" +
                (when ? " until " + when : " for a while") + ". The main admin can unlock it sooner."));
            var again = el("button", "kt-mfa-btn", "Try again");
            again.type = "button";
            var out = el("button", "kt-mfa-link", "Sign out");
            out.type = "button";
            card.appendChild(again);
            card.appendChild(out);
            wrap.appendChild(card);
            document.body.appendChild(wrap);

            function close(v){
                if(wrap.parentNode) wrap.parentNode.removeChild(wrap);
                resolve(v);
            }
            again.onclick = function(){
                again.disabled = true;
                check().then(function(r){
                    if(r.status === "approved" || r.status === "missing"){ close(true); return; }
                    if(r.status === "pending"){
                        if(wrap.parentNode) wrap.parentNode.removeChild(wrap);
                        waitScreen().then(resolve);
                        return;
                    }
                    again.disabled = false;
                });
            };
            out.onclick = function(){ close(false); };
        });
    }

    // network/other problem while asking: let the admin retry or sign out
    function waitScreenError(message){
        return new Promise(function(resolve){
            var wrap = el("div", "kt-mfa-overlay");
            var card = el("div", "kt-mfa-card");
            card.appendChild(el("i", "fa-solid fa-triangle-exclamation kt-mfa-icon"));
            card.appendChild(el("h2", "", "Could not check this device"));
            card.appendChild(el("p", "kt-mfa-text", message || "Please check your connection and try again."));
            var retry = el("button", "kt-mfa-btn", "Try again");
            retry.type = "button";
            var out = el("button", "kt-mfa-link", "Sign out");
            out.type = "button";
            card.appendChild(retry);
            card.appendChild(out);
            wrap.appendChild(card);
            document.body.appendChild(wrap);

            function close(v){
                if(wrap.parentNode) wrap.parentNode.removeChild(wrap);
                resolve(v);
            }
            retry.onclick = function(){
                retry.disabled = true;
                check().then(function(r){
                    if(r.status === "approved" || r.status === "missing"){ close(true); return; }
                    if(r.status === "pending"){
                        if(wrap.parentNode) wrap.parentNode.removeChild(wrap);
                        waitScreen().then(resolve);
                        return;
                    }
                    retry.disabled = false;
                    card.querySelector(".kt-mfa-text").textContent = r.message || "Still not working.";
                });
            };
            out.onclick = function(){ close(false); };
        });
    }

    // While signed in: if the device is removed, go back to the sign-in flow.
    function startWatch(){
        stopWatch();
        function run(){
            check().then(function(r){
                if(r.status === "pending"){ location.reload(); }
            });
        }
        watchTimer = setInterval(function(){ run(); refreshBadge(); }, 60000);
        document.addEventListener("visibilitychange", onVisible);
    }

    function onVisible(){
        if(document.visibilityState === "visible" && watchTimer){
            check().then(function(r){
                if(r.status === "pending"){ location.reload(); }
            });
        }
    }

    function stopWatch(){
        if(watchTimer){ clearInterval(watchTimer); watchTimer = null; }
        document.removeEventListener("visibilitychange", onVisible);
        hideBanner();
        lastPending = null;
        dismissedKey = "";
    }

    // Main admin: red badge on the sidebar Settings item, a banner, and an alert
    // when a device is waiting for approval, an admin is locked, or the Security
    // log has not been looked at for a week.
    var lastPending = null;
    var dismissedKey = "";
    var WEEK = 7 * 24 * 3600 * 1000;

    function seclogStale(){
        try{
            var seen = Number(localStorage.getItem("kt_seclog_seen"));
            if(!seen){
                // first time on this browser: start the clock now instead of nagging at once
                localStorage.setItem("kt_seclog_seen", String(Date.now()));
                return false;
            }
            return Date.now() - seen > WEEK;
        }catch(e){ return false; }
    }

    function hideBanner(){
        var b = document.getElementById("ktSecBanner");
        if(b) b.remove();
    }

    function showBanner(lines, key){
        if(dismissedKey === key){ hideBanner(); return; }
        var b = document.getElementById("ktSecBanner");
        if(!b){
            b = el("div", "kt-sec-banner");
            b.id = "ktSecBanner";
            document.body.appendChild(b);
        }
        b.innerHTML = "";
        var icon = el("i", "fa-solid fa-shield-halved");
        var txt = el("span", "kt-sec-banner-text", lines.join(" · "));
        var go = el("button", "kt-sec-banner-go", "Review");
        go.type = "button";
        go.onclick = function(){
            if(typeof loadAdminPage === "function") loadAdminPage("settings");
            dismissedKey = key;
            hideBanner();
        };
        var x = el("button", "kt-sec-banner-x", "\u00d7");
        x.type = "button";
        x.setAttribute("aria-label", "Dismiss");
        x.onclick = function(){ dismissedKey = key; hideBanner(); };
        b.appendChild(icon);
        b.appendChild(txt);
        b.appendChild(go);
        b.appendChild(x);
    }

    function refreshBadge(){
        if(!window.KTPerm || !KTPerm.isSuper) return;
        sb.rpc("admin_security_summary").then(function(res){
            if(res.error || !res.data) return;
            var pending = Number(res.data.pending_devices) || 0;
            var locked = (res.data.locked || []).length;
            var stale = seclogStale();
            var n = pending + locked + (stale ? 1 : 0);

            var item = document.getElementById("sideSettingsItem");
            if(item){
                var dot = item.querySelector(".kt-side-dot");
                if(!n){ if(dot) dot.remove(); }
                else{
                    if(!dot){
                        dot = document.createElement("span");
                        dot.className = "kt-side-dot";
                        item.appendChild(dot);
                    }
                    dot.textContent = n > 9 ? "9+" : String(n);
                }
            }

            var lines = [];
            if(pending) lines.push(pending + (pending === 1 ? " device is" : " devices are") + " waiting for approval");
            if(locked) lines.push(locked + (locked === 1 ? " admin is" : " admins are") + " locked");
            if(stale) lines.push("Security log not reviewed for 7 days");
            if(lines.length) showBanner(lines, pending + "|" + locked + "|" + (stale ? 1 : 0));
            else hideBanner();

            // alert (sound + message) when a NEW device shows up
            if(pending > 0 && (lastPending === null || pending > lastPending)){
                if(window.KTUI) KTUI.warning("A new device is waiting for your approval (Settings > Trusted Devices).", 8000);
                if(window.KTSound && KTSound.playAlert) KTSound.playAlert();
            }
            lastPending = pending;
        });
    }

    window.KTDevices = { gate: gate, check: check, startWatch: startWatch, stopWatch: stopWatch, refreshBadge: refreshBadge };

})();
