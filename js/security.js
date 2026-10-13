// KT Admin Panel — sign-in security
//  1. Two-step sign-in (authenticator app code) after the password.
//  2. Automatic sign-out after a period of inactivity.

var KTSecurity = (function(){

    var IDLE_MS = 30 * 60 * 1000;      // sign out after 30 minutes of no activity
    var lastActive = Date.now();
    var idleTimer = null;
    var idleRunning = false;

    // ------------------------------------------------------------------
    // Inactivity sign-out
    // ------------------------------------------------------------------
    function bump(){ lastActive = Date.now(); }

    function idleCheck(){
        if(!idleRunning) return;
        if(Date.now() - lastActive > IDLE_MS){ idleLogout(); }
    }

    function startIdle(){
        if(idleRunning) return;
        idleRunning = true;
        lastActive = Date.now();
        ["pointerdown", "keydown", "touchstart", "scroll", "mousemove"].forEach(function(ev){
            window.addEventListener(ev, bump, { passive: true, capture: true });
        });
        document.addEventListener("visibilitychange", idleCheck);
        idleTimer = setInterval(idleCheck, 15000);
    }

    function stopIdle(){
        idleRunning = false;
        if(idleTimer){ clearInterval(idleTimer); idleTimer = null; }
        ["pointerdown", "keydown", "touchstart", "scroll", "mousemove"].forEach(function(ev){
            window.removeEventListener(ev, bump, { capture: true });
        });
        document.removeEventListener("visibilitychange", idleCheck);
    }

    async function idleLogout(){
        stopIdle();
        try{ await sb.rpc("admin_record_logout"); }catch(e){}
        try{ sessionStorage.setItem("kt_idle_logout", "1"); }catch(e){}
        try{ await sb.auth.signOut(); }catch(e){}
        location.reload();
    }

    function takeIdleNotice(){
        try{
            if(sessionStorage.getItem("kt_idle_logout") === "1"){
                sessionStorage.removeItem("kt_idle_logout");
                return "You were signed out because of inactivity.";
            }
        }catch(e){}
        return null;
    }

    // ------------------------------------------------------------------
    // Two-step sign-in
    // ------------------------------------------------------------------
    function el(tag, cls, text){
        var n = document.createElement(tag);
        if(cls) n.className = cls;
        if(text) n.textContent = text;
        return n;
    }

    // Shows the code screen. Resolves true when verified, false if cancelled.
    function codeScreen(opts){
        return new Promise(function(resolve){
            var wrap = el("div", "kt-mfa-overlay");
            var card = el("div", "kt-mfa-card");
            card.appendChild(el("i", "fa-solid fa-shield-halved kt-mfa-icon"));
            card.appendChild(el("h2", "", "Two-step verification"));
            card.appendChild(el("p", "kt-mfa-text", opts.intro));

            if(opts.qr){
                var img = el("img", "kt-mfa-qr");
                img.alt = "QR code";
                img.src = opts.qr;
                card.appendChild(img);
                card.appendChild(el("p", "kt-mfa-small", "Can't scan? Enter this key in your app:"));
                card.appendChild(el("div", "kt-mfa-secret", opts.secret || ""));
            }

            var input = el("input", "kt-mfa-input");
            input.type = "text";
            input.inputMode = "numeric";
            input.autocomplete = "one-time-code";
            input.maxLength = 6;
            input.placeholder = "6-digit code";
            card.appendChild(input);

            var err = el("p", "kt-mfa-error");
            card.appendChild(err);

            var ok = el("button", "kt-mfa-btn", opts.okText || "Verify");
            ok.type = "button";
            card.appendChild(ok);

            if(opts.skipText){
                var skip = el("button", "kt-mfa-link", opts.skipText);
                skip.type = "button";
                skip.onclick = function(){ close(true); };
                card.appendChild(skip);
            }
            var cancel = el("button", "kt-mfa-link", "Cancel and sign out");
            cancel.type = "button";
            cancel.onclick = function(){ close(false); };
            card.appendChild(cancel);

            wrap.appendChild(card);
            document.body.appendChild(wrap);
            setTimeout(function(){ try{ input.focus(); }catch(e){} }, 50);

            function close(result){
                if(wrap.parentNode) wrap.parentNode.removeChild(wrap);
                resolve(result);
            }

            input.addEventListener("input", function(){
                input.value = input.value.replace(/\D/g, "").slice(0, 6);
                err.textContent = "";
            });
            input.addEventListener("keydown", function(e){
                if(e.key === "Enter"){ e.preventDefault(); submit(); }
            });
            ok.onclick = submit;

            function submit(){
                var code = input.value.trim();
                if(code.length !== 6){ err.textContent = "Enter the 6-digit code."; return; }
                var done = KTUI.busy(ok, "Checking...");
                Promise.resolve(opts.verify(code)).then(function(good){
                    done();
                    if(good){ close(true); }
                    else { err.textContent = "That code is not correct. Try again."; input.value = ""; input.focus(); }
                }).catch(function(){
                    done();
                    err.textContent = "Could not check the code. Try again.";
                });
            }
        });
    }

    // Returns true when the admin may continue, false when they backed out.
    async function mfaGate(){
        try{
            var aal = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
            if(aal.error) throw aal.error;
            if(aal.data.currentLevel === "aal2") return true;

            if(typeof ktHideSplash === "function") ktHideSplash();

            var list = await sb.auth.mfa.listFactors();
            if(list.error) throw list.error;
            var verified = (list.data.totp || [])[0];

            // Already set up: ask for the code.
            if(verified){
                return await codeScreen({
                    intro: "Open your authenticator app and enter the 6-digit code for KT Admin.",
                    verify: function(code){
                        return sb.auth.mfa.challengeAndVerify({ factorId: verified.id, code: code })
                            .then(function(r){ return !r.error; });
                    }
                });
            }

            // First time: remove any half-finished set-up, then enroll.
            var all = (list.data.all || []);
            for(var i = 0; i < all.length; i++){
                if(all[i].status !== "verified"){
                    try{ await sb.auth.mfa.unenroll({ factorId: all[i].id }); }catch(e){}
                }
            }
            var enr = await sb.auth.mfa.enroll({
                factorType: "totp",
                friendlyName: "KT Admin " + new Date().toISOString().slice(0, 10)
            });
            if(enr.error) throw enr.error;

            return await codeScreen({
                intro: "For extra safety, set up two-step sign-in. Scan this QR code with Google Authenticator, Microsoft Authenticator or Authy, then enter the 6-digit code it shows.",
                qr: enr.data.totp.qr_code,
                secret: enr.data.totp.secret,
                okText: "Turn on",
                verify: function(code){
                    return sb.auth.mfa.challengeAndVerify({ factorId: enr.data.id, code: code })
                        .then(function(r){ return !r.error; });
                }
            });
        }catch(e){
            console.warn("[KTSecurity] two-step sign-in unavailable:", e);
            // Could not start two-step sign-in (for example it is switched off
            // for the project). Let the admin in; the database enforces it
            // separately once it has been switched on.
            await KTUI.alert("Two-step sign-in could not be started right now. You can continue, but set it up as soon as possible.", { title: "Two-step sign-in", type: "info", okText: "Continue" });
            return true;
        }
    }

    // Stop the inactivity timer whenever the session ends.
    if(window.sb && sb.auth && sb.auth.onAuthStateChange){
        sb.auth.onAuthStateChange(function(event){
            if(event === "SIGNED_OUT"){ stopIdle(); }
        });
    }

    return {
        mfaGate: mfaGate,
        startIdle: startIdle,
        stopIdle: stopIdle,
        takeIdleNotice: takeIdleNotice
    };
})();
