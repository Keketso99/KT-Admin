// =========================================================
// KT ADMIN — SIGN-IN PASSWORD RULES (Step 4)
//
//  * At least 10 characters, with letters and numbers, not a common password,
//    not containing the admin's email name or the app name.
//  * Checked against known data breaches WITHOUT sending the password:
//    only the first 5 characters of its SHA-1 fingerprint leave the device
//    (haveibeenpwned "k-anonymity"). If that service cannot be reached, the
//    check is skipped.
//  * After sign-in: a weak or breached password, or "the main admin requires
//    a new password", opens a screen that cannot be closed except by choosing
//    a new password or signing out.
//  * Any admin can change their password from Settings > Safety.
// =========================================================

(function(){

    var typed = null;          // the password just typed at sign-in (memory only)

    var COMMON = [
        "password", "password1", "password12", "password123", "passw0rd", "p@ssw0rd", "qwerty", "qwerty123",
        "qwertyuiop", "letmein", "welcome", "welcome1", "welcome123", "admin", "admin123", "administrator",
        "iloveyou", "monkey", "dragon", "football", "baseball", "abc123", "abcd1234", "abcdef123",
        "123456", "1234567", "12345678", "123456789", "1234567890", "0123456789", "1q2w3e4r", "1qaz2wsx",
        "zaq12wsx", "changeme", "default", "master", "login", "princess", "sunshine", "trustno1", "whatever",
        "ktcloud", "ktcloudmining", "ktadmin", "ktadmin123", "mining123", "bitcoin", "bitcoin123"
    ];

    function setLoginPassword(pw){ typed = pw || null; }

    function problems(pw, email){
        var p = [];
        pw = String(pw || "");
        if(pw.length < 10) p.push("At least 10 characters");
        if(!/[A-Za-z]/.test(pw)) p.push("At least one letter");
        if(!/\d/.test(pw)) p.push("At least one number");
        var low = pw.toLowerCase();
        var bare = low.replace(/[^a-z0-9]/g, "");
        if(COMMON.indexOf(low) !== -1 || COMMON.indexOf(bare) !== -1) p.push("Too common");
        if(/(password|passw0rd|admin|ktcloud|ktadmin|qwerty)/.test(bare)) p.push("Must not contain words like \"password\", \"admin\" or the app name");
        if(pw.length && /^(.)\1+$/.test(pw)) p.push("Must not be one repeated character");
        var local = String(email || "").split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
        if(local.length >= 4 && bare.indexOf(local) !== -1) p.push("Must not contain your email name");
        return p;
    }

    // 0 weak ... 4 strong (only meaningful when there are no problems)
    function score(pw){
        var s = 0;
        if(pw.length >= 10) s++;
        if(pw.length >= 14) s++;
        if(/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
        if(/[^A-Za-z0-9]/.test(pw)) s++;
        return s;
    }

    var LABELS = ["Weak", "Fair", "Good", "Strong", "Very strong"];

    // true when the password appears in known data breaches
    function breached(pw){
        try{
            return crypto.subtle.digest("SHA-1", new TextEncoder().encode(pw)).then(function(buf){
                var hex = Array.prototype.map.call(new Uint8Array(buf), function(b){ return ("0" + b.toString(16)).slice(-2); }).join("").toUpperCase();
                var prefix = hex.slice(0, 5), suffix = hex.slice(5);
                var ctrl = (typeof AbortController !== "undefined") ? new AbortController() : null;
                var timer = ctrl ? setTimeout(function(){ ctrl.abort(); }, 4000) : null;
                return fetch("https://api.pwnedpasswords.com/range/" + prefix, {
                    headers: { "Add-Padding": "true" },
                    signal: ctrl ? ctrl.signal : undefined
                }).then(function(r){
                    if(timer) clearTimeout(timer);
                    if(!r.ok) return false;
                    return r.text().then(function(txt){
                        var lines = txt.split("\n");
                        for(var i = 0; i < lines.length; i++){
                            var parts = lines[i].trim().split(":");
                            if(parts[0] === suffix && parseInt(parts[1], 10) > 0) return true;
                        }
                        return false;
                    });
                });
            }).catch(function(){ return false; });
        }catch(e){
            return Promise.resolve(false);
        }
    }

    function el(tag, cls, text){
        var n = document.createElement(tag);
        if(cls) n.className = cls;
        if(text) n.textContent = text;
        return n;
    }

    function currentEmail(){
        return sb.auth.getUser().then(function(r){
            return (r && r.data && r.data.user && r.data.user.email) || "";
        }).catch(function(){ return ""; });
    }

    // Screen to choose a new password. Resolves true when changed, false when the
    // admin backed out (only possible when not forced: Cancel / Sign out).
    function openChange(opts){
        opts = opts || {};
        return currentEmail().then(function(email){
            return new Promise(function(resolve){
                var wrap = el("div", "kt-mfa-overlay");
                var card = el("div", "kt-mfa-card");
                card.appendChild(el("i", "fa-solid fa-key kt-mfa-icon"));
                card.appendChild(el("h2", "", "Choose a new password"));
                card.appendChild(el("p", "kt-mfa-text", opts.intro || "Use at least 10 characters with letters and numbers. A long phrase is best."));

                var cur = null;
                if(opts.requireCurrent){
                    cur = el("input", "kt-pw-input");
                    cur.type = "password"; cur.placeholder = "Current password"; cur.autocomplete = "current-password";
                    card.appendChild(cur);
                }
                var in1 = el("input", "kt-pw-input");
                in1.type = "password"; in1.placeholder = "New password"; in1.autocomplete = "new-password";
                var in2 = el("input", "kt-pw-input");
                in2.type = "password"; in2.placeholder = "Re-enter new password"; in2.autocomplete = "new-password";
                card.appendChild(in1);
                card.appendChild(in2);

                var meter = el("div", "kt-pw-meter");
                var bar = el("span", "kt-pw-bar");
                meter.appendChild(bar);
                card.appendChild(meter);
                var hint = el("p", "kt-pw-hint", "");
                card.appendChild(hint);

                var show = el("button", "kt-pw-show", "Show passwords");
                show.type = "button";
                show.onclick = function(){
                    var on = in1.type === "password";
                    in1.type = in2.type = on ? "text" : "password";
                    if(cur) cur.type = on ? "text" : "password";
                    show.textContent = on ? "Hide passwords" : "Show passwords";
                };
                card.appendChild(show);

                var err = el("p", "kt-mfa-error");
                card.appendChild(err);

                var ok = el("button", "kt-mfa-btn", "Save password");
                ok.type = "button";
                card.appendChild(ok);

                var out = el("button", "kt-mfa-link", opts.forced ? "Sign out" : "Cancel");
                out.type = "button";
                card.appendChild(out);

                wrap.appendChild(card);
                document.body.appendChild(wrap);
                setTimeout(function(){ try{ (cur || in1).focus(); }catch(e){} }, 50);

                function close(v){
                    if(wrap.parentNode) wrap.parentNode.removeChild(wrap);
                    resolve(v);
                }

                function refresh(){
                    var pw = in1.value;
                    var pr = problems(pw, email);
                    var sc = pr.length ? 0 : score(pw);
                    bar.style.width = pw ? (20 + sc * 20) + "%" : "0";
                    bar.style.background = sc <= 1 ? "#dc2626" : sc === 2 ? "#d97706" : "#16a34a";
                    hint.textContent = !pw ? "" : pr.length ? pr[0] : LABELS[sc];
                    hint.style.color = pr.length ? "#b91c1c" : "#4b5563";
                }
                in1.addEventListener("input", function(){ err.textContent = ""; refresh(); });
                in2.addEventListener("input", function(){ err.textContent = ""; });
                if(cur) cur.addEventListener("input", function(){ err.textContent = ""; });

                function submit(){
                    var pw = in1.value;
                    if(cur && !cur.value){ err.textContent = "Enter your current password."; return; }
                    var pr = problems(pw, email);
                    if(pr.length){ err.textContent = pr[0] + "."; return; }
                    if(pw !== in2.value){ err.textContent = "The two passwords do not match."; return; }
                    if(cur && pw === cur.value){ err.textContent = "The new password must be different from the current one."; return; }

                    var done = KTUI.busy(ok, "Checking...");
                    var currentOk = cur
                        ? (typeof ktVerifyPassword === "function" ? ktVerifyPassword(email, cur.value) : Promise.resolve(false))
                        : Promise.resolve(true);
                    currentOk.then(function(good){
                        if(!good){
                            done();
                            err.textContent = "The current password is incorrect.";
                            return null;
                        }
                        return breached(pw);
                    }).then(function(bad){
                        if(bad === null) return null;
                        if(bad){
                            done();
                            err.textContent = "This password has appeared in known data breaches. Choose a different one.";
                            return null;
                        }
                        return sb.auth.updateUser({ password: pw }).then(function(r){
                            if(r.error){
                                done();
                                var m = String(r.error.message || "");
                                err.textContent = /different from the old/i.test(m)
                                    ? "The new password must be different from the old one."
                                    : /reauth/i.test(m)
                                        ? "For safety, sign out and sign in again, then change the password."
                                        : "Could not change the password: " + m;
                                return null;
                            }
                            return sb.rpc("admin_password_changed").then(function(res){
                                done();
                                if(res.error){ /* function not installed: the password did change */ close(true); return; }
                                if(res.data && res.data.ok === false){
                                    err.textContent = "The password was not changed. Try again.";
                                    return;
                                }
                                close(true);
                            }, function(){ done(); close(true); });
                        });
                    }).catch(function(){
                        done();
                        err.textContent = "Something went wrong. Try again.";
                    });
                }

                ok.onclick = submit;
                in2.addEventListener("keydown", function(e){ if(e.key === "Enter"){ e.preventDefault(); submit(); } });
                out.onclick = function(){ close(false); };
            });
        });
    }

    // After sign-in: forced change, weak password, or breached password.
    function gate(){
        var pw = typed;
        typed = null;

        return sb.rpc("admin_password_status").then(function(res){
            var forced = !!(res && res.data && res.data.must_change);
            return currentEmail().then(function(email){
                var weak = pw ? problems(pw, email) : [];
                if(forced){
                    return openChange({ forced: true, intro: "The main admin requires you to choose a new password before you continue." });
                }
                if(weak.length){
                    return openChange({ forced: true, intro: "Your password is too weak (" + weak[0].toLowerCase() + "). Choose a stronger one to continue." });
                }
                if(!pw) return true;
                return breached(pw).then(function(bad){
                    if(!bad) return true;
                    return openChange({ forced: true, intro: "This password has appeared in known data breaches. Choose a new one to continue." });
                });
            });
        }).catch(function(){ return true; });
    }

    window.KTPassword = {
        setLoginPassword: setLoginPassword,
        gate: gate,
        openChange: openChange,
        problems: problems,
        score: score,
        breached: breached
    };

})();
