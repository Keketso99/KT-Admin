// =========================================================
// KT ADMIN — PAYMENT METHOD SWITCHES (Withdrawals + Deposits)
// One shared window used by the "Method" button on both pages.
// kind = "withdrawal" or "deposit"; the two never affect each other.
// Data: public.method_settings (read) / admin_set_method_enabled (write,
// main admin only). Switches apply immediately; no Save button.
// =========================================================

(function(){

    var METHODS = [
        { id: "usdt",    label: "USDT",    sub: "TRC-20 network", icon: "fa-brands fa-bitcoin" },
        { id: "mpesa",   label: "M-Pesa",  sub: "Mobile money",   icon: "fa-solid fa-mobile-screen" },
        { id: "ecocash", label: "EcoCash", sub: "Mobile money",   icon: "fa-solid fa-mobile-screen" }
    ];

    var state = { kind: null, values: {}, channel: null, busy: {}, loaded: false, failed: false };

    function kindWord(kind){ return kind === "deposit" ? "Deposit" : "Withdrawal"; }

    function modalEl(){ return document.getElementById("methodsModal"); }

    function ensureModal(){

        var m = modalEl();
        if(m) return m;

        m = document.createElement("div");
        m.id = "methodsModal";
        m.className = "withdrawal-modal";
        m.innerHTML =
            '<div class="withdrawal-modal-content">' +
                '<div class="wmodal-header">' +
                    '<h2 id="methodsTitle">Methods</h2>' +
                    '<button type="button" class="wclose-modal" onclick="closeMethods()">×</button>' +
                '</div>' +
                '<div class="mth-body">' +
                    '<p class="mth-text" id="methodsIntro"></p>' +
                    '<div id="methodsList" class="mth-list"></div>' +
                    '<p class="mth-status" id="methodsStatus"></p>' +
                '</div>' +
                '<div class="wmodal-buttons">' +
                    '<button type="button" class="wclose-btn" onclick="closeMethods()">Close</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(m);

        m.addEventListener("click", function(e){ if(e.target === m) closeMethods(); });
        document.addEventListener("keydown", function(e){
            if(e.key === "Escape" && modalEl() && modalEl().style.display === "flex") closeMethods();
        });

        return m;

    }

    function render(){

        var list = document.getElementById("methodsList");
        if(!list) return;

        var word = kindWord(state.kind).toLowerCase();

        // Not loaded yet: grey placeholder rows (no switches), so nothing
        // looks "closed" before the real answer arrives.
        if(!state.loaded){

            list.innerHTML = state.failed ? "" : METHODS.map(function(){
                return '' +
                    '<div class="mth-row mth-skel" aria-hidden="true">' +
                        '<div class="mth-ico"></div>' +
                        '<div class="mth-info">' +
                            '<div class="mth-bar mth-bar-name"></div>' +
                            '<div class="mth-bar mth-bar-sub"></div>' +
                        '</div>' +
                        '<div class="mth-bar mth-bar-switch"></div>' +
                    '</div>';
            }).join("");
            return;

        }

        list.innerHTML = METHODS.map(function(m){

            var on = state.values[m.id] === true;
            var busy = !!state.busy[m.id];

            return '' +
                '<div class="mth-row">' +
                    '<div class="mth-ico"><i class="' + m.icon + '"></i></div>' +
                    '<div class="mth-info">' +
                        '<div class="mth-name">' + m.label + '</div>' +
                        '<div class="mth-sub ' + (on ? "mth-open" : "mth-closed") + '">' +
                            (on ? "Open for " + word + "s" : "Closed for " + word + "s") +
                        '</div>' +
                    '</div>' +
                    '<button type="button" role="switch" aria-checked="' + on + '" ' +
                        'aria-label="' + m.label + ' ' + word + ' switch" ' +
                        'class="mth-switch' + (on ? " mth-on" : "") + '" ' +
                        (busy || !state.loaded ? "disabled " : "") +
                        'onclick="toggleMethod(\'' + m.id + '\')"><span></span></button>' +
                '</div>';

        }).join("");

    }

    function load(){

        var status = document.getElementById("methodsStatus");
        var kind = state.kind;

        return sb.from("method_settings").select("method, enabled").eq("kind", kind)

            .then(function(res){

                if(state.kind !== kind) return;

                if(res.error){

                    if(!state.loaded){
                        state.failed = true;
                        render();
                        if(status){
                            status.innerHTML = 'Failed to load: ' + String(res.error.message).replace(/</g, "&lt;") +
                                ' <button type="button" class="mth-retry" onclick="retryMethods()">Try again</button>';
                            status.className = "mth-status mth-status-error";
                        }
                    }
                    return;

                }

                var v = {};
                METHODS.forEach(function(m){ v[m.id] = false; });
                (res.data || []).forEach(function(r){ v[r.method] = r.enabled === true; });

                state.values = v;
                state.loaded = true;
                state.failed = false;

                if(status){ status.textContent = ""; status.className = "mth-status"; }

                render();

            });

    }

    function subscribe(){

        unsubscribe();

        try{
            var ch = sb.channel("methods-admin-" + Date.now())
                .on("postgres_changes", { event: "*", schema: "public", table: "method_settings" }, function(){
                    // another admin window changed a switch: stay in sync
                    if(modalEl() && modalEl().style.display === "flex") load();
                })
                .subscribe();
            state.channel = ch;
        }catch(e){ console.warn("[methods] live channel failed", e); }

    }

    function unsubscribe(){

        if(state.channel){
            try{ sb.removeChannel(state.channel); }catch(e){}
            state.channel = null;
        }

    }

    window.openMethods = function(kind){

        var m = ensureModal();

        state.kind = kind === "deposit" ? "deposit" : "withdrawal";
        state.values = {};
        state.busy = {};
        state.loaded = false;
        state.failed = false;

        var word = kindWord(state.kind);

        document.getElementById("methodsTitle").textContent = word + " Methods";
        document.getElementById("methodsIntro").innerHTML =
            "Turn a method <b>on</b> to let users make " + word.toLowerCase() + "s with it. " +
            "When it is <b>off</b>, users see that it is closed and cannot continue. " +
            "Changes apply instantly. These switches only affect " + word.toLowerCase() + "s.";

        var status = document.getElementById("methodsStatus");
        status.textContent = "";
        status.className = "mth-status";

        render();
        m.style.display = "flex";
        m.scrollTop = 0;

        load();
        subscribe();

    };

    window.retryMethods = function(){

        if(!state.kind) return;

        state.failed = false;

        var status = document.getElementById("methodsStatus");
        if(status){ status.textContent = ""; status.className = "mth-status"; }

        render();
        load();

    };

    window.closeMethods = function(){

        var m = modalEl();
        if(m) m.style.display = "none";
        unsubscribe();
        state.kind = null;

    };

    window.toggleMethod = function(id){

        if(!state.kind || !state.loaded || state.busy[id]) return;

        if(window.KTPerm && !KTPerm.require("change payment methods")) return;

        var kind = state.kind;
        var word = kindWord(kind).toLowerCase();
        var meta = METHODS.filter(function(m){ return m.id === id; })[0];
        var before = state.values[id] === true;
        var after = !before;

        state.values[id] = after;
        state.busy[id] = true;
        render();

        sb.rpc("admin_set_method_enabled", { p_kind: kind, p_method: id, p_enabled: after })

            .then(function(res){

                state.busy[id] = false;

                if(res.error){

                    if(state.kind === kind){ state.values[id] = before; render(); }
                    if(window.KTUI) KTUI.toast("Could not change " + meta.label + ": " + res.error.message, "error");
                    return;

                }

                if(state.kind === kind) render();
                if(window.KTUI) KTUI.toast(meta.label + " " + word + "s " + (after ? "enabled" : "disabled"), "success");

            });

    };

})();
