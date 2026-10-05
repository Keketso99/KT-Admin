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
