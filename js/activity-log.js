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
kyc_resubmission_requested: "users",
kyc_additional_documents_requested: "users",
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

async function loadActivityLogs(){

    const list = document.getElementById("activityList");

    if(list){
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

    const modal = document.getElementById("activityModal");
    const details = document.getElementById("activityDetails");
    const title = document.getElementById("activityModalTitle");
    const icon = document.getElementById("activityModalIcon");

    if(!modal || !details) return;

    const actorProfile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
    const actorName = getActorName(entry);
    const actorPhone = getActorPhone(entry);

    if(title){
        title.textContent = entry.activity || "Activity Details";
    }

    if(icon){
        icon.className = entry.icon || "fa-solid fa-circle-info";
    }

    const targetLabel = entry.target_type || entry.target_table || null;

    details.innerHTML = `
        <div class="activity-detail-summary">
            <div class="activity-detail-summary-icon">
                <i class="${escapeActivityHtml(entry.icon)}"></i>
            </div>
            <div class="activity-detail-summary-text">
                <h4>${escapeActivityHtml(entry.activity)}</h4>
                <p>${escapeActivityHtml(formatActivityDateTime(entry.created_at))}</p>
            </div>
            <span class="activity-result-badge ${resultClass(entry.result)}">
                ${escapeActivityHtml(resultLabel(entry.result))}
            </span>
        </div>

        <div class="activity-detail-section">
            <div class="activity-detail-section-title">
                <i class="fa-solid fa-circle-info"></i>
                Activity Information
            </div>
            ${addDetailRow("Activity ID", entry.id)}
            ${addDetailRow("Category", labelForActivity(entry.category))}
            ${addDetailRow("Action", entry.action)}
            ${addDetailRow("Result", resultLabel(entry.result))}
            ${addDetailRow("Date & Time", formatActivityDateTime(entry.created_at))}
            ${addDetailRow("Read", entry.is_read ? "Yes" : "No")}
        </div>

        <div class="activity-detail-section">
            <div class="activity-detail-section-title">
                <i class="fa-solid fa-user"></i>
                Actor
            </div>
            ${addDetailRow("Actor", actorName)}
            ${addDetailRow("Actor phone", actorPhone)}
            ${addDetailRow("Actor type", entry.actor_type)}
            ${addDetailRow("Actor ID", entry.actor_id)}
            ${actorProfile && actorProfile.email ? addDetailRow("Actor email", actorProfile.email) : ""}
            ${actorProfile && actorProfile.country ? addDetailRow("Actor country", actorProfile.country) : ""}
        </div>

        <div class="activity-detail-section">
            <div class="activity-detail-section-title">
                <i class="fa-solid fa-crosshairs"></i>
                Target
            </div>
            ${addDetailRow("Target type", targetLabel)}
            ${addDetailRow("Target table", entry.target_table)}
            ${addDetailRow("Target ID", entry.target_id)}
        </div>

        <div class="activity-detail-section">
            <div class="activity-detail-section-title">
                <i class="fa-solid fa-shield-halved"></i>
                Security / Session Details
            </div>
            ${addDetailRow("IP address", entry.ip_address)}
            ${addDetailRow("Approximate location", entry.approximate_location)}
            ${addDetailRow("Device ID", entry.device_id)}
            ${addDetailRow("Device", entry.device_name)}
            ${addDetailRow("Operating system", entry.os_name)}
            ${addDetailRow("OS version", entry.os_version)}
            ${addDetailRow("Session ID", entry.session_id)}
            ${addDetailRow("Masked identifier", entry.identifier_masked)}
            ${addDetailBlock("User agent", entry.user_agent)}
        </div>

        ${renderMetadata(entry.metadata)}
    `;

    modal.classList.add("show");
    document.body.classList.add("activity-modal-open");
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
// GLOBAL ACCESS
// =========================================================

window.initActivityLogs = initActivityLogs;
window.loadActivityLogs = loadActivityLogs;
window.showActivityTab = showActivityTab;
window.viewActivity = viewActivity;
window.closeActivityModal = closeActivityModal;
