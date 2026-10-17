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
    var PENDING_KEY = "kt_mfa_pending";

    function el(tag, cls, text){
        var n = document.createElement(tag);
        if(cls) n.className = cls;
        if(text) n.textContent = text;
        return n;
    }

    function copyText(text){
        if(navigator.clipboard && navigator.clipboard.writeText){
            return navigator.clipboard.writeText(text);
        }
        return new Promise(function(resolve, reject){
            try{
                var ta = document.createElement("textarea");
                ta.value = text;
                ta.setAttribute("readonly", "");
                ta.style.position = "fixed";
                ta.style.opacity = "0";
                document.body.appendChild(ta);
                ta.select();
                var ok = document.execCommand("copy");
                document.body.removeChild(ta);
                ok ? resolve() : reject();
            }catch(e){ reject(e); }
        });
    }

    // A half-finished set-up is remembered, so leaving the app to open the
    // authenticator and coming back shows the SAME key (not a new one).
    function loadPending(uid){
        try{
            var p = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
            if(p && p.uid === uid && Date.now() - p.t < 24 * 3600 * 1000) return p;
        }catch(e){}
        return null;
    }
    function savePending(p){ try{ localStorage.setItem(PENDING_KEY, JSON.stringify(p)); }catch(e){} }
    function clearPending(){ try{ localStorage.removeItem(PENDING_KEY); }catch(e){} }

    // opts.verify(code) -> Promise<{ok:boolean, message?:string}>
    // Resolves true when verified, false if cancelled.
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

                if(opts.uri){
                    var open = el("a", "kt-mfa-open", "Open in authenticator app");
                    open.href = opts.uri;
                    card.appendChild(open);
                }

                var row = el("div", "kt-mfa-keyrow");
                row.appendChild(el("div", "kt-mfa-secret", (opts.secret || "").replace(/(.{4})/g, "$1 ").trim()));
                var copyBtn = el("button", "kt-mfa-copy");
                copyBtn.type = "button";
                copyBtn.title = "Copy key";
                copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
                copyBtn.onclick = function(){
                    copyText(opts.secret || "").then(function(){
                        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                    }).catch(function(){
                        copyBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                    }).then(function(){
                        setTimeout(function(){ copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>'; }, 1500);
                    });
                };
                row.appendChild(copyBtn);
                card.appendChild(row);
            }

            var input = el("input", "kt-mfa-input");
            input.type = "text";
            input.inputMode = "numeric";
            input.autocomplete = "off";
            input.maxLength = 6;
            input.placeholder = "6-digit code";
            card.appendChild(input);

            var err = el("p", "kt-mfa-error");
            card.appendChild(err);

            var ok = el("button", "kt-mfa-btn", opts.okText || "Verify");
            ok.type = "button";
            card.appendChild(ok);

            var cancel = el("button", "kt-mfa-link", "Cancel");
            cancel.type = "button";
            cancel.onclick = function(){ close(false); };
            card.appendChild(cancel);

            wrap.appendChild(card);
            document.body.appendChild(wrap);
            if(!opts.qr){ setTimeout(function(){ try{ input.focus(); }catch(e){} }, 50); }

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
                Promise.resolve(opts.verify(code)).then(function(r){
                    done();
                    if(r && r.ok){ close(true); return; }
                    if(r && r.locked){
                        err.textContent = r.message;
                        input.disabled = true;
                        ok.disabled = true;
                        setTimeout(function(){ close(false); }, 4000);
                        return;
                    }
                    err.textContent = (r && r.message) || "That code is not correct. Try again.";
                    input.value = "";
                    input.focus();
                }).catch(function(){
                    done();
                    err.textContent = "Could not check the code. Try again.";
                });
            }
        });
    }

    // Local TOTP check, used ONLY to explain why a code was rejected.
    function b32decode(str){
        var A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var bits = "", out = [];
        str = String(str || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
        for(var i = 0; i < str.length; i++){
            bits += ("00000" + A.indexOf(str[i]).toString(2)).slice(-5);
        }
        for(var j = 0; j + 8 <= bits.length; j += 8){ out.push(parseInt(bits.substr(j, 8), 2)); }
        return new Uint8Array(out);
    }

    async function totpAt(secret, counter){
        var key = await crypto.subtle.importKey("raw", b32decode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
        var buf = new ArrayBuffer(8), dv = new DataView(buf);
        dv.setUint32(0, Math.floor(counter / 4294967296));
        dv.setUint32(4, counter >>> 0);
        var h = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
        var o = h[19] & 15;
        var n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
        return ("000000" + (n % 1000000)).slice(-6);
    }

    // true if the code matches the key at this phone's time (+/- one step)
    async function matchesLocally(secret, code){
        try{
            var c = Math.floor(Date.now() / 30000);
            for(var d = -1; d <= 1; d++){
                if(await totpAt(secret, c + d) === code) return true;
            }
        }catch(e){}
        return false;
    }

    // How far the phone's clock is from the server's, using the time stamped
    // inside a freshly issued sign-in token (that is the server's clock).
    async function clockOffsetText(){
        try{
            var r = await sb.auth.refreshSession();
            var tok = r && r.data && r.data.session && r.data.session.access_token;
            if(!tok) return "";
            var b64 = tok.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
            var iat = JSON.parse(atob(b64 + "===".slice((b64.length + 3) % 4))).iat;
            var diff = Math.round(Date.now() / 1000 - iat);          // + = phone ahead
            var a = Math.abs(diff);
            if(a < 20) return "";
            var amount = a < 90 ? a + " seconds"
                : a < 5400 ? Math.round(a / 60) + " minutes"
                : (Math.floor(a / 3600) + " h " + Math.round((a % 3600) / 60) + " min");
            return "Your phone's clock is about " + amount + (diff > 0 ? " ahead of" : " behind") + " the server. ";
        }catch(e){ return ""; }
    }

    function verifyWithRaw(factorId, secret){
        return function(code){
            return sb.auth.mfa.challengeAndVerify({ factorId: factorId, code: code }).then(function(r){
                if(!r.error) return { ok: true };
                var m = String(r.error.message || "");
                if(/invalid|incorrect|expired/i.test(m)){
                    if(secret){
                        return matchesLocally(secret, code).then(async function(same){
                            if(!same){
                                return { invalid: true, ok: false, message: "That code is from a different key. Delete the old KT Admin entries in your authenticator app and add the key shown here." };
                            }
                            var how = await clockOffsetText();
                            return { invalid: true, ok: false, message: how + "In Google Authenticator open the menu, then Settings, then Time correction for codes, then Sync now. This fixes the app only, not your phone's settings. Then enter the next code." };
                        });
                    }
                    return { invalid: true, ok: false, message: "That code is not correct. Wait for the next one and try again." };
                }
                return { ok: false, message: "Could not verify: " + m };
            });
        };
    }

    // Wrong codes at SIGN-IN are reported to the security log; 5 within 15
    // minutes lock that admin for a while. (Not counted during first set-up.)
    function untilText(iso){
        try{ return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }catch(e){ return "later"; }
    }

    function verifyWith(factorId, secret){
        var inner = verifyWithRaw(factorId, secret);
        return function(code){
            return inner(code).then(function(r){
                if(!r || r.ok || !r.invalid || secret){ return r; }
                return sb.rpc("admin_security_event", { p_type: "code_failed" }).then(function(res){
                    var d = res && res.data;
                    if(d && d.locked){
                        return { ok: false, locked: true, message: "Too many wrong codes. This account is locked until " + untilText(d.until) + "." };
                    }
                    return r;
                }, function(){ return r; });
            });
        };
    }

    // Returns true when the admin may continue, false when they backed out.
    async function mfaGate(){
        try{
            var aal = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
            if(aal.error) throw aal.error;
            if(aal.data.currentLevel === "aal2"){ clearPending(); return true; }

            if(typeof ktHideSplash === "function") ktHideSplash();

            var sess = await sb.auth.getSession();
            var uid = sess && sess.data && sess.data.session ? sess.data.session.user.id : null;

            var list = await sb.auth.mfa.listFactors();
            if(list.error) throw list.error;
            var verified = (list.data.totp || [])[0];

            // Already set up: ask for the code.
            if(verified){
                var okv = await codeScreen({
                    intro: "Enter the 6-digit code from your authenticator app.",
                    verify: verifyWith(verified.id)
                });
                if(okv) clearPending();
                return okv;
            }

            // First time. Reuse the half-finished set-up if there is one.
            var all = (list.data.all || []);
            var pending = loadPending(uid);
            if(pending && !all.some(function(f){ return f.id === pending.factorId && f.status !== "verified"; })){
                pending = null;
            }
            for(var i = 0; i < all.length; i++){
                if(all[i].status !== "verified" && (!pending || all[i].id !== pending.factorId)){
                    try{ await sb.auth.mfa.unenroll({ factorId: all[i].id }); }catch(e){}
                }
            }
            if(!pending){
                var enr = await sb.auth.mfa.enroll({
                    factorType: "totp",
                    friendlyName: "KT Admin " + new Date().toISOString().slice(0, 19).replace("T", " ")
                });
                if(enr.error) throw enr.error;
                pending = {
                    uid: uid,
                    t: Date.now(),
                    factorId: enr.data.id,
                    qr: enr.data.totp.qr_code,
                    secret: enr.data.totp.secret,
                    uri: enr.data.totp.uri
                };
                savePending(pending);
            }

            var okn = await codeScreen({
                intro: "Scan the QR code with your authenticator app, then enter the code it shows.",
                qr: pending.qr,
                uri: pending.uri,
                secret: pending.secret,
                okText: "Turn on",
                verify: verifyWith(pending.factorId, pending.secret)
            });
            if(okn) clearPending();
            return okn;
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
