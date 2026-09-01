// =================================
// ACTIVITY LOGS
// =================================

let activityData = [];

// =================================
// ACTION -> CATEGORY / ICON MAPPING
// =================================

const ACTIVITY_CATEGORY = {
    approved_deposit: "transactions",
    rejected_deposit: "transactions",
    approved_withdrawal: "transactions",
    rejected_withdrawal: "transactions",
    credited_wallet: "transactions",
    debited_wallet: "transactions",
    approved_kyc: "users",
    rejected_kyc: "users",
    reset_kyc: "users",
    requested_kyc_documents: "users",
    set_user_plan: "users"
    // Anything not listed here (e.g. future plan/exchange-rate
    // edits, or login events) falls back to "changes" below.
};

const ACTIVITY_ICONS = {
    approved_deposit: "fa-solid fa-circle-check",
    rejected_deposit: "fa-solid fa-circle-xmark",
    approved_withdrawal: "fa-solid fa-money-bill-transfer",
    rejected_withdrawal: "fa-solid fa-money-bill-transfer",
    credited_wallet: "fa-solid fa-circle-plus",
    debited_wallet: "fa-solid fa-circle-minus",
    approved_kyc: "fa-solid fa-user-check",
    rejected_kyc: "fa-solid fa-user-xmark",
    reset_kyc: "fa-solid fa-rotate-left",
    requested_kyc_documents: "fa-solid fa-file-circle-question",
    set_user_plan: "fa-solid fa-chart-line"
};

function labelForActivity(action){
    return action
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

// =================================
// LOAD FROM SUPABASE
// =================================

function loadActivityLogs(){

    sb.from("activity_log")
        .select("id, action, target_table, created_at, profiles(username)")
        .order("created_at", { ascending: false })
        .limit(200)

        .then(({ data, error }) => {

            if(error){
                console.error("Failed to load activity log:", error);
                return;
            }

            activityData = data.map(row => ({
                user: row.profiles ? row.profiles.username : "System",
                date: new Date(row.created_at).toLocaleDateString("en-GB", {
                    day: "2-digit", month: "short", year: "numeric"
                }),
                category: ACTIVITY_CATEGORY[row.action] || "changes",
                icon: ACTIVITY_ICONS[row.action] || "fa-solid fa-circle-info",
                activity: labelForActivity(row.action),
                // Every RPC raises an exception (and writes nothing)
                // on failure, so any row that made it into this table
                // did succeed — there's no "Failed" status to show yet.
                status: "Successful"
            }));

            renderActivityLogs();
            updateActivityCounts();
            updateActivityStats();
            showActivityTab("all");

        });

}


// =================================
// RENDER ACTIVITY ROWS FROM DATA
// =================================

function renderActivityLogs(){

    const list = document.getElementById("activityList");

    list.innerHTML = "";

    activityData.forEach(entry=>{

        const row = document.createElement("tr");

        row.className = "activity-row";
        row.dataset.category = entry.category;
        row.dataset.status = entry.status;

        row.innerHTML = `

            <td>${entry.user}</td>

            <td>${entry.date}</td>

            <td>
                <i class="${entry.icon}"></i>
                ${entry.activity}
            </td>

            <td>
                <button
                    class="aview-btn"
                    onclick="viewActivity(this)">

                    View

                </button>
            </td>

        `;

        list.appendChild(row);

    });

}


function initActivityLogs(){

    console.log("Activity Logs Loaded");

    loadActivityLogs();

    setupActivitySearch();

}


// =================================
// UPDATE CATEGORY COUNTS
// =================================

function updateActivityCounts(){

    const activities = document.querySelectorAll(".activity-row");

    let counts = {
        all: activities.length,
        login: 0,
        changes: 0,
        transactions: 0,
        users: 0,
        security: 0
    };

    activities.forEach(row=>{

        const category = row.getAttribute("data-category");

        if(category && counts[category] !== undefined){
            counts[category]++;
        }

    });

    document.getElementById("allCount").textContent = counts.all;
    document.getElementById("loginCount").textContent = counts.login;
    document.getElementById("changesCount").textContent = counts.changes;
    document.getElementById("transactionsCount").textContent = counts.transactions;
    document.getElementById("usersCount").textContent = counts.users;
    document.getElementById("securityCount").textContent = counts.security;

}


// =================================
// UPDATE TODAY / YESTERDAY STATS
// =================================

function updateActivityStats(){

    const rows = document.querySelectorAll(".activity-row");

    let todayCount = 0;
    let yesterdayCount = 0;

    const currentDate = new Date();

    const todayString = currentDate.toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric"
    });

    const previousDate = new Date();
    previousDate.setDate(previousDate.getDate() - 1);

    const yesterdayString = previousDate.toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric"
    });

    rows.forEach(row=>{

        const activityDate = row.children[1].textContent.trim();

        if(activityDate === todayString) todayCount++;
        if(activityDate === yesterdayString) yesterdayCount++;

    });

    document.getElementById("todayActivities").textContent = todayCount;
    document.getElementById("yesterdayActivities").textContent = yesterdayCount;

}


// =================================
// CATEGORY FILTER
// =================================

function showActivityTab(category, button){

    const rows = document.querySelectorAll(".activity-row");

    rows.forEach(row=>{

        if(category === "all"){
            row.style.display = "";
        }
        else if(row.dataset.category === category){
            row.style.display = "";
        }
        else{
            row.style.display = "none";
        }

    });

    document.querySelectorAll(".activity-tab")
        .forEach(tab => tab.classList.remove("active"));

    if(button){
        button.classList.add("active");
    }
    else{
        document.querySelector(".activity-tab").classList.add("active");
    }

}


// =================================
// SEARCH ACTIVITIES
// =================================

function setupActivitySearch(){

    const searchInput = document.getElementById("activitySearch");

    if(!searchInput) return;

    searchInput.addEventListener("input", function(){

        let searchValue = this.value.toLowerCase();

        document.querySelectorAll(".activity-row").forEach(row=>{

            let rowText = row.innerText.toLowerCase();

            row.style.display = rowText.includes(searchValue) ? "" : "none";

        });

    });

}


// =================================
// VIEW ACTIVITY
// =================================

function viewActivity(button){

    let row = button.closest(".activity-row");

    let user = row.children[0].textContent.trim();
    let date = row.children[1].textContent.trim();
    let activity = row.children[2].textContent.trim();
    let status = row.dataset.status || "Successful";

    document.getElementById("activityDetails").innerHTML = `

        <div class="activity-detail-row">
            <span class="activity-detail-label">User</span>
            <span class="activity-detail-value">${user}</span>
        </div>

        <div class="activity-detail-row">
            <span class="activity-detail-label">Date</span>
            <span class="activity-detail-value">${date}</span>
        </div>

        <div class="activity-detail-row">
            <span class="activity-detail-label">Activity</span>
            <span class="activity-detail-value">${activity}</span>
        </div>

        <div class="activity-detail-row">
            <span class="activity-detail-label">Status</span>
            <span class="activity-detail-value">${status}</span>
        </div>

    `;

    document.getElementById("activityModal").classList.add("show");

}


// =================================
// CLOSE MODAL
// =================================

function closeActivityModal(){
    document.getElementById("activityModal").classList.remove("show");
}
