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
        ".kt-ui-btn.kt-primary{background:var(--kt-c);color:#fff}";

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
                card.appendChild(input);

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

            function close(ok){
                if(closed) return;
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
                if(input && config.input && typeof config.input.validate === "function"){
                    var problem = config.input.validate(input.value);
                    if(problem){
                        errorLine.textContent = problem;
                        input.focus();
                        return;
                    }
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
            showCancel: true
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

    window.KTUI = {
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
