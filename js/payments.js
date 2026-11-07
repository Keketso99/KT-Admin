// =========================================================
// KT ADMIN — DEPOSIT PAYMENT DETAILS ("Payments" button, Deposits page)
// Where users send their deposit: USDT address, M-Pesa Till + Acc,
// EcoCash Merchant Code + Acc. Main admin only. Users see changes live.
// Data: public.deposit_payment_details / admin_set_deposit_payment_details
// =========================================================

(function(){

    var FIELDS = [
        { id: "usdt",    label: "USDT",    icon: "fa-brands fa-bitcoin",
          code: { label: "USDT address (TRC-20)", ph: "T…", mono: true }, account: null },
        { id: "mpesa",   label: "M-Pesa",  icon: "fa-solid fa-mobile-screen",
          code: { label: "Till Number", ph: "e.g. 123456" }, account: { label: "Acc (account reference)", ph: "KTMINE" } },
        { id: "ecocash", label: "EcoCash", icon: "fa-solid fa-mobile-screen",
          code: { label: "Merchant Code", ph: "e.g. 123456" }, account: { label: "Acc (account reference)", ph: "KTMINE" } }
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

            var s = state.saved[f.id] || { code: "", account: "" };

            return '' +
                '<div class="pay-card">' +
                    '<div class="pay-head"><div class="mth-ico"><i class="' + f.icon + '"></i></div>' +
                        '<div class="mth-name">' + f.label + '</div></div>' +
                    '<label class="pay-label" for="pay-' + f.id + '-code">' + f.code.label + '</label>' +
                    '<input type="text" id="pay-' + f.id + '-code" class="pay-input' + (f.code.mono ? " pay-mono" : "") + '" ' +
                        'value="' + esc(s.code) + '" placeholder="' + esc(f.code.ph) + '" ' +
                        'autocomplete="off" autocapitalize="off" spellcheck="false" oninput="payDirty(\'' + f.id + '\')">' +
                    (f.account ?
                        '<label class="pay-label" for="pay-' + f.id + '-account">' + f.account.label + '</label>' +
                        '<input type="text" id="pay-' + f.id + '-account" class="pay-input" ' +
                            'value="' + esc(s.account) + '" placeholder="' + esc(f.account.ph) + '" ' +
                            'autocomplete="off" autocapitalize="characters" spellcheck="false" oninput="payDirty(\'' + f.id + '\')">'
                        : '') +
                    '<button type="button" class="pay-save" id="pay-' + f.id + '-save" disabled ' +
                        'onclick="savePayment(\'' + f.id + '\', this)">Save ' + f.label + '</button>' +
                '</div>';

        }).join("");

    }

    function current(id){
        var c = inp(id, "code"), a = inp(id, "account");
        return { code: c ? c.value.trim() : "", account: a ? a.value.trim() : "" };
    }

    window.payDirty = function(id){
        var s = state.saved[id] || { code: "", account: "" }, c = current(id), btn = document.getElementById("pay-" + id + "-save");
        var f = FIELDS.filter(function(x){ return x.id === id; })[0];
        var changed = c.code !== (s.code || "") || (f.account && c.account !== (s.account || ""));
        if(btn) btn.disabled = !changed || !!state.busy[id];
        var ci = inp(id, "code"); if(ci) ci.dataset.dirty = changed ? "1" : "";
    };

    function load(){

        var status = document.getElementById("paymentsStatus");

        return sb.from("deposit_payment_details").select("method, code, account")

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
                (res.data || []).forEach(function(r){ v[r.method] = { code: r.code || "", account: r.account || "" }; });
                state.saved = v; state.loaded = true; state.failed = false;
                if(status){ status.textContent = ""; status.className = "mth-status"; }

                if(first){ render(); return; }

                // live update from another admin: refresh only the cards that are not being edited
                FIELDS.forEach(function(f){
                    var ci = inp(f.id, "code");
                    if(!ci || ci.dataset.dirty) return;
                    var ai = inp(f.id, "account"), n = v[f.id] || { code: "", account: "" };
                    ci.value = n.code; if(ai) ai.value = n.account;
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

        // quick checks here; the database repeats them
        if(id === "usdt"){
            if(!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(c.code)){
                KTUI.warning("Enter a valid USDT (TRC-20) address: it starts with T and is 34 characters.");
                return;
            }
        }else{
            if(!/^[A-Za-z0-9]{3,20}$/.test(c.code)){
                KTUI.warning(f.code.label + " must be 3 to 20 letters or numbers, no spaces.");
                return;
            }
            if(!/^[A-Za-z0-9 _-]{1,30}$/.test(c.account)){
                KTUI.warning("Account reference must be 1 to 30 letters, numbers, spaces, - or _.");
                return;
            }
        }

        var shown = id === "usdt" ? c.code
            : (id === "mpesa" ? "Till Number: " : "Merchant Code: ") + c.code + " · Acc: " + c.account;

        KTUI.confirm(
            "Users will be told to send " + f.label + " deposits to:\n\n" + shown +
            "\n\nCheck it carefully. Money sent to a wrong address or number cannot be recovered.",
            {
                title: "Change " + f.label + " payment details", confirmText: "Save", busyText: "Saving...",
                run: function(){
                    state.busy[id] = true;
                    return sb.rpc("admin_set_deposit_payment_details", { p_method: id, p_code: c.code, p_account: id === "usdt" ? null : c.account })
                        .then(function(res){
                            state.busy[id] = false;
                            if(res.error) return res.error.message;
                            return null;
                        });
                }
            }
        ).then(function(ok){
            if(!ok) return;
            state.saved[id] = { code: c.code, account: id === "usdt" ? "" : c.account };
            if(isOpen()) payDirty(id);
            KTUI.toast(f.label + " payment details saved. Users see them now.", "success");
        });

    };

})();
