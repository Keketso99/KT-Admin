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
                    '<small>Shown to users as: <b>' + esc(nicks[a.user_id] || name) + '</b></small>' +
                    '<button class="kt-set-mini primary kt-set-rename" data-act="set-nickname" data-id="' + esc(a.user_id) + '" data-name="' + esc(name) + '" data-nick="' + esc(nicks[a.user_id] || "") + '"><i class="fa-solid fa-pen"></i> Rename nickname</button></div>' +
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
            KTUI.prompt("Nickname users will see in KT Support instead of " + name + "'s real name. It must be different from every other admin's nickname.", {
                title: "Admin nickname", confirmText: "Save", busyText: "Saving...", value: current, placeholder: "e.g. Admin 1",
                validate: function(v){ v = (v || "").trim(); return !v ? "Enter a nickname." : v.length > 40 ? "Use 40 characters or fewer." : null; },
                run: function(v){
                    return rpc("settings_set_admin_nickname", { p_user_id: id, p_nickname: (v || "").trim() })
                        .then(function(){ return null; }, function(err){ return err.message; });
                }
            }).then(function(v){
                if(v === null) return;
                KTUI.success("Nickname saved.");
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
