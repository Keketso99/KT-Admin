// =========================================================
// KT ADMIN — SETTINGS > MANUAL DELETE
//   Delete records of ONE page at a time (Deposits, Withdrawals, Transactions,
//   Notifications, Activity log, Security log):
//     - by days  (older than N days / newer than N days)
//     - or only the records you pick (press and hold a record to start selecting)
//   Nothing cascades: other pages, wallet balances and Dashboard totals stay as they are.
//   Mounted by settings.js, which passes in its password-checked helpers.
// =========================================================

(function(){

    var PAGES = [
        { k: "deposits",      label: "Deposits",      one: "deposit",      note: "Pending deposits are never deleted. Dashboard totals stay the same." },
        { k: "withdrawals",   label: "Withdrawals",   one: "withdrawal",   note: "Pending withdrawals are never deleted. Dashboard totals stay the same." },
        { k: "transactions",  label: "Transactions",  one: "transaction",  note: "Wallet balances are not changed. Transactions of pending deposits or withdrawals are kept." },
        { k: "notifications", label: "Notifications", one: "notification", note: "Only the Notifications page. The Activity log is not touched." },
        { k: "security",      label: "Security log",  one: "security event", note: "Only the Security log in Settings." },
        { k: "activity",      label: "Activity log",  one: "activity record", note: "Only the Activity log page. Notifications are not touched." }
    ];
    var HOLD_MS = 500;
    var PAGE_SIZE = 40;

    var M = null;   // current state
    var api = null;
    var root = null;

    function $(sel){ return root ? root.querySelector(sel) : null; }

    function page(){ return PAGES.filter(function(p){ return p.k === M.page; })[0]; }

    function plural(n, word){ return n + " " + word + (n === 1 ? "" : "s"); }

    // -------------------------------------------------------
    // mount
    // -------------------------------------------------------
    function mount(el, helpers){
        root = el;
        api = helpers;
        M = { page: "deposits", rows: [], hasMore: false, selecting: false, picked: {}, loading: false, last: null };
        paintShell();
        bind();
        loadList(true);
    }

    function paintShell(){
        root.innerHTML =
            '<div class="kt-set-card muted"><p class="kt-set-hint" style="margin:0">Delete records of one page at a time. ' +
            'Deleting records here <b>never</b> changes another page, wallet balances or the Dashboard totals. Deleted records cannot be restored.</p></div>' +
            '<div id="mdTabs" class="md-tabs"></div>' +
            '<div id="mdBody"></div>';
        paintTabs();
        paintBody();
    }

    function paintTabs(){
        $("#mdTabs").innerHTML = PAGES.map(function(p){
            return '<button type="button" class="md-tab' + (p.k === M.page ? ' on' : '') + '" data-md="tab" data-k="' + p.k + '">' + p.label + '</button>';
        }).join("");
    }

    function paintBody(){
        var p = page();
        $("#mdBody").innerHTML =
            '<div class="kt-set-card">' +
                '<h3><i class="fa-regular fa-calendar-xmark"></i> Delete ' + api.esc(p.label.toLowerCase()) + ' by days</h3>' +
                '<p class="kt-set-hint">' + api.esc(p.note) + '</p>' +
                '<label>Delete records that are</label>' +
                '<select class="kt-set-input" id="mdMode"><option value="older">Older than</option><option value="newer">Newer than (the last)</option></select>' +
                '<label>Number of days</label>' +
                '<input class="kt-set-input" id="mdDays" type="number" min="1" max="3650" value="30" inputmode="numeric">' +
                '<div class="md-chips">' +
                    '<button type="button" class="md-chip" data-md="days" data-d="7">7 days</button>' +
                    '<button type="button" class="md-chip" data-md="days" data-d="30">30 days</button>' +
                    '<button type="button" class="md-chip" data-md="days" data-d="90">3 months</button>' +
                    '<button type="button" class="md-chip" data-md="days" data-d="180">6 months</button>' +
                    '<button type="button" class="md-chip" data-md="days" data-d="365">1 year</button>' +
                '</div>' +
                '<button class="kt-set-btn danger" id="mdByDays" data-md="bydays"><i class="fa-solid fa-trash-can"></i> Check and delete</button>' +
            '</div>' +
            '<div class="kt-set-card">' +
                '<h3><i class="fa-solid fa-hand-pointer"></i> Or choose records</h3>' +
                '<p class="kt-set-hint">Press and hold a record to start selecting. Then tap the others you want, and press Delete.</p>' +
                '<div id="mdList"></div>' +
            '</div>' +
            '<div id="mdBar"></div>';
        paintList();
        paintBar();
    }

    // -------------------------------------------------------
    // list of records
    // -------------------------------------------------------
    function loadList(reset){
        if(M.loading) return;
        if(reset){ M.rows = []; M.hasMore = false; M.last = null; M.picked = {}; M.selecting = false; paintList(); paintBar(); }
        M.loading = true;
        var l = $("#mdList");
        if(l && reset) l.innerHTML = '<div class="kt-set-empty"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading...</p></div>';
        var target = M.page;
        api.guarded("admin_manual_list", {
            p_target: target, p_limit: PAGE_SIZE,
            p_before: M.last ? M.last.at : null, p_before_id: M.last ? M.last.id : null
        }).then(function(d){
            if(target !== M.page) return;
            M.rows = M.rows.concat(d.rows || []);
            M.hasMore = !!d.has_more;
            M.last = M.rows.length ? M.rows[M.rows.length - 1] : null;
        }).catch(function(e){
            if(target !== M.page) return;
            var l2 = $("#mdList");
            if(l2) l2.innerHTML = '<p class="kt-set-error">' + api.esc(e.message) + '</p>';
            M.rows = null;
        }).then(function(){
            M.loading = false;
            if(M.rows) paintList();
        });
    }

    function paintList(){
        var l = $("#mdList");
        if(!l) return;
        if(!M.rows) return;
        if(!M.rows.length){
            l.innerHTML = '<div class="kt-set-empty"><i class="fa-regular fa-folder-open"></i><p>No ' + api.esc(page().label.toLowerCase()) + ' records.</p></div>';
            return;
        }
        l.innerHTML = M.rows.map(function(r){
            var on = !!M.picked[r.id];
            var amt = (r.amount === null || r.amount === undefined) ? '' : '<b class="md-amt">' + api.esc(api.rand(r.amount)) + '</b>';
            return '<div class="md-row' + (on ? ' picked' : '') + (r.locked ? ' locked' : '') + (M.selecting ? ' selecting' : '') + '" data-id="' + api.esc(r.id) + '">' +
                '<span class="md-check"><i class="fa-solid fa-check"></i></span>' +
                '<span class="md-main"><b>' + api.esc(r.title) + '</b><small>' + api.esc(r.sub || '') + '</small><small>' + api.esc(api.dt(r.at)) + (r.locked ? ' · pending, cannot be deleted' : '') + '</small></span>' +
                amt +
            '</div>';
        }).join("") + (M.hasMore ? '<button class="kt-set-btn light" data-md="more"><i class="fa-solid fa-angles-down"></i> Load more</button>' : '');
    }

    function pickedIds(){ return Object.keys(M.picked); }

    function paintBar(){
        var b = $("#mdBar");
        if(!b) return;
        if(!M.selecting){ b.innerHTML = ''; return; }
        var n = pickedIds().length;
        b.innerHTML = '<div class="md-bar">' +
            '<button type="button" class="md-bar-btn" data-md="cancel">Cancel</button>' +
            '<span class="md-bar-count">' + n + ' selected</span>' +
            '<button type="button" class="md-bar-btn" data-md="all">All shown</button>' +
            '<button type="button" class="md-bar-btn del" data-md="delsel"' + (n ? '' : ' disabled') + '><i class="fa-solid fa-trash-can"></i> Delete</button>' +
        '</div>';
    }

    function toggle(id){
        var r = M.rows.filter(function(x){ return x.id === id; })[0];
        if(!r || r.locked) return;
        if(M.picked[id]) delete M.picked[id]; else M.picked[id] = true;
        if(!pickedIds().length) M.selecting = false;
        paintList();
        paintBar();
    }

    // -------------------------------------------------------
    // press and hold to select
    // -------------------------------------------------------
    var hold = { timer: null, x: 0, y: 0, fired: false, id: null };

    function clearHold(){ clearTimeout(hold.timer); hold.timer = null; }

    function onDown(e){
        var row = e.target.closest(".md-row");
        if(!row) return;
        hold.fired = false;
        hold.id = row.getAttribute("data-id");
        hold.x = e.clientX; hold.y = e.clientY;
        clearHold();
        hold.timer = setTimeout(function(){
            hold.fired = true;
            if(!M.selecting){ M.selecting = true; }
            toggleForce(hold.id);
            try{ if(navigator.vibrate) navigator.vibrate(15); }catch(x){}
        }, HOLD_MS);
    }

    function toggleForce(id){
        var r = M.rows.filter(function(x){ return x.id === id; })[0];
        if(!r || r.locked){
            if(!pickedIds().length) M.selecting = false;
            paintList(); paintBar();
            if(r && r.locked) KTUI.info("Pending records cannot be deleted. Approve or reject them first.");
            return;
        }
        M.picked[id] = true;
        paintList(); paintBar();
    }

    function onMove(e){
        if(!hold.timer) return;
        if(Math.abs(e.clientX - hold.x) > 10 || Math.abs(e.clientY - hold.y) > 10) clearHold();
    }

    function onClick(e){
        var row = e.target.closest(".md-row");
        if(row){
            if(hold.fired){ hold.fired = false; return; }       // the press already selected it
            if(M.selecting) toggle(row.getAttribute("data-id"));
            return;
        }
        var t = e.target.closest("[data-md]");
        if(!t) return;
        var act = t.getAttribute("data-md");
        if(act === "tab"){
            M.page = t.getAttribute("data-k");
            paintTabs(); paintBody(); loadList(true);
        }
        else if(act === "days"){ var i = $("#mdDays"); if(i) i.value = t.getAttribute("data-d"); }
        else if(act === "bydays"){ deleteByDays(t); }
        else if(act === "more"){ loadList(false); }
        else if(act === "cancel"){ M.selecting = false; M.picked = {}; paintList(); paintBar(); }
        else if(act === "all"){ M.rows.forEach(function(r){ if(!r.locked) M.picked[r.id] = true; }); paintList(); paintBar(); }
        else if(act === "delsel"){ deleteSelected(t); }
    }

    function bind(){
        if(root.getAttribute("data-md-bound") === "1") return;
        root.setAttribute("data-md-bound", "1");
        root.addEventListener("pointerdown", onDown);
        root.addEventListener("pointermove", onMove);
        ["pointerup", "pointercancel", "pointerleave"].forEach(function(ev){ root.addEventListener(ev, clearHold); });
        root.addEventListener("contextmenu", function(e){ if(e.target.closest(".md-row")) e.preventDefault(); });
        root.addEventListener("click", onClick);
    }

    // -------------------------------------------------------
    // deleting
    // -------------------------------------------------------
    function removeProofFiles(files){
        var paths = [];
        (files || []).forEach(function(u){
            var m = String(u || "").match(/\/deposit-proofs\/([^?]+)/);
            if(m) paths.push(decodeURIComponent(m[1]));
        });
        if(paths.length) sb.storage.from("deposit-proofs").remove(paths).catch(function(){});
    }

    function afterDelete(res, what){
        var n = Number(res.deleted) || 0;
        var prot = Number(res.protected) || 0;
        if(M.page === "deposits") removeProofFiles(res.files);
        KTUI.success(plural(n, what) + " deleted." + (prot ? " " + plural(prot, "pending record") + " kept." : ""));
        loadList(true);
    }

    function deleteByDays(btn){
        if(window.KTPerm && !KTPerm.require("delete records")) return;
        var days = parseInt(($("#mdDays") || {}).value, 10);
        var mode = ($("#mdMode") || {}).value || "older";
        if(!days || days < 1 || days > 3650){ KTUI.warning("Enter a number of days from 1 to 3650."); return; }
        var p = page();
        var when = (mode === "older" ? "older than " : "from the last ") + days + " day" + (days === 1 ? "" : "s");

        var done = KTUI.busy(btn, "Checking...");
        api.guarded("admin_manual_delete_preview", { p_target: p.k, p_mode: mode, p_days: days }).then(function(pv){
            done();
            if(!pv.count){
                KTUI.info("No " + p.label.toLowerCase() + " " + when + " can be deleted." + (pv.protected ? " (" + plural(pv.protected, "pending record") + " kept.)" : ""));
                return;
            }
            var msg = "Delete " + plural(pv.count, p.one) + " " + when + "?\n\n" + p.note +
                (pv.protected ? "\n\n" + plural(pv.protected, "pending record") + " will be kept." : "") +
                "\n\nThis cannot be undone.";
            return KTUI.confirm(msg, {
                title: "Delete " + p.label.toLowerCase(), danger: true, confirmText: "Delete", busyText: "Deleting...",
                run: function(){
                    return api.guarded("admin_manual_delete_by_days", { p_target: p.k, p_mode: mode, p_days: days }).then(function(res){
                        M.result = res; return null;
                    }, function(e){ return e.message; });
                }
            }).then(function(ok){ if(ok) afterDelete(M.result, p.one); });
        }).catch(function(e){ done(); KTUI.error(e.message); });
    }

    function deleteSelected(btn){
        if(window.KTPerm && !KTPerm.require("delete records")) return;
        var ids = pickedIds();
        if(!ids.length) return;
        var p = page();
        KTUI.confirm("Delete " + plural(ids.length, p.one) + "?\n\nOnly the selected records are deleted. " + p.note + "\n\nThis cannot be undone.", {
            title: "Delete selected", danger: true, confirmText: "Delete", busyText: "Deleting...",
            run: function(){
                return api.guarded("admin_manual_delete_ids", { p_target: p.k, p_ids: ids }).then(function(res){
                    M.result = res; return null;
                }, function(e){ return e.message; });
            }
        }).then(function(ok){ if(ok) afterDelete(M.result, p.one); });
    }

    window.KTManualDelete = { mount: mount };

})();
