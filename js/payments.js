// =========================================================
// KT ADMIN — DEPOSIT PAYMENT DETAILS ("Payments" button, Deposits page)
// Where users send their deposit. For each method the admin edits a TITLE and
// the whole DETAILS text users copy (free text, no format checks).
// Main admin only. Users see changes live.
// Data: public.deposit_payment_details / admin_set_deposit_payment_details
// =========================================================

(function(){

    var FIELDS = [
        { id: "usdt",    label: "USDT",    icon: "fa-brands fa-bitcoin",     detailsLabel: "Address (users copy this)", mono: true },
        { id: "mpesa",   label: "M-Pesa",  icon: "fa-solid fa-mobile-screen", detailsLabel: "Details (users copy this whole text)" },
        { id: "ecocash", label: "EcoCash", icon: "fa-solid fa-mobile-screen", detailsLabel: "Details (users copy this whole text)" }
    ];

    var state = { saved: {}, loaded: false, failed: false, channel: null, busy: {} };

    function modalEl(){ return document.getElementById("paymentsModal"); }
    function isOpen(){ var m = modalEl(); return !!m && m.style.display === "flex"; }
    function inp(id, part){ return document.getElementById("pay-" + id + "-" + part); }
    function esc(t){ return String(t == null ? "" : t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"); }

    function ensureModal(){

        var m = modalEl();
        if(m) return m;

        m = document.createElement("div");
        m.id = "paymentsModal";
        m.className = "withdrawal-modal";
        m.innerHTML =
            '<div class="withdrawal-modal-content">' +
                '<div class="wmodal-header">' +
                    '<h2>Deposit Payment Details</h2>' +
                    '<button type="button" class="wclose-modal" onclick="closePayments()">×</button>' +
                '</div>' +
                '<div class="mth-body">' +
                    '<p class="mth-text">This is where users are told to send their deposit. ' +
                    'Each method is saved on its own and users see the new details <b>instantly</b>.</p>' +
                    '<div id="paymentsList" class="mth-list"></div>' +
                    '<p class="mth-status" id="paymentsStatus"></p>' +
                '</div>' +
                '<div class="wmodal-buttons">' +
                    '<button type="button" class="wclose-btn" onclick="closePayments()">Close</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(m);

        m.addEventListener("click", function(e){ if(e.target === m) closePayments(); });
        document.addEventListener("keydown", function(e){ if(e.key === "Escape" && isOpen()) closePayments(); });

        return m;

    }

    function skeleton(){
        return FIELDS.map(function(){
            return '<div class="mth-row pay-card mth-skel" aria-hidden="true">' +
                '<div class="mth-ico"></div>' +
                '<div class="mth-info"><div class="mth-bar mth-bar-name"></div><div class="mth-bar mth-bar-sub"></div></div>' +
            '</div>';
        }).join("");
    }

    function render(){

        var list = document.getElementById("paymentsList");
        if(!list) return;

        if(!state.loaded){ list.innerHTML = state.failed ? "" : skeleton(); return; }

        list.innerHTML = FIELDS.map(function(f){

            var s = state.saved[f.id] || { title: "", details: "" };

            return '' +
                '<div class="pay-card">' +
                    '<div class="pay-head"><div class="mth-ico"><i class="' + f.icon + '"></i></div>' +
                        '<div class="mth-name">' + f.label + '</div></div>' +
                    '<label class="pay-label" for="pay-' + f.id + '-title">Title</label>' +
                    '<input type="text" id="pay-' + f.id + '-title" class="pay-input" maxlength="60" ' +
                        'value="' + esc(s.title) + '" autocomplete="off" spellcheck="false" oninput="payDirty(\'' + f.id + '\')">' +
                    '<label class="pay-label" for="pay-' + f.id + '-details">' + f.detailsLabel + '</label>' +
                    '<textarea id="pay-' + f.id + '-details" class="pay-input pay-area' + (f.mono ? " pay-mono" : "") + '" rows="2" maxlength="200" ' +
                        'autocomplete="off" spellcheck="false" oninput="payDirty(\'' + f.id + '\')">' + esc(s.details) + '</textarea>' +
                    '<button type="button" class="pay-save" id="pay-' + f.id + '-save" disabled ' +
                        'onclick="savePayment(\'' + f.id + '\', this)">Save ' + f.label + '</button>' +
                '</div>';

        }).join("");

    }

    function norm(t){ return String(t == null ? "" : t).replace(/\s+/g, " ").trim(); }

    function current(id){
        var t = inp(id, "title"), d = inp(id, "details");
        return { title: t ? norm(t.value) : "", details: d ? norm(d.value) : "" };
    }

    window.payDirty = function(id){
        var s = state.saved[id] || { title: "", details: "" }, c = current(id), btn = document.getElementById("pay-" + id + "-save");
        var changed = c.title !== norm(s.title) || c.details !== norm(s.details);
        if(btn) btn.disabled = !changed || !!state.busy[id];
        var ti = inp(id, "title"); if(ti) ti.dataset.dirty = changed ? "1" : "";
    };

    function load(){

        var status = document.getElementById("paymentsStatus");

        return sb.from("deposit_payment_details").select("method, title, details")

            .then(function(res){

                if(!isOpen()) return;

                if(res.error){
                    if(!state.loaded){
                        state.failed = true; render();
                        if(status){
                            status.innerHTML = 'Failed to load: ' + esc(res.error.message) +
                                ' <button type="button" class="mth-retry" onclick="retryPayments()">Try again</button>';
                            status.className = "mth-status mth-status-error";
                        }
                    }
                    return;
                }

                var first = !state.loaded, before = state.saved;
                var v = {};
                (res.data || []).forEach(function(r){ v[r.method] = { title: r.title || "", details: r.details || "" }; });
                state.saved = v; state.loaded = true; state.failed = false;
                if(status){ status.textContent = ""; status.className = "mth-status"; }

                if(first){ render(); return; }

                // live update from another admin: refresh only the cards that are not being edited
                FIELDS.forEach(function(f){
                    var ti = inp(f.id, "title");
                    if(!ti || ti.dataset.dirty) return;
                    var di = inp(f.id, "details"), n = v[f.id] || { title: "", details: "" };
                    ti.value = n.title; if(di) di.value = n.details;
                    payDirty(f.id);
                });

            });

    }

    function subscribe(){
        unsubscribe();
        try{
            state.channel = sb.channel("payments-admin-" + Date.now())
                .on("postgres_changes", { event: "*", schema: "public", table: "deposit_payment_details" }, function(){ if(isOpen()) load(); })
                .subscribe();
        }catch(e){ console.warn("[payments] live channel failed", e); }
    }

    function unsubscribe(){
        if(state.channel){ try{ sb.removeChannel(state.channel); }catch(e){} state.channel = null; }
    }

    window.openPayments = function(){

        var m = ensureModal();
        state.saved = {}; state.loaded = false; state.failed = false; state.busy = {};

        var status = document.getElementById("paymentsStatus");
        status.textContent = ""; status.className = "mth-status";

        render();
        m.style.display = "flex";
        m.scrollTop = 0;
        load();
        subscribe();

    };

    window.retryPayments = function(){
        state.failed = false;
        var status = document.getElementById("paymentsStatus");
        if(status){ status.textContent = ""; status.className = "mth-status"; }
        render(); load();
    };

    window.closePayments = function(){
        var m = modalEl();
        if(m) m.style.display = "none";
        unsubscribe();
    };

    window.savePayment = function(id, button){

        if(window.KTPerm && !KTPerm.require("change deposit payment details")) return;
        if(state.busy[id]) return;

        var f = FIELDS.filter(function(x){ return x.id === id; })[0];
        var c = current(id);

        if(!c.title){ KTUI.warning("Enter a title."); return; }
        if(!c.details){ KTUI.warning("Enter the details users should copy."); return; }

        KTUI.confirm(
            "Users will see:\n\n" + c.title + "\n" + c.details +
            "\n\nCheck it carefully. Money sent to a wrong address or number cannot be recovered.",
            {
                title: "Change " + f.label + " payment details", confirmText: "Save", busyText: "Saving...",
                run: function(){
                    state.busy[id] = true;
                    return sb.rpc("admin_set_deposit_payment_details", { p_method: id, p_title: c.title, p_details: c.details })
                        .then(function(res){
                            state.busy[id] = false;
                            if(res.error) return res.error.message;
                            return null;
                        });
                }
            }
        ).then(function(ok){
            if(!ok) return;
            state.saved[id] = { title: c.title, details: c.details };
            if(isOpen()) payDirty(id);
            KTUI.toast(f.label + " payment details saved. Users see them now.", "success");
        });

    };

})();
