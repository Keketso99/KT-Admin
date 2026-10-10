/* ===== js/supabase-client.js ===== */
// KT Admin Panel — Supabase connection
// Uses the same project + publishable key as the user app's .env.
// The publishable key is meant to be public — real access control
// happens via Postgres row-level security, not by hiding this key.

window.sb = supabase.createClient(
    "https://tkvtsvrjzaohqevuxkhc.supabase.co",
    "sb_publishable_jB4BmxofDzNDTdX_n44NcQ_zRDyydgq"
);


/* ===== js/dialogs.js ===== */
// =========================================================
// KT ADMIN — IN-APP DIALOGS (replaces alert / confirm / prompt)
//
// Nothing in the admin app should ever open a browser dialog.
// Everything the admin sees — success messages, errors, warnings,
// confirmations and amount prompts — is drawn by the app itself.
//
//   KTUI.toast(message, type, ms)        small message that fades away
//   KTUI.success / error / warning / info(message)
//   KTUI.alert(message, options)         modal with OK         -> Promise
//   KTUI.confirm(message, options)       modal Yes / No        -> Promise<boolean>
//   KTUI.prompt(message, options)        modal with an input   -> Promise<string|null>
//   KTUI.notify(message, options)        picks toast or modal by itself
//
// window.alert is also routed here as a safety net, so even a call
// that was missed can never open the browser's own pop-up.
//
// Messages are always inserted as text (never HTML).
// =========================================================

(function(){

    var STYLE_ID = "kt-ui-style";
    var TOAST_ID = "kt-ui-toasts";

    var COLORS = {
        success: "#16a34a",
        error:   "#dc2626",
        warning: "#d97706",
        info:    "#2563eb"
    };

    var ICONS = {
        success: "\u2713",
        error:   "\u2715",
        warning: "!",
        info:    "i"
    };

    var TITLES = {
        success: "Done",
        error:   "Something went wrong",
        warning: "Please note",
        info:    "Notice"
    };

    var DURATION = { success: 3500, info: 4000, warning: 5500, error: 7000 };

    // ---------------------------------------------------------
    // Styles (injected once, so no CSS file needs to change)
    // ---------------------------------------------------------

    function injectStyles(){
        if(document.getElementById(STYLE_ID)) return;

        var css =
        "#" + TOAST_ID + "{position:fixed;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 84px);display:flex;flex-direction:column;align-items:center;gap:8px;z-index:2147483000;pointer-events:none;padding:0 12px}" +
        ".kt-ui-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:10px;width:100%;max-width:420px;background:#fff;color:#1f2937;border-radius:12px;padding:11px 14px;box-shadow:0 8px 28px rgba(15,23,42,.28);border-left:5px solid var(--kt-c);font-family:Arial,sans-serif;font-size:14px;line-height:1.35;cursor:pointer;opacity:0;transform:translateY(10px);transition:opacity .2s ease,transform .2s ease;-webkit-user-select:none;user-select:none}" +
        ".kt-ui-toast.kt-in{opacity:1;transform:translateY(0)}" +
        ".kt-ui-badge{flex:0 0 auto;width:22px;height:22px;border-radius:50%;background:var(--kt-c);color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;margin-top:1px}" +
        ".kt-ui-toast-text{flex:1 1 auto;word-break:break-word;white-space:pre-wrap}" +

        ".kt-ui-overlay{position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483100;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:18px;opacity:0;transition:opacity .15s ease}" +
        ".kt-ui-overlay.kt-in{opacity:1}" +
        ".kt-ui-card{background:#fff;color:#1f2937;width:100%;max-width:360px;border-radius:16px;padding:20px 18px 16px;box-shadow:0 18px 50px rgba(0,0,0,.35);font-family:Arial,sans-serif;transform:scale(.96);transition:transform .15s ease;max-height:86vh;overflow:auto}" +
        ".kt-ui-overlay.kt-in .kt-ui-card{transform:scale(1)}" +
        ".kt-ui-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}" +
        ".kt-ui-head .kt-ui-badge{width:28px;height:28px;font-size:16px;margin:0}" +
        ".kt-ui-title{font-size:17px;font-weight:700;color:#111827}" +
        ".kt-ui-msg{font-size:14px;line-height:1.5;color:#374151;white-space:pre-wrap;word-break:break-word;-webkit-user-select:text;user-select:text}" +
        ".kt-ui-value{margin-top:12px;display:flex;gap:8px;align-items:stretch}" +
        ".kt-ui-value code{flex:1 1 auto;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;font-family:Consolas,Menlo,monospace;font-size:15px;word-break:break-all;-webkit-user-select:text;user-select:text;color:#111827}" +
        ".kt-ui-input{width:100%;margin-top:12px;padding:11px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:16px;outline:none;font-family:Arial,sans-serif;-webkit-user-select:text;user-select:text;background:#fff;color:#111827}" +
        ".kt-ui-input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.18)}" +
        ".kt-ui-error{min-height:18px;margin-top:6px;font-size:12.5px;color:#dc2626}" +
        ".kt-ui-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}" +
        ".kt-ui-btn{border:0;border-radius:10px;padding:10px 18px;font-size:14px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif}" +
        ".kt-ui-btn:disabled{opacity:.6}" +
        ".kt-ui-btn.kt-secondary{background:#e5e7eb;color:#111827}" +
        ".kt-ui-btn.kt-primary{background:var(--kt-c);color:#fff}" +

        ".kt-pw{position:relative;display:block}" +
        ".kt-pw .kt-ui-input{padding-right:46px;margin-top:0}" +
        ".kt-pw-eye{position:absolute;top:0;right:0;height:100%;width:44px;border:0;background:transparent;color:#6b7280;font-size:16px;cursor:pointer}" +
        ".kt-empty-row td{padding:0!important;border:0!important;background:transparent!important}" +
        ".kt-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:34px 16px;color:#6b7280;font-family:Arial,sans-serif;font-size:14px;line-height:1.4;text-align:center}" +
        ".kt-empty i{font-size:26px;opacity:.55}" +
        ".kt-empty-box{width:100%;box-sizing:border-box}";

        var style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function el(tag, className, text){
        var node = document.createElement(tag);
        if(className) node.className = className;
        if(text !== undefined && text !== null) node.textContent = text;
        return node;
    }

    function normalizeType(type){
        return COLORS[type] ? type : "info";
    }

    // ---------------------------------------------------------
    // Toasts
    // ---------------------------------------------------------

    function toast(message, type, ms){
        injectStyles();
        type = normalizeType(type);

        var wrap = document.getElementById(TOAST_ID);
        if(!wrap){
            wrap = el("div");
            wrap.id = TOAST_ID;
            wrap.setAttribute("aria-live", "polite");
            document.body.appendChild(wrap);
        }

        var node = el("div", "kt-ui-toast");
        node.style.setProperty("--kt-c", COLORS[type]);
        node.setAttribute("role", type === "error" ? "alert" : "status");
        node.appendChild(el("span", "kt-ui-badge", ICONS[type]));
        node.appendChild(el("span", "kt-ui-toast-text", String(message)));

        var gone = false;
        function dismiss(){
            if(gone) return;
            gone = true;
            node.classList.remove("kt-in");
            setTimeout(function(){ if(node.parentNode) node.parentNode.removeChild(node); }, 220);
        }
        node.addEventListener("click", dismiss);

        wrap.appendChild(node);
        requestAnimationFrame(function(){ node.classList.add("kt-in"); });
        setTimeout(dismiss, ms || DURATION[type]);

        while(wrap.children.length > 4){
            wrap.removeChild(wrap.firstChild);
        }
    }

    // ---------------------------------------------------------
    // Modal engine
    // ---------------------------------------------------------

    function copyToClipboard(text){
        try{
            if(navigator.clipboard && navigator.clipboard.writeText){
                return navigator.clipboard.writeText(text);
            }
        }catch(e){}
        return new Promise(function(resolve, reject){
            try{
                var ta = document.createElement("textarea");
                ta.value = text;
                ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                var ok = document.execCommand("copy");
                document.body.removeChild(ta);
                ok ? resolve() : reject(new Error("copy failed"));
            }catch(e){ reject(e); }
        });
    }

    // config: { type, title, message, value, okText, cancelText, showCancel,
    //           input:{...}, danger }
    // resolves with { ok: boolean, text: string }
    function openModal(config){
        injectStyles();

        return new Promise(function(resolve){

            var type = normalizeType(config.type);
            var color = config.danger ? COLORS.error : COLORS[type];

            var overlay = el("div", "kt-ui-overlay");
            overlay.style.setProperty("--kt-c", color);

            var card = el("div", "kt-ui-card");
            card.setAttribute("role", "dialog");
            card.setAttribute("aria-modal", "true");

            var head = el("div", "kt-ui-head");
            head.appendChild(el("span", "kt-ui-badge", config.danger ? "!" : ICONS[type]));
            head.appendChild(el("div", "kt-ui-title", config.title || TITLES[type]));
            card.appendChild(head);

            if(config.message){
                card.appendChild(el("div", "kt-ui-msg", String(config.message)));
            }

            if(config.value){
                var box = el("div", "kt-ui-value");
                box.appendChild(el("code", null, String(config.value)));
                var copyBtn = el("button", "kt-ui-btn kt-secondary", "Copy");
                copyBtn.type = "button";
                copyBtn.addEventListener("click", function(){
                    copyToClipboard(String(config.value)).then(function(){
                        copyBtn.textContent = "Copied";
                    }).catch(function(){
                        copyBtn.textContent = "Select & copy";
                    });
                });
                box.appendChild(copyBtn);
                card.appendChild(box);
            }

            var input = null;
            var errorLine = null;

            if(config.input){
                input = el("input", "kt-ui-input");
                input.type = config.input.type || "text";
                if(config.input.inputMode) input.setAttribute("inputmode", config.input.inputMode);
                if(config.input.placeholder) input.placeholder = config.input.placeholder;
                if(config.input.value !== undefined) input.value = String(config.input.value);
                input.setAttribute("autocomplete", "off");

                if(input.type === "password"){
                    var pw = passwordWrap(input);
                    pw.style.marginTop = "12px";
                    input.style.marginTop = "0";
                    card.appendChild(pw);
                } else {
                    card.appendChild(input);
                }

                errorLine = el("div", "kt-ui-error", "");
                card.appendChild(errorLine);
            }

            var actions = el("div", "kt-ui-actions");
            var cancelBtn = null;

            if(config.showCancel){
                cancelBtn = el("button", "kt-ui-btn kt-secondary", config.cancelText || "Cancel");
                cancelBtn.type = "button";
                actions.appendChild(cancelBtn);
            }

            var okBtn = el("button", "kt-ui-btn kt-primary", config.okText || "OK");
            okBtn.type = "button";
            actions.appendChild(okBtn);
            card.appendChild(actions);

            overlay.appendChild(card);

            var previousFocus = document.activeElement;
            var closed = false;
            var running = false;

            function close(ok){
                if(closed) return;
                if(running && !ok) return;
                closed = true;
                document.removeEventListener("keydown", onKey, true);
                overlay.classList.remove("kt-in");
                var text = input ? input.value : "";
                setTimeout(function(){
                    if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    try{ if(previousFocus && previousFocus.focus) previousFocus.focus(); }catch(e){}
                }, 160);
                resolve({ ok: ok, text: text });
            }

            function submit(){
                if(running) return;

                if(input && config.input && typeof config.input.validate === "function"){
                    var problem = config.input.validate(input.value);
                    if(problem){
                        errorLine.textContent = problem;
                        input.focus();
                        return;
                    }
                }

                // Async action: keep the dialog open with a loading button,
                // close on success, show the error inside the dialog on failure.
                if(typeof config.run === "function"){
                    running = true;
                    if(errorLine) errorLine.textContent = "";
                    var done = busy(okBtn, config.busyText || "Please wait...", cancelBtn ? [cancelBtn] : []);

                    Promise.resolve()
                        .then(function(){ return config.run(input ? input.value : ""); })
                        .then(function(problemText){
                            running = false;
                            done();
                            if(problemText){
                                if(errorLine) errorLine.textContent = String(problemText);
                                else toast(String(problemText), "error");
                                if(input) input.focus();
                                return;
                            }
                            close(true);
                        })
                        .catch(function(err){
                            running = false;
                            done();
                            var msg = (err && err.message) ? err.message : "Something went wrong.";
                            if(errorLine) errorLine.textContent = msg;
                            else toast(msg, "error");
                        });
                    return;
                }

                close(true);
            }

            function onKey(e){
                if(e.key === "Escape"){
                    e.preventDefault();
                    e.stopPropagation();
                    close(false);
                } else if(e.key === "Enter" && input && document.activeElement === input){
                    e.preventDefault();
                    e.stopPropagation();
                    submit();
                } else if(e.key === "Tab"){
                    var items = Array.prototype.slice.call(card.querySelectorAll("input,button"));
                    if(items.length){
                        var first = items[0], last = items[items.length - 1];
                        if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
                        else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
                    }
                }
            }

            okBtn.addEventListener("click", submit);
            if(cancelBtn) cancelBtn.addEventListener("click", function(){ close(false); });
            overlay.addEventListener("click", function(e){
                // tap outside = cancel (only for dialogs that can be cancelled)
                if(e.target === overlay && config.showCancel) close(false);
            });
            document.addEventListener("keydown", onKey, true);

            document.body.appendChild(overlay);
            requestAnimationFrame(function(){
                overlay.classList.add("kt-in");
                try{ (input || okBtn).focus(); }catch(e){}
            });
        });
    }

    // ---------------------------------------------------------
    // Password input with a show / hide (eye) button
    // ---------------------------------------------------------
    function passwordWrap(input){
        var wrap = el("div", "kt-pw");
        var eye = el("button", "kt-pw-eye");
        eye.type = "button";
        eye.setAttribute("aria-label", "Show or hide password");
        eye.innerHTML = '<i class="fa-solid fa-eye"></i>';
        eye.addEventListener("click", function(){
            var show = input.type === "password";
            input.type = show ? "text" : "password";
            eye.innerHTML = '<i class="fa-solid ' + (show ? "fa-eye-slash" : "fa-eye") + '"></i>';
            try{ input.focus(); }catch(e){}
        });
        wrap.appendChild(input);
        wrap.appendChild(eye);
        return wrap;
    }

    // KTUI.passwordField({placeholder, autocomplete}) -> { wrap, input }
    function passwordField(options){
        injectStyles();
        options = options || {};
        var input = el("input", "kt-ui-input");
        input.type = "password";
        input.style.marginTop = "0";
        if(options.placeholder) input.placeholder = options.placeholder;
        input.setAttribute("autocomplete", options.autocomplete || "off");
        return { wrap: passwordWrap(input), input: input };
    }

    // ---------------------------------------------------------
    // Public dialogs
    // ---------------------------------------------------------

    function alertDialog(message, options){
        options = options || {};
        return openModal({
            type: options.type,
            title: options.title,
            message: message,
            value: options.value,
            okText: options.okText || "OK",
            showCancel: false
        }).then(function(){ return undefined; });
    }

    function confirmDialog(message, options){
        options = options || {};
        return openModal({
            type: options.type || (options.danger ? "warning" : "info"),
            title: options.title || "Please confirm",
            message: message,
            okText: options.confirmText || "Confirm",
            cancelText: options.cancelText || "Cancel",
            danger: !!options.danger,
            showCancel: true,
            run: options.run,
            busyText: options.busyText
        }).then(function(r){ return r.ok; });
    }

    function promptDialog(message, options){
        options = options || {};
        return openModal({
            type: options.type || "info",
            title: options.title || "Enter a value",
            message: message,
            okText: options.confirmText || "OK",
            cancelText: options.cancelText || "Cancel",
            showCancel: true,
            run: options.run,
            busyText: options.busyText,
            input: {
                type: options.inputType || "text",
                inputMode: options.inputMode,
                placeholder: options.placeholder,
                value: options.value,
                validate: options.validate
            }
        }).then(function(r){ return r.ok ? r.text : null; });
    }

    // ---------------------------------------------------------
    // Smart notify: choose type, then toast or modal
    // ---------------------------------------------------------

    function classify(message){
        var m = String(message == null ? "" : message).trim();

        var hasSuccess = /succe(ed|ss)/i.test(m);
        var hasFailed  = /\bfailed\b|upload failed|\berror\b/i.test(m);

        if(hasSuccess && hasFailed) return "warning";
        if(hasFailed) return "error";
        if(/can't|cannot|denied|not supported/i.test(m)) return "warning";
        if(/^(please|enter|select|invalid|only|open a|choose)/i.test(m)) return "warning";
        if(/already exists/i.test(m)) return "warning";
        if(/not available/i.test(m)) return "info";
        if(/success|\bsent\b|deleted|added|updated|credited|debited|blocked|rejected|approved|saved|created|\breset\b|activated|cleared/i.test(m)) return "success";
        return "info";
    }

    function notify(message, options){
        options = options || {};
        var text = String(message == null ? "" : message);
        var type = options.type ? normalizeType(options.type) : classify(text);

        var needsModal = options.modal === true || !!options.value || text.length > 110 || text.indexOf("\n") !== -1;

        if(needsModal && options.modal !== false){
            return alertDialog(text, { type: type, title: options.title, value: options.value });
        }
        toast(text, type);
        return undefined;
    }

    // ---------------------------------------------------------
    // Export + safety net
    // ---------------------------------------------------------

    // ---------------------------------------------------------
    // Empty states
    //   syncTableEmpty(tbody, colspan, message, icon)
    //   syncBlockEmpty(container, message, icon)
    // Shows a message when nothing is visible (no data, or every row
    // hidden by a search / filter) and removes it as soon as a row is
    // visible again. `message` may be text or a function returning text.
    // The message row is never counted as data (class kt-empty-row).
    // ---------------------------------------------------------

    function emptyInner(message, icon){
        var wrap = el("div", "kt-empty");
        wrap.appendChild(el("i", icon || "fa-solid fa-inbox"));
        wrap.appendChild(el("span", null, message));
        return wrap;
    }

    function resolveMessage(message){
        return typeof message === "function" ? message() : message;
    }

    function syncTableEmpty(tbody, colspan, message, icon){
        if(!tbody) return;
        injectStyles();

        var visible = false;
        var existing = null;

        for(var i = 0; i < tbody.children.length; i++){
            var row = tbody.children[i];
            if(row.classList.contains("kt-empty-row")){ existing = row; continue; }
            if(row.style.display !== "none") visible = true;
        }

        if(visible){
            if(existing) existing.parentNode.removeChild(existing);
            return;
        }

        var text = resolveMessage(message);
        var cls = icon || "fa-solid fa-inbox";

        if(existing){
            existing.style.display = "";
            var span = existing.querySelector("span");
            var ic = existing.querySelector("i");
            if(span) span.textContent = text;
            if(ic) ic.className = cls;
            return;
        }

        var tr = el("tr", "kt-empty-row");
        var td = el("td");
        td.colSpan = colspan || 1;
        td.appendChild(emptyInner(text, cls));
        tr.appendChild(td);
        tbody.appendChild(tr);
    }

    function syncBlockEmpty(container, message, icon){
        if(!container) return;
        injectStyles();

        var visible = false;
        var existing = null;

        for(var i = 0; i < container.children.length; i++){
            var child = container.children[i];
            if(child.classList.contains("kt-empty-box")){ existing = child; continue; }
            if(child.style.display !== "none") visible = true;
        }

        if(visible){
            if(existing) existing.parentNode.removeChild(existing);
            return;
        }

        var text = resolveMessage(message);
        var cls = icon || "fa-solid fa-inbox";

        if(existing){
            existing.style.display = "";
            var span = existing.querySelector("span");
            var ic = existing.querySelector("i");
            if(span) span.textContent = text;
            if(ic) ic.className = cls;
            return;
        }

        var box = emptyInner(text, cls);
        box.className = "kt-empty kt-empty-box";
        container.appendChild(box);
    }

    // ---------------------------------------------------------
    // Loading buttons — the same look as "Deleting..." in Activity Log:
    // the button is disabled and shows a spinning icon + a short label.
    //
    //   var done = KTUI.busy(button, "Approving...", [otherButton]);
    //   ... when finished (success or error) ...
    //   done();                       // restores text + enabled state
    //
    // `alsoDisable` buttons are only disabled (so Approve and Reject can
    // not be pressed at the same time) and restored by done() as well.
    // ---------------------------------------------------------

    function busy(button, label, alsoDisable){
        if(!button) return function(){};

        var originalHTML = button.innerHTML;
        var wasDisabled = button.disabled;
        var others = [];

        (alsoDisable || []).forEach(function(b){
            if(b && b !== button) others.push({ node: b, disabled: b.disabled });
        });

        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ';
        button.appendChild(document.createTextNode(label || "Please wait..."));

        others.forEach(function(o){ o.node.disabled = true; });

        var restored = false;

        return function(){
            if(restored) return;
            restored = true;
            button.disabled = wasDisabled;
            button.innerHTML = originalHTML;
            others.forEach(function(o){ o.node.disabled = o.disabled; });
        };
    }

    window.KTUI = {
        busy: busy,
        passwordField: passwordField,
        syncTableEmpty: syncTableEmpty,
        syncBlockEmpty: syncBlockEmpty,
        toast: toast,
        success: function(m, ms){ toast(m, "success", ms); },
        error:   function(m, ms){ toast(m, "error", ms); },
        warning: function(m, ms){ toast(m, "warning", ms); },
        info:    function(m, ms){ toast(m, "info", ms); },
        alert: alertDialog,
        confirm: confirmDialog,
        prompt: promptDialog,
        notify: notify,
        _classify: classify
    };

    // Any stray alert() can never open the browser's own pop-up again.
    window.alert = function(message){
        notify(message);
    };

})();


/* ===== js/sound.js ===== */
// =========================================================
// KT ADMIN — NOTIFICATION SOUND & ALERT PREFERENCES
// Saved on THIS device (localStorage + IndexedDB for a custom file).
//
//   KTSound.isOn() / setOn(bool)           master switch for alert sounds
//   KTSound.list()                         built-in sounds [{id, name}]
//   KTSound.getChoice() / setChoice(id)    "chime" ... or "custom"
//   KTSound.preview(id)                    play a sound now (even if switched off)
//   KTSound.playAlert()                    what the app plays for a new alert
//   KTSound.saveCustomFile(file)           choose a sound from phone storage
//   KTSound.clearCustom()
//   KTSound.typeEnabled(group)             pop-up alerts per type
//   KTSound.setType(group, bool)
//
// Everything is generated with the Web Audio API — no sound files needed.
// =========================================================

(function(){

    var KEY_ON     = "kt.admin.sound";            // same key the header speaker icon uses
    var KEY_CHOICE = "kt.admin.soundChoice";
    var KEY_TYPES  = "kt.admin.alertTypes";
    var KEY_NAME   = "kt.admin.soundCustomName";

    var MAX_BYTES = 3 * 1024 * 1024;              // 3 MB
    var MAX_SECONDS = 30;

    var GROUPS = [
        { id: "deposits",     label: "Deposits" },
        { id: "withdrawals",  label: "Withdrawals" },
        { id: "verification", label: "Verification (KYC)" },
        { id: "requests",     label: "User requests (password, PIN, profile, reactivation)" },
        { id: "chat",         label: "Support chat messages" }
    ];

    var audioCtx = null;
    var currentEl = null;

    // ---------------------------------------------------------
    // storage helpers (never throw)
    // ---------------------------------------------------------
    function get(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }
    function put(key, val){ try{ localStorage.setItem(key, val); }catch(e){} }
    function del(key){ try{ localStorage.removeItem(key); }catch(e){} }

    function changed(){
        try{ window.dispatchEvent(new Event("kt-sound-changed")); }catch(e){}
    }

    // ---------------------------------------------------------
    // IndexedDB (custom sound file)
    // ---------------------------------------------------------
    function openDb(){
        return new Promise(function(resolve, reject){
            if(!window.indexedDB){ reject(new Error("Storage is not available")); return; }
            var req = indexedDB.open("kt-admin-sounds", 1);
            req.onupgradeneeded = function(){ req.result.createObjectStore("files"); };
            req.onsuccess = function(){ resolve(req.result); };
            req.onerror = function(){ reject(req.error || new Error("Storage error")); };
        });
    }

    function dbGet(){
        return openDb().then(function(db){
            return new Promise(function(resolve, reject){
                var r = db.transaction("files", "readonly").objectStore("files").get("custom");
                r.onsuccess = function(){ resolve(r.result || null); };
                r.onerror = function(){ reject(r.error); };
            });
        });
    }

    function dbPut(blob){
        return openDb().then(function(db){
            return new Promise(function(resolve, reject){
                var tx = db.transaction("files", "readwrite");
                tx.objectStore("files").put(blob, "custom");
                tx.oncomplete = function(){ resolve(); };
                tx.onerror = function(){ reject(tx.error); };
            });
        });
    }

    function dbDelete(){
        return openDb().then(function(db){
            return new Promise(function(resolve, reject){
                var tx = db.transaction("files", "readwrite");
                tx.objectStore("files").delete("custom");
                tx.oncomplete = function(){ resolve(); };
                tx.onerror = function(){ reject(tx.error); };
            });
        });
    }

    // ---------------------------------------------------------
    // Built-in sounds (Web Audio)
    // ---------------------------------------------------------
    function ctx(){
        var AC = window.AudioContext || window.webkitAudioContext;
        if(!AC) return null;
        if(!audioCtx) audioCtx = new AC();
        if(audioCtx.state === "suspended"){ try{ audioCtx.resume(); }catch(e){} }
        return audioCtx;
    }

    // one tone: freq Hz, start offset s, length s, wave type, peak gain
    function tone(c, freq, at, len, type, peak){
        var o = c.createOscillator();
        var g = c.createGain();
        var t0 = c.currentTime + at;
        o.type = type || "sine";
        o.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(peak || 0.2, t0 + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
        o.connect(g);
        g.connect(c.destination);
        o.start(t0);
        o.stop(t0 + len + 0.03);
    }

    var BUILTIN = [
        { id: "chime", name: "Chime",     play: function(c){ tone(c, 880, 0, .35); tone(c, 1175, .16, .5); } },
        { id: "bell",  name: "Bell",      play: function(c){ tone(c, 1046, 0, 1.2, "sine", .22); tone(c, 2093, 0, .8, "sine", .06); } },
        { id: "ding",  name: "Ding",      play: function(c){ tone(c, 1318, 0, .45, "sine", .25); } },
        { id: "pulse", name: "Pulse",     play: function(c){ tone(c, 660, 0, .12, "triangle", .25); tone(c, 660, .2, .12, "triangle", .25); tone(c, 660, .4, .12, "triangle", .25); } },
        { id: "soft",  name: "Soft tone", play: function(c){ tone(c, 523, 0, .5, "triangle", .2); tone(c, 659, .22, .6, "triangle", .2); } },
        { id: "alert", name: "Alert",     play: function(c){ for(var i = 0; i < 3; i++){ tone(c, 880, i * .36, .16, "square", .09); tone(c, 660, i * .36 + .17, .16, "square", .09); } } }
    ];

    function builtin(id){
        for(var i = 0; i < BUILTIN.length; i++) if(BUILTIN[i].id === id) return BUILTIN[i];
        return null;
    }

    // ---------------------------------------------------------
    // Playing
    // ---------------------------------------------------------
    function stopCurrent(){
        if(currentEl){
            try{ currentEl.pause(); }catch(e){}
            currentEl = null;
        }
    }

    function playCustom(){
        return dbGet().then(function(blob){
            if(!blob) return false;
            stopCurrent();
            var url = URL.createObjectURL(blob);
            var a = new Audio(url);
            currentEl = a;
            a.volume = 1;
            var cleanup = function(){ try{ URL.revokeObjectURL(url); }catch(e){} if(currentEl === a) currentEl = null; };
            a.addEventListener("ended", cleanup);
            a.addEventListener("error", cleanup);
            var p = a.play();
            if(p && p.catch) p.catch(cleanup);
            // never play for more than the limit
            setTimeout(function(){ try{ a.pause(); }catch(e){} cleanup(); }, MAX_SECONDS * 1000);
            return true;
        }).catch(function(){ return false; });
    }

    function preview(id){
        if(id === "custom") return playCustom();
        var b = builtin(id) || BUILTIN[0];
        var c = ctx();
        if(!c) return Promise.resolve(false);
        try{ b.play(c); }catch(e){ return Promise.resolve(false); }
        return Promise.resolve(true);
    }

    function isOn(){ return get(KEY_ON) !== "off"; }

    function setOn(on){
        put(KEY_ON, on ? "on" : "off");
        changed();
    }

    function getChoice(){
        var c = get(KEY_CHOICE) || "chime";
        if(c === "custom") return c;
        return builtin(c) ? c : "chime";
    }

    function setChoice(id){
        put(KEY_CHOICE, id === "custom" ? "custom" : (builtin(id) ? id : "chime"));
        changed();
    }

    function playAlert(){
        if(!isOn()) return;
        var choice = getChoice();
        if(choice === "custom"){
            playCustom().then(function(ok){ if(!ok) preview("chime"); });
            return;
        }
        preview(choice);
    }

    // ---------------------------------------------------------
    // Custom sound from phone storage
    // ---------------------------------------------------------
    function saveCustomFile(file){
        return new Promise(function(resolve, reject){
            if(!file) { reject(new Error("No file selected.")); return; }
            if(file.type && file.type.indexOf("audio") !== 0){
                reject(new Error("Please choose an audio file (mp3, wav, m4a, ogg...).")); return;
            }
            if(file.size > MAX_BYTES){
                reject(new Error("That file is too large. Choose a sound under 3 MB.")); return;
            }

            // make sure the browser can really play it, and that it is short
            var url = URL.createObjectURL(file);
            var probe = new Audio();
            var done = false;
            var finish = function(err){
                if(done) return;
                done = true;
                try{ URL.revokeObjectURL(url); }catch(e){}
                if(err){ reject(err); return; }
                dbPut(file).then(function(){
                    put(KEY_NAME, file.name || "Custom sound");
                    put(KEY_CHOICE, "custom");
                    changed();
                    resolve(file.name || "Custom sound");
                }).catch(function(){ reject(new Error("Could not save the sound on this device.")); });
            };
            probe.preload = "metadata";
            probe.onloadedmetadata = function(){
                if(isFinite(probe.duration) && probe.duration > MAX_SECONDS){
                    finish(new Error("That sound is longer than " + MAX_SECONDS + " seconds. Choose a shorter one."));
                } else { finish(null); }
            };
            probe.onerror = function(){ finish(new Error("That file cannot be played on this device.")); };
            probe.src = url;
            setTimeout(function(){ finish(new Error("That file could not be read.")); }, 8000);
        });
    }

    function clearCustom(){
        return dbDelete().catch(function(){}).then(function(){
            del(KEY_NAME);
            if(get(KEY_CHOICE) === "custom") put(KEY_CHOICE, "chime");
            changed();
        });
    }

    function customName(){ return get(KEY_NAME); }

    function hasCustom(){ return !!get(KEY_NAME); }

    // ---------------------------------------------------------
    // Alert types (pop-ups + sound)
    // ---------------------------------------------------------
    function readTypes(){
        try{ return JSON.parse(get(KEY_TYPES) || "{}") || {}; }catch(e){ return {}; }
    }

    function typeEnabled(group){
        var t = readTypes();
        return t[group] !== false;
    }

    function setType(group, on){
        var t = readTypes();
        t[group] = !!on;
        put(KEY_TYPES, JSON.stringify(t));
        changed();
    }

    // which group a notification record belongs to
    function groupForAction(action){
        switch(action){
            case "deposit_requested": return "deposits";
            case "withdrawal_requested": return "withdrawals";
            case "kyc_verification_requested":
            case "kyc_resubmission_requested": return "verification";
            case "support_message_received": return "chat";
            default: return "requests";
        }
    }

    window.KTSound = {
        list: function(){ return BUILTIN.map(function(b){ return { id: b.id, name: b.name }; }); },
        groups: function(){ return GROUPS.slice(); },
        isOn: isOn,
        setOn: setOn,
        getChoice: getChoice,
        setChoice: setChoice,
        preview: preview,
        playAlert: playAlert,
        saveCustomFile: saveCustomFile,
        clearCustom: clearCustom,
        customName: customName,
        hasCustom: hasCustom,
        typeEnabled: typeEnabled,
        setType: setType,
        groupForAction: groupForAction
    };

})();


/* ===== js/xlsx-writer.js ===== */
// =========================================================
// KT ADMIN — XLSX WRITER (no libraries, no network)
// Builds a real .xlsx file (zip of XML parts, "stored" = uncompressed).
//
//   var bytes = KTXlsx.build({
//     sheets: [{
//       name: "Summary",
//       widths: [30, 18, 18],              // column widths (characters)
//       freeze: { rows: 1 },               // optional: freeze header rows
//       merges: ["A1:C1"],                 // optional
//       rows: [
//         [ {v:"Title", s:"title"} ],
//         [ "Text", 12.5, {v:34, s:"money"}, {f:"B2+C2", v:46.5, s:"money"} ],
//         ...
//       ]
//     }]
//   });
//   KTXlsx.download(bytes, "report.xlsx");
//
// Cell values:  null | number | string | Date | { v, f, s }
//   f = formula text without "=" ; v = value shown until the app recalculates
//   s = style name: title, header, section, bold, money, moneyBold, date,
//       note, good, bad, wrap, int, pct
// =========================================================

(function(){

    var enc = new TextEncoder();

    // ---------------------------------------------------------
    // Styles
    // ---------------------------------------------------------
    var NUMFMTS = {
        money: '"R"#,##0.00;[Red]-"R"#,##0.00',
        date:  'yyyy-mm-dd hh:mm',
        pct:   '0.00%',
        int:   '#,##0'
    };
    var NUMFMT_IDS = { money: 164, date: 165, pct: 166, int: 167 };

    var FONTS = [
        '<font><sz val="11"/><name val="Calibri"/></font>',                                              // 0 normal
        '<font><b/><sz val="11"/><name val="Calibri"/></font>',                                          // 1 bold
        '<font><b/><sz val="16"/><color rgb="FF0F2A55"/><name val="Calibri"/></font>',                   // 2 title
        '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>',                   // 3 header (white)
        '<font><i/><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font>',                   // 4 note
        '<font><b/><sz val="11"/><color rgb="FF166534"/><name val="Calibri"/></font>',                   // 5 good
        '<font><b/><sz val="11"/><color rgb="FF991B1B"/><name val="Calibri"/></font>'                    // 6 bad
    ];

    var FILLS = [
        '<fill><patternFill patternType="none"/></fill>',
        '<fill><patternFill patternType="gray125"/></fill>',
        '<fill><patternFill patternType="solid"><fgColor rgb="FF0F2A55"/><bgColor indexed="64"/></patternFill></fill>', // 2 header
        '<fill><patternFill patternType="solid"><fgColor rgb="FFE5ECF6"/><bgColor indexed="64"/></patternFill></fill>', // 3 section
        '<fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/><bgColor indexed="64"/></patternFill></fill>', // 4 good
        '<fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/><bgColor indexed="64"/></patternFill></fill>'  // 5 bad
    ];

    var BORDERS = [
        '<border><left/><right/><top/><bottom/><diagonal/></border>',
        '<border><left/><right/><top style="thin"><color rgb="FF9CA3AF"/></top><bottom style="double"><color rgb="FF9CA3AF"/></bottom><diagonal/></border>'  // 1 total line
    ];

    // name -> [numFmt, font, fill, border, wrap]
    var STYLES = {
        "default":   [null,    0, 0, 0, false],
        "title":     [null,    2, 0, 0, false],
        "header":    [null,    3, 2, 0, false],
        "section":   [null,    1, 3, 0, false],
        "bold":      [null,    1, 0, 0, false],
        "money":     ["money", 0, 0, 0, false],
        "moneyBold": ["money", 1, 0, 1, false],
        "date":      ["date",  0, 0, 0, false],
        "note":      [null,    4, 0, 0, true],
        "good":      [null,    5, 4, 0, false],
        "bad":       [null,    6, 5, 0, false],
        "wrap":      [null,    0, 0, 0, true],
        "int":       ["int",   0, 0, 0, false],
        "pct":       ["pct",   0, 0, 0, false]
    };
    var STYLE_NAMES = Object.keys(STYLES);

    function stylesXml(){
        var numFmts = Object.keys(NUMFMTS).map(function(k){
            return '<numFmt numFmtId="' + NUMFMT_IDS[k] + '" formatCode="' + esc(NUMFMTS[k]) + '"/>';
        }).join("");

        var xfs = STYLE_NAMES.map(function(n){
            var d = STYLES[n];
            var numId = d[0] ? NUMFMT_IDS[d[0]] : 0;
            return '<xf numFmtId="' + numId + '" fontId="' + d[1] + '" fillId="' + d[2] + '" borderId="' + d[3] +
                '" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"' +
                (d[4] ? ' applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' : '/>');
        }).join("");

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
            '<numFmts count="' + Object.keys(NUMFMTS).length + '">' + numFmts + '</numFmts>' +
            '<fonts count="' + FONTS.length + '">' + FONTS.join("") + '</fonts>' +
            '<fills count="' + FILLS.length + '">' + FILLS.join("") + '</fills>' +
            '<borders count="' + BORDERS.length + '">' + BORDERS.join("") + '</borders>' +
            '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
            '<cellXfs count="' + STYLE_NAMES.length + '">' + xfs + '</cellXfs>' +
            '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
            '</styleSheet>';
    }

    // ---------------------------------------------------------
    // XML helpers
    // ---------------------------------------------------------
    function esc(s){
        return String(s)
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function colName(i){            // 0 -> A, 25 -> Z, 26 -> AA
        var s = "";
        i = i + 1;
        while(i > 0){
            var m = (i - 1) % 26;
            s = String.fromCharCode(65 + m) + s;
            i = Math.floor((i - 1) / 26);
        }
        return s;
    }

    function styleIndex(name){
        var i = STYLE_NAMES.indexOf(name || "default");
        return i < 0 ? 0 : i;
    }

    function excelDate(d){
        // local wall-clock time, so the sheet shows the admin's own time
        return (d.getTime() - d.getTimezoneOffset() * 60000) / 86400000 + 25569;
    }

    function cellXml(ref, cell){
        if(cell === null || cell === undefined || cell === "") return "";

        var v = cell, f = null, s = "default";
        if(cell && typeof cell === "object" && !(cell instanceof Date)){
            v = cell.v; f = cell.f || null; s = cell.s || "default";
        }

        var si = styleIndex(s);
        var sAttr = si ? ' s="' + si + '"' : "";

        if(v instanceof Date){
            if(s === "default") sAttr = ' s="' + styleIndex("date") + '"';
            v = excelDate(v);
        }

        if(f){
            var fx = '<f>' + esc(f) + '</f>';
            if(typeof v === "number" && isFinite(v)) return '<c r="' + ref + '"' + sAttr + '>' + fx + '<v>' + v + '</v></c>';
            if(typeof v === "string") return '<c r="' + ref + '"' + sAttr + ' t="str">' + fx + '<v>' + esc(v) + '</v></c>';
            return '<c r="' + ref + '"' + sAttr + '>' + fx + '</c>';
        }

        if(typeof v === "number"){
            if(!isFinite(v)) return "";
            return '<c r="' + ref + '"' + sAttr + '><v>' + v + '</v></c>';
        }
        if(typeof v === "boolean"){
            return '<c r="' + ref + '"' + sAttr + ' t="b"><v>' + (v ? 1 : 0) + '</v></c>';
        }
        return '<c r="' + ref + '"' + sAttr + ' t="inlineStr"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
    }

    function sheetXml(sheet){
        var rows = sheet.rows || [];
        var maxCols = 1;
        rows.forEach(function(r){ if(r.length > maxCols) maxCols = r.length; });

        var cols = "";
        if(sheet.widths && sheet.widths.length){
            cols = '<cols>' + sheet.widths.map(function(w, i){
                return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
            }).join("") + '</cols>';
        }

        var pane = "";
        if(sheet.freeze && sheet.freeze.rows){
            var top = sheet.freeze.rows + 1;
            pane = '<pane ySplit="' + sheet.freeze.rows + '" topLeftCell="A' + top + '" activePane="bottomLeft" state="frozen"/>' +
                   '<selection pane="bottomLeft" activeCell="A' + top + '" sqref="A' + top + '"/>';
        }

        var data = rows.map(function(r, ri){
            var cells = r.map(function(c, ci){ return cellXml(colName(ci) + (ri + 1), c); }).join("");
            return cells ? '<row r="' + (ri + 1) + '">' + cells + '</row>' : '<row r="' + (ri + 1) + '"/>';
        }).join("");

        var merges = "";
        if(sheet.merges && sheet.merges.length){
            merges = '<mergeCells count="' + sheet.merges.length + '">' +
                sheet.merges.map(function(m){ return '<mergeCell ref="' + m + '"/>'; }).join("") + '</mergeCells>';
        }

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
            '<dimension ref="A1:' + colName(maxCols - 1) + Math.max(rows.length, 1) + '"/>' +
            '<sheetViews><sheetView workbookViewId="0"' + (sheet.hideGrid ? ' showGridLines="0"' : '') + '>' + pane + '</sheetView></sheetViews>' +
            '<sheetFormatPr defaultRowHeight="15"/>' + cols +
            '<sheetData>' + data + '</sheetData>' + merges +
            '</worksheet>';
    }

    // ---------------------------------------------------------
    // ZIP (stored)
    // ---------------------------------------------------------
    var CRC_TABLE = null;
    function crc32(bytes){
        if(!CRC_TABLE){
            CRC_TABLE = new Uint32Array(256);
            for(var n = 0; n < 256; n++){
                var c = n;
                for(var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                CRC_TABLE[n] = c >>> 0;
            }
        }
        var crc = 0xFFFFFFFF;
        for(var i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    function zip(files){          // files: [{name, data(Uint8Array)}]
        var now = new Date();
        var dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
        var dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

        var parts = [], central = [], offset = 0;

        files.forEach(function(f){
            var name = enc.encode(f.name);
            var crc = crc32(f.data);
            var size = f.data.length;

            var lh = new DataView(new ArrayBuffer(30));
            lh.setUint32(0, 0x04034b50, true);
            lh.setUint16(4, 20, true);
            lh.setUint16(6, 0x0800, true);
            lh.setUint16(8, 0, true);
            lh.setUint16(10, dosTime, true);
            lh.setUint16(12, dosDate, true);
            lh.setUint32(14, crc, true);
            lh.setUint32(18, size, true);
            lh.setUint32(22, size, true);
            lh.setUint16(26, name.length, true);
            lh.setUint16(28, 0, true);

            parts.push(new Uint8Array(lh.buffer), name, f.data);

            var ch = new DataView(new ArrayBuffer(46));
            ch.setUint32(0, 0x02014b50, true);
            ch.setUint16(4, 20, true);
            ch.setUint16(6, 20, true);
            ch.setUint16(8, 0x0800, true);
            ch.setUint16(10, 0, true);
            ch.setUint16(12, dosTime, true);
            ch.setUint16(14, dosDate, true);
            ch.setUint32(16, crc, true);
            ch.setUint32(20, size, true);
            ch.setUint32(24, size, true);
            ch.setUint16(28, name.length, true);
            ch.setUint32(42, offset, true);
            central.push(new Uint8Array(ch.buffer), name);

            offset += 30 + name.length + size;
        });

        var centralSize = central.reduce(function(n, p){ return n + p.length; }, 0);

        var end = new DataView(new ArrayBuffer(22));
        end.setUint32(0, 0x06054b50, true);
        end.setUint16(8, files.length, true);
        end.setUint16(10, files.length, true);
        end.setUint32(12, centralSize, true);
        end.setUint32(16, offset, true);

        var all = parts.concat(central, [new Uint8Array(end.buffer)]);
        var total = all.reduce(function(n, p){ return n + p.length; }, 0);
        var out = new Uint8Array(total), pos = 0;
        all.forEach(function(p){ out.set(p, pos); pos += p.length; });
        return out;
    }

    // ---------------------------------------------------------
    // Workbook
    // ---------------------------------------------------------
    function safeSheetName(n, used){
        var name = String(n || "Sheet").replace(/[\[\]\:\*\?\/\\]/g, " ").trim().slice(0, 31) || "Sheet";
        var base = name, i = 2;
        while(used.indexOf(name.toLowerCase()) !== -1){
            name = base.slice(0, 28) + " " + i++;
        }
        used.push(name.toLowerCase());
        return name;
    }

    function build(workbook){
        var sheets = workbook.sheets || [];
        var used = [];
        var names = sheets.map(function(s){ return safeSheetName(s.name, used); });

        var files = [];
        function add(name, text){ files.push({ name: name, data: enc.encode(text) }); }

        add("[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
            '<Default Extension="xml" ContentType="application/xml"/>' +
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
            sheets.map(function(_, i){
                return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
            }).join("") +
            '</Types>');

        add("_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
            '</Relationships>');

        add("xl/workbook.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
            '<bookViews><workbookView/></bookViews><sheets>' +
            names.map(function(n, i){
                return '<sheet name="' + esc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
            }).join("") +
            '</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>');

        add("xl/_rels/workbook.xml.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            sheets.map(function(_, i){
                return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
            }).join("") +
            '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
            '</Relationships>');

        add("xl/styles.xml", stylesXml());

        sheets.forEach(function(s, i){ add("xl/worksheets/sheet" + (i + 1) + ".xml", sheetXml(s)); });

        return zip(files);
    }

    function download(bytes, filename){
        var blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        setTimeout(function(){
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 1500);
    }

    var api = { build: build, download: download, colName: colName };

    if(typeof window !== "undefined") window.KTXlsx = api;
    if(typeof module !== "undefined" && module.exports) module.exports = api;

})();


/* ===== js/realtime.js ===== */
// =========================================================
// KT ADMIN — LIVE UPDATES (realtime)
// One shared Supabase Realtime connection for the whole panel.
//
//  - Pages register a refresh function:  KTRealtime.register(page, tables, fn)
//  - When a watched table changes, the current page refreshes itself
//    (debounced, never while a modal is open, so nothing you are working
//    on is disturbed).
//  - Sidebar badges (pending counts + unread support) stay live.
//  - New requests pop a small toast (+ optional beep). Pop-ups are driven by
//    the NOTIFICATION RECORDS (activity_log, category REQUESTS) — the same
//    records the Notifications page and push notifications use.
//  - Online presence: tells the support chat which users have the app open.
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
        // media-style self-managed modals
        return !!document.querySelector("#admin-body .media-modal.active, #admin-body .modal.active");
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
        ".dropdown.open > div:first-child .kt-badge-group{display:none}" +
        ".dropdown > div:first-child .kt-badge-group{margin-left:10px}" +
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

    // Badge on the Finance header so pending deposits + withdrawals stay
    // visible while the submenu is collapsed. It is hidden (CSS) when the
    // submenu is open, because Deposits / Withdrawals then show their own.
    function setFinanceBadge(total){
        var deposits = menuItemFor("deposits");
        if(!deposits || !deposits.parentElement || !deposits.parentElement.parentElement) return;

        var header = deposits.parentElement.parentElement.firstElementChild;   // .dropdown > header
        if(!header) return;

        var badge = header.querySelector(":scope > .kt-badge-group");

        if(!total || total < 1){
            if(badge) badge.remove();
            return;
        }

        if(!badge){
            badge = document.createElement("span");
            badge.className = "kt-badge kt-badge-group";
            var arrow = header.querySelector(":scope > .arrow");
            if(arrow) header.insertBefore(badge, arrow);
            else header.appendChild(badge);
        }

        badge.textContent = total > 99 ? "99+" : String(total);
    }

    function refreshBadges(){
        badgeTimer = null;
        if(typeof sb === "undefined") return;

        sb.rpc("get_pending_counts").then(function(res){
            if(res.error || !res.data || !res.data[0]) return;
            var r = res.data[0];
            setBadge("deposits",     r.deposits_pending     || 0);
            setBadge("withdrawals",  r.withdrawals_pending  || 0);
            setFinanceBadge((r.deposits_pending || 0) + (r.withdrawals_pending || 0));
            setBadge("verification", (r.kyc_pending || 0) + (r.kyc_resets_pending || 0));
            setBadge("users",        (r.password_resets_pending || 0) +
                                     (r.pin_resets_pending || 0) +
                                     (r.change_requests_pending || 0) +
                                     (r.unblock_requests_pending || 0));
        });

        sb.from("activity_log")
            .select("id", { count: "exact", head: true })
            .eq("category", "REQUESTS")
            .eq("is_read", false)
            .neq("action", "notification_sent")
            .then(function(res){
                if(res.error) return;
                setBadge("notifications", res.count || 0);
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
        if(window.KTSound) return KTSound.isOn();
        try{ return localStorage.getItem("kt.admin.sound") !== "off"; }catch(e){ return true; }
    }

    function beep(){
        // chosen sound (built-in or from the phone) from Settings > Sound
        if(window.KTSound){ KTSound.playAlert(); return; }
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

    // The header speaker was moved to Settings > Sound & Notifications.
    function removeSoundToggle(){
        var old = document.getElementById("kt-sound-toggle");
        if(old && old.parentNode) old.parentNode.removeChild(old);
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
            if(window.KTSound){ KTSound.setOn(!soundOn()); }
            else { try{ localStorage.setItem("kt.admin.sound", soundOn() ? "off" : "on"); }catch(e){} }
            paint();
            if(soundOn()) beep();
        });
        window.addEventListener("kt-sound-changed", paint);
        logout.parentNode.insertBefore(i, logout);
    }

    var PAGE_FOR_ACTION = {
        deposit_requested: "deposits",
        withdrawal_requested: "withdrawals",
        kyc_verification_requested: "verification",
        kyc_resubmission_requested: "verification",
        password_reset_requested: "users",
        withdrawal_pin_reset_requested: "users",
        personal_info_change_requested: "users",
        payment_methods_change_requested: "users",
        unblock_requested: "users",
        support_message_received: "support-chat"
    };

    var nameCache = {};

    function lookupName(userId){
        if(!userId) return Promise.resolve(null);
        if(nameCache[userId]) return Promise.resolve(nameCache[userId]);
        return sb.from("profiles").select("username, surname").eq("id", userId).maybeSingle()
            .then(function(res){
                if(res.error || !res.data) return null;
                var n = ((res.data.username || "") + " " + (res.data.surname || "")).trim();
                if(n) nameCache[userId] = n;
                return n || null;
            });
    }

    // Pop-ups come from the notification records (activity_log / REQUESTS),
    // using the same wording as the Notifications page.
    function announceRecord(payload){
        var row = payload.new;
        if(!row || row.category !== "REQUESTS" || row.action === "notification_sent") return;

        var isChat = row.action === "support_message_received";

        if(payload.eventType === "UPDATE"){
            // Only a refreshed (still unread) chat record is news; reading it is not.
            if(!isChat || row.is_read) return;
        } else if(payload.eventType !== "INSERT"){
            return;
        }

        // Settings > Sound & Notifications: this kind of alert may be switched off.
        if(window.KTSound && !KTSound.typeEnabled(KTSound.groupForAction(row.action))) return;

        // Do not alert for the conversation that is open on screen right now.
        if(isChat && currentPage === "support-chat" &&
           typeof window.getOpenSupportChatId === "function" &&
           window.getOpenSupportChatId() === row.target_id){
            return;
        }

        lookupName(row.actor_id).then(function(name){
            var title, text;
            if(isChat){
                title = name || "New support message";
                text  = (row.metadata && row.metadata.preview) || "Sent you a message";
            } else {
                title = (typeof labelForAction === "function") ? labelForAction(row.action) : "New request";
                text  = (typeof messageForEntry === "function") ? messageForEntry(row, name) : "A user sent a request.";
            }
            toast(title, text, PAGE_FOR_ACTION[row.action] || "notifications");
        });
    }

    function announce(table, payload){
        if(table === "activity_log") announceRecord(payload);
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
        removeSoundToggle();
        startPresence();

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

    // ---------------------------------------------------------
    // Online presence (who has the user app open)
    // Keys are SHA-256 hashes of user ids, so no real id is ever shared
    // between devices on the presence channel.
    // ---------------------------------------------------------

    var presenceChannel = null;
    var onlineKeys = {};
    var presenceListeners = [];
    var hashCache = {};

    function hashId(id){
        if(hashCache[id]) return Promise.resolve(hashCache[id]);
        if(!window.crypto || !crypto.subtle) return Promise.resolve(null);
        return crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(id)))
            .then(function(buf){
                var hex = Array.prototype.map.call(new Uint8Array(buf), function(b){
                    return ("0" + b.toString(16)).slice(-2);
                }).join("").slice(0, 32);
                hashCache[id] = hex;
                return hex;
            });
    }

    function readPresence(){
        if(!presenceChannel) return;
        var state = presenceChannel.presenceState() || {};
        var keys = {};
        Object.keys(state).forEach(function(k){ keys[k] = true; });
        onlineKeys = keys;
        presenceListeners.forEach(function(fn){ safeCall(fn); });
    }

    function startPresence(){
        if(presenceChannel || typeof sb === "undefined") return;

        sb.auth.getSession().then(function(res){
            var session = res && res.data && res.data.session;
            if(!session || presenceChannel) return;

            hashId(session.user.id).then(function(h){
                if(!h || presenceChannel) return;

                presenceChannel = sb.channel("kt-presence", { config: { presence: { key: "a-" + h } } });
                presenceChannel
                    .on("presence", { event: "sync" }, readPresence)
                    .subscribe(function(status){
                        if(status === "SUBSCRIBED"){
                            presenceChannel.track({ r: "a", at: Date.now() });
                        }
                    });
            });
        });
    }

    function stopPresence(){
        if(presenceChannel){
            try{ sb.removeChannel(presenceChannel); }catch(e){}
            presenceChannel = null;
        }
        onlineKeys = {};
    }

    function isUserOnline(userId){
        return hashId(userId).then(function(h){
            return !!(h && onlineKeys["u-" + h]);
        });
    }

    function onPresence(fn){
        if(typeof fn === "function") presenceListeners.push(fn);
    }

    function stop(){
        if(!started) return;
        started = false;
        everSubscribed = false;
        wasDown = false;
        try{ if(channel) sb.removeChannel(channel); }catch(e){}
        channel = null;
        stopPresence();
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
        toast: toast,
        isUserOnline: isUserOnline,
        onPresence: onPresence
    };

    // Safety net: if the admin signs out by any route, tear down.
    if(typeof sb !== "undefined" && sb.auth && sb.auth.onAuthStateChange){
        sb.auth.onAuthStateChange(function(event){
            if(event === "SIGNED_OUT") stop();
        });
    }

})();


/* ===== js/push.js ===== */
// =========================================================
// KT ADMIN — PUSH NOTIFICATIONS (device side)
// Lets an admin device receive notifications even when the app is closed.
// The notifications themselves are built on the server from the
// notification records (see supabase/functions/send-push).
//
// Header bell:   bell = on,  bell-slash = off.   Tap to turn on / off.
// Loaded after realtime.js. Requires `sb`.
// =========================================================

(function(){

    var VAPID_PUBLIC_KEY = "BEX5orXdHfmARKoe42fYAZIoMShjsZHKBi-lXnp_54dorhTg6neqCoUi53vB1_Im-fO6WydHf1c0xLtRgWgOk-M";

    function supported(){
        return ("serviceWorker" in navigator) && ("PushManager" in window) && ("Notification" in window);
    }

    function toBytes(b64u){
        var pad = "=".repeat((4 - b64u.length % 4) % 4);
        var b64 = (b64u + pad).replace(/-/g, "+").replace(/_/g, "/");
        var raw = atob(b64);
        var out = new Uint8Array(raw.length);
        for(var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
        return out;
    }

    function say(title, text){
        if(window.KTRealtime && KTRealtime.toast) KTRealtime.toast(title, text, null);
        else if(window.KTUI) KTUI.notify(title + ": " + text);
    }

    function getRegistration(){
        return navigator.serviceWorker.ready;
    }

    function currentSubscription(){
        return getRegistration().then(function(reg){ return reg.pushManager.getSubscription(); });
    }

    function saveSubscription(sub){
        return sb.auth.getSession().then(function(res){
            var session = res && res.data && res.data.session;
            if(!session) return false;

            var json = sub.toJSON();
            var keys = json.keys || {};

            return sb.from("admin_push_subscriptions")
                .upsert({
                    user_id: session.user.id,
                    endpoint: sub.endpoint,
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                    user_agent: navigator.userAgent,
                    last_seen_at: new Date().toISOString()
                }, { onConflict: "endpoint" })
                .then(function(r){
                    if(r.error){ console.warn("[KTPush] save failed", r.error); return false; }
                    return true;
                });
        });
    }

    function subscribe(){
        return getRegistration().then(function(reg){
            return reg.pushManager.getSubscription().then(function(existing){
                if(existing) return existing;
                return reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: toBytes(VAPID_PUBLIC_KEY)
                });
            });
        });
    }

    // ---- header bell ------------------------------------------------
    var bell = null;

    function paint(on){
        if(!bell) return;
        bell.className = "fa-solid " + (on ? "fa-bell" : "fa-bell-slash");
        bell.style.color = on ? "" : "#9aa3b2";
        bell.title = on ? "Notifications are on (tap to turn off)" : "Turn on notifications";
    }

    function refreshBell(){
        if(!supported()){ paint(false); return Promise.resolve(false); }
        if(Notification.permission !== "granted"){ paint(false); return Promise.resolve(false); }
        return currentSubscription().then(function(sub){
            paint(!!sub);
            return !!sub;
        }).catch(function(){ paint(false); return false; });
    }

    function enable(){
        if(!supported()){
            say("Notifications unavailable",
                "This browser cannot show push notifications. On iPhone, add the app to the Home Screen first.");
            return Promise.resolve(false);
        }
        if(Notification.permission === "denied"){
            say("Notifications are blocked", "Allow notifications for this app in your phone / browser settings, then try again.");
            return Promise.resolve(false);
        }

        return Notification.requestPermission().then(function(permission){
            if(permission !== "granted"){
                paint(false);
                say("Notifications not allowed", "Permission was not granted.");
                return false;
            }
            return subscribe().then(saveSubscription).then(function(ok){
                paint(ok);
                try{ window.dispatchEvent(new Event("kt-push-changed")); }catch(e){}
                say(ok ? "Notifications on" : "Could not turn on notifications",
                    ok ? "You will be alerted even when the app is closed." : "Please try again.");
                return ok;
            });
        }).catch(function(e){
            console.warn("[KTPush] enable failed", e);
            say("Could not turn on notifications", "Please try again.");
            return false;
        });
    }

    function disable(){
        return currentSubscription().then(function(sub){
            if(!sub) return true;
            var endpoint = sub.endpoint;
            return sub.unsubscribe().then(function(){
                return sb.from("admin_push_subscriptions").delete().eq("endpoint", endpoint);
            }).then(function(){ return true; });
        }).then(function(){
            paint(false);
            try{ window.dispatchEvent(new Event("kt-push-changed")); }catch(e){}
            say("Notifications off", "This device will no longer get alerts while the app is closed.");
        }).catch(function(e){ console.warn("[KTPush] disable failed", e); });
    }

    function installBell(){
        if(document.getElementById("kt-push-toggle")) return;
        var logout = document.getElementById("logout-btn");
        if(!logout || !logout.parentNode) return;

        bell = document.createElement("i");
        bell.id = "kt-push-toggle";
        bell.style.cssText = "margin-left:12px;cursor:pointer;";
        bell.addEventListener("click", function(){
            refreshBell().then(function(on){ return on ? disable() : enable(); });
        });
        logout.parentNode.insertBefore(bell, logout);
        paint(false);
    }

    // The header bell was moved to Settings > Sound & Notifications.
    function removeBell(){
        var old = document.getElementById("kt-push-toggle");
        if(old && old.parentNode) old.parentNode.removeChild(old);
    }

    // Call once after sign-in.
    function init(){
        removeBell();
        if(!supported()) return;

        // Already allowed on this device: make sure the subscription exists and is saved.
        if(Notification.permission === "granted"){
            subscribe().then(saveSubscription).then(refreshBell).catch(function(e){
                console.warn("[KTPush] sync failed", e);
            });
        } else {
            refreshBell();
        }
    }

    // { supported, permission, subscribed }
    function status(){
        if(!supported()){
            return Promise.resolve({ supported: false, permission: "unsupported", subscribed: false });
        }
        if(Notification.permission !== "granted"){
            return Promise.resolve({ supported: true, permission: Notification.permission, subscribed: false });
        }
        return currentSubscription().then(function(sub){
            return { supported: true, permission: "granted", subscribed: !!sub };
        }).catch(function(){
            return { supported: true, permission: "granted", subscribed: false };
        });
    }

    window.KTPush = { init: init, enable: enable, disable: disable, status: status };

})();


/* ===== js/auth.js ===== */
// KT Admin Panel — Admin authentication gate
// Nothing in the panel is shown until a signed-in user is confirmed
// to have the 'admin' role in user_roles.

function showLoginOverlay(message){
    document.getElementById("login-overlay").style.display = "flex";
    document.getElementById("admin-app").style.display = "none";

    const errEl = document.getElementById("login-error");
    if(message){
        errEl.textContent = message;
        errEl.style.display = "block";
    } else {
        errEl.style.display = "none";
    }

    if(typeof ktHideSplash === "function") ktHideSplash();
}

function hideLoginOverlay(){
    document.getElementById("login-overlay").style.display = "none";
    document.getElementById("admin-app").style.display = "";

    if(typeof ktHideSplash === "function") ktHideSplash();
}

async function checkIsAdmin(userId){
    const { data, error } = await sb
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

    return !error && !!data;
}

// =========================================================
// ADMIN DEVICE / CLIENT INFORMATION
// =========================================================

function getAdminClientInfo(){
    const ua = navigator.userAgent || "";

    let deviceName = "Unknown device";
    let osName = "Unknown";
    let osVersion = "Unknown";

    const androidMatch = ua.match(/Android\s+([0-9.]+)/i);

    if(androidMatch){
        osName = "Android";
        osVersion = androidMatch[1];

        const modelMatch = ua.match(
            /Android\s+[0-9.]+;\s*(?:[a-z]{2}-[A-Z]{2};\s*)?([^;)]+?)(?:\s+Build\/|\))/i
        );

        if(modelMatch && modelMatch[1]){
            deviceName = modelMatch[1].trim();
        }
    }
    else if(/iPhone/i.test(ua)){
        osName = "iOS";
        deviceName = "iPhone";
    }
    else if(/iPad/i.test(ua)){
        osName = "iOS";
        deviceName = "iPad";
    }
    else if(/Windows NT/i.test(ua)){
        osName = "Windows";
        deviceName = "Windows device";

        const windowsMatch = ua.match(/Windows NT\s+([0-9.]+)/i);
        if(windowsMatch){
            osVersion = windowsMatch[1];
        }
    }
    else if(/Mac OS X/i.test(ua)){
        osName = "macOS";
        deviceName = "Mac";

        const macMatch = ua.match(/Mac OS X\s+([0-9_]+)/i);
        if(macMatch){
            osVersion = macMatch[1].replace(/_/g, ".");
        }
    }

    let deviceId = localStorage.getItem("kt_admin_device_id");

    if(!deviceId){
        if(typeof crypto !== "undefined" && crypto.randomUUID){
            deviceId = crypto.randomUUID();
        }else{
            deviceId = "kt-admin-" + Date.now() + "-" + Math.random().toString(36).substring(2);
        }

        localStorage.setItem("kt_admin_device_id", deviceId);
    }

    return {
        deviceId,
        deviceName,
        osName,
        osVersion
    };
}


// =========================================================
// LOAD ADMIN PROFILE INTO SIDEBAR
// =========================================================

async function loadAdminSidebarProfile(userId){

    const avatar = document.getElementById("sidebarAdminAvatar");
    const nameElement = document.getElementById("sidebarAdminName");
    const surnameElement = document.getElementById("sidebarAdminSurname");

    if(!avatar || !nameElement || !surnameElement || !userId){
        return;
    }

    const { data, error } = await sb
        .from("profiles")
        .select("username, surname")
        .eq("id", userId)
        .maybeSingle();

    if(error){
        console.warn("Failed to load admin sidebar profile:", error);
        return;
    }

    const name = (data?.username || "Admin").trim();
    const surname = (data?.surname || "").trim();

    const nameInitial = name.charAt(0).toUpperCase();
    const surnameInitial = surname.charAt(0).toUpperCase();

    avatar.textContent = nameInitial + surnameInitial;

    nameElement.textContent = name;

    surnameElement.textContent = surname;
}

// =========================================================
// HANDLE AUTHENTICATED ADMIN-PANEL SESSION
// =========================================================

async function handleAuthedSession(session){

    // Always restore the logout button when entering
    // an authenticated admin session.
    resetLogoutButtonState();

    const clientInfo = getAdminClientInfo();
    const isAdmin = await checkIsAdmin(session.user.id);

    if(isAdmin){
        // Only an account that has the admin role is allowed to create
        // a successful ADMIN APP login audit record.
        sb.rpc("admin_record_successful_login", {
            p_device_id: clientInfo.deviceId,
            p_device_name: clientInfo.deviceName,
            p_os_name: clientInfo.osName,
            p_os_version: clientInfo.osVersion,
            p_approximate_location: null,
            p_session_id: null
        }).then(({ error: logError }) => {
            if(logError){
                console.warn("Admin login audit error:", logError);
            }
        });

        hideLoginOverlay();

await loadAdminSidebarProfile(session.user.id);

if(typeof loadAdminPage === "function"){
    // A tapped push notification opens the app on the relevant page.
    var startPage = "dashboard";
    try{
        var requestedPage = new URLSearchParams(location.search).get("page");
        if(requestedPage && /^[a-z-]+$/.test(requestedPage)){
            startPage = requestedPage;
        }
        if(requestedPage){
            history.replaceState(null, "", location.pathname);
        }
    }catch(e){}
    loadAdminPage(startPage);
}

// Live updates (realtime) — safe to call more than once.
if(window.KTRealtime){
    KTRealtime.start();
}

// Push notifications (header bell) — safe to call more than once.
if(window.KTPush){
    KTPush.init();
}
return;
    }

    // A real Supabase login succeeded, but this account is not an admin.
    // This is an ADMIN APP security event, not a normal User App login.
    const { error: securityError } = await sb.rpc(
        "admin_record_non_admin_login",
        {
            p_device_id: clientInfo.deviceId,
            p_device_name: clientInfo.deviceName,
            p_os_name: clientInfo.osName,
            p_os_version: clientInfo.osVersion,
            p_approximate_location: null,
            p_session_id: null
        }
    );

    if(securityError){
        console.warn("Non-admin login audit error:", securityError);
    }

    await sb.auth.signOut();
    showLoginOverlay("This account doesn't have admin access.");
}

async function initAuth(){
    const { data: { session } } = await sb.auth.getSession();

    if(session){
        await handleAuthedSession(session);
    } else {
        showLoginOverlay();
    }
}

async function loginSubmit(event){
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const btn = document.getElementById("login-submit-btn");

    // In-app validation (the browser's own "fill out this field" bubble is off).
    if(!email || !password){
        const missingEl = document.getElementById("login-error");
        if(missingEl){
            missingEl.textContent = !email
                ? "Please enter your email address."
                : "Please enter your password.";
            missingEl.style.display = "block";
        }
        return;
    }

    const done = KTUI.busy(btn, "Signing in...");

    const { data, error } = await sb.auth.signInWithPassword({
        email,
        password
    });

    if(error){
        done();

        // This RPC is explicitly for the ADMIN APP. It is separate from
        // the User App's authentication flow.
        const clientInfo = getAdminClientInfo();

        const maskedIdentifier =
            email.length > 4
                ? "******" + email.slice(-4)
                : "******";

        sb.rpc("admin_record_failed_login", {
            p_identifier_masked: maskedIdentifier,
            p_reason: "Invalid credentials",
            p_device_name: clientInfo.deviceName,
            p_os_name: clientInfo.osName,
            p_os_version: clientInfo.osVersion,
            p_approximate_location: null
        }).then(({ error: logError }) => {
            if(logError){
                console.warn("Failed-login audit error:", logError);
            }
        });

        showLoginOverlay(error.message);
        return;
    }

    try{
        await handleAuthedSession(data.session);
    }finally{
        done();
    }
}

// =========================================================
// LOGOUT CONFIRMATION MODAL
// =========================================================

function openLogoutModal(){
    const modal = document.getElementById("logoutModal");
    if(!modal) return;
    modal.classList.add("show");
}

function closeLogoutModal(){
    const modal = document.getElementById("logoutModal");
    if(!modal) return;
    modal.classList.remove("show");
}

function resetLogoutButtonState(){
    const confirmBtn = document.querySelector(".logout-confirm-btn");

    if(!confirmBtn) return;

    confirmBtn.disabled = false;
    confirmBtn.textContent = "Confirm";
}

// =========================================================
// CONFIRM ADMIN LOGOUT
// =========================================================

async function confirmAdminLogout(){
    const confirmBtn = document.querySelector(".logout-confirm-btn");

    if(confirmBtn){
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Logging out...";
    }

    // The RPC is admin-specific and runs before the Supabase session is
    // destroyed so auth.uid() is still available to the database.
    const { error: auditError } = await sb.rpc("admin_record_logout");

    if(auditError){
        console.warn("Logout audit error:", auditError);
    }

    const { error } = await sb.auth.signOut();

    if(error){
        console.error("Logout failed:", error);

        if(confirmBtn){
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Confirm";
        }
        return;
    }

    resetLogoutButtonState();
    closeLogoutModal();
    showLoginOverlay();
}

function adminLogout(){
    openLogoutModal();
}

// =========================================================
// CLOSE LOGOUT MODAL — OUTSIDE CLICK
// =========================================================

document.addEventListener("click", function(event){
    const modal = document.getElementById("logoutModal");
    if(!modal) return;

    if(modal.classList.contains("show") && event.target === modal){
        closeLogoutModal();
    }
});

document.addEventListener("DOMContentLoaded", initAuth);


/* ===== js/admin.js ===== */
// ==============================
// ADMIN PAGE LOADING SYSTEM
// ==============================


const adminBody = document.getElementById("admin-body");

// ==============================
// ADMIN PAGE LOADING SYSTEM
// ==============================




// ======================================================
// GLOBAL PAGE LOADER
// ======================================================

const globalPageLoader =
    document.getElementById("global-page-loader");


let pageLoading = false;

let pageFetchRequests = 0;

let pageLoadGeneration = 0;

let pageLoadQuietTimer = null;


// ======================================================
// SHOW GLOBAL LOADER
// ======================================================

function showGlobalPageLoader(){

    if(!globalPageLoader) return;

    globalPageLoader.classList.add("show");

}


// ======================================================
// HIDE GLOBAL LOADER
// ======================================================

function hideGlobalPageLoader(){

    if(!globalPageLoader) return;

    globalPageLoader.classList.remove("show");

}


// ======================================================
// WAIT UNTIL INITIAL PAGE REQUESTS ARE FINISHED
// ======================================================

function finishGlobalPageLoading(generation){

    if(generation !== pageLoadGeneration){

        return;

    }


    clearTimeout(pageLoadQuietTimer);


    /*
     * Give the page a very short quiet period.
     *
     * This is important because page initialization can
     * start another Supabase request immediately after
     * the first request finishes.
     */

    pageLoadQuietTimer = setTimeout(()=>{

        if(generation !== pageLoadGeneration){

            return;

        }


        if(pageFetchRequests === 0){

            pageLoading = false;

            hideGlobalPageLoader();

        }

        else{

            finishGlobalPageLoading(generation);

        }

    },120);

}


// ======================================================
// TRACK FETCH REQUESTS DURING PAGE INITIALIZATION
// ======================================================
//
// Supabase requests use fetch internally.
// This allows the global loader to wait for those
// requests without changing every individual page JS.
// ======================================================

const originalFetch = window.fetch.bind(window);


window.fetch = function(...args){

    const shouldTrack =
        pageLoading === true;


    if(shouldTrack){

        pageFetchRequests++;

    }


    return originalFetch(...args)

        .finally(()=>{

            if(!shouldTrack){

                return;

            }


            pageFetchRequests--;


            if(pageFetchRequests < 0){

                pageFetchRequests = 0;

            }

        });

};


// ======================================================
// START PAGE LOADING
// ======================================================

function startGlobalPageLoading(){

    pageLoadGeneration++;

    pageLoading = true;

    pageFetchRequests = 0;

    clearTimeout(pageLoadQuietTimer);

    showGlobalPageLoader();

    return pageLoadGeneration;

}

document.addEventListener(
    "contextmenu",
    function(event) {

        if (
            event.target.closest(
                "input, textarea, [contenteditable='true']"
            )
        ) {

            return;

        }


        event.preventDefault();

    }
);

// Load admin page

// ======================================================
// ADMIN PAGE CACHE
// ======================================================

const pageCache = {};


// ======================================================
// LOAD ADMIN PAGE
// ======================================================

function loadAdminPage(page){

    const loadingGeneration =
        startGlobalPageLoading();


    adminBody.classList.remove("page-fade-in");


    const render = (data) => {

        /*
         * A newer page may have been requested while this
         * page was loading.
         *
         * If so, do not allow the older page to hide the
         * loader or overwrite the newer page.
         */

        if(
            loadingGeneration !== pageLoadGeneration
        ){

            return;

        }


        adminBody.innerHTML = data;

        adminBody.appendChild(modalOverlay);


        // Reset scroll position

        adminBody.scrollTop = 0;


        // Change active menu

        setActiveMenu(page);


        // Trigger fade-in transition

        requestAnimationFrame(()=>{

            adminBody.classList.add(
                "page-fade-in"
            );

        });


        // ==================================================
        // INITIALIZE PAGE SCRIPTS
        // ==================================================

        // Live updates: forget the previous page's refresh hook; the
        // page's own init function below registers its own.
        if(window.KTRealtime){
            KTRealtime.setPage(page);
        }

        switch(page){

            case "transactions":

                if(
                    typeof initTransactions === "function"
                ){

                    initTransactions();

                }

            break;


            case "withdrawals":

                if(
                    typeof initWithdrawals === "function"
                ){

                    initWithdrawals();

                }

            break;


            case "deposits":

                if(
                    typeof initDeposits === "function"
                ){

                    initDeposits();

                }

            break;


            case "plans":

                if(
                    typeof initPlans === "function"
                ){

                    initPlans();

                }

            break;


            case "users":

                if(
                    typeof initUsers === "function"
                ){

                    initUsers();

                }

            break;


            case "verification":

                if(
                    typeof initVerification === "function"
                ){

                    initVerification();

                }

            break;


            case "exchange":

                if(
                    typeof initExchangeRates === "function"
                ){

                    initExchangeRates();

                }

            break;


            case "notifications":

                if(
                    typeof initNotifications === "function"
                ){

                    initNotifications();

                }

            break;


            case "activity-log":

                if(
                    typeof initActivityLogs === "function"
                ){

                    initActivityLogs();

                }

            break;


            case "support-chat":

                if(
                    typeof initSupportChatPage === "function"
                ){

                    initSupportChatPage();

                }

            break;


            case "media":

                if(
                    typeof initMedia === "function"
                ){

                    initMedia();

                }

            break;


            case "settings":

                if(
                    typeof initSettings === "function"
                ){

                    initSettings();

                }

            break;


            case "dashboard":

                if(
                    typeof initDashboard === "function"
                ){

                    initDashboard();

                }

            break;

        }


        /*
         * The page's initialization functions above may have
         * started Supabase/fetch requests.
         *
         * Wait until those requests have finished before
         * removing the loader.
         */

        finishGlobalPageLoading(
            loadingGeneration
        );

    };


    // ==================================================
    // SERVE FROM CACHE
    // ==================================================

    if(pageCache[page]){

        render(pageCache[page]);

        return;

    }


    // ==================================================
    // LOAD PAGE HTML
    // ==================================================

    fetch(
        "admin-pages/" + page + ".html"
    )

    .then(response=>{

        if(!response.ok){

            throw new Error(
                "Page not found"
            );

        }


        return response.text();

    })

    .then(data=>{

        pageCache[page] = data;

        render(data);

    })

    .catch(error=>{

        if(
            loadingGeneration !== pageLoadGeneration
        ){

            return;

        }


        adminBody.innerHTML = `

        <div class="admin-card">

            <h2>Page Error</h2>

            <p>${error.message}</p>

        </div>

        `;


        requestAnimationFrame(()=>{

            adminBody.classList.add(
                "page-fade-in"
            );

        });


        /*
         * Even if the page fails, never leave the
         * loading spinner stuck on the screen.
         */

        pageLoading = false;

        pageFetchRequests = 0;

        hideGlobalPageLoader();

    });

}

// Silently pre-fetch every other page into cache right after
// the dashboard loads, so switching pages later feels instant
// even on the first click.
function prefetchAllPages(){
    const pages = [
        "deposits","withdrawals","transactions","plans","users",
        "verification","exchange","notifications","activity-log",
        "support-chat","media","settings"
    ];

    pages.forEach(page=>{
        if(pageCache[page]) return;
        fetch("admin-pages/" + page + ".html")
        .then(response=> response.ok ? response.text() : null)
        .then(data=>{
            if(data) pageCache[page] = data;
        })
        .catch(()=>{ /* silent — will just fetch normally if this fails */ });
    });
}


// ==============================
// ACTIVE SIDEBAR ITEM
// ==============================


function setActiveMenu(page) {
    // Clear all active states
    document.querySelectorAll(".side-item, .submenu div")
        .forEach(item => item.classList.remove("active"));

    // Highlight the correct sidebar item
    document.querySelectorAll(".side-item")
        .forEach(item => {
            if (item.getAttribute("onclick")?.includes(page)) {
                item.classList.add("active");
            }
        });

    // Highlight the correct submenu item
    document.querySelectorAll(".submenu div")
        .forEach(item => {
            if (item.getAttribute("onclick")?.includes(page)) {
                item.classList.add("active");

                // Keep parent dropdown open when submenu is active
                const parentDropdown = item.closest(".dropdown");
                if (parentDropdown) {
                    parentDropdown.classList.add("open");
                }
            }
        });
}




// ==============================
// DROPDOWN MENU
// ==============================


function toggleMenu(element){


    const parent = element.parentElement;


    parent.classList.toggle("open");


}






// ==============================
// MOBILE SIDEBAR
// ==============================


const menuBtn = document.getElementById("menu-btn");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");

function openSidebar(){
    sidebar.classList.add("show");
    sidebarOverlay.classList.add("show");
}

function closeSidebar(){
    sidebar.classList.remove("show");
    sidebarOverlay.classList.remove("show");
}

menuBtn.addEventListener("click",()=>{
    if(sidebar.classList.contains("show")){
        closeSidebar();
    } else {
        openSidebar();
    }
});

// Tapping the blurred area closes the sidebar
sidebarOverlay.addEventListener("click", closeSidebar);






// Close sidebar only when selecting a page
document.querySelectorAll(".submenu div, .side-item:not(.dropdown)")
.forEach(item=>{
    item.addEventListener("click",()=>{
        if(window.innerWidth <= 768){
            closeSidebar();
        }
    });
});


// ==============================
// GLOBAL MODAL OVERLAY (blur + click-block)
// Auto-detects any element whose class ends in "-modal"
// becoming visible, on ANY page loaded into #admin-body.
// No per-page code required — works for every current
// and future modal that follows the "*-modal" naming
// convention already used across the project.
// ==============================

const modalOverlay = document.createElement("div");
modalOverlay.id = "modal-overlay";


function isVisible(el){
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
}

function refreshModalOverlay(){
    const modals = document.querySelectorAll('#admin-body [class$="-modal"]');
    let anyOpen = false;

    modals.forEach(modal=>{
        if(!isRealModal(modal)) return; // skip stray buttons/boxes that just end in "-modal"
        if(modal.querySelector(':scope > [class*="-overlay"]')) return; // media-style self-managed modals
        if(isVisible(modal)){
            anyOpen = true;
        }
    });

    modalOverlay.classList.toggle("show", anyOpen);
}

modalOverlay.addEventListener("click",()=>{
    document.querySelectorAll('#admin-body [class$="-modal"]')
    .forEach(modal=>{
        if(!isRealModal(modal)) return;
        if(modal.querySelector(':scope > [class*="-overlay"]')) return;

        if(isVisible(modal)){
            modal.style.display = "none";
        }
    });
});

function isRealModal(el){
    return window.getComputedStyle(el).position === "fixed";
}

// Watches the whole admin body for style/class changes on
// any descendant — catches every way a modal might be shown
// (style.display, classList.add, etc.) without needing to
// know each page's exact open/close functions.
const modalObserver = new MutationObserver(refreshModalOverlay);

modalObserver.observe(adminBody, {
    attributes:true,
    attributeFilter:["style","class"],
    subtree:true,
    childList:true
});

// Clicking the blurred backdrop closes whatever modal is open



// ==============================
// LOAD DEFAULT PAGE
// ==============================

window.onload = ()=>{

    // Nothing auto-loads here anymore — auth.js calls
    // loadAdminPage("dashboard") itself once login is confirmed.

    // Wait until the browser is idle so this never competes
    // with the dashboard's own initial render
    if("requestIdleCallback" in window){
        requestIdleCallback(prefetchAllPages);
    } else {
        setTimeout(prefetchAllPages, 1000);
    }

};

// ==================================================
// OPEN A PAGE WHEN A PUSH NOTIFICATION IS TAPPED
// (the service worker posts the page name to the open app)
// ==================================================

if("serviceWorker" in navigator){
    navigator.serviceWorker.addEventListener("message", function(event){
        var data = event.data;
        if(!data || data.type !== "kt-open-page") return;

        var app = document.getElementById("admin-app");
        if(!app || app.style.display === "none") return;   // not signed in

        if(typeof loadAdminPage === "function" && /^[a-z-]+$/.test(String(data.page))){
            loadAdminPage(data.page);
        }
    });
}


/* ===== js/withdrawals.js ===== */
// =====================================
// WITHDRAWAL MANAGEMENT
// =====================================


// =====================================
// LIVE DATA (populated from Supabase)
// =====================================

let withdrawals = {};


// =====================================
// METHOD LABEL HELPER
// =====================================

function formatWithdrawalMethodLabel(method){

    const labels = {
        usdt_trc20: "USDT (TRC20)",
        mpesa: "M-Pesa",
        ecocash: "EcoCash"
    };

    return labels[method] || method;

}


// =====================================
// LOAD WITHDRAWALS FROM SUPABASE
// =====================================

function loadWithdrawals(){

    sb.from("withdrawals")
        .select("id, amount_zar, status, created_at, profiles(username), payment_methods(method)")
        .order("created_at", { ascending: false })

        .then(({ data, error }) => {

            if(error){

                console.error("Failed to load withdrawals:", error);

                return;

            }

            withdrawals = {};

            data.forEach(row => {

                withdrawals[row.id] = {

                    id: row.id,

                    user: row.profiles ? row.profiles.username : "Unknown",

                    method: row.payment_methods
                        ? formatWithdrawalMethodLabel(row.payment_methods.method)
                        : "—",

                    amount: "M " + Number(row.amount_zar).toLocaleString("en-US"),

                    date: new Date(row.created_at).toLocaleDateString("en-US", {
                        day: "2-digit", month: "short", year: "numeric"
                    }),

                    status: row.status.charAt(0).toUpperCase() + row.status.slice(1)

                };

            });

            renderWithdrawalTables();

            updateWithdrawalStats();

        });

}



// =====================================
// INIT WITHDRAWALS
// =====================================

function initWithdrawals(){

    console.log("Withdrawals initialized");


    // Load real data (renders + updates stats when it arrives)

    loadWithdrawals();

    if(window.KTRealtime){
        KTRealtime.register("withdrawals", ["withdrawals"], loadWithdrawals);
    }


    // Show Pending by default

    showWithdrawalTab("pending");

}



// =====================================
// UPDATE WITHDRAWAL STATISTICS
// =====================================

function updateWithdrawalStats(){

    let pending = 0;

    let approved = 0;

    let rejected = 0;


    Object.values(withdrawals).forEach(withdrawal => {

        if(withdrawal.status === "Pending"){

            pending++;

        }

        else if(withdrawal.status === "Approved"){

            approved++;

        }

        else if(withdrawal.status === "Rejected"){

            rejected++;

        }

    });



    // =================================
    // UPDATE COUNTERS
    // =================================

    const pendingCount =
        document.getElementById(
            "wpendingCount"
        );

    const approvedCount =
        document.getElementById(
            "wapprovedCount"
        );

    const rejectedCount =
        document.getElementById(
            "wrejectedCount"
        );


    if(pendingCount){

        pendingCount.textContent =
            pending;

    }


    if(approvedCount){

        approvedCount.textContent =
            approved;

    }


    if(rejectedCount){

        rejectedCount.textContent =
            rejected;

    }

}



// =====================================
// SHOW EMPTY WITHDRAWAL MESSAGE
// =====================================

function showEmptyWithdrawalMessage(
    list,
    message,
    columnCount
){

    if(!list) return;


    list.innerHTML = `

        <tr class="empty-withdrawal-row">

            <td colspan="${columnCount}">

                <div class="empty-withdrawal-message">

                    <i class="fa-solid fa-inbox"></i>

                    <span>
                        ${message}
                    </span>

                </div>

            </td>

        </tr>

    `;

}



// =====================================
// RENDER ALL WITHDRAWAL TABLES
// =====================================

function renderWithdrawalTables(){

    const pendingList =
        document.getElementById(
            "pendingWithdrawalList"
        );

    const approvedList =
        document.getElementById(
            "approvedWithdrawalList"
        );

    const rejectedList =
        document.getElementById(
            "rejectedWithdrawalList"
        );


    // =================================
    // CHECK TABLES
    // =================================

    if(
        !pendingList ||
        !approvedList ||
        !rejectedList
    ){

        console.warn(
            "Withdrawal table elements not found"
        );

        return;

    }



    // =================================
    // CLEAR TABLES
    // =================================

    pendingList.innerHTML = "";

    approvedList.innerHTML = "";

    rejectedList.innerHTML = "";



    // =================================
    // GENERATE ROWS
    // =================================
    // NOTE: withdrawal.id is now a UUID. It must be quoted inside
    // onclick="..." — unquoted, the hyphens are read as
    // subtraction and the button silently does nothing.

    Object.values(withdrawals).forEach(
        withdrawal => {


        // =================================
        // PENDING
        // =================================

        if(withdrawal.status === "Pending"){

            pendingList.innerHTML += `

                <tr>

                    <td>
                        ${withdrawal.user}
                    </td>

                    <td>
                        ${withdrawal.date}
                    </td>

                    <td>

                        <button
                            class="review-btn"
                            onclick="openWithdrawalReview('${withdrawal.id}')">

                            Review

                        </button>

                    </td>

                </tr>

            `;

        }



        // =================================
        // APPROVED
        // =================================

        else if(
            withdrawal.status === "Approved"
        ){

            approvedList.innerHTML += `

                <tr>

                    <td>
                        ${withdrawal.user}
                    </td>

                    <td>
                        ${withdrawal.date}
                    </td>

                    <td>

                        <span class="approved">
                            Approved
                        </span>

                    </td>

                    <td>

                        <button
                            class="view-btn"
                            onclick="openWithdrawalReview('${withdrawal.id}')">

                            View

                        </button>

                    </td>

                </tr>

            `;

        }



        // =================================
        // REJECTED
        // =================================

        else if(
            withdrawal.status === "Rejected"
        ){

            rejectedList.innerHTML += `

                <tr>

                    <td>
                        ${withdrawal.user}
                    </td>

                    <td>
                        ${withdrawal.date}
                    </td>

                    <td>

                        <span class="rejected">
                            Rejected
                        </span>

                    </td>

                    <td>

                        <button
                            class="view-btn"
                            onclick="openWithdrawalReview('${withdrawal.id}')">

                            View

                        </button>

                    </td>

                </tr>

            `;

        }

    });



    // =====================================
    // SHOW EMPTY MESSAGES
    // =====================================


    // Pending

    if(pendingList.children.length === 0){

        showEmptyWithdrawalMessage(
            pendingList,
            "No pending withdrawal requests",
            3
        );

    }



    // Approved

    if(approvedList.children.length === 0){

        showEmptyWithdrawalMessage(
            approvedList,
            "No approved withdrawals",
            4
        );

    }



    // Rejected

    if(rejectedList.children.length === 0){

        showEmptyWithdrawalMessage(
            rejectedList,
            "No rejected withdrawals",
            4
        );

    }

}



// =====================================
// WITHDRAWAL TABS
// =====================================

function showWithdrawalTab(
    tab,
    clickedButton = null
){

    // =================================
    // SECTION IDS
    // =================================

    const sectionIds = {

        pending: "wpending",

        approved: "wapproved",

        rejected: "wrejected"

    };



    // =================================
    // HIDE ALL SECTIONS
    // =================================

    document
        .querySelectorAll(
            ".withdrawal-section"
        )
        .forEach(section => {

            section.classList.remove(
                "active-section"
            );

        });



    // =================================
    // REMOVE ACTIVE TAB
    // =================================

    document
        .querySelectorAll(
            ".wtab-btn"
        )
        .forEach(button => {

            button.classList.remove("active");

        });



    // =================================
    // GET SECTION
    // =================================

    const sectionId =
        sectionIds[tab];


    const section =
        document.getElementById(sectionId);



    // =================================
    // SHOW SECTION
    // =================================

    if(section){

        section.classList.add(
            "active-section"
        );

    }



    // =================================
    // ACTIVATE BUTTON
    // =================================

    if(clickedButton){

        clickedButton.classList.add("active");

    }

    else{

        const buttons =
            document.querySelectorAll(".wtab-btn");


        if(tab === "pending" && buttons[0]){

            buttons[0].classList.add("active");

        }

        else if(tab === "approved" && buttons[1]){

            buttons[1].classList.add("active");

        }

        else if(tab === "rejected" && buttons[2]){

            buttons[2].classList.add("active");

        }

    }

}



// =====================================
// OPEN WITHDRAWAL REVIEW MODAL
// =====================================

function openWithdrawalReview(id){

    const withdrawal =
        withdrawals[id];


    if(!withdrawal){

        console.error(
            "Withdrawal not found:",
            id
        );

        return;

    }



    // =================================
    // USER
    // =================================

    const user =
        document.getElementById(
            "review-user"
        );


    if(user){

        user.textContent =
            withdrawal.user;

    }



    // =================================
    // METHOD
    // =================================

    const method =
        document.getElementById(
            "review-method"
        );


    if(method){

        method.textContent =
            withdrawal.method;

    }



    // =================================
    // AMOUNT
    // =================================

    const amount =
        document.getElementById(
            "review-amount"
        );


    if(amount){

        amount.textContent =
            withdrawal.amount;

    }



    // =================================
    // DATE
    // =================================

    const date =
        document.getElementById(
            "review-date"
        );


    if(date){

        date.textContent =
            withdrawal.date;

    }



    // =================================
    // OPEN MODAL
    // =================================

    const modal =
        document.getElementById(
            "withdrawalModal"
        );


    if(modal){

        modal.style.display =
            "flex";

    }



    // =================================
    // APPROVE BUTTON
    // =================================

    const approveBtn =
        document.querySelector(
            "#withdrawalModal .approve-btn"
        );



    // =================================
    // REJECT BUTTON
    // =================================

    const rejectBtn =
        document.querySelector(
            "#withdrawalModal .reject-btn"
        );



    // =================================
    // PENDING WITHDRAWAL
    // =================================

    if(
        withdrawal.status === "Pending"
    ){


        // =================================
        // APPROVE
        // =================================

        if(approveBtn){

            approveBtn.style.display =
                "inline-block";


            // Remove old handler

            approveBtn.onclick = null;


            // Add new handler

            approveBtn.onclick =
                function(){

                    approveWithdrawal(
                        withdrawal.id,
                        approveBtn,
                        rejectBtn
                    );

                };

        }



        // =================================
        // REJECT
        // =================================

        if(rejectBtn){

            rejectBtn.style.display =
                "inline-block";


            // Remove old handler

            rejectBtn.onclick = null;


            // Add new handler

            rejectBtn.onclick =
                function(){

                    rejectWithdrawal(
                        withdrawal.id,
                        rejectBtn,
                        approveBtn
                    );

                };

        }

    }



    // =================================
    // APPROVED / REJECTED
    // =================================

    else{


        if(approveBtn){

            approveBtn.style.display =
                "none";

            approveBtn.onclick = null;

        }


        if(rejectBtn){

            rejectBtn.style.display =
                "none";

            rejectBtn.onclick = null;

        }

    }

}



// =====================================
// APPROVE WITHDRAWAL (calls the real RPC)
// =====================================

function approveWithdrawal(id, button, otherButton){

    const done = KTUI.busy(button, "Approving...", [otherButton]);

    sb.rpc("approve_withdrawal", { p_withdrawal_id: id })

        .then(({ error }) => {

            done();

            if(error){

                KTUI.notify("Failed to approve withdrawal: " + error.message);

                return;

            }

            closeWithdrawalReview();

            showWithdrawalTab("pending");

            loadWithdrawals();

            KTUI.success("Withdrawal approved successfully.");

            console.log("Withdrawal approved:", id);

        });

}



// =====================================
// REJECT WITHDRAWAL (calls the real RPC)
// =====================================

function rejectWithdrawal(id, button, otherButton){

    const done = KTUI.busy(button, "Rejecting...", [otherButton]);

    sb.rpc("reject_withdrawal", { p_withdrawal_id: id })

        .then(({ error }) => {

            done();

            if(error){

                KTUI.notify("Failed to reject withdrawal: " + error.message);

                return;

            }

            closeWithdrawalReview();

            showWithdrawalTab("pending");

            loadWithdrawals();

            KTUI.success("Withdrawal rejected.");

            console.log("Withdrawal rejected:", id);

        });

}



// =====================================
// CLOSE WITHDRAWAL REVIEW MODAL
// =====================================

function closeWithdrawalReview(){

    const modal =
        document.getElementById(
            "withdrawalModal"
        );


    if(modal){

        modal.style.display =
            "none";

    }

}



// =====================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// =====================================

window.addEventListener(
    "click",
    function(e){

        const modal =
            document.getElementById(
                "withdrawalModal"
            );


        if(
            modal &&
            e.target === modal
        ){

            closeWithdrawalReview();

        }

    }
);


/* ===== js/deposits.js ===== */
// =====================================
// DEPOSIT MANAGEMENT
// =====================================


// =====================================
// LIVE DATA (populated from Supabase)
// =====================================

let deposits = {};


// =====================================
// METHOD LABEL HELPER
// =====================================

function formatDepositMethodLabel(method){

    const labels = {
        usdt_trc20: "USDT (TRC20)",
        mpesa: "M-Pesa",
        ecocash: "EcoCash"
    };

    return labels[method] || method;

}


// =====================================
// LOAD DEPOSITS FROM SUPABASE
// =====================================

function loadDeposits(){

    sb.from("deposits")
        .select("id, amount_zar, method, transaction_ref, proof_url, status, created_at, profiles(username)")
        .order("created_at", { ascending: false })

        .then(({ data, error }) => {

            if(error){

                console.error("Failed to load deposits:", error);

                return;

            }

            deposits = {};

            data.forEach(row => {

                deposits[row.id] = {

                    id: row.id,

                    user: row.profiles ? row.profiles.username : "Unknown",

                    method: formatDepositMethodLabel(row.method),

                    transaction: row.transaction_ref || "—",

                    amount: "M " + Number(row.amount_zar).toLocaleString("en-US"),

                    date: new Date(row.created_at).toLocaleDateString("en-US", {
                        day: "2-digit", month: "short", year: "numeric"
                    }),

                    status: row.status.charAt(0).toUpperCase() + row.status.slice(1),

                    proof: row.proof_url || ""

                };

            });

            renderDepositTables();

            updateDepositStats();

        });

}



// =====================================
// INIT DEPOSITS
// =====================================

function initDeposits(){

    console.log("Deposits initialized");


    // Load real data (renders + updates stats when it arrives)

    loadDeposits();

    if(window.KTRealtime){
        KTRealtime.register("deposits", ["deposits"], loadDeposits);
    }


    // Show Pending by default

    showDepositTab("pending");

}



// =====================================
// UPDATE DEPOSIT STATISTICS
// =====================================

function updateDepositStats(){

    let pending = 0;

    let approved = 0;

    let rejected = 0;


    Object.values(deposits).forEach(deposit => {

        if(deposit.status === "Pending"){

            pending++;

        }

        else if(deposit.status === "Approved"){

            approved++;

        }

        else if(deposit.status === "Rejected"){

            rejected++;

        }

    });



    // =================================
    // UPDATE COUNTERS
    // =================================

    const pendingCount =
        document.getElementById("dpendingCount");

    const approvedCount =
        document.getElementById("dapprovedCount");

    const rejectedCount =
        document.getElementById("drejectedCount");


    if(pendingCount){

        pendingCount.textContent = pending;

    }


    if(approvedCount){

        approvedCount.textContent = approved;

    }


    if(rejectedCount){

        rejectedCount.textContent = rejected;

    }

}

// =====================================
// SHOW EMPTY DEPOSIT MESSAGE
// =====================================

function showEmptyDepositMessage(
    list,
    message,
    columnCount
){

    if(!list) return;


    list.innerHTML = `

        <tr class="empty-deposit-row">

            <td colspan="${columnCount}">

                <div class="empty-deposit-message">

                    <i class="fa-solid fa-inbox"></i>

                    <span>
                        ${message}
                    </span>

                </div>

            </td>

        </tr>

    `;

}


// =====================================
// RENDER ALL DEPOSIT TABLES
// =====================================

function renderDepositTables(){

    const pendingList =
        document.getElementById("pendingDepositsList");

    const approvedList =
        document.getElementById("approvedDepositsList");

    const rejectedList =
        document.getElementById("rejectedDepositsList");


    // =================================
    // CHECK TABLES
    // =================================

    if(!pendingList ||
       !approvedList ||
       !rejectedList){

        console.warn(
            "Deposit table elements not found"
        );

        return;

    }



    // =================================
    // CLEAR TABLES
    // =================================

    pendingList.innerHTML = "";

    approvedList.innerHTML = "";

    rejectedList.innerHTML = "";



    // =================================
    // GENERATE ROWS
    // =================================
    // NOTE: deposit.id is now a UUID (e.g. "3fa85f64-5717-...").
    // It must be wrapped in quotes inside onclick="..." — an
    // unquoted UUID is invalid JavaScript (the hyphens get read
    // as subtraction), which would silently break every button.

    Object.values(deposits).forEach(deposit => {


        // =================================
        // PENDING
        // =================================

        if(deposit.status === "Pending"){

            pendingList.innerHTML += `

                <tr>

                    <td>
                        ${deposit.user}
                    </td>

                    <td>
                        ${deposit.date}
                    </td>

                    <td>

                        <button
                            class="review-btn"
                            onclick="openDepositReview('${deposit.id}')">

                            Review

                        </button>

                    </td>

                </tr>

            `;

        }



        // =================================
        // APPROVED
        // =================================

        else if(deposit.status === "Approved"){

            approvedList.innerHTML += `

                <tr>

                    <td>
                        ${deposit.user}
                    </td>

                    <td>
                        ${deposit.date}
                    </td>

                    <td>

                        <span class="approved">
                            Approved
                        </span>

                    </td>

                    <td>

                        <button
                            class="view-btn"
                            onclick="openDepositReview('${deposit.id}')">

                            View

                        </button>

                    </td>

                </tr>

            `;

        }



        // =================================
        // REJECTED
        // =================================

        else if(deposit.status === "Rejected"){

            rejectedList.innerHTML += `

                <tr>

                    <td>
                        ${deposit.user}
                    </td>

                    <td>
                        ${deposit.date}
                    </td>

                    <td>

                        <span class="rejected">
                            Rejected
                        </span>

                    </td>

                    <td>

                        <button
                            class="view-btn"
                            onclick="openDepositReview('${deposit.id}')">

                            View

                        </button>

                    </td>

                </tr>

            `;

        }

    });

    // =====================================
    // SHOW EMPTY MESSAGES
    // =====================================

    // Pending
    if(pendingList.children.length === 0){

        showEmptyDepositMessage(
            pendingList,
            "No pending deposit requests",
            3
        );

    }


    // Approved
    if(approvedList.children.length === 0){

        showEmptyDepositMessage(
            approvedList,
            "No approved deposits",
            4
        );

    }


    // Rejected
    if(rejectedList.children.length === 0){

        showEmptyDepositMessage(
            rejectedList,
            "No rejected deposits",
            4
        );

    }

}



// =====================================
// DEPOSIT TABS
// =====================================

function showDepositTab(tab, clickedButton = null){

    // =================================
    // SECTION IDS
    // =================================

    const sectionIds = {

        pending: "dpending",

        approved: "dapproved",

        rejected: "drejected"

    };


    // =================================
    // HIDE ALL SECTIONS
    // =================================

    document
        .querySelectorAll(".deposit-section")
        .forEach(section => {

            section.classList.remove(
                "active-section"
            );

        });



    // =================================
    // REMOVE ACTIVE TAB
    // =================================

    document
        .querySelectorAll(".dtab-btn")
        .forEach(button => {

            button.classList.remove("active");

        });



    // =================================
    // GET SECTION
    // =================================

    const sectionId =
        sectionIds[tab];


    const section =
        document.getElementById(sectionId);


    // =================================
    // SHOW SECTION
    // =================================

    if(section){

        section.classList.add(
            "active-section"
        );

    }



    // =================================
    // ACTIVATE BUTTON
    // =================================

    if(clickedButton){

        clickedButton.classList.add("active");

    }

    else{

        const buttons =
            document.querySelectorAll(".dtab-btn");


        if(tab === "pending" && buttons[0]){

            buttons[0].classList.add("active");

        }

        else if(tab === "approved" && buttons[1]){

            buttons[1].classList.add("active");

        }

        else if(tab === "rejected" && buttons[2]){

            buttons[2].classList.add("active");

        }

    }

}



// =====================================
// OPEN DEPOSIT REVIEW MODAL
// =====================================

function openDepositReview(id){

    const deposit =
        deposits[id];


    // =================================
    // CHECK DEPOSIT
    // =================================

    if(!deposit){

        console.error(
            "Deposit not found:",
            id
        );

        return;

    }



    // =================================
    // USER
    // =================================

    const user =
        document.getElementById(
            "review-user"
        );

    if(user){

        user.textContent =
            deposit.user;

    }



    // =================================
    // METHOD
    // =================================

    const method =
        document.getElementById(
            "review-method"
        );

    if(method){

        method.textContent =
            deposit.method;

    }



    // =================================
    // TRANSACTION ID
    // =================================

    const transaction =
        document.getElementById(
            "review-transaction"
        );

    if(transaction){

        transaction.textContent =
            deposit.transaction;

    }



    // =================================
    // AMOUNT
    // =================================

    const amount =
        document.getElementById(
            "review-amount"
        );

    if(amount){

        amount.textContent =
            deposit.amount;

    }



    // =================================
    // DATE
    // =================================

    const date =
        document.getElementById(
            "review-date"
        );

    if(date){

        date.textContent =
            deposit.date;

    }



    // =================================
    // PAYMENT PROOF
    // =================================

    const image =
        document.getElementById(
            "review-image"
        );

    if(image){

        image.src =
            deposit.proof || "";

    }



    // =================================
    // OPEN MODAL
    // =================================

    const modal =
        document.getElementById(
            "depositModal"
        );


    if(modal){

        modal.style.display =
            "flex";

    }



    // =================================
    // APPROVE BUTTON
    // =================================

    const approveBtn =
        document.querySelector(
            ".approve-btn"
        );



    // =================================
    // REJECT BUTTON
    // =================================

    const rejectBtn =
        document.querySelector(
            ".reject-btn"
        );



    // =================================
    // PENDING DEPOSIT
    // =================================

    if(deposit.status === "Pending"){


        if(approveBtn){

            approveBtn.style.display =
                "inline-block";


            // Remove old handler

            approveBtn.onclick = null;


            // Add new handler

            approveBtn.onclick =
                function(){

                    approveDeposit(
                        deposit.id,
                        approveBtn,
                        rejectBtn
                    );

                };

        }



        if(rejectBtn){

            rejectBtn.style.display =
                "inline-block";


            // Remove old handler

            rejectBtn.onclick = null;


            // Add new handler

            rejectBtn.onclick =
                function(){

                    rejectDeposit(
                        deposit.id,
                        rejectBtn,
                        approveBtn
                    );

                };

        }

    }



    // =================================
    // APPROVED / REJECTED
    // =================================

    else{


        if(approveBtn){

            approveBtn.style.display =
                "none";

            approveBtn.onclick = null;

        }


        if(rejectBtn){

            rejectBtn.style.display =
                "none";

            rejectBtn.onclick = null;

        }

    }

}



// =====================================
// APPROVE DEPOSIT (calls the real RPC)
// =====================================

function approveDeposit(id, button, otherButton){

    const done = KTUI.busy(button, "Approving...", [otherButton]);

    sb.rpc("approve_deposit", { p_deposit_id: id })

        .then(({ error }) => {

            done();

            if(error){

                KTUI.notify("Failed to approve deposit: " + error.message);

                return;

            }

            closeDepositReview();

            showDepositTab("pending");

            loadDeposits();

            KTUI.success("Deposit approved successfully.");

            console.log("Deposit approved:", id);

        });

}



// =====================================
// REJECT DEPOSIT (calls the real RPC)
// =====================================

function rejectDeposit(id, button, otherButton){

    const done = KTUI.busy(button, "Rejecting...", [otherButton]);

    sb.rpc("reject_deposit", { p_deposit_id: id })

        .then(({ error }) => {

            done();

            if(error){

                KTUI.notify("Failed to reject deposit: " + error.message);

                return;

            }

            closeDepositReview();

            showDepositTab("pending");

            loadDeposits();

            KTUI.success("Deposit rejected.");

            console.log("Deposit rejected:", id);

        });

}



// =====================================
// CLOSE DEPOSIT REVIEW MODAL
// =====================================

function closeDepositReview(){

    const modal =
        document.getElementById(
            "depositModal"
        );


    if(modal){

        modal.style.display =
            "none";

    }

}



// =====================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// =====================================

window.addEventListener(
    "click",
    function(e){

        const modal =
            document.getElementById(
                "depositModal"
            );


        if(
            modal &&
            e.target === modal
        ){

            closeDepositReview();

        }

    }
);


/* ===== js/transactions.js ===== */
// =====================================
// TRANSACTIONS MANAGEMENT
// =====================================

let transactions = {};
let transactionSearchTimer = null;

const TRANSACTION_TYPE_LABELS = {
    deposit: "Deposit",
    withdrawal: "Withdrawal",
    admin_credit: "Credit",
    admin_debit: "Debit",
    bonus: "Bonus",
    mining_payout: "Mining",
    plan_purchase: "Plan Purchase",
    plan_refund: "Plan Refund",
    plan_upgrade: "Plan Upgrade"
};

function formatTransactionType(type){
    const normalized = String(type || "").toLowerCase();

    return TRANSACTION_TYPE_LABELS[normalized] ||
        normalized
            .split("_")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
}

function getTransactionTypeKey(type){
    const normalized = String(type || "").toLowerCase();

    if(normalized === "admin_credit") return "credit";
    if(normalized === "admin_debit") return "debit";

    return normalized;
}

// =====================================
// RECORDING INTEGRITY
// Status means whether the transaction
// has been recorded correctly.
// =====================================

function getTransactionIntegrity(row){

    const type = String(row.type || "").toLowerCase();
    const description = String(row.description || "").trim();
    const referenceId = row.reference_id;

    if(!row.id || !row.user_id || !type || row.amount_zar === null || row.amount_zar === undefined){
        return {
            status: "Incomplete",
            reason: "Required transaction data is missing."
        };
    }

    if(type === "deposit"){
        if(!referenceId){
            return {
                status: "Incomplete",
                reason: "Deposit transaction has no deposit reference ID."
            };
        }

        if(
            description === "Deposit approved" ||
            description.toLowerCase().startsWith("deposit rejected")
        ){
            return { status: "Complete", reason: "" };
        }

        return {
            status: "Incomplete",
            reason: "Deposit outcome is not clearly recorded in the description."
        };
    }

    if(type === "withdrawal"){
        if(!referenceId){
            return {
                status: "Incomplete",
                reason: "Withdrawal transaction has no withdrawal reference ID."
            };
        }

        const lower = description.toLowerCase();

        if(lower === "withdrawal approved" || lower.startsWith("withdrawal approved —")){
            return { status: "Complete", reason: "" };
        }

        if(lower.startsWith("withdrawal rejected")){
            return { status: "Complete", reason: "" };
        }

        if(lower === "withdrawal requested (pending review)"){
            return {
                status: "Incomplete",
                reason: "Withdrawal is still recorded as pending review."
            };
        }

        return {
            status: "Incomplete",
            reason: "Withdrawal outcome is not clearly recorded in the description."
        };
    }

    if(type === "admin_credit"){
        if(!description){
            return {
                status: "Incomplete",
                reason: "Credit transaction has no description."
            };
        }

        return { status: "Complete", reason: "" };
    }

    if(type === "admin_debit"){
        if(!description){
            return {
                status: "Incomplete",
                reason: "Debit transaction has no description."
            };
        }

        return { status: "Complete", reason: "" };
    }

    if(type === "bonus"){
        if(!description){
            return {
                status: "Incomplete",
                reason: "Bonus transaction has no description."
            };
        }

        return { status: "Complete", reason: "" };
    }

    return {
        status: "Incomplete",
        reason: "Transaction type is not part of the supported admin transaction records."
    };
}

// =====================================
// LOAD TRANSACTIONS
// =====================================

// Set by the live-updates refresh so the list updates in place
// without flashing the "Loading..." row.
let transactionsSilentRefresh = false;

async function loadTransactions(){

    const filter = document.getElementById("transactionFilter");
    const search = document.getElementById("transactionSearch");
    const list = document.getElementById("transactionList");

    if(!filter || !search || !list) return;

    const silent = transactionsSilentRefresh;
    transactionsSilentRefresh = false;

    if(!silent){
        list.innerHTML = `
            <tr>
                <td colspan="4" class="transaction-loading">Loading transactions...</td>
            </tr>
        `;
    }

    const type = filter.value || "all";
    const searchValue = search.value.trim();

    const { data, error } = await sb.rpc("admin_search_transactions", {
        p_search: searchValue,
        p_type: type,
        p_limit: 500,
        p_offset: 0
    });

    if(error){
        console.error("Failed to load transactions:", error);

        list.innerHTML = `
            <tr>
                <td colspan="4" class="transaction-empty">
                    Failed to load transactions.
                </td>
            </tr>
        `;
        return;
    }

    transactions = {};

    (data || []).forEach(row => {

        const fullName = [row.username, row.surname]
            .filter(Boolean)
            .join(" ")
            .trim() || "Unknown User";

        const integrity = getTransactionIntegrity(row);

        transactions[row.id] = {
            id: row.id,
            userId: row.user_id,
            user: fullName,
            phone: row.phone || "—",
            rawType: row.type,
            type: formatTransactionType(row.type),
            typeKey: getTransactionTypeKey(row.type),
            amount: "M " + Math.abs(Number(row.amount_zar || 0)).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }),
            date: new Date(row.created_at).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }),
            createdAt: row.created_at,
            referenceId: row.reference_id,
            description: row.description || "",
            status: integrity.status,
            incompleteReason: integrity.reason
        };
    });

    renderTransactions();
}

// =====================================
// INITIALIZE
// =====================================

function initTransactions(){

    const filter = document.getElementById("transactionFilter");
    const search = document.getElementById("transactionSearch");
    const list = document.getElementById("transactionList");

    if(!filter || !search || !list) return;

    loadTransactions();

    if(window.KTRealtime){
        KTRealtime.register("transactions", ["transactions"], function(){
            transactionsSilentRefresh = true;
            loadTransactions();
        });
    }

    filter.addEventListener("change", loadTransactions);

    search.addEventListener("input", function(){

        clearTimeout(transactionSearchTimer);

        transactionSearchTimer = setTimeout(() => {
            loadTransactions();
        }, 300);
    });

    const transactionModal = document.getElementById("transactionModal");
    const closeTransactionModal = document.getElementById("closeTransactionModal");
    const closeTransactionModalBtn = document.getElementById("closeTransactionModalBtn");

    const closeModal = () => {
        if(transactionModal){
            transactionModal.style.display = "none";
        }
    };

    if(closeTransactionModal) closeTransactionModal.onclick = closeModal;
    if(closeTransactionModalBtn) closeTransactionModalBtn.onclick = closeModal;

    if(transactionModal){
        transactionModal.onclick = function(event){
            if(event.target === transactionModal){
                closeModal();
            }
        };
    }
}

// =====================================
// RENDER
// =====================================

function renderTransactions(){

    const list = document.getElementById("transactionList");
    if(!list) return;

    list.innerHTML = "";

    const values = Object.values(transactions);

    if(values.length === 0){
        list.innerHTML = `
            <tr>
                <td colspan="4" class="transaction-empty">
                    No transactions found.
                </td>
            </tr>
        `;
        return;
    }

    values.forEach(transaction => {

        const row = document.createElement("tr");
        row.setAttribute("data-id", transaction.id);

        const userCell = document.createElement("td");
        userCell.textContent = transaction.user;

        const typeCell = document.createElement("td");
        const typeBadge = document.createElement("span");
        typeBadge.className = "transaction-type transaction-type-" + transaction.typeKey;
        typeBadge.textContent = transaction.type;
        typeCell.appendChild(typeBadge);

        const dateCell = document.createElement("td");
        dateCell.textContent = transaction.date;

        const actionCell = document.createElement("td");
        const viewButton = document.createElement("button");
        viewButton.className = "transaction-view-btn";
        viewButton.textContent = "View";
        viewButton.setAttribute("data-id", transaction.id);
        viewButton.onclick = function(){
            viewTransaction(transaction.id);
        };
        actionCell.appendChild(viewButton);

        row.appendChild(userCell);
        row.appendChild(typeCell);
        row.appendChild(dateCell);
        row.appendChild(actionCell);
        list.appendChild(row);
    });
}

// =====================================
// VIEW TRANSACTION
// =====================================

function viewTransaction(transactionId){

    const transaction = transactions[transactionId];
    if(!transaction) return;

    document.getElementById("modalTransactionId").textContent =
        "#" + transaction.id.slice(0, 8).toUpperCase();

    document.getElementById("modalTransactionIdFull").textContent =
        transaction.id;

    document.getElementById("modalTransactionUser").textContent =
        transaction.user;

    document.getElementById("modalTransactionPhone").textContent =
        transaction.phone;

    document.getElementById("modalTransactionType").textContent =
        transaction.type;

    document.getElementById("modalTransactionAmount").textContent =
        transaction.amount;

    document.getElementById("modalTransactionDate").textContent =
        transaction.date;

    const description = transaction.status === "Incomplete"
        ? `${transaction.description || "No description recorded."} ${transaction.incompleteReason}`.trim()
        : transaction.description;

    document.getElementById("modalTransactionDescription").textContent =
        description || "—";

    const status = document.getElementById("modalTransactionStatus");

    status.textContent = transaction.status;
    status.className =
        "transaction-status transaction-status-" +
        transaction.status.toLowerCase();

    document.getElementById("transactionModal").style.display = "flex";
}


/* ===== js/plans.js ===== */
// ======================================================
// PLANS PAGE
// ======================================================

let plansData = [];

// ======================================================
// LOAD PLANS FROM SUPABASE
// ======================================================

function loadPlans(){

    sb.from("plans")
        .select("*")
        .order("sort_order")

        .then(({ data, error }) => {

            if(error){
                console.error("Failed to load plans:", error);
                return;
            }

            plansData = data;

            renderPlans();

        });

}

// ======================================================
// RENDER PLAN TABLE
// ======================================================
function renderPlans(){

    const table = document.getElementById("planList");

    if(!table) return;

    table.innerHTML = "";

    plansData.forEach(function(plan){

        const row = document.createElement("tr");

        row.dataset.planid = plan.id;

        const statusClass = plan.is_active ? "active" : "disabled";

        row.innerHTML = `
            <td>
                ${plan.name}
            </td>

            <td>
                <span class="plan-status plan-status-${statusClass}">
                    ${plan.is_active ? "Active" : "Disabled"}
                </span>
            </td>

            <td>
                <button
                    class="plan-view-btn"
                    data-plan="${plan.name}">
                    View
                </button>
            </td>
        `;

        table.appendChild(row);

    });

    KTUI.syncTableEmpty(table, 3, "No mining plans yet. Use \"Add new plan\" to create one.", "fa-solid fa-layer-group");

}


// ======================================================
// PLAN INITIALIZATION
// ======================================================

function initPlans(){

    loadPlans();

    if(window.KTRealtime){
        KTRealtime.register("plans", ["plans"], loadPlans);
    }

    const modal = document.getElementById("planModal");

    const addButton = document.querySelector(".plan-add-btn");

    const closeButtons = document.querySelectorAll(
        ".plan-close-btn, .plan-close-top"
    );

    const saveButton = document.querySelector(".plan-save-btn");

    const toggleButton = document.querySelector(".plan-toggle-btn");

    const deleteButton = document.querySelector(".plan-delete-btn");

    const deleteConfirmModal = document.getElementById("planDeleteConfirmModal");

    const deleteCancelButton = document.querySelector(".plan-delete-cancel-btn");

    const deleteConfirmButton = document.querySelector(".plan-delete-confirm-btn");

    let currentRow = null;
    let currentPlan = null;

    if(!modal) return;


    // ADD NEW PLAN

    addButton.onclick = function(){

        currentRow = null;
        currentPlan = null;

        document.getElementById("planName").value = "";
        document.getElementById("planPrice").value = "";
        document.getElementById("planDuration").value = "";
        document.getElementById("planDailyReturn").value = "";
        document.getElementById("planTotalReturn").value = "";
        document.getElementById("planHashPower").value = "";
        document.getElementById("planStatus").value = "active";

          
        document.getElementById("planSubscriberCount").style.display = "none";

        

        document.querySelector(".plan-modal-header h3").innerText = "Add Mining Plan";

        saveButton.innerText = "Create Plan";

        toggleButton.innerText = "Deactivate";

        modal.style.display = "flex";

    };


    // VIEW EXISTING PLAN

        // VIEW EXISTING PLAN — delegated to the table itself so it keeps
    // working after renderPlans() rebuilds the rows (add/edit/delete/reload).

    const planTable = document.getElementById("planList");

    planTable.addEventListener("click", function(e){

        const button = e.target.closest(".plan-view-btn");

        if(!button) return;

        currentRow = button.closest("tr");

        currentPlan = plansData.find(p => p.id === currentRow.dataset.planid);

        if(!currentPlan) return;

        document.getElementById("planName").value = currentPlan.name;
        document.getElementById("planPrice").value = currentPlan.price_zar;
        document.getElementById("planDuration").value = currentPlan.duration_days;
        document.getElementById("planDailyReturn").value = currentPlan.daily_payout_zar;
        document.getElementById("planTotalReturn").value =
            (currentPlan.daily_payout_zar * currentPlan.duration_days).toFixed(2);
        document.getElementById("planHashPower").value = currentPlan.hash_power || "";
        document.getElementById("planStatus").value = currentPlan.is_active ? "active" : "disabled";

        

        const subscriberCountEl = document.getElementById("planSubscriberCount");
        subscriberCountEl.style.display = "block";
        subscriberCountEl.innerText = "Loading subscriber count…";

        sb.from("mining_subscriptions")
            .select("id", { count: "exact", head: true })
            .eq("plan_id", currentPlan.id)
            .eq("status", "active")
            .then(({ count, error }) => {
                if (error) {
                    subscriberCountEl.innerText = "Couldn't load subscriber count.";
                    return;
                }
                subscriberCountEl.innerText =
                    count === 0
                        ? "No active users"
                        : `Currently active users:  ${count}`;
            });

        
      

        toggleButton.innerText = currentPlan.is_active ? "Deactivate" : "Activate";

        document.querySelector(".plan-modal-header h3").innerText = "Edit Mining Plan";

        saveButton.innerText = "Save Changes";

        modal.style.display = "flex";

    });


    // SAVE / CREATE PLAN

    saveButton.onclick = function(){

        const name = document.getElementById("planName").value.trim();
        const price = Number(document.getElementById("planPrice").value);
        const duration = Number(document.getElementById("planDuration").value);
        const dailyReturn = Number(document.getElementById("planDailyReturn").value);
        const hashPower = document.getElementById("planHashPower").value.trim();
        const status = document.getElementById("planStatus").value;

        if(name === ""){
            KTUI.notify("Enter plan name");
            return;
        }

        const payload = {
            name: name,
            price_zar: price,
            duration_days: duration,
            daily_payout_zar: dailyReturn,
            hash_power: hashPower,
            is_active: status === "active"
        };

        // CREATE NEW PLAN

        if(currentRow === null){

            payload.sort_order = plansData.length + 1;

            const done = KTUI.busy(saveButton, "Creating...");

            sb.from("plans").insert(payload)

                .then(({ error }) => {

                    done();

                    if(error){
                        KTUI.notify("Failed to create plan: " + error.message);
                        return;
                    }

                    modal.style.display = "none";

                    KTUI.success("Plan created successfully.");

                    loadPlans();

                });

        }

        // UPDATE EXISTING PLAN

        else{

            const done = KTUI.busy(saveButton, "Saving...");

            sb.from("plans").update(payload).eq("id", currentPlan.id)

                .then(({ error }) => {

                    done();

                    if(error){
                        KTUI.notify("Failed to update plan: " + error.message);
                        return;
                    }

                    modal.style.display = "none";

                    KTUI.success("Plan updated successfully.");

                    loadPlans();

                });

        }

    };


    // CLOSE

    closeButtons.forEach(button=>{

        button.onclick = function(){
            modal.style.display = "none";
        };

    });


    // DELETE

    deleteButton.onclick = function(){

        if(!currentRow || !currentPlan) return;

        document.getElementById("deletePlanMessage").innerHTML =
            'Are you sure you want to delete this plan?<br></br> <strong>' +
            currentPlan.name +
            '</strong>';

        deleteConfirmModal.style.display = "flex";

        document.body.style.overflow = "hidden";

    };


    // ACTIVATE / DEACTIVATE (persists immediately)

    toggleButton.onclick = function(){

        if(!currentRow || !currentPlan) return;

        const newActive = !currentPlan.is_active;

        const done = KTUI.busy(toggleButton, newActive ? "Activating..." : "Deactivating...");

        sb.from("plans").update({ is_active: newActive }).eq("id", currentPlan.id)

            .then(({ error }) => {

                done();

                if(error){
                    KTUI.notify("Failed to update status: " + error.message);
                    return;
                }

                currentPlan.is_active = newActive;

        

                toggleButton.innerText = newActive ? "Deactivate" : "Activate";

                document.getElementById("planStatus").value = newActive ? "active" : "disabled";

                KTUI.success(newActive ? "Plan activated." : "Plan deactivated.");

                loadPlans();

            });

    };


    deleteCancelButton.onclick = function(){
        deleteConfirmModal.style.display = "none";
    };


    deleteConfirmButton.onclick = function(){

        if(!currentRow || !currentPlan) return;

        const done = KTUI.busy(deleteConfirmButton, "Deleting...");

        sb.from("plans").delete().eq("id", currentPlan.id)

            .then(({ error }) => {

                done();

                deleteConfirmModal.style.display = "none";

                if(error){

                    // Postgres error 23503 = foreign key violation —
                    // this plan still has subscribers referencing it
                    if(error.code === "23503"){
                        KTUI.notify("Can't delete this plan — it still has users subscribed to it. Deactivate it instead.");
                    } else {
                        KTUI.notify("Failed to delete plan: " + error.message);
                    }

                    return;
                }

                currentRow = null;
                currentPlan = null;

                modal.style.display = "none";

                KTUI.success("Plan deleted.");

                loadPlans();

            });

    };

}


/* ===== js/users.js ===== */
// ===================================
// USERS PAGE
// ===================================

function initUsers(){

    console.log("Users initialized");

    // ===============================
    // ELEMENTS
    // ===============================

    const usersList = document.getElementById("usersList");

    const searchInput = document.getElementById("userSearch");

    const statusFilter = document.getElementById("statusFilter");

    const refreshBtn = document.querySelector(".refresh-btn");

  

    // Statistics

    const totalUsersEl = document.getElementById("totalUsers");

    const activeUsersEl = document.getElementById("activeUsers");

    const blockedUsersEl = document.getElementById("blockedUsers");

    const requestUsersEl = document.getElementById("requestUsers");

    // ===============================
    // CURRENT USER
    // ===============================

    let currentRow = null;

    let plansCache = [];

    // ===============================
    // DERIVE DISPLAY STATUS
    // ===============================

    function deriveStatus(user){

        if(user.is_blocked) return "Blocked";
        if(user.is_vip) return "VIP";
        return "Active";

    }

    // ===============================
    // BUILD A ROW FROM A USER OBJECT
    // ===============================

    function createUserRow(user){

        const row = document.createElement("tr");

        row.dataset.userid = user.id;

        const status = deriveStatus(user);

        const statusClass = status.toLowerCase();

        const fullName = [user.username, user.surname].filter(Boolean).join(" ") || "Unnamed";

        row.innerHTML = `
            <td>
                <h4>${fullName}</h4>
            </td>

            <td>
                <span class="status ${statusClass}">${status}</span>
            </td>

            <td>
                <button class="manage-btn">Manage</button>
            </td>
            

                       <td class="user-hidden-data" style="display:none;">
                <span class="email">${user.email || ""}</span>
                <span class="balance">M${Number(user.balance_zar).toFixed(2)}</span>
                <span class="plan">${user.plan_name}</span>
                <span class="phone">${user.phone || ""}</span>
                <span class="gender">${user.gender || ""}</span>
                <span class="country">${user.country || ""}</span>
                <span class="reg-date">${user.created_at ? new Date(user.created_at).toLocaleDateString() : ""}</span>
 <span class="info-locked">${user.info_locked ? "1" : "0"}</span>
                <span class="change-requested">${user.change_requested ? "1" : "0"}</span>
                <span class="payment-methods-locked">${user.payment_methods_locked ? "1" : "0"}</span>
                <span class="payment-methods-change-requested">${user.payment_methods_change_requested ? "1" : "0"}</span>
            </td>
        `;;

        return row;
    }

    // ===============================
    // LOAD USERS FROM SUPABASE
    // ===============================

    // A user "has a request" when any of these is open:
    //   - password / PIN / KYC reset or reactivation request (account_reset_requests, pending)
    //   - personal information change request
    //   - payment methods change request
    function markRequests(row, user, resetKinds){

        const labels = [];

        resetKinds.forEach(kind => {
            if(kind === "password") labels.push("Password reset");
            else if(kind === "pin") labels.push("PIN reset");
            else if(kind === "kyc") labels.push("KYC reset");
            else if(kind === "unblock") labels.push("Reactivation");
        });

        if(user.change_requested) labels.push("Personal info change");
        if(user.payment_methods_change_requested) labels.push("Payment methods change");

        if(labels.length){
            row.dataset.hasRequest = "1";
            row.title = "Requests: " + labels.join(", ");
        }

    }

    // Message shown when the users table has nothing to display
    function syncUsersEmpty(){

        KTUI.syncTableEmpty(
            usersList,
            3,
            function(){

                const hasUsers = usersList.querySelector("tr[data-userid]") !== null;
                const term = searchInput ? searchInput.value.trim() : "";
                const filter = statusFilter ? statusFilter.value.toLowerCase() : "all";

                if(!hasUsers) return "No users yet.";
                if(term) return "No users match your search.";
                if(filter === "requests") return "No users have open requests.";
                if(filter === "blocked") return "No blocked users.";
                if(filter === "active") return "No active users.";

                return "No users found.";

            },
            "fa-solid fa-users"
        );

    }

    function loadUsers(){

        Promise.all([
            sb.rpc("admin_list_users"),
            sb.from("account_reset_requests").select("user_id, kind").eq("status", "pending")
        ])

            .then(([usersRes, requestsRes]) => {

                const { data, error } = usersRes;

                if(error){
                    console.error("Failed to load users:", error);
                    return;
                }

                // If the requests lookup fails, users still load (flags only).
                const resetKindsByUser = {};

                if(!requestsRes.error && requestsRes.data){
                    requestsRes.data.forEach(r => {
                        (resetKindsByUser[r.user_id] = resetKindsByUser[r.user_id] || []).push(r.kind);
                    });
                }

                usersList.innerHTML = "";

                data.forEach(user => {

                    const row = createUserRow(user);

                    markRequests(row, user, resetKindsByUser[user.id] || []);

                    usersList.appendChild(row);

                });

                updateStatistics();

                // Keep any search / status filter the admin has applied
                // (matters for live refreshes while they are filtering).
                if(statusFilter && statusFilter.value && statusFilter.value.toLowerCase() !== "all"){
                    statusFilter.dispatchEvent(new Event("change"));
                }
                if(searchInput && searchInput.value){
                    searchInput.dispatchEvent(new Event("keyup"));
                }

                syncUsersEmpty();

                applyPendingProfileFilter();

            })

            .catch(err => {
                console.error("Failed to load users:", err);
            });

    }

    // ===============================
    // OPEN A SPECIFIC USER FROM ELSEWHERE
    // (e.g. Support Chat's "View Full Profile")
    // ===============================

    function applyPendingProfileFilter(){

        const pendingUserId = sessionStorage.getItem("pendingProfileUserId");

        if(!pendingUserId) return;

        sessionStorage.removeItem("pendingProfileUserId");

        const row = usersList.querySelector('tr[data-userid="' + pendingUserId + '"]');

        if(!row) return;

        const nameEl = row.querySelector("h4");

        if(searchInput && nameEl){
            searchInput.value = nameEl.textContent.trim();
            searchInput.dispatchEvent(new Event("keyup"));
        }

        openUserModal(row);

    }

    // ===============================
    // UPDATE STATISTICS
    // ===============================

    function updateStatistics(){

        const rows = document.querySelectorAll("#usersList tr");

        let total = document.querySelectorAll("#usersList tr[data-userid]").length;

        let active = 0;

        let blocked = 0;

        let requests = 0;

        rows.forEach(row=>{

            let status = row.querySelector(".status");

            if(!status) return;

            let text = status.textContent.trim().toLowerCase();

            // VIP users are active accounts, so they count as Active.
            if(text==="active" || text==="vip"){

                active++;

            }

            else if(text==="blocked"){

                blocked++;

            }

            if(row.dataset.hasRequest === "1"){

                requests++;

            }

        });

        totalUsersEl.textContent = total;

        activeUsersEl.textContent = active;

        blockedUsersEl.textContent = blocked;

        if(requestUsersEl) requestUsersEl.textContent = requests;

    }

    loadUsers();

    if(window.KTRealtime){
        KTRealtime.register("users", ["profile_signals","kyc_submissions"], loadUsers);
    }

    // ===============================
    // SEARCH USERS
    // ===============================

    if(searchInput){

        searchInput.addEventListener("keyup",function(){

            let value = this.value.toLowerCase();

            document.querySelectorAll("#usersList tr")
            .forEach(row=>{

                let h4 = row.querySelector("h4");
                if(!h4) return;

                let text = h4.textContent.toLowerCase();

                row.style.display =
                text.includes(value)
                ? "table-row"
                : "none";

            });

            syncUsersEmpty();

        });

    }

    // ===============================
    // FILTER USERS
    // ===============================

    if(statusFilter){

        statusFilter.addEventListener("change",function(){

            let value = this.value.toLowerCase();

            document.querySelectorAll("#usersList tr")
           .forEach(row=>{

                let statusEl = row.querySelector(".status");
                if(!statusEl) return;

                let status = statusEl.textContent.trim().toLowerCase();

                if(value==="all"){

                    row.style.display="table-row";

                }

                else if(value==="requests"){

                    row.style.display =
                    row.dataset.hasRequest === "1"
                    ? "table-row"
                    : "none";

                }

                else if(value==="active"){

                    // VIP users are active accounts too.
                    row.style.display =
                    (status==="active" || status==="vip")
                    ? "table-row"
                    : "none";

                }

                else{

                    row.style.display =
                    status===value
                    ? "table-row"
                    : "none";

                }

            });

            syncUsersEmpty();

        });

    }

    // ===============================
    // REFRESH
    // ===============================

    if(refreshBtn){

        refreshBtn.onclick=function(){

            loadAdminPage("users");

        };

    }
    

    // ===============================
    // USER MANAGEMENT MODAL
    // ===============================

    const userModal = document.getElementById("userModal");

    const modalUserName = document.getElementById("modalUserName");

    const modalUserID = document.getElementById("modalUserID");

        const modalEmail = document.getElementById("modalEmail");

    const modalGender = document.getElementById("modalGender");

    const modalPhone = document.getElementById("modalPhone");

    const modalCountry = document.getElementById("modalCountry");

    const modalRegDate = document.getElementById("modalRegDate");

    const modalBalance = document.getElementById("modalBalance");

    const modalPlan = document.getElementById("modalPlan");

    const modalStatus = document.getElementById("modalStatus");

        const modalInfoStatus = document.getElementById("modalInfoStatus");

    const modalPaymentMethodsStatus = document.getElementById("modalPaymentMethodsStatus");

    // ===============================
    // OPEN USER MODAL
    // ===============================

  function getInitials(fullName) {
    if (!fullName) return "";
    const parts = fullName.trim().split(" ");
    let initials = parts[0].charAt(0).toUpperCase();
    if (parts.length > 1) {
        initials += parts[1].charAt(0).toUpperCase();
    }
    return initials;
}

function openUserModal(row) {
    currentRow = row;

    let hiddenData = row.querySelector(".user-hidden-data");
    const fullName = row.querySelector("h4").textContent;

    modalUserName.textContent = fullName;
    modalUserID.textContent = "User ID : " + row.dataset.userid;

    // Replace avatar with initials
    const modalAvatar = document.getElementById("modalAvatar");
    modalAvatar.textContent = getInitials(fullName);

    // … existing code for email, gender, etc.

                modalEmail.textContent = hiddenData.querySelector(".email").textContent;

        modalGender.textContent = hiddenData.querySelector(".gender").textContent || "—";

        modalPhone.textContent = hiddenData.querySelector(".phone").textContent || "—";

        modalCountry.textContent = hiddenData.querySelector(".country").textContent || "—";

        modalRegDate.textContent = hiddenData.querySelector(".reg-date").textContent || "—";

        modalBalance.textContent = hiddenData.querySelector(".balance").textContent;

        modalPlan.textContent = hiddenData.querySelector(".plan").textContent;

        modalStatus.textContent = row.querySelector(".status").textContent.trim();

        const infoLocked = hiddenData.querySelector(".info-locked").textContent === "1";
        const changeRequested = hiddenData.querySelector(".change-requested").textContent === "1";

                modalInfoStatus.textContent = infoLocked
            ? (changeRequested ? "Locked — change requested" : "Locked")
            : "Editable (approved)";

        const paymentMethodsLocked = hiddenData.querySelector(".payment-methods-locked").textContent === "1";
        const paymentMethodsChangeRequested = hiddenData.querySelector(".payment-methods-change-requested").textContent === "1";

        modalPaymentMethodsStatus.textContent = paymentMethodsLocked
            ? (paymentMethodsChangeRequested ? "Locked — change requested" : "Locked")
            : "Editable (approved)";

        updateStatusButton();
        updateApproveButton();

        userModal.style.display="flex";
        updateVerifyUserButton();

    }

    // ===============================
    // TOGGLE BUTTON TEXT
    // ===============================

    const toggleUserStatus = document.getElementById("toggleUserStatus");

    function updateStatusButton(){

        if(!currentRow) return;

        const status = currentRow.querySelector(".status").textContent.trim();

        toggleUserStatus.textContent =
        status === "Active" ? "Block User" : "Activate User";

    }

        // ===============================
    // BLOCK / ACTIVATE USER (real — writes profiles.is_blocked)
    // ===============================

    const blockModal = document.getElementById("blockModal");

    const confirmBlockBtn = document.querySelector(".block-content .block-btn");

    const activateModal = document.getElementById("activateModal");

    const activateStatus = document.getElementById("activateStatus");

    const activateActions = document.getElementById("activateActions");

    function bindActivateClose(){
        const closeBtn = activateActions.querySelector(".cancel-btn");
        if(closeBtn){
            closeBtn.onclick = function(){ activateModal.style.display = "none"; };
        }
    }

    function applyActivatedUI(){

        if(!currentRow) return;

        const status = currentRow.querySelector(".status");

        status.classList.remove("blocked");
        status.classList.add("active");
        status.textContent = "Active";
        modalStatus.textContent = "Active";

        updateStatusButton();
        updateStatistics();

    }

    function renderActivateModal(){

        if(!currentRow) return;

        const userId = currentRow.dataset.userid;

        activateStatus.textContent = "Checking for a pending request…";
        activateActions.innerHTML = '<button class="cancel-btn">Close</button>';
        bindActivateClose();

        sb.from("account_reset_requests").select("id").eq("user_id", userId).eq("kind","unblock").eq("status","pending").maybeSingle()

            .then(({ data, error }) => {

                if(error){
                    activateStatus.textContent = "Failed to check request: " + error.message;
                    return;
                }

                const pending = data;

                activateStatus.textContent = pending
                    ? "This user has requested reactivation."
                    : "No reactivation request.";

                let buttonsHtml = '<button class="cancel-btn">Close</button>';
                buttonsHtml += '<button class="reset-btn activate-confirm-btn">Activate</button>';
                if(pending){
                    buttonsHtml += '<button class="reset-btn reject-btn activate-reject-btn">Reject</button>';
                }
                activateActions.innerHTML = buttonsHtml;
                bindActivateClose();

                const confirmBtn = activateActions.querySelector(".activate-confirm-btn");
                if(confirmBtn){
                    confirmBtn.onclick = function(){
                        const rejectOther = activateActions.querySelector(".activate-reject-btn");
                        const done = KTUI.busy(confirmBtn, "Activating...", [rejectOther]);
                        sb.rpc("admin_activate_user", { p_user_id: userId })
                            .then(({ error }) => {
                                done();
                                if(error){
                                    KTUI.notify("Failed to activate user: " + error.message);
                                    return;
                                }
                                applyActivatedUI();
                                activateModal.style.display = "none";
                                KTUI.success("User activated successfully.");
                            });
                    };
                }

                const rejectBtn = activateActions.querySelector(".activate-reject-btn");
                if(rejectBtn){
                    rejectBtn.onclick = function(){
                        const confirmOther = activateActions.querySelector(".activate-confirm-btn");
                        const done = KTUI.busy(rejectBtn, "Rejecting...", [confirmOther]);
                        sb.rpc("admin_reject_unblock_request", { p_user_id: userId })
                            .then(({ error }) => {
                                done();
                                if(error){
                                    KTUI.notify("Failed to reject request: " + error.message);
                                    return;
                                }
                                KTUI.success("Reactivation request rejected.");
                                renderActivateModal();
                            });
                    };
                }

            });

    }

    toggleUserStatus.addEventListener("click",function(){

        if(!currentRow) return;

        const status = currentRow.querySelector(".status");

        if(status.classList.contains("active")){

            
            blockModal.style.display="flex";

        }

        else{

            
            renderActivateModal();
            activateModal.style.display="flex";

        }

    });

    if(confirmBlockBtn){

        confirmBlockBtn.onclick=function(){

            if(!currentRow) return;

            const done = KTUI.busy(confirmBlockBtn, "Blocking...");

            sb.from("profiles")
                .update({ is_blocked: true })
                .eq("id", currentRow.dataset.userid)

                .then(({ error }) => {

                    done();

                    if(error){
                        KTUI.notify("Failed to block user: " + error.message);
                        return;
                    }

                    const status = currentRow.querySelector(".status");

                    status.classList.remove("active");
                    status.classList.add("blocked");
                    status.textContent = "Blocked";
                    modalStatus.textContent = "Blocked";

                    updateStatusButton();
                    updateStatistics();

                    blockModal.style.display="none";

                    KTUI.notify("User blocked successfully");

                });

        };

    }

    // ===============================
    // MANAGE BUTTON
    // ===============================

    usersList.addEventListener("click",function(e){

        if(e.target.classList.contains("manage-btn")){

            let row = e.target.closest("tr");

            openUserModal(row);

        }

    });

    // ===============================
    // CLOSE MODALS
    // ===============================

    document.querySelectorAll(".close-modal")
    .forEach(button=>{

        button.onclick=function(){

            let modal = this.closest(
                ".user-modal, .credit-modal, .debit-modal, .plan-modal, .edit-user-modal, .delete-modal, .block-modal, .reset-password-modal"
            );

            if(modal){
                modal.style.display="none";
            }

        };

    });

    // ===============================
    // CANCEL BUTTONS
    // ===============================

    document.querySelectorAll(".cancel-btn")
    .forEach(button=>{

        button.onclick=function(){

            let modal = this.closest(
                ".delete-modal, .block-modal, .reset-password-modal"
            );

            if(modal){
                modal.style.display="none";
            }

        };

    });

    // ===============================
    // CLICK OUTSIDE TO CLOSE
    // ===============================

    window.onclick=function(e){

        if(e.target.classList.contains("user-modal") ||
           e.target.classList.contains("credit-modal") ||
           e.target.classList.contains("debit-modal") ||
           e.target.classList.contains("plan-modal") ||
           e.target.classList.contains("edit-user-modal") ||
           e.target.classList.contains("delete-modal") ||
           e.target.classList.contains("block-modal") ||
           e.target.classList.contains("reset-password-modal")){

            e.target.style.display="none";

        }

    };

    

       
        // ===============================
    // APPROVE CHANGES — opens a modal to pick which page to unlock
    // (admin_approve_profile_changes / admin_approve_payment_methods_changes)
    // ===============================
    // Admins no longer type in the user's new details themselves — the user
    // edits their own Personal Information or Payment Methods page once this
    // unlocks it. These buttons just approve that request via SECURITY
    // DEFINER RPCs so the unlock/audit logic lives in one place (see
    // enforce_profile_lock / enforce_payment_method_lock in SQL).

// =========================================================
// CHANGE REQUEST TOAST
// =========================================================

function showChangeRequestToast(message, type = "success"){

    const existingToast =
        document.querySelector(".change-request-toast");

    if(existingToast){
        existingToast.remove();
    }

    const toast =
        document.createElement("div");

    toast.className =
        `change-request-toast ${type}`;

    toast.textContent =
        message;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    setTimeout(() => {

        toast.classList.remove("show");

        setTimeout(() => {
            toast.remove();
        }, 500);

    }, 5000);
}

  
    const approveBtn = document.querySelector(".approve-btn");

const approveModal =
    document.getElementById("approveModal");

const approveCancelBtn =
    document.querySelector(".approve-cancel-btn");
  
const approvePersonalBtn =
    document.querySelector(".approve-personal-btn");

const approvePaymentBtn =
    document.querySelector(".approve-payment-btn");

const changeDecisionModal =
    document.getElementById("changeDecisionModal");

const changeDecisionTitle =
    document.getElementById("changeDecisionTitle");

const changeDecisionText =
    document.getElementById("changeDecisionText");

const changeApproveBtn =
    document.querySelector(".change-approve-btn");

const changeRejectBtn =
    document.querySelector(".change-reject-btn");

let selectedChangePage = null;

function updateApproveButton(){

    if(!currentRow || !approveBtn) return;

    const hiddenData = currentRow.querySelector(".user-hidden-data");

    const changeRequested =
        hiddenData.querySelector(".change-requested").textContent === "1";

    const paymentMethodsChangeRequested =
        hiddenData.querySelector(".payment-methods-change-requested").textContent === "1";

    const anyRequested =
        changeRequested || paymentMethodsChangeRequested;

    // Main button
    approveBtn.textContent =
        anyRequested
            ? "Approve Changes"
            : "No Pending Requests";

    approveBtn.disabled = !anyRequested;

    // Personal Information button
    if(approvePersonalBtn){

        approvePersonalBtn.style.display =
            changeRequested
                ? "inline-block"
                : "none";

    }

    // Payment Methods button
    if(approvePaymentBtn){

        approvePaymentBtn.style.display =
            paymentMethodsChangeRequested
                ? "inline-block"
                : "none";

    }

}

    if(approveBtn){

        approveBtn.onclick=function(){
            if(!currentRow) return;
            updateApproveButton();
            approveModal.style.display="flex";
        };

    }

    if(approveCancelBtn){

        approveCancelBtn.onclick=function(){
            approveModal.style.display="none";
        };

    }

    if(approvePersonalBtn){

    approvePersonalBtn.onclick = function(){

        if(!currentRow) return;

        selectedChangePage = "personal";

        changeDecisionTitle.textContent =
            "Personal Information";

        changeDecisionText.textContent =
            "Approve or reject the Personal Information change request.";

        approveModal.style.display = "none";

        changeDecisionModal.style.display = "flex";

    };

}

    if(approvePaymentBtn){

    approvePaymentBtn.onclick = function(){

        if(!currentRow) return;

        selectedChangePage = "payment";

        changeDecisionTitle.textContent =
            "Payment Methods";

        changeDecisionText.textContent =
            "Approve or reject the Payment Methods change request.";

        approveModal.style.display = "none";

        changeDecisionModal.style.display = "flex";

    };

}

  // =========================================================
// CHANGE REQUEST — APPROVE / REJECT
// =========================================================

if(changeApproveBtn){

    changeApproveBtn.onclick = function(){

        if(!currentRow || !selectedChangePage) return;

        const userId = currentRow.dataset.userid;

        let rpcName = "";

        if(selectedChangePage === "personal"){
            rpcName = "admin_approve_profile_changes";
        }

        if(selectedChangePage === "payment"){
            rpcName = "admin_approve_payment_methods_changes";
        }

        if(!rpcName) return;

        const done = KTUI.busy(changeApproveBtn, "Approving...", [changeRejectBtn]);

        sb.rpc(rpcName, {
            p_user_id: userId
        })

        .then(({ error }) => {

            done();

            if(error){

    KTUI.notify(
        "Failed to approve changes: " +
        error.message
    );

    return;
}

showChangeRequestToast(
    selectedChangePage === "personal"
        ? "Personal Information change request approved successfully."
        : "Payment Methods change request approved successfully."
);

            const hiddenData =
                currentRow.querySelector(".user-hidden-data");

            if(selectedChangePage === "personal"){

                hiddenData
                    .querySelector(".info-locked")
                    .textContent = "0";

                hiddenData
                    .querySelector(".change-requested")
                    .textContent = "0";

                modalInfoStatus.textContent =
                    "Editable (approved)";
            }

            if(selectedChangePage === "payment"){

                hiddenData
                    .querySelector(".payment-methods-locked")
                    .textContent = "0";

                hiddenData
                    .querySelector(".payment-methods-change-requested")
                    .textContent = "0";

                modalPaymentMethodsStatus.textContent =
                    "Editable (approved)";
            }

            changeDecisionModal.style.display = "none";

            selectedChangePage = null;

            updateApproveButton();

        });

    };

}

  if(changeRejectBtn){

    changeRejectBtn.onclick = function(){

        if(!currentRow || !selectedChangePage) return;

        const userId = currentRow.dataset.userid;

        let rpcName = "";

        if(selectedChangePage === "personal"){
            rpcName = "admin_reject_profile_changes";
        }

        if(selectedChangePage === "payment"){
            rpcName = "admin_reject_payment_methods_changes";
        }

        if(!rpcName) return;

        const done = KTUI.busy(changeRejectBtn, "Rejecting...", [changeApproveBtn]);

        sb.rpc(rpcName, {
            p_user_id: userId
        })

        .then(({ error }) => {

            done();

            if(error){

    KTUI.notify(
        "Failed to reject changes: " +
        error.message
    );

    return;
}

showChangeRequestToast(
    selectedChangePage === "personal"
        ? "Personal Information change request rejected successfully."
        : "Payment Methods change request rejected successfully."
);

const hiddenData =
                currentRow.querySelector(".user-hidden-data");

            if(selectedChangePage === "personal"){

                hiddenData
                    .querySelector(".change-requested")
                    .textContent = "0";

                modalInfoStatus.textContent =
                    "Locked — request rejected";
            }

            if(selectedChangePage === "payment"){

                hiddenData
                    .querySelector(".payment-methods-change-requested")
                    .textContent = "0";

                modalPaymentMethodsStatus.textContent =
                    "Locked — request rejected";
            }

            changeDecisionModal.style.display = "none";

            selectedChangePage = null;

            updateApproveButton();

        });

    };

}

    // ===============================
    // CREDIT BALANCE (real — admin_credit_wallet)
    // ===============================

    const creditBtn = document.querySelector(".credit-btn");

    const creditModal = document.getElementById("creditModal");

    const creditSave = document.querySelector(".credit-content .save-btn");

    if(creditBtn){

        creditBtn.onclick=function(){
            
            creditModal.style.display="flex";
        };

    }

    if(creditSave){

        creditSave.onclick=function(){

            if(!currentRow) return;

            let amount = Number(document.getElementById("creditAmount").value);

            if(amount <= 0){
                KTUI.notify("Enter a valid amount");
                return;
            }

            const done = KTUI.busy(creditSave, "Crediting...");

            sb.rpc("admin_credit_wallet", {
                p_user_id: currentRow.dataset.userid,
                p_amount: amount,
                p_note: "Manual admin credit"
            })

            .then(({ error }) => {

                done();

                if(error){
                    KTUI.notify("Failed to credit balance: " + error.message);
                    return;
                }

                creditModal.style.display="none";
                document.getElementById("creditAmount").value="";

                loadUsers();

                KTUI.notify("Balance credited successfully");

            });

        };

    }

    // ===============================
    // DEBIT BALANCE (real — admin_debit_wallet)
    // ===============================

    const debitBtn = document.querySelector(".debit-btn");

    const debitModal = document.getElementById("debitModal");

    const debitSave = document.querySelector(".debit-content .danger-btn");

    if(debitBtn){

        debitBtn.onclick=function(){
            
            debitModal.style.display="flex";
        };

    }

    if(debitSave){

        debitSave.onclick=function(){

            if(!currentRow) return;

            let amount = Number(document.getElementById("debitAmount").value);

            if(amount <= 0){
                KTUI.notify("Enter a valid amount");
                return;
            }

            const done = KTUI.busy(debitSave, "Debiting...");

            sb.rpc("admin_debit_wallet", {
                p_user_id: currentRow.dataset.userid,
                p_amount: amount,
                p_note: "Manual admin debit"
            })

            .then(({ error }) => {

                done();

                if(error){
                    KTUI.notify("Failed to debit balance: " + error.message);
                    return;
                }

                debitModal.style.display="none";
                document.getElementById("debitAmount").value="";

                loadUsers();

                KTUI.notify("Balance debited successfully");

            });

        };

    }

    // ===============================
    // CHANGE MINING PLAN (real — admin_set_user_plan)
    // ===============================

    const miningBtn = document.querySelector(".mining-btn");

    const planModal = document.getElementById("planModal");

    const planSave = document.querySelector(".plan-content .save-btn");

    const planSelect = document.getElementById("userPlan");

    if(miningBtn){

        miningBtn.onclick=function(){

            if(!currentRow) return;

            

            // Populate the dropdown from the real plans table
            sb.from("plans")
                .select("id, name")
                .eq("is_active", true)
                .order("sort_order")

                .then(({ data, error }) => {

                    if(error || !planSelect) return;

                    plansCache = data;

                    planSelect.innerHTML = '<option value="">Select a plan</option>' +
                        data.map(p => `<option value="${p.id}">${p.name}</option>`).join("");

                    planModal.style.display="flex";

                });

        };

    }

    if(planSave){

        planSave.onclick=function(){

            if(!currentRow) return;

            let newPlanId = planSelect.value;

            if(newPlanId === ""){
                KTUI.notify("Select a plan");
                return;
            }

            const done = KTUI.busy(planSave, "Updating...");

            sb.rpc("admin_set_user_plan", {
                p_user_id: currentRow.dataset.userid,
                p_plan_id: newPlanId
            })

            .then(({ error }) => {

                done();

                if(error){
                    KTUI.notify("Failed to update plan: " + error.message);
                    return;
                }

                const planName = plansCache.find(p => p.id === newPlanId)?.name || "Updated";

                currentRow.querySelector(".user-hidden-data .plan").textContent = planName;
                modalPlan.textContent = planName;

                planModal.style.display="none";

                KTUI.notify("Mining plan updated successfully");

            });

        };

    }

    // ===============================
    // ADD BONUS (real — admin_add_bonus)
    // ===============================

    const rewardBtn = document.querySelector(".reward-btn");

    if(rewardBtn){

        rewardBtn.onclick=function(){

            if(!currentRow) return;

            const bonusUserId = currentRow.dataset.userid;

            KTUI.prompt("Enter the bonus amount to add to this user's balance.", {
                title: "Add Bonus",
                placeholder: "0.00",
                inputMode: "decimal",
                confirmText: "Add Bonus",
                busyText: "Adding...",
                run: function(value){

                    const amount = Number(String(value).trim());

                    return sb.rpc("admin_add_bonus", {
                        p_user_id: bonusUserId,
                        p_amount: amount,
                        p_note: "Bonus added by admin"
                    }).then(({ error }) => {

                        if(error){
                            return "Failed to add bonus: " + error.message;
                        }

                        loadUsers();

                        KTUI.success("Bonus added successfully");

                        return null;

                    });

                },
                validate: function(value){
                    const n = Number(String(value).trim());
                    if(String(value).trim() === "" || isNaN(n) || n <= 0){
                        return "Enter a valid amount greater than 0.";
                    }
                    return null;
                }
            });

        };

    }

    // ===============================
    // VERIFY USER
    // ===============================

    // ===============================
// VERIFY USER
// ===============================

const verifyBtn =
    document.querySelector(".verify-btn");

const verifyUserModal =
    document.getElementById("verifyUserModal");

const verifyUserMessage =
    document.getElementById("verifyUserMessage");

const verifyUserActions =
    document.getElementById("verifyUserActions");


// ---------------------------------
// Update Verify User Button
// ---------------------------------

function updateVerifyUserButton(){

    if(!verifyBtn || !currentRow) return;

    const userId =
        currentRow.dataset.userid;


    // ---------------------------------
    // Loading state
    // ---------------------------------

    verifyBtn.disabled = true;

    verifyBtn.textContent = "Loading...";

    verifyBtn.classList.remove(
        "verified-user-btn"
    );


    // ---------------------------------
    // Get the user's LATEST KYC record
    // ---------------------------------

    sb.from("kyc_submissions")
        .select("id, status, created_at")
        .eq("user_id", userId)
        .order("created_at", {
            ascending: false
        })
        .limit(1)
        .maybeSingle()

        .then(({ data, error }) => {

            if(error){

                console.error(
                    "Failed to check user verification:",
                    error
                );

                // Do not incorrectly show Verified
                verifyBtn.textContent =
                    "Verify User";

                verifyBtn.disabled = false;

                verifyBtn.classList.remove(
                    "verified-user-btn"
                );

                return;
            }


            // ---------------------------------
            // No KYC record
            // ---------------------------------

            if(!data){

                verifyBtn.textContent =
                    "Verify User";

                verifyBtn.disabled = false;

                verifyBtn.classList.remove(
                    "verified-user-btn"
                );

                return;
            }


            // ---------------------------------
            // Latest KYC record is approved
            // ---------------------------------

            if(data.status === "approved"){

                verifyBtn.textContent =
                    "Verified";

                verifyBtn.disabled = true;

                verifyBtn.classList.add(
                    "verified-user-btn"
                );

                return;
            }


            // ---------------------------------
            // Latest KYC record is NOT approved
            // ---------------------------------

            verifyBtn.textContent =
                "Verify User";

            verifyBtn.disabled = false;

            verifyBtn.classList.remove(
                "verified-user-btn"
            );

        })

        .catch(error => {

            console.error(
                "Verification status check failed:",
                error
            );

            verifyBtn.textContent =
                "Verify User";

            verifyBtn.disabled = false;

            verifyBtn.classList.remove(
                "verified-user-btn"
            );

        });

}


// ---------------------------------
// Open Verification Check Modal
// ---------------------------------

// =================================
// CHECK USER VERIFICATION SUBMISSION
// =================================

// =================================
// CHECK USER VERIFICATION SUBMISSION
// =================================

function openVerifyUserCheck(){

    if(!currentRow) return;

    const userId =
        currentRow.dataset.userid;

    // =================================
    // OPEN MODAL
    // =================================

    verifyUserMessage.textContent =
        "Checking verification status...";

    verifyUserActions.innerHTML = `
        <button
            type="button"
            class="verify-user-close">
            Close
        </button>
    `;

    verifyUserModal.style.display = "flex";

    // Bind Close immediately
    bindVerifyUserClose();


    // =================================
    // CHECK LATEST KYC RECORD
    // =================================

    sb.from("kyc_submissions")
        .select(
            "id, status, needs_resubmission, created_at"
        )
        .eq("user_id", userId)
        .order("created_at", {
            ascending: false
        })
        .limit(1)
        .maybeSingle()

        .then(({ data, error }) => {

            if(error){

                console.error(
                    "Failed to check KYC submission:",
                    error
                );

                verifyUserMessage.textContent =
                    "Failed to check verification status.";

                // Close button is already bound
                return;
            }


            // =================================
            // NO KYC RECORD
            // =================================

            if(!data){

                verifyUserMessage.textContent =
                    "This user has not submitted KYC verification.";

                // Close button remains available
                return;
            }


            // =================================
            // RESET / RESUBMISSION REQUIRED
            // =================================

            if(
                data.status === "rejected" &&
                data.needs_resubmission === true
            ){

                verifyUserMessage.textContent =
                    "This user has not submitted KYC verification.";

                // Close button remains available
                return;
            }


            // =================================
            // PENDING
            // =================================

            if(data.status === "pending"){

                verifyUserMessage.textContent =
                    "This user has submitted KYC verification.";

                verifyUserActions.innerHTML = `
                    <button
                        type="button"
                        class="verify-user-close">
                        Close
                    </button>

                    <button
                        type="button"
                        class="verify-user-confirm">
                        Verify
                    </button>
                `;

                // Re-bind because innerHTML replaced the buttons
                bindVerifyUserClose();

                const confirmBtn =
                    verifyUserActions.querySelector(
                        ".verify-user-confirm"
                    );

                if(confirmBtn){

                    confirmBtn.onclick = function(){

                        window.verificationUserId =
                            userId;

                        verifyUserModal.style.display =
                            "none";

                        userModal.style.display =
                            "none";

                        loadAdminPage("verification");

                    };

                }

                return;
            }


            // =================================
            // REJECTED
            // =================================

            if(data.status === "rejected"){

                verifyUserMessage.textContent =
                    "This user has not submitted KYC verification.";

                // Close button remains available
                return;
            }


            // =================================
            // APPROVED
            // =================================

            if(data.status === "approved"){

                verifyUserMessage.textContent =
                    "This user has submitted KYC verification.";

                // Close button already exists and is bound
                return;
            }


            // =================================
            // FALLBACK
            // =================================

            verifyUserMessage.textContent =
                "This user has not submitted KYC verification.";

        })

        .catch(error => {

            console.error(
                "Verification status check failed:",
                error
            );

            verifyUserMessage.textContent =
                "Failed to check verification status.";

        });
}


// ---------------------------------
// Close Verification Check Modal
// ---------------------------------

function bindVerifyUserClose(){

    if(!verifyUserActions) return;

    verifyUserActions.onclick = function(event){

        const closeButton =
            event.target.closest(".verify-user-close");

        if(!closeButton) return;

        verifyUserModal.style.display = "none";

        if(verifyUserMessage){
            verifyUserMessage.textContent =
                "Checking verification status...";
        }
    };
}


// =================================
// VERIFY USER BUTTON CLICK
// =================================

if(verifyBtn){

    verifyBtn.onclick = function(){

        if(!currentRow) return;

        // Do nothing while checking
        if(verifyBtn.disabled) return;

        openVerifyUserCheck();

    };

}


// ===============================
// RESET PASSWORD
// ===============================

      // ===============================
    // RESET PASSWORD (real — request/reset/reject flow)
    // ===============================
    // Admin no longer sends a reset email to profiles.email (that address
    // isn't the real auth login identity anyway — login uses phone). Instead
    // this shows whether the user has requested a reset, lets the admin
    // generate a brand-new random password (written straight into
    // auth.users via admin_reset_password), or reject the request.

    const passwordBtn = document.querySelector(".password-btn");

    const resetPasswordModal = document.getElementById("resetPasswordModal");

    const resetPasswordStatus = document.getElementById("resetPasswordStatus");

    const resetPasswordActions = document.getElementById("resetPasswordActions");

    function renderResetPasswordModal(){

        if(!currentRow) return;

        const userId = currentRow.dataset.userid;

        resetPasswordStatus.textContent = "Checking for a pending request…";
        resetPasswordActions.innerHTML = '<button class="cancel-btn">Close</button>';
        bindResetPasswordClose();

        Promise.all([
            sb.from("account_reset_requests").select("id").eq("user_id", userId).eq("kind","password").eq("status","pending").maybeSingle(),
            sb.from("profiles").select("temp_password_display").eq("id", userId).maybeSingle()
        ]).then(([reqRes, profRes]) => {

            if(reqRes.error){ resetPasswordStatus.textContent = "Failed to check request: " + reqRes.error.message; return; }
            if(profRes.error){ resetPasswordStatus.textContent = "Failed to check request: " + profRes.error.message; return; }

            const pending = reqRes.data;
            const tempPassword = profRes.data ? profRes.data.temp_password_display : null;

            let statusHtml = "";

            if(tempPassword){
                statusHtml += "Generated password (not yet changed by user): <strong>" + tempPassword + "</strong><br><br>";
            }

            if(pending){
                statusHtml += "This user has requested a password reset.";
            } else if(!tempPassword){
                statusHtml += "No pending password reset request for this user.";
            }

            resetPasswordStatus.innerHTML = statusHtml;

            let buttonsHtml = '<button class="cancel-btn">Close</button>';
            if(pending){
                buttonsHtml += '<button class="reset-btn password-reset-confirm-btn">Reset</button>';
                buttonsHtml += '<button class="reset-btn reject-btn password-reset-reject-btn">Reject</button>';
            }
            resetPasswordActions.innerHTML = buttonsHtml;
            bindResetPasswordClose();

            const confirmBtn = resetPasswordActions.querySelector(".password-reset-confirm-btn");
            if(confirmBtn){
                confirmBtn.onclick = function(){
                    const rejectOther = resetPasswordActions.querySelector(".password-reset-reject-btn");
                    const done = KTUI.busy(confirmBtn, "Resetting...", [rejectOther]);
                    sb.rpc("admin_reset_password", { p_user_id: userId })
                        .then(({ data, error }) => {
                            done();
                            if(error){
                                KTUI.notify("Failed to reset password: " + error.message);
                                return;
                            }
                            KTUI.alert("The password was reset. Give this new password to the user:", {
                                type: "success",
                                title: "Password Reset",
                                value: String(data),
                                okText: "Done"
                            });
                            renderResetPasswordModal();
                        });
                };
            }

            const rejectBtn = resetPasswordActions.querySelector(".password-reset-reject-btn");
            if(rejectBtn){
                rejectBtn.onclick = function(){
                    const confirmOther = resetPasswordActions.querySelector(".password-reset-confirm-btn");
                    const done = KTUI.busy(rejectBtn, "Rejecting...", [confirmOther]);
                    sb.rpc("admin_reject_reset_request", { p_user_id: userId, p_kind: "password" })
                        .then(({ error }) => {
                            done();
                            if(error){
                                KTUI.notify("Failed to reject request: " + error.message);
                                return;
                            }
                            KTUI.success("Password reset request rejected.");
                            renderResetPasswordModal();
                        });
                };
            }

        });

    }

    function bindResetPasswordClose(){
        const closeBtn = resetPasswordActions.querySelector(".cancel-btn");
        if(closeBtn){
            closeBtn.onclick = function(){ resetPasswordModal.style.display = "none"; };
        }
    }

    if(passwordBtn){

        passwordBtn.onclick=function(){
            if(!currentRow) return;
          
            renderResetPasswordModal();
            resetPasswordModal.style.display="flex";
        };

    }

    // ===============================
    // RESET WITHDRAWAL PIN (real — request/reset/reject flow)
    // ===============================
    // Reset just clears withdrawal_pin_hash, same as if the user never set
    // one — they go through "Add withdrawal PIN" again from scratch.

    const pinResetBtn = document.querySelector(".pin-reset-btn");

    const resetPinModal = document.getElementById("resetPinModal");

    const resetPinStatus = document.getElementById("resetPinStatus");

    const resetPinActions = document.getElementById("resetPinActions");

    function bindResetPinClose(){
        const closeBtn = resetPinActions.querySelector(".cancel-btn");
        if(closeBtn){
            closeBtn.onclick = function(){ resetPinModal.style.display = "none"; };
        }
    }

    function renderResetPinModal(){

        if(!currentRow) return;

        const userId = currentRow.dataset.userid;

        resetPinStatus.textContent = "Checking for a pending request…";
        resetPinActions.innerHTML = '<button class="cancel-btn">Close</button>';
        bindResetPinClose();

        sb.from("account_reset_requests").select("id").eq("user_id", userId).eq("kind","pin").eq("status","pending").maybeSingle()

            .then(({ data, error }) => {

                if(error){
                    resetPinStatus.textContent = "Failed to check request: " + error.message;
                    return;
                }

                const pending = data;

                resetPinStatus.textContent = pending
                    ? "This user has requested a withdrawal PIN reset."
                    : "No pending withdrawal PIN reset request for this user.";

                let buttonsHtml = '<button class="cancel-btn">Close</button>';
                if(pending){
                    buttonsHtml += '<button class="reset-btn pin-reset-confirm-btn">Reset</button>';
                    buttonsHtml += '<button class="reset-btn reject-btn pin-reset-reject-btn">Reject</button>';
                }
                resetPinActions.innerHTML = buttonsHtml;
                bindResetPinClose();

                const confirmBtn = resetPinActions.querySelector(".pin-reset-confirm-btn");
                if(confirmBtn){
                    confirmBtn.onclick = function(){
                        const rejectOther = resetPinActions.querySelector(".pin-reset-reject-btn");
                        const done = KTUI.busy(confirmBtn, "Resetting...", [rejectOther]);
                        sb.rpc("admin_reset_withdrawal_pin", { p_user_id: userId })
                            .then(({ error }) => {
                                done();
                                if(error){
                                    KTUI.notify("Failed to reset PIN: " + error.message);
                                    return;
                                }
                                KTUI.notify("Withdrawal PIN reset — the user can add a new one.");
                                renderResetPinModal();
                            });
                    };
                }

                const rejectBtn = resetPinActions.querySelector(".pin-reset-reject-btn");
                if(rejectBtn){
                    rejectBtn.onclick = function(){
                        const confirmOther = resetPinActions.querySelector(".pin-reset-confirm-btn");
                        const done = KTUI.busy(rejectBtn, "Rejecting...", [confirmOther]);
                        sb.rpc("admin_reject_reset_request", { p_user_id: userId, p_kind: "pin" })
                            .then(({ error }) => {
                                done();
                                if(error){
                                    KTUI.notify("Failed to reject request: " + error.message);
                                    return;
                                }
                                KTUI.success("PIN reset request rejected.");
                                renderResetPinModal();
                            });
                    };
                }

            });

    }

    if(pinResetBtn){

        pinResetBtn.onclick=function(){
            if(!currentRow) return;
            
            renderResetPinModal();
            resetPinModal.style.display="flex";
        };

    }

    // ===============================
    // DEPOSIT / WITHDRAWAL HISTORY
    // ===============================

    


// ======================================================
// DEPOSIT / WITHDRAWAL HISTORY
// ======================================================

const userHistoryModal =
    document.getElementById("userHistoryModal");

const userHistoryTitle =
    document.getElementById("userHistoryTitle");

const userHistoryUser =
    document.getElementById("userHistoryUser");

const userHistorySearch =
    document.getElementById("userHistorySearch");

const userHistoryBody =
    document.getElementById("userHistoryBody");

const userHistoryClose =
    document.getElementById("userHistoryClose");


let userHistoryType = "deposit";

let userHistoryRecords = [];


// ======================================================
// FORMAT VALUE
// ======================================================

function formatHistoryValue(value){

    if(
        value === null ||
        value === undefined ||
        value === ""
    ){
        return "—";
    }

    if(typeof value === "boolean"){

        return value ? "Yes" : "No";

    }

    if(typeof value === "object"){

        return JSON.stringify(value);

    }

    return String(value);

}


// ======================================================
// FORMAT DATE
// ======================================================

function formatHistoryDate(value){

    if(!value){

        return "—";

    }

    const date = new Date(value);

    if(Number.isNaN(date.getTime())){

        return formatHistoryValue(value);

    }

    return date.toLocaleString();

}


// ======================================================
// SEARCHABLE RECORD TEXT
// ======================================================

function getHistoryRecordText(record){

    return Object.entries(record)

        .map(([key, value]) =>
            `${key} ${formatHistoryValue(value)}`
        )

        .join(" ")

        .toLowerCase();

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHistoryHtml(value){

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


// ======================================================
// DETERMINE TABLE COLUMNS
// ======================================================

function getHistoryColumns(records){

    const preferred = [

        "created_at",
        "amount",
        "method",
        "status",
        "account_details",
        "transaction_id",
        "reference",
        "id"

    ];


    const available = [];


    preferred.forEach(key => {

        if(
            records.some(record =>
                Object.prototype.hasOwnProperty.call(
                    record,
                    key
                )
            )
        ){

            available.push(key);

        }

    });


    const extras = [];


    records.forEach(record => {

        Object.keys(record).forEach(key => {

            if(
                key === "user_id" ||
                available.includes(key) ||
                extras.includes(key)
            ){

                return;

            }

            extras.push(key);

        });

    });


    return [

        ...available,
        ...extras

    ].slice(0, 8);

}



// ======================================================
// RENDER HISTORY
// ======================================================

// ======================================================
// RENDER HISTORY
// ======================================================

function renderHistoryRecords(){

    const search =
        (userHistorySearch.value || "")
        .trim()
        .toLowerCase();


    const filtered =
        userHistoryRecords.filter(record => {

            let method = "—";

if(userHistoryType === "deposit"){

    method = formatDepositMethodLabel(record.method);

}else{

    method =
        record.payment_methods
            ? formatWithdrawalMethodLabel(record.payment_methods.method)
            : "—";

}


            const searchableText = [

                method,

                record.amount_zar,

                record.created_at,

                record.status

            ]

            .map(value =>
                formatHistoryValue(value)
            )

            .join(" ")

            .toLowerCase();


            return !search ||
                   searchableText.includes(search);

        });


    if(!filtered.length){

        userHistoryBody.innerHTML = `

            <div class="user-history-empty">

                ${
                    userHistoryRecords.length

                    ? "No matching records found."

                    : `No ${userHistoryType}
                       history found for this user.`
                }

            </div>

        `;

        return;

    }


    let html = `

        <table class="user-history-table">

            <thead>

                <tr>

                    <th>Method</th>

                    <th>Amount</th>

                    <th>Date</th>

                    <th>Status</th>

                </tr>

            </thead>

            <tbody>

    `;


    filtered.forEach(record => {

        // ================================================
        // METHOD
        // ================================================

        let method = "—";


        if(userHistoryType === "deposit"){

            method =
               formatDepositMethodLabel(record.method) || "—";

        }

        else{

            method =

                record.payment_methods

                    ? formatUserHistoryWithdrawalMethod(
                        record.payment_methods.method
                    )

                    : "—";

        }


        // ================================================
        // AMOUNT
        // ================================================

        const amount =

            record.amount_zar !== null &&
            record.amount_zar !== undefined

                ? "M " +
                  Number(
                      record.amount_zar
                  ).toLocaleString(
                      "en-US",
                      {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                      }
                  )

                : "—";


        // ================================================
        // DATE
        // ================================================

        const date =

            formatHistoryDate(
                record.created_at
            );


        // ================================================
        // STATUS
        // ================================================

        const status =

            formatHistoryValue(
                record.status
            );


        html += `

            <tr>

                <td>
                    ${escapeHistoryHtml(method)}
                </td>

                <td>
                    ${escapeHistoryHtml(amount)}
                </td>

                <td>
                    ${escapeHistoryHtml(date)}
                </td>

                <td>
                    ${escapeHistoryHtml(status)}
                </td>

            </tr>

        `;

    });


    html += `

            </tbody>

        </table>

    `;


    userHistoryBody.innerHTML = html;

}

// ======================================================
// WITHDRAWAL METHOD LABEL
// Uses the same method mapping as withdrawals.js
// ======================================================

function formatUserHistoryWithdrawalMethod(method){

    const labels = {

        usdt_trc20: "USDT (TRC20)",

        mpesa: "M-Pesa",

        ecocash: "EcoCash"

    };

    return labels[method] || method || "—";

}


  // ======================================================
// DEPOSIT METHOD LABEL
// ======================================================

function formatDepositMethodLabel(method){

    const labels = {

        usdt_trc20: "USDT (TRC20)",

        mpesa: "M-Pesa",

        ecocash: "EcoCash"

    };

    return labels[method] || method || "—";

}
  
// ======================================================
// OPEN USER HISTORY
// ======================================================

// ======================================================
// OPEN USER HISTORY
// ======================================================

async function openUserHistory(type){

    if(!currentRow){

        return;

    }


    const userId =
        currentRow.dataset.userid;


    const userName =
        currentRow.querySelector("h4")
        ?.textContent || "User";


    userHistoryType = type;

    userHistoryRecords = [];


    userHistorySearch.value = "";


    userHistoryTitle.textContent =

        type === "deposit"

            ? "Deposit History"

            : "Withdrawal History";


    userHistoryUser.textContent =
        userName;


    userHistoryBody.innerHTML = `

        <div class="user-history-loading">

            Loading ${type} history...

        </div>

    `;


    

    userHistoryModal.style.display = "flex";


    try{

        let data;

        let error;


        // ==================================================
        // DEPOSIT HISTORY
        // ==================================================

        if(type === "deposit"){

            const result =

                await sb

                    .from("deposits")

                    .select(`
                        id,
                        user_id,
                        amount_zar,
                        method,
                        status,
                        created_at
                    `)

                    .eq("user_id", userId)

                    .order(
                        "created_at",
                        {
                            ascending:false
                        }
                    );


            data = result.data;

            error = result.error;

        }


        // ==================================================
        // WITHDRAWAL HISTORY
        // ==================================================

        else{

            const result =

                await sb

                    .from("withdrawals")

                    .select(`
                        id,
                        user_id,
                        amount_zar,
                        status,
                        created_at,
                        payment_methods(method)
                    `)

                    .eq("user_id", userId)

                    .order(
                        "created_at",
                        {
                            ascending:false
                        }
                    );


            data = result.data;

            error = result.error;

        }


        if(error){

            console.error(
                `Failed to load ${type} history:`,
                error
            );


            userHistoryBody.innerHTML = `

                <div class="user-history-error">

                    Failed to load ${type}
                    history:
                    ${escapeHistoryHtml(
                        error.message
                    )}

                </div>

            `;

            return;

        }


        userHistoryRecords =
            Array.isArray(data)
                ? data
                : [];


        renderHistoryRecords();


    }catch(error){

        console.error(
            `Failed to load ${type} history:`,
            error
        );


        userHistoryBody.innerHTML = `

            <div class="user-history-error">

                Failed to load ${type}
                history.

            </div>

        `;

    }

}


// ======================================================
// CLOSE HISTORY
// ======================================================

function closeUserHistory(){

    userHistoryModal.style.display =
        "none";


    userHistoryRecords = [];


    userHistorySearch.value = "";

}


// ======================================================
// SEARCH
// ======================================================

if(userHistorySearch){

    userHistorySearch.addEventListener(
        "input",
        renderHistoryRecords
    );

}


// ======================================================
// CLOSE BUTTON
// ======================================================

if(userHistoryClose){

    userHistoryClose.onclick =
        closeUserHistory;

}


// ======================================================
// CLOSE WHEN CLICKING OUTSIDE
// ======================================================

if(userHistoryModal){

    userHistoryModal.addEventListener(
        "click",
        function(e){

            if(e.target === userHistoryModal){

                closeUserHistory();

            }

        }
    );

}


// ======================================================
// DEPOSIT HISTORY BUTTON
// ======================================================

const depositBtn =
    document.querySelector(".deposit-btn");


if(depositBtn){

    depositBtn.onclick = function(){

        openUserHistory("deposit");

    };

}


// ======================================================
// WITHDRAWAL HISTORY BUTTON
// ======================================================

const withdrawBtn =
    document.querySelector(".withdraw-btn");


if(withdrawBtn){

    withdrawBtn.onclick = function(){

        openUserHistory("withdrawal");

    };

}
  

    // ===============================
    // REFERRAL LIST
    // ===============================

    const referralBtn = document.querySelector(".referral-btn");

    if(referralBtn){
        referralBtn.onclick=function(){
            if(!currentRow) return;
            KTUI.notify("Referral list feature is not available yet");
        };
    }

    

    // ===============================
    // DELETE USER — real (admin_delete_user RPC)
    // ===============================
    // Deletes the auth.users row via a SECURITY DEFINER function; profiles
    // cascades automatically (ON DELETE CASCADE). Any other table that
    // references this user without a cascade will surface as a clear
    // foreign-key error here instead of silently doing nothing.

    const deleteBtn = document.querySelector(".delete-btn");

    const deleteModal = document.getElementById("deleteModal");

    const confirmDelete = document.querySelector(".delete-content .delete-btn");

    if(deleteBtn){

        deleteBtn.onclick=function(){
            if(!currentRow) return;
            userModal.style.display="none";
            deleteModal.style.display="flex";
        };

    }

    if(confirmDelete){

        confirmDelete.onclick=function(){

            if(!currentRow) return;

            const done = KTUI.busy(confirmDelete, "Deleting...");

            sb.rpc("admin_delete_user", { p_user_id: currentRow.dataset.userid })

                .then(({ error }) => {

                    done();

                    deleteModal.style.display="none";

                    if(error){
                        KTUI.notify("Failed to delete user: " + error.message);
                        return;
                    }

                    currentRow.remove();
                    currentRow = null;

                    syncUsersEmpty();

                    KTUI.notify("User deleted.");

                });

        };

    }
}

/* ===== js/verification.js ===== */
// =================================
// VERIFICATION PAGE
// =================================

function initVerification() {

    const totalRequests = document.getElementById("totalRequests");
    const pendingRequests = document.getElementById("pendingRequests");
    const approvedRequests = document.getElementById("approvedRequests");
    const rejectedRequests = document.getElementById("rejectedRequests");
    const resubmissionRequests = document.getElementById("resubmissionRequests");
    const resetRequests = document.getElementById("resetRequests");

    const modal = document.getElementById("reviewModal");
    const closeModal = document.querySelector(".close-review");

    const reviewName = document.getElementById("reviewName");
    const reviewDate = document.getElementById("reviewDate");
    const reviewEmail = document.getElementById("reviewEmail");
    const reviewPhone = document.getElementById("reviewPhone");
    const reviewCountry = document.getElementById("reviewCountry");

    const reviewIdFront = document.getElementById("reviewIdFront");
    const reviewIdBack = document.getElementById("reviewIdBack");
    const reviewSelfie = document.getElementById("reviewSelfie");

        const approveBtn = document.querySelector(".approve-btn");
    const rejectBtn = document.querySelector(".reject-btn");
    const requestBtn = document.querySelector(".request-btn");
    const resetBtn = document.querySelector(".reset-btn");
    const rejectResubmissionBtn = document.querySelector(".reject-resubmission-btn");
    const resubmissionStatusEl = document.getElementById("resubmissionStatus");
  
    let selectedRow = null;
    let kycData = {};

    // Users with a resubmission request the admin has not acted on yet
    // (account_reset_requests, kind = 'kyc', status = 'pending').
    let requestUserIds = {};

    // Every list that shows KYC rows (used by search, user filter and stats).
    const ALL_LIST_ROWS =
        "#pendingList tbody tr, #approvedList tbody tr, #rejectedList tbody tr, " +
        "#requestsList tbody tr, #resetsList tbody tr";

    // ===============================
    // Load KYC submissions from Supabase
    // ===============================

    function loadKyc(){

        const submissionsQuery = sb.from("kyc_submissions")
            .select("id, user_id, id_front_url, id_back_url, selfie_url, status, needs_resubmission, admin_note, created_at, country, profiles(username, surname, email, phone)")
            .order("created_at", { ascending: false });

        const requestsQuery = sb.from("account_reset_requests")
            .select("user_id")
            .eq("kind", "kyc")
            .eq("status", "pending");

        Promise.all([submissionsQuery, requestsQuery])

            .then(([submissionsRes, requestsRes]) => {

                const data = submissionsRes.data;
                const error = submissionsRes.error;

                if(error){
                    console.error("Failed to load KYC submissions:", error);
                    return;
                }

                if(requestsRes.error){
                    console.error("Failed to load resubmission requests:", requestsRes.error);
                }

                requestUserIds = {};

                (requestsRes.data || []).forEach(r => {
                    requestUserIds[r.user_id] = true;
                });

                kycData = {};

                data.forEach(row => {

                    const fullName = row.profiles
                        ? [row.profiles.username, row.profiles.surname].filter(Boolean).join(" ")
                        : "Unknown";

                    kycData[row.id] = {
                        id: row.id,
                        userId: row.user_id,
                        createdAt: row.created_at,
                        name: fullName,
                        email: row.profiles ? (row.profiles.email || "") : "",
                        phone: row.profiles ? (row.profiles.phone || "") : "",
                        date: new Date(row.created_at).toLocaleDateString("en-US", {
                            day: "2-digit", month: "short", year: "numeric"
                        }),
                      country: row.country,
                        idFront: row.id_front_url,
                        idBack: row.id_back_url,
                        selfie: row.selfie_url,
                        status: row.status,
                        needsResubmission: row.needs_resubmission,
                        adminNote: row.admin_note
                    };

                });

                renderVerificationData();

                updateKycStats();

              applyVerificationUserFilter();

            });

    }

    // ===============================
    // Render Rows From Data
    // ===============================

    function renderRow(entry) {

    const tr = document.createElement("tr");

    tr.dataset.kycid = entry.id;
    tr.dataset.status = entry.status;

    // Searchable information
    tr.dataset.search = [
        entry.name,
        entry.email,
        entry.phone,
        entry.country,
        entry.date,
        entry.status,
        entry.isRequest ? "request" : "",
        entry.needsResubmission ? "reset" : ""
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

        const buttonLabel =
            entry.status === "pending" ? "Review" : "View";

        let nameCell = entry.name;

        if (entry.needsResubmission) {
            nameCell += " <span style=\"opacity:.6;font-size:11px;\">(reset)</span>";
        }

        if (entry.isRequest) {
            nameCell += " <span class=\"kyc-request-badge\">request</span>";
        }

        tr.innerHTML =
            "<td>" + nameCell + "</td>" +
            "<td>" + entry.date + "</td>" +
            "<td><button class=\"review-btn\">" + buttonLabel + "</button></td>";

        return tr;

    }

    // Empty-state messages for the three lists (also re-run after searching)
    function syncVerificationEmpty() {

        const searchBox = document.getElementById("verificationSearch");
        const searching = !!(searchBox && searchBox.value.trim());

        const lists = [
            { id: "pendingList",  none: "No pending verification requests", icon: "fa-solid fa-inbox" },
            { id: "approvedList", none: "No approved verifications",        icon: "fa-solid fa-circle-check" },
            { id: "rejectedList", none: "No rejected verifications",        icon: "fa-solid fa-circle-xmark" },
            { id: "requestsList", none: "No resubmission requests waiting for action", icon: "fa-solid fa-paper-plane" },
            { id: "resetsList",   none: "No reset verifications",         icon: "fa-solid fa-rotate-left" }
        ];

        lists.forEach(function (item) {

            const body = document.querySelector("#" + item.id + " tbody");

            KTUI.syncTableEmpty(
                body,
                3,
                function () {
                    return searching && body.querySelector("tr[data-kycid]")
                        ? "No results match your search"
                        : item.none;
                },
                item.icon
            );

        });

    }

    function renderVerificationData() {

        const pendingBody =
            document.querySelector("#pendingList tbody");

        const approvedBody =
            document.querySelector("#approvedList tbody");

        const rejectedBody =
            document.querySelector("#rejectedList tbody");

        const requestsBody =
            document.querySelector("#requestsList tbody");

        const resetsBody =
            document.querySelector("#resetsList tbody");

        pendingBody.innerHTML = "";
        approvedBody.innerHTML = "";
        rejectedBody.innerHTML = "";
        requestsBody.innerHTML = "";
        resetsBody.innerHTML = "";

        const allEntries = Object.values(kycData);

        // Each user's most recent submission (any status). A resubmission
        // request belongs to that record, so it is the one tagged "request".
        const latestByUser = {};

        allEntries.forEach(entry => {
            const existing = latestByUser[entry.userId];
            if (!existing || new Date(entry.createdAt) > new Date(existing.createdAt)) {
                latestByUser[entry.userId] = entry;
            }
        });

        allEntries.forEach(entry => {
            entry.isRequest =
                !!requestUserIds[entry.userId] &&
                latestByUser[entry.userId] === entry;
        });

        // Pending: show every pending row, no dedup needed.
        allEntries
            .filter(entry => entry.status === "pending")
            .forEach(entry => pendingBody.appendChild(renderRow(entry)));

        // Approved/Rejected: only each user's single most recent resolved
        // record — an older superseded outcome (e.g. an earlier rejection
        // before a later approval) is dropped from view.
        const latestResolvedByUser = {};

        allEntries
            .filter(entry => entry.status === "approved" || entry.status === "rejected")
            .forEach(entry => {
                const existing = latestResolvedByUser[entry.userId];
                if (!existing || new Date(entry.createdAt) > new Date(existing.createdAt)) {
                    latestResolvedByUser[entry.userId] = entry;
                }
            });

        Object.values(latestResolvedByUser).forEach(entry => {
            if (entry.status === "approved") {
                approvedBody.appendChild(renderRow(entry));
            } else {
                rejectedBody.appendChild(renderRow(entry));
            }

            // Users whose verification was reset (the ones with the reset badge).
            if (entry.needsResubmission) {
                resetsBody.appendChild(renderRow(entry));
            }
        });

        // Users who applied for a resubmission that admin has not acted on.
        Object.keys(requestUserIds).forEach(userId => {
            const entry = latestByUser[userId];
            if (entry) requestsBody.appendChild(renderRow(entry));
        });

        loadReviewButtons();

        syncVerificationEmpty();

    }

  // ===============================
// FILTER VERIFICATION FOR USER
// ===============================

function applyVerificationUserFilter(){

    const targetUserId =
        window.verificationUserId;

    if(!targetUserId) return;


    const matchingEntries =
        Object.values(kycData)
            .filter(entry =>
                entry.userId === targetUserId
            );


    if(!matchingEntries.length){

        window.verificationUserId = null;

        return;
    }


    const latest =
        matchingEntries.sort(
            (a, b) =>
                new Date(b.createdAt) -
                new Date(a.createdAt)
        )[0];


    // Select the user's current/latest KYC status tab
    const targetTab =
        document.querySelector(
            `.kyc-tab[data-status="${latest.status}"]`
        );

    if(targetTab){

        targetTab.click();

    }


    // Hide every KYC row that belongs to another user
    document.querySelectorAll(ALL_LIST_ROWS).forEach(row => {

        const entry =
            kycData[row.dataset.kycid];

        row.style.display =
            entry &&
            entry.userId === targetUserId
                ? ""
                : "none";

    });

    syncVerificationEmpty();


    window.verificationUserId = null;

}

  // =========================================================
// VERIFICATION SEARCH
// =========================================================

const verificationSearch =
    document.getElementById("verificationSearch");

if (verificationSearch) {

    verificationSearch.addEventListener("input", function () {

        const searchTerm =
            this.value.trim().toLowerCase();

        const rows = document.querySelectorAll(ALL_LIST_ROWS);

        rows.forEach(row => {

            const searchableText =
                row.dataset.search || "";

            row.style.display =
                !searchTerm ||
                searchableText.includes(searchTerm)
                    ? ""
                    : "none";

        });

        syncVerificationEmpty();

    });

}

    // ===============================
    // Update Statistics
    // ===============================

    function updateKycStats() {

        const pending =
            document.querySelectorAll("#pendingList tbody tr[data-kycid]").length;

        const approved =
            document.querySelectorAll("#approvedList tbody tr[data-kycid]").length;

        const rejected =
            document.querySelectorAll("#rejectedList tbody tr[data-kycid]").length;

        const requests =
            document.querySelectorAll("#requestsList tbody tr[data-kycid]").length;

        const resets =
            document.querySelectorAll("#resetsList tbody tr[data-kycid]").length;

        totalRequests.textContent =
            pending + approved + rejected;

        resubmissionRequests.textContent = requests;
        resetRequests.textContent = resets;

        pendingRequests.textContent = pending;
        approvedRequests.textContent = approved;
        rejectedRequests.textContent = rejected;
    }

    loadKyc();

    if(window.KTRealtime){
        KTRealtime.register("verification", ["kyc_submissions","account_reset_requests"], loadKyc);
    }

    // ===============================
    // Tabs
    // ===============================

    const tabs = document.querySelectorAll(".kyc-tab");
    const sections = document.querySelectorAll(".verification-section");

    // Tab (data-status) -> the list it shows.
    const TAB_LISTS = {
        pending:  "pendingList",
        approved: "approvedList",
        rejected: "rejectedList",
        requests: "requestsList",
        resets:   "resetsList"
    };

    function showKycSection(status){

        sections.forEach(section => {
            section.style.display = "none";
        });

        const listId = TAB_LISTS[status] || TAB_LISTS.pending;

        document.getElementById(listId)
            .closest(".verification-section")
            .style.display = "block";

    }

    showKycSection("pending");

    tabs.forEach(tab => {

        tab.addEventListener("click", function () {

            tabs.forEach(t =>
                t.classList.remove("active"));

            this.classList.add("active");

            showKycSection(this.dataset.status);

        });

    });

    // ===============================
    // Review Buttons
    // ===============================

    function loadReviewButtons() {

        document.querySelectorAll(".review-btn").forEach(button => {

            button.onclick = function () {

                selectedRow = this.closest("tr");

                const entry = kycData[selectedRow.dataset.kycid];

                if(!entry) return;

                reviewName.textContent = entry.name;
                reviewDate.textContent = entry.date;
                reviewEmail.textContent = entry.email || "—";
                                reviewPhone.textContent = entry.phone || "—";
 reviewCountry.textContent = entry.country || "—";

                reviewIdFront.src = entry.idFront;
                reviewIdBack.src = entry.idBack;
                reviewSelfie.src = entry.selfie;

                document.getElementById("adminNoteInput").value = "";

                                if (entry.status === "pending") {

                    approveBtn.style.display = "inline-block";
                    rejectBtn.style.display = "inline-block";
                    requestBtn.style.display = "inline-block";
                    resetBtn.style.display = "none";
                    rejectResubmissionBtn.style.display = "none";
                    resubmissionStatusEl.style.display = "none";

                } else {

                    approveBtn.style.display = "none";
                    rejectBtn.style.display = "none";
                    requestBtn.style.display = "none";
                    resetBtn.style.display = "inline-block";

                }

                if (entry.status === "approved") {
                    refreshResubmissionStatus(entry.userId);
                } else {
                    rejectResubmissionBtn.style.display = "none";
                    resubmissionStatusEl.style.display = "none";
                }

                modal.style.display = "flex";

            };

        });

    }

    // ===============================
    // Close Modal
    // ===============================

    closeModal.onclick = function () {

        modal.style.display = "none";

    };

    window.onclick = function (e) {

        if (e.target === modal) {

            modal.style.display = "none";

        }

    };

    // ===============================
    // Approve (real — approve_kyc RPC)
    // ===============================

    
    approveBtn.onclick = function () {

        if (!selectedRow) return;

        const kycId = selectedRow.dataset.kycid;
        const note = document.getElementById("adminNoteInput").value.trim() || null;

        const done = KTUI.busy(approveBtn, "Approving...", [rejectBtn, resetBtn, requestBtn]);

        sb.rpc("approve_kyc", { p_kyc_id: kycId, p_note: note })

            .then(({ error }) => {

                done();

                if(error){
                    KTUI.notify("Failed to approve: " + error.message);
                    return;
                }

                modal.style.display = "none";

                KTUI.success("Verification approved successfully.");

                loadKyc();

            });

    };

    // ===============================
    // Reject (real — reject_kyc RPC)
    // ===============================

    rejectBtn.onclick = function () {

        if (!selectedRow) return;

        const kycId = selectedRow.dataset.kycid;
        const note = document.getElementById("adminNoteInput").value.trim() || null;

        const done = KTUI.busy(rejectBtn, "Rejecting...", [approveBtn, resetBtn, requestBtn]);

        sb.rpc("reject_kyc", { p_kyc_id: kycId, p_note: note })

            .then(({ error }) => {

                done();

                if(error){
                    KTUI.notify("Failed to reject: " + error.message);
                    return;
                }

                modal.style.display = "none";

                KTUI.success("Verification rejected.");

                loadKyc();

            });

    };

    // ===============================
    // Reset Verification (real — admin_reset_kyc RPC)
    // ===============================

    resetBtn.onclick = function () {

        if (!selectedRow) return;

        const kycId = selectedRow.dataset.kycid;
        const note = document.getElementById("adminNoteInput").value.trim() || null;
        const entry = kycData[kycId];

        const done = KTUI.busy(resetBtn, "Resetting...", [approveBtn, rejectBtn, requestBtn]);

        sb.rpc("admin_reset_kyc", { p_kyc_id: kycId, p_note: note })

            .then(({ error }) => {

                if(error){
                    done();
                    KTUI.notify("Failed to reset: " + error.message);
                    return Promise.reject(error);
                }

                // Fulfilling the reset also resolves any pending resubmission
                // request, so "Resubmission pending" doesn't linger after this.
                // Chained (not fire-and-forget) so a failure here is visible
                // instead of silently leaving a stale pending row behind.
                if (entry && entry.userId) {
                    return sb.rpc("admin_complete_kyc_reset_request", { p_user_id: entry.userId });
                }

            })

            .then((result) => {

                done();

                if (result && result.error) {
                    KTUI.notify("Reset succeeded, but failed to clear the pending resubmission request: " + result.error.message + " — reject it manually from the resubmission status area if it still shows pending.");
                } else {
                    KTUI.success("Verification reset successfully. The user can submit new documents.");
                }

                modal.style.display = "none";

                loadKyc();

            })

            .catch(() => {
                // Reset itself already alerted above; nothing more to do.
                done();
            });

    };

    // ===============================
    // Request Documents (real — sends a notification)
    // ===============================

    requestBtn.onclick = function () {

        if (!selectedRow) return;

        const kycId = selectedRow.dataset.kycid;
        const note = document.getElementById("adminNoteInput").value.trim() || null;

        const done = KTUI.busy(requestBtn, "Sending...", [approveBtn, rejectBtn, resetBtn]);

        sb.rpc("admin_request_kyc_documents", { p_kyc_id: kycId, p_note: note })

            .then(({ error }) => {

                done();

                if(error){
                    KTUI.notify("Failed to send request: " + error.message);
                    return;
                }

                KTUI.success("Request sent. The user was notified and a message was added to their support chat.");

                modal.style.display = "none";

            });

        };

    // ===============================
    // Resubmission status (real — account_reset_requests, kind='kyc')
    // ===============================

    function refreshResubmissionStatus(userId) {

        resubmissionStatusEl.style.display = "block";
        resubmissionStatusEl.textContent = "Checking resubmission status…";
        rejectResubmissionBtn.style.display = "none";

        sb.from("account_reset_requests")
            .select("id")
            .eq("user_id", userId)
            .eq("kind", "kyc")
            .eq("status", "pending")
            .maybeSingle()

            .then(({ data, error }) => {

                if (error) {
                    resubmissionStatusEl.textContent = "Failed to check resubmission status: " + error.message;
                    return;
                }

                if (data) {
                    resubmissionStatusEl.textContent = "This user has requested a resubmission.";
                    rejectResubmissionBtn.style.display = "inline-block";
                } else {
                    resubmissionStatusEl.textContent = "No resubmission request.";
                    rejectResubmissionBtn.style.display = "none";
                }

            });

    }

    rejectResubmissionBtn.onclick = function () {

        if (!selectedRow) return;

        const kycId = selectedRow.dataset.kycid;
        const entry = kycData[kycId];
        if (!entry || !entry.userId) return;

        const note = document.getElementById("adminNoteInput").value.trim() || null;

        const done = KTUI.busy(rejectResubmissionBtn, "Rejecting...");

        sb.rpc("admin_reject_kyc_resubmission", { p_user_id: entry.userId, p_note: note })

            .then(({ error }) => {

                done();

                if (error) {
                    KTUI.notify("Failed to reject resubmission: " + error.message);
                    return;
                }

                KTUI.notify("Resubmission request rejected — the user has been notified.");

                refreshResubmissionStatus(entry.userId);

                loadKyc();

            });

    };

}


/* ===== js/exchange.js ===== */
// =================================
// EXCHANGE RATES PAGE
// =================================

let ratesCache = {};
let selectedRateId = null;
let pendingDeleteId = null;

// =================================
// LOAD RATES FROM SUPABASE
// =================================

function loadRates(){

    sb.from("exchange_rates")
        .select("*")
        .order("updated_at", { ascending: false })

        .then(({ data, error }) => {

            if(error){
                console.error("Failed to load exchange rates:", error);
                return;
            }

            ratesCache = {};

            data.forEach(row => {
                ratesCache[row.id] = row;
            });

            renderRates();

            if(data.length > 0){
                const mostRecent = data[0].updated_at;
                const d = new Date(mostRecent);
                document.getElementById("lastUpdated").innerText =
                    "Last Updated: " + d.toLocaleDateString() + " " + d.toLocaleTimeString();
            }

        });

}

function renderRates(){

    const table = document.getElementById("rateTableBody");
    if(!table){
        console.error("rateTableBody not found");
        return;
    }

    table.innerHTML = "";

    Object.values(ratesCache).forEach(item => {

        const pair = item.from_currency + "/" + item.to_currency;

        const row = document.createElement("tr");
        row.dataset.id = item.id;

        row.innerHTML = `
            <td>${pair}</td>
            <td><span>${parseFloat(item.rate).toFixed(4)}</span></td>
            <td>
                <button class="edit-rate-btn" onclick="openRateModal('${item.id}')">
                    Edit
                </button>
            </td>
        `;
        table.appendChild(row);

    });

    KTUI.syncTableEmpty(table, 3, "No currency pairs yet. Use \"Add Currency Pair\" to create one.", "fa-solid fa-money-bill-transfer");

}

// =================================
// INITIALIZE PAGE
// =================================

function initExchangeRates() {

    console.log("Exchange Rates Loaded");

    loadRates();

    if(window.KTRealtime){
        KTRealtime.register("exchange", ["exchange_rates"], loadRates);
    }

}

// =================================
// EDIT RATE MODAL
// =================================

function openRateModal(id) {

    const item = ratesCache[id];
    if(!item) return;

    selectedRateId = id;

    document.getElementById("currencyPair").value = item.from_currency + "/" + item.to_currency;
    document.getElementById("newRate").value = parseFloat(item.rate).toFixed(4);

    document.getElementById("rateModal").style.display = "flex";
}

function closeRateModal() {
    document.getElementById("rateModal").style.display = "none";
    selectedRateId = null;
}

// =================================
// SAVE EDITED RATE (real — updates exchange_rates)
// =================================

function saveRate() {

    if (selectedRateId === null) return;

    let newRate = document.getElementById("newRate").value;
    if (newRate === "") {
        KTUI.notify("Please enter rate");
        return;
    }

    const done = KTUI.busy(
        document.querySelector("#rateModal .save-rate-btn, .rate-modal .save-rate-btn[onclick*='saveRate']"),
        "Saving...",
        [document.querySelector(".rate-modal .delete-rate-btn[onclick*='deleteCurrencyPair']")]
    );

    sb.auth.getUser().then(({ data: { user } }) => {

        sb.from("exchange_rates")
            .update({ rate: Number(newRate), updated_by: user ? user.id : null })
            .eq("id", selectedRateId)

            .then(({ error }) => {

                done();

                if(error){
                    KTUI.notify("Failed to save rate: " + error.message);
                    return;
                }

                closeRateModal();

                KTUI.success("Exchange rate saved successfully.");

                loadRates();

            });

    });

}

// =================================
// DELETE CURRENCY PAIR
// =================================

function deleteCurrencyPair() {

    if (selectedRateId === null) return;

    const item = ratesCache[selectedRateId];
    if(!item) return;

    const pair = item.from_currency + "/" + item.to_currency;

    openConfirmDeleteModal(pair, selectedRateId);
}

// =================================
// ADD NEW CURRENCY PAIR MODAL
// =================================

function openAddRateModal() {
    document.getElementById("addRateModal").style.display = "flex";
}

function closeAddRateModal() {
    document.getElementById("addRateModal").style.display = "none";
    document.getElementById("newCurrencyPair").value = "";
    document.getElementById("newCurrencyRate").value = "";
}

// =================================
// ADD NEW CURRENCY PAIR (real — inserts into exchange_rates)
// =================================

function addCurrencyPair() {

    let pair = document.getElementById("newCurrencyPair").value.trim();
    let rate = document.getElementById("newCurrencyRate").value;

    if (pair === "" || rate === "") {
        KTUI.notify("Please fill all fields");
        return;
    }

    const parts = pair.split("/");

    if(parts.length !== 2 || parts[0].trim() === "" || parts[1].trim() === ""){
        KTUI.notify('Enter the pair like "ZAR/USD"');
        return;
    }

    const done = KTUI.busy(
        document.querySelector(".rate-modal .save-rate-btn[onclick*='addCurrencyPair']"),
        "Adding..."
    );

    sb.auth.getUser().then(({ data: { user } }) => {

        sb.from("exchange_rates")
            .insert({
                from_currency: parts[0].trim().toUpperCase(),
                to_currency: parts[1].trim().toUpperCase(),
                rate: Number(rate),
                updated_by: user ? user.id : null
            })

            .then(({ error }) => {

                done();

                if(error){

                    if(error.code === "23505"){
                        KTUI.notify("That currency pair already exists.");
                    } else {
                        KTUI.notify("Failed to add pair: " + error.message);
                    }

                    return;
                }

                closeAddRateModal();

                KTUI.success("Currency pair added successfully.");

                loadRates();

            });

    });

}

// =================================
// CLOSE MODAL WHEN CLICK OUTSIDE
// =================================

window.addEventListener("click", function(event) {
    let editModal = document.getElementById("rateModal");
    let addModal = document.getElementById("addRateModal");

    if (event.target === editModal) closeRateModal();
    if (event.target === addModal) closeAddRateModal();
});


// =================================
// DELETE CONFIRMATION MODAL
// =================================

let pendingDeletePair = null;

function openConfirmDeleteModal(pair, id) {

    pendingDeleteId = id;
    pendingDeletePair = pair;

    document.getElementById("confirmDeleteMessage").innerText =
        "Are you sure you want to delete " + pair + "?";

    document.getElementById("confirmDeleteModal").style.display = "flex";
}

function closeConfirmDeleteModal() {
    document.getElementById("confirmDeleteModal").style.display = "none";
    pendingDeleteId = null;
    pendingDeletePair = null;
}

function confirmDelete() {

    if (!pendingDeleteId) {
        closeConfirmDeleteModal();
        return;
    }

    const done = KTUI.busy(
        document.querySelector(".delete-rate-btn[onclick*='confirmDelete()']"),
        "Deleting..."
    );

    sb.from("exchange_rates").delete().eq("id", pendingDeleteId)

        .then(({ error }) => {

            done();

            if(error){
                KTUI.notify("Failed to delete pair: " + error.message);
                closeConfirmDeleteModal();
                return;
            }

            closeRateModal();
            closeConfirmDeleteModal();

            KTUI.success("Currency pair deleted.");

            loadRates();

        });

}


/* ===== js/notifications.js ===== */
// ===============================
// NOTIFICATIONS PAGE
// ===============================

let notificationsData = [];
let selectedNotification = null;
let selectedNotificationId = null;
let currentNotificationTab = "all";
let currentNotificationTabButton = null;

// ===============================
// ACTION -> ICON / LABEL MAPPING
// (only the "request created" actions logged under category REQUESTS
//  ever reach this page — see audit_user_requests / admin_send_notification)
// ===============================

const NOTIFICATION_ICONS = {
    deposit_requested: "fa-solid fa-wallet",
    withdrawal_requested: "fa-solid fa-money-bill-transfer",
    notification_sent: "fa-solid fa-paper-plane",
    password_reset_requested: "fa-solid fa-key",
    withdrawal_pin_reset_requested: "fa-solid fa-key",
    personal_info_change_requested: "fa-solid fa-user-pen",
    payment_methods_change_requested: "fa-solid fa-credit-card",
    kyc_verification_requested: "fa-solid fa-id-card",
    kyc_resubmission_requested: "fa-solid fa-file-circle-question",
    unblock_requested: "fa-solid fa-user-check",
    support_message_received: "fa-solid fa-comments"
};

const NOTIFICATION_LABELS = {
    deposit_requested: "Deposit Request",
    withdrawal_requested: "Withdrawal Request",
    notification_sent: "Notification Sent",
    password_reset_requested: "Forgot Password Request",
    withdrawal_pin_reset_requested: "Forgot Withdrawal PIN Request",
    personal_info_change_requested: "Personal Information Change Request",
    payment_methods_change_requested: "Payment Method Change Request",
    kyc_verification_requested: "KYC Verification Request",
    kyc_resubmission_requested: "KYC Resubmission Request",
    unblock_requested: "Account Reactivation Request",
    support_message_received: "New Support Message"
};

const AUDIENCE_LABELS = {
    all: "All Users",
    verified: "Verified Users",
    not_verified: "Not Verified Users"
};

function labelForAction(action){

    if(NOTIFICATION_LABELS[action]) return NOTIFICATION_LABELS[action];

    return String(action)
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

}

function formatRelativeTime(dateString){

    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);

    if(seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if(minutes < 60) return minutes + (minutes === 1 ? " minute ago" : " minutes ago");

    const hours = Math.floor(minutes / 60);
    if(hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");

    const days = Math.floor(hours / 24);
    if(days < 7) return days + (days === 1 ? " day ago" : " days ago");

    return date.toLocaleDateString();

}

function formatFullTime(dateString){

    const date = new Date(dateString);

    return date.toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

}

function escapeNotifHtml(value){

    return String(value === null || value === undefined ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

// ===============================
// MESSAGE BUILDING (short summary shown in the list + top of modal)
// ===============================

function messageForEntry(row, name){

    const meta = row.metadata || {};
    const who = name || "A user";

    switch(row.action){

        case "deposit_requested":
            return who + " requested a deposit of R" +
                Number(meta.amount_zar || 0).toFixed(2) +
                (meta.method ? " via " + labelForAction(meta.method) : "");

        case "withdrawal_requested":
            return who + " requested a withdrawal of R" +
                Number(meta.amount_zar || 0).toFixed(2) +
                (meta.method ? " via " + labelForAction(meta.method) : "");

        case "notification_sent":
            return "Sent to " +
                (AUDIENCE_LABELS[meta.audience] || meta.audience || "users") +
                " (" + (meta.recipient_count || 0) + "): " +
                (meta.title || "");

        case "password_reset_requested":
            return who + " requested a password reset.";

        case "withdrawal_pin_reset_requested":
            return who + " requested a withdrawal PIN reset.";

        case "personal_info_change_requested":
            return who + " requested to change personal information.";

        case "payment_methods_change_requested":
            return who + " requested to change payment methods.";

        case "kyc_verification_requested":
            return who + " submitted KYC verification documents.";

        case "kyc_resubmission_requested":
            return who + " requested to resubmit KYC verification.";

        case "unblock_requested":
            return who + " requested account reactivation.";

        case "support_message_received":
            return who + ": " + (meta.preview || "sent you a message") +
                (Number(meta.count) > 1 ? " (" + meta.count + " new messages)" : "");

        default:
            return labelForAction(row.action);

    }

}

// ===============================
// DETAIL ROWS (full breakdown shown in the View modal)
// ===============================

function detailRowsForEntry(entry){

    const meta = entry.metadata || {};
    const rows = [];

    if(entry.action === "notification_sent"){

        rows.push({ label: "Sent by", value: "You (Admin)" });
        rows.push({ label: "Audience", value: AUDIENCE_LABELS[meta.audience] || meta.audience || "—" });
        rows.push({ label: "Recipients", value: String(meta.recipient_count || 0) });
        rows.push({ label: "Title", value: meta.title || "—" });
        rows.push({ label: "Message", value: meta.body || "—" });

    } else {

        rows.push({ label: "Requested by", value: entry.requesterName || "Unknown user" });

        if(entry.action === "deposit_requested"){
            rows.push({ label: "Amount", value: "R" + Number(meta.amount_zar || 0).toFixed(2) });
            if(meta.method) rows.push({ label: "Method", value: labelForAction(meta.method) });
        }

        if(entry.action === "withdrawal_requested"){
            rows.push({ label: "Amount", value: "R" + Number(meta.amount_zar || 0).toFixed(2) });
            if(meta.method) rows.push({ label: "Method", value: labelForAction(meta.method) });
        }

        if(entry.action === "kyc_verification_requested" && meta.country){
            rows.push({ label: "Country", value: meta.country });
        }

        if(entry.action === "support_message_received"){
            rows.push({ label: "Latest message", value: meta.preview || "—" });
            rows.push({ label: "New messages", value: String(meta.count || 1) });
        }

    }

    rows.push({ label: "Submitted", value: entry.fullTime });

    return rows;

}

function renderNotificationDetail(entry){

    const container = document.getElementById("notificationDetails");

    if(!entry){
        container.innerHTML = "<p>This notification could not be found.</p>";
        return;
    }

    const rowsHtml = detailRowsForEntry(entry)
        .map(r =>
            "<div class=\"notif-detail-row\">" +
                "<span>" + escapeNotifHtml(r.label) + "</span>" +
                "<strong>" + escapeNotifHtml(r.value) + "</strong>" +
            "</div>"
        )
        .join("");

    container.innerHTML =
        "<div class=\"notif-detail\">" +

            "<div class=\"notif-detail-head\">" +
                "<div class=\"notif-detail-icon\"><i class=\"" + entry.icon + "\"></i></div>" +
                "<div>" +
                    "<h4>" + escapeNotifHtml(entry.title) + "</h4>" +
                    "<span class=\"notif-status-badge " + entry.status + "\" id=\"notifDetailStatusBadge\">" +
                        (entry.status === "unread" ? "Unread" : "Read") +
                    "</span>" +
                "</div>" +
            "</div>" +

            "<p class=\"notif-detail-message\">" + escapeNotifHtml(entry.message) + "</p>" +

            "<div class=\"notif-detail-grid\">" + rowsHtml + "</div>" +

        "</div>";

}

// ===============================
// LOAD REQUEST-EVENT FEED FROM SUPABASE
// ===============================

function loadNotifications(){

    sb.from("activity_log")
        .select("*")
        .eq("category", "REQUESTS")
        .order("created_at", { ascending: false })
        .limit(100)

        .then(({ data, error }) => {

            if(error){
                console.error("Failed to load notifications:", error);
                return;
            }

            const rows = data || [];

            // notification_sent rows are logged against the admin, not a
            // requesting user — only look up names for rows that have one.
            const userIds = [...new Set(
                rows
                    .filter(r => r.action !== "notification_sent" && r.actor_id)
                    .map(r => r.actor_id)
            )];

            if(userIds.length === 0){
                buildNotificationsData(rows, {});
                return;
            }

            sb.from("profiles")
                .select("id, username, surname")
                .in("id", userIds)

                .then(({ data: profileRows, error: profileError }) => {

                    if(profileError){
                        console.error("Failed to load requester names:", profileError);
                    }

                    const names = {};

                    (profileRows || []).forEach(p => {
                        names[p.id] = (p.username + " " + (p.surname || "")).trim();
                    });

                    buildNotificationsData(rows, names);

                });

        });

}

function buildNotificationsData(rows, names){

    notificationsData = rows.map(row => {

        const name = names[row.actor_id] || null;

        return {
            id: row.id,
            action: row.action,
            metadata: row.metadata || {},
            icon: NOTIFICATION_ICONS[row.action] || "fa-solid fa-bell",
            title: labelForAction(row.action),
            message: messageForEntry(row, name),
            requesterName: name,
            time: formatRelativeTime(row.created_at),
            fullTime: formatFullTime(row.created_at),
            status: row.is_read ? "read" : "unread"
        };

    });

    renderNotifications();

    updateNotificationStats();

    showNotificationTab(currentNotificationTab);

}

function renderNotifications(){

    const list = document.getElementById("notificationList");

    list.innerHTML = "";

    notificationsData.forEach(entry=>{

        const row = document.createElement("div");

        row.className = "notification-row " + entry.status;
row.dataset.id = entry.id;

row.dataset.search = [
    entry.requesterName,
    entry.title,
    entry.fullTime
]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

        row.innerHTML =
        "<div class=\"notification-icon\">" +
            "<i class=\"" + entry.icon + "\"></i>" +
        "</div>" +

        "<div class=\"notification-content\">" +
            "<h4>" + escapeNotifHtml(entry.title) + "</h4>" +
            "<p>" + escapeNotifHtml(entry.message) + "</p>" +
            "<small>" + entry.time + "</small>" +
        "</div>" +

        "<button onclick=\"viewNotification(this)\">" +
            "View" +
        "</button>";

        list.appendChild(row);

    });

}


function initNotifications(){

    loadNotifications();

    if(window.KTRealtime){
        KTRealtime.register("notifications", ["activity_log"], loadNotifications);
    }

    document.querySelectorAll(".tab-btn")
    .forEach(btn=>{
        btn.classList.remove("active");
    });

    const firstTab = document.querySelector(".tab-btn");

    if(firstTab){
        firstTab.classList.add("active");
    }

    currentNotificationTab = "all";
    currentNotificationTabButton = firstTab || null;

    // ===============================
    // NOTIFICATION SEARCH
    // ===============================

    const notificationSearch =
        document.getElementById("notificationSearch");

    if(notificationSearch){

        notificationSearch.addEventListener("input", function(){

            showNotificationTab(
                currentNotificationTab,
                currentNotificationTabButton
            );

        });

    }

    showNotificationTab("all", firstTab);

}


function updateNotificationStats(){

    const total = document.querySelectorAll(".notification-row").length;

    const unread = document.querySelectorAll(".notification-row.unread").length;

    const read = document.querySelectorAll(".notification-row.read").length;

    document.getElementById("totalNotifications").innerHTML = total;

    document.getElementById("unreadNotifications").innerHTML = unread;

    document.getElementById("readNotifications").innerHTML = read;

}


function showNotificationTab(type,button){

    currentNotificationTab = type;

    if(button){
        currentNotificationTabButton = button;
    }

    document.querySelectorAll(".tab-btn")
    .forEach(btn=>{
        btn.classList.remove("active");
    });

    if(button){
        button.classList.add("active");
    }
    else if(currentNotificationTabButton){
        currentNotificationTabButton.classList.add("active");
    }
    else if(type==="all"){
        document.querySelector(".tab-btn").classList.add("active");
    }

    document.querySelectorAll(".notification-row")
.forEach(row => {

    const searchInput =
        document.getElementById("notificationSearch");

    const searchTerm =
        searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";

    const matchesSearch =
        !searchTerm ||
        (row.dataset.search || "").includes(searchTerm);

    const matchesTab =
        type === "all" ||
        row.classList.contains(type);

    row.style.display =
        matchesSearch && matchesTab
            ? "flex"
            : "none";

    });

    KTUI.syncBlockEmpty(
        document.getElementById("notificationList"),
        function(){

            const box = document.getElementById("notificationSearch");
            const searching = !!(box && box.value.trim());
            const hasAny = document.querySelector("#notificationList .notification-row") !== null;

            if(searching && hasAny) return "No notifications match your search.";
            if(type === "unread") return "No unread notifications.";
            if(type === "read") return "No read notifications.";

            return "No notifications yet.";

        },
        "fa-regular fa-bell"
    );

}



// ===============================
// VIEW (renders a full detail card, marks read on open —
// real, updates activity_log.is_read)
// ===============================

function viewNotification(button){

    const row = button.parentElement;

    selectedNotification = row;
    selectedNotificationId = row.dataset.id;

    const entry = notificationsData.find(e => String(e.id) === String(selectedNotificationId));

    renderNotificationDetail(entry);

    document.getElementById("notificationModal").style.display="flex";

    if(row.classList.contains("unread")){

        sb.from("activity_log")
            .update({ is_read: true })
            .eq("id", selectedNotificationId)

            .then(({ error }) => {

                if(error){
                    console.error("Failed to mark as read:", error);
                    return;
                }

                row.classList.remove("unread");
                row.classList.add("read");

                if(entry) entry.status = "read";

                const badge = document.getElementById("notifDetailStatusBadge");

                if(badge){
                    badge.classList.remove("unread");
                    badge.classList.add("read");
                    badge.textContent = "Read";
                }

                updateNotificationStats();

            });

    }

}


function closeNotificationModal(){
    document.getElementById("notificationModal").style.display="none";
}


// ===============================
// MARK UNREAD (real — updates activity_log.is_read)
// Viewing a notification already marks it read, so this button only
// ever needs to do one thing: put it back to unread.
// ===============================

// Finds the on-page button that calls the given handler (so the loading
// state lands on the exact button the admin pressed).
function notificationActionButton(handlerName){

    return document.querySelector('#notificationModal [onclick*="' + handlerName + '"], #deleteConfirmModal [onclick*="' + handlerName + '"]');

}

function markNotificationUnread(){

    if(!selectedNotificationId) return;

    const done = KTUI.busy(notificationActionButton("markNotificationUnread"), "Updating...");

    sb.from("activity_log")
        .update({ is_read: false })
        .eq("id", selectedNotificationId)

        .then(({ error }) => {

            done();

            if(error){
                KTUI.notify("Failed to update: " + error.message);
                return;
            }

            closeNotificationModal();

            KTUI.success("Marked as unread.");

            loadNotifications();

        });

}


function deleteNotification(){
    document.getElementById("deleteConfirmModal").style.display="flex";
}


function closeDeleteConfirmModal(){
    document.getElementById("deleteConfirmModal").style.display="none";
}


// ===============================
// DELETE (real — removes the activity_log row)
// ===============================

function confirmDeleteNotification(){

    if(!selectedNotificationId){
        closeDeleteConfirmModal();
        return;
    }

    const done = KTUI.busy(notificationActionButton("confirmDeleteNotification"), "Deleting...");

    sb.from("activity_log").delete().eq("id", selectedNotificationId)

        .then(({ error }) => {

            done();

            closeDeleteConfirmModal();
            closeNotificationModal();

            if(error){
                KTUI.notify("Failed to delete: " + error.message);
                return;
            }

            KTUI.success("Notification deleted.");

            loadNotifications();

        });

}


function openNotificationModal(){
    document.getElementById("sendNotificationModal").style.display="flex";
}


function closeSendNotificationModal(){
    document.getElementById("sendNotificationModal").style.display="none";
}


// ===============================
// SEND NOTIFICATION (real — via admin_send_notification RPC,
// resolves audience to real recipients and inserts one row per user)
// ===============================

function sendNotification(){

    const title = document.getElementById("notificationTitle").value.trim();

    const message = document.getElementById("notificationMessage").value.trim();

    const audience = document.getElementById("notificationAudience").value;

    if(title==="" || message===""){
        KTUI.notify("Please complete all fields.");
        return;
    }

    const sendBtn = document.querySelector(".send-notif-btn");

    const done = KTUI.busy(sendBtn, "Sending...");

    sb.rpc("admin_send_notification", {
        p_title: title,
        p_body: message,
        p_audience: audience
    })

        .then(({ data, error }) => {

            done();

            if(error){
                KTUI.notify("Failed to send notification: " + error.message);
                return;
            }

            const count = Number(data || 0);

            KTUI.notify("Notification sent to " + count + (count === 1 ? " user." : " users."));

            document.getElementById("notificationTitle").value="";
            document.getElementById("notificationMessage").value="";

            closeSendNotificationModal();

            loadNotifications();

        });

}

/* ===== js/activity-details.js ===== */
// =========================================================
// ACTIVITY DETAILS MODAL
// Shows only the details that matter for each kind of activity:
//   summary sentence -> category section(s) -> performed by ->
//   device & location (only when recorded) -> technical info (collapsed)
// Sensitive columns are never displayed, even for older records.
// Depends on helpers from activity-log.js and the global `sb`.
// =========================================================

(function(){

    var SENSITIVE_KEYS = [
        "withdrawal_pin_hash", "temp_password_display",
        "id_front_url", "id_back_url", "selfie_url", "proof_url"
    ];

    var lookupCache = {};
    var openToken = 0;

    // ---------------------------------------------------------
    // Small helpers
    // ---------------------------------------------------------

    function esc(value){
        if(value === null || value === undefined) return "";
        return String(value)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function blank(v){
        return v === null || v === undefined || v === "";
    }

    function isObj(v){
        return v && typeof v === "object" && !Array.isArray(v);
    }

    function money(v){
        var n = Number(v);
        if(blank(v) || isNaN(n)) return null;
        return "R" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function plain(v){
        var n = Number(v);
        if(blank(v) || isNaN(n)) return blank(v) ? null : String(v);
        return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
    }

    function words(v){
        if(blank(v)) return null;
        var s = String(v).replace(/_/g, " ").trim();
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function when(v){
        if(blank(v)) return null;
        return (typeof formatActivityDateTime === "function")
            ? formatActivityDateTime(v)
            : new Date(v).toLocaleString();
    }

    function span(a, b){
        var ms = new Date(b).getTime() - new Date(a).getTime();
        if(isNaN(ms) || ms < 0) return null;
        var min = Math.round(ms / 60000);
        if(min < 1) return "under a minute";
        if(min < 60) return min + " min";
        var h = Math.floor(min / 60);
        if(h < 24) return h + " h" + (min % 60 ? " " + (min % 60) + " min" : "");
        var d = Math.floor(h / 24);
        return d + (d === 1 ? " day" : " days");
    }

    function maskTail(v, keep){
        if(blank(v)) return null;
        var s = String(v);
        if(/^\*+/.test(s) || s.indexOf("\u2022") !== -1) return s;      // already masked
        return "****" + s.slice(-(keep || 4));
    }

    function personName(p){
        if(!p) return null;
        var n = ((p.username || "") + " " + (p.surname || "")).trim();
        return n || null;
    }

    function scrubDeep(value){
        if(Array.isArray(value)) return value.map(scrubDeep);
        if(!isObj(value)) return value;
        var out = {};
        Object.keys(value).forEach(function(k){
            if(SENSITIVE_KEYS.indexOf(k) !== -1) return;
            if(k === "id_number") { out[k] = maskTail(value[k], 4); return; }
            out[k] = scrubDeep(value[k]);
        });
        return out;
    }

    // ---------------------------------------------------------
    // Device / browser from a user-agent string
    // ---------------------------------------------------------

    function parseUA(ua){
        if(!ua) return { browser: null, os: null };
        var os = /Android\s*([\d.]+)?/i.exec(ua);
        var osName = null;
        if(os) osName = "Android" + (os[1] ? " " + os[1] : "");
        else if(/iPhone|iPad|iPod/i.test(ua)){
            var iv = /OS\s+([\d_]+)/i.exec(ua);
            osName = "iOS" + (iv ? " " + iv[1].replace(/_/g, ".") : "");
        }
        else if(/Windows/i.test(ua)) osName = "Windows";
        else if(/Mac OS/i.test(ua)) osName = "macOS";
        else if(/CrOS/i.test(ua)) osName = "ChromeOS";
        else if(/Linux/i.test(ua)) osName = "Linux";

        var browser = /Edg/i.test(ua) ? "Edge"
            : /OPR|Opera/i.test(ua) ? "Opera"
            : /SamsungBrowser/i.test(ua) ? "Samsung Internet"
            : /Firefox|FxiOS/i.test(ua) ? "Firefox"
            : /Chrome|CriOS/i.test(ua) ? "Chrome"
            : /Safari/i.test(ua) ? "Safari" : null;

        return { browser: browser, os: osName };
    }

    function deviceText(entry){
        var p = parseUA(entry.user_agent);
        var dev = entry.device_name || null;
        if(!dev && p.browser) dev = p.browser;
        var os = null;
        if(entry.os_name) os = entry.os_name + (entry.os_version ? " " + entry.os_version : "");
        else os = p.os;
        return { device: dev, os: os, browser: p.browser };
    }

    // ---------------------------------------------------------
    // Building blocks
    // ---------------------------------------------------------

    // row("Label", "text")  or  row("Label", {html:"..."}) ; empty values are skipped
    function row(label, value){
        if(value === null || value === undefined || value === "") return "";
        var inner = (isObj(value) && value.html !== undefined) ? value.html : esc(value);
        return '<div class="activity-detail-row">' +
            '<span class="activity-detail-label">' + esc(label) + '</span>' +
            '<span class="activity-detail-value">' + inner + '</span></div>';
    }

    function chip(text, tone){
        return '<span class="activity-chip ' + (tone || "neutral") + '">' + esc(text) + '</span>';
    }

    function statusChip(status){
        var s = String(status || "").toLowerCase();
        var tone = s === "approved" || s === "completed" || s === "active" ? "good"
            : s === "rejected" || s === "blocked" ? "bad"
            : s === "pending" ? "warn" : "neutral";
        return chip(words(status) || "—", tone);
    }

    function change(label, oldText, newText, extraHtml){
        if(blank(oldText) && blank(newText)) return "";
        return '<div class="activity-detail-row">' +
            '<span class="activity-detail-label">' + esc(label) + '</span>' +
            '<span class="activity-detail-value activity-change-inline">' +
                '<span class="activity-old">' + esc(blank(oldText) ? "—" : oldText) + '</span>' +
                '<i class="fa-solid fa-arrow-right"></i>' +
                '<span class="activity-new">' + esc(blank(newText) ? "—" : newText) + '</span>' +
                (extraHtml || "") +
            '</span></div>';
    }

    function percentChip(oldV, newV){
        var a = Number(oldV), b = Number(newV);
        if(isNaN(a) || isNaN(b) || a === 0 || a === b) return "";
        var pct = ((b - a) / Math.abs(a)) * 100;
        var txt = (pct > 0 ? "+" : "") + (Math.round(pct * 100) / 100) + "%";
        return chip(txt, "warn");
    }

    function section(title, icon, rows){
        var body = Array.isArray(rows) ? rows.join("") : rows;
        if(!body || !String(body).trim()) return "";
        return '<div class="activity-detail-section">' +
            '<div class="activity-detail-section-title"><i class="' + icon + '"></i> ' + esc(title) + '</div>' +
            body + '</div>';
    }

    function note(text){
        return text ? '<div class="activity-detail-note">' + esc(text) + '</div>' : "";
    }

    // ---------------------------------------------------------
    // Context (names that are not stored in the log row)
    // ---------------------------------------------------------

    function metaParts(entry){
        var m = isObj(entry.metadata) ? entry.metadata : {};
        return {
            meta: m,
            before: isObj(m.before) ? m.before : {},
            after: isObj(m.after) ? m.after : {}
        };
    }

    function subjectUserId(entry){
        var p = metaParts(entry);
        var t = String(entry.target_table || "");
        if(t === "profiles") return entry.target_id || p.after.id || p.before.id || null;
        return p.after.user_id || p.before.user_id || null;
    }

    function cachedFetch(key, fn){
        if(lookupCache[key]) return lookupCache[key];
        lookupCache[key] = Promise.resolve().then(fn).catch(function(){ return null; });
        return lookupCache[key];
    }

    function loadContext(entry){
        var p = metaParts(entry);
        var userId = subjectUserId(entry);
        var planIds = [];
        [p.before.plan_id, p.after.plan_id].forEach(function(id){
            if(id && planIds.indexOf(id) === -1) planIds.push(id);
        });
        var pmId = p.after.payment_method_id || p.before.payment_method_id || null;

        var jobs = [
            userId ? cachedFetch("u:" + userId, function(){
                return sb.from("profiles")
                    .select("username, surname, phone, email, country")
                    .eq("id", userId).maybeSingle()
                    .then(function(r){ return r.data || null; });
            }) : Promise.resolve(null),

            planIds.length ? cachedFetch("p:" + planIds.join(","), function(){
                return sb.from("plans").select("id, name").in("id", planIds)
                    .then(function(r){ return r.data || []; });
            }) : Promise.resolve(null),

            pmId ? cachedFetch("pm:" + pmId, function(){
                return sb.from("payment_methods").select("method, account_details")
                    .eq("id", pmId).maybeSingle()
                    .then(function(r){ return r.data || null; });
            }) : Promise.resolve(null)
        ];

        return Promise.all(jobs).then(function(res){
            var plans = {};
            (res[1] || []).forEach(function(pl){ plans[pl.id] = pl.name; });
            return { user: res[0], plans: plans, payment: res[2] };
        });
    }

    // ---------------------------------------------------------
    // Shared sections
    // ---------------------------------------------------------

    function adminOf(entry){
        var prof = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
        return {
            name: (typeof getActorName === "function") ? getActorName(entry) : "Admin",
            email: prof && prof.email ? prof.email : null,
            phone: (typeof getActorPhone === "function") ? getActorPhone(entry) : null,
            profile: prof || null
        };
    }

    function performedBy(entry){
        var a = adminOf(entry);
        var type = String(entry.actor_type || "").toLowerCase();
        if(type === "system" && !entry.actor_id){
            return section("Recorded by", "fa-solid fa-user-shield", row("Source", "System"));
        }
        return section("Performed by", "fa-solid fa-user-shield", [
            row("Name", a.name),
            row("Role", type ? words(type) : null),
            row("Email", a.email),
            row("Phone", a.phone)
        ]);
    }

    function deviceSection(entry, title){
        var d = deviceText(entry);
        return section(title || "Device and location", "fa-solid fa-location-dot", [
            row("Device", d.device),
            row("Operating system", d.os),
            row("IP address", entry.ip_address),
            row("Location", entry.approximate_location)
        ]);
    }

    function userRows(ctx, snapshot){
        var u = ctx.user || snapshot || null;
        var name = personName(u);
        var contact = u ? [u.phone, u.email].filter(Boolean).join(" \u00b7 ") : "";
        if(!name && !contact){
            return row("User", ctx.user === null && !snapshot ? "Deleted or unknown user" : null);
        }
        return row("User", name || "Unknown") + row("Contact", contact || null);
    }

    function technical(entry, extraRows){
        var meta = scrubDeep(entry.metadata);
        var rawBlock = "";
        if(meta && typeof meta === "object" && Object.keys(meta).length){
            rawBlock = '<div class="activity-detail-block">' +
                '<div class="activity-detail-block-label">Full record</div>' +
                '<pre class="activity-detail-code">' + esc(JSON.stringify(meta, null, 2)) + '</pre></div>';
        }
        return '<details class="activity-tech"><summary><i class="fa-solid fa-chevron-down"></i> Technical info</summary>' +
            '<div class="activity-tech-body">' +
            row("Activity ID", entry.id) +
            row("Action code", entry.action) +
            row("Target", entry.target_type || entry.target_table) +
            row("Target ID", entry.target_id) +
            (extraRows || "") +
            row("Session ID", entry.session_id) +
            row("Device ID", entry.device_id) +
            row("User agent", entry.user_agent) +
            rawBlock +
            '</div></details>';
    }

    // ---------------------------------------------------------
    // Renderers  ->  { summary, body }
    // ---------------------------------------------------------

    var LOGIN_FLAGS = [["new_device", "New device"], ["new_ip", "New IP address"], ["new_location", "New location"]];

    function renderLogin(entry){
        var a = adminOf(entry), m = metaParts(entry).meta;
        if(entry.action === "logout"){
            return {
                summary: a.name + " signed out of the admin app.",
                body: performedBy(entry) + deviceSection(entry)
            };
        }
        var flags = LOGIN_FLAGS.filter(function(f){ return m[f[0]] === true; })
            .map(function(f){ return chip(f[1], "warn"); });
        if(m.is_first_login === true) flags.unshift(chip("First sign-in", "neutral"));
        return {
            summary: a.name + " signed in to the admin app.",
            body: performedBy(entry) +
                section("Sign-in", "fa-solid fa-right-to-bracket", [
                    row("Result", resultLabelSafe(entry)),
                    flags.length ? row("Flags", { html: flags.join(" ") }) : ""
                ]) +
                deviceSection(entry)
        };
    }

    function failedBurst(entry, all){
        if(!entry.ip_address || !Array.isArray(all)) return null;
        var t = new Date(entry.created_at).getTime();
        var n = all.filter(function(e){
            if(e.action !== "failed_login" || e.ip_address !== entry.ip_address) return false;
            var x = new Date(e.created_at).getTime();
            return x <= t && t - x <= 3600000;
        }).length;
        return n >= 2 ? n + " failed attempts from this IP within 1 hour" : null;
    }

    function renderSecurity(entry, ctx, all){
        var m = metaParts(entry).meta, a = adminOf(entry), d = deviceText(entry);

        if(entry.action === "settings_password_created" || entry.action === "settings_password_changed"){
            var created = entry.action === "settings_password_created";
            return {
                summary: a.name + (created ? " created" : " changed") + " their settings password.",
                body: section("Settings password", "fa-solid fa-key", [
                    row("Action", created ? "Password created" : "Password changed"),
                    row("Result", resultLabelSafe(entry))
                ]) + note("The password itself is never recorded.") +
                    performedBy(entry) + deviceSection(entry, "Performed from")
            };
        }

        if(entry.action === "failed_login"){
            var burst = failedBurst(entry, all);
            return {
                summary: "Someone tried to sign in to the admin app and was turned away.",
                body: section("Attempt", "fa-solid fa-triangle-exclamation", [
                    row("Account tried", entry.identifier_masked),
                    row("Reason", m.reason),
                    burst ? row("Pattern", { html: chip(burst, "warn") }) : ""
                ]) + deviceSection(entry)
            };
        }
        if(entry.action === "new_device_login"){
            return {
                summary: a.name + " signed in from a device not seen before.",
                body: performedBy(entry) +
                    section("New device", "fa-solid fa-mobile-screen", [
                        change("Device", m.previous_device_name, m.current_device_name || d.device),
                        row("Operating system", d.os)
                    ]) + deviceSection(entry, "Where it came from")
            };
        }
        if(entry.action === "new_ip_login"){
            return {
                summary: a.name + " signed in from a new IP address.",
                body: performedBy(entry) +
                    section("New IP address", "fa-solid fa-network-wired", change("IP address", m.previous_ip, m.current_ip || entry.ip_address)) +
                    deviceSection(entry, "Device and location")
            };
        }
        if(entry.action === "new_location_login"){
            return {
                summary: a.name + " signed in from a new location.",
                body: performedBy(entry) +
                    section("New location", "fa-solid fa-earth-africa", change("Location", m.previous_location, m.current_location || entry.approximate_location)) +
                    deviceSection(entry, "Device and network")
            };
        }
        // non_admin_login: the "actor" is the person who tried
        return {
            summary: a.name + " signed in correctly but does not have admin access.",
            body: section("Account", "fa-solid fa-user", [
                row("Name", a.name), row("Email", a.email), row("Phone", a.phone)
            ]) + section("Outcome", "fa-solid fa-ban", [
                row("Sign-in", m.authentication_succeeded === false ? "Failed" : "Succeeded"),
                row("Admin access", { html: chip("Denied", "bad") })
            ]) + deviceSection(entry)
        };
    }

    function pairText(row_){
        var f = row_.from_currency, t = row_.to_currency;
        return (f && t) ? f + " \u2192 " + t : null;
    }

    var PLAN_FIELDS = [
        ["name", "Name", function(v){ return blank(v) ? null : String(v); }],
        ["price_zar", "Price", money],
        ["duration_days", "Duration", function(v){ return blank(v) ? null : v + " days"; }],
        ["daily_payout_zar", "Daily payout", money],
        ["hash_power", "Hash power", function(v){ return blank(v) ? null : String(v); }],
        ["sort_order", "Display order", function(v){ return blank(v) ? null : "#" + v; }],
        ["is_active", "Status", function(v){ return v === true ? "Active" : v === false ? "Inactive" : null; }]
    ];

    function planSnapshot(src){
        return PLAN_FIELDS.map(function(f){ return row(f[1], f[2](src[f[0]])); });
    }

    function renderChanges(entry, ctx){
        var p = metaParts(entry), a = adminOf(entry), act = entry.action;
        var b = p.before, af = p.after;

        if(act === "audit_records_deleted"){
            var m = p.meta;
            var older = m.scope === "older";
            return {
                summary: a.name + " deleted " + (m.deleted != null ? m.deleted : "some") + " audit record" + (Number(m.deleted) === 1 ? "" : "s") + ".",
                body: section("Audit records deleted", "fa-solid fa-trash-can", [
                    row("Records deleted", plain(m.deleted)),
                    row("Which records", (older ? "Older than " : "From the last ") + (m.days || "?") + " days"),
                    row("Cut-off", when(m.cutoff))
                ]) + note("Only the audit was affected. Deposits, withdrawals, wallets and other pages were not changed.") +
                    performedBy(entry) + deviceSection(entry, "Performed from")
            };
        }

        if(act.indexOf("exchange_rate_") === 0){
            var src = Object.keys(af).length ? af : b;
            var pair = pairText(src) || "a currency pair";
            if(act === "exchange_rate_updated"){
                return {
                    summary: a.name + " changed the " + pair + " exchange rate.",
                    body: section("Exchange rate", "fa-solid fa-money-bill-transfer", [
                        row("Pair", pairText(src)),
                        change("Rate", plain(b.rate), plain(af.rate), percentChip(b.rate, af.rate))
                    ]) + performedBy(entry) + deviceSection(entry, "Performed from")
                };
            }
            var added = act === "exchange_rate_added";
            return {
                summary: a.name + (added ? " added the " : " deleted the ") + pair + " exchange rate.",
                body: section("Exchange rate", "fa-solid fa-money-bill-transfer", [
                    row("Pair", pairText(src)),
                    row(added ? "Rate" : "Last rate", plain(src.rate))
                ]) + performedBy(entry) + deviceSection(entry, "Performed from")
            };
        }

        if(act.indexOf("mining_plan_") === 0){
            var snap = Object.keys(af).length ? af : b;
            var nm = snap.name || "a";
            if(act === "mining_plan_updated"){
                var rows = [], changed = 0, same = [];
                PLAN_FIELDS.forEach(function(f){
                    var ov = f[2](b[f[0]]), nv = f[2](af[f[0]]);
                    if(String(b[f[0]]) !== String(af[f[0]])){
                        changed++;
                        var extra = (f[0] === "price_zar" || f[0] === "daily_payout_zar") ? percentChip(b[f[0]], af[f[0]]) : "";
                        rows.push(change(f[1], ov, nv, extra));
                    } else { same.push(f[1].toLowerCase()); }
                });
                return {
                    summary: a.name + " changed " + changed + (changed === 1 ? " setting" : " settings") + " on the " + nm + " plan.",
                    body: section("What changed", "fa-solid fa-pen-to-square", rows.length ? rows : row("Changes", "No field changes recorded")) +
                        (same.length ? note(same.length + " other field" + (same.length === 1 ? "" : "s") + " unchanged: " + same.join(", ") + ".") : "") +
                        section("Plan", "fa-solid fa-layer-group", [row("Name", af.name || b.name), row("Status", PLAN_FIELDS[6][2](af.is_active))]) +
                        performedBy(entry) + deviceSection(entry, "Performed from")
                };
            }
            if(act === "mining_plan_activated" || act === "mining_plan_deactivated"){
                var on = act === "mining_plan_activated";
                return {
                    summary: a.name + (on ? " activated" : " deactivated") + " the " + nm + " plan.",
                    body: section("Plan", "fa-solid fa-layer-group", [
                        row("Name", nm), change("Status", on ? "Inactive" : "Active", on ? "Active" : "Inactive")
                    ]) + performedBy(entry) + deviceSection(entry, "Performed from")
                };
            }
            var created = act === "mining_plan_created";
            return {
                summary: a.name + (created ? " created the " : " deleted the ") + nm + " plan.",
                body: section("Plan details", "fa-solid fa-layer-group", planSnapshot(snap)) +
                    performedBy(entry) + deviceSection(entry, "Performed from")
            };
        }

        // role assigned / changed / removed (admin_role_* and user_role_*)
        var who = personName(ctx.user) || "a user";
        var oldRole = words(b.role) || "None";
        var newRole = words(af.role) || "None";
        var verb;
        if(/_assigned$/.test(act)){
            oldRole = "None";
            newRole = words(af.role) || words(b.role) || "Admin";
            verb = " gave the " + newRole.toLowerCase() + " role to ";
        } else if(/_removed$/.test(act)){
            newRole = "None";
            oldRole = words(b.role) || words(af.role) || "Admin";
            verb = " removed the " + oldRole.toLowerCase() + " role from ";
        } else {
            verb = " changed the role of ";
        }
        return {
            summary: a.name + verb + who + ".",
            body: section("Role change", "fa-solid fa-user-gear", [
                userRows(ctx, null),
                change("Role", oldRole, newRole)
            ]) + performedBy(entry) + deviceSection(entry, "Performed from")
        };
    }

    var BONUS_ACTIONS = ["bonus_added", "add_bonus", "admin_bonus", "bonus_created"];
    var CREDIT_ACTIONS = ["balance_credited", "wallet_credited"];

    function renderTransactions(entry, ctx){
        var p = metaParts(entry), a = adminOf(entry), act = entry.action;
        var b = p.before, af = p.after;
        var userName = personName(ctx.user) || "the user";

        if(act.indexOf("deposit_") === 0 || act.indexOf("withdrawal_") === 0){
            var isDep = act.indexOf("deposit_") === 0;
            var approved = /_approved$/.test(act);
            var amount = money(af.amount_zar != null ? af.amount_zar : b.amount_zar);
            var rejectedNote = (!approved && af.admin_note) ? "Reason" : "Admin note";
            var pm = ctx.payment;
            var pmText = pm ? [words(pm.method), pm.account_details ? "(" + maskTail(String(pm.account_details).replace(/\s+/g, ""), 4) + ")" : ""].filter(Boolean).join(" ") : null;
            var rows = [
                userRows(ctx, null),
                row("Amount", amount),
                isDep ? row("Method", words(af.method || b.method)) : row("Payment method", pmText),
                isDep ? row("Reference", af.transaction_ref || b.transaction_ref) : "",
                change("Status", words(b.status) || "Pending", words(af.status || (approved ? "approved" : "rejected"))),
                row("Submitted", when(b.created_at || af.created_at)),
                row("Reviewed", when(af.reviewed_at)),
                row("Reviewed after", (b.created_at || af.created_at) && af.reviewed_at ? span(b.created_at || af.created_at, af.reviewed_at) : null),
                row(rejectedNote, af.admin_note || null)
            ];
            return {
                summary: a.name + (approved ? " approved a " : " rejected a ") + (isDep ? "deposit" : "withdrawal") +
                    (amount ? " of " + amount : "") + " for " + userName + ".",
                body: section(isDep ? "Deposit" : "Withdrawal", isDep ? "fa-solid fa-arrow-down-to-bracket" : "fa-solid fa-arrow-up-from-bracket", rows) +
                    performedBy(entry) + deviceSection(entry, "Performed from")
            };
        }

        // wallet credit / debit / bonus (a row in `transactions`)
        var desc = String(af.description || "");
        var isBonus = BONUS_ACTIONS.indexOf(act) !== -1 || /bonus/i.test(desc);
        var isCredit = isBonus || CREDIT_ACTIONS.indexOf(act) !== -1 || af.type === "admin_credit";
        var amt = Number(af.amount_zar);
        var after = Number(af.balance_after_zar);
        var beforeBal = (!isNaN(amt) && !isNaN(after)) ? (isCredit ? after - amt : after + amt) : null;
        var kind = isBonus ? "Bonus" : (isCredit ? "Credit" : "Debit");
        return {
            summary: a.name + (isBonus ? " added a bonus of " : isCredit ? " credited " : " debited ") +
                (money(af.amount_zar) || "an amount") + (isCredit ? " to " : " from ") + userName + (isCredit && !isBonus ? "'s balance." : isBonus ? "." : "'s balance."),
            body: section("Balance change", "fa-solid fa-wallet", [
                userRows(ctx, null),
                row("Type", kind),
                row("Amount", money(af.amount_zar)),
                beforeBal !== null ? change("Balance", money(beforeBal), money(after)) : row("Balance after", money(after)),
                row("Note", desc || null)
            ]) + performedBy(entry) + deviceSection(entry, "Performed from")
        };
    }

    var REQUEST_KIND = { password: "Forgot password", pin: "Withdrawal PIN reset", kyc: "KYC resubmission", unblock: "Account reactivation" };

    function renderUsers(entry, ctx){
        var p = metaParts(entry), a = adminOf(entry), act = entry.action;
        var b = p.before, af = p.after;
        var userName = personName(ctx.user) || personName(b) || "the user";
        var snapshot = Object.keys(b).length ? b : null;

        // --- password / PIN / KYC-resubmission requests
        var reqMatch = /^(password_reset|reset_password|pin_reset|reset_pin|withdrawal_pin_reset|kyc_resubmission)(_(completed|rejected))?$/.exec(act);
        if(reqMatch){
            var kind = /password/.test(reqMatch[1]) ? "password" : /pin/.test(reqMatch[1]) ? "pin" : "kyc";
            var rejected = reqMatch[3] === "rejected";
            var req = Object.keys(b).length ? b : af;
            var verb = rejected ? "rejected" : "completed";
            return {
                summary: a.name + " " + verb + " the " + (REQUEST_KIND[kind] || "request").toLowerCase() + " request from " + userName + ".",
                body: section("Request", "fa-solid fa-key", [
                    userRows(ctx, null),
                    row("Request", REQUEST_KIND[kind]),
                    row("Outcome", { html: chip(rejected ? "Rejected" : "Completed", rejected ? "bad" : "good") }),
                    row("Requested", when(req.created_at)),
                    row("Handled after", req.created_at ? span(req.created_at, entry.created_at) : null)
                ]) + note(kind === "pin" && !rejected ? "A new PIN setup was allowed for the user. The PIN itself is never recorded." :
                          kind === "password" && !rejected ? "A temporary password was issued. It is never recorded in the log." : "") +
                    performedBy(entry) + deviceSection(entry, "Performed from")
            };
        }

        // --- personal information / payment methods approvals
        var lockMatch = /^(profile_change|personal_information|payment_methods_change|payment_methods)_(approved|rejected)$/.exec(act);
        if(lockMatch){
            var isPay = lockMatch[1].indexOf("payment") === 0;
            var ok = lockMatch[2] === "approved";
            var what = isPay ? "payment methods" : "personal information";
            return {
                summary: a.name + (ok ? " approved" : " rejected") + " the request from " + userName + " to change their " + what + ".",
                body: section("Request", "fa-solid fa-user-pen", [
                    userRows(ctx, null),
                    row("Request", "Change " + what),
                    row("Outcome", { html: chip(ok ? "Approved" : "Rejected", ok ? "good" : "bad") }),
                    row("What happened", ok ? "Unlocked so the user can edit their " + what + "." : "Declined. The " + what + " stay locked.")
                ]) + performedBy(entry) + deviceSection(entry, "Performed from")
            };
        }

        // --- KYC submissions
        if(/^(kyc_approved|approved_kyc|kyc_rejected|rejected_kyc|kyc_reset|reset_kyc|kyc_reset_request|kyc_additional_documents_requested)$/.test(act)){
            var cfg = {
                approved: ["approved the identity verification of ", "Approved"],
                rejected: ["rejected the identity verification of ", "Rejected"],
                reset: ["reset the identity verification of ", "Reset to pending"],
                docs: ["asked for additional documents from ", "More documents requested"]
            };
            var key = /approved/.test(act) ? "approved" : /rejected/.test(act) ? "rejected" : /additional/.test(act) ? "docs" : "reset";
            var idn = af.id_number || b.id_number;
            return {
                summary: a.name + " " + cfg[key][0] + userName + ".",
                body: section("Verification", "fa-solid fa-id-card", [
                    userRows(ctx, null),
                    row("Country", af.country || b.country),
                    row("ID number", idn ? maskTail(idn, 4) : null),
                    key === "docs" ? row("Outcome", { html: chip(cfg[key][1], "warn") }) : change("Status", words(b.status), words(af.status)),
                    row("Admin note", af.admin_note || null),
                    row("Reviewed", when(af.reviewed_at))
                ]) + performedBy(entry) + deviceSection(entry, "Performed from")
            };
        }

        // --- block / unblock / activate
        if(act === "user_blocked" || act === "user_unblocked" || act === "user_activated"){
            var blocked = act === "user_blocked";
            return {
                summary: a.name + (blocked ? " blocked " : act === "user_activated" ? " activated " : " unblocked ") + userName + ".",
                body: section("Account status", "fa-solid fa-user-lock", [
                    userRows(ctx, null),
                    change("Status", blocked ? "Active" : "Blocked", blocked ? "Blocked" : "Active")
                ]) + performedBy(entry) + deviceSection(entry, "Performed from")
            };
        }

        // --- mining plan assigned to a user
        if(act === "user_mining_plan_changed" || act === "set_user_plan"){
            var oldPlan = ctx.plans[b.plan_id] || (b.plan_id ? "Deleted plan" : null);
            var newPlan = ctx.plans[af.plan_id] || (af.plan_id ? "Deleted plan" : null);
            return {
                summary: a.name + " changed the mining plan of " + userName + ".",
                body: section("Mining plan", "fa-solid fa-microchip", [
                    userRows(ctx, null),
                    change("Plan", oldPlan, newPlan),
                    row("Price paid", money(af.price_paid_zar)),
                    row("Started", when(af.started_at))
                ]) + performedBy(entry) + deviceSection(entry, "Performed from")
            };
        }

        // --- user deleted
        if(act === "user_deleted"){
            var nm = personName(b) || "a user";
            return {
                summary: a.name + " deleted the account of " + nm + ".",
                body: section("Deleted account", "fa-solid fa-user-xmark", [
                    row("Name", personName(b)),
                    row("Phone", b.phone),
                    row("Email", b.email),
                    row("Country", b.country),
                    row("Member since", when(b.created_at)),
                    row("VIP", b.is_vip === true ? "Yes" : null),
                    row("Blocked", b.is_blocked === true ? "Yes" : null)
                ]) + note("The account and everything linked to it (wallet, deposits, withdrawals, verification and chats) was removed.") +
                    performedBy(entry) + deviceSection(entry, "Performed from")
            };
        }

        return null;
    }

    function resultLabelSafe(entry){
        return (typeof resultLabel === "function") ? resultLabel(entry.result) : (entry.result || "—");
    }

    function renderFallback(entry, ctx){
        var a = adminOf(entry);
        return {
            summary: a.name + " \u2014 " + ((typeof labelForActivity === "function") ? labelForActivity(entry.action) : entry.action) + ".",
            body: section("Activity", "fa-solid fa-circle-info", [
                row("Action", (typeof labelForActivity === "function") ? labelForActivity(entry.action) : entry.action),
                row("Category", words(entry.category)),
                row("Result", resultLabelSafe(entry))
            ]) + performedBy(entry) + deviceSection(entry)
        };
    }

    // ---------------------------------------------------------
    // Build + open
    // ---------------------------------------------------------

    function build(entry, ctx, all){
        ctx = ctx || { user: null, plans: {}, payment: null };
        var cat = String(entry.category || "").toLowerCase();
        var out = null;

        try{
            if(cat === "login") out = renderLogin(entry);
            else if(cat === "security") out = renderSecurity(entry, ctx, all);
            else if(cat === "changes") out = renderChanges(entry, ctx);
            else if(cat === "transactions") out = renderTransactions(entry, ctx);
            else if(cat === "users") out = renderUsers(entry, ctx);
        }catch(err){
            console.warn("[ActivityDetails] renderer failed", err);
            out = null;
        }

        if(!out) out = renderFallback(entry, ctx);

        var badgeClass = (typeof resultClass === "function") ? resultClass(entry.result) : "neutral";

        return '<div class="activity-detail-summary">' +
                '<div class="activity-detail-summary-icon"><i class="' + esc(entry.icon || "fa-solid fa-circle-info") + '"></i></div>' +
                '<div class="activity-detail-summary-text"><h4>' + esc(entry.activity || "Activity") + '</h4>' +
                '<p>' + esc(when(entry.created_at)) + '</p></div>' +
                '<span class="activity-result-badge ' + esc(badgeClass) + '">' + esc(resultLabelSafe(entry)) + '</span>' +
            '</div>' +
            '<p class="activity-detail-sentence">' + esc(out.summary) + '</p>' +
            out.body +
            technical(entry);
    }

    function open(entry, all){
        var modal = document.getElementById("activityModal");
        var details = document.getElementById("activityDetails");
        var title = document.getElementById("activityModalTitle");
        var icon = document.getElementById("activityModalIcon");
        if(!modal || !details || !entry) return;

        var token = ++openToken;

        if(title) title.textContent = entry.activity || "Activity Details";
        if(icon) icon.className = entry.icon || "fa-solid fa-circle-info";

        details.innerHTML = '<div class="activity-detail-empty"><i class="fa-solid fa-spinner fa-spin"></i> Loading details...</div>';

        modal.classList.add("show");
        document.body.classList.add("activity-modal-open");

        loadContext(entry).catch(function(){ return null; }).then(function(ctx){
            if(token !== openToken) return;               // another entry was opened meanwhile
            details.innerHTML = build(entry, ctx, all);
            requestAnimationFrame(function(){ details.scrollTop = 0; });
        });
    }

    window.ActivityDetails = { open: open, build: build, _scrubDeep: scrubDeep };

})();


/* ===== js/activity-log.js ===== */
// =========================================================
// ACTIVITY LOGS
// =========================================================

let activityData = [];
let activeActivityCategory = "all";
let activitySearchValue = "";

// =========================================================
// CATEGORY / ICON MAPPING
// =========================================================

/*
 * IMPORTANT:
 * The Activity Log page intentionally displays ONLY the admin-app
 * audit actions defined below. Database trigger activity that is not
 * part of these categories is ignored by this page so user-app events
 * and unrelated database changes do not get mixed into the log.
 */

const ACTIVITY_CATEGORY = {
    // ---------------------------------------------------------
    // LOGIN — ADMIN APP ONLY
    // ---------------------------------------------------------
    successful_login: "login",
    logout: "login",

    // ---------------------------------------------------------
    // CHANGES — ADMIN APP ONLY
    // ---------------------------------------------------------
    exchange_rate_added: "changes",
    exchange_rate_updated: "changes",
    exchange_rate_deleted: "changes",
    mining_plan_created: "changes",
    mining_plan_updated: "changes",
    mining_plan_deleted: "changes",
    mining_plan_activated: "changes",
    mining_plan_deactivated: "changes",
    admin_role_assigned: "changes",
    admin_role_removed: "changes",

    
// TRANSACTIONS — ADMIN APP ONLY
// ---------------------------------------------------------
deposit_approved: "transactions",
deposit_rejected: "transactions",
withdrawal_approved: "transactions",
withdrawal_rejected: "transactions",

wallet_credited: "transactions",
wallet_debited: "transactions",

balance_credited: "transactions",
balance_debited: "transactions",

bonus_added: "transactions",
add_bonus: "transactions",
admin_bonus: "transactions",
bonus_created: "transactions",

// ---------------------------------------------------------
// USERS — ADMIN APP ONLY
// ---------------------------------------------------------
password_reset_rejected: "users",
password_reset_completed: "users",
password_reset: "users",
reset_password: "users",

pin_reset_rejected: "users",
pin_reset_completed: "users",
pin_reset: "users",
reset_pin: "users",

withdrawal_pin_reset_rejected: "users",
withdrawal_pin_reset_completed: "users",
withdrawal_pin_reset: "users",

// Personal Information
profile_change_approved: "users",
profile_change_rejected: "users",
personal_information_approved: "users",
personal_information_rejected: "users",

// Payment Methods
payment_methods_change_approved: "users",
payment_methods_change_rejected: "users",
payment_methods_approved: "users",
payment_methods_rejected: "users",

// KYC
kyc_additional_documents_requested: "users",
    settings_password_created: "security",
    settings_password_changed: "security",
    audit_records_deleted: "changes",
kyc_approved: "users",
approved_kyc: "users",
kyc_rejected: "users",
rejected_kyc: "users",
kyc_reset: "users",
reset_kyc: "users",
kyc_reset_request: "users",
kyc_resubmission_rejected: "users",
kyc_resubmission_completed: "users",

// User status
user_blocked: "users",
user_activated: "users",
user_unblocked: "users",

// Mining plan
set_user_plan: "users",
user_mining_plan_changed: "users",

user_deleted: "users",
    // ---------------------------------------------------------
    // SECURITY — ADMIN APP ONLY
    // ---------------------------------------------------------
    failed_login: "security",
    new_device_login: "security",
    new_ip_login: "security",
    new_location_login: "security",
    non_admin_login: "security"
};

const ACTIVITY_ICONS = {
    successful_login: "fa-solid fa-right-to-bracket",
    logout: "fa-solid fa-right-from-bracket",
    failed_login: "fa-solid fa-triangle-exclamation",
    new_device_login: "fa-solid fa-mobile-screen-button",
    new_ip_login: "fa-solid fa-globe",
    new_location_login: "fa-solid fa-location-dot",
    non_admin_login: "fa-solid fa-user-lock",

    exchange_rate_added: "fa-solid fa-plus-minus",
    exchange_rate_updated: "fa-solid fa-arrow-right-arrow-left",
    exchange_rate_deleted: "fa-solid fa-trash",
    mining_plan_created: "fa-solid fa-circle-plus",
    mining_plan_updated: "fa-solid fa-pen-to-square",
    mining_plan_deleted: "fa-solid fa-trash",
    mining_plan_activated: "fa-solid fa-toggle-on",
    mining_plan_deactivated: "fa-solid fa-toggle-off",
    admin_role_assigned: "fa-solid fa-user-shield",
    admin_role_removed: "fa-solid fa-user-minus",

    deposit_approved: "fa-solid fa-circle-check",
    deposit_rejected: "fa-solid fa-circle-xmark",
    withdrawal_approved: "fa-solid fa-circle-check",
    withdrawal_rejected: "fa-solid fa-circle-xmark",
    wallet_credited: "fa-solid fa-circle-plus",
    wallet_debited: "fa-solid fa-circle-minus",
    bonus_added: "fa-solid fa-gift",
    add_bonus: "fa-solid fa-gift",
    admin_bonus: "fa-solid fa-gift",
    bonus_created: "fa-solid fa-gift",

    password_reset_rejected: "fa-solid fa-key",
    password_reset_completed: "fa-solid fa-key",
    password_reset: "fa-solid fa-key",
    reset_password: "fa-solid fa-key",
    pin_reset_rejected: "fa-solid fa-key",
    pin_reset_completed: "fa-solid fa-key",
    pin_reset: "fa-solid fa-key",
    reset_pin: "fa-solid fa-key",
    withdrawal_pin_reset_rejected: "fa-solid fa-key",
    withdrawal_pin_reset_completed: "fa-solid fa-key",
    withdrawal_pin_reset: "fa-solid fa-key",
    profile_change_approved: "fa-solid fa-circle-check",
    profile_change_rejected: "fa-solid fa-circle-xmark",
    payment_methods_change_approved: "fa-solid fa-circle-check",
    payment_methods_change_rejected: "fa-solid fa-circle-xmark",
    kyc_resubmission_requested: "fa-solid fa-file-circle-question",
    kyc_approved: "fa-solid fa-id-card",
    approved_kyc: "fa-solid fa-id-card",
    kyc_rejected: "fa-solid fa-id-card-clip",
    rejected_kyc: "fa-solid fa-id-card-clip",
    kyc_reset: "fa-solid fa-rotate-left",
    reset_kyc: "fa-solid fa-rotate-left",
    kyc_reset_request: "fa-solid fa-rotate-left",
    user_blocked: "fa-solid fa-user-slash",
    user_activated: "fa-solid fa-user-check",
    set_user_plan: "fa-solid fa-chart-line",
    user_deleted: "fa-solid fa-user-minus",

balance_credited: "fa-solid fa-circle-plus",
balance_debited: "fa-solid fa-circle-minus",

personal_information_approved: "fa-solid fa-circle-check",
personal_information_rejected: "fa-solid fa-circle-xmark",

payment_methods_approved: "fa-solid fa-circle-check",
payment_methods_rejected: "fa-solid fa-circle-xmark",

kyc_additional_documents_requested: "fa-solid fa-file-circle-question",
    settings_password_created: "fa-solid fa-key",
    settings_password_changed: "fa-solid fa-key",
    audit_records_deleted: "fa-solid fa-trash-can",
kyc_resubmission_rejected: "fa-solid fa-circle-xmark",
kyc_resubmission_completed: "fa-solid fa-circle-check",

user_unblocked: "fa-solid fa-user-check",

user_mining_plan_changed: "fa-solid fa-chart-line"
};

// Actions that this page is allowed to display.
const ALLOWED_ACTIVITY_ACTIONS = new Set(Object.keys(ACTIVITY_CATEGORY));

function getMetadataObject(row){
    if(!row || !row.metadata || typeof row.metadata !== "object") return {};
    return row.metadata;
}

function metadataContainsAny(row, terms){
    const metadata = getMetadataObject(row);
    let text = "";

    try{
        text = JSON.stringify(metadata).toLowerCase();
    }catch(error){
        text = String(metadata).toLowerCase();
    }

    return terms.some(term => text.includes(String(term).toLowerCase()));
}

/*
 * A few reset/bonus operations can be represented by a generic database
 * action. Their metadata is used only to identify the requested admin
 * operation; the actual stored record remains unchanged.
 */
function classifySpecialActivity(row){
    const action = String(row && row.action || "").toLowerCase();

    if(action === "account_reset_request_created" || action === "account_reset_request_updated"){
        if(metadataContainsAny(row, ["password", "forgot password", "password reset"])){
            return "users";
        }

        if(metadataContainsAny(row, ["withdrawal pin", "pin reset", "withdrawal_pin", "pin"])){
            return "users";
        }
    }

    if(action === "transaction_created" || action === "transaction_updated"){
        if(metadataContainsAny(row, ["bonus", "admin_bonus", "bonus_added"])){
            return "transactions";
        }
    }

    return null;
}

function isAdminActor(row){
    return String(row && row.actor_type || "").toLowerCase() === "admin";
}

function categoryForActivity(row){
    if(!row) return null;

    const action = String(row.action || "").toLowerCase();
    let category = ACTIVITY_CATEGORY[action] || classifySpecialActivity(row);

    if(!category) return null;

    // Login records are explicitly restricted to the admin application.
    // Admin actions are recorded with actor_type=admin. This prevents
    // ordinary user-app successful_login/logout rows from appearing here.
    if(category === "login" && !isAdminActor(row)) return null;

    return category;
}

// =========================================================
// HELPERS
// =========================================================

function escapeActivityHtml(value){
    if(value === null || value === undefined) return "—";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function labelForActivity(action){
    if(!action) return "Activity";

    return String(action)
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function categoryForActivity(row){
    if(row && row.category){
        const category = String(row.category).toLowerCase();
        if(["login", "changes", "transactions", "users", "security"].includes(category)){
            return category;
        }
    }

    return ACTIVITY_CATEGORY[row.action] || "changes";
}

function formatActivityDateTime(value){
    if(!value) return "—";

    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
}

function formatActivityDate(value){
    if(!value) return "—";

    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatActivityValue(value){
    if(value === null || value === undefined || value === "") return "—";

    if(typeof value === "boolean") return value ? "Yes" : "No";

    if(typeof value === "object"){
        try{
            return JSON.stringify(value, null, 2);
        }catch(error){
            return String(value);
        }
    }

    return String(value);
}

function resultLabel(result){
    const normalized = String(result || "SUCCESS").toUpperCase();

    if(normalized === "SUCCESS") return "Successful";
    if(normalized === "FAILED" || normalized === "FAILURE" || normalized === "ERROR") return "Failed";
    if(normalized === "REJECTED") return "Rejected";

    return labelForActivity(normalized.toLowerCase());
}

function resultClass(result){
    const normalized = String(result || "SUCCESS").toUpperCase();

    if(normalized === "SUCCESS") return "success";
    if(normalized === "FAILED" || normalized === "FAILURE" || normalized === "ERROR") return "failed";
    if(normalized === "REJECTED") return "rejected";

    return "neutral";
}

function getActorName(row){
    if(row && row.profiles){
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

        if(profile){
            const username = profile.username || "";
            const surname = profile.surname || "";
            const fullName = `${username} ${surname}`.trim();

            if(fullName) return fullName;
        }
    }

    if(row && row.actor_type === "system") return "System";
    return row && row.actor_id ? "Unknown actor" : "System";
}

function getActorPhone(row){
    if(row && row.profiles){
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        if(profile && profile.phone) return profile.phone;
    }

    return null;
}

function metadataSearchText(metadata){
    if(metadata === null || metadata === undefined) return "";

    try{
        return JSON.stringify(metadata).toLowerCase();
    }catch(error){
        return String(metadata).toLowerCase();
    }
}

function buildSearchText(row){
    return [
        row.actor_type,
        row.action,
        row.target_table,
        row.target_type,
        row.target_id,
        row.result,
        row.device_name,
        row.os_name,
        row.os_version,
        row.ip_address,
        row.approximate_location,
        row.identifier_masked,
        row.user_agent,
        getActorName(row),
        getActorPhone(row),
        metadataSearchText(row.metadata),
        row.created_at
    ].filter(value => value !== null && value !== undefined)
     .join(" ")
     .toLowerCase();
}

// =========================================================
// LOAD FULL ACTIVITY RECORDS
// =========================================================

// Set by the live-updates refresh so the table updates in place
// without flashing the "Loading..." row.
let activitySilentRefresh = false;

async function loadActivityLogs(){

    const list = document.getElementById("activityList");

    const silentRefresh = activitySilentRefresh;
    activitySilentRefresh = false;

    if(list && !silentRefresh){
        list.innerHTML = `
            <tr>
                <td colspan="4" class="activity-empty">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Loading activity logs...
                </td>
            </tr>
        `;
    }

    try{
        const { data, error } = await sb
            .from("activity_log")
            .select(`
                id,
                actor_id,
                actor_type,
                action,
                category,
                result,
                target_table,
                target_type,
                target_id,
                metadata,
                ip_address,
                user_agent,
                device_id,
                device_name,
                os_name,
                os_version,
                approximate_location,
                session_id,
                identifier_masked,
                created_at,
                is_read,
                profiles:actor_id(
                    username,
                    surname,
                    phone,
                    email,
                    country
                )
            `)
            .order("created_at", { ascending: false })
            .limit(500);

        if(error) throw error;

        activityData = (data || [])
            // User-initiated requests (deposit, withdrawal, KYC resubmission,
            // password/PIN reset ...) belong to the Notifications page, never here.
            .filter(row =>
                String(row.category || "").toUpperCase() !== "REQUESTS" &&
                String(row.actor_type || "").toLowerCase() !== "user"
            )
            .map(row => ({
                ...row,
                category: categoryForActivity(row)
            }))
            .filter(row => row.category && (
                ALLOWED_ACTIVITY_ACTIONS.has(String(row.action || "").toLowerCase()) ||
                classifySpecialActivity(row) !== null
            ))
            .map(row => ({
                ...row,
                icon: ACTIVITY_ICONS[row.action] || "fa-solid fa-circle-info",
                activity: labelForActivity(row.action),
                status: resultLabel(row.result),
                searchText: buildSearchText(row)
            }));

        renderActivityLogs();
        updateActivityCounts();
        updateActivityStats();
        applyActivityFilters();

    }catch(error){
        console.error("Failed to load activity log:", error);

        activityData = [];

        if(list){
            list.innerHTML = `
                <tr>
                    <td colspan="4" class="activity-empty activity-error">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        Failed to load activity logs.
                    </td>
                </tr>
            `;
        }

        updateActivityCounts();
        updateActivityStats();
    }
}

// =========================================================
// INITIALIZE PAGE
// =========================================================

function initActivityLogs(){
    console.log("Activity Logs Loaded");

    activeActivityCategory = "all";

    const searchInput = document.getElementById("activitySearch");
    if(searchInput) searchInput.value = "";
    activitySearchValue = "";

    loadActivityLogs();

    if(window.KTRealtime){
        KTRealtime.register("activity-log", ["activity_log"], function(){
            activitySilentRefresh = true;
            loadActivityLogs();
        });
    }

    setupActivitySearch();
    setupActivityModal();
}

// =========================================================
// RENDER ACTIVITY ROWS
// =========================================================

function renderActivityLogs(){

    const list = document.getElementById("activityList");
    if(!list) return;

    list.innerHTML = "";

    if(!activityData.length){
        list.innerHTML = `
            <tr>
                <td colspan="4" class="activity-empty">
                    <i class="fa-regular fa-clock"></i>
                    No activity records found.
                </td>
            </tr>
        `;
        return;
    }

    activityData.forEach((entry, index) => {

        const row = document.createElement("tr");

        row.className = "activity-row";
        row.dataset.category = entry.category;
        row.dataset.status = String(entry.result || "SUCCESS").toLowerCase();
        row.dataset.index = index;

        row.innerHTML = `
            <td>
                <div class="activity-user-cell">
                    <strong>${escapeActivityHtml(getActorName(entry))}</strong>
                    ${getActorPhone(entry) ? `<small>${escapeActivityHtml(getActorPhone(entry))}</small>` : ""}
                </div>
            </td>

            <td>${escapeActivityHtml(formatActivityDate(entry.created_at))}</td>

            <td>
                <div class="activity-name-cell">
                    <i class="${escapeActivityHtml(entry.icon)}"></i>
                    <span>${escapeActivityHtml(entry.activity)}</span>
                </div>
            </td>

            <td>
                <button class="aview-btn" type="button" data-activity-index="${index}">
                    View
                </button>
            </td>
        `;

        list.appendChild(row);
    });

    list.querySelectorAll(".aview-btn").forEach(button => {
        button.addEventListener("click", function(){
            const index = Number(this.dataset.activityIndex);
            viewActivityByIndex(index);
        });
    });
}

// =========================================================
// CATEGORY COUNTS
// =========================================================

function updateActivityCounts(){

    const counts = {
        all: activityData.length,
        login: 0,
        changes: 0,
        transactions: 0,
        users: 0,
        security: 0
    };

    activityData.forEach(entry => {
        if(counts[entry.category] !== undefined){
            counts[entry.category]++;
        }
    });

    const ids = {
        all: "allCount",
        login: "loginCount",
        changes: "changesCount",
        transactions: "transactionsCount",
        users: "usersCount",
        security: "securityCount"
    };

    Object.keys(ids).forEach(category => {
        const element = document.getElementById(ids[category]);
        if(element) element.textContent = counts[category];
    });
}

// =========================================================
// TODAY / YESTERDAY STATS
// =========================================================

function updateActivityStats(){

    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const todayCount = activityData.filter(entry => {
        const date = new Date(entry.created_at);
        return !Number.isNaN(date.getTime()) && date >= startOfToday;
    }).length;

    const yesterdayCount = activityData.filter(entry => {
        const date = new Date(entry.created_at);
        return !Number.isNaN(date.getTime()) &&
            date >= startOfYesterday &&
            date < startOfToday;
    }).length;

    const todayElement = document.getElementById("todayActivities");
    const yesterdayElement = document.getElementById("yesterdayActivities");

    if(todayElement) todayElement.textContent = todayCount;
    if(yesterdayElement) yesterdayElement.textContent = yesterdayCount;
}

// =========================================================
// CATEGORY FILTER
// =========================================================

function showActivityTab(category, button){

    activeActivityCategory = category || "all";

    document.querySelectorAll(".activity-tab").forEach(tab => {
        tab.classList.remove("active");
    });

    if(button){
        button.classList.add("active");
    }else{
        const matchingTab = document.querySelector(`.activity-tab[data-category="${CSS.escape(activeActivityCategory)}"]`);
        if(matchingTab) matchingTab.classList.add("active");
        else{
            const firstTab = document.querySelector(".activity-tab");
            if(firstTab) firstTab.classList.add("active");
        }
    }

    applyActivityFilters();
}

function applyActivityFilters(){

    const rows = document.querySelectorAll(".activity-row");
    const search = activitySearchValue.trim().toLowerCase();

    rows.forEach(row => {
        const categoryMatches = activeActivityCategory === "all" ||
            row.dataset.category === activeActivityCategory;

        const index = Number(row.dataset.index);
        const entry = activityData[index];
        const searchMatches = !search || (entry && entry.searchText.includes(search));

        row.style.display = categoryMatches && searchMatches ? "" : "none";
    });

    const emptyRow = document.querySelector(".activity-filter-empty");
    if(emptyRow) emptyRow.remove();

    const visibleRows = Array.from(rows).filter(row => row.style.display !== "none");

    if(rows.length && visibleRows.length === 0){
        const list = document.getElementById("activityList");
        if(list){
            const tr = document.createElement("tr");
            tr.className = "activity-filter-empty";
            tr.innerHTML = `
                <td colspan="4" class="activity-empty">
                    <i class="fa-solid fa-filter-circle-xmark"></i>
                    No activities match the current filter.
                </td>
            `;
            list.appendChild(tr);
        }
    }
}

// =========================================================
// SEARCH
// =========================================================

function setupActivitySearch(){

    const searchInput = document.getElementById("activitySearch");
    if(!searchInput) return;

    if(searchInput.dataset.activitySearchReady === "true") return;
    searchInput.dataset.activitySearchReady = "true";

    searchInput.addEventListener("input", function(){
        activitySearchValue = this.value || "";
        applyActivityFilters();
    });
}

// =========================================================
// DETAIL MODAL
// =========================================================

function setupActivityModal(){

    const modal = document.getElementById("activityModal");
    if(!modal || modal.dataset.activityModalReady === "true") return;

    modal.dataset.activityModalReady = "true";

    modal.addEventListener("click", function(event){
        if(event.target === modal){
            closeActivityModal();
        }
    });

    document.addEventListener("keydown", function(event){
        if(event.key === "Escape" && modal.classList.contains("show")){
            closeActivityModal();
        }
    });
}

function addDetailRow(label, value, extraClass = ""){
    return `
        <div class="activity-detail-row ${extraClass}">
            <span class="activity-detail-label">${escapeActivityHtml(label)}</span>
            <span class="activity-detail-value">${escapeActivityHtml(formatActivityValue(value))}</span>
        </div>
    `;
}

function addDetailBlock(label, value, extraClass = ""){
    return `
        <div class="activity-detail-block ${extraClass}">
            <div class="activity-detail-block-label">${escapeActivityHtml(label)}</div>
            <pre class="activity-detail-code">${escapeActivityHtml(formatActivityValue(value))}</pre>
        </div>
    `;
}

function renderBeforeAfter(metadata){

    if(!metadata || typeof metadata !== "object") return "";

    const before = metadata.before;
    const after = metadata.after;

    if(before === undefined && after === undefined) return "";

    const beforeObject = before && typeof before === "object" ? before : {};
    const afterObject = after && typeof after === "object" ? after : {};
    const keys = Array.from(new Set([
        ...Object.keys(beforeObject),
        ...Object.keys(afterObject)
    ]));

    if(!keys.length){
        return `
            <div class="activity-detail-section">
                <div class="activity-detail-section-title">
                    <i class="fa-solid fa-code-compare"></i>
                    Before / After
                </div>
                <div class="activity-detail-empty">No field-level changes were recorded.</div>
            </div>
        `;
    }

    let rows = "";

    keys.forEach(key => {
        const beforeValue = beforeObject[key];
        const afterValue = afterObject[key];

        const beforeText = formatActivityValue(beforeValue);
        const afterText = formatActivityValue(afterValue);

        const changed = beforeText !== afterText;

        rows += `
            <div class="activity-change-row ${changed ? "changed" : "unchanged"}">
                <div class="activity-change-field">${escapeActivityHtml(labelForActivity(key))}</div>
                <div class="activity-change-value">
                    <div class="activity-change-label">Before</div>
                    <pre>${escapeActivityHtml(beforeText)}</pre>
                </div>
                <div class="activity-change-arrow">
                    <i class="fa-solid fa-arrow-right"></i>
                </div>
                <div class="activity-change-value">
                    <div class="activity-change-label">After</div>
                    <pre>${escapeActivityHtml(afterText)}</pre>
                </div>
            </div>
        `;
    });

    return `
        <div class="activity-detail-section">
            <div class="activity-detail-section-title">
                <i class="fa-solid fa-code-compare"></i>
                Before / After
            </div>
            <div class="activity-change-table">
                ${rows}
            </div>
        </div>
    `;
}

function renderMetadata(metadata){

    if(metadata === null || metadata === undefined){
        return `
            <div class="activity-detail-section">
                <div class="activity-detail-section-title">
                    <i class="fa-solid fa-database"></i>
                    Metadata
                </div>
                <div class="activity-detail-empty">No metadata recorded.</div>
            </div>
        `;
    }

    let safeMetadata;

    try{
        safeMetadata = JSON.parse(JSON.stringify(metadata));
    }catch(error){
        safeMetadata = metadata;
    }

    return `
        <div class="activity-detail-section">
            <div class="activity-detail-section-title">
                <i class="fa-solid fa-database"></i>
                Metadata
            </div>
            ${addDetailBlock("Complete metadata", safeMetadata)}
        </div>
        ${renderBeforeAfter(safeMetadata)}
    `;
}

function viewActivityByIndex(index){

    const entry = activityData[index];
    if(!entry) return;

    // Category-aware details live in activity-details.js
    if(window.ActivityDetails){
        window.ActivityDetails.open(entry, activityData);
    }
}

// Keep compatibility with existing HTML or other page code.
function viewActivity(button){
    if(typeof button === "number"){
        viewActivityByIndex(button);
        return;
    }

    const row = button && button.closest ? button.closest(".activity-row") : null;
    if(!row) return;

    viewActivityByIndex(Number(row.dataset.index));
}

// =========================================================
// CLOSE MODAL
// =========================================================

function closeActivityModal(){
    const modal = document.getElementById("activityModal");
    if(!modal) return;

    modal.classList.remove("show");
    document.body.classList.remove("activity-modal-open");
}


// =========================================================
// DELETE ACTIVITY RECORDS
// =========================================================

let activityDeleteCategory = null;


/* =================================
   OPEN CATEGORY MODAL
================================= */

function openDeleteActivityModal(){

    const modal = document.getElementById("activityDeleteModal");

    if(!modal) return;

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");

    document.body.classList.add("activity-modal-open");
}


/* =================================
   CLOSE CATEGORY MODAL
================================= */

function closeDeleteActivityModal(){

    const modal = document.getElementById("activityDeleteModal");

    if(!modal) return;

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");

    /*
     * Keep body locked if the confirmation modal
     * is currently open.
     */
    const confirmModal = document.getElementById(
        "activityDeleteConfirmModal"
    );

    if(!confirmModal || !confirmModal.classList.contains("show")){
        document.body.classList.remove("activity-modal-open");
    }
}


/* =================================
   OPEN CONFIRMATION
================================= */

function requestDeleteActivityCategory(category){

    const allowedCategories = [
        "all",
        "login",
        "changes",
        "transactions",
        "users",
        "security"
    ];

    if(!allowedCategories.includes(category)){
        return;
    }

    activityDeleteCategory = category;

    closeDeleteActivityModal();

    const confirmModal = document.getElementById(
        "activityDeleteConfirmModal"
    );

    const confirmText = document.getElementById(
        "activityDeleteConfirmText"
    );

    if(!confirmModal || !confirmText){
        return;
    }

    const categoryNames = {
        all: "All",
        login: "Login",
        changes: "Changes",
        transactions: "Transactions",
        users: "Users",
        security: "Security"
    };

    const categoryName = categoryNames[category];

    if(category === "all"){

        confirmText.textContent =
            "This will permanently delete all activity records. This action cannot be undone.";

    }else{

        confirmText.textContent =
            `This will permanently delete all ${categoryName} activity records. This action cannot be undone.`;

    }

    confirmModal.classList.add("show");
    confirmModal.setAttribute("aria-hidden", "false");

    document.body.classList.add("activity-modal-open");
}


/* =================================
   CLOSE CONFIRMATION
================================= */

function closeDeleteActivityConfirmModal(){

    const modal = document.getElementById(
        "activityDeleteConfirmModal"
    );

    if(!modal) return;

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");

    activityDeleteCategory = null;

    document.body.classList.remove("activity-modal-open");
}


/* =================================
   CONFIRM DELETE
================================= */

async function confirmDeleteActivityRecords(){

    if(!activityDeleteCategory){
        return;
    }

    const category = activityDeleteCategory;

    const button = document.getElementById(
        "confirmDeleteActivityBtn"
    );

    if(button){

        button.disabled = true;

        button.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
    }

    try{

        const { data, error } = await sb.rpc(
            "admin_delete_activity_logs",
            {
                p_category: category
            }
        );

        if(error){
            throw error;
        }

        const deletedCount = Number(data || 0);

        closeDeleteActivityConfirmModal();

        /*
         * Reload the Activity Log from the database.
         */
        await loadActivityLogs();

        /*
         * Show a small notification if the global notification
         * function exists in the Admin app.
         */
        KTUI.success(
            `${deletedCount} activity record${deletedCount === 1 ? "" : "s"} deleted.`
        );

    }catch(error){

        console.error(
            "Failed to delete activity records:",
            error
        );

        KTUI.error(
            error?.message ||
            "Failed to delete activity records."
        );

    }finally{

        if(button){

            button.disabled = false;

            button.innerHTML = "Delete";

        }

        activityDeleteCategory = null;
    }
}

// =========================================================
// GLOBAL ACCESS
// =========================================================

window.initActivityLogs = initActivityLogs;
window.loadActivityLogs = loadActivityLogs;
window.showActivityTab = showActivityTab;
window.viewActivity = viewActivity;
window.closeActivityModal = closeActivityModal;

window.openDeleteActivityModal = openDeleteActivityModal;
window.closeDeleteActivityModal = closeDeleteActivityModal;
window.requestDeleteActivityCategory = requestDeleteActivityCategory;
window.closeDeleteActivityConfirmModal = closeDeleteActivityConfirmModal;
window.confirmDeleteActivityRecords = confirmDeleteActivityRecords;

/* ===== js/support-chat.js ===== */
// ======================================================
// SUPPORT CHAT — real, Supabase-backed (individual chats only)
// Rebuilt from the local-mock version to use real data end to
// end: support_conversations / support_messages, real users
// (profiles), real wallet/deposit/withdrawal/KYC/plan data for
// the profile modal, and a real "support-chat" storage bucket
// for photo/document/camera attachments and voice notes.
//
// Dropped (no real signal exists for these, so faking them
// would be dishonest rather than "real"):
//   - the fake typing-indicator bot reply (simulateTypingReply)
//   - per-message blue "read" ticks (the real user app has no
//     read-receipt concept at all — sent messages always show
//     a single check, never a double check)
//   - "online" presence dot (no presence system) — the chat
//     header shows the user's phone number instead
//   - chat mute (was already dead code — no button in the HTML
//     called toggleChatMute)
// Everything else (reply, edit own messages, delete any
// message, pin/unpin, chat priority + pin-to-top, bulk
// select/delete/priority, message search, new chat, clear
// messages, delete chat, real attachments/voice) is real.
// ======================================================


// ======================================================
// STATE
// ======================================================

const CHAT_LONG_PRESS_DURATION = 500;
const CHAT_LONG_PRESS_MOVE_TOLERANCE = 10;

let supportChatUsers = [];
let individualChats = [];

let currentChat = null;

// ---- Live chat extras: typing, online, read ticks ----
let typingChannel = null;
let userTypingTimer = null;
let chatUserTyping = false;
let chatUserOnline = false;
let lastTypingSentAt = 0;
let presenceHooked = false;

// Lets the live-updates module know which chat is on screen right now
// (so it does not pop up an alert for a conversation you are reading).
window.getOpenSupportChatId = function () {
    return currentChat ? currentChat.id : null;
};
let currentChatType = "individual";
let currentUser = null;

let replyingToMessage = null;
let editingMessage = null;

let currentChatFilter = "all";

// user id -> number of requests the admin has not acted on yet
// (pending deposits, withdrawals, KYC, resets, change requests ...)
let pendingRequestCounts = {};
let currentChatSearch = "";

let chatMenuOpen = false;
let attachmentMenuOpen = false;

let isRecordingVoice = false;
let voiceMediaRecorder = null;
let voiceRecordedChunks = [];
let voiceStream = null;

let deleteActionType = null;
let deleteActionId = null;
let deleteActionIds = [];

let chatSelectionMode = false;
let selectedChatIds = [];
let pendingBulkAction = null;
let pendingPriorityMode = null;

let pinMessageSelectionMode = false;
let selectedPinMessageIds = [];
let currentPinnedMessageIndex = 0;

let messageSearchActive = false;
let messageSearchQuery = "";
let messageSearchResults = [];
let currentMessageSearchIndex = -1;

let supportAdminId = null;
let supportMsgChannel = null;
let supportConvChannel = null;
let supportChatInitialized = false;


// ======================================================
// DOM HELPER
// ======================================================

function supportChatElement(id) {
    return document.getElementById(id);
}

function getInitials(name) {

    if (!name) return "?";

    const parts = name.trim().split(/\s+/);

    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();

}

function supportEscapeHtml(value) {

    return String(value === null || value === undefined ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

function fullNameOf(row) {
    return (row.username + " " + (row.surname || "")).trim() || "Unknown user";
}

function formatMessageTime(dateString) {

    const date = new Date(dateString);

    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

}

function formatChatListTime(dateString) {

    const date = new Date(dateString);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
    }

    return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });

}

function findIndividualChat(chatId) {
    return individualChats.find(function (chat) { return chat.id === chatId; });
}

function findSupportUser(userId) {
    return supportChatUsers.find(function (u) { return u.id === userId; });
}


// ======================================================
// INIT
// ======================================================

function initSupportChatPage() {

    // Keep the "Requests" filter live: refresh when a request is made or acted on.
    if (window.KTRealtime && typeof KTRealtime.register === "function") {
        KTRealtime.register(
            "support-chat",
            ["deposits", "withdrawals", "kyc_submissions", "account_reset_requests", "profile_signals"],
            refreshPendingRequestCounts
        );
    }

    if (supportChatInitialized) {
        loadSupportConversations();
        return;
    }

    supportChatInitialized = true;

    sb.auth.getUser().then(function (res) {

        supportAdminId = res.data && res.data.user ? res.data.user.id : null;

        loadSupportConversations();
        setupSupportRealtime();

    });

    setupComposerEvents();
    setupAttachmentEvents();
    setupMessageSearchEvents();
    setupPinMessageInput();
    setupChatMenuOutsideClick();
    setupChatSelectionOutsideClick();
    setupPinSelectionOutsideClick();
    setupReplyPreviewEvents();

    const chatSearchInput = supportChatElement("chatSearch");

    if (chatSearchInput) {
        chatSearchInput.addEventListener("input", function () {
            searchChats(chatSearchInput.value);
        });
    }

    const userSearchInput = supportChatElement("userSearchInput");

    if (userSearchInput) {
        userSearchInput.addEventListener("input", function () {
            renderAvailableUsers(userSearchInput.value);
        });
    }

}

function showIndividualChats() {
    // Only one section exists now (groups removed) — nothing to switch,
    // kept only so the header button remains a harmless no-op.
}


// ======================================================
// LOAD CONVERSATIONS
// ======================================================

function showChatLoadingOverlay() {

    const overlay = supportChatElement("chatLoadingOverlay");
    if (overlay) overlay.classList.remove("hidden");

}

function hideChatLoadingOverlay() {

    const overlay = supportChatElement("chatLoadingOverlay");
    if (overlay) overlay.classList.add("hidden");

}

// Which users have requests the admin has not acted on yet.
// Never rejects: if it fails the chats simply show no request tag.
function loadPendingRequestCounts() {

    return sb.rpc("admin_pending_request_users").then(function (res) {

        if (res.error) {
            console.error("Failed to load pending requests:", res.error);
            return;
        }

        pendingRequestCounts = {};

        (res.data || []).forEach(function (row) {
            pendingRequestCounts[row.user_id] = Number(row.pending_count) || 0;
        });

    }, function (error) {
        console.error("Failed to load pending requests:", error);
    });

}

// Refresh just the request tags (a request was made or acted on).
function refreshPendingRequestCounts() {

    loadPendingRequestCounts().then(function () {

        individualChats.forEach(function (chat) {
            chat.requestCount = pendingRequestCounts[chat.userId] || 0;
        });

        renderIndividualChats();

    });

}

function chatHasPendingRequests(chat) {

    return !!chat && Number(chat.requestCount) > 0;

}

function loadSupportConversations(onDone) {

    Promise.all([
        sb.rpc("admin_list_support_conversations"),
        loadPendingRequestCounts()
    ]).then(function (results) {

        const res = results[0];

        if (res.error) {
            console.error("Failed to load support conversations:", res.error);
            if (typeof onDone === "function") onDone();
            return;
        }

        const rows = res.data || [];

        rows.forEach(function (row) {

            const existing = findIndividualChat(row.id);

            const chat = existing || { id: row.id, messages: [] };

            chat.userId = row.user_id;
            chat.name = fullNameOf(row);
            chat.phone = row.phone;
            chat.isBlocked = row.is_blocked;
            chat.status = row.status;
            chat.assignedAdmin = row.assigned_admin;
            chat.priority = row.priority;
            chat.pinned = row.pinned;
            chat.lastMessage = row.last_message
                ? (row.last_sender_type === "admin" ? "You: " : "") + row.last_message
                : "No messages yet";
            chat.lastMessageTime = formatChatListTime(row.last_message_at || row.created_at);
            chat.unread = row.unread_count || 0;
            chat.requestCount = pendingRequestCounts[row.user_id] || 0;

            if (!existing) {
                individualChats.push(chat);
            }

        });

        const validIds = rows.map(function (r) { return r.id; });

        individualChats = individualChats.filter(function (c) { return validIds.indexOf(c.id) !== -1; });

        renderIndividualChats();
        updateUnreadCounts();

        if (currentChat) {
            const fresh = findIndividualChat(currentChat.id);
            if (fresh) {
                fresh.messages = currentChat.messages;
                currentChat = fresh;
                renderCurrentChat();
            }
        }

        refreshUserReadTimes();

        if (typeof onDone === "function") onDone();

    });

}


// ======================================================
// RENDER CHAT LIST
// ======================================================

function renderIndividualChats() {

    const container = supportChatElement("individualChats");
    const emptyState = supportChatElement("noIndividualChats");

    if (!container) return;

    container.innerHTML = "";

    let chats = [...individualChats];

    if (currentChatFilter === "unread") {
        chats = chats.filter(function (chat) { return chat.unread > 0; });
    }

    if (currentChatFilter === "priority") {
        chats = chats.filter(function (chat) { return chat.priority; });
    }

    if (currentChatFilter === "requests") {
        chats = chats.filter(chatHasPendingRequests);
    }

    if (currentChatSearch.trim()) {
        const search = currentChatSearch.toLowerCase().trim();
        chats = chats.filter(function (chat) { return chat.name.toLowerCase().includes(search); });
    }

    if (chatSelectionMode && pendingBulkAction === "priority") {

        if (pendingPriorityMode === "add") {
            chats = chats.filter(function (chat) { return !chat.priority; });
        } else if (pendingPriorityMode === "remove") {
            chats = chats.filter(function (chat) { return chat.priority; });
        }

    }

    chats.sort(function (a, b) {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
    });

    if (chats.length === 0) {
        if (emptyState) {

            const titleEl = emptyState.querySelector("h4");
            const textEl = emptyState.querySelector("p");
            const buttonEl = emptyState.querySelector("button");
            const searchTerm = currentChatSearch.trim();

            let title = "No conversations";
            let text = "Start a new conversation with a user.";
            let showButton = true;

            if (chatSelectionMode && pendingBulkAction === "priority") {
                title = "No conversations available";
                text = pendingPriorityMode === "remove"
                    ? "No conversations are marked as priority."
                    : "Every conversation is already marked as priority.";
                showButton = false;
            } else if (searchTerm) {
                title = "No results";
                text = "No conversations match \"" + searchTerm + "\".";
                showButton = false;
            } else if (currentChatFilter === "unread") {
                title = "No unread conversations";
                text = "You're all caught up.";
                showButton = false;
            } else if (currentChatFilter === "priority") {
                title = "No priority conversations";
                text = "Conversations you mark as priority will appear here.";
                showButton = false;
            }

            if (titleEl) titleEl.textContent = title;
            if (textEl) textEl.textContent = text;
            if (buttonEl) buttonEl.style.display = showButton ? "" : "none";

            emptyState.style.display = "flex";
        }
        updateIndividualChatCount(0);
        return;
    }

    if (emptyState) emptyState.style.display = "none";

    chats.forEach(function (chat) {
        container.appendChild(createIndividualChatItem(chat));
    });

    updateIndividualChatCount(chats.length);

}

function createIndividualChatItem(chat) {

    const item = document.createElement("div");
    item.className = "chat-list-item";

    if (currentChat && currentChat.id === chat.id) {
        item.classList.add("active");
    }

    if (chat.unread > 0) {
        item.classList.add("unread");
    }

    if (selectedChatIds.includes(chat.id)) {
        item.classList.add("chat-selected");
    }

    item.dataset.chatId = chat.id;

    const avatar = document.createElement("div");
    avatar.className = "chat-list-avatar";
    avatar.textContent = getInitials(chat.name);

    const content = document.createElement("div");
    content.className = "chat-list-content";

    const top = document.createElement("div");
    top.className = "chat-list-top";

    const name = document.createElement("h4");
    name.textContent = chat.name;

    const time = document.createElement("span");
    time.textContent = chat.lastMessageTime;

    top.appendChild(name);
    top.appendChild(time);

    const bottom = document.createElement("div");
    bottom.className = "chat-list-bottom";

    const message = document.createElement("p");
    message.textContent = chat.lastMessage;

    bottom.appendChild(message);

    if (chat.unread > 0) {
        const unread = document.createElement("span");
        unread.className = "chat-unread-badge";
        unread.textContent = chat.unread;
        bottom.appendChild(unread);
    }

    if (chatHasPendingRequests(chat)) {
        const requestTag = document.createElement("span");
        requestTag.className = "chat-request-badge";
        requestTag.textContent = chat.requestCount > 1 ? chat.requestCount + " requests" : "Request";
        requestTag.title = "This user has requests you have not acted on yet";
        bottom.appendChild(requestTag);
    }

    if (chat.priority) {
        const priority = document.createElement("i");
        priority.className = "fa-solid fa-star chat-priority";
        bottom.appendChild(priority);
    }

    content.appendChild(top);
    content.appendChild(bottom);

    item.appendChild(avatar);
    item.appendChild(content);

    attachChatPressHandlers(item, chat.id, function () {
        openIndividualChat(chat.id);
    });

    return item;

}

function updateIndividualChatCount(count) {

    const element = supportChatElement("individualChatCount");
    if (!element) return;

    element.textContent = count + (count === 1 ? " conversation" : " conversations");

}

function filterChats(filter, button) {

    currentChatFilter = filter || "all";

    document.querySelectorAll("#individualSection .chat-filter")
        .forEach(function (item) { item.classList.remove("active"); });

    if (button) button.classList.add("active");

    renderIndividualChats();

}

function searchChats(value) {

    currentChatSearch = value || "";

    renderIndividualChats();

    const clearButton = supportChatElement("clearChatSearch");

    if (clearButton) {
        clearButton.style.display = currentChatSearch.length ? "block" : "none";
    }

}

function clearChatSearch() {

    const input = supportChatElement("chatSearch");
    if (input) input.value = "";

    currentChatSearch = "";

    const clearButton = supportChatElement("clearChatSearch");
    if (clearButton) clearButton.style.display = "none";

    renderIndividualChats();

}

function updateUnreadCounts() {

    const total = individualChats.reduce(function (sum, chat) {
        return sum + (Number(chat.unread) || 0);
    }, 0);

    const element = supportChatElement("individualUnread");
    if (element) element.textContent = total;

}


// ======================================================
// OPEN / CLOSE CHAT WINDOW
// ======================================================

function openIndividualChat(chatId) {

    const chat = findIndividualChat(chatId);
    if (!chat) return;

    // Switching straight from another open chat: mark that one read.
    if (currentChat && currentChat.id !== chat.id) {
        markConversationRead(currentChat.id);
    }

    if (chatSelectionMode) exitChatSelectionMode();
    closeMessageSearch();
    cancelReply();
    cancelEditMessage();

    currentChat = chat;
    currentChatType = "individual";
    currentUser = { id: chat.userId, name: chat.name, phone: chat.phone };

    chatUserTyping = false;
    chatUserOnline = false;
    startTypingChannel(chat.id);

    if (!presenceHooked && window.KTRealtime && typeof KTRealtime.onPresence === "function") {
        presenceHooked = true;
        KTRealtime.onPresence(refreshChatUserOnline);
    }

    openChatWindow();
    renderCurrentChat();
    refreshChatUserOnline();

    if (!chat.messagesLoaded) {

        showChatLoadingOverlay();

        sb.from("support_messages")
            .select("*")
            .eq("conversation_id", chatId)
            .eq("hidden_from_admin", false)
            .order("created_at", { ascending: true })
            .then(function (res) {

                hideChatLoadingOverlay();

                if (res.error) {
                    console.error("Failed to load messages:", res.error);
                    return;
                }

                chat.messages = (res.data || [])
                    .filter(function (row) { return row.deleted_by !== "admin" && row.cleared_by !== "admin"; })
                    .map(mapSupportMessageRow);
                chat.messagesLoaded = true;

                if (currentChat && currentChat.id === chatId) {
                    renderMessages();
                    updatePinnedMessageBar();
                    scrollMessagesToBottom();
                }

            });

    } else {

        hideChatLoadingOverlay();
        renderMessages();
        updatePinnedMessageBar();
        scrollMessagesToBottom();

    }

    markConversationRead(chatId);

}

function mapSupportMessageRow(row) {

    return {
        id: row.id,
        senderId: row.sender_id,
        senderType: row.sender_type,
        senderName: row.sender_type === "admin" ? "You" : (currentUser ? currentUser.name : "User"),
        text: row.content,
        createdAt: row.created_at,
        time: formatMessageTime(row.created_at),
        sent: row.sender_type === "admin",
        edited: !!row.edited_at,
        replyToId: row.reply_to_id,
        isPinned: row.is_pinned,
        type: row.message_type || "text",
        fileUrl: row.attachment_url,
        fileName: row.attachment_name,
        fileMime: row.attachment_mime,
        // Never hides the message — just marks it, same idea as "edited".
        deletedBy: row.deleted_by || null,
        clearedBy: row.cleared_by || null
    };

}

function markConversationRead(chatId, onDone) {

    sb.from("support_conversations")
        .update({ admin_last_read_at: new Date().toISOString() })
        .eq("id", chatId)
        .then(function (res) {

            if (res.error) {
                console.error("Failed to mark conversation read:", res.error);
                if (typeof onDone === "function") onDone();
                return;
            }

            const chat = findIndividualChat(chatId);
            if (chat) chat.unread = 0;

            renderIndividualChats();
            updateUnreadCounts();

            if (typeof onDone === "function") onDone();

        });

}

// ======================================================
// LIVE EXTRAS — typing indicator, online status, read ticks
// ======================================================

function updateChatHeaderStatus() {

    if (!currentChat) return;

    const statusEl = supportChatElement("chatStatus");
    const onlineDot = supportChatElement("chatOnlineStatus");

    const base = currentChat.phone + (currentChat.isBlocked ? " · Blocked" : "");

    if (statusEl) {
        if (chatUserTyping) statusEl.textContent = "typing…";
        else statusEl.textContent = (chatUserOnline ? "Online · " : "") + base;
    }

    if (onlineDot) onlineDot.style.display = chatUserOnline ? "" : "none";

}

function refreshChatUserOnline() {

    if (!currentChat || !window.KTRealtime || typeof KTRealtime.isUserOnline !== "function") {
        chatUserOnline = false;
        updateChatHeaderStatus();
        return;
    }

    const id = currentChat.id;

    KTRealtime.isUserOnline(currentChat.userId).then(function (online) {
        if (!currentChat || currentChat.id !== id) return;
        if (online !== chatUserOnline) {
            chatUserOnline = online;
            updateChatHeaderStatus();
        }
    });

}

function stopTypingChannel() {

    if (typingChannel) {
        try { sb.removeChannel(typingChannel); } catch (e) { /* ignore */ }
        typingChannel = null;
    }

    clearTimeout(userTypingTimer);
    chatUserTyping = false;

}

function startTypingChannel(chatId) {

    stopTypingChannel();

    typingChannel = sb.channel("typing-" + chatId, { config: { broadcast: { self: false } } });

    typingChannel
        .on("broadcast", { event: "typing" }, function (msg) {

            if (!msg || !msg.payload || msg.payload.from !== "user") return;
            if (!currentChat || currentChat.id !== chatId) return;

            chatUserTyping = true;
            updateChatHeaderStatus();

            clearTimeout(userTypingTimer);
            userTypingTimer = setTimeout(function () {
                chatUserTyping = false;
                updateChatHeaderStatus();
            }, 4000);

        })
        .subscribe();

}

function sendTypingSignal() {

    if (!typingChannel || !currentChat) return;

    const now = Date.now();
    if (now - lastTypingSentAt < 2000) return;
    lastTypingSentAt = now;

    typingChannel.send({ type: "broadcast", event: "typing", payload: { from: "admin" } });

}

// Updates the ticks of messages already on screen (no re-render, no scroll jump).
function updateReadTicks() {

    if (!currentChat) return;

    const readAt = currentChat.userLastReadAt ? new Date(currentChat.userLastReadAt).getTime() : 0;

    (currentChat.messages || []).forEach(function (message) {

        if (!message.sent) return;

        const wrapper = document.querySelector('#messages [data-message-id="' + message.id + '"]');
        const tick = wrapper ? wrapper.querySelector(".msg-tick") : null;
        if (!tick) return;

        const read = readAt && new Date(message.createdAt).getTime() <= readAt;
        tick.className = (read ? "fa-solid fa-check-double" : "fa-solid fa-check") + " msg-tick";
        tick.style.color = read ? "" : "#94a3b8";

    });

}

function refreshUserReadTimes() {

    sb.from("support_conversations")
        .select("id, user_last_read_at")
        .then(function (res) {

            if (res.error || !res.data) return;

            let openChanged = false;

            res.data.forEach(function (row) {

                const chat = findIndividualChat(row.id);
                if (!chat) return;

                if (chat.userLastReadAt !== row.user_last_read_at) {
                    chat.userLastReadAt = row.user_last_read_at;
                    if (currentChat && currentChat.id === chat.id) openChanged = true;
                }

            });

            if (openChanged) updateReadTicks();

        });

}

function openChatWindow() {

    const emptyChat = supportChatElement("emptyChat");
    const chatWindow = supportChatElement("chatWindow");
    const chatMain = supportChatElement("chatMain");

    if (emptyChat) emptyChat.style.display = "none";
    if (chatWindow) chatWindow.classList.remove("hidden");
    if (chatMain) chatMain.classList.add("chat-open");

}

function closeChat() {

    const emptyChat = supportChatElement("emptyChat");
    const chatWindow = supportChatElement("chatWindow");
    const chatMain = supportChatElement("chatMain");

    if (emptyChat) emptyChat.style.display = "flex";
    if (chatWindow) chatWindow.classList.add("hidden");
    if (chatMain) chatMain.classList.remove("chat-open");

    const closingChatId = currentChat ? currentChat.id : null;

    stopTypingChannel();
    chatUserOnline = false;

    currentChat = null;
    currentUser = null;

    closeMessageSearch();
    cancelReply();
    cancelEditMessage();
    closeChatMenu();

    showChatLoadingOverlay();

    if (closingChatId) {
        // Everything on screen while the chat was open has been seen.
        markConversationRead(closingChatId, function () {
            loadSupportConversations(hideChatLoadingOverlay);
        });
    } else {
        loadSupportConversations(hideChatLoadingOverlay);
    }

}

function renderCurrentChat() {

    if (!currentChat) return;

    const nameEl = supportChatElement("chatName");
    const statusEl = supportChatElement("chatStatus");
    const avatarImg = supportChatElement("chatAvatar");
    const avatarInitials = supportChatElement("chatAvatarInitials");
    const onlineDot = supportChatElement("chatOnlineStatus");

    if (nameEl) nameEl.textContent = currentChat.name;
    updateChatHeaderStatus();

    if (avatarImg) avatarImg.style.display = "none";

    if (avatarInitials) {
        avatarInitials.classList.remove("hidden");
        avatarInitials.textContent = getInitials(currentChat.name);
    }

    renderMessages();
    updatePinnedMessageBar();

}

function toggleChatMenu() {

    const menu = supportChatElement("chatMenu");
    const moreBtn = supportChatElement("chatMoreButton");
    const closeBtn = supportChatElement("chatMenuCloseButton");

    chatMenuOpen = !chatMenuOpen;

    if (menu) menu.classList.toggle("hidden", !chatMenuOpen);
    if (moreBtn) moreBtn.style.display = chatMenuOpen ? "none" : "";
    if (closeBtn) closeBtn.style.display = chatMenuOpen ? "" : "none";

}

function closeChatMenu() {

    chatMenuOpen = false;

    const menu = supportChatElement("chatMenu");
    const moreBtn = supportChatElement("chatMoreButton");
    const closeBtn = supportChatElement("chatMenuCloseButton");

    if (menu) menu.classList.add("hidden");
    if (moreBtn) moreBtn.style.display = "";
    if (closeBtn) closeBtn.style.display = "none";

}

function setupChatMenuOutsideClick() {

    document.addEventListener("click", function (event) {

        if (!chatMenuOpen) return;

        const menu = supportChatElement("chatMenu");
        const moreBtn = supportChatElement("chatMoreButton");

        if (menu && (menu.contains(event.target) || (moreBtn && moreBtn.contains(event.target)))) {
            return;
        }

        closeChatMenu();

    });

}


// ======================================================
// RENDER MESSAGES
// ======================================================

function renderMessages() {

    const container = supportChatElement("messages");
    if (!container || !currentChat) return;

    container.innerHTML = "";

    (currentChat.messages || []).forEach(function (message) {
        container.appendChild(createMessageElement(message));
    });

    // Only once the messages have actually loaded (not while still loading).
    if (currentChat.messagesLoaded) {
        KTUI.syncBlockEmpty(container, "No messages yet. Send the first message below.", "fa-regular fa-comments");
    }

    if (messageSearchActive) {
        performMessageSearch();
    }

}

function createMessageElement(message) {

    if (message.type === "notice") {

        const notice = document.createElement("div");
        notice.className = "message-notice";
        notice.dataset.messageId = message.id;
        notice.textContent = message.text;

        return notice;

    }

    const wrapper = document.createElement("div");
    wrapper.className = "message " + (message.sent ? "sent" : "received");
    wrapper.dataset.messageId = message.id;

    if (message.isPinned) {
        wrapper.classList.add("message-pinned");
    }

    if (pinMessageSelectionMode) {

        wrapper.classList.add("pin-selection-mode");

        if (selectedPinMessageIds.includes(message.id)) {
            wrapper.classList.add("pin-message-selected");
        }

        wrapper.addEventListener("click", function (event) {

            if (event.target.closest(".message-actions") || event.target.closest(".message-action-menu")) {
                return;
            }

            event.stopPropagation();
            togglePinMessageSelection(message.id);

        });

    }

    const content = document.createElement("div");
    content.className = "message-content";

    if (message.replyToId) {

        const replied = currentChat.messages.find(function (m) { return m.id === message.replyToId; });

        const reply = document.createElement("div");
        reply.className = "message-reply";
        reply.dataset.replyMessageId = message.replyToId;

        const replySender = document.createElement("strong");
        replySender.className = "message-reply-sender";
        replySender.textContent = replied ? (replied.sent ? "You" : replied.senderName) : "Message";

        const replyText = document.createElement("span");
        replyText.className = "message-reply-text";
        replyText.textContent = replied ? replied.text : "Original message not available";

        reply.appendChild(replySender);
        reply.appendChild(replyText);

        reply.addEventListener("click", function (event) {
            event.stopPropagation();
            openRepliedMessage(message.replyToId);
        });

        content.appendChild(reply);

    }

    if (message.type === "voice" && message.fileUrl) {

        const audio = document.createElement("audio");
        audio.className = "message-voice-player";
        audio.controls = true;
        audio.src = message.fileUrl;

        content.appendChild(audio);

    } else if (message.type !== "text" && message.fileUrl) {

        const isImage = message.fileMime && message.fileMime.indexOf("image/") === 0;

        if (isImage) {

            const link = document.createElement("a");
            link.href = message.fileUrl;
            link.target = "_blank";
            link.rel = "noopener";
            link.className = "message-attachment-image-link";

            const img = document.createElement("img");
            img.className = "message-attachment-image";
            img.src = message.fileUrl;
            img.alt = message.fileName || "Image";

            link.appendChild(img);
            content.appendChild(link);

        } else {

            const fileCard = document.createElement("a");
            fileCard.href = message.fileUrl;
            fileCard.target = "_blank";
            fileCard.rel = "noopener";
            fileCard.className = "message-attachment-file";
            fileCard.innerHTML =
                '<i class="fa-solid fa-file"></i><span>' +
                supportEscapeHtml(message.fileName || message.text || "File") +
                "</span>";

            content.appendChild(fileCard);

        }

        const caption = document.createElement("p");
        caption.className = "message-text";
        caption.textContent = message.text || "";
        content.appendChild(caption);

    } else {

        const text = document.createElement("p");
        text.className = "message-text";
        text.textContent = message.text || "";
        content.appendChild(text);

    }

    const meta = document.createElement("div");
    meta.className = "message-meta";

    const time = document.createElement("span");
    time.textContent = message.time || "";
    meta.appendChild(time);

    if (message.edited) {
        const edited = document.createElement("span");
        edited.textContent = " edited";
        meta.appendChild(edited);
    }

    if (message.deletedBy) {
        const deleted = document.createElement("span");
        deleted.className = "message-deleted-tag";
        deleted.textContent = " deleted";
        meta.appendChild(deleted);
    } else if (message.clearedBy) {
        const cleared = document.createElement("span");
        cleared.className = "message-deleted-tag";
        cleared.textContent = " cleared";
        meta.appendChild(cleared);
    }

    if (message.isPinned) {
        const pin = document.createElement("i");
        pin.className = "fa-solid fa-thumbtack message-pin-indicator";
        meta.appendChild(pin);
    }

    if (message.sent) {
        const status = document.createElement("i");
        const userRead = !!(currentChat && currentChat.userLastReadAt) &&
            new Date(message.createdAt).getTime() <= new Date(currentChat.userLastReadAt).getTime();
        status.className = (userRead ? "fa-solid fa-check-double" : "fa-solid fa-check") + " msg-tick";
        if (!userRead) status.style.color = "#94a3b8";
        meta.appendChild(status);
    }

    content.appendChild(meta);
    wrapper.appendChild(content);

    setupMessageActionEvents(wrapper, message.id);

    return wrapper;

}

function scrollMessagesToBottom() {

    const container = supportChatElement("messages");
    if (container) container.scrollTop = container.scrollHeight;

}


// ======================================================
// COMPOSER — SEND / REPLY / EDIT
// ======================================================

function getMessageInput() {
    return supportChatElement("messageInput");
}

function getMessageText() {

    const input = getMessageInput();
    if (!input) return "";

    return String(input.value || "").trim();

}

function clearMessageInput() {

    const input = getMessageInput();
    if (!input) return;

    input.value = "";
    input.dataset.editing = "false";
    delete input.dataset.editingMessageId;
    input.focus();

}

function messageInputHasText() {
    return getMessageText().length > 0;
}

function setupComposerEvents() {

    const input = getMessageInput();
    if (!input) return;

    input.addEventListener("keydown", handleMessageInputKeydown);

    input.addEventListener("input", function () {

        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 120) + "px";

        if (input.value.trim().length > 0) sendTypingSignal();

    });

}

function handleMessageInputKeydown(event) {

    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }

}

function isEditingMessage() {
    return !!editingMessage;
}

function sendMessage() {

    if (isEditingMessage()) {
        saveEditedMessage();
        return;
    }

    if (!currentChat) return;

    const text = getMessageText();
    if (!text) return;

    const replyToId = replyingToMessage ? replyingToMessage.id : null;

    clearMessageInput();
    cancelReply();

    sb.from("support_messages")
        .insert({
            conversation_id: currentChat.id,
            sender_type: "admin",
            sender_id: supportAdminId,
            content: text,
            reply_to_id: replyToId
        })
        .select("*")
        .single()
        .then(function (res) {

            if (res.error) {
                KTUI.notify("Failed to send message: " + res.error.message);
                return;
            }

            if (!currentChat.messages.some(function (m) { return m.id === res.data.id; })) {
                currentChat.messages.push(mapSupportMessageRow(res.data));
                renderMessages();
                scrollMessagesToBottom();
            }

            loadSupportConversations();

        });

}


// ======================================================
// REPLY
// ======================================================

function replyToMessage(messageId) {

    if (!currentChat) return;

    const message = currentChat.messages.find(function (item) { return item.id === messageId; });
    if (!message) return;
    if (message.deletedBy || message.clearedBy) return;

    if (editingMessage) cancelEditMessage();

    replyingToMessage = message;
    showReplyPreview(message);

    const input = getMessageInput();
    if (input) input.focus();

}

function showReplyPreview(message) {

    const preview = supportChatElement("replyPreview");
    if (!preview) return;

    const textElement = supportChatElement("replyMessage");
    const senderElement = supportChatElement("replyUser");

    if (senderElement) senderElement.textContent = message.sent ? "You" : (message.senderName || "User");
    if (textElement) textElement.textContent = message.text || "";

    preview.dataset.messageId = message.id;
    preview.classList.remove("hidden");

}

function closeReplyPreview() {

    const preview = supportChatElement("replyPreview");
    if (!preview) return;

    preview.classList.add("hidden");
    delete preview.dataset.messageId;

}

function cancelReply() {

    replyingToMessage = null;
    closeReplyPreview();

}

function setupReplyPreviewEvents() {
    // Reply-preview cancel button already wired via onclick="cancelReply()" in HTML.
}

function findMessageElement(messageId) {
    return document.querySelector('.message[data-message-id="' + messageId + '"]');
}

let messageHighlightTimeout = null;
let highlightedMessageElement = null;

function scrollToMessage(messageId) {

    const element = findMessageElement(messageId);
    if (!element) return;

    element.scrollIntoView({ behavior: "smooth", block: "center" });

    if (highlightedMessageElement) {
        highlightedMessageElement.classList.remove("message-highlight");
    }

    element.classList.add("message-highlight");
    highlightedMessageElement = element;

    if (messageHighlightTimeout) clearTimeout(messageHighlightTimeout);

    messageHighlightTimeout = setTimeout(function () {
        element.classList.remove("message-highlight");
    }, 1600);

}

function openRepliedMessage(messageId) {
    scrollToMessage(messageId);
}


// ======================================================
// EDIT (admin's own sent messages only — enforced for
// real by a DB trigger too, not just this UI check)
// ======================================================

function startEditMessage(messageId) {

    if (!currentChat) return;

    const message = currentChat.messages.find(function (item) { return item.id === messageId; });
    if (!message) return;

    if (!message.sent) return;
    if (message.type === "voice") return;
    if (message.deletedBy || message.clearedBy) return;

    if (replyingToMessage) cancelReply();

    editingMessage = message;

    const input = supportChatElement("messageInput");
    if (!input) return;

    input.value = message.text || "";
    input.dataset.editing = "true";
    input.dataset.editingMessageId = message.id;

    showEditPreview(message);

    setTimeout(function () {
        input.focus();
        const length = input.value.length;
        if (typeof input.setSelectionRange === "function") {
            input.setSelectionRange(length, length);
        }
    }, 50);

    closeMessageActionMenu();
    closeChatMenu();

}

function showEditPreview(message) {

    const preview = supportChatElement("editPreview");
    if (!preview) return;

    const textElement = supportChatElement("editMessage");
    if (textElement) textElement.textContent = message.text || "";

    preview.classList.remove("hidden");

}

function cancelEditMessage() {

    editingMessage = null;

    const input = supportChatElement("messageInput");

    if (input) {
        input.dataset.editing = "false";
        delete input.dataset.editingMessageId;
        input.value = "";
    }

    const editPreview = supportChatElement("editPreview");

    if (editPreview) {
        editPreview.classList.add("hidden");
    }

}

function saveEditedMessage() {

    if (!editingMessage) return false;

    const input = supportChatElement("messageInput");
    if (!input) return false;

    const newText = input.value.trim();
    if (!newText) return false;

    if (newText === editingMessage.text) {
        cancelEditMessage();
        return false;
    }

    const messageId = editingMessage.id;

    sb.from("support_messages")
        .update({ content: newText })
        .eq("id", messageId)
        .select("*")
        .single()
        .then(function (res) {

            if (res.error) {
                KTUI.notify("Failed to save edit: " + res.error.message);
                return;
            }

            const target = currentChat && currentChat.messages.find(function (m) { return m.id === messageId; });

            if (target) {
                target.text = res.data.content;
                target.edited = !!res.data.edited_at;
                renderMessages();
            }

            KTUI.success("Message updated.");

            loadSupportConversations();

        });

    editingMessage = null;
    input.value = "";
    input.dataset.editing = "false";
    delete input.dataset.editingMessageId;

    const preview = supportChatElement("editPreview");
    if (preview) preview.classList.add("hidden");

    return true;

}


// ======================================================
// MESSAGE ACTION MENU (long-press / right-click on a message)
// ======================================================

let messageLongPressTimer = null;
let activeMessageActionMenu = null;
let activeActionMessageId = null;

function setupMessageActionEvents(wrapper, messageId) {

    let startX = 0;
    let startY = 0;

    function startTimer(x, y) {
        startX = x;
        startY = y;
        clearTimeout(messageLongPressTimer);
        messageLongPressTimer = setTimeout(function () {
            showMessageActionMenu(wrapper, messageId);
        }, CHAT_LONG_PRESS_DURATION);
    }

    function cancelTimer() {
        clearTimeout(messageLongPressTimer);
    }

    wrapper.addEventListener("mousedown", function (e) { startTimer(e.clientX, e.clientY); });
    wrapper.addEventListener("mouseup", cancelTimer);
    wrapper.addEventListener("mouseleave", cancelTimer);

    wrapper.addEventListener("touchstart", function (e) {
        const t = e.touches[0];
        startTimer(t.clientX, t.clientY);
    }, { passive: true });

    wrapper.addEventListener("touchmove", function (e) {
        const t = e.touches[0];
        if (Math.abs(t.clientX - startX) > CHAT_LONG_PRESS_MOVE_TOLERANCE ||
            Math.abs(t.clientY - startY) > CHAT_LONG_PRESS_MOVE_TOLERANCE) {
            cancelTimer();
        }
    }, { passive: true });

    wrapper.addEventListener("touchend", cancelTimer);
    wrapper.addEventListener("touchcancel", cancelTimer);

    wrapper.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        showMessageActionMenu(wrapper, messageId);
    });

}

function getMessageElement(target) {
    return target.closest(".message");
}

function getMessageId(messageElement) {
    return messageElement ? messageElement.dataset.messageId : null;
}

function closeMessageActionMenu() {

    if (activeMessageActionMenu) {
        activeMessageActionMenu.remove();
        activeMessageActionMenu = null;
    }

    activeActionMessageId = null;

    document.removeEventListener("click", closeMessageActionMenuOnOutsideClick);

}

function showMessageActionMenu(messageElement, messageId) {

    closeMessageActionMenu();

    if (!messageElement || !messageId) return;
    if (pinMessageSelectionMode) return;

    activeActionMessageId = messageId;

    const targetMessage = currentChat
        ? currentChat.messages.find(function (item) { return item.id === messageId; })
        : null;

    if (!targetMessage) return;

    // A message the other side deleted/cleared no longer exists on their
    // end, so it can still be read here but not edited or replied to.
    const isLocked = !!(targetMessage.deletedBy || targetMessage.clearedBy);

    const canEdit = targetMessage.sent && targetMessage.type !== "voice" && !isLocked;

    const editButtonMarkup = canEdit
        ? '<button type="button" data-action="edit"><i class="fa-solid fa-pen"></i><span>Edit</span></button>'
        : "";

    const replyButtonMarkup = !isLocked
        ? '<button type="button" data-action="reply"><i class="fa-solid fa-reply"></i><span>Reply</span></button>'
        : "";

    const pinLabel = targetMessage.isPinned ? "Unpin" : "Pin";
    const pinIcon = targetMessage.isPinned ? "fa-solid fa-thumbtack-slash" : "fa-solid fa-thumbtack";

    const menu = document.createElement("div");
    menu.className = "message-action-menu";

    menu.innerHTML =
        replyButtonMarkup +
        editButtonMarkup +
        '<button type="button" data-action="pin"><i class="' + pinIcon + '"></i><span>' + pinLabel + '</span></button>' +
        '<button type="button" data-action="copy"><i class="fa-solid fa-copy"></i><span>Copy</span></button>' +
        '<button type="button" data-action="delete"><i class="fa-solid fa-trash"></i><span>Delete</span></button>' +
        '<button type="button" data-action="close"><i class="fa-solid fa-xmark"></i><span>Close</span></button>';

    document.body.appendChild(menu);
    activeMessageActionMenu = menu;

    const rect = messageElement.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    let top = rect.top - menuRect.height - 8;
    let left = rect.left;

    if (top < 10) top = rect.bottom + 8;
    if (left + menuRect.width > window.innerWidth - 10) left = window.innerWidth - menuRect.width - 10;
    if (left < 10) left = 10;
    if (top + menuRect.height > window.innerHeight - 10) top = window.innerHeight - menuRect.height - 10;
    if (top < 10) top = 10;

    menu.style.position = "fixed";
    menu.style.top = top + "px";
    menu.style.left = left + "px";
    menu.style.zIndex = "999999";

    menu.addEventListener("click", function (event) {

        const button = event.target.closest("button");
        if (!button) return;

        const action = button.dataset.action;

        if (action === "close") {
            closeMessageActionMenu();
            return;
        }

        closeMessageActionMenu();

        if (action === "reply") { replyToMessage(messageId); return; }
        if (action === "edit") { startEditMessage(messageId); return; }
        if (action === "pin") { toggleSingleMessagePin(messageId, !targetMessage.isPinned); return; }
        if (action === "copy") { copyMessage(messageId); return; }
        if (action === "delete") { deleteMessage(messageId); return; }

    });

    setTimeout(function () {
        document.addEventListener("click", closeMessageActionMenuOnOutsideClick);
    }, 0);

}

function closeMessageActionMenuOnOutsideClick(event) {

    if (activeMessageActionMenu && !activeMessageActionMenu.contains(event.target)) {
        closeMessageActionMenu();
        document.removeEventListener("click", closeMessageActionMenuOnOutsideClick);
    }

}

function copyMessage(messageId) {

    const message = currentChat && currentChat.messages.find(function (m) { return m.id === messageId; });
    if (!message) return;

    const text = message.text || "";

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(function () { KTUI.success("Message copied."); })
            .catch(function () { fallbackCopyMessage(text); });
    } else {
        fallbackCopyMessage(text);
    }

}

function fallbackCopyMessage(text) {

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    let copied = false;
    try { copied = document.execCommand("copy"); } catch (e) { /* no-op */ }

    document.body.removeChild(textarea);

    if (copied) KTUI.success("Message copied.");
    else KTUI.warning("Could not copy the message. Press and hold the text to copy it.");

}


// ======================================================
// DELETE MESSAGE (shared confirm modal)
// ======================================================

function deleteMessage(messageId) {

    if (!currentChat) return;

    deleteActionType = "message";
    deleteActionId = messageId;

    const titleElement = supportChatElement("deleteConfirmTitle");
    const textElement = supportChatElement("deleteConfirmText");
    const confirmBtn = supportChatElement("confirmDeleteBtn");
    const modal = supportChatElement("deleteConfirmModal");

    if (titleElement) titleElement.textContent = "Delete Message?";
    if (textElement) textElement.textContent = "This will permanently delete this message. This action cannot be undone.";
    if (confirmBtn) confirmBtn.textContent = "Delete";
    if (modal) modal.classList.remove("hidden");

}

function closeDeleteConfirmation() {

    const modal = supportChatElement("deleteConfirmModal");
    if (modal) modal.classList.add("hidden");

    deleteActionType = null;
    deleteActionId = null;
    deleteActionIds = [];

}

function confirmDeleteAction() {

    // The modal stays open with a loading button until the request finishes.
    const confirmBtn = supportChatElement("confirmDeleteBtn");
    const cancelBtn = confirmBtn && confirmBtn.parentElement
        ? Array.prototype.find.call(confirmBtn.parentElement.querySelectorAll("button"), function (b) { return b !== confirmBtn; })
        : null;

    const done = KTUI.busy(
        confirmBtn,
        deleteActionType === "clearMessages" ? "Clearing..." : "Deleting...",
        [cancelBtn]
    );

    let work = null;

    if (deleteActionType === "message") {

        const messageId = deleteActionId;

        work = sb.rpc("support_delete_message", { p_message_id: messageId, p_side: "admin" }).then(function (res) {

            if (res.error) {
                KTUI.notify("Failed to delete message: " + res.error.message);
                return;
            }

            if (currentChat) {

                // Gone from admin's own view for good (the user still
                // sees it, marked deleted and locked from edit/reply).
                const index = currentChat.messages.findIndex(function (m) { return m.id === messageId; });
                if (index !== -1) currentChat.messages.splice(index, 1);

                if (replyingToMessage && replyingToMessage.id === messageId) cancelReply();
                if (editingMessage && editingMessage.id === messageId) cancelEditMessage();

                renderMessages();
                updatePinnedMessageBar();

            }

            KTUI.success("Message deleted.");

            loadSupportConversations();

        });

    } else if (deleteActionType === "chat") {

        const chatId = deleteActionId;

        work = sb.rpc("support_delete_chat", { p_conversation_id: chatId, p_side: "admin" }).then(function (res) {

            if (res.error) {
                KTUI.notify("Failed to delete conversation: " + res.error.message);
                return;
            }

            const index = individualChats.findIndex(function (c) { return c.id === chatId; });
            if (index !== -1) individualChats.splice(index, 1);

            if (currentChat && currentChat.id === chatId) closeChat();

            renderIndividualChats();
            updateUnreadCounts();

            KTUI.success("Conversation deleted.");

        });

    } else if (deleteActionType === "bulkChats") {

        const ids = deleteActionIds;

        work = Promise.all(ids.map(function (id) {
            return sb.rpc("support_delete_chat", { p_conversation_id: id, p_side: "admin" });
        })).then(function (results) {

            const failed = results.find(function (res) { return res.error; });

            if (failed) {
                KTUI.notify("Failed to delete conversations: " + failed.error.message);
            } else {
                KTUI.success(ids.length === 1 ? "Conversation deleted." : ids.length + " conversations deleted.");
            }

            individualChats = individualChats.filter(function (c) { return !ids.includes(c.id); });

            if (currentChat && ids.includes(currentChat.id)) closeChat();

            renderIndividualChats();
            updateUnreadCounts();
            exitChatSelectionMode();

        });

    } else if (deleteActionType === "clearMessages") {

        const chatId = deleteActionId;

        work = sb.rpc("support_clear_messages", { p_conversation_id: chatId, p_side: "admin" }).then(function (res) {

            if (res.error) {
                KTUI.notify("Failed to clear messages: " + res.error.message);
                return;
            }

            const chat = findIndividualChat(chatId);

            if (chat) {
                // Everything (notices included) is gone from admin's own
                // view for good.
                chat.messages = [];
            }

            if (currentChat && currentChat.id === chatId) {
                renderMessages();
                updatePinnedMessageBar();
            }

            KTUI.success("Messages cleared.");

            loadSupportConversations();

        });

    }

    const finish = function () {
        done();
        closeDeleteConfirmation();
    };

    if (!work) {
        finish();
        return;
    }

    work.then(finish, finish);

}



// ======================================================
// MARK UNREAD / CLEAR MESSAGES / DELETE CHAT
// ======================================================

function markChatUnread() {

    if (!currentChat) return;

    sb.from("support_conversations")
        .update({ admin_last_read_at: null })
        .eq("id", currentChat.id)
        .then(function (res) {

            if (res.error) {
                KTUI.notify("Failed to mark as unread: " + res.error.message);
                return;
            }

            KTUI.success("Marked as unread.");

            loadSupportConversations();

        });

    closeChatMenu();

}

function clearChatMessages() {

    if (!currentChat) return;

    closeChatMenu();

    deleteActionType = "clearMessages";
    deleteActionId = currentChat.id;

    const titleElement = supportChatElement("deleteConfirmTitle");
    const textElement = supportChatElement("deleteConfirmText");
    const confirmBtn = supportChatElement("confirmDeleteBtn");
    const modal = supportChatElement("deleteConfirmModal");

    if (titleElement) titleElement.textContent = "Clear Messages?";
    if (textElement) textElement.textContent = "All messages in this chat will be permanently deleted.";
    if (confirmBtn) confirmBtn.textContent = "Clear";
    if (modal) modal.classList.remove("hidden");

}

const CHAT_DELETE_BLOCKED_MESSAGE =
    "This user has requests you have not acted on yet. " +
    "Approve, reject or otherwise act on their requests first, then you can delete the chat.";

function deleteCurrentChat() {

    if (!currentChat) return;

    closeChatMenu();

    if (chatHasPendingRequests(currentChat)) {
        KTUI.alert(CHAT_DELETE_BLOCKED_MESSAGE, { title: "Chat can't be deleted" });
        return;
    }

    deleteActionType = "chat";
    deleteActionId = currentChat.id;

    const titleElement = supportChatElement("deleteConfirmTitle");
    const textElement = supportChatElement("deleteConfirmText");
    const confirmBtn = supportChatElement("confirmDeleteBtn");
    const modal = supportChatElement("deleteConfirmModal");

    if (titleElement) titleElement.textContent = "Delete Conversation?";
    if (textElement) textElement.textContent = "This will permanently delete your conversation with " + currentChat.name + ". This action cannot be undone.";
    if (confirmBtn) confirmBtn.textContent = "Delete";
    if (modal) modal.classList.remove("hidden");

}


// ======================================================
// PIN MESSAGES
// ======================================================

function getPinnedMessages() {

    if (!currentChat) return [];

    return currentChat.messages.filter(function (m) { return m.isPinned; });

}

function openPinMessages() {

    closeChatMenu();

    const modal = supportChatElement("pinMessagesModal");
    if (modal) modal.classList.remove("hidden");

}

function closePinMessages() {

    const modal = supportChatElement("pinMessagesModal");
    if (modal) modal.classList.add("hidden");

}

function openWritePinMessage() {

    closePinMessages();

    const modal = supportChatElement("writePinMessageModal");
    const input = supportChatElement("pinMessageInput");

    if (input) input.value = "";

    updatePinMessageCharacterCount();

    if (modal) modal.classList.remove("hidden");

}

function closeWritePinMessage() {

    const modal = supportChatElement("writePinMessageModal");
    if (modal) modal.classList.add("hidden");

}

function updatePinMessageCharacterCount() {

    const input = supportChatElement("pinMessageInput");
    const counter = supportChatElement("pinMessageCharacterCount");

    if (input && counter) counter.textContent = input.value.length;

}

function setupPinMessageInput() {

    const input = supportChatElement("pinMessageInput");

    if (input) {
        input.addEventListener("input", updatePinMessageCharacterCount);
    }

}

function createPinnedMessage() {

    if (!currentChat) return;

    const input = supportChatElement("pinMessageInput");
    const text = input ? input.value.trim() : "";

    if (!text) return;

    const done = KTUI.busy(document.querySelector('[onclick*="createPinnedMessage"]'), "Pinning...");

    sb.from("support_messages")
        .insert({
            conversation_id: currentChat.id,
            sender_type: "admin",
            sender_id: supportAdminId,
            content: text,
            is_pinned: true,
            pinned_at: new Date().toISOString(),
            pinned_by: supportAdminId
        })
        .select("*")
        .single()
        .then(function (res) {

            done();

            if (res.error) {
                KTUI.notify("Failed to pin message: " + res.error.message);
                return;
            }

            currentChat.messages.push(mapSupportMessageRow(res.data));

            renderMessages();
            updatePinnedMessageBar();
            scrollMessagesToBottom();

            closeWritePinMessage();
            KTUI.success("Message pinned.");
            loadSupportConversations();

        });

}

function startSelectPinnedMessages() {

    closePinMessages();

    pinMessageSelectionMode = true;
    selectedPinMessageIds = [];

    renderMessages();
    updatePinMessageSelectionBar();

}

function cancelPinMessageSelection() {

    pinMessageSelectionMode = false;
    selectedPinMessageIds = [];

    renderMessages();
    updatePinMessageSelectionBar();

}

function setupPinSelectionOutsideClick() {
    // Selection is exited explicitly (Cancel / Pin buttons) — no outside-click needed.
}

function togglePinMessageSelection(messageId) {

    const index = selectedPinMessageIds.indexOf(messageId);

    if (index === -1) {
        selectedPinMessageIds.push(messageId);
    } else {
        selectedPinMessageIds.splice(index, 1);
    }

    renderMessages();
    updatePinMessageSelectionBar();

}

function updatePinMessageSelectionBar() {

    const bar = supportChatElement("pinMessageSelectionBar");
    const countLabel = supportChatElement("selectedPinMessageCount");

    if (bar) bar.classList.toggle("hidden", !pinMessageSelectionMode);
    if (countLabel) countLabel.textContent = selectedPinMessageIds.length;

}

function pinSelectedMessages() {

    if (selectedPinMessageIds.length === 0) {
        cancelPinMessageSelection();
        return;
    }

    const ids = selectedPinMessageIds;

    const done = KTUI.busy(document.querySelector('[onclick*="pinSelectedMessages"]'), "Pinning...");

    sb.from("support_messages")
        .update({ is_pinned: true, pinned_at: new Date().toISOString(), pinned_by: supportAdminId })
        .in("id", ids)
        .then(function (res) {

            done();

            if (res.error) {
                KTUI.notify("Failed to pin messages: " + res.error.message);
                return;
            }

            currentChat.messages.forEach(function (m) {
                if (ids.includes(m.id)) m.isPinned = true;
            });

            cancelPinMessageSelection();
            updatePinnedMessageBar();

            KTUI.success(ids.length === 1 ? "Message pinned." : ids.length + " messages pinned.");

        });

}

function toggleSingleMessagePin(messageId, pin) {

    sb.from("support_messages")
        .update(pin
            ? { is_pinned: true, pinned_at: new Date().toISOString(), pinned_by: supportAdminId }
            : { is_pinned: false, pinned_at: null, pinned_by: null })
        .eq("id", messageId)
        .then(function (res) {

            if (res.error) {
                KTUI.notify("Failed to update pin: " + res.error.message);
                return;
            }

            const target = currentChat && currentChat.messages.find(function (m) { return m.id === messageId; });
            if (target) target.isPinned = pin;

            renderMessages();
            updatePinnedMessageBar();

            KTUI.success(pin ? "Message pinned." : "Message unpinned.");

        });

}

function unpinCurrentPinnedMessage() {

    const pinned = getPinnedMessages();
    const message = pinned[currentPinnedMessageIndex];

    if (!message) return;

    toggleSingleMessagePin(message.id, false);

}

function updatePinnedMessageBar() {

    const bar = supportChatElement("pinnedMessageBar");
    const textEl = supportChatElement("pinnedMessageText");
    const counterEl = supportChatElement("pinnedMessageCounter");
    const pinText = supportChatElement("messagePinText");

    const pinned = getPinnedMessages();

    if (pinText) pinText.textContent = pinned.length > 0 ? "Pinned Messages (" + pinned.length + ")" : "Pin Messages";

    if (!bar) return;

    if (pinned.length === 0) {
        bar.classList.add("hidden");
        currentPinnedMessageIndex = 0;
        return;
    }

    bar.classList.remove("hidden");

    if (currentPinnedMessageIndex >= pinned.length) {
        currentPinnedMessageIndex = pinned.length - 1;
    }

    const current = pinned[currentPinnedMessageIndex];

    if (textEl) textEl.textContent = current.text || "";
    if (counterEl) counterEl.textContent = (currentPinnedMessageIndex + 1) + " of " + pinned.length;

}

function nextPinnedMessage() {

    const pinned = getPinnedMessages();
    if (pinned.length === 0) return;

    currentPinnedMessageIndex = (currentPinnedMessageIndex + 1) % pinned.length;
    updatePinnedMessageBar();
    scrollToCurrentPinnedMessage();

}

function previousPinnedMessage() {

    const pinned = getPinnedMessages();
    if (pinned.length === 0) return;

    currentPinnedMessageIndex = (currentPinnedMessageIndex - 1 + pinned.length) % pinned.length;
    updatePinnedMessageBar();
    scrollToCurrentPinnedMessage();

}

function scrollToCurrentPinnedMessage() {

    const pinned = getPinnedMessages();
    const message = pinned[currentPinnedMessageIndex];

    if (message) scrollToMessage(message.id);

}


// ======================================================
// MESSAGE SEARCH (within the open chat)
// ======================================================

function searchMessages() {

    closeChatMenu();

    messageSearchActive = true;
    messageSearchQuery = "";
    messageSearchResults = [];
    currentMessageSearchIndex = -1;

    const bar = supportChatElement("messageSearchBar");
    const input = supportChatElement("messageSearchInput");

    if (bar) bar.classList.remove("hidden");
    if (input) { input.value = ""; input.focus(); }

}

function closeMessageSearch() {

    messageSearchActive = false;
    messageSearchQuery = "";
    messageSearchResults = [];
    currentMessageSearchIndex = -1;

    const bar = supportChatElement("messageSearchBar");
    if (bar) bar.classList.add("hidden");

    renderMessages();

}

function setupMessageSearchEvents() {

    const input = supportChatElement("messageSearchInput");

    if (input) {
        let searchNoticeTimer = null;

        input.addEventListener("input", function () {
            messageSearchQuery = input.value;
            performMessageSearch();

            clearTimeout(searchNoticeTimer);
            searchNoticeTimer = setTimeout(function () {
                if (messageSearchQuery.trim() && messageSearchResults.length === 0) {
                    KTUI.info("No messages match your search.");
                }
            }, 700);
        });
    }

}

function performMessageSearch() {

    if (!currentChat) return;

    const query = messageSearchQuery.trim().toLowerCase();

    document.querySelectorAll("#messages .message-text").forEach(function (el) {
        el.innerHTML = supportEscapeHtml(el.textContent);
    });

    if (!query) {
        messageSearchResults = [];
        currentMessageSearchIndex = -1;
        return;
    }

    messageSearchResults = currentChat.messages
        .filter(function (m) { return (m.text || "").toLowerCase().includes(query); })
        .map(function (m) { return m.id; });

    currentMessageSearchIndex = messageSearchResults.length > 0 ? 0 : -1;

    messageSearchResults.forEach(function (id) {
        const el = findMessageElement(id);
        const textEl = el ? el.querySelector(".message-text") : null;
        if (textEl) highlightMessageText(textEl, query);
    });

    scrollToMessageSearchResult();

}

function highlightMessageText(textEl, query) {

    const original = textEl.textContent;
    const lower = original.toLowerCase();
    const index = lower.indexOf(query);

    if (index === -1) return;

    textEl.innerHTML =
        supportEscapeHtml(original.slice(0, index)) +
        '<mark class="message-search-highlight">' + supportEscapeHtml(original.slice(index, index + query.length)) + '</mark>' +
        supportEscapeHtml(original.slice(index + query.length));

}

function scrollToMessageSearchResult() {

    if (currentMessageSearchIndex === -1) return;

    const id = messageSearchResults[currentMessageSearchIndex];
    if (id) scrollToMessage(id);

}

function nextMessageSearchResult() {

    if (messageSearchResults.length === 0) return;

    currentMessageSearchIndex = (currentMessageSearchIndex + 1) % messageSearchResults.length;
    scrollToMessageSearchResult();

}

function previousMessageSearchResult() {

    if (messageSearchResults.length === 0) return;

    currentMessageSearchIndex = (currentMessageSearchIndex - 1 + messageSearchResults.length) % messageSearchResults.length;
    scrollToMessageSearchResult();

}


// ======================================================
// ATTACHMENTS (real upload to the "support-chat" storage bucket)
// ======================================================

function toggleAttachmentMenu() {

    attachmentMenuOpen = !attachmentMenuOpen;

    const menu = supportChatElement("attachmentMenu");
    if (menu) menu.classList.toggle("hidden", !attachmentMenuOpen);

}

function closeAttachmentMenu() {

    attachmentMenuOpen = false;

    const menu = supportChatElement("attachmentMenu");
    if (menu) menu.classList.add("hidden");

}

function attachPhoto() {

    closeAttachmentMenu();

    const input = supportChatElement("photoInput");
    if (input) input.click();

}

function attachDocument() {

    closeAttachmentMenu();

    const input = supportChatElement("documentInput");
    if (input) input.click();

}

function attachCamera() {

    closeAttachmentMenu();

    const input = supportChatElement("cameraInput");
    if (input) input.click();

}

function setupAttachmentEvents() {

    const photoInput = supportChatElement("photoInput");
    const documentInput = supportChatElement("documentInput");
    const cameraInput = supportChatElement("cameraInput");

    if (photoInput) photoInput.addEventListener("change", function (e) { handleAttachmentFileChange(e, "photo"); });
    if (documentInput) documentInput.addEventListener("change", function (e) { handleAttachmentFileChange(e, "document"); });
    if (cameraInput) cameraInput.addEventListener("change", function (e) { handleAttachmentFileChange(e, "camera"); });

    document.addEventListener("click", function (event) {

        if (!attachmentMenuOpen) return;

        const menu = supportChatElement("attachmentMenu");
        const btn = document.querySelector('[onclick="toggleAttachmentMenu()"]');

        if (menu && (menu.contains(event.target) || (btn && btn.contains(event.target)))) return;

        closeAttachmentMenu();

    });

}

function handleAttachmentFileChange(event, kind) {

    const file = event.target.files && event.target.files[0];
    event.target.value = "";

    if (!file) return;

    if (!currentChat) {
        KTUI.notify("Open a conversation first.");
        return;
    }

    uploadAndSendAttachment(file, kind);

}

function uploadAndSendAttachment(file, kind) {

    const path = currentChat.id + "/" + Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");

    sb.storage.from("support-chat").upload(path, file).then(function (uploadRes) {

        if (uploadRes.error) {
            KTUI.notify("Failed to upload file: " + uploadRes.error.message);
            return;
        }

        const publicUrlRes = sb.storage.from("support-chat").getPublicUrl(path);
        const url = publicUrlRes.data.publicUrl;

        const label =
            (kind === "camera" ? "📷 " : kind === "document" ? "📎 " : "🖼️ ") + file.name;

        sb.from("support_messages")
            .insert({
                conversation_id: currentChat.id,
                sender_type: "admin",
                sender_id: supportAdminId,
                content: label,
                message_type: kind === "document" ? "document" : "photo",
                attachment_url: url,
                attachment_name: file.name,
                attachment_mime: file.type
            })
            .select("*")
            .single()
            .then(function (res) {

                if (res.error) {
                    KTUI.notify("Failed to send attachment: " + res.error.message);
                    return;
                }

                currentChat.messages.push(mapSupportMessageRow(res.data));
                renderMessages();
                scrollMessagesToBottom();
                loadSupportConversations();

            });

    });

}


// ======================================================
// VOICE MESSAGE (real recording, real upload)
// ======================================================

function startVoiceMessage() {

    if (isRecordingVoice) {
        stopVoiceRecording(true);
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        KTUI.notify("Voice recording is not supported in this browser.");
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {

        voiceStream = stream;
        voiceRecordedChunks = [];

        voiceMediaRecorder = new MediaRecorder(stream);

        voiceMediaRecorder.addEventListener("dataavailable", function (e) {
            if (e.data && e.data.size > 0) voiceRecordedChunks.push(e.data);
        });

        voiceMediaRecorder.addEventListener("stop", function () {

            const blob = new Blob(voiceRecordedChunks, { type: "audio/webm" });

            voiceStream.getTracks().forEach(function (track) { track.stop(); });
            voiceStream = null;

            if (blob.size > 0 && currentChat) {
                uploadAndSendVoiceMessage(blob);
            }

        });

        voiceMediaRecorder.start();
        isRecordingVoice = true;

        const btn = supportChatElement("voiceMessageBtn");
        if (btn) btn.classList.add("recording");

    }).catch(function () {
        KTUI.notify("Microphone access was denied.");
    });

}

function stopVoiceRecording() {

    if (voiceMediaRecorder && isRecordingVoice) {
        voiceMediaRecorder.stop();
    }

    isRecordingVoice = false;

    const btn = supportChatElement("voiceMessageBtn");
    if (btn) btn.classList.remove("recording");

}

function uploadAndSendVoiceMessage(blob) {

    const path = currentChat.id + "/" + Date.now() + "-voice.webm";

    sb.storage.from("support-chat").upload(path, blob, { contentType: "audio/webm" }).then(function (uploadRes) {

        if (uploadRes.error) {
            KTUI.notify("Failed to upload voice message: " + uploadRes.error.message);
            return;
        }

        const publicUrlRes = sb.storage.from("support-chat").getPublicUrl(path);
        const url = publicUrlRes.data.publicUrl;

        sb.from("support_messages")
            .insert({
                conversation_id: currentChat.id,
                sender_type: "admin",
                sender_id: supportAdminId,
                content: "🎤 Voice message",
                message_type: "voice",
                attachment_url: url,
                attachment_name: "voice-message.webm",
                attachment_mime: "audio/webm"
            })
            .select("*")
            .single()
            .then(function (res) {

                if (res.error) {
                    KTUI.notify("Failed to send voice message: " + res.error.message);
                    return;
                }

                currentChat.messages.push(mapSupportMessageRow(res.data));
                renderMessages();
                scrollMessagesToBottom();
                loadSupportConversations();

            });

    });

}


// ======================================================
// NEW CHAT MODAL
// ======================================================

function openNewChatModal() {

    const modal = supportChatElement("newChatModal");
    const input = supportChatElement("userSearchInput");

    if (input) input.value = "";

    sb.from("profiles")
        .select("id, username, surname, phone")
        .order("username", { ascending: true })
        .then(function (res) {

            if (res.error) {
                console.error("Failed to load users:", res.error);
                KTUI.notify("Failed to load users: " + res.error.message);
                return;
            }

            supportChatUsers = (res.data || []).map(function (row) {
                return { id: row.id, name: fullNameOf(row), phone: row.phone };
            });

            renderAvailableUsers("");

        });

    if (modal) modal.classList.remove("hidden");

}

function closeNewChatModal() {

    const modal = supportChatElement("newChatModal");
    if (modal) modal.classList.add("hidden");

}

function renderAvailableUsers(query) {

    const container = supportChatElement("availableUsers");
    if (!container) return;

    const search = (query || "").trim().toLowerCase();

    let users = supportChatUsers;

    if (search) {
        users = users.filter(function (u) {
            return u.name.toLowerCase().includes(search) || String(u.phone || "").toLowerCase().includes(search);
        });
    }

    if (users.length === 0) {
        container.innerHTML = '<p class="available-users-empty">No users found.</p>';
        return;
    }

    container.innerHTML = users.map(function (u) {

        return (
            '<div class="available-user" onclick="startNewConversation(\'' + u.id + '\')">' +
                '<div class="chat-list-avatar">' + supportEscapeHtml(getInitials(u.name)) + '</div>' +
                '<div>' +
                    '<h5>' + supportEscapeHtml(u.name) + '</h5>' +
                    '<p>' + supportEscapeHtml(u.phone || "") + '</p>' +
                '</div>' +
            '</div>'
        );

    }).join("");

}

function startNewConversation(userId) {

    // Check the DATABASE directly, not the local (already-filtered)
    // list — a conversation this admin previously deleted is hidden
    // from individualChats but still exists, and must be reused
    // (un-hidden) rather than duplicated.
    sb.from("support_conversations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .then(function (res) {

            if (res.error) {
                KTUI.notify("Failed to start conversation: " + res.error.message);
                return;
            }

            const existingRow = res.data && res.data.length > 0 ? res.data[0] : null;

            if (existingRow) {

                closeNewChatModal();

                if (existingRow.hidden_from_admin) {

                    sb.from("support_conversations")
                        .update({ hidden_from_admin: false })
                        .eq("id", existingRow.id)
                        .then(function (unhideRes) {

                            if (unhideRes.error) {
                                KTUI.notify("Failed to reopen conversation: " + unhideRes.error.message);
                                return;
                            }

                            loadSupportConversations(function () {
                                openIndividualChat(existingRow.id);
                            });

                        });

                } else {

                    loadSupportConversations(function () {
                        openIndividualChat(existingRow.id);
                    });

                }

                return;

            }

            sb.from("support_conversations")
                .insert({ user_id: userId, status: "open", assigned_admin: supportAdminId })
                .select("*")
                .single()
                .then(function (insertRes) {

                    if (insertRes.error) {
                        KTUI.notify("Failed to start conversation: " + insertRes.error.message);
                        return;
                    }

                    closeNewChatModal();

                    loadSupportConversations(function () {
                        openIndividualChat(insertRes.data.id);
                    });

                });

        });

}


// ======================================================
// USER PROFILE MODAL
// ======================================================

function openCurrentProfile() {

    if (!currentChat) return;

    const modal = supportChatElement("userProfileModal");
    if (modal) modal.dataset.profileUserId = currentChat.userId;

    populateUserProfileModal(currentChat.userId, currentChat.name);

    if (modal) modal.classList.remove("hidden");

}

function closeUserProfile() {

    const modal = supportChatElement("userProfileModal");
    if (modal) modal.classList.add("hidden");

}

function populateUserProfileModal(userId, fallbackName) {

    const nameEl = supportChatElement("profileName");
    const avatarEl = supportChatElement("profileAvatar");
    const statusEl = supportChatElement("profileAccountStatus");

    if (nameEl) nameEl.textContent = fallbackName || "User";
    if (avatarEl) avatarEl.textContent = getInitials(fallbackName);

    [
        "profileEmail", "profilePhone", "profileJoined", "profileVerification",
        "profileBalance", "profileDeposited", "profileWithdrawn", "profilePlan"
    ].forEach(function (id) {
        const el = supportChatElement(id);
        if (el) el.textContent = "—";
    });

    sb.rpc("admin_get_support_user_profile", { p_user_id: userId }).then(function (res) {

        if (res.error || !res.data || res.data.length === 0) {
            console.error("Failed to load user profile:", res.error);
            return;
        }

        const p = res.data[0];

        const fullName = (p.username + " " + (p.surname || "")).trim();

        if (nameEl) nameEl.textContent = fullName || fallbackName;
        if (avatarEl) avatarEl.textContent = getInitials(fullName || fallbackName);

        if (statusEl) {
            statusEl.textContent = p.is_blocked ? "Blocked" : "Active";
            statusEl.className = "profile-status " + (p.is_blocked ? "blocked" : "active");
        }

        setText("profileEmail", p.email || "—");
        setText("profilePhone", p.phone || "—");
        setText("profileJoined", p.created_at ? new Date(p.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—");
        setText("profileVerification", p.kyc_status ? (p.kyc_status.charAt(0).toUpperCase() + p.kyc_status.slice(1)) : "Not submitted");

        setText("profileBalance", "R" + Number(p.balance_zar || 0).toFixed(2));
        setText("profileDeposited", "R" + Number(p.total_deposited_zar || 0).toFixed(2));
        setText("profileWithdrawn", "R" + Number(p.total_withdrawn_zar || 0).toFixed(2));
        setText("profilePlan", p.active_plan_name || "None");

    });

}

function setText(id, value) {

    const el = supportChatElement(id);
    if (el) el.textContent = value;

}

function goToAdminUserRecord(page, userId) {

    if (!userId) return;

    sessionStorage.setItem("pendingProfileUserId", userId);

    closeUserProfile();

    if (typeof loadAdminPage === "function") {
        loadAdminPage(page);
    } else {
        console.warn("loadAdminPage() is not defined — make sure admin.js is loaded before support-chat.js.");
    }

}

function viewFullUserProfile() {

    const modal = supportChatElement("userProfileModal");
    const userId = modal ? modal.dataset.profileUserId : null;

    goToAdminUserRecord("users", userId);

}

function deleteChatFromProfile() {

    deleteCurrentChat();
    closeUserProfile();

}


// ======================================================
// BULK SELECTION (long-press a chat: delete or priority,
// in bulk, across multiple chats)
// ======================================================

function attachChatPressHandlers(item, chatId, onTap) {

    let pressTimer = null;
    let pressFired = false;
    let pressStartX = 0;
    let pressStartY = 0;

    function clearPressTimer() {
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    }

    function startPress(clientX, clientY) {

        clearPressTimer();
        pressFired = false;
        pressStartX = clientX;
        pressStartY = clientY;

        pressTimer = setTimeout(function () {
            pressFired = true;
            pressTimer = null;
            handleChatLongPress(chatId);
        }, CHAT_LONG_PRESS_DURATION);

    }

    function endPress() {
        clearPressTimer();
    }

    item.addEventListener("mousedown", function (e) { startPress(e.clientX, e.clientY); });
    item.addEventListener("mouseup", endPress);
    item.addEventListener("mouseleave", endPress);

    item.addEventListener("touchstart", function (e) {
        const t = e.touches[0];
        startPress(t.clientX, t.clientY);
    }, { passive: true });

    item.addEventListener("touchend", endPress);
    item.addEventListener("touchcancel", endPress);

    item.addEventListener("touchmove", function (e) {
        const t = e.touches[0];
        if (Math.abs(t.clientX - pressStartX) > CHAT_LONG_PRESS_MOVE_TOLERANCE ||
            Math.abs(t.clientY - pressStartY) > CHAT_LONG_PRESS_MOVE_TOLERANCE) {
            endPress();
        }
    }, { passive: true });

    item.addEventListener("click", function (event) {

        event.preventDefault();

        if (pressFired) { pressFired = false; return; }

        if (chatSelectionMode) {
            toggleChatSelection(chatId);
            return;
        }

        onTap();

    });

}

function handleChatLongPress(chatId) {

    chatSelectionMode = true;

    if (!selectedChatIds.includes(chatId)) {
        selectedChatIds.push(chatId);
    }

    refreshChatSelectionUI();

    if (pendingBulkAction === null) {
        openChatActionsModal(chatId);
    }

}

function toggleChatSelection(chatId) {

    const index = selectedChatIds.indexOf(chatId);

    if (index === -1) {
        selectedChatIds.push(chatId);
    } else {
        selectedChatIds.splice(index, 1);
    }

    if (selectedChatIds.length === 0) {
        exitChatSelectionMode();
        return;
    }

    refreshChatSelectionUI();

}

function refreshChatSelectionUI() {

    const bar = supportChatElement("chatSelectionBar");
    const countLabel = supportChatElement("chatSelectionCount");

    if (bar) bar.classList.toggle("hidden", !(chatSelectionMode && selectedChatIds.length > 0));
    if (countLabel) countLabel.textContent = selectedChatIds.length + " selected";

    const priorityBtn = supportChatElement("chatSelectionPriorityBtn");
    const deleteBtn = supportChatElement("chatSelectionDeleteBtn");

    if (priorityBtn) priorityBtn.classList.toggle("hidden", pendingBulkAction === "delete");
    if (deleteBtn) deleteBtn.classList.toggle("hidden", pendingBulkAction === "priority");

    renderIndividualChats();

}

function exitChatSelectionMode() {

    chatSelectionMode = false;
    selectedChatIds = [];
    pendingBulkAction = null;
    pendingPriorityMode = null;

    const bar = supportChatElement("chatSelectionBar");
    if (bar) bar.classList.add("hidden");

    renderIndividualChats();

}

function openChatActionsModal(chatId) {

    const modal = supportChatElement("chatActionsModal");
    const priorityBtn = supportChatElement("chatActionsPriorityBtn");

    const chat = findIndividualChat(chatId);

    if (!modal || !chat) return;

    modal.dataset.chatId = chatId;

    // Update the button depending on the current priority state
    if (priorityBtn) {

        if (chat.priority) {

            priorityBtn.innerHTML =
                '<i class="fa-solid fa-star"></i> Remove Priority';

            priorityBtn.classList.add("remove-priority-action");

        } else {

            priorityBtn.innerHTML =
                '<i class="fa-solid fa-star"></i> Add Priority';

            priorityBtn.classList.remove("remove-priority-action");

        }

    }

    modal.classList.remove("hidden");

}

function closeChatActionsModal() {

    const modal = supportChatElement("chatActionsModal");
    if (modal) modal.classList.add("hidden");

}

function chooseBulkDeleteMode() {

    pendingBulkAction = "delete";
    closeChatActionsModal();
    refreshChatSelectionUI();

}

function resetPrioritySelectionStar() {

    const priorityBtn = supportChatElement("chatSelectionPriorityBtn");

    if (!priorityBtn) return;

    const star = priorityBtn.querySelector("i.fa-star");

    if (star) {
        star.style.color = "";
    }

}

function chooseBulkPriorityMode() {

    const modal = supportChatElement("chatActionsModal");
    const anchorChatId = modal ? modal.dataset.chatId : null;
    const anchorChat = findIndividualChat(anchorChatId);

    pendingBulkAction = "priority";
    pendingPriorityMode = anchorChat && anchorChat.priority ? "remove" : "add";

    // =========================================
// TEMPORARY PRIORITY STAR COLOR
// =========================================

const priorityBtn =
    supportChatElement("chatSelectionPriorityBtn");

if (priorityBtn) {

    const star = priorityBtn.querySelector("i.fa-star");

    if (star) {

        if (pendingPriorityMode === "add") {

            star.style.color = "#FDB913";

        } else {

            star.style.color = "";

        }

    }

}
  
    closeChatActionsModal();
    refreshChatSelectionUI();

}

function confirmDeleteSelectedChats() {

    if (selectedChatIds.length === 0) return;

    // Chats of users with requests that are still waiting for the admin can't be deleted.
    const blockedIds = selectedChatIds.filter(function (id) {
        return chatHasPendingRequests(findIndividualChat(id));
    });

    const deletableIds = selectedChatIds.filter(function (id) {
        return blockedIds.indexOf(id) === -1;
    });

    if (blockedIds.length > 0) {

        if (deletableIds.length === 0) {
            KTUI.alert(
                blockedIds.length === 1
                    ? CHAT_DELETE_BLOCKED_MESSAGE
                    : "These users have requests you have not acted on yet, so their chats can't be deleted. Act on their requests first.",
                { title: "Chats can't be deleted" }
            );
            return;
        }

        KTUI.warning(
            blockedIds.length + (blockedIds.length === 1 ? " chat was" : " chats were") +
            " skipped because the user has requests you have not acted on yet."
        );

    }

    deleteActionType = "bulkChats";
    deleteActionIds = [...deletableIds];

    const titleElement = supportChatElement("deleteConfirmTitle");
    const textElement = supportChatElement("deleteConfirmText");
    const confirmBtn = supportChatElement("confirmDeleteBtn");
    const modal = supportChatElement("deleteConfirmModal");

    if (titleElement) titleElement.textContent = "Delete " + deletableIds.length + " Conversation" + (deletableIds.length === 1 ? "" : "s") + "?";
    if (textElement) textElement.textContent = "This will permanently delete the selected conversations. This action cannot be undone.";
    if (confirmBtn) confirmBtn.textContent = "Delete";
    if (modal) modal.classList.remove("hidden");

}

function closePriorityConfirmation() {

    const modal = supportChatElement("priorityConfirmModal");
    if (modal) modal.classList.add("hidden");

   resetPrioritySelectionStar();

}

function confirmPrioritySelectedChats() {

    if (selectedChatIds.length === 0) return;

    if (pendingBulkAction !== "priority") {

        const anchorChat = findIndividualChat(selectedChatIds[selectedChatIds.length - 1]);
        pendingPriorityMode = anchorChat && anchorChat.priority ? "remove" : "add";
        pendingBulkAction = "priority";

    }

    const titleElement = supportChatElement("priorityConfirmTitle");
    const textElement = supportChatElement("priorityConfirmText");
    const modal = supportChatElement("priorityConfirmModal");

    const verb = pendingPriorityMode === "remove" ? "remove from" : "add to";

    if (titleElement) titleElement.textContent = "Update Priority?";
    if (textElement) textElement.textContent = "This will " + verb + " priority for " + selectedChatIds.length + " conversation" + (selectedChatIds.length === 1 ? "" : "s") + ".";
    if (modal) modal.classList.remove("hidden");

}

function confirmPriorityAction() {

    const ids = [...selectedChatIds];
    const makePriority = pendingPriorityMode !== "remove";

    const priorityBtn = supportChatElement("confirmPriorityBtn");
    const priorityCancel = priorityBtn && priorityBtn.parentElement
        ? Array.prototype.find.call(priorityBtn.parentElement.querySelectorAll("button"), function (b) { return b !== priorityBtn; })
        : null;
    const done = KTUI.busy(priorityBtn, "Updating...", [priorityCancel]);

    sb.from("support_conversations")
        .update({ priority: makePriority })
        .in("id", ids)
        .then(function (res) {

            done();

            if (res.error) {
                KTUI.notify("Failed to update priority: " + res.error.message);
                return;
            }

            ids.forEach(function (id) {
                const chat = findIndividualChat(id);
                if (chat) chat.priority = makePriority;
            });

            renderIndividualChats();
            exitChatSelectionMode();
            closePriorityConfirmation();

            KTUI.success(
                makePriority
                    ? (ids.length === 1 ? "Marked as priority." : ids.length + " chats marked as priority.")
                    : (ids.length === 1 ? "Priority removed." : "Priority removed from " + ids.length + " chats.")
            );

        });

}

function setupChatSelectionOutsideClick() {

    document.addEventListener("click", function (event) {

        if (!chatSelectionMode) return;

        const bar = supportChatElement("chatSelectionBar");
        const actionsModal = supportChatElement("chatActionsModal");
        const deleteModal = supportChatElement("deleteConfirmModal");
        const priorityModal = supportChatElement("priorityConfirmModal");

        const insideAny =
            (bar && bar.contains(event.target)) ||
            (actionsModal && actionsModal.contains(event.target)) ||
            (deleteModal && deleteModal.contains(event.target)) ||
            (priorityModal && priorityModal.contains(event.target)) ||
            event.target.closest(".chat-list-item");

        if (insideAny) return;

        exitChatSelectionMode();
        closeChatActionsModal();

    });

}


// ======================================================
// REALTIME
// ======================================================

function setupSupportRealtime() {

    if (supportMsgChannel) return;

    supportMsgChannel = sb.channel("support-messages-admin")
        .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, handleIncomingSupportMessageChange)
        .subscribe();

    supportConvChannel = sb.channel("support-conversations-admin")
        .on("postgres_changes", { event: "*", schema: "public", table: "support_conversations" }, function () {
            loadSupportConversations();
        })
        .subscribe();

}

function handleIncomingSupportMessageChange(payload) {

    if (payload.eventType === "DELETE") {

        const chat = individualChats.find(function (c) {
            return c.messages && c.messages.some(function (m) { return m.id === payload.old.id; });
        });

        if (chat) {
            chat.messages = chat.messages.filter(function (m) { return m.id !== payload.old.id; });
            if (currentChat && currentChat.id === chat.id) { renderMessages(); updatePinnedMessageBar(); }
        }

        return;

    }

    const row = payload.new;

    if (row.hidden_from_admin || row.deleted_by === "admin" || row.cleared_by === "admin") {

        // Hidden from admin — either a notice meant only for the user's
        // side, or a message admin themselves deleted/cleared (gone from
        // their own view for good). Make sure it isn't sitting in local
        // state (e.g. from before it was hidden).
        const chat = findIndividualChat(row.conversation_id);

        if (chat && chat.messages) {

            const index = chat.messages.findIndex(function (m) { return m.id === row.id; });

            if (index !== -1) {
                chat.messages.splice(index, 1);
                if (currentChat && currentChat.id === chat.id) { renderMessages(); updatePinnedMessageBar(); }
            }

        }

        loadSupportConversations();
        return;

    }

    const chat = findIndividualChat(row.conversation_id);

    if (!chat) { loadSupportConversations(); return; }

    // Messages not loaded yet (chat never opened this session): the thread
    // itself needs nothing, but the list / unread badge must still update.
    if (!chat.messagesLoaded) { loadSupportConversations(); return; }

    const existingIndex = chat.messages.findIndex(function (m) { return m.id === row.id; });

    if (existingIndex === -1) {
        chat.messages.push(mapSupportMessageRow(row));
    } else {
        chat.messages[existingIndex] = mapSupportMessageRow(row);
    }

    if (currentChat && currentChat.id === chat.id) {

        renderMessages();
        updatePinnedMessageBar();

        if (row.sender_type === "user") {
            scrollMessagesToBottom();

            chatUserTyping = false;
            updateChatHeaderStatus();

            // Admin is looking at this chat right now: it counts as read.
            // Mark it first (server stamps the time), then refresh the list,
            // so the unread badge never flashes for a message being viewed.
            if (payload.eventType === "INSERT" && !document.hidden) {
                markConversationRead(chat.id, function () { loadSupportConversations(); });
                return;
            }
        }

    }

    loadSupportConversations();

}


/* ===== js/media.js ===== */
/* =========================================================
   KT CLOUD MINING ADMIN
   MEDIA / CONTENT MANAGEMENT — wired to real Supabase
   tables + Storage (bucket: "content")

   Three content types managed here:
   - videos          -> "Educational Videos" -> user app /videos (film icon page)
   - content_guides  -> "Guides" -> Help & Support placeholders (photo or video)
   - content_downloads -> "Downloads" -> Help & Support downloads section (PDF only)
   ========================================================= */

let mediaVideos = [];
let mediaGuides = [];
let mediaDownloads = [];


/* =========================================================
   SHARED HELPERS
   ========================================================= */

function escapeMediaHTML(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
}

function capitalizeMedia(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatMediaCategory(cat) {
    if (!cat) return "Uncategorized";
    return cat.split("-").map(capitalizeMedia).join(" ");
}

function formatMediaDeleteType(type) {
    return type;
}

function formatFileSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// Uploads a file into the shared "content" storage bucket under
// the given folder, and returns its public URL.
function uploadContentFile(file, folder) {

    const path = folder + "/" + Date.now() + "_" + file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");

    return sb.storage.from("content").upload(path, file)
        .then(({ error }) => {

            if (error) throw error;

            const { data } = sb.storage.from("content").getPublicUrl(path);

            return data.publicUrl;

        });

}

// Simple toast — used for the video-upload confirmation.
let mediaToastTimer = null;

function showMediaToast(message) {

    const toast = document.getElementById("mediaToast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    if (mediaToastTimer) clearTimeout(mediaToastTimer);
    mediaToastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);

}


/* =========================================================
   INITIALIZE MEDIA PAGE
   ========================================================= */

function initMedia() {

    console.log("Initializing KT Media page...");

    loadMediaData();

    showMediaTab("overview");

    console.log("KT Media page initialized.");
}


/* =========================================================
   LOAD ALL CONTENT FROM SUPABASE
   ========================================================= */

function loadMediaData() {

    sb.from("videos").select("*").order("created_at")
        .then(({ data, error }) => {
            if (error) {
                console.error("Failed to load videos:", error);
                return;
            }
            mediaVideos = data.map(v => ({
                id: v.id, title: v.title,
                description: v.description,
                url: v.url, fileName: v.file_name,
                thumbnail: v.thumbnail_url
            }));
            renderMediaVideos();
            renderMediaOverview();
        });

    sb.from("content_guides").select("*").order("created_at")
        .then(({ data, error }) => {
            if (error) {
                console.error("Failed to load guides:", error);
                return;
            }
            mediaGuides = data.map(g => ({
                id: g.id, title: g.title, category: g.category,
                status: g.status,
                video: g.video_url, image: g.image_url
            }));
            renderMediaGuides();
            renderMediaOverview();
        });

    sb.from("content_downloads").select("*").order("created_at")
        .then(({ data, error }) => {
            if (error) {
                console.error("Failed to load downloads:", error);
                return;
            }
            mediaDownloads = data.map(d => ({
                id: d.id, title: d.title,
                description: d.description,
                url: d.file_url, fileName: d.file_name,
                fileType: d.file_type, fileSize: d.file_size
            }));
            renderMediaDownloads();
            renderMediaOverview();
        });

}


/* =========================================================
   OVERVIEW COUNTS
   ========================================================= */

function renderMediaOverview() {

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    set("mediaVideoCount", mediaVideos.length);
    set("mediaGuideCount", mediaGuides.length);
    set("mediaDownloadCount", mediaDownloads.length);

}


/* =========================================================
   TABS
   ========================================================= */

function showMediaTab(tabName) {

    document.querySelectorAll(".media-section")
        .forEach(section => section.classList.remove("active"));

    document.querySelectorAll(".media-tab")
        .forEach(tab => tab.classList.remove("active"));

    const selectedSection = document.getElementById("media-" + tabName);
    if (selectedSection) selectedSection.classList.add("active");

    const selectedTab = document.querySelector('.media-tab[data-media-tab="' + tabName + '"]');
    if (selectedTab) selectedTab.classList.add("active");

}


/* =========================================================
   VIDEOS  (Educational Videos -> user app /videos page)
   Add form: title, description, video file, thumbnail only.
   ========================================================= */

function openAddVideoModal() {

    const modal = document.getElementById("mediaVideoModal");
    const form = document.getElementById("videoForm");

    if (!modal) return;
    if (form) form.reset();

    document.getElementById("videoEditId").value = "";
    document.getElementById("videoModalTitle").textContent = "Add Video";

    modal.style.display = "flex";
}

function closeVideoModal() {
    const modal = document.getElementById("mediaVideoModal");

    if (modal) {
        modal.style.display = "none";
    }
}

function editMediaVideo(id) {

    const video = mediaVideos.find(v => v.id === id);
    if (!video) return;

    document.getElementById("videoEditId").value = video.id;
    document.getElementById("videoTitle").value = video.title || "";
    document.getElementById("videoDescription").value = video.description || "";

    document.getElementById("videoModalTitle").textContent = "Edit Video";
    document.getElementById("mediaVideoModal").classList.add("active");

}

function saveMediaVideo(event) {

    event.preventDefault();

    const editId = document.getElementById("videoEditId").value;
    const title = document.getElementById("videoTitle").value.trim();
    const description = document.getElementById("videoDescription").value.trim();
    const videoFile = document.getElementById("videoFile");
    const thumbnailInput = document.getElementById("videoThumbnail");

    if (!title) { KTUI.notify("Please enter a video title."); return; }

    if (!editId && (!videoFile || videoFile.files.length === 0)) {
        KTUI.notify("Please choose a video file.");
        return;
    }

    const payload = { title, description };

    const done = KTUI.busy(
        event.target.querySelector('button[type="submit"]'),
        editId ? "Saving..." : "Uploading..."
    );

    Promise.resolve()

        .then(() => {

            if (videoFile && videoFile.files.length > 0) {
                payload.file_name = videoFile.files[0].name;
                return uploadContentFile(videoFile.files[0], "videos").then(url => {
                    payload.url = url;
                });
            }

        })

        .then(() => {

            if (thumbnailInput && thumbnailInput.files.length > 0) {
                return uploadContentFile(thumbnailInput.files[0], "thumbnails").then(url => {
                    payload.thumbnail_url = url;
                });
            }

        })

        .then(() => {

            if (editId) {
                return sb.from("videos").update(payload).eq("id", editId);
            } else {
                return sb.from("videos").insert(payload);
            }

        })

        .then(({ error }) => {

            done();

            if (error) {
                KTUI.notify("Failed to save video: " + error.message);
                return;
            }

            loadMediaData();
            closeVideoModal();
            KTUI.success(editId ? "Video updated successfully." : "Video uploaded successfully.");

        })

        .catch(error => {
            done();
            KTUI.notify("Upload failed: " + error.message);
        });

}

function renderMediaVideos(videos) {

    const container = document.getElementById("mediaVideoList");
    if (!container) return;

    const list = videos || mediaVideos;

    if (list.length === 0) {
        container.innerHTML =
            '<div class="media-empty-state">' +
                '<i class="fa-solid fa-film"></i>' +
                '<h3>No Educational Videos</h3>' +
                '<p>Add educational videos for users to watch.</p>' +
            '</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(video => {

        const item = document.createElement("div");
        item.className = "media-content-item";

        const thumbnail = video.thumbnail
            ? '<img src="' + video.thumbnail + '" alt="Video thumbnail">'
            : '<i class="fa-solid fa-film"></i>';

        item.innerHTML =
            '<div class="media-content-thumbnail">' + thumbnail + '</div>' +
            '<div class="media-content-info">' +
                '<h3 class="media-content-title">' + escapeMediaHTML(video.title) + '</h3>' +
                '<p class="media-content-description">' +
                    escapeMediaHTML(video.description || "No description available.") +
                '</p>' +
            '</div>' +
            '<div class="media-content-actions">' +
                '<button type="button" class="media-content-action" title="Edit Video" onclick="editMediaVideo(\'' + video.id + '\')">' +
                    '<i class="fa-solid fa-pen"></i>' +
                '</button>' +
                '<button type="button" class="media-content-action delete" title="Delete Video" onclick="openMediaDeleteModal(\'' + video.id + '\', \'video\')">' +
                    '<i class="fa-solid fa-trash"></i>' +
                '</button>' +
            '</div>';

        container.appendChild(item);

    });

}

function filterMediaVideos() {

    const search = (document.getElementById("videoSearchInput").value || "").toLowerCase();

    const filtered = mediaVideos.filter(v => {
        return !search || (v.title || "").toLowerCase().includes(search);
    });

    renderMediaVideos(filtered);

}


/* =========================================================
   GUIDES  (Help & Support video/photo placeholders)
   Add form: title, category, status (photo/video), one media file
   that switches between a photo picker and a video picker.
   ========================================================= */

function toggleGuideMediaField() {

    const status = document.getElementById("guideStatus").value;
    const photoField = document.getElementById("guidePhotoField");
    const videoField = document.getElementById("guideVideoField");

    if (status === "video") {
        photoField.style.display = "none";
        videoField.style.display = "";
    } else {
        photoField.style.display = "";
        videoField.style.display = "none";
    }

}

function openAddGuideModal() {

    const modal = document.getElementById("mediaGuideModal");
    const form = document.getElementById("guideForm");

    if (!modal) return;
    if (form) form.reset();

    document.getElementById("guideEditId").value = "";
    document.getElementById("guideModalTitle").textContent = "Add Guide";
    document.getElementById("guideStatus").value = "photo";
    toggleGuideMediaField();

    modal.style.display = "flex";
}

function closeGuideModal() {
    const modal = document.getElementById("mediaGuideModal");

    if (modal) {
        modal.style.display = "none";
    }
}

function editMediaGuide(id) {

    const guide = mediaGuides.find(g => g.id === id);
    if (!guide) return;

    document.getElementById("guideEditId").value = guide.id;
    document.getElementById("guideTitle").value = guide.title || "";
    document.getElementById("guideCategory").value = guide.category || "";
    document.getElementById("guideStatus").value = guide.status || "photo";
    toggleGuideMediaField();

    document.getElementById("guideModalTitle").textContent = "Edit Guide";
    document.getElementById("mediaGuideModal").classList.add("active");

}

function saveMediaGuide(event) {

    event.preventDefault();

    const editId = document.getElementById("guideEditId").value;
    const title = document.getElementById("guideTitle").value.trim();
    const category = document.getElementById("guideCategory").value;
    const status = document.getElementById("guideStatus").value;

    if (!title) { KTUI.notify("Please enter a guide title."); return; }
    if (!category) { KTUI.notify("Please select a guide category."); return; }

    const imageInput = document.getElementById("guideImage");
    const videoInput = document.getElementById("guideVideoFile");

    const hasNewFile = status === "video"
        ? (videoInput && videoInput.files.length > 0)
        : (imageInput && imageInput.files.length > 0);

    if (!editId && !hasNewFile) {
        KTUI.notify(status === "video" ? "Please choose a guide video." : "Please choose a guide photo.");
        return;
    }

    const payload = { title, category, status };

    const done = KTUI.busy(
        event.target.querySelector('button[type="submit"]'),
        editId ? "Saving..." : "Adding..."
    );

    Promise.resolve()

        .then(() => {

            if (status === "video" && videoInput && videoInput.files.length > 0) {
                return uploadContentFile(videoInput.files[0], "guides").then(url => {
                    payload.video_url = url;
                });
            }

            if (status === "photo" && imageInput && imageInput.files.length > 0) {
                return uploadContentFile(imageInput.files[0], "guides").then(url => {
                    payload.image_url = url;
                });
            }

        })

        .then(() => {
            if (editId) {
                return sb.from("content_guides").update(payload).eq("id", editId);
            } else {
                return sb.from("content_guides").insert(payload);
            }
        })

        .then(({ error }) => {

            done();

            if (error) {
                KTUI.notify("Failed to save guide: " + error.message);
                return;
            }

            loadMediaData();
            closeGuideModal();
            KTUI.notify(editId ? "Guide updated successfully." : "Guide added successfully.");

        })

        .catch(error => { done(); KTUI.notify("Upload failed: " + error.message); });

}

function renderMediaGuides(guides) {

    const container = document.getElementById("mediaGuideList");
    if (!container) return;

    const list = guides || mediaGuides;

    if (list.length === 0) {
        container.innerHTML =
            '<div class="media-empty-state">' +
                '<i class="fa-solid fa-book"></i>' +
                '<h3>No Guides</h3>' +
                '<p>Add help guides for users to see.</p>' +
            '</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(guide => {

        const item = document.createElement("div");
        item.className = "media-content-item";

        const thumbnail = guide.status === "video"
            ? '<i class="fa-solid fa-circle-play"></i>'
            : (guide.image ? '<img src="' + guide.image + '" alt="Guide photo">' : '<i class="fa-solid fa-image"></i>');

        item.innerHTML =
            '<div class="media-content-thumbnail">' + thumbnail + '</div>' +
            '<div class="media-content-info">' +
                '<h3 class="media-content-title">' + escapeMediaHTML(guide.title) + '</h3>' +
                '<div class="media-content-meta">' +
                    '<span class="media-badge media-badge-category">' +
                        escapeMediaHTML(formatMediaCategory(guide.category)) +
                    '</span>' +
                    '<span class="media-badge media-badge-active">' +
                        escapeMediaHTML(capitalizeMedia(guide.status)) +
                    '</span>' +
                '</div>' +
            '</div>' +
            '<div class="media-content-actions">' +
                '<button type="button" class="media-content-action" title="Edit Guide" onclick="editMediaGuide(\'' + guide.id + '\')">' +
                    '<i class="fa-solid fa-pen"></i>' +
                '</button>' +
                '<button type="button" class="media-content-action delete" title="Delete Guide" onclick="openMediaDeleteModal(\'' + guide.id + '\', \'guide\')">' +
                    '<i class="fa-solid fa-trash"></i>' +
                '</button>' +
            '</div>';

        container.appendChild(item);

    });

}

function filterMediaGuides() {

    const search = (document.getElementById("guideSearchInput").value || "").toLowerCase();
    const category = document.getElementById("guideCategoryFilter").value;
    const type = document.getElementById("guideStatusFilter").value;

    const filtered = mediaGuides.filter(g => {
        const matchesSearch = !search || (g.title || "").toLowerCase().includes(search);
        const matchesCategory = category === "all" || g.category === category;
        const matchesType = type === "all" || g.status === type;
        return matchesSearch && matchesCategory && matchesType;
    });

    renderMediaGuides(filtered);

}


/* =========================================================
   DOWNLOADS  (Help & Support downloads section — PDF only)
   Add form: file name, description, upload PDF only.
   ========================================================= */

function openAddDownloadModal() {

    const modal = document.getElementById("mediaDownloadModal");
    const form = document.getElementById("downloadForm");

    if (!modal) return;
    if (form) form.reset();

    document.getElementById("downloadEditId").value = "";
    document.getElementById("downloadModalTitle").textContent = "Add Download";

    modal.style.display = "flex";
}

function closeDownloadModal() {
    const modal = document.getElementById("mediaDownloadModal");

    if (modal) {
        modal.style.display = "none";
    }
}

function editMediaDownload(id) {

    const item = mediaDownloads.find(d => d.id === id);
    if (!item) return;

    document.getElementById("downloadEditId").value = item.id;
    document.getElementById("downloadTitle").value = item.title || "";
    document.getElementById("downloadDescription").value = item.description || "";

    document.getElementById("downloadModalTitle").textContent = "Edit Download";
    document.getElementById("mediaDownloadModal").classList.add("active");

}

function saveMediaDownload(event) {

    event.preventDefault();

    const editId = document.getElementById("downloadEditId").value;
    const title = document.getElementById("downloadTitle").value.trim();
    const fileInput = document.getElementById("downloadFile");

    if (!title) { KTUI.notify("Please enter a file name."); return; }

    const file = fileInput && fileInput.files.length > 0 ? fileInput.files[0] : null;

    if (!editId && !file) {
        KTUI.notify("Please choose a PDF file.");
        return;
    }

    if (file && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        KTUI.notify("Only PDF files are supported.");
        return;
    }

    const payload = {
        title,
        description: document.getElementById("downloadDescription").value.trim()
    };

    const done = KTUI.busy(
        event.target.querySelector('button[type="submit"]'),
        editId ? "Saving..." : "Uploading..."
    );

    Promise.resolve()

        .then(() => {

            if (file) {
                payload.file_name = file.name;
                payload.file_type = file.type || "application/pdf";
                payload.file_size = file.size;

                return uploadContentFile(file, "downloads").then(url => {
                    payload.file_url = url;
                });
            }

        })

        .then(() => {
            if (editId) {
                return sb.from("content_downloads").update(payload).eq("id", editId);
            } else {
                return sb.from("content_downloads").insert(payload);
            }
        })

        .then(({ error }) => {

            done();

            if (error) {
                KTUI.notify("Failed to save download: " + error.message);
                return;
            }

            loadMediaData();
            closeDownloadModal();
            KTUI.notify(editId ? "Download updated successfully." : "Download added successfully.");

        })

        .catch(error => { done(); KTUI.notify("Upload failed: " + error.message); });

}

function renderMediaDownloads(downloads) {

    const container = document.getElementById("mediaDownloadList");
    if (!container) return;

    const list = downloads || mediaDownloads;

    if (list.length === 0) {
        container.innerHTML =
            '<div class="media-empty-state">' +
                '<i class="fa-solid fa-file-arrow-down"></i>' +
                '<h3>No Downloads</h3>' +
                '<p>Add downloadable PDF files for users.</p>' +
            '</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(item => {

        const el = document.createElement("div");
        el.className = "media-content-item";

        el.innerHTML =
            '<div class="media-content-thumbnail"><i class="fa-solid fa-file-pdf"></i></div>' +
            '<div class="media-content-info">' +
                '<h3 class="media-content-title">' + escapeMediaHTML(item.title) + '</h3>' +
                '<p class="media-content-description">' +
                    escapeMediaHTML(item.description || "No description available.") +
                '</p>' +
                (item.fileSize ? '<div class="media-content-meta"><span class="media-badge media-badge-category">' + formatFileSize(item.fileSize) + '</span></div>' : '') +
            '</div>' +
            '<div class="media-content-actions">' +
                '<button type="button" class="media-content-action" title="Edit" onclick="editMediaDownload(\'' + item.id + '\')">' +
                    '<i class="fa-solid fa-pen"></i>' +
                '</button>' +
                '<button type="button" class="media-content-action delete" title="Delete" onclick="openMediaDeleteModal(\'' + item.id + '\', \'download\')">' +
                    '<i class="fa-solid fa-trash"></i>' +
                '</button>' +
            '</div>';

        container.appendChild(el);

    });

}

function filterMediaDownloads() {

    const search = (document.getElementById("downloadSearchInput").value || "").toLowerCase();

    const filtered = mediaDownloads.filter(d => {
        return !search || (d.title || "").toLowerCase().includes(search);
    });

    renderMediaDownloads(filtered);

}


/* =========================================================
   DELETE (shared across videos / guides / downloads)
   ========================================================= */

function openMediaDeleteModal(id, type) {

    document.getElementById("mediaDeleteId").value = id;
    document.getElementById("mediaDeleteType").value = type;

    const message = document.getElementById("mediaDeleteMessage");
    if (message) {
        message.textContent =
            "Are you sure you want to delete this " + formatMediaDeleteType(type) + "? This action cannot be undone.";
    }

    document.getElementById("mediaDeleteModal").style.display = "flex";

}

function closeMediaDeleteModal() {
    const modal = document.getElementById("mediaDeleteModal");

    if (modal) {
        modal.style.display = "none";
    }
}

const MEDIA_DELETE_TABLES = {
    video: "videos",
    guide: "content_guides",
    download: "content_downloads"
};

function confirmMediaDelete() {

    const id = document.getElementById("mediaDeleteId").value;
    const type = document.getElementById("mediaDeleteType").value;

    if (!id || !type) return;

    const table = MEDIA_DELETE_TABLES[type];
    if (!table) return;

    const done = KTUI.busy(
        document.querySelector('[onclick*="confirmMediaDelete"]'),
        "Deleting..."
    );

    sb.from(table).delete().eq("id", id)

        .then(({ error }) => {

            done();

            closeMediaDeleteModal();

            if (error) {
                KTUI.notify("Failed to delete: " + error.message);
                return;
            }

            KTUI.success(
                (type === "video" ? "Video" : type === "guide" ? "Guide" : "Download") + " deleted."
            );

            loadMediaData();

        });

}

/* =========================================================
   MEDIA MODALS — CLICK OUTSIDE TO CLOSE
   Same behavior as Users page modals
========================================================= */

document.addEventListener("click", function(event) {

    if (
        event.target.classList.contains("media-modal")
    ) {

        event.target.style.display = "none";

    }

});

/* ===== js/settings.js ===== */
// =========================================================
// KT ADMIN — SETTINGS PAGE
//   Sound & notifications | Admins | Audit | Safety
//
// Every category except Safety asks for the settings password each time it
// is opened. The password is kept in memory only while a category is open
// and is checked again by the server on every sensitive action.
// =========================================================

(function(){

    var IDLE_MS = 10 * 60 * 1000;              // auto-lock after 10 minutes without use
    var LOCKED_VIEWS = ["sound", "admin", "audit"];

    var S = { password: null, view: "loading", idle: null, users: null, audit: null, adminName: "Admin", bound: false, lastDeleted: 0 };

    // ---------------------------------------------------------
    // tiny helpers
    // ---------------------------------------------------------
    function $(id){ return document.getElementById(id); }

    function esc(v){
        if(v === null || v === undefined) return "";
        return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function rand(n){
        var x = Number(n) || 0;
        var abs = Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return (x < 0 ? "-R" : "R") + abs;
    }

    function dt(v){
        if(!v) return "—";
        var d = new Date(v);
        return isNaN(d) ? "—" : d.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }

    function dOnly(v){
        if(!v) return "—";
        var d = new Date(v);
        return isNaN(d) ? "—" : d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
    }

    var ERRORS = {
        wrong: "Wrong password.",
        none: "No settings password has been created yet.",
        denied: "Admin access is required.",
        too_short: "Use at least 8 characters.",
        same_password: "The new password must be different from the old one.",
        exists: "A settings password already exists.",
        user_not_found: "That user could not be found.",
        already_admin: "This user is already an admin.",
        self: "You cannot remove your own admin role.",
        last_admin: "At least one admin must remain.",
        not_admin: "That user is not an admin.",
        bad_scope: "Choose which records to delete.",
        bad_stream: "Something went wrong. Please try again."
    };

    function errorText(d){
        if(!d) return "Something went wrong.";
        if(d.error === "locked"){
            var mins = d.locked_until ? Math.max(1, Math.ceil((new Date(d.locked_until) - Date.now()) / 60000)) : 5;
            return "Too many wrong attempts. Try again in " + mins + " minute" + (mins === 1 ? "" : "s") + ".";
        }
        return ERRORS[d.error] || d.message || "Something went wrong.";
    }

    function rpc(name, args){
        return sb.rpc(name, args || {}).then(function(res){
            if(res.error) throw new Error(res.error.message);
            return res.data;
        });
    }

    // sensitive call: always sends the in-memory password; locks the page if it stops working
    function guarded(name, args){
        args = args || {};
        args.p_password = S.password;
        return rpc(name, args).then(function(d){
            if(d && d.ok === false){
                if(d.error === "wrong" || d.error === "none" || d.error === "locked" || d.error === "denied"){
                    lock();
                }
                var err = new Error(errorText(d));
                err.code = d.error;
                throw err;
            }
            return d;
        });
    }

    // ---------------------------------------------------------
    // views, locking
    // ---------------------------------------------------------
    var VIEW_IDS = { loading: "setLoading", create: "setCreate", menu: "setMenu", sound: "setSound", admin: "setAdmin", audit: "setAudit", safety: "setSafety" };

    function show(view){
        S.view = view;
        Object.keys(VIEW_IDS).forEach(function(k){
            var el = $(VIEW_IDS[k]);
            if(el) el.hidden = (k !== view);
        });
        armIdle();
        var body = document.getElementById("admin-body");
        if(body) body.scrollTop = 0;
        try{ window.scrollTo(0, 0); }catch(e){}
    }

    function armIdle(){
        clearTimeout(S.idle);
        if(LOCKED_VIEWS.indexOf(S.view) === -1) return;
        S.idle = setTimeout(function(){
            lock();
            KTUI.info("Settings were locked after 10 minutes without use.");
        }, IDLE_MS);
    }

    function lock(){
        S.password = null;
        S.users = null;
        S.audit = null;
        clearTimeout(S.idle);
        if(S.view !== "create" && S.view !== "loading"){
            show("menu");
        }
    }

    function openCategory(cat){
        if(cat === "safety"){ openView("safety"); return; }

        var titles = { sound: "Sound & Notifications", admin: "Admins", audit: "Audit" };

        KTUI.prompt("Enter your settings password to open " + titles[cat] + ".", {
            title: "Settings password",
            inputType: "password",
            placeholder: "Settings password",
            confirmText: "Open",
            busyText: "Checking...",
            validate: function(v){ return v ? null : "Enter your password."; },
            run: function(pw){
                return rpc("settings_verify_password", { p_password: pw }).then(function(d){
                    if(d && d.ok){ S.password = pw; return null; }
                    return errorText(d);
                });
            }
        }).then(function(value){
            if(value === null || !S.password) return;
            openView(cat);
        });
    }

    function openView(cat){
        if(cat === "sound") renderSound();
        else if(cat === "admin") renderAdmin();
        else if(cat === "audit") renderAudit();
        else if(cat === "safety") renderSafety();
        show(cat);
    }

    // ---------------------------------------------------------
    // password fields
    // ---------------------------------------------------------
    function mountPassword(containerId, placeholder, autocomplete){
        var holder = $(containerId);
        if(!holder) return null;
        holder.innerHTML = "";
        var f = KTUI.passwordField({ placeholder: placeholder, autocomplete: autocomplete });
        holder.appendChild(f.wrap);
        return f.input;
    }

    // ---------------------------------------------------------
    // CREATE PASSWORD (first time)
    // ---------------------------------------------------------
    function setupCreate(){
        var p1 = mountPassword("createPw1", "Password", "new-password");
        var p2 = mountPassword("createPw2", "Re-enter password", "new-password");
        var err = $("createError");
        var btn = $("createBtn");
        if(!p1 || !p2 || !btn) return;
        err.textContent = "";

        function submit(){
            err.textContent = "";
            if(p1.value.length < 8){ err.textContent = ERRORS.too_short; return; }
            if(p1.value !== p2.value){ err.textContent = "The two passwords do not match."; return; }

            var done = KTUI.busy(btn, "Saving...");
            rpc("settings_set_password", { p_password: p1.value }).then(function(d){
                done();
                if(!d || d.ok === false){ err.textContent = errorText(d); return; }
                p1.value = ""; p2.value = "";
                KTUI.success("Settings password created.");
                show("menu");
            }).catch(function(e){
                done();
                err.textContent = e.message;
            });
        }

        btn.onclick = submit;
        p2.onkeydown = function(e){ if(e.key === "Enter") submit(); };
    }

    // ---------------------------------------------------------
    // SAFETY
    // ---------------------------------------------------------
    function renderSafety(){
        $("setSafetyBody").innerHTML =
            '<div class="kt-set-card">' +
                '<h3><i class="fa-solid fa-key"></i> Change settings password</h3>' +
                '<p class="kt-set-hint">Enter your current password, then choose a new one (at least 8 characters).</p>' +
                '<label>Current password</label><div id="chgOld"></div>' +
                '<label>New password</label><div id="chgNew"></div>' +
                '<label>Re-enter new password</label><div id="chgNew2"></div>' +
                '<div class="kt-set-error" id="chgError"></div>' +
                '<button class="kt-set-btn primary" id="chgBtn">Change password</button>' +
            '</div>' +
            '<div class="kt-set-card muted">' +
                '<h3><i class="fa-solid fa-shield-halved"></i> How it protects you</h3>' +
                '<ul class="kt-set-list">' +
                    '<li>Sound &amp; Notifications, Admins and Audit ask for this password every time you open them.</li>' +
                    '<li>The password is stored as a one-way hash. Nobody, including you, can read it back.</li>' +
                    '<li>After 5 wrong attempts it is locked for 5 minutes.</li>' +
                    '<li>Each admin has their own settings password.</li>' +
                '</ul>' +
            '</div>';

        var o = mountPassword("chgOld", "Current password", "current-password");
        var n = mountPassword("chgNew", "New password", "new-password");
        var n2 = mountPassword("chgNew2", "Re-enter new password", "new-password");
        var err = $("chgError");
        var btn = $("chgBtn");

        function submit(){
            err.textContent = "";
            if(!o.value){ err.textContent = "Enter your current password."; return; }
            if(n.value.length < 8){ err.textContent = ERRORS.too_short; return; }
            if(n.value !== n2.value){ err.textContent = "The new passwords do not match."; return; }

            var done = KTUI.busy(btn, "Saving...");
            rpc("settings_change_password", { p_old: o.value, p_new: n.value }).then(function(d){
                done();
                if(!d || d.ok === false){ err.textContent = errorText(d); return; }
                o.value = ""; n.value = ""; n2.value = "";
                KTUI.success("Settings password changed.");
            }).catch(function(e){
                done();
                err.textContent = e.message;
            });
        }

        btn.onclick = submit;
        n2.onkeydown = function(e){ if(e.key === "Enter") submit(); };
    }

    // ---------------------------------------------------------
    // SOUND & NOTIFICATIONS
    // ---------------------------------------------------------
    function switchHtml(act, checked, extra){
        return '<label class="kt-switch"><input type="checkbox" data-act="' + act + '"' + (extra || "") + (checked ? " checked" : "") + '><span></span></label>';
    }

    function renderSound(){
        var choice = KTSound.getChoice();
        var on = KTSound.isOn();

        var rows = KTSound.list().map(function(s){
            return '<div class="kt-set-row">' +
                '<label class="kt-radio"><input type="radio" name="ktSound" data-act="pick" value="' + s.id + '"' + (choice === s.id ? " checked" : "") + '><span>' + esc(s.name) + '</span></label>' +
                '<button class="kt-set-mini" data-act="play" data-id="' + s.id + '"><i class="fa-solid fa-play"></i> Play</button></div>';
        }).join("");

        var custom = KTSound.hasCustom()
            ? '<div class="kt-set-row">' +
                '<label class="kt-radio"><input type="radio" name="ktSound" data-act="pick" value="custom"' + (choice === "custom" ? " checked" : "") + '><span>' + esc(KTSound.customName()) + '<small>From this phone</small></span></label>' +
                '<span class="kt-set-actions"><button class="kt-set-mini" data-act="play" data-id="custom"><i class="fa-solid fa-play"></i> Play</button>' +
                '<button class="kt-set-mini danger" data-act="remove-custom"><i class="fa-solid fa-trash"></i></button></span></div>'
            : '<div class="kt-set-row"><span class="kt-set-hint" style="margin:0">No sound chosen from your phone yet.</span></div>';

        var types = KTSound.groups().map(function(g){
            return '<div class="kt-set-row"><span>' + esc(g.label) + '</span>' + switchHtml("type", KTSound.typeEnabled(g.id), ' data-group="' + g.id + '"') + '</div>';
        }).join("");

        $("setSoundBody").innerHTML =
            '<div class="kt-set-card">' +
                '<div class="kt-set-row head"><div><h3><i class="fa-solid fa-volume-high"></i> Alert sound</h3>' +
                '<p class="kt-set-hint">Plays when a new request or message arrives while the app is open.</p></div>' + switchHtml("sound-on", on) + '</div>' +
                '<div class="kt-set-sub">Choose a sound</div>' + rows + custom +
                '<input type="file" id="setSoundFile" accept="audio/*" hidden>' +
                '<button class="kt-set-btn light" data-act="choose-file"><i class="fa-solid fa-folder-open"></i> Choose from phone</button>' +
                '<p class="kt-set-hint">mp3, wav, m4a or ogg, up to 3 MB and 30 seconds. Saved on this device only.</p>' +
            '</div>' +

            '<div class="kt-set-card">' +
                '<div class="kt-set-row head"><div><h3><i class="fa-solid fa-bell"></i> Notifications when the app is closed</h3>' +
                '<p class="kt-set-hint" id="pushHint">Checking...</p></div>' +
                '<label class="kt-switch"><input type="checkbox" data-act="push" id="pushSwitch" disabled><span></span></label></div>' +
                '<p class="kt-set-hint">The sound for these is chosen by your phone\'s notification settings.</p>' +
            '</div>' +

            '<div class="kt-set-card">' +
                '<h3><i class="fa-solid fa-sliders"></i> Pop-up alerts</h3>' +
                '<p class="kt-set-hint">Choose which new items show a pop-up and play the sound while the app is open. Counts and badges always stay up to date.</p>' +
                types +
            '</div>';

        refreshPush();
    }

    function refreshPush(){
        var sw = $("pushSwitch"), hint = $("pushHint");
        if(!sw || !hint) return;

        if(!window.KTPush){ hint.textContent = "Not available in this version."; return; }

        KTPush.status().then(function(st){
            sw = $("pushSwitch"); hint = $("pushHint");
            if(!sw || !hint) return;
            if(!st.supported){
                sw.checked = false; sw.disabled = true;
                hint.textContent = "This browser cannot show notifications. On iPhone, add the app to the Home Screen first.";
            } else if(st.permission === "denied"){
                sw.checked = false; sw.disabled = true;
                hint.textContent = "Blocked in your phone settings. Allow notifications for this app, then come back.";
            } else {
                sw.disabled = false;
                sw.checked = !!st.subscribed;
                hint.textContent = st.subscribed
                    ? "On. You will be alerted for new requests and messages even when the app is closed."
                    : "Off. Turn on to be alerted when the app is closed.";
            }
        });
    }

    function onSoundClick(e){
        var t = e.target.closest("[data-act]");
        if(!t) return;
        var act = t.getAttribute("data-act");

        if(act === "play"){ KTSound.preview(t.getAttribute("data-id")); return; }

        if(act === "choose-file"){
            var f = $("setSoundFile");
            if(f) f.click();
            return;
        }

        if(act === "remove-custom"){
            KTSound.clearCustom().then(function(){
                KTUI.success("Custom sound removed.");
                renderSound();
            });
        }
    }

    function onSoundChange(e){
        var t = e.target;
        var act = t.getAttribute && t.getAttribute("data-act");

        if(t.id === "setSoundFile"){
            var file = t.files && t.files[0];
            if(!file) return;
            KTSound.saveCustomFile(file).then(function(name){
                KTUI.success("Sound saved: " + name);
                renderSound();
                KTSound.preview("custom");
            }).catch(function(err){
                KTUI.error(err.message);
            });
            t.value = "";
            return;
        }

        if(act === "sound-on"){
            KTSound.setOn(t.checked);
            KTUI.success(t.checked ? "Alert sound is on." : "Alert sound is off.");
            return;
        }

        if(act === "pick"){
            KTSound.setChoice(t.value);
            KTSound.preview(t.value);
            return;
        }

        if(act === "type"){
            KTSound.setType(t.getAttribute("data-group"), t.checked);
            return;
        }

        if(act === "push"){
            t.disabled = true;
            var p = t.checked ? KTPush.enable() : KTPush.disable();
            Promise.resolve(p).then(refreshPush, refreshPush);
        }
    }

    // ---------------------------------------------------------
    // ADMINS
    // ---------------------------------------------------------
    function renderAdmin(){
        $("setAdminBody").innerHTML =
            '<div class="kt-set-card">' +
                '<h3><i class="fa-solid fa-user-shield"></i> Admins</h3>' +
                '<div id="adminList"><div class="kt-set-loading small"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div></div>' +
            '</div>' +
            '<div class="kt-set-card">' +
                '<h3><i class="fa-solid fa-user-plus"></i> Add an admin</h3>' +
                '<p class="kt-set-hint">Search an existing user by name, phone or email, then give them the admin role.</p>' +
                '<input class="kt-set-input" id="adminSearch" type="text" placeholder="Search users..." autocomplete="off">' +
                '<div id="adminResults"></div>' +
            '</div>';

        loadAdmins();
    }

    function loadAdmins(){
        Promise.all([
            guarded("settings_list_admins"),
            rpc("settings_list_admin_nicknames").catch(function(){ return []; })
        ]).then(function(res){
            var d = res[0], nickRows = res[1] || [];
            var nicks = {};
            nickRows.forEach(function(n){ nicks[n.user_id] = n.nickname; });
            var list = $("adminList");
            if(!list) return;
            var admins = d.admins || [];
            if(!admins.length){ list.innerHTML = '<p class="kt-set-hint">No admins found.</p>'; return; }

            list.innerHTML = admins.map(function(a){
                var name = a.name || a.email || "Admin";
                return '<div class="kt-set-person">' +
                    '<div class="kt-set-avatar">' + esc(name.charAt(0).toUpperCase()) + '</div>' +
                    '<div class="kt-set-person-info"><b>' + esc(name) + (a.is_you ? ' <span class="kt-set-tag">You</span>' : '') + '</b>' +
                    '<small>' + esc([a.email, a.phone].filter(Boolean).join(" · ") || "—") + '</small>' +
                    '<small>Admin since ' + esc(dOnly(a.since)) + '</small>' +
                    '<small>Shown to users as: <b>' + esc(nicks[a.user_id] || name) + '</b>' + (nicks[a.user_id] ? '' : ' (real name)') + '</small></div>' +
                    '<button class="kt-set-mini primary" data-act="set-nickname" data-id="' + esc(a.user_id) + '" data-name="' + esc(name) + '" data-nick="' + esc(nicks[a.user_id] || "") + '">Nickname</button>' +
                    (a.is_you ? '' : '<button class="kt-set-mini danger" data-act="remove-admin" data-id="' + esc(a.user_id) + '" data-name="' + esc(name) + '">Remove</button>') +
                '</div>';
            }).join("");
        }).catch(function(e){
            var list = $("adminList");
            if(list) list.innerHTML = '<p class="kt-set-error">' + esc(e.message) + '</p>';
        });
    }

    function loadUsersOnce(){
        if(S.users) return Promise.resolve(S.users);
        return rpc("admin_list_users").then(function(rows){ S.users = rows || []; return S.users; });
    }

    function searchUsers(){
        var box = $("adminSearch"), out = $("adminResults");
        if(!box || !out) return;
        var q = box.value.trim().toLowerCase();
        if(q.length < 2){ out.innerHTML = ""; return; }

        loadUsersOnce().then(function(users){
            var hits = users.filter(function(u){
                var hay = [u.username, u.surname, u.phone, u.email].filter(Boolean).join(" ").toLowerCase();
                return hay.indexOf(q) !== -1;
            }).slice(0, 8);

            if(!hits.length){ out.innerHTML = '<p class="kt-set-hint">No users match "' + esc(box.value.trim()) + '".</p>'; return; }

            out.innerHTML = hits.map(function(u){
                var name = ((u.username || "") + " " + (u.surname || "")).trim() || u.email || "User";
                return '<div class="kt-set-person">' +
                    '<div class="kt-set-avatar">' + esc(name.charAt(0).toUpperCase()) + '</div>' +
                    '<div class="kt-set-person-info"><b>' + esc(name) + '</b><small>' + esc([u.phone, u.email].filter(Boolean).join(" · ") || "—") + '</small></div>' +
                    '<button class="kt-set-mini primary" data-act="add-admin" data-id="' + esc(u.id) + '" data-name="' + esc(name) + '">Make admin</button></div>';
            }).join("");
        }).catch(function(e){
            out.innerHTML = '<p class="kt-set-error">' + esc(e.message) + '</p>';
        });
    }

    function onAdminClick(e){
        var t = e.target.closest("[data-act]");
        if(!t) return;
        var act = t.getAttribute("data-act");
        var id = t.getAttribute("data-id");
        var name = t.getAttribute("data-name") || "this user";

        if(act === "set-nickname"){
            var current = t.getAttribute("data-nick") || "";
            KTUI.prompt("Nickname users will see in KT Support instead of " + name + "'s real name. Leave empty to use the real name.", {
                title: "Admin nickname", confirmText: "Save", busyText: "Saving...", value: current, placeholder: "e.g. Thabo from KT Support",
                validate: function(v){ return (v || "").trim().length > 40 ? "Use 40 characters or fewer." : null; },
                run: function(v){
                    return rpc("settings_set_admin_nickname", { p_user_id: id, p_nickname: (v || "").trim() })
                        .then(function(){ return null; }, function(err){ return err.message; });
                }
            }).then(function(v){
                if(v === null) return;
                KTUI.success(String(v).trim() ? "Nickname saved." : "Nickname cleared.");
                loadAdmins();
            });
            return;
        }

        if(act === "remove-admin"){
            KTUI.confirm("Remove the admin role from " + name + "? They will no longer be able to use the admin app or receive admin alerts.", {
                title: "Remove admin", danger: true, confirmText: "Remove", busyText: "Removing...",
                run: function(){
                    return guarded("settings_remove_admin", { p_user_id: id }).then(function(){ return null; }, function(err){ return err.message; });
                }
            }).then(function(ok){
                if(!ok) return;
                KTUI.success(name + " is no longer an admin.");
                S.users = null;
                loadAdmins();
            });
            return;
        }

        if(act === "add-admin"){
            KTUI.confirm("Give " + name + " the admin role? They will be able to sign in to the admin app and manage users and money. They will set their own settings password.", {
                title: "Add admin", confirmText: "Make admin", busyText: "Adding...",
                run: function(){
                    return guarded("settings_add_admin", { p_user_id: id }).then(function(){ return null; }, function(err){ return err.message; });
                }
            }).then(function(ok){
                if(!ok) return;
                KTUI.success(name + " is now an admin.");
                S.users = null;
                var box = $("adminSearch"); if(box) box.value = "";
                var out = $("adminResults"); if(out) out.innerHTML = "";
                loadAdmins();
            });
        }
    }

    // ---------------------------------------------------------
    // AUDIT
    // ---------------------------------------------------------
    var WALLET_TYPES = [
        ["deposit", "Deposits credited to wallets"],
        ["withdrawal", "Withdrawals (requested, net of refunds)"],
        ["mining_payout", "Mining payouts"],
        ["plan_purchase", "Plan purchases"],
        ["plan_upgrade", "Plan upgrades"],
        ["plan_refund", "Plan refunds (principal returned)"],
        ["bonus", "Bonuses"],
        ["admin_credit", "Admin credits"],
        ["admin_debit", "Admin debits"]
    ];

    function renderAudit(){
        $("setAuditBody").innerHTML =
            '<div class="kt-set-card">' +
                '<h3><i class="fa-solid fa-scale-balanced"></i> Profit &amp; loss balancing</h3>' +
                '<p class="kt-set-hint">Balance the records for the last number of days.</p>' +
                '<div class="kt-set-days">' +
                    '<input class="kt-set-input" id="auditDays" type="number" min="1" max="3650" value="30" inputmode="numeric">' +
                    '<span>days</span>' +
                    '<button class="kt-set-chip" data-act="days" data-days="7">7</button>' +
                    '<button class="kt-set-chip" data-act="days" data-days="30">30</button>' +
                    '<button class="kt-set-chip" data-act="days" data-days="90">90</button>' +
                '</div>' +
                '<button class="kt-set-btn primary" id="auditCalc" data-act="calc"><i class="fa-solid fa-calculator"></i> Calculate</button>' +
                '<div id="auditResult"></div>' +
            '</div>' +

            '<div class="kt-set-card danger-zone">' +
                '<h3><i class="fa-solid fa-trash-can"></i> Delete audit records</h3>' +
                '<p class="kt-set-hint">Removes records from this audit only. Deposits, withdrawals, wallets, transactions and every other page are not touched. Records of deleted users stay here until you delete them.</p>' +
                '<div class="kt-set-days">' +
                    '<select class="kt-set-input" id="delScope"><option value="older">Older than</option><option value="last">From the last</option></select>' +
                    '<input class="kt-set-input" id="delDays" type="number" min="1" max="3650" value="90" inputmode="numeric">' +
                    '<span>days</span>' +
                '</div>' +
                '<button class="kt-set-btn danger" id="delBtn" data-act="delete"><i class="fa-solid fa-trash"></i> Delete records</button>' +
            '</div>';

        calculateAudit();
    }

    function daysValue(id){
        var n = parseInt(($(id) || {}).value, 10);
        if(!n || n < 1) return null;
        return Math.min(n, 3650);
    }

    function calculateAudit(){
        var days = daysValue("auditDays");
        var holder = $("auditResult");
        if(!holder) return;
        if(!days){ holder.innerHTML = '<p class="kt-set-error">Enter a number of days (1 or more).</p>'; return; }

        var btn = $("auditCalc");
        var done = KTUI.busy(btn, "Calculating...");
        holder.innerHTML = "";

        guarded("settings_audit_summary", { p_days: days }).then(function(d){
            done();
            S.audit = d;
            if($("auditResult")) $("auditResult").innerHTML = auditHtml(d);
        }).catch(function(e){
            done();
            if($("auditResult")) $("auditResult").innerHTML = '<p class="kt-set-error">' + esc(e.message) + '</p>';
        });
    }

    function sumOf(t, k){ return t[k] ? Number(t[k].sum) || 0 : 0; }
    function cntOf(t, k){ return t[k] ? Number(t[k].count) || 0 : 0; }

    // The balancing, from the server totals (same maths the spreadsheet uses)
    function compute(d){
        var t = d.totals || {};
        var wd = d.withdrawals || {};
        var m = {};
        m.cashIn = sumOf(t, "cash_in");
        m.cashOut = -sumOf(t, "cash_out");
        m.netCash = m.cashIn - m.cashOut;

        m.walletNet = 0;
        Object.keys(t).forEach(function(k){ if(k !== "cash_in" && k !== "cash_out") m.walletNet += sumOf(t, k); });

        m.requested = Number(wd.requested) || 0;
        m.refunded = Number(wd.refunded) || 0;
        m.pendingChange = m.requested - m.cashOut - m.refunded;
        m.principal = (-sumOf(t, "plan_purchase")) + (-sumOf(t, "plan_upgrade")) - sumOf(t, "plan_refund");
        m.owedChange = m.walletNet + m.pendingChange + m.principal;
        m.profitBalance = m.netCash - m.owedChange;

        m.income = -sumOf(t, "admin_debit");
        m.costs = sumOf(t, "mining_payout") + sumOf(t, "bonus") + sumOf(t, "admin_credit");
        m.profitEarn = m.income - m.costs;
        m.diff = m.profitBalance - m.profitEarn;
        return m;
    }

    function line(label, value, cls){
        return '<div class="kt-set-line ' + (cls || "") + '"><span>' + label + '</span><b>' + value + '</b></div>';
    }

    function auditHtml(d){
        var m = compute(d);
        var t = d.totals || {};
        var total = (d.ledger && d.ledger.total_records) || 0;
        var inPeriod = Object.keys(t).reduce(function(n, k){ return n + cntOf(t, k); }, 0);
        var balanced = Math.abs(m.diff) < 0.005;
        var profitCls = m.profitEarn >= 0 ? "good" : "bad";

        if(!inPeriod){
            return '<div class="kt-set-empty"><i class="fa-regular fa-folder-open"></i><p>No audit records in the last ' + d.days + ' days.</p></div>';
        }

        var walletRows = WALLET_TYPES.filter(function(w){ return t[w[0]]; }).map(function(w){
            return line(esc(w[1]) + ' <small>(' + cntOf(t, w[0]) + ')</small>', rand(sumOf(t, w[0])));
        }).join("");

        return '<div class="kt-set-period">' + esc(dt(d.from)) + ' &rarr; ' + esc(dt(d.to)) + '</div>' +

            '<div class="kt-set-big ' + profitCls + '"><small>Profit / (Loss)</small><b>' + rand(m.profitEarn) + '</b></div>' +
            '<div class="kt-set-status ' + (balanced ? "good" : "bad") + '">' +
                (balanced ? '<i class="fa-solid fa-circle-check"></i> Balanced — both methods agree'
                          : '<i class="fa-solid fa-triangle-exclamation"></i> Not balanced — difference ' + rand(m.diff)) +
            '</div>' +

            '<div class="kt-set-block"><h4>1. Money in and out</h4>' +
                line('Approved deposits (in) <small>(' + cntOf(t, "cash_in") + ')</small>', rand(m.cashIn)) +
                line('Approved withdrawals (out) <small>(' + cntOf(t, "cash_out") + ')</small>', rand(-m.cashOut)) +
                line('Net cash retained', rand(m.netCash), "total") +
            '</div>' +

            '<div class="kt-set-block"><h4>2. Change in what is owed to users</h4>' +
                walletRows +
                line('Net change in wallets', rand(m.walletNet), "total") +
                line('Change in pending withdrawals', rand(m.pendingChange)) +
                line('Change in plan principal held', rand(m.principal)) +
                line('Total change owed', rand(m.owedChange), "total") +
            '</div>' +

            '<div class="kt-set-block"><h4>3. Profit / (Loss)</h4>' +
                line('Balance method (net cash &minus; change owed)', rand(m.profitBalance)) +
                line('Income: admin debits', rand(m.income)) +
                line('Costs: payouts, bonuses, admin credits', rand(-m.costs)) +
                line('Earnings method (income &minus; costs)', rand(m.profitEarn), "total") +
            '</div>' +

            '<p class="kt-set-hint">' + inPeriod + ' records in this period (' + total + ' in the audit in total). Platform income from outside the app is not tracked.</p>' +
            '<button class="kt-set-btn light" id="auditDownload" data-act="download"><i class="fa-solid fa-file-excel"></i> Download spreadsheet</button>';
    }

    // ---- spreadsheet -------------------------------------------------
    function fetchAllRows(days, stream, onProgress){
        var all = [];
        function next(offset){
            return guarded("settings_audit_rows", { p_days: days, p_stream: stream, p_offset: offset, p_limit: 1000 }).then(function(d){
                var rows = d.rows || [];
                all = all.concat(rows);
                if(onProgress) onProgress(all.length);
                if(rows.length === 1000 && all.length < 200000) return next(offset + 1000);
                return all;
            });
        }
        return next(0);
    }

    function userLabel(r){ return r.user_name || "Deleted / unknown user"; }

    function buildWorkbook(days, wallet, cash){
        var now = new Date();
        var from = new Date(now.getTime() - days * 86400000);

        function sumWhere(rows, pred){ return rows.reduce(function(n, r){ return pred(r) ? n + Number(r.amount_zar) : n; }, 0); }
        function byType(type){ return sumWhere(wallet, function(r){ return r.entry_type === type; }); }

        var wRows = [[
            { v: "Date", s: "header" }, { v: "User", s: "header" }, { v: "Phone", s: "header" }, { v: "Type", s: "header" },
            { v: "Amount (wallet effect)", s: "header" }, { v: "Description", s: "header" }, { v: "Reference", s: "header" }, { v: "User ID", s: "header" }
        ]];
        wallet.forEach(function(r){
            wRows.push([new Date(r.occurred_at), userLabel(r), r.user_phone || "", r.entry_type, { v: Number(r.amount_zar), s: "money" }, r.description || "", r.source_id, r.user_id || ""]);
        });

        var cRows = [[
            { v: "Date", s: "header" }, { v: "User", s: "header" }, { v: "Phone", s: "header" }, { v: "Event", s: "header" },
            { v: "Amount (cash)", s: "header" }, { v: "Description", s: "header" }, { v: "Reference", s: "header" }, { v: "User ID", s: "header" }
        ]];
        cash.forEach(function(r){
            cRows.push([new Date(r.occurred_at), userLabel(r), r.user_phone || "", r.entry_type, { v: Number(r.amount_zar), s: "money" }, r.description || "", r.source_id, r.user_id || ""]);
        });

        var W = "Wallet", C = "Cash";
        function wSum(type){ return 'SUMIFS(' + W + '!$E:$E,' + W + '!$D:$D,"' + type + '")'; }

        // cached values (so the numbers show even before a spreadsheet app recalculates)
        var cashIn = sumWhere(cash, function(r){ return r.entry_type === "cash_in"; });
        var cashOut = -sumWhere(cash, function(r){ return r.entry_type === "cash_out"; });
        var netCash = cashIn - cashOut;
        var typeVals = {};
        WALLET_TYPES.forEach(function(w){ typeVals[w[0]] = byType(w[0]); });
        var walletNet = wallet.reduce(function(n, r){ return n + Number(r.amount_zar); }, 0);
        var requested = -sumWhere(wallet, function(r){ return r.entry_type === "withdrawal" && Number(r.amount_zar) < 0; });
        var refunded = sumWhere(wallet, function(r){ return r.entry_type === "withdrawal" && Number(r.amount_zar) > 0; });
        var pending = requested - cashOut - refunded;
        var principal = -typeVals.plan_purchase - typeVals.plan_upgrade - typeVals.plan_refund;
        var owed = walletNet + pending + principal;
        var profitBal = netCash - owed;
        var income = -typeVals.admin_debit;
        var costs = typeVals.mining_payout + typeVals.bonus + typeVals.admin_credit;
        var profitEarn = income - costs;
        var diff = profitBal - profitEarn;

        var S1 = [];
        var r = 0;
        function push(row){ S1.push(row); r++; return r; }           // returns the 1-based row number

        push([{ v: "KT Cloud Mining — Profit & Loss balancing", s: "title" }]);
        push([{ v: "Period", s: "bold" }, from, now]);
        push([{ v: "Days", s: "bold" }, { v: days, s: "int" }]);
        push([{ v: "Prepared by", s: "bold" }, S.adminName, { v: "Times are shown in the preparer's local time.", s: "note" }]);
        push([]);

        push([{ v: "STEP 1 — Money in and out (cash)", s: "section" }, { v: "", s: "section" }, { v: "How it is worked out", s: "section" }]);
        var rIn = push(["Approved deposits (money in)", { f: 'SUMIFS(' + C + '!$E:$E,' + C + '!$D:$D,"cash_in")', v: cashIn, s: "money" }, { v: "Deposits approved in the period", s: "note" }]);
        var rOut = push(["Approved withdrawals (money out)", { f: '-SUMIFS(' + C + '!$E:$E,' + C + '!$D:$D,"cash_out")', v: cashOut, s: "money" }, { v: "Withdrawals approved in the period (paid out)", s: "note" }]);
        var rNet = push([{ v: "Net cash retained", s: "bold" }, { f: 'B' + rIn + '-B' + rOut, v: netCash, s: "moneyBold" }, { v: "Money in − money out", s: "note" }]);
        push([]);

        push([{ v: "STEP 2 — Change in what the platform owes users", s: "section" }, { v: "", s: "section" }, { v: "", s: "section" }]);
        var firstW = r + 1;
        WALLET_TYPES.forEach(function(w){
            push([w[1], { f: wSum(w[0]), v: typeVals[w[0]], s: "money" }, { v: "Wallet entries of type: " + w[0], s: "note" }]);
        });
        var lastW = r;
        var rWalletNet = push([{ v: "Net change in user wallets", s: "bold" }, { f: 'SUM(B' + firstW + ':B' + lastW + ')', v: walletNet, s: "moneyBold" }, { v: "Sum of the lines above", s: "note" }]);
        var rReq = push(["Withdrawals requested (taken from wallets)", { f: '-SUMIFS(' + W + '!$E:$E,' + W + '!$D:$D,"withdrawal",' + W + '!$E:$E,"<0")', v: requested, s: "money" }, { v: "Negative withdrawal entries", s: "note" }]);
        var rRef = push(["Withdrawals refunded (rejected)", { f: 'SUMIFS(' + W + '!$E:$E,' + W + '!$D:$D,"withdrawal",' + W + '!$E:$E,">0")', v: refunded, s: "money" }, { v: "Positive withdrawal entries", s: "note" }]);
        var rPend = push([{ v: "Change in pending (unpaid) withdrawals", s: "bold" }, { f: 'B' + rReq + '-B' + rOut + '-B' + rRef, v: pending, s: "moneyBold" }, { v: "Requested − paid out − refunded", s: "note" }]);
        var pPur = firstW + 3, pUp = firstW + 4, pRef = firstW + 5;   // positions of purchase / upgrade / refund lines
        var rPrin = push([{ v: "Change in plan principal held", s: "bold" }, { f: '-B' + pPur + '-B' + pUp + '-B' + pRef, v: principal, s: "moneyBold" }, { v: "Purchases + upgrades − refunds (customer capital held in plans)", s: "note" }]);
        var rOwed = push([{ v: "Total change in amount owed to users", s: "bold" }, { f: 'B' + rWalletNet + '+B' + rPend + '+B' + rPrin, v: owed, s: "moneyBold" }, { v: "Wallets + pending withdrawals + plan principal", s: "note" }]);
        push([]);

        push([{ v: "STEP 3 — Profit / (Loss), balance method", s: "section" }, { v: "", s: "section" }, { v: "", s: "section" }]);
        var rBal = push([{ v: "Profit / (Loss)", s: "bold" }, { f: 'B' + rNet + '-B' + rOwed, v: profitBal, s: "moneyBold" }, { v: "Net cash retained − change in amount owed", s: "note" }]);
        push([]);

        push([{ v: "STEP 4 — Profit / (Loss), earnings method", s: "section" }, { v: "", s: "section" }, { v: "", s: "section" }]);
        var pPay = firstW + 2, pBon = firstW + 6, pCr = firstW + 7, pDb = firstW + 8;
        var rInc = push(["Income: admin debits", { f: '-B' + pDb, v: income, s: "money" }, { v: "Money the admin removed from wallets", s: "note" }]);
        var rCost = push(["Costs: mining payouts + bonuses + admin credits", { f: 'B' + pPay + '+B' + pBon + '+B' + pCr, v: costs, s: "money" }, { v: "Money the platform added to wallets", s: "note" }]);
        var rEarn = push([{ v: "Profit / (Loss)", s: "bold" }, { f: 'B' + rInc + '-B' + rCost, v: profitEarn, s: "moneyBold" }, { v: "Income − costs", s: "note" }]);
        push([]);

        push([{ v: "STEP 5 — Check", s: "section" }, { v: "", s: "section" }, { v: "", s: "section" }]);
        var rDiff = push(["Difference between the two methods", { f: 'B' + rBal + '-B' + rEarn, v: diff, s: "money" }, { v: "Should be R0.00", s: "note" }]);
        var balanced = Math.abs(diff) < 0.005;
        push([{ v: "Result", s: "bold" }, { f: 'IF(ABS(B' + rDiff + ')<0.005,"BALANCED","NOT BALANCED")', v: balanced ? "BALANCED" : "NOT BALANCED", s: balanced ? "good" : "bad" },
              { v: "If not balanced, approved deposits in cash and deposits credited to wallets differ.", s: "note" }]);
        push([]);

        push([{ v: "Records included", s: "section" }, { v: "", s: "section" }, { v: "", s: "section" }]);
        push(["Wallet entries", { f: 'COUNTA(' + W + '!$A:$A)-1', v: wallet.length, s: "int" }]);
        push(["Cash entries", { f: 'COUNTA(' + C + '!$A:$A)-1', v: cash.length, s: "int" }]);
        push([]);
        push([{ v: "Notes", s: "bold" }]);
        [
            "Deposits and withdrawals move money between users and the platform but do not change profit.",
            "Plan purchases, upgrades and refunds move customer capital in and out of plans; they are shown as principal, not profit.",
            "Profit / (Loss) here is the in-app result: admin debits less payouts, bonuses and admin credits.",
            "Platform income from outside this app (for example real mining returns) is not recorded and is not included.",
            "Records of deleted users stay in this audit until they are deleted from Settings > Audit."
        ].forEach(function(n){ push([{ v: n, s: "note" }]); });

        // ---- By user sheet
        var users = {};
        function touchUser(rw){
            var key = rw.user_id || ("name:" + (rw.user_name || "unknown"));
            if(!users[key]) users[key] = { key: rw.user_id || "", name: userLabel(rw), phone: rw.user_phone || "" };
            return users[key];
        }
        wallet.forEach(touchUser);
        cash.forEach(touchUser);
        var ulist = Object.keys(users).map(function(k){ return users[k]; }).sort(function(a, b){ return a.name.localeCompare(b.name); });

        var uRows = [[
            { v: "User", s: "header" }, { v: "Phone", s: "header" }, { v: "Cash in", s: "header" }, { v: "Cash out", s: "header" },
            { v: "Payouts", s: "header" }, { v: "Bonuses + credits", s: "header" }, { v: "Debits", s: "header" }, { v: "Net wallet change", s: "header" }, { v: "User ID", s: "header" }
        ]];
        ulist.forEach(function(u, i){
            var row = i + 2;
            var mine = function(rw){ return (rw.user_id || "") === u.key; };
            var wv = function(types){ return wallet.reduce(function(n, rw){ return (mine(rw) && types.indexOf(rw.entry_type) !== -1) ? n + Number(rw.amount_zar) : n; }, 0); };
            var cv = function(type){ return cash.reduce(function(n, rw){ return (mine(rw) && rw.entry_type === type) ? n + Number(rw.amount_zar) : n; }, 0); };
            var fW = function(types){ return types.map(function(t){ return 'SUMIFS(' + W + '!$E:$E,' + W + '!$H:$H,$I' + row + ',' + W + '!$D:$D,"' + t + '")'; }).join("+"); };
            uRows.push([
                u.name, u.phone,
                { f: 'SUMIFS(' + C + '!$E:$E,' + C + '!$H:$H,$I' + row + ',' + C + '!$D:$D,"cash_in")', v: cv("cash_in"), s: "money" },
                { f: '-SUMIFS(' + C + '!$E:$E,' + C + '!$H:$H,$I' + row + ',' + C + '!$D:$D,"cash_out")', v: -cv("cash_out"), s: "money" },
                { f: fW(["mining_payout"]), v: wv(["mining_payout"]), s: "money" },
                { f: fW(["bonus", "admin_credit"]), v: wv(["bonus", "admin_credit"]), s: "money" },
                { f: fW(["admin_debit"]), v: wv(["admin_debit"]), s: "money" },
                { f: 'SUMIFS(' + W + '!$E:$E,' + W + '!$H:$H,$I' + row + ')', v: wallet.reduce(function(n, rw){ return mine(rw) ? n + Number(rw.amount_zar) : n; }, 0), s: "money" },
                u.key
            ]);
        });

        return {
            sheets: [
                { name: "Summary", widths: [52, 20, 62], rows: S1, hideGrid: true },
                { name: "By User", widths: [28, 16, 14, 14, 14, 18, 14, 18, 38], rows: uRows, freeze: { rows: 1 } },
                { name: "Wallet", widths: [18, 26, 16, 16, 20, 44, 38, 38], rows: wRows, freeze: { rows: 1 } },
                { name: "Cash", widths: [18, 26, 16, 12, 16, 30, 38, 38], rows: cRows, freeze: { rows: 1 } }
            ]
        };
    }

    function downloadSpreadsheet(btn){
        var days = (S.audit && S.audit.days) || daysValue("auditDays") || 30;
        var done = KTUI.busy(btn, "Preparing...");
        var progress = function(label){ if(btn.lastChild) btn.lastChild.nodeValue = label; };
        var wcount = 0;

        fetchAllRows(days, "wallet", function(n){ wcount = n; progress("Preparing... " + n + " rows"); }).then(function(wallet){
            return fetchAllRows(days, "cash", function(n){ progress("Preparing... " + (wcount + n) + " rows"); }).then(function(cash){
                progress("Building file...");
                var bytes = KTXlsx.build(buildWorkbook(days, wallet, cash));
                var stamp = new Date().toISOString().slice(0, 10);
                KTXlsx.download(bytes, "KT-Profit-Loss-" + days + "days-" + stamp + ".xlsx");
                done();
                KTUI.success("Spreadsheet downloaded (" + (wallet.length + cash.length) + " records).");
            });
        }).catch(function(e){
            done();
            KTUI.error("Could not prepare the spreadsheet: " + e.message);
        });
    }

    function deleteRecords(btn){
        var days = daysValue("delDays");
        var scope = ($("delScope") || {}).value || "older";
        if(!days){ KTUI.warning("Enter a number of days (1 or more)."); return; }

        var done = KTUI.busy(btn, "Checking...");
        guarded("settings_audit_delete_preview", { p_days: days, p_scope: scope }).then(function(p){
            done();
            if(!p.count){ KTUI.info("There are no audit records in that period."); return; }

            var when = scope === "last" ? "from the last " + days + " days" : "older than " + days + " days";
            KTUI.confirm("Delete " + p.count + " audit record" + (p.count === 1 ? "" : "s") + " " + when + "?\n\nOnly the audit is affected. Deposits, withdrawals, wallets, transactions and every other page stay as they are. This cannot be undone.", {
                title: "Delete audit records", danger: true, confirmText: "Delete",
                busyText: "Deleting...",
                run: function(){
                    return guarded("settings_audit_delete", { p_days: days, p_scope: scope }).then(function(res){
                        S.lastDeleted = res.deleted;
                        return null;
                    }, function(err){ return err.message; });
                }
            }).then(function(ok){
                if(!ok) return;
                KTUI.success(S.lastDeleted + " audit record" + (S.lastDeleted === 1 ? "" : "s") + " deleted.");
                calculateAudit();
            });
        }).catch(function(e){
            done();
            KTUI.error(e.message);
        });
    }

    function onAuditClick(e){
        var t = e.target.closest("[data-act]");
        if(!t) return;
        var act = t.getAttribute("data-act");

        if(act === "days"){ var i = $("auditDays"); if(i) i.value = t.getAttribute("data-days"); calculateAudit(); return; }
        if(act === "calc"){ calculateAudit(); return; }
        if(act === "download"){ downloadSpreadsheet(t); return; }
        if(act === "delete"){ deleteRecords(t); }
    }

    // ---------------------------------------------------------
    // wiring
    // ---------------------------------------------------------
    var pushListener = false;

    function bindRoot(){
        var root = $("ktSettings");
        if(!root || root.getAttribute("data-bound") === "1") return;
        root.setAttribute("data-bound", "1");

        root.addEventListener("click", function(e){
            armIdle();

            var card = e.target.closest("[data-cat]");
            if(card){ openCategory(card.getAttribute("data-cat")); return; }

            var back = e.target.closest("[data-back]");
            if(back){ lock(); show("menu"); return; }

            if(S.view === "sound") onSoundClick(e);
            else if(S.view === "admin") onAdminClick(e);
            else if(S.view === "audit") onAuditClick(e);
        });

        root.addEventListener("change", function(e){
            armIdle();
            if(S.view === "sound") onSoundChange(e);
        });

        root.addEventListener("input", function(e){
            armIdle();
            if(S.view === "admin" && e.target.id === "adminSearch") searchUsers();
        });

        if(!pushListener){
            pushListener = true;
            window.addEventListener("kt-push-changed", function(){
                if(S.view === "sound") refreshPush();
            });
        }
    }

    window.KTSettingsInternals = { compute: compute, buildWorkbook: buildWorkbook };

    window.initSettings = function(){
        // a fresh visit always starts locked
        S.password = null; S.users = null; S.audit = null;
        clearTimeout(S.idle);
        bindRoot();
        show("loading");

        sb.auth.getUser().then(function(r){
            var u = r && r.data && r.data.user;
            if(u) S.adminName = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || u.email || "Admin";
        }).catch(function(){});

        rpc("settings_password_status").then(function(st){
            if(!st || !st.has_password){
                setupCreate();
                show("create");
            } else {
                show("menu");
            }
        }).catch(function(e){
            show("menu");
            KTUI.error("Could not check the settings password: " + e.message);
        });
    };

})();


/* ===== js/dashboard.js ===== */
// =====================================
// DASHBOARD
// =====================================


// =====================================
// SAMPLE DATA
// Used as a fallback while /api/dashboard/stats
// isn't connected yet. Once your backend is live,
// this is only used if the request fails.
// =====================================

const dashboardSampleStats = {

    totalUsers: 12540,

    activePlans: 8,

    totalDeposits: 850000,

    totalWithdrawals: 320500

};



// =====================================
// FORMAT HELPERS
// =====================================

function formatNumber(value){

    return Number(value).toLocaleString("en-US");

}


function formatCurrency(value){

    return "M " + formatNumber(value);

}



// =====================================
// RENDER STATS INTO THE CARDS
// =====================================

function renderDashboardStats(stats){

    document.getElementById("statTotalUsers").textContent =
        formatNumber(stats.totalUsers);

    document.getElementById("statActivePlans").textContent =
        formatNumber(stats.activePlans);

    document.getElementById("statTotalDeposits").textContent =
        formatCurrency(stats.totalDeposits);

    document.getElementById("statTotalWithdrawals").textContent =
        formatCurrency(stats.totalWithdrawals);

}



// =====================================
// LOAD STATS FROM BACKEND
// =====================================

function loadDashboardStats(){

    sb.rpc("get_dashboard_stats")

        .then(({ data, error }) => {

            if(error){

                throw error;

            }

            const row = data[0];

            renderDashboardStats({
                totalUsers: row.total_users,
                activePlans: row.active_plans,
                totalDeposits: row.total_deposits,
                totalWithdrawals: row.total_withdrawals
            });

        })

        .catch(error => {

            console.warn(
                "Dashboard stats request failed, using sample data:",
                error
            );

            renderDashboardStats(dashboardSampleStats);

        });

}



// =====================================
// PENDINGS TABLE
// =====================================

function renderPendingCounts(counts){

    document.getElementById("pendingKyc").textContent =
        formatNumber(counts.kycPending);

    document.getElementById("pendingDeposits").textContent =
        formatNumber(counts.depositsPending);

    document.getElementById("pendingWithdrawals").textContent =
        formatNumber(counts.withdrawalsPending);

    document.getElementById("pendingPasswordResets").textContent =
        formatNumber(counts.passwordResetsPending);

    document.getElementById("pendingPinResets").textContent =
        formatNumber(counts.pinResetsPending);

            document.getElementById("pendingChangeRequests").textContent =
        formatNumber(counts.changeRequestsPending);

    document.getElementById("pendingKycResets").textContent =
        formatNumber(counts.kycResetsPending);

    document.getElementById("pendingUnblockRequests").textContent =
        formatNumber(counts.unblockRequestsPending);

}


// =====================================
// SUPPORT CHAT — number of chats with unread messages
// (counts chats, not messages)
// =====================================

function loadSupportChatCount(){

    const cell = document.getElementById("pendingSupportChats");

    if(!cell) return;

    sb.rpc("admin_list_support_conversations")

        .then(({ data, error }) => {

            if(error){
                throw error;
            }

            const chats = (data || []).filter(row => (row.unread_count || 0) > 0).length;

            const target = document.getElementById("pendingSupportChats");

            if(target){
                target.textContent = formatNumber(chats);
            }

        })

        .catch(error => {

            console.warn("Support chat count request failed:", error);

        });

}


function loadPendingCounts(){

    loadSupportChatCount();

    sb.rpc("get_pending_counts")

        .then(({ data, error }) => {

            if(error){
                throw error;
            }

            const row = data[0];

            renderPendingCounts({
                kycPending: row.kyc_pending,
                depositsPending: row.deposits_pending,
                withdrawalsPending: row.withdrawals_pending,
                passwordResetsPending: row.password_resets_pending,
                pinResetsPending: row.pin_resets_pending,
                changeRequestsPending: row.change_requests_pending,
                kycResetsPending: row.kyc_resets_pending,
                unblockRequestsPending: row.unblock_requests_pending
            });

        })

        .catch(error => {

            console.warn("Pending counts request failed:", error);

        });

}



// =====================================
// INIT DASHBOARD
// =====================================

function initDashboard(){

    console.log("Dashboard initialized");

    loadDashboardStats();
    loadPendingCounts();

    if(window.KTRealtime){
        KTRealtime.register(
            "dashboard",
            ["deposits","withdrawals","kyc_submissions","account_reset_requests","profile_signals","transactions","support_messages","support_conversations"],
            function(){
                loadDashboardStats();
                loadPendingCounts();
            }
        );
    }

}
