// =========================================================
// KT ADMIN — PAYMENT METHOD SWITCHES (Withdrawals + Deposits)
// One shared window used by the "Method" button on both pages.
// kind = "withdrawal" or "deposit"; the two never affect each other.
// Data: public.method_settings (read) / admin_set_method_enabled and
// admin_set_method_visible (write, main admin only). Switches apply immediately;
// no Save button.
// Two switches per method: "On/Off" (open or closed) and "Show to users"
// (hidden completely in the user app).
// =========================================================

(function(){

    var METHODS = [
        { id: "usdt",    label: "USDT",    sub: "",               icon: "fa-brands fa-bitcoin" },
        { id: "mpesa",   label: "M-Pesa",  sub: "Mobile money",   icon: "fa-solid fa-mobile-screen" },
        { id: "ecocash", label: "EcoCash", sub: "Mobile money",   icon: "fa-solid fa-mobile-screen" },
        { id: "standard_bank", label: "Standard Bank", sub: "Bank account", icon: "fa-solid fa-building-columns" },
        { id: "fnb_bank",      label: "FNB Bank",      sub: "Bank account", icon: "fa-solid fa-building-columns" }
    ];

    var state = { kind: null, values: {}, shown: {}, channel: null, busy: {}, loaded: false, failed: false, network: "" };

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
            var shown = state.shown[m.id] !== false;
            var busyV = !!state.busy["v_" + m.id];

            return '' +
              '<div class="mth-card' + (shown ? "" : " mth-hidden") + '">' +
                '<div class="mth-row">' +
                    '<div class="mth-ico"><i class="' + m.icon + '"></i></div>' +
                    '<div class="mth-info">' +
                        '<div class="mth-name">' + m.label + (m.id === "usdt" && state.network ? ' <span class="mth-net">(' + String(state.network).replace(/</g, "&lt;") + ')</span>' : '') + '</div>' +
                        '<div class="mth-sub ' + (on ? "mth-open" : "mth-closed") + '">' +
                            (on ? "Open for " + word + "s" : "Closed for " + word + "s") +
                        '</div>' +
                    '</div>' +
                    '<button type="button" role="switch" aria-checked="' + on + '" ' +
                        'aria-label="' + m.label + ' ' + word + ' switch" ' +
                        'class="mth-switch' + (on ? " mth-on" : "") + '" ' +
                        (busy || !state.loaded ? "disabled " : "") +
                        'onclick="toggleMethod(\'' + m.id + '\')"><span></span></button>' +
                '</div>' +
                '<div class="mth-row mth-row2">' +
                    '<div class="mth-info">' +
                        '<div class="mth-name mth-name2">Show to users</div>' +
                        '<div class="mth-sub ' + (shown ? "mth-open" : "mth-closed") + '">' +
                            (shown ? "Shown in the user app" : "Hidden from the user app") +
                        '</div>' +
                    '</div>' +
                    '<button type="button" role="switch" aria-checked="' + shown + '" ' +
                        'aria-label="' + m.label + ' ' + word + ' show to users switch" ' +
                        'class="mth-switch' + (shown ? " mth-on" : "") + '" ' +
                        (busyV || !state.loaded ? "disabled " : "") +
                        'onclick="toggleMethodVisible(\'' + m.id + '\')"><span></span></button>' +
                '</div>' +
              '</div>';

        }).join("");

    }

    function load(){

        var status = document.getElementById("methodsStatus");
        var kind = state.kind;

        return Promise.all([
            sb.from("method_settings").select("method, enabled, visible").eq("kind", kind),
            sb.from("deposit_payment_details").select("network").eq("method", "usdt")
        ])

            .then(function(results){

                var res = results[0];
                var nres = results[1];

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
                var sh = {};
                METHODS.forEach(function(m){ v[m.id] = false; sh[m.id] = true; });
                (res.data || []).forEach(function(r){ v[r.method] = r.enabled === true; sh[r.method] = r.visible !== false; });

                state.values = v;
                state.shown = sh;
                state.network = (nres && nres.data && nres.data[0] && nres.data[0].network) || "";
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
                .on("postgres_changes", { event: "*", schema: "public", table: "deposit_payment_details" }, function(){
                    // the USDT network was edited: show the new name
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
        state.shown = {};
        state.busy = {};
        state.loaded = false;
        state.failed = false;

        var word = kindWord(state.kind);

        document.getElementById("methodsTitle").textContent = word + " Methods";
        document.getElementById("methodsIntro").innerHTML =
            "Turn a method <b>on</b> to let users make " + word.toLowerCase() + "s with it. " +
            "When it is <b>off</b>, users see that it is closed and cannot continue. " +
            "<b>Show to users</b> is a second switch: when it is off, the method is <b>hidden completely</b> in the user app (linking page and " + word.toLowerCase() + " page, no closed message). Linked accounts are kept. " +
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

    window.toggleMethodVisible = function(id){

        var bk = "v_" + id;
        if(!state.kind || !state.loaded || state.busy[bk]) return;

        if(window.KTPerm && !KTPerm.require("change payment methods")) return;

        var kind = state.kind;
        var word = kindWord(kind).toLowerCase();
        var meta = METHODS.filter(function(m){ return m.id === id; })[0];
        var before = state.shown[id] !== false;
        var after = !before;

        state.shown[id] = after;
        state.busy[bk] = true;
        render();

        sb.rpc("admin_set_method_visible", { p_kind: kind, p_method: id, p_visible: after })

            .then(function(res){

                state.busy[bk] = false;

                if(res.error){

                    if(state.kind === kind){ state.shown[id] = before; render(); }
                    if(window.KTUI) KTUI.toast("Could not change " + meta.label + ": " + res.error.message, "error");
                    return;

                }

                if(state.kind === kind) render();
                if(window.KTUI) KTUI.toast(meta.label + " " + word + "s " + (after ? "shown to users" : "hidden from users"), "success");

            });

    };

})();
