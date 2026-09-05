/* ===== js/supabase-client.js ===== */
// KT Admin Panel — Supabase connection
// Uses the same project + publishable key as the user app's .env.
// The publishable key is meant to be public — real access control
// happens via Postgres row-level security, not by hiding this key.

window.sb = supabase.createClient(
    "https://tkvtsvrjzaohqevuxkhc.supabase.co",
    "sb_publishable_jB4BmxofDzNDTdX_n44NcQ_zRDyydgq"
);


/* ===== js/auth.js ===== */
// KT Admin Panel — Admin authentication gate
// Nothing in the panel is shown until a signed-in user is confirmed
// to have the 'admin' role in user_roles.

function showLoginOverlay(message){
    document.getElementById("login-overlay").style.display = "flex";
    document.getElementById("admin-app").style.display = "none";

    const errEl = document.getElementById("login-error");
    if(message){
        errEl.textContent = message;
        errEl.style.display = "block";
    } else {
        errEl.style.display = "none";
    }
}

function hideLoginOverlay(){
    document.getElementById("login-overlay").style.display = "none";
    document.getElementById("admin-app").style.display = "";
}

async function checkIsAdmin(userId){
    const { data, error } = await sb
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

    return !error && !!data;
}

async function handleAuthedSession(session){
    const isAdmin = await checkIsAdmin(session.user.id);

    if(isAdmin){
        hideLoginOverlay();
        if(typeof loadAdminPage === "function"){
            loadAdminPage("dashboard");
        }
    } else {
        await sb.auth.signOut();
        showLoginOverlay("This account doesn't have admin access.");
    }
}

async function initAuth(){
    const { data: { session } } = await sb.auth.getSession();

    if(session){
        await handleAuthedSession(session);
    } else {
        showLoginOverlay();
    }
}

async function loginSubmit(event){
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const btn = document.getElementById("login-submit-btn");

    btn.disabled = true;
    btn.textContent = "Signing in...";

    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    btn.disabled = false;
    btn.textContent = "Sign In";

    if(error){
        showLoginOverlay(error.message);
        return;
    }

    await handleAuthedSession(data.session);
}

async function adminLogout(){
    await sb.auth.signOut();
    showLoginOverlay();
}

document.addEventListener("DOMContentLoaded", initAuth);


/* ===== js/admin.js ===== */
// ==============================
// ADMIN PAGE LOADING SYSTEM
// ==============================


const adminBody = document.getElementById("admin-body");

document.addEventListener(
    "contextmenu",
    function(event) {

        if (
            event.target.closest(
                "input, textarea, [contenteditable='true']"
            )
        ) {

            return;

        }


        event.preventDefault();

    }
);

// Load admin page


const pageCache = {};

function loadAdminPage(page){

    adminBody.classList.remove("page-fade-in");

    const render = (data) => {

        adminBody.innerHTML = data;
        adminBody.appendChild(modalOverlay);

        // Reset scroll position
        adminBody.scrollTop = 0;

        // Change active menu
        setActiveMenu(page);

        // Trigger fade-in transition
        requestAnimationFrame(()=>{
            adminBody.classList.add("page-fade-in");
        });

        // Initialize page scripts
        switch(page){

            case "transactions":
                if(typeof initTransactions === "function") initTransactions();
            break;

            case "withdrawals":
                if(typeof initWithdrawals === "function") initWithdrawals();
            break;

            case "deposits":
                if(typeof initDeposits === "function") initDeposits();
            break;

            case "plans":
                if(typeof initPlans === "function") initPlans();
            break;

            case "users":
                if(typeof initUsers === "function") initUsers();
            break;

            case "verification":
                if(typeof initVerification === "function") initVerification();
            break;

            case "exchange":
                if(typeof initExchangeRates === "function") initExchangeRates();
            break;

            case "notifications":
                if(typeof initNotifications === "function") initNotifications();
            break;

            case "activity-log":
                if(typeof initActivityLogs === "function") initActivityLogs();
            break;

            case "support-chat":
                if(typeof initSupportChatPage === "function") initSupportChatPage();
            break;

            case "settings":
                if(typeof initSettings === "function") initSettings();
            break;

            case "dashboard":
                if(typeof initDashboard === "function") initDashboard();
            break;

        }
    };

    // Serve instantly from cache if we already have it
    if(pageCache[page]){
        render(pageCache[page]);
        return;
    }

    fetch("admin-pages/" + page + ".html")

    .then(response=>{
        if(!response.ok){
            throw new Error("Page not found");
        }
        return response.text();
    })

    .then(data=>{
        pageCache[page] = data;
        render(data);
    })

    .catch(error=>{
        adminBody.innerHTML = `
        <div class="admin-card">
            <h2>Page Error</h2>
            <p>${error.message}</p>
        </div>
        `;
        requestAnimationFrame(()=>{
            adminBody.classList.add("page-fade-in");
        });
    });

}

// Silently pre-fetch every other page into cache right after
// the dashboard loads, so switching pages later feels instant
// even on the first click.
function prefetchAllPages(){
    const pages = [
        "deposits","withdrawals","transactions","plans","users",
        "verification","exchange","notifications","activity-log",
        "support-chat","settings"
    ];

    pages.forEach(page=>{
        if(pageCache[page]) return;
        fetch("admin-pages/" + page + ".html")
        .then(response=> response.ok ? response.text() : null)
        .then(data=>{
            if(data) pageCache[page] = data;
        })
        .catch(()=>{ /* silent — will just fetch normally if this fails */ });
    });
}


// ==============================
// ACTIVE SIDEBAR ITEM
// ==============================


function setActiveMenu(page) {
    // Clear all active states
    document.querySelectorAll(".side-item, .submenu div")
        .forEach(item => item.classList.remove("active"));

    // Highlight the correct sidebar item
    document.querySelectorAll(".side-item")
        .forEach(item => {
            if (item.getAttribute("onclick")?.includes(page)) {
                item.classList.add("active");
            }
        });

    // Highlight the correct submenu item
    document.querySelectorAll(".submenu div")
        .forEach(item => {
            if (item.getAttribute("onclick")?.includes(page)) {
                item.classList.add("active");

                // Keep parent dropdown open when submenu is active
                const parentDropdown = item.closest(".dropdown");
                if (parentDropdown) {
                    parentDropdown.classList.add("open");
                }
            }
        });
}




// ==============================
// DROPDOWN MENU
// ==============================


function toggleMenu(element){


    const parent = element.parentElement;


    parent.classList.toggle("open");


}






// ==============================
// MOBILE SIDEBAR
// ==============================


const menuBtn = document.getElementById("menu-btn");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");

function openSidebar(){
    sidebar.classList.add("show");
    sidebarOverlay.classList.add("show");
}

function closeSidebar(){
    sidebar.classList.remove("show");
    sidebarOverlay.classList.remove("show");
}

menuBtn.addEventListener("click",()=>{
    if(sidebar.classList.contains("show")){
        closeSidebar();
    } else {
        openSidebar();
    }
});

// Tapping the blurred area closes the sidebar
sidebarOverlay.addEventListener("click", closeSidebar);






// Close sidebar only when selecting a page
document.querySelectorAll(".submenu div, .side-item:not(.dropdown)")
.forEach(item=>{
    item.addEventListener("click",()=>{
        if(window.innerWidth <= 768){
            closeSidebar();
        }
    });
});


// ==============================
// GLOBAL MODAL OVERLAY (blur + click-block)
// Auto-detects any element whose class ends in "-modal"
// becoming visible, on ANY page loaded into #admin-body.
// No per-page code required — works for every current
// and future modal that follows the "*-modal" naming
// convention already used across the project.
// ==============================

const modalOverlay = document.createElement("div");
modalOverlay.id = "modal-overlay";


function isVisible(el){
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
}

function refreshModalOverlay(){
    const modals = document.querySelectorAll('#admin-body [class$="-modal"]');
    let anyOpen = false;

    modals.forEach(modal=>{
        if(!isRealModal(modal)) return; // skip stray buttons/boxes that just end in "-modal"
        if(modal.querySelector(':scope > [class*="-overlay"]')) return; // settings-style self-managed modals
        if(isVisible(modal)){
            anyOpen = true;
        }
    });

    modalOverlay.classList.toggle("show", anyOpen);
}

modalOverlay.addEventListener("click",()=>{
    document.querySelectorAll('#admin-body [class$="-modal"]')
    .forEach(modal=>{
        if(!isRealModal(modal)) return;
        if(modal.querySelector(':scope > [class*="-overlay"]')) return;

        if(isVisible(modal)){
            modal.style.display = "none";
        }
    });
});

function isRealModal(el){
    return window.getComputedStyle(el).position === "fixed";
}

// Watches the whole admin body for style/class changes on
// any descendant — catches every way a modal might be shown
// (style.display, classList.add, etc.) without needing to
// know each page's exact open/close functions.
const modalObserver = new MutationObserver(refreshModalOverlay);

modalObserver.observe(adminBody, {
    attributes:true,
    attributeFilter:["style","class"],
    subtree:true,
    childList:true
});

// Clicking the blurred backdrop closes whatever modal is open



// ==============================
// LOAD DEFAULT PAGE
// ==============================

window.onload = ()=>{

    // Nothing auto-loads here anymore — auth.js calls
    // loadAdminPage("dashboard") itself once login is confirmed.

    // Wait until the browser is idle so this never competes
    // with the dashboard's own initial render
    if("requestIdleCallback" in window){
        requestIdleCallback(prefetchAllPages);
    } else {
        setTimeout(prefetchAllPages, 1000);
    }

};

/* ===== js/withdrawals.js ===== */
// =====================================
// WITHDRAWAL MANAGEMENT
// =====================================


// =====================================
// LIVE DATA (populated from Supabase)
// =====================================

let withdrawals = {};


// =====================================
// METHOD LABEL HELPER
// =====================================

function formatWithdrawalMethodLabel(method){

    const labels = {
        usdt_trc20: "USDT (TRC20)",
        mpesa: "M-Pesa",
        ecocash: "EcoCash"
    };

    return labels[method] || method;

}


// =====================================
// LOAD WITHDRAWALS FROM SUPABASE
// =====================================

function loadWithdrawals(){

    sb.from("withdrawals")
        .select("id, amount_zar, status, created_at, profiles(username), payment_methods(method)")
        .order("created_at", { ascending: false })

        .then(({ data, error }) => {

            if(error){

                console.error("Failed to load withdrawals:", error);

                return;

            }

            withdrawals = {};

            data.forEach(row => {

                withdrawals[row.id] = {

                    id: row.id,

                    user: row.profiles ? row.profiles.username : "Unknown",

                    method: row.payment_methods
                        ? formatWithdrawalMethodLabel(row.payment_methods.method)
                        : "—",

                    amount: "M " + Number(row.amount_zar).toLocaleString("en-US"),

                    date: new Date(row.created_at).toLocaleDateString("en-US", {
                        day: "2-digit", month: "short", year: "numeric"
                    }),

                    status: row.status.charAt(0).toUpperCase() + row.status.slice(1)

                };

            });

            renderWithdrawalTables();

            updateWithdrawalStats();

        });

}



// =====================================
// INIT WITHDRAWALS
// =====================================

function initWithdrawals(){

    console.log("Withdrawals initialized");


    // Load real data (renders + updates stats when it arrives)

    loadWithdrawals();


    // Show Pending by default

    showWithdrawalTab("pending");

}



// =====================================
// UPDATE WITHDRAWAL STATISTICS
// =====================================

function updateWithdrawalStats(){

    let pending = 0;

    let approved = 0;

    let rejected = 0;


    Object.values(withdrawals).forEach(withdrawal => {

        if(withdrawal.status === "Pending"){

            pending++;

        }

        else if(withdrawal.status === "Approved"){

            approved++;

        }

        else if(withdrawal.status === "Rejected"){

            rejected++;

        }

    });



    // =================================
    // UPDATE COUNTERS
    // =================================

    const pendingCount =
        document.getElementById(
            "wpendingCount"
        );

    const approvedCount =
        document.getElementById(
            "wapprovedCount"
        );

    const rejectedCount =
        document.getElementById(
            "wrejectedCount"
        );


    if(pendingCount){

        pendingCount.textContent =
            pending;

    }


    if(approvedCount){

        approvedCount.textContent =
            approved;

    }


    if(rejectedCount){

        rejectedCount.textContent =
            rejected;

    }

}



// =====================================
// SHOW EMPTY WITHDRAWAL MESSAGE
// =====================================

function showEmptyWithdrawalMessage(
    list,
    message,
    columnCount
){

    if(!list) return;


    list.innerHTML = `

        <tr class="empty-withdrawal-row">

            <td colspan="${columnCount}">

                <div class="empty-withdrawal-message">

                    <i class="fa-solid fa-inbox"></i>

                    <span>
                        ${message}
                    </span>

                </div>

            </td>

        </tr>

    `;

}



// =====================================
// RENDER ALL WITHDRAWAL TABLES
// =====================================

function renderWithdrawalTables(){

    const pendingList =
        document.getElementById(
            "pendingWithdrawalList"
        );

    const approvedList =
        document.getElementById(
            "approvedWithdrawalList"
        );

    const rejectedList =
        document.getElementById(
            "rejectedWithdrawalList"
        );


    // =================================
    // CHECK TABLES
    // =================================

    if(
        !pendingList ||
        !approvedList ||
        !rejectedList
    ){

        console.warn(
            "Withdrawal table elements not found"
        );

        return;

    }



    // =================================
    // CLEAR TABLES
    // =================================

    pendingList.innerHTML = "";

    approvedList.innerHTML = "";

    rejectedList.innerHTML = "";



    // =================================
    // GENERATE ROWS
    // =================================
    // NOTE: withdrawal.id is now a UUID. It must be quoted inside
    // onclick="..." — unquoted, the hyphens are read as
    // subtraction and the button silently does nothing.

    Object.values(withdrawals).forEach(
        withdrawal => {


        // =================================
        // PENDING
        // =================================

        if(withdrawal.status === "Pending"){

            pendingList.innerHTML += `

                <tr>

                    <td>
                        ${withdrawal.user}
                    </td>

                    <td>
                        ${withdrawal.date}
                    </td>

                    <td>

                        <button
                            class="review-btn"
                            onclick="openWithdrawalReview('${withdrawal.id}')">

                            Review

                        </button>

                    </td>

                </tr>

            `;

        }



        // =================================
        // APPROVED
        // =================================

        else if(
            withdrawal.status === "Approved"
        ){

            approvedList.innerHTML += `

                <tr>

                    <td>
                        ${withdrawal.user}
                    </td>

                    <td>
                        ${withdrawal.date}
                    </td>

                    <td>

                        <span class="approved">
                            Approved
                        </span>

                    </td>

                    <td>

                        <button
                            class="view-btn"
                            onclick="openWithdrawalReview('${withdrawal.id}')">

                            View

                        </button>

                    </td>

                </tr>

            `;

        }



        // =================================
        // REJECTED
        // =================================

        else if(
            withdrawal.status === "Rejected"
        ){

            rejectedList.innerHTML += `

                <tr>

                    <td>
                        ${withdrawal.user}
                    </td>

                    <td>
                        ${withdrawal.date}
                    </td>

                    <td>

                        <span class="rejected">
                            Rejected
                        </span>

                    </td>

                    <td>

                        <button
                            class="view-btn"
                            onclick="openWithdrawalReview('${withdrawal.id}')">

                            View

                        </button>

                    </td>

                </tr>

            `;

        }

    });



    // =====================================
    // SHOW EMPTY MESSAGES
    // =====================================


    // Pending

    if(pendingList.children.length === 0){

        showEmptyWithdrawalMessage(
            pendingList,
            "No pending withdrawal requests",
            3
        );

    }



    // Approved

    if(approvedList.children.length === 0){

        showEmptyWithdrawalMessage(
            approvedList,
            "No approved withdrawals",
            4
        );

    }



    // Rejected

    if(rejectedList.children.length === 0){

        showEmptyWithdrawalMessage(
            rejectedList,
            "No rejected withdrawals",
            4
        );

    }

}



// =====================================
// WITHDRAWAL TABS
// =====================================

function showWithdrawalTab(
    tab,
    clickedButton = null
){

    // =================================
    // SECTION IDS
    // =================================

    const sectionIds = {

        pending: "wpending",

        approved: "wapproved",

        rejected: "wrejected"

    };



    // =================================
    // HIDE ALL SECTIONS
    // =================================

    document
        .querySelectorAll(
            ".withdrawal-section"
        )
        .forEach(section => {

            section.classList.remove(
                "active-section"
            );

        });



    // =================================
    // REMOVE ACTIVE TAB
    // =================================

    document
        .querySelectorAll(
            ".wtab-btn"
        )
        .forEach(button => {

            button.classList.remove("active");

        });



    // =================================
    // GET SECTION
    // =================================

    const sectionId =
        sectionIds[tab];


    const section =
        document.getElementById(sectionId);



    // =================================
    // SHOW SECTION
    // =================================

    if(section){

        section.classList.add(
            "active-section"
        );

    }



    // =================================
    // ACTIVATE BUTTON
    // =================================

    if(clickedButton){

        clickedButton.classList.add("active");

    }

    else{

        const buttons =
            document.querySelectorAll(".wtab-btn");


        if(tab === "pending" && buttons[0]){

            buttons[0].classList.add("active");

        }

        else if(tab === "approved" && buttons[1]){

            buttons[1].classList.add("active");

        }

        else if(tab === "rejected" && buttons[2]){

            buttons[2].classList.add("active");

        }

    }

}



// =====================================
// OPEN WITHDRAWAL REVIEW MODAL
// =====================================

function openWithdrawalReview(id){

    const withdrawal =
        withdrawals[id];


    if(!withdrawal){

        console.error(
            "Withdrawal not found:",
            id
        );

        return;

    }



    // =================================
    // USER
    // =================================

    const user =
        document.getElementById(
            "review-user"
        );


    if(user){

        user.textContent =
            withdrawal.user;

    }



    // =================================
    // METHOD
    // =================================

    const method =
        document.getElementById(
            "review-method"
        );


    if(method){

        method.textContent =
            withdrawal.method;

    }



    // =================================
    // AMOUNT
    // =================================

    const amount =
        document.getElementById(
            "review-amount"
        );


    if(amount){

        amount.textContent =
            withdrawal.amount;

    }



    // =================================
    // DATE
    // =================================

    const date =
        document.getElementById(
            "review-date"
        );


    if(date){

        date.textContent =
            withdrawal.date;

    }



    // =================================
    // OPEN MODAL
    // =================================

    const modal =
        document.getElementById(
            "withdrawalModal"
        );


    if(modal){

        modal.style.display =
            "flex";

    }



    // =================================
    // APPROVE BUTTON
    // =================================

    const approveBtn =
        document.querySelector(
            "#withdrawalModal .approve-btn"
        );



    // =================================
    // REJECT BUTTON
    // =================================

    const rejectBtn =
        document.querySelector(
            "#withdrawalModal .reject-btn"
        );



    // =================================
    // PENDING WITHDRAWAL
    // =================================

    if(
        withdrawal.status === "Pending"
    ){


        // =================================
        // APPROVE
        // =================================

        if(approveBtn){

            approveBtn.style.display =
                "inline-block";


            // Remove old handler

            approveBtn.onclick = null;


            // Add new handler

            approveBtn.onclick =
                function(){

                    approveWithdrawal(
                        withdrawal.id
                    );

                };

        }



        // =================================
        // REJECT
        // =================================

        if(rejectBtn){

            rejectBtn.style.display =
                "inline-block";


            // Remove old handler

            rejectBtn.onclick = null;


            // Add new handler

            rejectBtn.onclick =
                function(){

                    rejectWithdrawal(
                        withdrawal.id
                    );

                };

        }

    }



    // =================================
    // APPROVED / REJECTED
    // =================================

    else{


        if(approveBtn){

            approveBtn.style.display =
                "none";

            approveBtn.onclick = null;

        }


        if(rejectBtn){

            rejectBtn.style.display =
                "none";

            rejectBtn.onclick = null;

        }

    }

}



// =====================================
// APPROVE WITHDRAWAL (calls the real RPC)
// =====================================

function approveWithdrawal(id){

    sb.rpc("approve_withdrawal", { p_withdrawal_id: id })

        .then(({ error }) => {

            if(error){

                alert("Failed to approve withdrawal: " + error.message);

                return;

            }

            closeWithdrawalReview();

            showWithdrawalTab("pending");

            loadWithdrawals();

            console.log("Withdrawal approved:", id);

        });

}



// =====================================
// REJECT WITHDRAWAL (calls the real RPC)
// =====================================

function rejectWithdrawal(id){

    sb.rpc("reject_withdrawal", { p_withdrawal_id: id })

        .then(({ error }) => {

            if(error){

                alert("Failed to reject withdrawal: " + error.message);

                return;

            }

            closeWithdrawalReview();

            showWithdrawalTab("pending");

            loadWithdrawals();

            console.log("Withdrawal rejected:", id);

        });

}



// =====================================
// CLOSE WITHDRAWAL REVIEW MODAL
// =====================================

function closeWithdrawalReview(){

    const modal =
        document.getElementById(
            "withdrawalModal"
        );


    if(modal){

        modal.style.display =
            "none";

    }

}



// =====================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// =====================================

window.addEventListener(
    "click",
    function(e){

        const modal =
            document.getElementById(
                "withdrawalModal"
            );


        if(
            modal &&
            e.target === modal
        ){

            closeWithdrawalReview();

        }

    }
);


/* ===== js/deposits.js ===== */
// =====================================
// DEPOSIT MANAGEMENT
// =====================================


// =====================================
// LIVE DATA (populated from Supabase)
// =====================================

let deposits = {};


// =====================================
// METHOD LABEL HELPER
// =====================================

function formatDepositMethodLabel(method){

    const labels = {
        usdt_trc20: "USDT (TRC20)",
        mpesa: "M-Pesa",
        ecocash: "EcoCash"
    };

    return labels[method] || method;

}


// =====================================
// LOAD DEPOSITS FROM SUPABASE
// =====================================

function loadDeposits(){

    sb.from("deposits")
        .select("id, amount_zar, method, transaction_ref, proof_url, status, created_at, profiles(username)")
        .order("created_at", { ascending: false })

        .then(({ data, error }) => {

            if(error){

                console.error("Failed to load deposits:", error);

                return;

            }

            deposits = {};

            data.forEach(row => {

                deposits[row.id] = {

                    id: row.id,

                    user: row.profiles ? row.profiles.username : "Unknown",

                    method: formatDepositMethodLabel(row.method),

                    transaction: row.transaction_ref || "—",

                    amount: "M " + Number(row.amount_zar).toLocaleString("en-US"),

                    date: new Date(row.created_at).toLocaleDateString("en-US", {
                        day: "2-digit", month: "short", year: "numeric"
                    }),

                    status: row.status.charAt(0).toUpperCase() + row.status.slice(1),

                    proof: row.proof_url || ""

                };

            });

            renderDepositTables();

            updateDepositStats();

        });

}



// =====================================
// INIT DEPOSITS
// =====================================

function initDeposits(){

    console.log("Deposits initialized");


    // Load real data (renders + updates stats when it arrives)

    loadDeposits();


    // Show Pending by default

    showDepositTab("pending");

}



// =====================================
// UPDATE DEPOSIT STATISTICS
// =====================================

function updateDepositStats(){

    let pending = 0;

    let approved = 0;

    let rejected = 0;


    Object.values(deposits).forEach(deposit => {

        if(deposit.status === "Pending"){

            pending++;

        }

        else if(deposit.status === "Approved"){

            approved++;

        }

        else if(deposit.status === "Rejected"){

            rejected++;

        }

    });



    // =================================
    // UPDATE COUNTERS
    // =================================

    const pendingCount =
        document.getElementById("dpendingCount");

    const approvedCount =
        document.getElementById("dapprovedCount");

    const rejectedCount =
        document.getElementById("drejectedCount");


    if(pendingCount){

        pendingCount.textContent = pending;

    }


    if(approvedCount){

        approvedCount.textContent = approved;

    }


    if(rejectedCount){

        rejectedCount.textContent = rejected;

    }

}

// =====================================
// SHOW EMPTY DEPOSIT MESSAGE
// =====================================

function showEmptyDepositMessage(
    list,
    message,
    columnCount
){

    if(!list) return;


    list.innerHTML = `

        <tr class="empty-deposit-row">

            <td colspan="${columnCount}">

                <div class="empty-deposit-message">

                    <i class="fa-solid fa-inbox"></i>

                    <span>
                        ${message}
                    </span>

                </div>

            </td>

        </tr>

    `;

}


// =====================================
// RENDER ALL DEPOSIT TABLES
// =====================================

function renderDepositTables(){

    const pendingList =
        document.getElementById("pendingDepositsList");

    const approvedList =
        document.getElementById("approvedDepositsList");

    const rejectedList =
        document.getElementById("rejectedDepositsList");


    // =================================
    // CHECK TABLES
    // =================================

    if(!pendingList ||
       !approvedList ||
       !rejectedList){

        console.warn(
            "Deposit table elements not found"
        );

        return;

    }



    // =================================
    // CLEAR TABLES
    // =================================

    pendingList.innerHTML = "";

    approvedList.innerHTML = "";

    rejectedList.innerHTML = "";



    // =================================
    // GENERATE ROWS
    // =================================
    // NOTE: deposit.id is now a UUID (e.g. "3fa85f64-5717-...").
    // It must be wrapped in quotes inside onclick="..." — an
    // unquoted UUID is invalid JavaScript (the hyphens get read
    // as subtraction), which would silently break every button.

    Object.values(deposits).forEach(deposit => {


        // =================================
        // PENDING
        // =================================

        if(deposit.status === "Pending"){

            pendingList.innerHTML += `

                <tr>

                    <td>
                        ${deposit.user}
                    </td>

                    <td>
                        ${deposit.date}
                    </td>

                    <td>

                        <button
                            class="review-btn"
                            onclick="openDepositReview('${deposit.id}')">

                            Review

                        </button>

                    </td>

                </tr>

            `;

        }



        // =================================
        // APPROVED
        // =================================

        else if(deposit.status === "Approved"){

            approvedList.innerHTML += `

                <tr>

                    <td>
                        ${deposit.user}
                    </td>

                    <td>
                        ${deposit.date}
                    </td>

                    <td>

                        <span class="approved">
                            Approved
                        </span>

                    </td>

                    <td>

                        <button
                            class="view-btn"
                            onclick="openDepositReview('${deposit.id}')">

                            View

                        </button>

                    </td>

                </tr>

            `;

        }



        // =================================
        // REJECTED
        // =================================

        else if(deposit.status === "Rejected"){

            rejectedList.innerHTML += `

                <tr>

                    <td>
                        ${deposit.user}
                    </td>

                    <td>
                        ${deposit.date}
                    </td>

                    <td>

                        <span class="rejected">
                            Rejected
                        </span>

                    </td>

                    <td>

                        <button
                            class="view-btn"
                            onclick="openDepositReview('${deposit.id}')">

                            View

                        </button>

                    </td>

                </tr>

            `;

        }

    });

    // =====================================
    // SHOW EMPTY MESSAGES
    // =====================================

    // Pending
    if(pendingList.children.length === 0){

        showEmptyDepositMessage(
            pendingList,
            "No pending deposit requests",
            3
        );

    }


    // Approved
    if(approvedList.children.length === 0){

        showEmptyDepositMessage(
            approvedList,
            "No approved deposits",
            4
        );

    }


    // Rejected
    if(rejectedList.children.length === 0){

        showEmptyDepositMessage(
            rejectedList,
            "No rejected deposits",
            4
        );

    }

}



// =====================================
// DEPOSIT TABS
// =====================================

function showDepositTab(tab, clickedButton = null){

    // =================================
    // SECTION IDS
    // =================================

    const sectionIds = {

        pending: "dpending",

        approved: "dapproved",

        rejected: "drejected"

    };


    // =================================
    // HIDE ALL SECTIONS
    // =================================

    document
        .querySelectorAll(".deposit-section")
        .forEach(section => {

            section.classList.remove(
                "active-section"
            );

        });



    // =================================
    // REMOVE ACTIVE TAB
    // =================================

    document
        .querySelectorAll(".dtab-btn")
        .forEach(button => {

            button.classList.remove("active");

        });



    // =================================
    // GET SECTION
    // =================================

    const sectionId =
        sectionIds[tab];


    const section =
        document.getElementById(sectionId);


    // =================================
    // SHOW SECTION
    // =================================

    if(section){

        section.classList.add(
            "active-section"
        );

    }



    // =================================
    // ACTIVATE BUTTON
    // =================================

    if(clickedButton){

        clickedButton.classList.add("active");

    }

    else{

        const buttons =
            document.querySelectorAll(".dtab-btn");


        if(tab === "pending" && buttons[0]){

            buttons[0].classList.add("active");

        }

        else if(tab === "approved" && buttons[1]){

            buttons[1].classList.add("active");

        }

        else if(tab === "rejected" && buttons[2]){

            buttons[2].classList.add("active");

        }

    }

}



// =====================================
// OPEN DEPOSIT REVIEW MODAL
// =====================================

function openDepositReview(id){

    const deposit =
        deposits[id];


    // =================================
    // CHECK DEPOSIT
    // =================================

    if(!deposit){

        console.error(
            "Deposit not found:",
            id
        );

        return;

    }



    // =================================
    // USER
    // =================================

    const user =
        document.getElementById(
            "review-user"
        );

    if(user){

        user.textContent =
            deposit.user;

    }



    // =================================
    // METHOD
    // =================================

    const method =
        document.getElementById(
            "review-method"
        );

    if(method){

        method.textContent =
            deposit.method;

    }



    // =================================
    // TRANSACTION ID
    // =================================

    const transaction =
        document.getElementById(
            "review-transaction"
        );

    if(transaction){

        transaction.textContent =
            deposit.transaction;

    }



    // =================================
    // AMOUNT
    // =================================

    const amount =
        document.getElementById(
            "review-amount"
        );

    if(amount){

        amount.textContent =
            deposit.amount;

    }



    // =================================
    // DATE
    // =================================

    const date =
        document.getElementById(
            "review-date"
        );

    if(date){

        date.textContent =
            deposit.date;

    }



    // =================================
    // PAYMENT PROOF
    // =================================

    const image =
        document.getElementById(
            "review-image"
        );

    if(image){

        image.src =
            deposit.proof || "";

    }



    // =================================
    // OPEN MODAL
    // =================================

    const modal =
        document.getElementById(
            "depositModal"
        );


    if(modal){

        modal.style.display =
            "flex";

    }



    // =================================
    // APPROVE BUTTON
    // =================================

    const approveBtn =
        document.querySelector(
            ".approve-btn"
        );



    // =================================
    // REJECT BUTTON
    // =================================

    const rejectBtn =
        document.querySelector(
            ".reject-btn"
        );



    // =================================
    // PENDING DEPOSIT
    // =================================

    if(deposit.status === "Pending"){


        if(approveBtn){

            approveBtn.style.display =
                "inline-block";


            // Remove old handler

            approveBtn.onclick = null;


            // Add new handler

            approveBtn.onclick =
                function(){

                    approveDeposit(
                        deposit.id
                    );

                };

        }



        if(rejectBtn){

            rejectBtn.style.display =
                "inline-block";


            // Remove old handler

            rejectBtn.onclick = null;


            // Add new handler

            rejectBtn.onclick =
                function(){

                    rejectDeposit(
                        deposit.id
                    );

                };

        }

    }



    // =================================
    // APPROVED / REJECTED
    // =================================

    else{


        if(approveBtn){

            approveBtn.style.display =
                "none";

            approveBtn.onclick = null;

        }


        if(rejectBtn){

            rejectBtn.style.display =
                "none";

            rejectBtn.onclick = null;

        }

    }

}



// =====================================
// APPROVE DEPOSIT (calls the real RPC)
// =====================================

function approveDeposit(id){

    sb.rpc("approve_deposit", { p_deposit_id: id })

        .then(({ error }) => {

            if(error){

                alert("Failed to approve deposit: " + error.message);

                return;

            }

            closeDepositReview();

            showDepositTab("pending");

            loadDeposits();

            console.log("Deposit approved:", id);

        });

}



// =====================================
// REJECT DEPOSIT (calls the real RPC)
// =====================================

function rejectDeposit(id){

    sb.rpc("reject_deposit", { p_deposit_id: id })

        .then(({ error }) => {

            if(error){

                alert("Failed to reject deposit: " + error.message);

                return;

            }

            closeDepositReview();

            showDepositTab("pending");

            loadDeposits();

            console.log("Deposit rejected:", id);

        });

}



// =====================================
// CLOSE DEPOSIT REVIEW MODAL
// =====================================

function closeDepositReview(){

    const modal =
        document.getElementById(
            "depositModal"
        );


    if(modal){

        modal.style.display =
            "none";

    }

}



// =====================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// =====================================

window.addEventListener(
    "click",
    function(e){

        const modal =
            document.getElementById(
                "depositModal"
            );


        if(
            modal &&
            e.target === modal
        ){

            closeDepositReview();

        }

    }
);


/* ===== js/transactions.js ===== */
// =====================================
// TRANSACTIONS MANAGEMENT
// =====================================


// =====================================
// LIVE DATA (populated from Supabase)
// =====================================

let transactions = {};

const TRANSACTION_TYPE_LABELS = {
    deposit: "Deposit",
    withdrawal: "Withdrawal",
    mining_payout: "Mining",
    plan_purchase: "Plan Purchase",
    plan_refund: "Plan Refund",
    plan_upgrade: "Plan Upgrade",
    admin_credit: "Credit",
    admin_debit: "Debit"
};

function formatTransactionType(type){
    return TRANSACTION_TYPE_LABELS[type] ||
        type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}


// =====================================
// LOAD TRANSACTIONS FROM SUPABASE
// =====================================

function loadTransactions(){

    sb.from("transactions")
        .select("id, user_id, type, amount_zar, description, created_at, profiles(username)")
        .order("created_at", { ascending: false })
        .limit(200)

        .then(({ data, error }) => {

            if(error){
                console.error("Failed to load transactions:", error);
                return;
            }

            transactions = {};

            data.forEach(row => {

                transactions[row.id] = {

                    id: row.id,

                    user: row.profiles ? row.profiles.username : "Unknown",

                    userId: "USR-" + row.user_id.slice(0, 8).toUpperCase(),

                    type: formatTransactionType(row.type),

                    typeKey: row.type,

                    amount: "M " + Math.abs(Number(row.amount_zar)).toLocaleString("en-US", {
                        minimumFractionDigits: 2, maximumFractionDigits: 2
                    }),

                    date: new Date(row.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric"
                    }),

                    // Every row in this table represents money that has
                    // already moved (the ledger is only ever written once
                    // an action succeeds) — there's no separate pending/
                    // rejected state at this level. If a withdrawal is
                    // later rejected, a second reversal row appears here
                    // rather than this row changing status.
                    status: "Completed",

                    description: row.description || ""

                };

            });

            renderTransactions();

        });

}


// =====================================
// INITIALIZE TRANSACTIONS
// =====================================

function initTransactions(){

    const filter =
        document.getElementById("transactionFilter");

    const search =
        document.getElementById("transactionSearch");

    const list =
        document.getElementById("transactionList");


    if(!filter || !search || !list){

        return;

    }


    // Load real data (renders once it arrives)

    loadTransactions();


    // Filter
    filter.addEventListener(
        "change",
        filterTransactions
    );


    // Search
    search.addEventListener(
        "keyup",
        filterTransactions
    );

    // =====================================
    // TRANSACTION MODAL
    // =====================================

    const transactionModal =
        document.getElementById("transactionModal");

    const closeTransactionModal =
        document.getElementById("closeTransactionModal");

    const closeTransactionModalBtn =
        document.getElementById("closeTransactionModalBtn");


    if(closeTransactionModal){

        closeTransactionModal.onclick =
        function(){

            transactionModal.style.display = "none";

        };

    }


    if(closeTransactionModalBtn){

        closeTransactionModalBtn.onclick =
        function(){

            transactionModal.style.display = "none";

        };

    }


    if(transactionModal){

        transactionModal.onclick =
        function(event){

            if(event.target === transactionModal){

                transactionModal.style.display = "none";

            }

        };

    }

}



// =====================================
// RENDER TRANSACTIONS
// =====================================

function renderTransactions(){

    const list =
        document.getElementById("transactionList");


    if(!list){

        return;

    }


    list.innerHTML = "";


    Object.values(transactions)
    .forEach(transaction => {


        const row =
            document.createElement("tr");


        row.setAttribute("data-id", transaction.id);


        // =================================
        // USER
        // =================================

        const userCell =
            document.createElement("td");

        userCell.textContent = transaction.user;


        // =================================
        // TYPE
        // =================================

        const typeCell =
            document.createElement("td");

        const typeBadge =
            document.createElement("span");


        typeBadge.className =
            "transaction-type transaction-type-" +
            transaction.typeKey;


        typeBadge.textContent = transaction.type;


        typeCell.appendChild(typeBadge);



        // =================================
        // DATE
        // =================================

        const dateCell =
            document.createElement("td");

        dateCell.textContent = transaction.date;



        // =================================
        // ACTION
        // =================================

        const actionCell =
            document.createElement("td");


        const viewButton =
            document.createElement("button");


        viewButton.className = "transaction-view-btn";

        viewButton.textContent = "View";

        viewButton.setAttribute("data-id", transaction.id);


        viewButton.onclick = function(){

            viewTransaction(transaction.id);

        };


        actionCell.appendChild(viewButton);



        // =================================
        // ADD CELLS TO ROW
        // =================================

        row.appendChild(userCell);
        row.appendChild(typeCell);
        row.appendChild(dateCell);
        row.appendChild(actionCell);

        list.appendChild(row);

    });


    // Apply current filters

    filterTransactions();

}



// =====================================
// FILTER + SEARCH TRANSACTIONS
// =====================================

function filterTransactions(){

    const filter =
        document.getElementById("transactionFilter");

    const search =
        document.getElementById("transactionSearch");

    const list =
        document.getElementById("transactionList");


    if(!filter || !search || !list){

        return;

    }


    const filterValue =
        filter.value.toLowerCase();


    const searchValue =
        search.value.toLowerCase().trim();



    const rows =
        list.querySelectorAll("tr");



    rows.forEach(row => {


        const transactionId =
            row.getAttribute("data-id")
            .toLowerCase();


        const user =
            row.cells[0].textContent.toLowerCase();


        const type =
            row.cells[1].textContent.trim().toLowerCase();


        const date =
            row.cells[2].textContent.toLowerCase();



        const matchesType =
            filterValue === "all" ||
            type === filterValue;



        const matchesSearch =
            user.includes(searchValue) ||
            transactionId.includes(searchValue) ||
            date.includes(searchValue);



        if(matchesType && matchesSearch){

            row.style.display = "";

        }
        else{

            row.style.display = "none";

        }

    });

}



// =====================================
// VIEW TRANSACTION
// =====================================

function viewTransaction(transactionId){

    const transaction =
        transactions[transactionId];


    if(!transaction){

        return;

    }


    // ================================
    // FILL MODAL FROM REAL DATA
    // ================================

    document.getElementById("modalTransactionId").textContent =
        "#" + transaction.id.slice(0, 8).toUpperCase();


    document.getElementById("modalTransactionIdFull").textContent =
        transaction.id;


    document.getElementById("modalTransactionUser").textContent =
        transaction.user;


    document.getElementById("modalTransactionUserId").textContent =
        transaction.userId;


    document.getElementById("modalTransactionType").textContent =
        transaction.type;


    document.getElementById("modalTransactionAmount").textContent =
        transaction.amount;


    document.getElementById("modalTransactionDate").textContent =
        transaction.date;


    document.getElementById("modalTransactionDescription").textContent =
        transaction.description;



    // ================================
    // STATUS
    // ================================

    const status =
        document.getElementById("modalTransactionStatus");


    status.textContent = transaction.status;


    status.className =
        "transaction-status transaction-status-" +
        transaction.status.toLowerCase();



    // ================================
    // SHOW MODAL
    // ================================

    document.getElementById("transactionModal").style.display = "flex";

}


/* ===== js/plans.js ===== */
// ======================================================
// PLANS PAGE
// ======================================================

let plansData = [];

// ======================================================
// LOAD PLANS FROM SUPABASE
// ======================================================

function loadPlans(){

    sb.from("plans")
        .select("*")
        .order("sort_order")

        .then(({ data, error }) => {

            if(error){
                console.error("Failed to load plans:", error);
                return;
            }

            plansData = data;

            renderPlans();

        });

}

// ======================================================
// RENDER PLAN TABLE
// ======================================================
function renderPlans(){

    const table = document.getElementById("planList");

    if(!table) return;

    table.innerHTML = "";

    plansData.forEach(function(plan){

        const row = document.createElement("tr");

        row.dataset.planid = plan.id;

        const statusClass = plan.is_active ? "active" : "disabled";

        row.innerHTML = `
            <td>
                ${plan.name}
            </td>

            <td>
                <span class="plan-status plan-status-${statusClass}">
                    ${plan.is_active ? "Active" : "Disabled"}
                </span>
            </td>

            <td>
                <button
                    class="plan-view-btn"
                    data-plan="${plan.name}">
                    View
                </button>
            </td>
        `;

        table.appendChild(row);

    });

}


// ======================================================
// PLAN INITIALIZATION
// ======================================================

function initPlans(){

    loadPlans();

    const modal = document.getElementById("planModal");

    const addButton = document.querySelector(".plan-add-btn");

    const closeButtons = document.querySelectorAll(
        ".plan-close-btn, .plan-close-top"
    );

    const saveButton = document.querySelector(".plan-save-btn");

    const toggleButton = document.querySelector(".plan-toggle-btn");

    const deleteButton = document.querySelector(".plan-delete-btn");

    const deleteConfirmModal = document.getElementById("planDeleteConfirmModal");

    const deleteCancelButton = document.querySelector(".plan-delete-cancel-btn");

    const deleteConfirmButton = document.querySelector(".plan-delete-confirm-btn");

    let currentRow = null;
    let currentPlan = null;

    if(!modal) return;


    // ADD NEW PLAN

    addButton.onclick = function(){

        currentRow = null;
        currentPlan = null;

        document.getElementById("planName").value = "";
        document.getElementById("planPrice").value = "";
        document.getElementById("planDuration").value = "";
        document.getElementById("planDailyReturn").value = "";
        document.getElementById("planTotalReturn").value = "";
        document.getElementById("planHashPower").value = "";
        document.getElementById("planStatus").value = "active";

          
        document.getElementById("planSubscriberCount").style.display = "none";

        

        document.querySelector(".plan-modal-header h3").innerText = "Add Mining Plan";

        saveButton.innerText = "Create Plan";

        toggleButton.innerText = "Deactivate";

        modal.style.display = "flex";

    };


    // VIEW EXISTING PLAN

        // VIEW EXISTING PLAN — delegated to the table itself so it keeps
    // working after renderPlans() rebuilds the rows (add/edit/delete/reload).

    const planTable = document.getElementById("planList");

    planTable.addEventListener("click", function(e){

        const button = e.target.closest(".plan-view-btn");

        if(!button) return;

        currentRow = button.closest("tr");

        currentPlan = plansData.find(p => p.id === currentRow.dataset.planid);

        if(!currentPlan) return;

        document.getElementById("planName").value = currentPlan.name;
        document.getElementById("planPrice").value = currentPlan.price_zar;
        document.getElementById("planDuration").value = currentPlan.duration_days;
        document.getElementById("planDailyReturn").value = currentPlan.daily_payout_zar;
        document.getElementById("planTotalReturn").value =
            (currentPlan.daily_payout_zar * currentPlan.duration_days).toFixed(2);
        document.getElementById("planHashPower").value = currentPlan.hash_power || "";
        document.getElementById("planStatus").value = currentPlan.is_active ? "active" : "disabled";

        

        const subscriberCountEl = document.getElementById("planSubscriberCount");
        subscriberCountEl.style.display = "block";
        subscriberCountEl.innerText = "Loading subscriber count…";

        sb.from("mining_subscriptions")
            .select("id", { count: "exact", head: true })
            .eq("plan_id", currentPlan.id)
            .eq("status", "active")
            .then(({ count, error }) => {
                if (error) {
                    subscriberCountEl.innerText = "Couldn't load subscriber count.";
                    return;
                }
                subscriberCountEl.innerText =
                    count === 0
                        ? "No active users"
                        : `Currently active users:  ${count}`;
            });

        
      

        toggleButton.innerText = currentPlan.is_active ? "Deactivate" : "Activate";

        document.querySelector(".plan-modal-header h3").innerText = "Edit Mining Plan";

        saveButton.innerText = "Save Changes";

        modal.style.display = "flex";

    });


    // SAVE / CREATE PLAN

    saveButton.onclick = function(){

        const name = document.getElementById("planName").value.trim();
        const price = Number(document.getElementById("planPrice").value);
        const duration = Number(document.getElementById("planDuration").value);
        const dailyReturn = Number(document.getElementById("planDailyReturn").value);
        const hashPower = document.getElementById("planHashPower").value.trim();
        const status = document.getElementById("planStatus").value;

        if(name === ""){
            alert("Enter plan name");
            return;
        }

        const payload = {
            name: name,
            price_zar: price,
            duration_days: duration,
            daily_payout_zar: dailyReturn,
            hash_power: hashPower,
            is_active: status === "active"
        };

        // CREATE NEW PLAN

        if(currentRow === null){

            payload.sort_order = plansData.length + 1;

            sb.from("plans").insert(payload)

                .then(({ error }) => {

                    if(error){
                        alert("Failed to create plan: " + error.message);
                        return;
                    }

                    modal.style.display = "none";

                    loadPlans();

                });

        }

        // UPDATE EXISTING PLAN

        else{

            sb.from("plans").update(payload).eq("id", currentPlan.id)

                .then(({ error }) => {

                    if(error){
                        alert("Failed to update plan: " + error.message);
                        return;
                    }

                    modal.style.display = "none";

                    loadPlans();

                });

        }

    };


    // CLOSE

    closeButtons.forEach(button=>{

        button.onclick = function(){
            modal.style.display = "none";
        };

    });


    // DELETE

    deleteButton.onclick = function(){

        if(!currentRow || !currentPlan) return;

        document.getElementById("deletePlanMessage").innerHTML =
            'Are you sure you want to delete this plan?<br></br> <strong>' +
            currentPlan.name +
            '</strong>';

        deleteConfirmModal.style.display = "flex";

        document.body.style.overflow = "hidden";

    };


    // ACTIVATE / DEACTIVATE (persists immediately)

    toggleButton.onclick = function(){

        if(!currentRow || !currentPlan) return;

        const newActive = !currentPlan.is_active;

        sb.from("plans").update({ is_active: newActive }).eq("id", currentPlan.id)

            .then(({ error }) => {

                if(error){
                    alert("Failed to update status: " + error.message);
                    return;
                }

                currentPlan.is_active = newActive;

        

                toggleButton.innerText = newActive ? "Deactivate" : "Activate";

                document.getElementById("planStatus").value = newActive ? "active" : "disabled";

                loadPlans();

            });

    };


    deleteCancelButton.onclick = function(){
        deleteConfirmModal.style.display = "none";
    };


    deleteConfirmButton.onclick = function(){

        if(!currentRow || !currentPlan) return;

        sb.from("plans").delete().eq("id", currentPlan.id)

            .then(({ error }) => {

                deleteConfirmModal.style.display = "none";

                if(error){

                    // Postgres error 23503 = foreign key violation —
                    // this plan still has subscribers referencing it
                    if(error.code === "23503"){
                        alert("Can't delete this plan — it still has users subscribed to it. Deactivate it instead.");
                    } else {
                        alert("Failed to delete plan: " + error.message);
                    }

                    return;
                }

                currentRow = null;
                currentPlan = null;

                modal.style.display = "none";

                loadPlans();

            });

    };

}


/* ===== js/users.js ===== */
// ===================================
// USERS PAGE
// ===================================

function initUsers(){

    console.log("Users initialized");

    // ===============================
    // ELEMENTS
    // ===============================

    const usersList = document.getElementById("usersList");

    const searchInput = document.getElementById("userSearch");

    const statusFilter = document.getElementById("statusFilter");

    const refreshBtn = document.querySelector(".refresh-btn");

    const addUserBtn = document.querySelector(".add-user-btn");

    // Statistics

    const totalUsersEl = document.getElementById("totalUsers");

    const activeUsersEl = document.getElementById("activeUsers");

    const blockedUsersEl = document.getElementById("blockedUsers");

    const vipUsersEl = document.getElementById("vipUsers");

    // ===============================
    // CURRENT USER
    // ===============================

    let currentRow = null;

    let plansCache = [];

    // ===============================
    // DERIVE DISPLAY STATUS
    // ===============================

    function deriveStatus(user){

        if(user.is_blocked) return "Blocked";
        if(user.is_vip) return "VIP";
        return "Active";

    }

    // ===============================
    // BUILD A ROW FROM A USER OBJECT
    // ===============================

    function createUserRow(user){

        const row = document.createElement("tr");

        row.dataset.userid = user.id;

        const status = deriveStatus(user);

        const statusClass = status.toLowerCase();

        const fullName = [user.username, user.surname].filter(Boolean).join(" ") || "Unnamed";

        row.innerHTML = `
            <td>
                <h4>${fullName}</h4>
            </td>

            <td>
                <span class="status ${statusClass}">${status}</span>
            </td>

            <td>
                <button class="manage-btn">Manage</button>
            </td>

            <td class="user-hidden-data" style="display:none;">
                <span class="email">${user.email || ""}</span>
                <span class="balance">M${Number(user.balance_zar).toFixed(2)}</span>
                <span class="plan">${user.plan_name}</span>
                <span class="phone">${user.phone || ""}</span>
                <span class="country"></span>
            </td>
        `;

        return row;
    }

    // ===============================
    // LOAD USERS FROM SUPABASE
    // ===============================

    function loadUsers(){

        sb.rpc("admin_list_users")

            .then(({ data, error }) => {

                if(error){
                    console.error("Failed to load users:", error);
                    return;
                }

                usersList.innerHTML = "";

                data.forEach(user => {

                    usersList.appendChild(createUserRow(user));

                });

                updateStatistics();

            });

    }

    // ===============================
    // UPDATE STATISTICS
    // ===============================

    function updateStatistics(){

        const rows = document.querySelectorAll("#usersList tr");

        let total = rows.length;

        let active = 0;

        let blocked = 0;

        let vip = 0;

        rows.forEach(row=>{

            let status = row.querySelector(".status");

            if(!status) return;

            let text = status.textContent.trim().toLowerCase();

            if(text==="active"){

                active++;

            }

            else if(text==="blocked"){

                blocked++;

            }

            else if(text==="vip"){

                vip++;

            }

        });

        totalUsersEl.textContent = total;

        activeUsersEl.textContent = active;

        blockedUsersEl.textContent = blocked;

        vipUsersEl.textContent = vip;

    }

    loadUsers();

    // ===============================
    // SEARCH USERS
    // ===============================

    if(searchInput){

        searchInput.addEventListener("keyup",function(){

            let value = this.value.toLowerCase();

            document.querySelectorAll("#usersList tr")
            .forEach(row=>{

                let h4 = row.querySelector("h4");
                if(!h4) return;

                let text = h4.textContent.toLowerCase();

                row.style.display =
                text.includes(value)
                ? "table-row"
                : "none";

            });

        });

    }

    // ===============================
    // FILTER USERS
    // ===============================

    if(statusFilter){

        statusFilter.addEventListener("change",function(){

            let value = this.value.toLowerCase();

            document.querySelectorAll("#usersList tr")
           .forEach(row=>{

                let statusEl = row.querySelector(".status");
                if(!statusEl) return;

                let status = statusEl.textContent.trim().toLowerCase();

                if(value==="all"){

                    row.style.display="table-row";

                }

                else{

                    row.style.display =
                    status===value
                    ? "table-row"
                    : "none";

                }

            });

        });

    }

    // ===============================
    // REFRESH
    // ===============================

    if(refreshBtn){

        refreshBtn.onclick=function(){

            loadAdminPage("users");

        };

    }

    // ===============================
    // ADD USER — real signup only
    // ===============================
    // Creating a fully working login account requires Supabase's
    // service-role key, which Lovable Cloud doesn't expose to the
    // client. Real accounts have to come from the sign-up flow in
    // the user app itself — this button just explains that instead
    // of faking a row that isn't a real account.

    if(addUserBtn){

        addUserBtn.onclick=function(){

            alert("New accounts can't be created from the admin panel — ask the person to sign up in the KT Cloud Mining app, then manage their account here afterward.");

        };

    }

    // ===============================
    // USER MANAGEMENT MODAL
    // ===============================

    const userModal = document.getElementById("userModal");

    const modalUserName = document.getElementById("modalUserName");

    const modalUserID = document.getElementById("modalUserID");

    const modalEmail = document.getElementById("modalEmail");

    const modalBalance = document.getElementById("modalBalance");

    const modalPlan = document.getElementById("modalPlan");

    const modalStatus = document.getElementById("modalStatus");

    // ===============================
    // OPEN USER MODAL
    // ===============================

    function openUserModal(row){

        currentRow = row;

        let hiddenData = row.querySelector(".user-hidden-data");

        modalUserName.textContent = row.querySelector("h4").textContent;

        modalUserID.textContent = "User ID : " + row.dataset.userid;

        modalEmail.textContent = hiddenData.querySelector(".email").textContent;

        modalBalance.textContent = hiddenData.querySelector(".balance").textContent;

        modalPlan.textContent = hiddenData.querySelector(".plan").textContent;

        modalStatus.textContent = row.querySelector(".status").textContent.trim();

        updateStatusButton();

        userModal.style.display="flex";

    }

    // ===============================
    // TOGGLE BUTTON TEXT
    // ===============================

    const toggleUserStatus = document.getElementById("toggleUserStatus");

    function updateStatusButton(){

        if(!currentRow) return;

        const status = currentRow.querySelector(".status").textContent.trim();

        toggleUserStatus.textContent =
        status === "Active" ? "Block User" : "Activate User";

    }

    // ===============================
    // BLOCK / ACTIVATE USER (real — writes profiles.is_blocked)
    // ===============================

    const blockModal = document.getElementById("blockModal");

    const confirmBlockBtn = document.querySelector(".block-content .block-btn");

    toggleUserStatus.addEventListener("click",function(){

        if(!currentRow) return;

        const status = currentRow.querySelector(".status");

        if(status.classList.contains("active")){

            userModal.style.display="none";
            blockModal.style.display="flex";

        }

        else{

            sb.from("profiles")
                .update({ is_blocked: false })
                .eq("id", currentRow.dataset.userid)

                .then(({ error }) => {

                    if(error){
                        alert("Failed to activate user: " + error.message);
                        return;
                    }

                    status.classList.remove("blocked");
                    status.classList.add("active");
                    status.textContent = "Active";
                    modalStatus.textContent = "Active";

                    updateStatusButton();
                    updateStatistics();

                });

        }

    });

    if(confirmBlockBtn){

        confirmBlockBtn.onclick=function(){

            if(!currentRow) return;

            sb.from("profiles")
                .update({ is_blocked: true })
                .eq("id", currentRow.dataset.userid)

                .then(({ error }) => {

                    if(error){
                        alert("Failed to block user: " + error.message);
                        return;
                    }

                    const status = currentRow.querySelector(".status");

                    status.classList.remove("active");
                    status.classList.add("blocked");
                    status.textContent = "Blocked";
                    modalStatus.textContent = "Blocked";

                    updateStatusButton();
                    updateStatistics();

                    blockModal.style.display="none";

                    alert("User blocked successfully");

                });

        };

    }

    // ===============================
    // MANAGE BUTTON
    // ===============================

    usersList.addEventListener("click",function(e){

        if(e.target.classList.contains("manage-btn")){

            let row = e.target.closest("tr");

            openUserModal(row);

        }

    });

    // ===============================
    // CLOSE MODALS
    // ===============================

    document.querySelectorAll(".close-modal")
    .forEach(button=>{

        button.onclick=function(){

            let modal = this.closest(
                ".user-modal, .credit-modal, .debit-modal, .plan-modal, .edit-user-modal, .delete-modal, .block-modal, .add-user-modal, .reset-password-modal"
            );

            if(modal){
                modal.style.display="none";
            }

        };

    });

    // ===============================
    // CANCEL BUTTONS
    // ===============================

    document.querySelectorAll(".cancel-btn")
    .forEach(button=>{

        button.onclick=function(){

            let modal = this.closest(
                ".delete-modal, .block-modal, .reset-password-modal"
            );

            if(modal){
                modal.style.display="none";
            }

        };

    });

    // ===============================
    // CLICK OUTSIDE TO CLOSE
    // ===============================

    window.onclick=function(e){

        if(e.target.classList.contains("user-modal") ||
           e.target.classList.contains("credit-modal") ||
           e.target.classList.contains("debit-modal") ||
           e.target.classList.contains("plan-modal") ||
           e.target.classList.contains("edit-user-modal") ||
           e.target.classList.contains("delete-modal") ||
           e.target.classList.contains("block-modal") ||
           e.target.classList.contains("add-user-modal") ||
           e.target.classList.contains("reset-password-modal")){

            e.target.style.display="none";

        }

    };

    // ===============================
    // EDIT USER — updates the real profile row
    // ===============================

    const editUserModal = document.getElementById("editUserModal");

    const editSaveBtn = document.querySelector(".edit-user-content .save-btn");

    const editBtn = document.querySelector(".edit-btn");

    if(editBtn){

        editBtn.onclick=function(){

            if(!currentRow) return;

            userModal.style.display="none";

            const fullName = currentRow.querySelector("h4").textContent;
            const hiddenData = currentRow.querySelector(".user-hidden-data");

            document.getElementById("editName").value = fullName;
            document.getElementById("editEmail").value = hiddenData.querySelector(".email").textContent;
            document.getElementById("editPhone").value = hiddenData.querySelector(".phone")
                ? hiddenData.querySelector(".phone").textContent : "";
            document.getElementById("editCountry").value = "";

            editUserModal.style.display="flex";

        };

    }

    if(editSaveBtn){

        editSaveBtn.onclick=function(){

            if(!currentRow) return;

            let newName = document.getElementById("editName").value.trim();
            let newPhone = document.getElementById("editPhone").value.trim();

            if(newName===""){
                alert("Name cannot be empty");
                return;
            }

            const parts = newName.split(" ");
            const username = parts[0];
            const surname = parts.slice(1).join(" ");

            sb.from("profiles")
                .update({ username: username, surname: surname, phone: newPhone })
                .eq("id", currentRow.dataset.userid)

                .then(({ error }) => {

                    if(error){
                        alert("Failed to update user: " + error.message);
                        return;
                    }

                    currentRow.querySelector("h4").textContent = newName;

                    const hiddenData = currentRow.querySelector(".user-hidden-data");

                    if(hiddenData.querySelector(".phone")){
                        hiddenData.querySelector(".phone").textContent = newPhone;
                    }

                    editUserModal.style.display="none";

                    alert("User updated successfully");

                });

        };

    }

    // ===============================
    // CREDIT BALANCE (real — admin_credit_wallet)
    // ===============================

    const creditBtn = document.querySelector(".credit-btn");

    const creditModal = document.getElementById("creditModal");

    const creditSave = document.querySelector(".credit-content .save-btn");

    if(creditBtn){

        creditBtn.onclick=function(){
            userModal.style.display="none";
            creditModal.style.display="flex";
        };

    }

    if(creditSave){

        creditSave.onclick=function(){

            if(!currentRow) return;

            let amount = Number(document.getElementById("creditAmount").value);

            if(amount <= 0){
                alert("Enter a valid amount");
                return;
            }

            sb.rpc("admin_credit_wallet", {
                p_user_id: currentRow.dataset.userid,
                p_amount: amount,
                p_note: "Manual admin credit"
            })

            .then(({ error }) => {

                if(error){
                    alert("Failed to credit balance: " + error.message);
                    return;
                }

                creditModal.style.display="none";
                document.getElementById("creditAmount").value="";

                loadUsers();

                alert("Balance credited successfully");

            });

        };

    }

    // ===============================
    // DEBIT BALANCE (real — admin_debit_wallet)
    // ===============================

    const debitBtn = document.querySelector(".debit-btn");

    const debitModal = document.getElementById("debitModal");

    const debitSave = document.querySelector(".debit-content .danger-btn");

    if(debitBtn){

        debitBtn.onclick=function(){
            userModal.style.display="none";
            debitModal.style.display="flex";
        };

    }

    if(debitSave){

        debitSave.onclick=function(){

            if(!currentRow) return;

            let amount = Number(document.getElementById("debitAmount").value);

            if(amount <= 0){
                alert("Enter a valid amount");
                return;
            }

            sb.rpc("admin_debit_wallet", {
                p_user_id: currentRow.dataset.userid,
                p_amount: amount,
                p_note: "Manual admin debit"
            })

            .then(({ error }) => {

                if(error){
                    alert("Failed to debit balance: " + error.message);
                    return;
                }

                debitModal.style.display="none";
                document.getElementById("debitAmount").value="";

                loadUsers();

                alert("Balance debited successfully");

            });

        };

    }

    // ===============================
    // CHANGE MINING PLAN (real — admin_set_user_plan)
    // ===============================

    const miningBtn = document.querySelector(".mining-btn");

    const planModal = document.getElementById("planModal");

    const planSave = document.querySelector(".plan-content .save-btn");

    const planSelect = document.getElementById("userPlan");

    if(miningBtn){

        miningBtn.onclick=function(){

            if(!currentRow) return;

            userModal.style.display="none";

            // Populate the dropdown from the real plans table
            sb.from("plans")
                .select("id, name")
                .eq("is_active", true)
                .order("sort_order")

                .then(({ data, error }) => {

                    if(error || !planSelect) return;

                    plansCache = data;

                    planSelect.innerHTML = '<option value="">Select a plan</option>' +
                        data.map(p => `<option value="${p.id}">${p.name}</option>`).join("");

                    planModal.style.display="flex";

                });

        };

    }

    if(planSave){

        planSave.onclick=function(){

            if(!currentRow) return;

            let newPlanId = planSelect.value;

            if(newPlanId === ""){
                alert("Select a plan");
                return;
            }

            sb.rpc("admin_set_user_plan", {
                p_user_id: currentRow.dataset.userid,
                p_plan_id: newPlanId
            })

            .then(({ error }) => {

                if(error){
                    alert("Failed to update plan: " + error.message);
                    return;
                }

                const planName = plansCache.find(p => p.id === newPlanId)?.name || "Updated";

                currentRow.querySelector(".user-hidden-data .plan").textContent = planName;
                modalPlan.textContent = planName;

                planModal.style.display="none";

                alert("Mining plan updated successfully");

            });

        };

    }

    // ===============================
    // ADD BONUS (real — admin_credit_wallet)
    // ===============================

    const rewardBtn = document.querySelector(".reward-btn");

    if(rewardBtn){

        rewardBtn.onclick=function(){

            if(!currentRow) return;

            let bonus = prompt("Enter bonus amount");

            if(bonus === null) return;

            bonus = Number(bonus);

            if(isNaN(bonus) || bonus <= 0){
                alert("Invalid amount");
                return;
            }

            sb.rpc("admin_credit_wallet", {
                p_user_id: currentRow.dataset.userid,
                p_amount: bonus,
                p_note: "Bonus"
            })

            .then(({ error }) => {

                if(error){
                    alert("Failed to add bonus: " + error.message);
                    return;
                }

                loadUsers();

                alert("Bonus added successfully");

            });

        };

    }

    // ===============================
    // VERIFY USER
    // ===============================

    const verifyBtn = document.querySelector(".verify-btn");

    if(verifyBtn){
        verifyBtn.onclick = function(){
            if(!currentRow) return;
            loadAdminPage("verification");
        };
    }

    // ===============================
    // RESET PASSWORD (real — sends an actual reset email)
    // ===============================

    const passwordBtn = document.querySelector(".password-btn");

    const resetPasswordModal = document.getElementById("resetPasswordModal");

    const confirmResetBtn = document.querySelector(".reset-password-content .reset-btn");

    if(passwordBtn){

        passwordBtn.onclick=function(){
            if(!currentRow) return;
            userModal.style.display="none";
            resetPasswordModal.style.display="flex";
        };

    }

    if(confirmResetBtn){

        confirmResetBtn.onclick=function(){

            if(!currentRow) return;

            const email = currentRow.querySelector(".user-hidden-data .email").textContent;

            if(!email){
                alert("This user has no email on file");
                return;
            }

            sb.auth.resetPasswordForEmail(email)

                .then(({ error }) => {

                    resetPasswordModal.style.display="none";

                    if(error){
                        alert("Failed to send reset email: " + error.message);
                        return;
                    }

                    alert("Password reset link sent to user's email");

                });

        };

    }

    // ===============================
    // DEPOSIT / WITHDRAWAL / TRANSACTION HISTORY
    // ===============================

    const depositBtn = document.querySelector(".deposit-btn");

    if(depositBtn){
        depositBtn.onclick=function(){
            if(!currentRow) return;
            loadAdminPage("deposits");
        };
    }

    const withdrawBtn = document.querySelector(".withdraw-btn");

    if(withdrawBtn){
        withdrawBtn.onclick=function(){
            if(!currentRow) return;
            loadAdminPage("withdrawals");
        };
    }

    const transactionBtn = document.querySelector(".transaction-btn");

    if(transactionBtn){
        transactionBtn.onclick=function(){
            if(!currentRow) return;
            loadAdminPage("transactions");
        };
    }

    // ===============================
    // REFERRAL LIST
    // ===============================

    const referralBtn = document.querySelector(".referral-btn");

    if(referralBtn){
        referralBtn.onclick=function(){
            if(!currentRow) return;
            alert("Referral list feature is not available yet");
        };
    }

    // ===============================
    // DELETE USER — repurposed as Block
    // ===============================
    // A true delete requires Supabase's admin/service-role API,
    // which isn't available from the browser under Lovable Cloud.
    // This blocks the account instead and says so plainly, rather
    // than pretending to delete something that's still there.

    const deleteBtn = document.querySelector(".delete-btn");

    const deleteModal = document.getElementById("deleteModal");

    const confirmDelete = document.querySelector(".delete-content .delete-btn");

    if(deleteBtn){

        deleteBtn.onclick=function(){
            if(!currentRow) return;
            userModal.style.display="none";
            deleteModal.style.display="flex";
        };

    }

    if(confirmDelete){

        confirmDelete.onclick=function(){

            if(!currentRow) return;

            sb.from("profiles")
                .update({ is_blocked: true })
                .eq("id", currentRow.dataset.userid)

                .then(({ error }) => {

                    deleteModal.style.display="none";

                    if(error){
                        alert("Failed to block account: " + error.message);
                        return;
                    }

                    loadUsers();

                    alert("Full account deletion isn't available yet — this account has been blocked instead.");

                });

        };

    }
}


/* ===== js/verification.js ===== */
// =================================
// VERIFICATION PAGE
// =================================

function initVerification() {

    const totalRequests = document.getElementById("totalRequests");
    const pendingRequests = document.getElementById("pendingRequests");
    const approvedRequests = document.getElementById("approvedRequests");
    const rejectedRequests = document.getElementById("rejectedRequests");

    const modal = document.getElementById("reviewModal");
    const closeModal = document.querySelector(".close-review");

    const reviewName = document.getElementById("reviewName");
    const reviewDate = document.getElementById("reviewDate");
    const reviewEmail = document.getElementById("reviewEmail");
    const reviewPhone = document.getElementById("reviewPhone");
    const reviewCountry = document.getElementById("reviewCountry");

    const reviewIdFront = document.getElementById("reviewIdFront");
    const reviewIdBack = document.getElementById("reviewIdBack");
    const reviewSelfie = document.getElementById("reviewSelfie");

    const approveBtn = document.querySelector(".approve-btn");
    const rejectBtn = document.querySelector(".reject-btn");
    const requestBtn = document.querySelector(".request-btn");
    const resetBtn = document.querySelector(".reset-btn");

    let selectedRow = null;
    let kycData = {};

    // ===============================
    // Load KYC submissions from Supabase
    // ===============================

    function loadKyc(){

        sb.from("kyc_submissions")
            .select("id, user_id, id_front_url, id_back_url, selfie_url, status, needs_resubmission, admin_note, created_at, profiles(username, surname, email, phone)")
            .order("created_at", { ascending: false })

            .then(({ data, error }) => {

                if(error){
                    console.error("Failed to load KYC submissions:", error);
                    return;
                }

                kycData = {};

                data.forEach(row => {

                    const fullName = row.profiles
                        ? [row.profiles.username, row.profiles.surname].filter(Boolean).join(" ")
                        : "Unknown";

                    kycData[row.id] = {
                        id: row.id,
                        userId: row.user_id,
                        createdAt: row.created_at,
                        name: fullName,
                        email: row.profiles ? (row.profiles.email || "") : "",
                        phone: row.profiles ? (row.profiles.phone || "") : "",
                        date: new Date(row.created_at).toLocaleDateString("en-US", {
                            day: "2-digit", month: "short", year: "numeric"
                        }),
                        idFront: row.id_front_url,
                        idBack: row.id_back_url,
                        selfie: row.selfie_url,
                        status: row.status,
                        needsResubmission: row.needs_resubmission,
                        adminNote: row.admin_note
                    };

                });

                renderVerificationData();

                updateKycStats();

            });

    }

    // ===============================
    // Render Rows From Data
    // ===============================

    function renderRow(entry) {

        const tr = document.createElement("tr");

        tr.dataset.kycid = entry.id;
        tr.dataset.status = entry.status;

        const buttonLabel =
            entry.status === "pending" ? "Review" : "View";

        const nameCell = entry.needsResubmission
            ? entry.name + " <span style=\"opacity:.6;font-size:11px;\">(reset)</span>"
            : entry.name;

        tr.innerHTML =
            "<td>" + nameCell + "</td>" +
            "<td>" + entry.date + "</td>" +
            "<td><button class=\"review-btn\">" + buttonLabel + "</button></td>";

        return tr;

    }

    function renderVerificationData() {

        const pendingBody =
            document.querySelector("#pendingList tbody");

        const approvedBody =
            document.querySelector("#approvedList tbody");

        const rejectedBody =
            document.querySelector("#rejectedList tbody");

        pendingBody.innerHTML = "";
        approvedBody.innerHTML = "";
        rejectedBody.innerHTML = "";

        const allEntries = Object.values(kycData);

        // Pending: show every pending row, no dedup needed.
        allEntries
            .filter(entry => entry.status === "pending")
            .forEach(entry => pendingBody.appendChild(renderRow(entry)));

        // Approved/Rejected: only each user's single most recent resolved
        // record — an older superseded outcome (e.g. an earlier rejection
        // before a later approval) is dropped from view.
        const latestResolvedByUser = {};

        allEntries
            .filter(entry => entry.status === "approved" || entry.status === "rejected")
            .forEach(entry => {
                const existing = latestResolvedByUser[entry.userId];
                if (!existing || new Date(entry.createdAt) > new Date(existing.createdAt)) {
                    latestResolvedByUser[entry.userId] = entry;
                }
            });

        Object.values(latestResolvedByUser).forEach(entry => {
            if (entry.status === "approved") {
                approvedBody.appendChild(renderRow(entry));
            } else {
                rejectedBody.appendChild(renderRow(entry));
            }
        });

        loadReviewButtons();

    }

    // ===============================
    // Update Statistics
    // ===============================

    function updateKycStats() {

        const pending =
            document.querySelectorAll("#pendingList tbody tr").length;

        const approved =
            document.querySelectorAll("#approvedList tbody tr").length;

        const rejected =
            document.querySelectorAll("#rejectedList tbody tr").length;

        totalRequests.textContent =
            pending + approved + rejected;

        pendingRequests.textContent = pending;
        approvedRequests.textContent = approved;
        rejectedRequests.textContent = rejected;
    }

    loadKyc();

    // ===============================
    // Tabs
    // ===============================

    const tabs = document.querySelectorAll(".kyc-tab");
    const sections = document.querySelectorAll(".verification-section");

    document.querySelector("#pendingList")
        .closest(".verification-section")
        .style.display = "block";

    document.querySelector("#approvedList")
        .closest(".verification-section")
        .style.display = "none";

    document.querySelector("#rejectedList")
        .closest(".verification-section")
        .style.display = "none";

    tabs.forEach(tab => {

        tab.addEventListener("click", function () {

            tabs.forEach(t =>
                t.classList.remove("active"));

            this.classList.add("active");

            const status =
                this.dataset.status;

            sections.forEach(section => {

                section.style.display = "none";

            });

            if (status === "pending") {

                document.querySelector("#pendingList")
                    .closest(".verification-section")
                    .style.display = "block";

            }

            if (status === "approved") {

                document.querySelector("#approvedList")
                    .closest(".verification-section")
                    .style.display = "block";

            }

            if (status === "rejected") {

                document.querySelector("#rejectedList")
                    .closest(".verification-section")
                    .style.display = "block";

            }

        });

    });

    // ===============================
    // Review Buttons
    // ===============================

    function loadReviewButtons() {

        document.querySelectorAll(".review-btn").forEach(button => {

            button.onclick = function () {

                selectedRow = this.closest("tr");

                const entry = kycData[selectedRow.dataset.kycid];

                if(!entry) return;

                reviewName.textContent = entry.name;
                reviewDate.textContent = entry.date;
                reviewEmail.textContent = entry.email || "—";
                reviewPhone.textContent = entry.phone || "—";
                reviewCountry.textContent = "";

                reviewIdFront.src = entry.idFront;
                reviewIdBack.src = entry.idBack;
                reviewSelfie.src = entry.selfie;

                if (entry.status === "pending") {

                    approveBtn.style.display = "inline-block";
                    rejectBtn.style.display = "inline-block";
                    requestBtn.style.display = "inline-block";
                    resetBtn.style.display = "none";

                } else {

                    approveBtn.style.display = "none";
                    rejectBtn.style.display = "none";
                    requestBtn.style.display = "none";
                    resetBtn.style.display = "inline-block";

                }

                modal.style.display = "flex";

            };

        });

    }

    // ===============================
    // Close Modal
    // ===============================

    closeModal.onclick = function () {

        modal.style.display = "none";

    };

    window.onclick = function (e) {

        if (e.target === modal) {

            modal.style.display = "none";

        }

    };

    // ===============================
    // Approve (real — approve_kyc RPC)
    // ===============================

    approveBtn.onclick = function () {

        if (!selectedRow) return;

        const kycId = selectedRow.dataset.kycid;

        sb.rpc("approve_kyc", { p_kyc_id: kycId })

            .then(({ error }) => {

                if(error){
                    alert("Failed to approve: " + error.message);
                    return;
                }

                modal.style.display = "none";

                loadKyc();

            });

    };

    // ===============================
    // Reject (real — reject_kyc RPC)
    // ===============================

    rejectBtn.onclick = function () {

        if (!selectedRow) return;

        const kycId = selectedRow.dataset.kycid;

        sb.rpc("reject_kyc", { p_kyc_id: kycId })

            .then(({ error }) => {

                if(error){
                    alert("Failed to reject: " + error.message);
                    return;
                }

                modal.style.display = "none";

                loadKyc();

            });

    };

    // ===============================
    // Reset Verification (real — admin_reset_kyc RPC)
    // ===============================

    resetBtn.onclick = function () {

        if (!selectedRow) return;

        const kycId = selectedRow.dataset.kycid;

        sb.rpc("admin_reset_kyc", { p_kyc_id: kycId })

            .then(({ error }) => {

                if(error){
                    alert("Failed to reset: " + error.message);
                    return;
                }

                modal.style.display = "none";

                loadKyc();

            });

    };

    // ===============================
    // Request Documents (real — sends a notification)
    // ===============================

    requestBtn.onclick = function () {

        if (!selectedRow) return;

        const kycId = selectedRow.dataset.kycid;

        sb.rpc("admin_request_kyc_documents", { p_kyc_id: kycId })

            .then(({ error }) => {

                if(error){
                    alert("Failed to send request: " + error.message);
                    return;
                }

                alert("Request for additional documents has been sent.");

                modal.style.display = "none";

            });

    };

}


/* ===== js/exchange.js ===== */
// =================================
// EXCHANGE RATES PAGE
// =================================

let ratesCache = {};
let selectedRateId = null;
let pendingDeleteId = null;

// =================================
// LOAD RATES FROM SUPABASE
// =================================

function loadRates(){

    sb.from("exchange_rates")
        .select("*")
        .order("updated_at", { ascending: false })

        .then(({ data, error }) => {

            if(error){
                console.error("Failed to load exchange rates:", error);
                return;
            }

            ratesCache = {};

            data.forEach(row => {
                ratesCache[row.id] = row;
            });

            renderRates();

            if(data.length > 0){
                const mostRecent = data[0].updated_at;
                const d = new Date(mostRecent);
                document.getElementById("lastUpdated").innerText =
                    "Last Updated: " + d.toLocaleDateString() + " " + d.toLocaleTimeString();
            }

        });

}

function renderRates(){

    const table = document.getElementById("rateTableBody");
    if(!table){
        console.error("rateTableBody not found");
        return;
    }

    table.innerHTML = "";

    Object.values(ratesCache).forEach(item => {

        const pair = item.from_currency + "/" + item.to_currency;

        const row = document.createElement("tr");
        row.dataset.id = item.id;

        row.innerHTML = `
            <td>${pair}</td>
            <td><span>${parseFloat(item.rate).toFixed(4)}</span></td>
            <td>
                <button class="edit-rate-btn" onclick="openRateModal('${item.id}')">
                    Edit
                </button>
            </td>
        `;
        table.appendChild(row);

    });

}

// =================================
// INITIALIZE PAGE
// =================================

function initExchangeRates() {

    console.log("Exchange Rates Loaded");

    loadRates();

}

// =================================
// EDIT RATE MODAL
// =================================

function openRateModal(id) {

    const item = ratesCache[id];
    if(!item) return;

    selectedRateId = id;

    document.getElementById("currencyPair").value = item.from_currency + "/" + item.to_currency;
    document.getElementById("newRate").value = parseFloat(item.rate).toFixed(4);

    document.getElementById("rateModal").style.display = "flex";
}

function closeRateModal() {
    document.getElementById("rateModal").style.display = "none";
    selectedRateId = null;
}

// =================================
// SAVE EDITED RATE (real — updates exchange_rates)
// =================================

function saveRate() {

    if (selectedRateId === null) return;

    let newRate = document.getElementById("newRate").value;
    if (newRate === "") {
        alert("Please enter rate");
        return;
    }

    sb.auth.getUser().then(({ data: { user } }) => {

        sb.from("exchange_rates")
            .update({ rate: Number(newRate), updated_by: user ? user.id : null })
            .eq("id", selectedRateId)

            .then(({ error }) => {

                if(error){
                    alert("Failed to save rate: " + error.message);
                    return;
                }

                closeRateModal();

                loadRates();

            });

    });

}

// =================================
// DELETE CURRENCY PAIR
// =================================

function deleteCurrencyPair() {

    if (selectedRateId === null) return;

    const item = ratesCache[selectedRateId];
    if(!item) return;

    const pair = item.from_currency + "/" + item.to_currency;

    openConfirmDeleteModal(pair, selectedRateId);
}

// =================================
// ADD NEW CURRENCY PAIR MODAL
// =================================

function openAddRateModal() {
    document.getElementById("addRateModal").style.display = "flex";
}

function closeAddRateModal() {
    document.getElementById("addRateModal").style.display = "none";
    document.getElementById("newCurrencyPair").value = "";
    document.getElementById("newCurrencyRate").value = "";
}

// =================================
// ADD NEW CURRENCY PAIR (real — inserts into exchange_rates)
// =================================

function addCurrencyPair() {

    let pair = document.getElementById("newCurrencyPair").value.trim();
    let rate = document.getElementById("newCurrencyRate").value;

    if (pair === "" || rate === "") {
        alert("Please fill all fields");
        return;
    }

    const parts = pair.split("/");

    if(parts.length !== 2 || parts[0].trim() === "" || parts[1].trim() === ""){
        alert('Enter the pair like "ZAR/USD"');
        return;
    }

    sb.auth.getUser().then(({ data: { user } }) => {

        sb.from("exchange_rates")
            .insert({
                from_currency: parts[0].trim().toUpperCase(),
                to_currency: parts[1].trim().toUpperCase(),
                rate: Number(rate),
                updated_by: user ? user.id : null
            })

            .then(({ error }) => {

                if(error){

                    if(error.code === "23505"){
                        alert("That currency pair already exists.");
                    } else {
                        alert("Failed to add pair: " + error.message);
                    }

                    return;
                }

                closeAddRateModal();

                loadRates();

            });

    });

}

// =================================
// CLOSE MODAL WHEN CLICK OUTSIDE
// =================================

window.addEventListener("click", function(event) {
    let editModal = document.getElementById("rateModal");
    let addModal = document.getElementById("addRateModal");

    if (event.target === editModal) closeRateModal();
    if (event.target === addModal) closeAddRateModal();
});


// =================================
// DELETE CONFIRMATION MODAL
// =================================

let pendingDeletePair = null;

function openConfirmDeleteModal(pair, id) {

    pendingDeleteId = id;
    pendingDeletePair = pair;

    document.getElementById("confirmDeleteMessage").innerText =
        "Are you sure you want to delete " + pair + "?";

    document.getElementById("confirmDeleteModal").style.display = "flex";
}

function closeConfirmDeleteModal() {
    document.getElementById("confirmDeleteModal").style.display = "none";
    pendingDeleteId = null;
    pendingDeletePair = null;
}

function confirmDelete() {

    if (!pendingDeleteId) {
        closeConfirmDeleteModal();
        return;
    }

    sb.from("exchange_rates").delete().eq("id", pendingDeleteId)

        .then(({ error }) => {

            if(error){
                alert("Failed to delete pair: " + error.message);
                closeConfirmDeleteModal();
                return;
            }

            closeRateModal();
            closeConfirmDeleteModal();

            loadRates();

        });

}


/* ===== js/notifications.js ===== */
// ===============================
// NOTIFICATIONS PAGE
// ===============================

let notificationsData = [];
let selectedNotification = null;
let selectedNotificationId = null;
let currentNotificationTab = "all";
let currentNotificationTabButton = null;

// ===============================
// ACTION -> ICON / LABEL MAPPING
// ===============================

const NOTIFICATION_ICONS = {
    approved_deposit: "fa-solid fa-wallet",
    rejected_deposit: "fa-solid fa-wallet",
    approved_withdrawal: "fa-solid fa-money-bill-transfer",
    rejected_withdrawal: "fa-solid fa-money-bill-transfer",
    approved_kyc: "fa-solid fa-user-check",
    rejected_kyc: "fa-solid fa-user-xmark",
    reset_kyc: "fa-solid fa-rotate-left",
    requested_kyc_documents: "fa-solid fa-file-circle-question",
    credited_wallet: "fa-solid fa-circle-plus",
    debited_wallet: "fa-solid fa-circle-minus",
    set_user_plan: "fa-solid fa-chart-line"
};

function labelForAction(action){
    return action
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function formatRelativeTime(dateString){

    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);

    if(seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if(minutes < 60) return minutes + (minutes === 1 ? " minute ago" : " minutes ago");

    const hours = Math.floor(minutes / 60);
    if(hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");

    const days = Math.floor(hours / 24);
    if(days < 7) return days + (days === 1 ? " day ago" : " days ago");

    return date.toLocaleDateString();

}

// ===============================
// LOAD ACTIVITY FEED FROM SUPABASE
// ===============================

function loadNotifications(){

    sb.from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

        .then(({ data, error }) => {

            if(error){
                console.error("Failed to load activity feed:", error);
                return;
            }

            notificationsData = data.map(row => ({
                id: row.id,
                icon: NOTIFICATION_ICONS[row.action] || "fa-solid fa-bell",
                title: labelForAction(row.action),
                message: row.target_table
                    ? `${labelForAction(row.action)} (${row.target_table})`
                    : labelForAction(row.action),
                time: formatRelativeTime(row.created_at),
                status: row.is_read ? "read" : "unread"
            }));

            renderNotifications();

            updateNotificationStats();

            showNotificationTab(currentNotificationTab);

        });

}

function renderNotifications(){

    const list = document.getElementById("notificationList");

    list.innerHTML = "";

    notificationsData.forEach(entry=>{

        const row = document.createElement("div");

        row.className = "notification-row " + entry.status;
        row.dataset.id = entry.id;

        row.innerHTML =
        "<div class=\"notification-icon\">" +
            "<i class=\"" + entry.icon + "\"></i>" +
        "</div>" +

        "<div class=\"notification-content\">" +
            "<h4>" + entry.title + "</h4>" +
            "<p>" + entry.message + "</p>" +
            "<small>" + entry.time + "</small>" +
        "</div>" +

        "<button onclick=\"viewNotification(this)\">" +
            "View" +
        "</button>";

        list.appendChild(row);

    });

}


function initNotifications(){

    loadNotifications();

    document.querySelectorAll(".tab-btn")
    .forEach(btn=>{
        btn.classList.remove("active");
    });

    document.querySelector(".tab-btn")
    .classList.add("active");

    showNotificationTab("all");

}


function updateNotificationStats(){

    const total = document.querySelectorAll(".notification-row").length;

    const unread = document.querySelectorAll(".notification-row.unread").length;

    const read = document.querySelectorAll(".notification-row.read").length;

    document.getElementById("totalNotifications").innerHTML = total;

    document.getElementById("unreadNotifications").innerHTML = unread;

    document.getElementById("readNotifications").innerHTML = read;

}


function showNotificationTab(type,button){

    currentNotificationTab = type;

    if(button){
        currentNotificationTabButton = button;
    }

    document.querySelectorAll(".tab-btn")
    .forEach(btn=>{
        btn.classList.remove("active");
    });

    if(button){
        button.classList.add("active");
    }
    else if(currentNotificationTabButton){
        currentNotificationTabButton.classList.add("active");
    }
    else if(type==="all"){
        document.querySelector(".tab-btn").classList.add("active");
    }

    document.querySelectorAll(".notification-row")
    .forEach(row=>{

        if(type==="all"){
            row.style.display="flex";
        }
        else if(row.classList.contains(type)){
            row.style.display="flex";
        }
        else{
            row.style.display="none";
        }

    });

}


function viewNotification(button){

    selectedNotification = button.parentElement;
    selectedNotificationId = selectedNotification.dataset.id;

    document.getElementById("notificationDetails").innerHTML =
    selectedNotification.outerHTML;

    const markBtn = document.querySelector(".mark-read-btn");

    if(selectedNotification.classList.contains("unread")){
        markBtn.textContent = "Mark Read";
    } else {
        markBtn.textContent = "Mark Unread";
    }

    document.getElementById("notificationModal").style.display="flex";

}


function closeNotificationModal(){
    document.getElementById("notificationModal").style.display="none";
}


// ===============================
// MARK READ/UNREAD (real — updates activity_log.is_read)
// ===============================

function markRead(){

    if(!selectedNotificationId) return;

    const isCurrentlyUnread = selectedNotification.classList.contains("unread");

    sb.from("activity_log")
        .update({ is_read: isCurrentlyUnread })
        .eq("id", selectedNotificationId)

        .then(({ error }) => {

            if(error){
                alert("Failed to update: " + error.message);
                return;
            }

            closeNotificationModal();

            loadNotifications();

        });

}


function deleteNotification(){
    document.getElementById("deleteConfirmModal").style.display="flex";
}


function closeDeleteConfirmModal(){
    document.getElementById("deleteConfirmModal").style.display="none";
}


// ===============================
// DELETE (real — removes the activity_log row)
// ===============================

function confirmDeleteNotification(){

    if(!selectedNotificationId){
        closeDeleteConfirmModal();
        return;
    }

    sb.from("activity_log").delete().eq("id", selectedNotificationId)

        .then(({ error }) => {

            closeDeleteConfirmModal();
            closeNotificationModal();

            if(error){
                alert("Failed to delete: " + error.message);
                return;
            }

            loadNotifications();

        });

}


function openNotificationModal(){
    document.getElementById("sendNotificationModal").style.display="flex";
}


function closeSendNotificationModal(){
    document.getElementById("sendNotificationModal").style.display="none";
}


// ===============================
// SEND NOTIFICATION (real — broadcasts to all users)
// ===============================

function sendNotification(){

    const title = document.getElementById("notificationTitle").value.trim();

    const message = document.getElementById("notificationMessage").value.trim();

    if(title==="" || message===""){
        alert("Please complete all fields.");
        return;
    }

    // user_id left NULL = broadcast to every user (per the
    // notifications table's design)
    sb.from("notifications")
        .insert({ user_id: null, title: title, body: message })

        .then(({ error }) => {

            if(error){
                alert("Failed to send notification: " + error.message);
                return;
            }

            alert("Notification sent successfully.");

            document.getElementById("notificationTitle").value="";
            document.getElementById("notificationMessage").value="";

            closeSendNotificationModal();

        });

}


/* ===== js/activity-log.js ===== */
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


/* ===== js/support-chat.js ===== */
// ======================================================
// SUPPORT CHAT SYSTEM
// PART 1 — FOUNDATION
// ======================================================


// ======================================================
// 1. GLOBAL STATE
// ======================================================

// =========================================================
// PIN MESSAGE SELECTION STATE
// =========================================================

let pinMessageSelectionMode = false;

let selectedPinMessageIds = [];

// =========================================================
// PINNED MESSAGE DISPLAY STATE
// =========================================================

let currentPinnedMessageIndex = 0;

// ======================================================
// STAGE 8 — MESSAGE SEARCH
// MESSAGE SEARCH STATE
// ======================================================

let messageSearchActive = false;

let messageSearchQuery = "";

let messageSearchResults = [];

let currentMessageSearchIndex = -1;

// ======================================================
// GROUP MEMBER SELECTION
// ======================================================

let selectedGroupMembers = [];

// ------------------------------------------------------
// Current active conversation
// ------------------------------------------------------

let currentChat = null;


// ------------------------------------------------------
// Current chat type
// ------------------------------------------------------

let currentChatType = "individual";


// ------------------------------------------------------
// Current user
// ------------------------------------------------------

let currentUser = null;


// ------------------------------------------------------
// Current group
// ------------------------------------------------------

let currentGroup = null;


// ------------------------------------------------------
// Reply state
// ------------------------------------------------------

let replyingToMessage = null;


// ------------------------------------------------------
// Edit state
// ------------------------------------------------------

let editingMessage = null;


// ------------------------------------------------------
// Chat filters
// ------------------------------------------------------

let currentChatFilter = "all";

let currentGroupFilter = "all";


// ------------------------------------------------------
// Search state
// ------------------------------------------------------

let currentChatSearch = "";

let currentGroupSearch = "";

let currentMessageSearch = "";


// ------------------------------------------------------
// Chat menu state
// ------------------------------------------------------

let chatMenuOpen = false;


// ------------------------------------------------------
// Attachment menu state
// ------------------------------------------------------

let attachmentMenuOpen = false;


// ------------------------------------------------------
// Emoji picker state
// ------------------------------------------------------




// ------------------------------------------------------
// Voice recording state
// ------------------------------------------------------

let isRecordingVoice = false;

let voiceRecorder = null;

let voiceChunks = [];


// ------------------------------------------------------
// Delete action state
// ------------------------------------------------------

let deleteActionType = null;

let deleteActionId = null;

let deleteActionIds = [];

let deleteActionChatType = null;


// ------------------------------------------------------
// Priority action state (mirrors delete action state,
// used by the priority confirmation modal)
// ------------------------------------------------------

let priorityActionIds = [];

let priorityActionValue = null;
// true = adding to priority, false = removing from priority


// ------------------------------------------------------
// Chat selection state (press-and-hold multi-select)
// ------------------------------------------------------

let chatSelectionMode = false;

let chatSelectionType = null;
// "individual" | "group" | null

let selectedChatIds = [];

let pendingBulkAction = null;
// null | "delete" | "priority" — set once the person
// picks one of the two options in the chat actions modal

let pendingPriorityMode = null;
// null | "add" | "remove" — while pendingBulkAction is
// "priority", this narrows the individual chat list down
// to only the chats eligible for that action
// Note: per-item long-press timing/state lives inside
// attachChatPressHandlers as closure-local variables —
// not here — so that one chat's press gesture can never
// interfere with another chat's click handling.


// ------------------------------------------------------
// Selected group member
// ------------------------------------------------------

let selectedGroupMember = null;

// Create / Edit / Add-members modal mode
let groupModalMode = "create";
let editingGroupId = null;


// ------------------------------------------------------
// Selected group
// ------------------------------------------------------

let selectedGroup = null;


// ------------------------------------------------------
// Group photo
// ------------------------------------------------------

let selectedGroupPhoto = null;


// ------------------------------------------------------
// Support chat initialized
// ------------------------------------------------------

let supportChatInitialized = false;


// ======================================================
// 2. SAMPLE USERS
// ======================================================

const supportChatUsers = [

    {
        id: "USR-1024",
        name: "John",
        email: "john@example.com",
        phone: "+266 5800 1024",
        avatar: "",
        online: true,
        status: "Active",
        verification: "Verified",
        joined: "12 Jun 2026",
        balance: 5000,
        deposited: 12000,
        withdrawn: 7000,
        plan: "Gold Plan"
    },

    {
        id: "USR-1025",
        name: "Mary",
        email: "mary@example.com",
        phone: "+266 5800 1025",
        avatar: "",
        online: false,
        status: "Active",
        verification: "Verified",
        joined: "18 Jun 2026",
        balance: 2800,
        deposited: 8000,
        withdrawn: 5200,
        plan: "Silver Plan"
    },

    {
        id: "USR-1026",
        name: "Thabo",
        email: "thabo@example.com",
        phone: "+266 5800 1026",
        avatar: "",
        online: true,
        status: "Active",
        verification: "Pending",
        joined: "21 Jun 2026",
        balance: 1500,
        deposited: 4000,
        withdrawn: 2500,
        plan: "Starter Plan"
    },

    {
        id: "USR-1027",
        name: "Lerato",
        email: "lerato@example.com",
        phone: "+266 5800 1027",
        avatar: "",
        online: false,
        status: "Blocked",
        verification: "Verified",
        joined: "25 Jun 2026",
        balance: 750,
        deposited: 3000,
        withdrawn: 2250,
        plan: "Starter Plan"
    },

    {
        id: "USR-1028",
        name: "Mpho",
        email: "mpho@example.com",
        phone: "+266 5800 1028",
        avatar: "",
        online: true,
        status: "Active",
        verification: "Verified",
        joined: "30 Jun 2026",
        balance: 9200,
        deposited: 15000,
        withdrawn: 5800,
        plan: "VIP Plan"
    },
        {
        id: "USR-1029",
        name: "Nna",
        email: "Nna@example.com",
        phone: "+266 2900 1029",
        avatar: "",
        online: true,
        status: "Active",
        verification: "Verified",
        joined: "30 Jun 2026",
        balance: 9200,
        deposited: 15000,
        withdrawn: 5800,
        plan: "VIP Plan"
    }

];


// ======================================================
// 3. INDIVIDUAL CHAT DATA
// ======================================================

let individualChats = [

    {
        id: "CHAT-001",
        userId: "USR-1024",
        name: "John",
        avatar: "",
        online: true,
        lastMessage: "Hello admin, I need help with my withdrawal.",
        lastMessageTime: "10:21",
        unread: 2,
        open: true,
        priority: true,
        muted: false,
        pinned: false,
        messages: [

            {
                id: "MSG-001",
                senderId: "USR-1024",
                senderName: "John",
                text: "Hello admin, I need help with my withdrawal.",
                time: "10:20",
                date: "Today",
                sent: false,
                read: true,
                edited: false,
                replyTo: null
            },

            {
                id: "MSG-002",
                senderId: "ADMIN",
                senderName: "Admin",
                text: "Hello John, how can we help you?",
                time: "10:21",
                date: "Today",
                sent: true,
                read: true,
                edited: false,
                replyTo: null
            }

        ]
    },


    {
        id: "CHAT-002",
        userId: "USR-1025",
        name: "Mary",
        avatar: "",
        online: false,
        lastMessage: "Thank you for your help.",
        lastMessageTime: "09:45",
        unread: 0,
        open: true,
        priority: false,
        muted: false,
        pinned: false,
        messages: [

            {
                id: "MSG-003",
                senderId: "USR-1025",
                senderName: "Mary",
                text: "Thank you for your help.",
                time: "09:45",
                date: "Today",
                sent: false,
                read: true,
                edited: false,
                replyTo: null
            }

        ]
    },


    {
        id: "CHAT-003",
        userId: "USR-1026",
        name: "Thabo",
        avatar: "",
        online: true,
        lastMessage: "Can you check my deposit?",
        lastMessageTime: "Yesterday",
        unread: 1,
        open: true,
        priority: false,
        muted: false,
        pinned: false,
        messages: [

            {
                id: "MSG-004",
                senderId: "USR-1026",
                senderName: "Thabo",
                text: "Can you check my deposit?",
                time: "16:30",
                date: "Yesterday",
                sent: false,
                read: false,
                edited: false,
                replyTo: null
            }

        ]
    },


    {
        id: "CHAT-004",
        userId: "USR-1027",
        name: "Lerato",
        avatar: "",
        online: false,
        lastMessage: "I cannot login to my account.",
        lastMessageTime: "Yesterday",
        unread: 0,
        open: false,
        priority: true,
        muted: false,
        pinned: false,
        messages: [

            {
                id: "MSG-005",
                senderId: "USR-1027",
                senderName: "Lerato",
                text: "I cannot login to my account.",
                time: "14:15",
                date: "Yesterday",
                sent: false,
                read: true,
                edited: false,
                replyTo: null
            }

        ]
    },


    {
        id: "CHAT-005",
        userId: "USR-1028",
        name: "Mpho",
        avatar: "",
        online: true,
        lastMessage: "I would like to upgrade my plan.",
        lastMessageTime: "08:10",
        unread: 0,
        open: true,
        priority: false,
        muted: false,
        pinned: true,
        messages: [

            {
                id: "MSG-006",
                senderId: "USR-1028",
                senderName: "Mpho",
                text: "I would like to upgrade my plan.",
                time: "08:10",
                date: "Today",
                sent: false,
                read: true,
                edited: false,
                replyTo: null
            }

        ]
    }

];


// ======================================================
// 4. GROUP DATA
// ======================================================

let supportChatGroups = [

    {
        id: "GROUP-001",
        name: "VIP Members",
        description: "Communication for VIP members.",
        avatar: "",
        unread: 3,
        admin: true,
        muted: false,
        pinned: false,

        permissions: {
            sendMessages: "everyone",
            editGroup: "admins",
            addMembers: "admins"
        },

        members: [

            {
                id: "USR-1028",
                name: "Mpho",
                avatar: "",
                role: "Admin",
                online: true
            },

            {
                id: "USR-1024",
                name: "John",
                avatar: "",
                role: "Member",
                online: true
            },

            {
                id: "USR-1025",
                name: "Mary",
                avatar: "",
                role: "Member",
                online: false
            }

        ],

        messages: [

            {
                id: "GMSG-001",
                senderId: "USR-1028",
                senderName: "Mpho",
                text: "Welcome everyone.",
                time: "09:10",
                date: "Today",
                sent: false,
                read: true,
                edited: false,
                replyTo: null
            },

            {
                id: "GMSG-002",
                senderId: "ADMIN",
                senderName: "Admin",
                text: "Welcome to the VIP group.",
                time: "09:12",
                date: "Today",
                sent: true,
                read: true,
                edited: false,
                replyTo: null
            }

        ]
    },


    {
        id: "GROUP-002",
        name: "Mining Users",
        description: "General mining discussion.",
        avatar: "",
        unread: 0,
        admin: true,
        muted: false,
        pinned: false,

        permissions: {
            sendMessages: "everyone",
            editGroup: "admins",
            addMembers: "admins"
        },

        members: [

            {
                id: "USR-1024",
                name: "John",
                avatar: "",
                role: "Admin",
                online: true
            },

            {
                id: "USR-1026",
                name: "Thabo",
                avatar: "",
                role: "Member",
                online: true
            }

        ],

        messages: [

            {
                id: "GMSG-003",
                senderId: "USR-1026",
                senderName: "Thabo",
                text: "Is there a new mining plan available?",
                time: "Yesterday",
                date: "Yesterday",
                sent: false,
                read: true,
                edited: false,
                replyTo: null
            }

        ]
    }

];


// ======================================================
// 5. DOM HELPERS
// ======================================================

function supportChatElement(id) {

    return document.getElementById(id);

}


// ======================================================
// 6. SHOW INDIVIDUAL CHATS
// ======================================================

function showIndividualChats() {
  /*
 * Close any currently open chat
 * when switching to Individual.
 */

if (
    currentChat
) {

    closeChat();

}

    const individualSection =
        supportChatElement(
            "individualSection"
        );

    const groupSection =
        supportChatElement(
            "groupSection"
        );

    const individualSwitch =
        supportChatElement(
            "individualSwitch"
        );

    const groupSwitch =
        supportChatElement(
            "groupSwitch"
        );


    if (individualSection) {

        individualSection.classList.remove(
            "hidden"
        );

    }


    if (groupSection) {

        groupSection.classList.add(
            "hidden"
        );

    }


    if (individualSwitch) {

        individualSwitch.classList.add(
            "active"
        );

    }


    if (groupSwitch) {

        groupSwitch.classList.remove(
            "active"
        );

    }


    currentChatType =
        "individual";


    renderIndividualChats();

    updateUnreadCounts();

}


// ======================================================
// 7. SHOW GROUPS
// ======================================================

function showGroups() {
  /*
 * Close any currently open chat
 * when switching to Individual.
 */

if (
    currentChat
) {

    closeChat();

}

    const individualSection =
        supportChatElement(
            "individualSection"
        );

    const groupSection =
        supportChatElement(
            "groupSection"
        );

    const individualSwitch =
        supportChatElement(
            "individualSwitch"
        );

    const groupSwitch =
        supportChatElement(
            "groupSwitch"
        );


    if (individualSection) {

        individualSection.classList.add(
            "hidden"
        );

    }


    if (groupSection) {

        groupSection.classList.remove(
            "hidden"
        );

    }


    if (individualSwitch) {

        individualSwitch.classList.remove(
            "active"
        );

    }


    if (groupSwitch) {

        groupSwitch.classList.add(
            "active"
        );

    }


    currentChatType =
        "group";


    renderGroups();

    updateUnreadCounts();

}


// ======================================================
// 8. FIND INDIVIDUAL CHAT
// ======================================================

function findIndividualChat(chatId) {

    return individualChats.find(
        function(chat) {

            return chat.id === chatId;

        }
    );

}


// ======================================================
// 9. FIND GROUP
// ======================================================

function findSupportGroup(groupId) {

    return supportChatGroups.find(
        function(group) {

            return group.id === groupId;

        }
    );

}


// ======================================================
// 10. FIND USER
// ======================================================

function findSupportUser(userId) {

    return supportChatUsers.find(
        function(user) {

            return user.id === userId;

        }
    );

}


// ======================================================
// 11. RENDER INDIVIDUAL CHATS
// ======================================================

function renderIndividualChats() {

    const container =
        supportChatElement(
            "individualChats"
        );

    const emptyState =
        supportChatElement(
            "noIndividualChats"
        );


    if (!container) {

        return;

    }


    container.innerHTML = "";


    let chats =
        [...individualChats];


    if (
        currentChatFilter ===
        "unread"
    ) {

        chats =
            chats.filter(
                function(chat) {

                    return chat.unread > 0;

                }
            );

    }


    if (
        currentChatFilter ===
        "open"
    ) {

        chats =
            chats.filter(
                function(chat) {

                    return chat.open;

                }
            );

    }


    if (
        currentChatFilter ===
        "priority"
    ) {

        chats =
            chats.filter(
                function(chat) {

                    return chat.priority;

                }
            );

    }


    if (
        currentChatSearch.trim()
    ) {

        const search =
            currentChatSearch
                .toLowerCase()
                .trim();


        chats =
            chats.filter(
                function(chat) {

                    return (

                        chat.name
                            .toLowerCase()
                            .includes(search)

                    );

                }
            );

    }


    /*
     * While building a priority-add/remove selection,
     * only show chats eligible for that action — chats
     * already marked priority stay hidden while adding,
     * and only priority chats show while removing.
     */

    if (
        chatSelectionMode &&
        chatSelectionType === "individual" &&
        pendingBulkAction === "priority"
    ) {

        if (pendingPriorityMode === "add") {

            chats =
                chats.filter(
                    function(chat) {

                        return !chat.priority;

                    }
                );

        }
        else if (pendingPriorityMode === "remove") {

            chats =
                chats.filter(
                    function(chat) {

                        return chat.priority;

                    }
                );

        }

    }


    /*
     * Pinned conversations first.
     */

    chats.sort(
        function(a, b) {

            if (
                a.pinned &&
                !b.pinned
            ) {

                return -1;

            }

            if (
                !a.pinned &&
                b.pinned
            ) {

                return 1;

            }

            return 0;

        }
    );


    if (
        chats.length === 0
    ) {

        if (emptyState) {

            emptyState.style.display =
                "flex";

        }


        updateIndividualChatCount(
            0
        );


        return;

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    chats.forEach(
        function(chat) {

            const item =
                createIndividualChatItem(
                    chat
                );


            container.appendChild(
                item
            );

        }
    );


    updateIndividualChatCount(
        chats.length
    );

}


// ======================================================
// 12. CREATE INDIVIDUAL CHAT ITEM
// ======================================================

function createIndividualChatItem(
    chat
) {

    const item =
        document.createElement(
            "div"
        );


    item.className =
        "chat-list-item";


    if (
        currentChat &&
        currentChat.id ===
        chat.id &&
        currentChatType ===
        "individual"
    ) {

        item.classList.add(
            "active"
        );

    }


    if (
        chat.unread > 0
    ) {

        item.classList.add(
            "unread"
        );

    }


    if (
        chatSelectionType === "individual" &&
        selectedChatIds.includes(
            chat.id
        )
    ) {

        item.classList.add(
            "chat-selected"
        );

    }


    item.dataset.chatId =
        chat.id;


    const avatar =
        document.createElement(
            "div"
        );


    avatar.className =
        "chat-list-avatar";


        avatar.textContent =
        getInitials(
            chat.name
        );


    if (
        chat.online
    ) {

        const online =
            document.createElement(
                "span"
            );


        online.className =
            "online-dot";


        avatar.appendChild(
            online
        );

    }


    const content =
        document.createElement(
            "div"
        );


    content.className =
        "chat-list-content";


    const top =
        document.createElement(
            "div"
        );


    top.className =
        "chat-list-top";


    const name =
        document.createElement(
            "h4"
        );


    name.textContent =
        chat.name;


    const time =
        document.createElement(
            "span"
        );


    time.textContent =
        chat.lastMessageTime;


    top.appendChild(
        name
    );


    top.appendChild(
        time
    );


    const bottom =
        document.createElement(
            "div"
        );


    bottom.className =
        "chat-list-bottom";


    const message =
        document.createElement(
            "p"
        );


    message.textContent =
        chat.lastMessage;


    bottom.appendChild(
        message
    );


    if (
        chat.unread > 0
    ) {

        const unread =
            document.createElement(
                "span"
            );


        unread.className =
            "chat-unread-badge";


        unread.textContent =
            chat.unread;


        bottom.appendChild(
            unread
        );

    }


    if (
        chat.priority
    ) {

        const priority =
            document.createElement(
                "i"
            );


        priority.className =
            "fa-solid fa-star chat-priority";


        bottom.appendChild(
            priority
        );

    }


    content.appendChild(
        top
    );


    content.appendChild(
        bottom
    );


    item.appendChild(
        avatar
    );


    item.appendChild(
        content
    );


    attachChatPressHandlers(
        item,
        chat.id,
        "individual",
        function() {

            openIndividualChat(
                chat.id
            );

        }
    );

    return item;

}


// ======================================================
// 13. UPDATE INDIVIDUAL COUNT
// ======================================================

function updateIndividualChatCount(
    count
) {

    const element =
        supportChatElement(
            "individualChatCount"
        );


    if (!element) {

        return;

    }


    element.textContent =
        count +
        (
            count === 1
                ? " conversation"
                : " conversations"
        );

}


// ======================================================
// 14. GET INITIALS
// ======================================================

function getInitials(
    name
) {

    if (
        !name
    ) {

        return "?";

    }


    const parts =
        name
            .trim()
            .split(
                /\s+/
            );


    if (
        parts.length === 1
    ) {

        return parts[0]
            .charAt(0)
            .toUpperCase();

    }


    return (
        parts[0].charAt(0) +
        parts[
            parts.length - 1
        ].charAt(0)
    ).toUpperCase();

}


// ======================================================
// 15. OPEN INDIVIDUAL CHAT
// ======================================================

function openIndividualChat(
    chatId
) {

    cancelPinMessageSelection(); 

    const chat =
        findIndividualChat(
            chatId
        );
        
        


    if (!chat) {

        return;

    }


    currentChat =
        chat;

    currentChatType =
        "individual";

    currentGroup =
        null;

    currentUser =
        findSupportUser(
            chat.userId
        );

    updateChatMuteMenu();
    currentPinnedMessageIndex = 0;


    /*
     * Mark messages as read.
     */

    chat.messages.forEach(
        function(message) {

            if (
                !message.sent
            ) {

                message.read =
                    true;

            }

        }
    );


    chat.unread =
        0;


    openChatWindow();


    renderCurrentChat();


    renderIndividualChats();


    updateUnreadCounts();

}


// ======================================================
// 16. OPEN GROUP CHAT
// ======================================================

function openGroupChat(
    groupId
) {

     cancelPinMessageSelection(); 

    const group =
        findSupportGroup(
            groupId
        );


    if (!group) {

        return;

    }


    currentChat =
        group;

    currentGroup =
        group;

    currentChatType =
        "group";

    currentUser =
        null;


    group.unread =
        0;


    group.messages.forEach(
        function(message) {

            if (
                !message.sent
            ) {

                message.read =
                    true;

            }

        }
    );


    openChatWindow();


    renderCurrentChat();


    renderGroups();


    updateUnreadCounts();

}


// ======================================================
// 17. OPEN CHAT WINDOW
// ======================================================

// ======================================================
// OPEN CHAT WINDOW
// ======================================================

function openChatWindow() {

    const emptyChat =
        supportChatElement("emptyChat");

    const chatWindow =
        supportChatElement("chatWindow");

    const chatMain =
        supportChatElement("chatMain");


    if (emptyChat) {

        emptyChat.classList.add("hidden");

        emptyChat.hidden = true;

    }


    if (chatWindow) {

        chatWindow.classList.remove("hidden");

        chatWindow.hidden = false;

        chatWindow.style.display = "";

        chatWindow.style.visibility = "visible";

        chatWindow.style.opacity = "1";

    }


    if (chatMain) {

        chatMain.classList.add("chat-open");

        chatMain.classList.remove("chat-closed");

    }


    // ==================================================
    // DIAGNOSTIC
    // ==================================================

    console.log("========== CHAT OPEN TEST ==========");

    console.log(
        "chatWindow classes:",
        chatWindow
            ? chatWindow.className
            : "NOT FOUND"
    );

    console.log(
        "chatWindow hidden:",
        chatWindow
            ? chatWindow.hidden
            : "NOT FOUND"
    );

    console.log(
        "chatWindow display:",
        chatWindow
            ? getComputedStyle(chatWindow).display
            : "NOT FOUND"
    );

    console.log(
        "chatWindow visibility:",
        chatWindow
            ? getComputedStyle(chatWindow).visibility
            : "NOT FOUND"
    );

    console.log(
        "chatWindow opacity:",
        chatWindow
            ? getComputedStyle(chatWindow).opacity
            : "NOT FOUND"
    );

    console.log(
        "chatWindow rect:",
        chatWindow
            ? chatWindow.getBoundingClientRect()
            : "NOT FOUND"
    );


    console.log(
        "chatMain classes:",
        chatMain
            ? chatMain.className
            : "NOT FOUND"
    );

    console.log(
        "chatMain display:",
        chatMain
            ? getComputedStyle(chatMain).display
            : "NOT FOUND"
    );

    console.log(
        "chatMain visibility:",
        chatMain
            ? getComputedStyle(chatMain).visibility
            : "NOT FOUND"
    );

    console.log(
        "chatMain rect:",
        chatMain
            ? chatMain.getBoundingClientRect()
            : "NOT FOUND"
    );

    console.log(
        "==================================="
    );

}


// ======================================================
// 18. CLOSE CHAT
// ======================================================

// ======================================================
// CLOSE CHAT
// ======================================================

function closeChat() {

    currentChat = null;

    currentGroup = null;

      hideTypingIndicator();


    const chatWindow =
        supportChatElement("chatWindow");

    const emptyChat =
        supportChatElement("emptyChat");

    const chatMain =
        supportChatElement("chatMain");


    // --------------------------------------------------
    // Hide chat window
    // --------------------------------------------------

    if (chatWindow) {

        chatWindow.classList.add("hidden");

        chatWindow.hidden = true;

    }


    // --------------------------------------------------
    // Show empty state
    // --------------------------------------------------

    if (emptyChat) {

        emptyChat.classList.remove("hidden");

        emptyChat.hidden = false;

    }


    // --------------------------------------------------
    // Close chat main
    // --------------------------------------------------

    if (chatMain) {

        chatMain.classList.remove("chat-open");

        chatMain.classList.add("chat-closed");

    }


    closeChatMenu();

    cancelReply();

    cancelEditMessage();
  
    cancelPinMessageSelection();

    

}


// ======================================================
// 19. RENDER CURRENT CHAT
// ======================================================

function renderCurrentChat() {

    if (
        !currentChat
    ) {

        return;

    }


    const nameElement =
        supportChatElement(
            "chatName"
        );

    const statusElement =
        supportChatElement(
            "chatStatus"
        );

    const avatarElement =
        supportChatElement(
            "chatAvatar"
        );

    const onlineElement =
        supportChatElement(
            "chatOnlineStatus"
        );


    const groupInfoBar =
        supportChatElement(
            "groupChatInfoBar"
        );

    const groupMemberSummary =
        supportChatElement(
            "groupMemberSummary"
        );

    if (
        currentChatType ===
        "group"
    ) {

        renderCurrentGroupHeader();


        if (
            groupInfoBar &&
            currentChat
        ) {

            groupInfoBar.classList.remove(
                "hidden"
            );

        }


        if (
            groupMemberSummary &&
            currentChat
        ) {

            groupMemberSummary.textContent =
                currentChat.members.length +
                " members";

        }

    }
    else {

        if (groupInfoBar) {

            groupInfoBar.classList.add(
                "hidden"
            );

        }


        if (nameElement) {

            nameElement.textContent =
                currentChat.name;

        }


        if (statusElement) {

            statusElement.textContent =
                currentChat.online
                    ? "Online"
                    : "Offline";

        }


                if (avatarElement) {

            avatarElement.removeAttribute(
                "src"
            );

            avatarElement.style.display =
                "none";

        }


        const avatarInitialsElement =
            supportChatElement(
                "chatAvatarInitials"
            );


        if (avatarInitialsElement) {

            avatarInitialsElement.textContent =
                getInitials(
                    currentChat.name
                );

            avatarInitialsElement.classList.remove(
                "hidden"
            );

        }


        if (onlineElement) {

            onlineElement.style.display =
                currentChat.online
                    ? "block"
                    : "none";

        }

    }


    renderMessages();

}

// =========================================================
// CHAT MENU
// =========================================================

function toggleChatMenu() {

    const menu =
        document.getElementById(
            "chatMenu"
        );


    const moreButton =
        document.getElementById(
            "chatMoreButton"
        );


    const closeButton =
        document.getElementById(
            "chatMenuCloseButton"
        );


    if (!menu) {

        console.error(
            "chatMenu element not found"
        );

        return;

    }


    const isOpening =
        menu.classList.contains(
            "hidden"
        );


    if (isOpening) {

        /*
         * Open menu.
         */

        menu.classList.remove(
            "hidden"
        );

        closeMessagePreviewsOnUiOpen();

      
    const deleteLabel =
            document.getElementById(
                "deleteChatMenuLabel"
            );


        if (deleteLabel) {

            deleteLabel.textContent =
                currentChatType === "group"
                    ? "Delete Group"
                    : "Delete Chat";

        }

        /*
         * Hide 3 dots.
         */

        if (moreButton) {

            moreButton.style.display =
                "none";

        }


        /*
         * Show X.
         */

        if (closeButton) {

            closeButton.style.display =
                "flex";

        }


        /*
         * Start outside-click listener.
         */

        setupChatMenuOutsideClick();

    }
    else {

        /*
         * Close menu.
         */

        closeChatMenu();

    }

}


// =========================================================
// CHAT MENU OUTSIDE CLICK
// =========================================================

function setupChatMenuOutsideClick() {

    /*
     * Remove any previous listener first.
     *
     * This prevents duplicate listeners
     * if the menu is opened many times.
     */

    document.removeEventListener(
        "click",
        handleChatMenuOutsideClick
    );


    /*
     * Add the listener.
     */

    setTimeout(
        function() {

            document.addEventListener(
                "click",
                handleChatMenuOutsideClick
            );

        },
        0
    );

}


// =========================================================
// HANDLE CHAT MENU OUTSIDE CLICK
// =========================================================

function handleChatMenuOutsideClick(
    event
) {

    const menu =
        document.getElementById(
            "chatMenu"
        );


    if (!menu) {

        return;

    }


    /*
     * If the menu is already closed,
     * there is nothing to do.
     */

    if (
        menu.classList.contains(
            "hidden"
        )
    ) {

        return;

    }


    /*
     * If the click happened inside
     * the menu, do nothing.
     */

    if (
        menu.contains(
            event.target
        )
    ) {

        return;

    }


    /*
     * If the click was on the More
     * button, do nothing.
     *
     * toggleChatMenu() already handles
     * opening/closing the menu.
     */

    const moreButton =
        event.target.closest(
            '[onclick="toggleChatMenu()"]'
        );


    if (moreButton) {

        return;

    }


    /*
     * Otherwise the click happened
     * outside the menu.
     */

    closeChatMenu();

}


// =========================================================
// CLOSE CHAT MENU
// =========================================================

function closeChatMenu() {

    const menu =
        document.getElementById(
            "chatMenu"
        );


    const moreButton =
        document.getElementById(
            "chatMoreButton"
        );


    const closeButton =
        document.getElementById(
            "chatMenuCloseButton"
        );


    /*
     * Close menu.
     */

    if (menu) {

        menu.classList.add(
            "hidden"
        );

    }


    /*
     * Show 3 dots again.
     */

    if (moreButton) {

        moreButton.style.display =
            "flex";

    }


    /*
     * Hide X.
     */

    if (closeButton) {

        closeButton.style.display =
            "none";
      

    }


    /*
     * Remove outside-click listener.
     */

    document.removeEventListener(
        "click",
        handleChatMenuOutsideClick
    );

}



// ======================================================
// 20. RENDER GROUP HEADER
// ======================================================

function renderCurrentGroupHeader() {

    const group =
        currentGroup ||
        currentChat;


    if (!group) {

        return;

    }


    const nameElement =
        supportChatElement(
            "chatName"
        );

    const statusElement =
        supportChatElement(
            "chatStatus"
        );

    const avatarElement =
        supportChatElement(
            "chatAvatar"
        );

    const onlineElement =
        supportChatElement(
            "chatOnlineStatus"
        );


    if (nameElement) {

        nameElement.textContent =
            group.name;

    }


    if (statusElement) {

        statusElement.textContent =
            group.members.length +
            " members";

    }


    if (avatarElement) {

        if (
            group.avatar
        ) {

            avatarElement.src =
                group.avatar;

            avatarElement.style.display =
                "block";

        }
        else {

            avatarElement.removeAttribute(
                "src"
            );

            avatarElement.style.display =
                "none";

        }

    }

      const avatarInitialsElement =
        supportChatElement(
            "chatAvatarInitials"
        );


    if (avatarInitialsElement) {

        avatarInitialsElement.classList.add(
            "hidden"
        );

    }


    if (onlineElement) {

        onlineElement.style.display =
            "none";

    }

}


// ======================================================
// 21. RENDER MESSAGES
// ======================================================

function renderMessages() {

    const container =
        supportChatElement(
            "messages"
        );


    if (
        !container ||
        !currentChat
    ) {

        return;

    }


    container.innerHTML =
        "";


    const messages =
        currentChat.messages ||
        [];


    messages.forEach(
        function(message) {

            const element =
                createMessageElement(
                    message
                );


            container.appendChild(
                element
            );

        }
    );

    if (
          !pinMessageSelectionMode
            ) {

         scrollMessagesToBottom();

       }


      updatePinMessageSelectionBar();
      updatePinnedMessageBar();

}


// ======================================================
// 22. CREATE MESSAGE ELEMENT
// ======================================================

function createMessageElement(
    message
) {

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "message " +
        (
            message.sent
                ? "sent"
                : "received"
        );


    wrapper.dataset.messageId =
        message.id;

     /*
 * Pin message selection mode.
 */

if (
    pinMessageSelectionMode
) {

    wrapper.classList.add(
        "pin-selection-mode"
    );


    if (
        selectedPinMessageIds.includes(
            message.id
        )
    ) {

        wrapper.classList.add(
            "pin-message-selected"
        );

    }


    wrapper.addEventListener(
        "click",
        function(event) {

            /*
             * Do not treat clicks on
             * message action controls
             * as message selection.
             */

            if (
                event.target.closest(
                    ".message-actions"
                ) ||
                event.target.closest(
                    ".message-action-menu"
                )
            ) {

                return;

            }


            event.stopPropagation();


            togglePinMessageSelection(
                message.id
            );

        }
    );

}


    const content =
        document.createElement(
            "div"
        );


    content.className =
        "message-content";


    /*
     * Reply preview.
     */

    /*
 * Reply preview.
 */

if (
    message.replyTo
) {

    const reply =
        document.createElement(
            "div"
        );


    reply.className =
        "message-reply";


    /*
     * Make the reply clickable so
     * the original message can be
     * located in the conversation.
     */

    reply.dataset.replyMessageId =
        message.replyTo.id || "";


    /*
     * Reply sender.
     */

    const replySender =
        document.createElement(
            "strong"
        );


    replySender.className =
        "message-reply-sender";


    replySender.textContent =
        message.replyTo.senderName ||
        (
            message.replyTo.senderId ===
            "ADMIN"
                ? "You"
                : "User"
        );


    /*
     * Original message text.
     */

    const replyText =
        document.createElement(
            "span"
        );


    replyText.className =
        "message-reply-text";


    replyText.textContent =
        message.replyTo.text ||
        "";


    /*
     * Add sender and original
     * message to the reply box.
     */

    reply.appendChild(
        replySender
    );


    reply.appendChild(
        replyText
    );


    /*
     * Clicking the quoted message
     * jumps to the original message.
     */

    reply.addEventListener(
        "click",
        function(event) {

            event.stopPropagation();


            if (
                message.replyTo.id
            ) {

                openRepliedMessage(
                    message.replyTo.id
                );

            }

        }
    );


    content.appendChild(
        reply
    );

}


    /*
     * Sender name for groups.
     */

    if (
        currentChatType ===
        "group" &&
        !message.sent
    ) {

        const sender =
            document.createElement(
                "strong"
            );


        sender.className =
            "message-sender";


        sender.textContent =
            message.senderName ||
            "User";


        content.appendChild(
            sender
        );

    }


   if (
        message.type === "voice" &&
        message.fileUrl
    ) {

        const audio =
            document.createElement(
                "audio"
            );

        audio.className =
            "message-voice-player";

        audio.controls = true;

        audio.src =
            message.fileUrl;

        content.appendChild(
            audio
        );

    }
    else if (
        message.type === "attachment" &&
        message.fileUrl
    ) {

        const isImage =
            message.fileMime &&
            message.fileMime.indexOf("image/") === 0;


        if (isImage) {

            const link =
                document.createElement(
                    "a"
                );

            link.href =
                message.fileUrl;

            link.target =
                "_blank";

            link.rel =
                "noopener";

            link.className =
                "message-attachment-image-link";


            const img =
                document.createElement(
                    "img"
                );

            img.className =
                "message-attachment-image";

            img.src =
                message.fileUrl;

            img.alt =
                message.fileName ||
                "Image";


            link.appendChild(
                img
            );

            content.appendChild(
                link
            );

        }
        else {

            const fileCard =
                document.createElement(
                    "a"
                );

            fileCard.href =
                message.fileUrl;

            fileCard.download =
                message.fileName ||
                "file";

            fileCard.className =
                "message-attachment-file";

            fileCard.innerHTML =
                '<i class="fa-solid fa-file"></i>' +
                '<span>' +
                (
                    message.fileName ||
                    message.text ||
                    "File"
                ) +
                '</span>';

            content.appendChild(
                fileCard
            );

        }


        const caption =
            document.createElement(
                "p"
            );

        caption.className =
            "message-text";

        caption.textContent =
            message.text ||
            "";

        content.appendChild(
            caption
        );

    }
    else {

        const text =
            document.createElement(
                "p"
            );

        text.className =
            "message-text";

        text.textContent =
            message.text ||
            "";

        content.appendChild(
            text
        );

    }


    const meta =
        document.createElement(
            "div"
        );


    meta.className =
        "message-meta";


    const time =
        document.createElement(
            "span"
        );


    time.textContent =
        message.time ||
        "";


    meta.appendChild(
        time
    );


    if (
        message.edited
    ) {

        const edited =
            document.createElement(
                "span"
            );


        edited.textContent =
            " edited";


        meta.appendChild(
            edited
        );

    }


    if (
        message.sent
    ) {

        const status =
            document.createElement(
                "i"
            );


        status.className =
            message.read
                ? "fa-solid fa-check-double"
                : "fa-solid fa-check";


        meta.appendChild(
            status
        );

    }


    content.appendChild(
        meta
    );


    wrapper.appendChild(
        content
    );


    /*
     * Message actions.
     */

    setupMessageActionEvents(
    wrapper,
    message.id
);


    return wrapper;

}


// ======================================================
// 23. SCROLL MESSAGES
// ======================================================

function scrollMessagesToBottom() {

    const container =
        supportChatElement(
            "messages"
        );


    if (!container) {

        return;

    }


    requestAnimationFrame(
        function() {

            container.scrollTop =
                container.scrollHeight;

        }
    );

}


// ======================================================
// 24. FILTER CHATS
// ======================================================

function filterChats(
    filter,
    button
) {

    currentChatFilter =
        filter ||
        "all";


    document
        .querySelectorAll(
            "#individualSection .chat-filter"
        )
        .forEach(
            function(item) {

                item.classList.remove(
                    "active"
                );

            }
        );


    if (button) {

        button.classList.add(
            "active"
        );

    }


    renderIndividualChats();

}


// ======================================================
// 25. FILTER GROUPS
// ======================================================

function filterGroups(
    filter,
    button
) {

    currentGroupFilter =
        filter ||
        "all";


    document
        .querySelectorAll(
            "#groupSection .chat-filter"
        )
        .forEach(
            function(item) {

                item.classList.remove(
                    "active"
                );

            }
        );


    if (button) {

        button.classList.add(
            "active"
        );

    }


    renderGroups();

}


// ======================================================
// 26. SEARCH CHATS
// ======================================================

function searchChats(
    value
) {

    currentChatSearch =
        value ||
        "";


    renderIndividualChats();


    const clearButton =
        supportChatElement(
            "clearChatSearch"
        );


    if (clearButton) {

        clearButton.style.display =
            currentChatSearch.length
                ? "block"
                : "none";

    }

}


// ======================================================
// 27. CLEAR CHAT SEARCH
// ======================================================

function clearChatSearch() {

    const input =
        supportChatElement(
            "chatSearch"
        );


    if (input) {

        input.value =
            "";

    }


    currentChatSearch =
        "";


    const clearButton =
        supportChatElement(
            "clearChatSearch"
        );


    if (clearButton) {

        clearButton.style.display =
            "none";

    }


    renderIndividualChats();

}


// ======================================================
// 28. RENDER GROUPS
// ======================================================

function renderGroups() {

    const container =
        supportChatElement(
            "groupChats"
        );

    const emptyState =
        supportChatElement(
            "noGroups"
        );


    if (!container) {

        return;

    }


    container.innerHTML =
        "";


    let groups =
        [...supportChatGroups];


    if (
        currentGroupFilter ===
        "unread"
    ) {

        groups =
            groups.filter(
                function(group) {

                    return group.unread > 0;

                }
            );

    }


    if (
        currentGroupFilter ===
        "admin"
    ) {

        groups =
            groups.filter(
                function(group) {

                    return group.admin;

                }
            );

    }


    const groupSearch =
        supportChatElement(
            "groupSearch"
        );


    const searchValue =
        groupSearch
            ? groupSearch.value
            : "";


    if (
        searchValue.trim()
    ) {

        const search =
            searchValue
                .toLowerCase()
                .trim();


        groups =
            groups.filter(
                function(group) {

                    return (

                        group.name
                            .toLowerCase()
                            .includes(search)


                    );

                }
            );

    }


    if (
        groups.length === 0
    ) {

        if (emptyState) {

            emptyState.style.display =
                "flex";

        }


        updateGroupChatCount(
            0
        );


        return;

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    groups.forEach(
        function(group) {

            container.appendChild(
                createGroupChatItem(
                    group
                )
            );

        }
    );


    updateGroupChatCount(
        groups.length
    );

}


// ======================================================
// 29. CREATE GROUP CHAT ITEM
// ======================================================

function createGroupChatItem(
    group
) {

    const item =
        document.createElement(
            "div"
        );


    item.className =
        "chat-list-item";


    if (
        currentGroup &&
        currentGroup.id ===
        group.id
    ) {

        item.classList.add(
            "active"
        );

    }


    if (
        group.unread > 0
    ) {

        item.classList.add(
            "unread"
        );

    }


    if (
        chatSelectionType === "group" &&
        selectedChatIds.includes(
            group.id
        )
    ) {

        item.classList.add(
            "chat-selected"
        );

    }


    item.dataset.chatId =
        group.id;


    const avatar =
        document.createElement(
            "div"
        );


    avatar.className =
        "chat-list-avatar group-avatar";


    if (
        group.avatar
    ) {

        const image =
            document.createElement(
                "img"
            );


        image.src =
            group.avatar;


        image.alt =
            group.name;


        avatar.appendChild(
            image
        );

    }
    else {

        const icon =
            document.createElement(
                "i"
            );


        icon.className =
            "fa-solid fa-users";


        avatar.appendChild(
            icon
        );

    }


    const content =
        document.createElement(
            "div"
        );


    content.className =
        "chat-list-content";


    const top =
        document.createElement(
            "div"
        );


    top.className =
        "chat-list-top";


    const name =
        document.createElement(
            "h4"
        );


    name.textContent =
        group.name;


    const members =
        document.createElement(
            "span"
        );


    members.textContent =
        group.members.length +
        " members";


    top.appendChild(
        name
    );


    top.appendChild(
        members
    );


    const bottom =
        document.createElement(
            "div"
        );


    bottom.className =
        "chat-list-bottom";


    const lastMessage =
        group.messages.length
            ? group.messages[
                group.messages.length - 1
              ]
            : null;


    const message =
        document.createElement(
            "p"
        );


    message.textContent =
        lastMessage
            ? lastMessage.text
            : "No messages";


    bottom.appendChild(
        message
    );


    if (
        group.unread > 0
    ) {

        const unread =
            document.createElement(
                "span"
            );


        unread.className =
            "chat-unread-badge";


        unread.textContent =
            group.unread;


        bottom.appendChild(
            unread
        );

    }


    if (
        group.priority
    ) {

        const priority =
            document.createElement(
                "i"
            );


        priority.className =
            "fa-solid fa-star chat-priority";


        bottom.appendChild(
            priority
        );

    }


    content.appendChild(
        top
    );


    content.appendChild(
        bottom
    );


    item.appendChild(
        avatar
    );


    item.appendChild(
        content
    );


    attachChatPressHandlers(
        item,
        group.id,
        "group",
        function() {

            openGroupChat(
                group.id
            );

        }
    );


    return item;

}


// ======================================================
// 30. UPDATE GROUP COUNT
// ======================================================

function updateGroupChatCount(
    count
) {

    const element =
        supportChatElement(
            "groupChatCount"
        );


    if (!element) {

        return;

    }


    element.textContent =
        count +
        (
            count === 1
                ? " group"
                : " groups"
        );

}


// ======================================================
// 31. SEARCH GROUPS
// ======================================================

function searchGroups(
    value
) {

    renderGroups();

}


// ======================================================
// 32. UPDATE UNREAD COUNTS
// ======================================================

function updateUnreadCounts() {

    const individualUnread =
        individualChats.reduce(
            function(total, chat) {

                return total +
                    (
                        Number(
                            chat.unread
                        ) || 0
                    );

            },
            0
        );


    const groupUnread =
        supportChatGroups.reduce(
            function(total, group) {

                return total +
                    (
                        Number(
                            group.unread
                        ) || 0
                    );

            },
            0
        );


    const individualElement =
        supportChatElement(
            "individualUnread"
        );


    const groupElement =
        supportChatElement(
            "groupUnread"
        );


    if (
        individualElement
    ) {

        individualElement.textContent =
            individualUnread;

    }


    if (
        groupElement
    ) {

        groupElement.textContent =
            groupUnread;

    }

}


// ======================================================
// 33. INITIALIZE CHAT DATA
// ======================================================

function initializeChatData() {

    updateUnreadCounts();

    renderIndividualChats();

    renderGroups();

}


// ======================================================
// 34. INITIALIZE INDIVIDUAL CHATS
// ======================================================

function initializeIndividualChats() {

    renderIndividualChats();

}


// ======================================================
// 35. INITIALIZE GROUPS
// ======================================================

function initializeGroups() {

    renderGroups();

}


// ======================================================
// 36. OPEN NEW CHAT MODAL
// ======================================================

function openNewChatModal() {

    const modal =
        supportChatElement(
            "newChatModal"
        );


    if (!modal) {

        return;

    }


    modal.classList.remove(
        "hidden"
    );


    renderAvailableUsers();


    const searchInput =
        supportChatElement(
            "userSearchInput"
        );


    if (searchInput) {

        searchInput.value =
            "";

    if (!searchInput.dataset.wired) {

            searchInput.addEventListener(
                "input",
                function() {

                    renderAvailableUsers(
                        searchInput.value
                    );

                }
            );


            searchInput.dataset.wired =
                "true";
    }

        setTimeout(
            function() {

                searchInput.focus();

            },
            50
        );

    }

}


// ======================================================
// 37. CLOSE NEW CHAT MODAL
// ======================================================

function closeNewChatModal() {

    const modal =
        supportChatElement(
            "newChatModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}


// ======================================================
// 38. RENDER AVAILABLE USERS
// ======================================================

function renderAvailableUsers(
    searchValue = ""
) {

    const container =
        supportChatElement(
            "availableUsers"
        );


    if (!container) {

        return;

    }


    container.innerHTML =
        "";


    const search =
        String(
            searchValue
        )
            .toLowerCase()
            .trim();


    let users =
        [...supportChatUsers];


    if (search) {

        users =
            users.filter(
                function(user) {

                    return (

                        user.name
                            .toLowerCase()
                            .includes(search)

                        ||

                        user.email
                            .toLowerCase()
                            .includes(search)

                        ||

                        user.id
                            .toLowerCase()
                            .includes(search)

                    );

                }
            );

    }


    users.forEach(
        function(user) {

            const item =
                document.createElement(
                    "button"
                );


            item.type =
                "button";


            item.className =
                "available-user";


            const avatar =
                document.createElement(
                    "div"
                );


            avatar.className =
                "available-user-avatar";


            avatar.textContent =
                getInitials(
                    user.name
                );


            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "available-user-info";


            const name =
                document.createElement(
                    "strong"
                );


            name.textContent =
                user.name;


            const id =
                document.createElement(
                    "span"
                );


            id.textContent =
                user.id;


            info.appendChild(
                name
            );


            info.appendChild(
                id
            );


            item.appendChild(
                avatar
            );


            item.appendChild(
                info
            );


            item.addEventListener(
                "click",
                function() {

                    startNewConversation(
                        user.id
                    );

                }
            );


            container.appendChild(
                item
            );

        }
    );


    if (
        users.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "available-users-empty";


        empty.textContent =
            "No users found.";


        container.appendChild(
            empty
        );

    }

}


// ======================================================
// 39. START NEW CONVERSATION
// ======================================================

function startNewConversation(
    userId
) {

    const user =
        findSupportUser(
            userId
        );


    if (!user) {

        return;

    }


    let chat =
        individualChats.find(
            function(item) {

                return item.userId ===
                    userId;

            }
        );


    if (!chat) {

        chat = {

            id:
                "CHAT-" +
                Date.now(),

            userId:
                user.id,

            name:
                user.name,

            avatar:
                user.avatar,

            online:
                user.online,

            lastMessage:
                "",

            lastMessageTime:
                "",

            unread:
                0,

            open:
                true,

            priority:
                false,

            muted:
                false,

            pinned:
                false,

            messages:
                []

        };


        individualChats.unshift(
            chat
        );

    }


    closeNewChatModal();


    showIndividualChats();


    openIndividualChat(
        chat.id
    );

}


// ======================================================
// SUPPORT CHAT SYSTEM
// STAGE 1 — INITIALIZATION
// ======================================================


// ======================================================
// 40. GLOBAL FUNCTION ACCESS
// ======================================================

window.showIndividualChats =
    showIndividualChats;


window.showGroups =
    showGroups;


window.openIndividualChat =
    openIndividualChat;


window.openGroupChat =
    openGroupChat;


window.closeChat =
    closeChat;


window.filterChats =
    filterChats;


window.filterGroups =
    filterGroups;


window.searchChats =
    searchChats;


window.clearChatSearch =
    clearChatSearch;


window.searchGroups =
    searchGroups;


window.openNewChatModal =
    openNewChatModal;


window.closeNewChatModal =
    closeNewChatModal;


window.startNewConversation =
    startNewConversation;


// ======================================================
// 41. SETUP STAGE 1 EVENTS
// ======================================================

function setupSupportChatStage1() {

    const chatSearch =
        supportChatElement(
            "chatSearch"
        );


    const groupSearch =
        supportChatElement(
            "groupSearch"
        );


    /*
     * Individual chat search
     */

    if (
        chatSearch &&
        !chatSearch.dataset.stage1Ready
    ) {

        chatSearch.addEventListener(
            "input",
            function(event) {

                searchChats(
                    event.target.value
                );

            }
        );


        chatSearch.dataset.stage1Ready =
            "true";

    }


    /*
     * Group search
     */

    if (
        groupSearch &&
        !groupSearch.dataset.stage1Ready
    ) {

        groupSearch.addEventListener(
            "input",
            function(event) {

                searchGroups(
                    event.target.value
                );

            }
        );


        groupSearch.dataset.stage1Ready =
            "true";

    }

}


// ======================================================
// 42. INITIALIZE SUPPORT CHAT PAGE
// ======================================================

function initSupportChatPage() {

    /*
     * Check whether the Support Chat HTML
     * currently exists.
     */

    const supportChat =
        document.querySelector(
            ".support-chat"
        );


    if (!supportChat) {

        return;

    }


    /*
     * Do not initialize the same page
     * more than once.
     */

    if (
        supportChat.dataset.initialized ===
        "true"
    ) {

        return;

    }


    supportChat.dataset.initialized =
        "true";


    /*
     * Reset Stage 1 state.
     */

    currentChat =
        null;


    currentGroup =
        null;


    currentUser =
        null;


    currentChatType =
        "individual";


    currentChatFilter =
        "all";


    currentGroupFilter =
        "all";


    currentChatSearch =
        "";


    currentGroupSearch =
        "";


    currentMessageSearch =
        "";


    /*
     * Initialize chat data.
     */

    updateUnreadCounts();


    /*
     * Render both lists.
     */

    renderIndividualChats();


    renderGroups();


    /*
     * Setup search events.
     */

    setupSupportChatStage1();
    setupCreateGroupEvents();
    initializeMessageSearch();
    initStage6MessageActions();
    setupPinMessageInput();
    setupAttachmentEvents();
    setupChatSelectionOutsideClick();
    setupPinSelectionOutsideClick();
    


    /*
     * Make Individual the default view.
     */

    showIndividualChats();


}


// ======================================================
// 43. GLOBAL INITIALIZATION ACCESS
// ======================================================

window.initSupportChatPage =
    initSupportChatPage;
    


// ======================================================
// SUPPORT CHAT SYSTEM
// STAGE 2 — CREATE GROUP
// ======================================================


// ======================================================
// 44. OPEN CREATE GROUP MODAL
// ======================================================

// ======================================================
// OPEN CREATE GROUP MODAL
// ======================================================

function openCreateGroupModal() {

    groupModalMode =
        "create";

    editingGroupId =
        null;

    selectedGroupPhoto =
        null;


    showAllGroupModalSections();


    setGroupModalTitle(
        "Create Group",
        "Create a group and add users."
    );


    setGroupModalSubmitLabel(
        "Create Group",
        "fa-solid fa-users"
    );


    const modal =
        supportChatElement(
            "createGroupModal"
        );


    if (!modal) {

        return;

    }


    selectedGroupMembers = [];


    const groupName =
        supportChatElement(
            "groupNameInput"
        );


    const description =
        supportChatElement(
            "groupDescriptionInput"
        );


    const searchInput =
        supportChatElement(
            "memberSearchInput"
        );


    const avatarPreview =
        supportChatElement(
            "newGroupAvatar"
        );


    if (groupName) {

        groupName.value =
            "";

    }


    if (description) {

        description.value =
            "";

    }


    if (searchInput) {

        searchInput.value =
            "";

    }


    if (avatarPreview) {

        avatarPreview.innerHTML =
            '<i class="fa-solid fa-users"></i>';

    }


    resetGroupPermissionSelects(
        {

            sendMessages:
                "everyone",

            editGroup:
                "admins",

            addMembers:
                "admins"

        }
    );


    modal.classList.remove(
        "hidden"
    );


    renderGroupUserSelection();


    if (searchInput) {

        setTimeout(
            function() {

                searchInput.focus();

            },
            50
        );

    }

}


// ======================================================
// SHOW ALL GROUP MODAL SECTIONS
// ======================================================

function showAllGroupModalSections() {

    const sectionIds =
        [

            "groupModalAvatarSection",
            "groupModalNameSection",
            "groupModalDescriptionSection",
            "groupModalMembersSection",
            "groupModalPermissionsSection"

        ];


    sectionIds.forEach(
        function(id) {

            const section =
                supportChatElement(
                    id
                );


            if (section) {

                section.classList.remove(
                    "hidden"
                );

            }

        }
    );

}


// ======================================================
// SET GROUP MODAL TITLE
// ======================================================

function setGroupModalTitle(
    title,
    subtitle
) {

    const titleElement =
        supportChatElement(
            "createGroupModalTitle"
        );


    const subtitleElement =
        supportChatElement(
            "createGroupModalSubtitle"
        );


    if (titleElement) {

        titleElement.textContent =
            title;

    }


    if (subtitleElement) {

        subtitleElement.textContent =
            subtitle;

    }

}


// ======================================================
// SET GROUP MODAL SUBMIT LABEL
// ======================================================

function setGroupModalSubmitLabel(
    label,
    iconClass
) {

    const labelElement =
        supportChatElement(
            "groupModalSubmitLabel"
        );


    const iconElement =
        supportChatElement(
            "groupModalSubmitIcon"
        );


    if (labelElement) {

        labelElement.textContent =
            label;

    }


    if (iconElement) {

        iconElement.className =
            iconClass;

    }

}


// ======================================================
// RESET GROUP PERMISSION SELECTS
// ======================================================

function resetGroupPermissionSelects(
    permissions
) {

    const sendPermission =
        supportChatElement(
            "sendMessagesPermission"
        );


    const editPermission =
        supportChatElement(
            "editGroupPermission"
        );


    const addPermission =
        supportChatElement(
            "addMembersPermission"
        );


    if (
        sendPermission &&
        permissions.sendMessages
    ) {

        sendPermission.value =
            permissions.sendMessages;

    }


    if (
        editPermission &&
        permissions.editGroup
    ) {

        editPermission.value =
            permissions.editGroup;

    }


    if (
        addPermission &&
        permissions.addMembers
    ) {

        addPermission.value =
            permissions.addMembers;

    }

}


// ======================================================
// OPEN EDIT GROUP MODAL (used by editGroupInformation)
// ======================================================

function openEditGroupModal() {

    if (!currentGroup) {

        return;

    }


    closeGroupInfo();


    groupModalMode =
        "edit";

    editingGroupId =
        currentGroup.id;

    selectedGroupPhoto =
        currentGroup.avatar ||
        null;


    showAllGroupModalSections();


    /*
     * Editing an existing group does not
     * change its membership here — that is
     * handled from Add Members instead.
     */

    const membersSection =
        supportChatElement(
            "groupModalMembersSection"
        );


    if (membersSection) {

        membersSection.classList.add(
            "hidden"
        );

    }


    setGroupModalTitle(
        "Edit Group",
        "Update this group's details."
    );


    setGroupModalSubmitLabel(
        "Save Changes",
        "fa-solid fa-check"
    );


    const modal =
        supportChatElement(
            "createGroupModal"
        );


    const groupName =
        supportChatElement(
            "groupNameInput"
        );


    const description =
        supportChatElement(
            "groupDescriptionInput"
        );


    const avatarPreview =
        supportChatElement(
            "newGroupAvatar"
        );


    if (!modal) {

        return;

    }


    if (groupName) {

        groupName.value =
            currentGroup.name ||
            "";

    }


    if (description) {

        description.value =
            currentGroup.description ||
            "";

    }


    if (avatarPreview) {

        if (currentGroup.avatar) {

            avatarPreview.innerHTML =
                '<img src="' +
                currentGroup.avatar +
                '" alt="' +
                currentGroup.name +
                '">';

        }
        else {

            avatarPreview.innerHTML =
                '<i class="fa-solid fa-users"></i>';

        }

    }


    resetGroupPermissionSelects(
        currentGroup.permissions ||
        {}
    );


    modal.classList.remove(
        "hidden"
    );

}


// ======================================================
// OPEN ADD MEMBERS MODAL (used by openAddMembers)
// ======================================================

function openAddMembers() {

    if (!currentGroup) {

        return;

    }


    closeGroupInfo();


    groupModalMode =
        "addMembers";

    editingGroupId =
        currentGroup.id;

    selectedGroupMembers =
        [];


    showAllGroupModalSections();


    const hideIds =
        [

            "groupModalAvatarSection",
            "groupModalNameSection",
            "groupModalDescriptionSection",
            "groupModalPermissionsSection"

        ];


    hideIds.forEach(
        function(id) {

            const section =
                supportChatElement(
                    id
                );


            if (section) {

                section.classList.add(
                    "hidden"
                );

            }

        }
    );


    setGroupModalTitle(
        "Add Members",
        "Select users to add to this group."
    );


    setGroupModalSubmitLabel(
        "Add Members",
        "fa-solid fa-user-plus"
    );


    const modal =
        supportChatElement(
            "createGroupModal"
        );


    const searchInput =
        supportChatElement(
            "memberSearchInput"
        );


    if (!modal) {

        return;

    }


    if (searchInput) {

        searchInput.value =
            "";

    }


    modal.classList.remove(
        "hidden"
    );


    renderGroupUserSelection();


    if (searchInput) {

        setTimeout(
            function() {

                searchInput.focus();

            },
            50
        );

    }

}


// ======================================================
// 45. CLOSE CREATE GROUP MODAL
// ======================================================

function closeCreateGroupModal() {

    const modal =
        supportChatElement(
            "createGroupModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }


    selectedGroupMembers = [];

    selectedGroupPhoto = null;

    groupModalMode =
        "create";

    editingGroupId =
        null;

}


// ======================================================
// SUBMIT GROUP MODAL (dispatch by mode)
// ======================================================

function submitGroupModal() {

    if (
        groupModalMode ===
        "edit"
    ) {

        saveGroupEdit();

    }
    else if (
        groupModalMode ===
        "addMembers"
    ) {

        addSelectedMembersToGroup();

    }
    else {

        createGroup();

    }

}



// ======================================================
// 48. CREATE GROUP
// ======================================================

function createGroup() {

    const nameInput =
        supportChatElement(
            "groupNameInput"
        );


    const descriptionInput =
        supportChatElement(
            "groupDescriptionInput"
        );


    const sendPermission =
        supportChatElement(
            "sendMessagesPermission"
        );


    const editPermission =
        supportChatElement(
            "editGroupPermission"
        );


    const addPermission =
        supportChatElement(
            "addMembersPermission"
        );


    const groupName =
        nameInput
            ? nameInput.value.trim()
            : "";


    const description =
        descriptionInput
            ? descriptionInput.value.trim()
            : "";


    /*
     * Validate group name.
     */

    if (!groupName) {

        alert(
            "Please enter a group name."
        );


        if (nameInput) {

            nameInput.focus();

        }


        return;

    }


    /*
     * Get selected members.
     */

    const members =
    selectedGroupMembers.map(
        function(userId) {

            const user =
                findSupportUser(userId);

            return {

                id:
                    user.id,

                name:
                    user.name,

                avatar:
                    user.avatar,

                role:
                    "Member",

                online:
                    user.online

            };

        }
    );


    /*
     * Create group object.
     */

    const newGroup = {

        id:
            "GROUP-" +
            Date.now(),

        name:
            groupName,

        description:
            description,

        avatar:
            selectedGroupPhoto
                ? selectedGroupPhoto
                : "",

        unread:
            0,

        admin:
            true,

        muted:
            false,

        pinned:
            false,


        permissions: {

            sendMessages:
                sendPermission
                    ? sendPermission.value
                    : "everyone",

            editGroup:
                editPermission
                    ? editPermission.value
                    : "admins",

            addMembers:
                addPermission
                    ? addPermission.value
                    : "admins"

        },


        members:
            members,


        messages:
            []

    };


    /*
     * Add new group to the beginning
     * of the group list.
     */

    supportChatGroups.unshift(
        newGroup
    );


    /*
     * Close modal.
     */

    closeCreateGroupModal();


    /*
     * Switch to Groups.
     */

    showGroups();


    /*
     * Re-render groups.
     */

    renderGroups();


    /*
     * Update unread counters.
     */

    updateUnreadCounts();


    /*
     * Open the newly created group.
     */

    openGroupChat(
        newGroup.id
    );

}


// ======================================================
// SAVE GROUP EDIT
// ======================================================

function saveGroupEdit() {

    const group =
        findSupportGroup(
            editingGroupId
        );


    if (!group) {

        closeCreateGroupModal();

        return;

    }


    const nameInput =
        supportChatElement(
            "groupNameInput"
        );


    const descriptionInput =
        supportChatElement(
            "groupDescriptionInput"
        );


    const sendPermission =
        supportChatElement(
            "sendMessagesPermission"
        );


    const editPermission =
        supportChatElement(
            "editGroupPermission"
        );


    const addPermission =
        supportChatElement(
            "addMembersPermission"
        );


    const groupName =
        nameInput
            ? nameInput.value.trim()
            : "";


    if (!groupName) {

        alert(
            "Please enter a group name."
        );


        if (nameInput) {

            nameInput.focus();

        }


        return;

    }


    group.name =
        groupName;

    group.description =
        descriptionInput
            ? descriptionInput.value.trim()
            : group.description;

    group.avatar =
        selectedGroupPhoto
            ? selectedGroupPhoto
            : group.avatar;


    group.permissions =
        {

            sendMessages:
                sendPermission
                    ? sendPermission.value
                    : group.permissions.sendMessages,

            editGroup:
                editPermission
                    ? editPermission.value
                    : group.permissions.editGroup,

            addMembers:
                addPermission
                    ? addPermission.value
                    : group.permissions.addMembers

        };


    closeCreateGroupModal();


    renderGroups();


    if (
        currentChatType === "group" &&
        currentChat &&
        currentChat.id === group.id
    ) {

        renderCurrentChat();

    }

}


// ======================================================
// ADD SELECTED MEMBERS TO GROUP
// ======================================================

function addSelectedMembersToGroup() {

    const group =
        findSupportGroup(
            editingGroupId
        );


    if (!group) {

        closeCreateGroupModal();

        return;

    }


    if (
        selectedGroupMembers.length === 0
    ) {

        alert(
            "Please select at least one user to add."
        );

        return;

    }


    if (
        !Array.isArray(
            group.members
        )
    ) {

        group.members =
            [];

    }


    selectedGroupMembers.forEach(
        function(userId) {

            const alreadyMember =
                group.members.some(
                    function(member) {

                        return (
                            member.id ===
                            userId
                        );

                    }
                );


            if (alreadyMember) {

                return;

            }


            const user =
                findSupportUser(
                    userId
                );


            if (!user) {

                return;

            }


            group.members.push(
                {

                    id:
                        user.id,

                    name:
                        user.name,

                    avatar:
                        user.avatar,

                    role:
                        "Member",

                    online:
                        user.online

                }
            );

        }
    );


    closeCreateGroupModal();


    if (
        currentChatType === "group" &&
        currentChat &&
        currentChat.id === group.id
    ) {

        renderCurrentChat();

        openGroupInfo();

    }

}


// ======================================================
// 49. GROUP MEMBER SEARCH
// ======================================================

function searchGroupMembers(
    value
) {

    renderGroupUserSelection(
        value
    );

}


// ======================================================
// 50. GROUP CREATION EVENTS
// ======================================================

function setupCreateGroupEvents() {

    const memberSearch =
        supportChatElement(
            "memberSearchInput"
        );


    if (
        memberSearch &&
        !memberSearch.dataset.createGroupReady
    ) {

        memberSearch.addEventListener(
            "input",
            function(event) {

                searchGroupMembers(
                    event.target.value
                );

            }
        );


        memberSearch.dataset.createGroupReady =
            "true";

    }

}


// ======================================================
// RENDER GROUP USER SELECTION
// ======================================================

function renderGroupUserSelection(
    searchValue = ""
) {

    const container =
        supportChatElement(
            "groupUserSelection"
        );


    if (!container) {

        return;

    }


    container.innerHTML = "";


    const search =
        String(searchValue)
            .toLowerCase()
            .trim();


    let users =
        [...supportChatUsers];


    // ----------------------------------------------
    // EXCLUDE EXISTING GROUP MEMBERS
    // (only relevant in "Add Members" mode)
    // ----------------------------------------------

    if (
        groupModalMode ===
        "addMembers" &&
        editingGroupId
    ) {

        const group =
            findSupportGroup(
                editingGroupId
            );


        if (
            group &&
            Array.isArray(
                group.members
            )
        ) {

            const existingIds =
                group.members.map(
                    function(member) {

                        return member.id;

                    }
                );


            users =
                users.filter(
                    function(user) {

                        return (
                            !existingIds.includes(
                                user.id
                            )
                        );

                    }
                );

        }

    }


    // ----------------------------------------------
    // SEARCH USERS
    // ----------------------------------------------

    if (search) {

        users =
            users.filter(
                function(user) {

                    return (

                        user.name
                            .toLowerCase()
                            .includes(search)

                        ||

                        user.email
                            .toLowerCase()
                            .includes(search)

                        ||

                        user.id
                            .toLowerCase()
                            .includes(search)

                    );

                }
            );

    }


    // ----------------------------------------------
    // CREATE USER ITEMS
    // ----------------------------------------------

    users.forEach(
        function(user) {

            const item =
                document.createElement(
                    "button"
                );


            item.type =
                "button";


            item.className =
                "group-user-item";


            if (
                selectedGroupMembers.includes(
                    user.id
                )
            ) {

                item.classList.add(
                    "selected"
                );

            }


            // --------------------------------------
            // AVATAR
            // --------------------------------------

            const avatar =
                document.createElement(
                    "div"
                );


            avatar.className =
                "group-user-avatar";


            avatar.textContent =
                getInitials(
                    user.name
                );


            // --------------------------------------
            // USER INFORMATION
            // --------------------------------------

            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "group-user-info";


            const name =
                document.createElement(
                    "strong"
                );


            name.textContent =
                user.name;


            const userId =
                document.createElement(
                    "span"
                );


            userId.textContent =
                user.id;


            info.appendChild(
                name
            );


            info.appendChild(
                userId
            );


            // --------------------------------------
            // CHECKBOX
            // --------------------------------------

            const check =
                document.createElement(
                    "span"
                );


            check.className =
                "group-user-check";


            if (
                selectedGroupMembers.includes(
                    user.id
                )
            ) {

                check.innerHTML =
                    '<i class="fa-solid fa-check"></i>';

            }


            item.appendChild(
                avatar
            );


            item.appendChild(
                info
            );


            item.appendChild(
                check
            );


            // --------------------------------------
            // CLICK
            // --------------------------------------

            item.addEventListener(
                "click",
                function() {

                    toggleGroupMember(
                        user.id
                    );

                }
            );


            container.appendChild(
                item
            );

        }
    );


    // ----------------------------------------------
    // NO USERS
    // ----------------------------------------------

    if (
        users.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "group-users-empty";


        empty.textContent =
            "No users found.";


        container.appendChild(
            empty
        );

    }

}


// ======================================================
// TOGGLE GROUP MEMBER
// ======================================================

function toggleGroupMember(
    userId
) {

    const index =
        selectedGroupMembers.indexOf(
            userId
        );


    if (
        index === -1
    ) {

        selectedGroupMembers.push(
            userId
        );

    }
    else {

        selectedGroupMembers.splice(
            index,
            1
        );

    }


    const searchInput =
        supportChatElement(
            "memberSearchInput"
        );


    renderGroupUserSelection(
        searchInput
            ? searchInput.value
            : ""
    );

}



// ======================================================
// SUPPORT CHAT SYSTEM
// STAGE 3 — MESSAGE ENGINE
// ======================================================


// ======================================================
// 51. GET MESSAGE INPUT
// ======================================================

function getMessageInput() {

    /*
     * Try the main message input first.
     */

    let input =
        supportChatElement(
            "messageInput"
        );


    /*
     * If the main input does not exist,
     * try common textarea/input IDs.
     */

    if (!input) {

        input =
            supportChatElement(
                "chatMessageInput"
            );

    }


    if (!input) {

        input =
            supportChatElement(
                "messageText"
            );

    }


    return input;

}


// ======================================================
// 52. GENERATE MESSAGE ID
// ======================================================

function generateMessageId() {

    return (
        "MSG-" +
        Date.now() +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 8)
    );

}


// ======================================================
// 53. GET CURRENT MESSAGE TEXT
// ======================================================

function getMessageText() {

    const input =
        getMessageInput();


    if (!input) {

        return "";

    }


    return String(
        input.value || ""
    ).trim();

}


// ======================================================
// 54. CLEAR MESSAGE INPUT
// ======================================================

function clearMessageInput() {

    const input =
        getMessageInput();


    if (!input) {

        return;

    }


    input.value =
        "";


    /*
     * Trigger input event so that
     * any send-button UI updates.
     */

    input.dispatchEvent(
        new Event(
            "input",
            {
                bubbles: true
            }
        )
    );


    input.focus();

}


// ======================================================
// 55. GET CURRENT TIME
// ======================================================

function getCurrentMessageTime() {

    const now =
        new Date();


    let hours =
        now.getHours();


    const minutes =
        now.getMinutes();


    const period =
        hours >= 12
            ? "PM"
            : "AM";


    hours =
        hours % 12 ||
        12;


    return (
        String(hours) +
        ":" +
        String(minutes)
            .padStart(2, "0") +
        " " +
        period
    );

}


// ======================================================
// 56. GET CURRENT MESSAGE DATE
// ======================================================

function getCurrentMessageDate() {

    const now =
        new Date();


    return "Today";

}


// ======================================================
// 57. CREATE MESSAGE OBJECT
// ======================================================

function createNewMessage(
    text,
    type,
    fileData
) {

    const message = {

        id:
            generateMessageId(),

        senderId:
            "ADMIN",

        senderName:
            "Admin",

        text:
            text,

        type:
            type || "text",
      
        time:
            getCurrentMessageTime(),

        date:
            getCurrentMessageDate(),

        sent:
            true,

        read:
            true,

        edited:
            false,

        replyTo:
            null

       };
  
   if (fileData) {

        message.fileUrl =
            fileData.fileUrl;

        message.fileName =
            fileData.fileName;

        message.fileMime =
            fileData.fileMime;

         }


    return message;

}
  


// ======================================================
// 58. ADD MESSAGE TO CURRENT CHAT
// ======================================================

function addMessageToCurrentChat(
    message
) {

    if (
        !currentChat
    ) {

        return false;

    }


    /*
     * Make sure the messages array exists.
     */

    if (
        !Array.isArray(
            currentChat.messages
        )
    ) {

        currentChat.messages =
            [];

    }


    /*
     * Add the message.
     */

    currentChat.messages.push(
        message
    );


    return true;

}


// ======================================================
// 59. UPDATE INDIVIDUAL CHAT PREVIEW
// ======================================================

function updateIndividualChatPreview(
    chat,
    message
) {

    if (
        !chat ||
        !message
    ) {

        return;

    }


    chat.lastMessage =
        message.text;


    chat.lastMessageTime =
        message.time;


    /*
     * An outgoing admin message does not
     * create an unread count.
     */

    chat.unread =
        Number(
            chat.unread
        ) || 0;


}


// ======================================================
// 60. UPDATE GROUP CHAT PREVIEW
// ======================================================



// ======================================================
// 60. UPDATE GROUP CHAT PREVIEW
// ======================================================

function updateGroupChatPreview(
    group,
    message
) {

    if (
        !group ||
        !message
    ) {

        return;

    }


    /*
     * Make sure the group has a messages array.
     */

    if (
        !Array.isArray(
            group.messages
        )
    ) {

        group.messages =
            [];

    }


    /*
     * Store the latest message.
     */

    group.lastMessage =
        message.text ||
        "";


    /*
     * Store the latest message time.
     */

    group.lastMessageTime =
        message.time ||
        "";


    /*
     * Outgoing admin messages should
     * not increase the unread count.
     */

    group.unread =
        Number(
            group.unread
        ) || 0;

}


// ======================================================
// 61. MOVE INDIVIDUAL CHAT TO TOP
// ======================================================

function moveIndividualChatToTop(
    chat
) {

    if (
        !chat
    ) {

        return;

    }


    const index =
        individualChats.indexOf(
            chat
        );


    if (
        index === -1
    ) {

        return;

    }


    /*
     * Remove the chat from its current
     * position.
     */

    individualChats.splice(
        index,
        1
    );


    /*
     * Put the conversation at the top.
     */

    individualChats.unshift(
        chat
    );

}


// ======================================================
// 62. SEND MESSAGE
// ======================================================

// ======================================================
// 62. SEND MESSAGE
// ======================================================

function sendMessage() {


 /*
 * If currently editing a message,
 * save the edit instead of sending
 * a new message.
 */

if (
    isEditingMessage()
) {

    saveEditedMessage();

    return;

}
    /*
     * There must be an active conversation.
     */

    if (
        !currentChat
    ) {

        return;

    }


    /*
     * Get text from the message input.
     */

    const text =
        getMessageText();


    /*
     * Do not send empty messages.
     */

    if (
        !text
    ) {

        return;

    }


    /*
     * Create the message.
     *
     * prepareMessageForSend()
     * automatically checks whether
     * we are replying to another message.
     */

    const message =
        prepareMessageForSend(
            text
        );


    /*
     * Add message to current conversation.
     */

    const added =
        addMessageToCurrentChat(
            message
        );


    if (!added) {

        return;

    }


    /*
     * Individual chat.
     */

    if (
        currentChatType ===
        "individual"
    ) {

        updateIndividualChatPreview(
            currentChat,
            message
        );


        moveIndividualChatToTop(
            currentChat
        );

    }

       if (
        currentChatType === "individual" &&
        currentUser
    ) {

        simulateTypingReply(
            currentChat.id,
            currentUser.name
        );

    }


    /*
     * Group chat.
     */

    if (
        currentChatType ===
        "group"
    ) {

        updateGroupChatPreview(
            currentChat,
            message
        );

    }


    /*
     * Clear reply state after
     * successfully sending the message.
     */

    if (
        replyingToMessage
    ) {

        replyingToMessage =
            null;


        closeReplyPreview();

    }


    /*
     * Clear the input.
     */

    clearMessageInput();


    /*
     * Render the updated conversation.
     */

    renderMessages();


    /*
     * Update the conversation list.
     */

    if (
        currentChatType ===
        "individual"
    ) {

        renderIndividualChats();

    }
    else {

        renderGroups();

    }


    /*
     * Update unread counters.
     */

    updateUnreadCounts();


    /*
     * Keep the message area at the bottom.
     */

    scrollMessagesToBottom();

}


// ======================================================
// 63. SEND MESSAGE WITH ENTER
// ======================================================

function handleMessageInputKeydown(
    event
) {

    if (!event) {

        return;

    }


    /*
     * Enter sends the message.
     *
     * Shift + Enter creates a new line.
     */

    if (
        event.key ===
        "Enter" &&
        !event.shiftKey
    ) {

        event.preventDefault();


        sendMessage();

    }

}


// ======================================================
// 64. UPDATE MESSAGE AFTER SEND
// =======


// ======================================================
// 65. GET LAST MESSAGE
// ======================================================

function getLastMessage(
    chat
) {

    if (
        !chat ||
        !Array.isArray(
            chat.messages
        )
    ) {

        return null;

    }


    if (
        chat.messages.length === 0
    ) {

        return null;

    }


    return chat.messages[
        chat.messages.length - 1
    ];

}


// ======================================================
// 66. UPDATE LAST MESSAGE PREVIEW
// ======================================================




// ======================================================
// 66. UPDATE LAST MESSAGE PREVIEW
// ======================================================

function updateLastMessagePreview(
    chat
) {

    if (
        !chat
    ) {

        return;

    }


    const lastMessage =
        getLastMessage(
            chat
        );


    /*
     * If there are no messages,
     * clear the preview.
     */

    if (!lastMessage) {

        chat.lastMessage =
            "";

        chat.lastMessageTime =
            "";

        return;

    }


    /*
     * Update preview for both
     * individual chats and groups.
     */

    chat.lastMessage =
        lastMessage.text ||
        "";


    chat.lastMessageTime =
        lastMessage.time ||
        "";

}


// ======================================================
// 67. CHECK MESSAGE INPUT
// ======================================================

function messageInputHasText() {

    const text =
        getMessageText();


    return (
        text.length > 0
    );

}


// ======================================================
// 68. INITIALIZE MESSAGE ENGINE
// ======================================================

function initializeMessageEngine() {

    const input =
        getMessageInput();


    if (
        !input
    ) {

        return;

    }


    /*
     * Prevent duplicate event listeners.
     */

    if (
        input.dataset.messageEngineReady ===
        "true"
    ) {

        return;

    }


    input.addEventListener(
        "keydown",
        handleMessageInputKeydown
    );


    input.dataset.messageEngineReady =
        "true";

}


// ======================================================
// SUPPORT CHAT SYSTEM
// STAGE 4 — REPLY
// ======================================================


// ======================================================
// 70. START REPLY
// ======================================================

function replyToMessage(
    messageId
) {

    if (
        !currentChat
    ) {

        return;

    }


    const message =
        currentChat.messages.find(
            function(item) {

                return item.id ===
                    messageId;

            }
        );


    if (!message) {

        return;

    }

     /*
 * Reply and edit cannot be active
 * at the same time.
 */

if (
    editingMessage
) {

    cancelEditMessage();

}
 
    /*
     * Store the message currently
     * being replied to.
     */

    replyingToMessage =
        message;


    /*
     * Show the reply preview.
     */

    showReplyPreview(
        message
    );


    /*
     * Focus the message input.
     */

    const input =
        getMessageInput();


    if (input) {

        input.focus();

    }

}


// ======================================================
// 71. SHOW REPLY PREVIEW
// ======================================================

function showReplyPreview(
    message
) {

    if (!message) {

        return;

    }


    /*
     * Try the main reply preview ID.
     */

    let preview =
        supportChatElement(
            "replyPreview"
        );


    /*
     * If the existing HTML uses another
     * common ID, support it as well.
     */

    if (!preview) {

        preview =
            supportChatElement(
                "messageReplyPreview"
            );

    }


    if (!preview) {

        return;

    }


    /*
     * Find the reply text element.
     */

    let textElement =
        supportChatElement(
            "replyMessage"
        );


    if (!textElement) {

        textElement =
            preview.querySelector(
                ".reply-preview-text"
            );

    }


    if (!textElement) {

        textElement =
            preview.querySelector(
               (".reply-text")
            );

    }


    /*
     * Find the sender element.
     */

    let senderElement =
        supportChatElement(
            "replyUser"
        );


    if (!senderElement) {

        senderElement =
            preview.querySelector(
                ".reply-preview-sender"
            );

    }


    /*
     * Display sender name.
     */

    if (senderElement) {

        senderElement.textContent =
            message.sent
                ? "You"
                : (
                    message.senderName ||
                    "User"
                );

    }


    /*
     * Display message text.
     */

    if (textElement) {

        textElement.textContent =
            message.text ||
            "";

    }


    /*
     * Store the original message ID
     * on the preview itself.
     */

    preview.dataset.messageId =
        message.id;


    /*
     * Make preview visible.
     */

    preview.classList.remove(
        "hidden"
    );


    preview.hidden =
        false;


    preview.style.display =
        "";


}


// ======================================================
// 72. CLOSE REPLY PREVIEW
// ======================================================

function closeReplyPreview() {

    let preview =
        supportChatElement(
            "replyPreview"
        );


    if (!preview) {

        preview =
            supportChatElement(
                "messageReplyPreview"
            );

    }


    if (!preview) {

        return;

    }


    preview.classList.add(
        "hidden"
    );


    preview.hidden =
        true;


    preview.style.display =
        "none";


    delete preview.dataset.messageId;

}


// ======================================================
// 73. CANCEL REPLY
// ======================================================

function cancelReply() {

    replyingToMessage =
        null;


    closeReplyPreview();


    /*
     * Return focus to the message input.
     */

    const input =
        getMessageInput();


    if (input) {

        input.focus();

    }

}


// ======================================================
// 74. GET REPLY DATA
// ======================================================

function getReplyData() {

    if (
        !replyingToMessage
    ) {

        return null;

    }


    return {

        id:
            replyingToMessage.id,

        senderId:
            replyingToMessage.senderId,

        senderName:
            replyingToMessage.senderName,

        text:
            replyingToMessage.text,

        time:
            replyingToMessage.time

    };

}


// ======================================================
// 75. CREATE MESSAGE WITH REPLY
// ======================================================

function createMessageWithReply(
    text,
    type,
    fileData
) {

    const message =
        createNewMessage(
            text,
            type,
            fileData
        );


    const replyData =
        getReplyData();


    if (
        replyData
    ) {

        message.replyTo =
            replyData;

    }


    return message;

}


// ======================================================
// 76. SEND REPLY MESSAGE
// ======================================================

function sendReplyMessage(
    text
) {

    if (
        !currentChat
    ) {

        return;

    }


    const messageText =
        String(
            text ||
            ""
        ).trim();


    if (
        !messageText
    ) {

        return;

    }


    /*
     * Create message with reply information.
     */

    const message =
        createMessageWithReply(
            messageText
        );


    /*
     * Add to current conversation.
     */

    const added =
        addMessageToCurrentChat(
            message
        );


    if (!added) {

        return;

    }


    /*
     * Update individual chat preview.
     */

    if (
        currentChatType ===
        "individual"
    ) {

        updateIndividualChatPreview(
            currentChat,
            message
        );


        moveIndividualChatToTop(
            currentChat
        );

    }


    /*
     * Group message.
     */

    if (
        currentChatType ===
        "group"
    ) {

        updateGroupChatPreview(
            currentChat,
            message
        );

    }


    /*
     * Clear reply state.
     */

    replyingToMessage =
        null;


    closeReplyPreview();


    /*
     * Clear message input if this
     * function was called from the input.
     */

    clearMessageInput();


    /*
     * Render conversation again.
     */

    renderMessages();


    /*
     * Render conversation list.
     */

    if (
        currentChatType ===
        "individual"
    ) {

        renderIndividualChats();

    }
    else {

        renderGroups();

    }


    updateUnreadCounts();


    scrollMessagesToBottom();

}


// ======================================================
// 77. REPLY FROM CURRENT INPUT
// ======================================================

function sendCurrentReply() {

    if (
        !replyingToMessage
    ) {

        return false;

    }


    const text =
        getMessageText();


    if (
        !text
    ) {

        return false;

    }


    sendReplyMessage(
        text
    );


    return true;

}


// ======================================================
// 78. REPLY BUTTON HANDLER
// ======================================================

function handleReplyAction(
    messageId
) {

    replyToMessage(
        messageId
    );

}


// ======================================================
// 79. FIND MESSAGE ELEMENT
// ======================================================

function findMessageElement(
    messageId
) {

    const container =
        supportChatElement(
            "messages"
        );


    if (!container) {

        return null;

    }


    return container.querySelector(
        '[data-message-id="' +
        messageId +
        '"]'
    );

}


// ======================================================
// 80. SCROLL TO REPLIED MESSAGE
// ======================================================

// ------------------------------------------------------
// Message highlight state (scrollToMessage) — tracks
// the currently-highlighted message and its pending
// timeout, so jumping to a new replied message cancels
// any highlight still in progress
// ------------------------------------------------------

let messageHighlightTimeout = null;

let highlightedMessageElement = null;


function scrollToMessage(
    messageId
) {

    const element =
        findMessageElement(
            messageId
        );


    if (!element) {

        return;

    }


    element.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });


    /*
     * Cancel any highlight still in progress from a
     * previous call, so only one message is ever
     * highlighted at a time.
     */

    if (messageHighlightTimeout) {

        clearTimeout(
            messageHighlightTimeout
        );

        messageHighlightTimeout =
            null;

    }


    if (
        highlightedMessageElement &&
        highlightedMessageElement !== element
    ) {

        highlightedMessageElement.classList.remove(
            "message-highlight"
        );

    }


    /*
     * Temporarily highlight the message.
     */

    element.classList.add(
        "message-highlight"
    );

    highlightedMessageElement =
        element;


    messageHighlightTimeout =
        setTimeout(
            function() {

                element.classList.remove(
                    "message-highlight"
                );


                if (
                    highlightedMessageElement ===
                    element
                ) {

                    highlightedMessageElement =
                        null;

                }


                messageHighlightTimeout =
                    null;

            },
            4500
        );

}




// ======================================================
// 81. OPEN REPLIED MESSAGE
// ======================================================

function openRepliedMessage(
    messageId
) {

    if (
        !messageId
    ) {

        return;

    }


    scrollToMessage(
        messageId
    );

}


// ======================================================
// 82. SETUP REPLY PREVIEW EVENTS
// ======================================================

function setupReplyPreviewEvents() {

    let preview =
        supportChatElement(
            "replyPreview"
        );


    if (!preview) {

        preview =
            supportChatElement(
                "messageReplyPreview"
            );

    }


    if (
        !preview
    ) {

        return;

    }


    /*
     * Prevent duplicate listeners.
     */

    if (
        preview.dataset.replyReady ===
        "true"
    ) {

        return;

    }


    /*
     * Look for a cancel button.
     */

    const cancelButton =
        preview.querySelector(
            "[data-action='cancel-reply']"
        ) ||
        preview.querySelector(
            ".cancel-reply"
        ) ||
        preview.querySelector(
            ".reply-preview-close"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                cancelReply();

            }
        );

    }


    preview.dataset.replyReady =
        "true";

}


// ======================================================
// 83. UPDATE MESSAGE CREATION FOR REPLY
// ======================================================

function prepareMessageForSend(
    text,
    type,
    fileData
) {

    if (
        replyingToMessage
    ) {

        return createMessageWithReply(
            text,
            type,
            fileData
        );

    }


    return createNewMessage(
        text,
        type,
        fileData
    );

}


// ======================================================
// 84. REPLY STATE CHECK
// ======================================================

function isReplying() {

    return (
        replyingToMessage !==
        null
    );

}


// ======================================================
// 85. GET REPLYING MESSAGE
// ======================================================

function getReplyingMessage() {

    return replyingToMessage;

}


// ======================================================
// SUPPORT CHAT SYSTEM
// STAGE 5 — EDIT MESSAGE
// ======================================================


// ======================================================
// 51. START EDIT MESSAGE
// ======================================================

function startEditMessage(
    messageId
) {

    if (
        !currentChat
    ) {

        return;

    }


    const message =
        currentChat.messages.find(
            function(item) {

                return item.id ===
                    messageId;

            }
        );


    if (!message) {

        return;

    }


    /*
     * Only sent messages can be edited.
     */

    if (
        !message.sent
    ) {

        return;

    }

     /*
     * Voice messages cannot be edited.
     */

    if (
        message.type === "voice"
    ) {

        return;

    }

 /*
 * Edit and reply cannot be active
 * at the same time.
 */

if (
    replyingToMessage
) {

    cancelReply();

}

    /*
     * Save the message currently
     * being edited.
     */

    editingMessage =
        message;


    /*
     * Find the message input.
     */

    const input =
        supportChatElement(
            "messageInput"
        );


    if (!input) {

        return;

    }


    /*
     * Put the original message
     * inside the input.
     */

    input.value =
        message.text ||
        "";


    /*
     * Change input state.
     */

    input.dataset.editing =
        "true";


    input.dataset.editingMessageId =
        message.id;


    /*
     * Show edit preview.
     */

    showEditPreview(
        message
    );


    /*
     * Focus the input.
     */

    setTimeout(
        function() {

            input.focus();


            /*
             * Put cursor at the end
             * of the message.
             */

            const length =
                input.value.length;


            if (
                typeof input.setSelectionRange ===
                "function"
            ) {

                input.setSelectionRange(
                    length,
                    length
                );

            }

        },
        50
    );


    /*
     * Close any open message
     * action menu.
     */

    /*
 * Close any open message
 * action menu.
 */

closeMessageActionMenu();


    /*
     * Close chat menu if open.
     */

    closeChatMenu();

}


// ======================================================
// 52. SHOW EDIT PREVIEW
// ======================================================

function showEditPreview(
    message
) {

    const preview =
        supportChatElement(
            "editPreview"
        );


    if (!preview) {

        return;

    }


    /*
     * Find the text element.
     */

    let textElement =
        supportChatElement(
            "editMessage"
        );


    if (!textElement) {

        textElement =
            preview.querySelector(
                ".edit-preview-text"
            );

    }


    if (!textElement) {

        textElement =
            preview.querySelector(
                ".edit-text"
            );

    }


    if (textElement) {

        textElement.textContent =
            message.text ||
            "";

    }


    /*
     * Show the preview.
     */

    preview.classList.remove(
        "hidden"
    );


    preview.hidden =
        false;


    preview.style.display =
        "";


}


// ======================================================
// 53. CANCEL EDIT MESSAGE
// ======================================================

function cancelEditMessage() {

    editingMessage =
        null;


    const input =
        supportChatElement(
            "messageInput"
        );


    if (input) {

        input.dataset.editing =
            "false";


        delete input.dataset
            .editingMessageId;

    }


    /*
     * Hide edit preview.
     */

    /*
 * Hide edit preview.
 */

const editPreview =
    supportChatElement(
        "editPreview"
    );


if (editPreview) {

    editPreview.classList.add(
        "hidden"
    );


    editPreview.hidden =
        true;


    editPreview.style.display =
        "none";

}


    /*
     * Clear input only when
     * we were editing.
     */

    if (input) {

        input.value =
            "";

    }


    /*
     * Restore normal input state.
     */

    updateMessageInputState();

}

// ======================================================
// CLOSE MESSAGE PREVIEWS WHEN OPENING OTHER CHAT UI
// (reply/edit previews should only stay open while the
// user is interacting with the chat footer itself —
// not when opening the chat menu, profile, or search)
// ======================================================

function closeMessagePreviewsOnUiOpen() {

    if (
        replyingToMessage
    ) {

        cancelReply();

    }

    if (
        editingMessage
    ) {

        cancelEditMessage();

    }

}


// ======================================================
// 54. SAVE EDITED MESSAGE
// ======================================================

function saveEditedMessage() {

    if (
        !editingMessage
    ) {

        return false;

    }


    const input =
        supportChatElement(
            "messageInput"
        );


    if (!input) {

        return false;

    }


    const newText =
        input.value.trim();


    /*
     * Do not allow an empty
     * edited message.
     */

    if (!newText) {

        return false;

    }


    /*
     * Do not save if nothing
     * actually changed.
     */

    if (
        newText ===
        editingMessage.text
    ) {

        cancelEditMessage();

        return false;

    }


    /*
     * Update the message.
     */

    editingMessage.text =
        newText;


    editingMessage.edited =
        true;


    /*
     * Update time.

     * The helper below uses the
     * current browser time.
     */

    editingMessage.time =
        getCurrentMessageTime();


    /*
     * Update the chat preview.
     */

    /*
 * Update the chat preview.
 */

updateLastMessagePreview(
    currentChat
);


    /*
     * Re-render messages.
     */

    renderMessages();

 if (
    currentChatType ===
    "individual"
) {

    renderIndividualChats();

}
else if (
    currentChatType ===
    "group"
) {

    renderGroups();

}


    /*
     * Clear edit state.
     */

    editingMessage =
        null;


    input.value =
        "";


    input.dataset.editing =
        "false";


    delete input.dataset
        .editingMessageId;


    /*
     * Hide edit preview.
     */

/*
 * Hide edit preview.
 */

const preview =
    supportChatElement(
        "editPreview"
    );


if (preview) {

    preview.classList.add(
        "hidden"
    );

    preview.hidden =
        true;

    preview.style.display =
        "none";

}


    /*
     * Restore normal input state.
     */

    updateMessageInputState();


    return true;

}




// ======================================================
// 56. UPDATE CHAT LAST MESSAGE
// ======================================================

// ======================================================
// UPDATE CHAT LAST MESSAGE
// ======================================================

function updateChatLastMessage(
    chat
) {

    if (
        !chat
    ) {

        return;

    }


    const messages =
        Array.isArray(
            chat.messages
        )
            ? chat.messages
            : [];


    /*
     * No messages.
     */

    if (
        messages.length === 0
    ) {

        chat.lastMessage =
            "";

        chat.lastMessageTime =
            "";


        return;

    }


    /*
     * Get the newest message.
     */

    const lastMessage =
        messages[
            messages.length - 1
        ];


    if (!lastMessage) {

        return;

    }


    /*
     * Update the preview text.
     */

    chat.lastMessage =
        lastMessage.text ||
        "";


    /*
     * Update the preview time.
     */

    chat.lastMessageTime =
        lastMessage.time ||
        "";

}


// ======================================================
// 57. UPDATE MESSAGE INPUT STATE
// ======================================================

function updateMessageInputState() {

    const input =
        supportChatElement(
            "messageInput"
        );


    if (!input) {

        return;

    }


    const isEditing =
        editingMessage !==
        null;


    input.dataset.editing =
        isEditing
            ? "true"
            : "false";


    /*
     * Update placeholder.
     */

    if (isEditing) {

        input.placeholder =
            "Edit message...";

    }
    else {

        input.placeholder =
            "Type a message...";

    }


    /*
     * Update edit/send button
     * when the HTML provides one.
     */

    const sendButton =
        supportChatElement(
            "sendMessageBtn"
        );


    if (
        sendButton
    ) {

        if (isEditing) {

            sendButton.title =
                "Save changes";

        }
        else {

            sendButton.title =
                "Send message";

        }

    }

}


// ======================================================
// 58. CHECK WHETHER INPUT IS EDITING
// ======================================================

function isEditingMessage() {

    return (
        editingMessage !==
        null
    );

}


// ======================================================
// STAGE 6 — MESSAGE ACTIONS
// ANDROID / Acode
// ======================================================


// ======================================================
// VARIABLES
// ======================================================

let messageLongPressTimer = null;

let activeMessageActionMenu = null;

let activeActionMessageId = null;


// ======================================================
// GET MESSAGE ELEMENT
// ======================================================

function getMessageElement(target) {

    if (!target) {
        return null;
    }

    if (
        target.classList &&
        target.classList.contains("message")
    ) {

        return target;

    }

    if (target.closest) {

        return target.closest(".message");

    }

    return null;
}


// ======================================================
// GET MESSAGE ID
// ======================================================

function getMessageId(messageElement) {

    if (!messageElement) {
        return null;
    }

    return (
        messageElement.dataset.messageId ||
        messageElement.getAttribute(
            "data-message-id"
        ) ||
        messageElement.id ||
        null
    );

}


// ======================================================
// CLOSE ACTION MENU
// ======================================================

function closeMessageActionMenu() {

    if (activeMessageActionMenu) {

        activeMessageActionMenu.remove();

        activeMessageActionMenu = null;

    }

    activeActionMessageId = null;

}


// ======================================================
// SHOW MESSAGE ACTION MENU
// ======================================================

function showMessageActionMenu(
    messageElement,
    messageId
) {

    closeMessageActionMenu();


    if (
        !messageElement ||
        !messageId
    ) {

        return;

    }


    activeActionMessageId =
        messageId;


    const targetMessage =
        currentChat &&
        Array.isArray(currentChat.messages)
            ? currentChat.messages.find(
                  function(item) {

                      return item.id === messageId;

                  }
              )
            : null;


    const canEditMessage =
        !targetMessage ||
        targetMessage.type !== "voice";


    const editButtonMarkup =
        canEditMessage
            ? '<button type="button" data-action="edit">' +
                  '<i class="fa-solid fa-pen"></i>' +
                  '<span>Edit</span>' +
              '</button>'
            : '';


    const menu =
        document.createElement(
            "div"
        );


    menu.className =
        "message-action-menu";


    menu.innerHTML =

        '<button type="button" data-action="reply">' +
            '<i class="fa-solid fa-reply"></i>' +
            '<span>Reply</span>' +
        '</button>' +

        editButtonMarkup +

        '<button type="button" data-action="copy">' +
            '<i class="fa-solid fa-copy"></i>' +
            '<span>Copy</span>' +
        '</button>' +

        '<button type="button" data-action="delete">' +
            '<i class="fa-solid fa-trash"></i>' +
            '<span>Delete</span>' +
        '</button>' +

        '<button type="button" data-action="close">' +
            '<i class="fa-solid fa-xmark"></i>' +
            '<span>Close</span>' +
        '</button>';


    document.body.appendChild(
        menu
    );


    activeMessageActionMenu =
        menu;


    // ==================================================
    // POSITION MENU
    // ==================================================

    const rect =
        messageElement.getBoundingClientRect();


    const menuRect =
        menu.getBoundingClientRect();


    let top =
        rect.top -
        menuRect.height -
        8;


    let left =
        rect.left;


    /*
     * If there is not enough room above
     * the message, show the menu below it.
     */

    if (
        top < 10
    ) {

        top =
            rect.bottom + 8;

    }


    /*
     * Keep menu inside right edge.
     */

    if (
        left +
        menuRect.width >
        window.innerWidth - 10
    ) {

        left =
            window.innerWidth -
            menuRect.width -
            10;

    }


    /*
     * Keep menu inside left edge.
     */

    if (
        left < 10
    ) {

        left =
            10;

    }


    /*
     * Keep menu inside bottom edge.
     */

    if (
        top +
        menuRect.height >
        window.innerHeight - 10
    ) {

        top =
            window.innerHeight -
            menuRect.height -
            10;

    }


    /*
     * Keep menu inside top edge.
     */

    if (
        top < 10
    ) {

        top =
            10;

    }


    menu.style.position =
        "fixed";


    menu.style.top =
        top + "px";


    menu.style.left =
        left + "px";


    menu.style.zIndex =
        "999999";


    // ==================================================
    // ACTION BUTTONS
    // ==================================================

    menu.addEventListener(
        "click",
        function(event) {

            const button =
                event.target.closest(
                    "button"
                );


            if (!button) {

                return;

            }


            const action =
                button.dataset.action;


            /*
             * Close button.
             */

            if (
                action ===
                "close"
            ) {

                closeMessageActionMenu();

                return;

            }


            /*
             * Close the menu before
             * performing the action.
             */

            closeMessageActionMenu();


            // ==========================================
            // REPLY
            // ==========================================

            if (
                action ===
                "reply"
            ) {

                replyToMessage(
                    messageId
                );

                return;

            }


            // ==========================================
            // EDIT
            // ==========================================

            if (
                action ===
                "edit"
            ) {

                startEditMessage(
                    messageId
                );

                return;

            }


            // ==========================================
            // COPY
            // ==========================================

            if (
                action ===
                "copy"
            ) {

                copyMessage(
                    messageId
                );

                return;

            }


            // ==========================================
            // DELETE
            // ==========================================

            if (
                action ===
                "delete"
            ) {

                deleteMessage(
                    messageId
                );

                return;

            }

        }
    );

}


// ======================================================
// COPY MESSAGE
// ======================================================

function copyMessage(
    messageId
) {

    if (
        !currentChat ||
        !Array.isArray(
            currentChat.messages
        )
    ) {

        return;

    }


    const message =
        currentChat.messages.find(
            function(item) {

                return (
                    item.id ===
                    messageId
                );

            }
        );


    if (!message) {

        return;

    }


    const text =
        String(
            message.text ||
            ""
        );


    if (!text) {

        return;

    }


    /*
     * Use the modern Clipboard API
     * when available.
     */

    if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText ===
        "function"
    ) {

        navigator.clipboard.writeText(
            text
        )
        .then(
            function() {

                console.log(
                    "Message copied."
                );

            }
        )
        .catch(
            function(error) {

                console.error(
                    "Copy failed:",
                    error
                );

                fallbackCopyMessage(
                    text
                );

            }
        );

    }
    else {

        fallbackCopyMessage(
            text
        );

    }

}


// ======================================================
// FALLBACK COPY MESSAGE
// ======================================================

function fallbackCopyMessage(
    text
) {

    const textarea =
        document.createElement(
            "textarea"
        );


    textarea.value =
        text;


    textarea.style.position =
        "fixed";


    textarea.style.left =
        "-9999px";


    textarea.style.top =
        "0";


    document.body.appendChild(
        textarea
    );


    textarea.focus();


    textarea.select();


    try {

        document.execCommand(
            "copy"
        );


        console.log(
            "Message copied."
        );

    }
    catch (error) {

        console.error(
            "Fallback copy failed:",
            error
        );

    }


    document.body.removeChild(
        textarea
    );

}


// ======================================================
// DELETE MESSAGE
// ======================================================

function deleteMessage(
    messageId
) {

    if (
        !currentChat ||
        !Array.isArray(
            currentChat.messages
        )
    ) {

        return;

    }


    const messageIndex =
        currentChat.messages.findIndex(
            function(item) {

                return (
                    item.id ===
                    messageId
                );

            }
        );


    if (
        messageIndex ===
        -1
    ) {

        return;

    }


    deleteActionType =
        "message";

    deleteActionId =
        messageId;


    const titleElement =
        supportChatElement(
            "deleteConfirmTitle"
        );

    const textElement =
        supportChatElement(
            "deleteConfirmText"
        );

    const confirmBtn =
        supportChatElement(
            "confirmDeleteBtn"
        );


    if (titleElement) {

        titleElement.textContent =
            "Delete Message?";

    }


    if (textElement) {

        textElement.textContent =
            "This will permanently delete this message. This action cannot be undone.";

    }


    if (confirmBtn) {

        confirmBtn.textContent =
            "Delete";

    }


    const modal =
        supportChatElement(
            "deleteConfirmModal"
        );


    if (modal) {

        modal.classList.remove(
            "hidden"
        );

    }

}



// ======================================================
// SETUP MESSAGE ACTIONS
// ======================================================

function setupMessageActionEvents() {

    const messagesContainer =
        document.getElementById(
            "messages"
        );


    if (!messagesContainer) {

        console.warn(
            "Stage 6: #messages not found."
        );

        return;

    }


    // Prevent duplicate listeners.

    if (
        messagesContainer.dataset
            .stage6Ready === "true"
    ) {

        return;

    }


    messagesContainer.dataset
        .stage6Ready = "true";


    // ==========================================
    // CLOSE ACTION MENU ON OUTSIDE CLICK
    // (the menu is appended straight to
    // document.body, so any click that doesn't
    // land inside it should close it)
    // ==========================================

    document.addEventListener(
        "click",
        function(event) {

            if (!activeMessageActionMenu) {

                return;

            }


            const isInsideMenu =
                event.target.closest(
                    ".message-action-menu"
                );


            if (isInsideMenu) {

                return;

            }


            closeMessageActionMenu();

        },
        true
    );


  
    // ==========================================
    // TOUCH START
    // ==========================================

    messagesContainer.addEventListener(
        "touchstart",
        function(event) {

            const messageElement =
                getMessageElement(
                    event.target
                );


            if (!messageElement) {
                return;
            }


            const messageId =
                getMessageId(
                    messageElement
                );


            if (!messageId) {

                console.warn(
                    "Stage 6: message has no ID."
                );

                return;

            }


            messageLongPressTimer =
                setTimeout(
                    function() {

                        showMessageActionMenu(
                            messageElement,
                            messageId
                        );

                    },
                    600
                );

        },
        {
            passive: true
        }
    );


    // ==========================================
    // TOUCH END
    // ==========================================

    messagesContainer.addEventListener(
        "touchend",
        function() {

            clearTimeout(
                messageLongPressTimer
            );

            messageLongPressTimer =
                null;

        },
        {
            passive: true
        }
    );


    // ==========================================
    // TOUCH CANCEL
    // ==========================================

    messagesContainer.addEventListener(
        "touchcancel",
        function() {

            clearTimeout(
                messageLongPressTimer
            );

            messageLongPressTimer =
                null;

        },
        {
            passive: true
        }
    );


    // ==========================================
    // TOUCH MOVE
    // ==========================================

    messagesContainer.addEventListener(
        "touchmove",
        function() {

            clearTimeout(
                messageLongPressTimer
            );

            messageLongPressTimer =
                null;

        },
        {
            passive: true
        }
    );


    console.log(
        "Stage 6 message actions ready."
    );

}




// ======================================================
// INITIALIZE STAGE 6
// ======================================================

function initStage6MessageActions() {

    setupMessageActionEvents();

}

// ======================================================
// STAGE 8 — Chat actions
// 
// ======================================================

// =========================================================
// part 1:: MESSAGE SEARCH
// =========================================================




// =========================================================
// OPEN MESSAGE SEARCH
// =========================================================

function searchMessages() {

    const searchBar =
        document.getElementById(
            "messageSearchBar"
        );

    const searchInput =
        document.getElementById(
            "messageSearchInput"
        );

    if (!searchBar || !searchInput) {

        return;

    }


    /*
     * Close the chat menu if it is open.
     */

    closeChatMenu();

    closeMessagePreviewsOnUiOpen();

    /*
     * Open search bar.
     */

    searchBar.classList.remove(
        "hidden"
    );


    /*
     * Clear previous search.
     */

    searchInput.value = "";

    messageSearchResults = [];

    currentMessageSearchIndex = -1;


    /*
     * Focus search input.
     */

    setTimeout(
        function() {

            searchInput.focus();

        },
        50
    );

}


// =========================================================
// CLOSE MESSAGE SEARCH
// =========================================================

function closeMessageSearch() {

    const searchBar =
        document.getElementById(
            "messageSearchBar"
        );

    const searchInput =
        document.getElementById(
            "messageSearchInput"
        );


    if (searchBar) {

        searchBar.classList.add(
            "hidden"
        );

    }


    if (searchInput) {

        searchInput.value = "";

    }


    /*
     * Reset search state.
     */

    messageSearchResults = [];

    currentMessageSearchIndex = -1;


    /*
     * Render normal messages again.
     */

    renderMessages();

}


// =========================================================
// PERFORM MESSAGE SEARCH
// =========================================================

function performMessageSearch(
    searchTerm
) {

    messageSearchResults = [];

    currentMessageSearchIndex = -1;


    if (
        !currentChat ||
        !Array.isArray(
            currentChat.messages
        )
    ) {

        return;

    }


    const term =
        String(
            searchTerm || ""
        )
        .trim()
        .toLowerCase();


    /*
     * Empty search.
     */

    if (!term) {

        renderMessages();

        return;

    }


    /*
     * Find matching messages.
     */

    currentChat.messages.forEach(
        function(message) {

            const text =
                String(
                    message.text || ""
                );


            if (
                text
                .toLowerCase()
                .includes(term)
            ) {

                messageSearchResults.push(
                    message.id
                );

            }

        }
    );


    /*
     * No results.
     */

    if (
        messageSearchResults.length ===
        0
    ) {

        renderMessages();

        return;

    }


    /*
     * Start at the first result.
     */

    currentMessageSearchIndex = 0;


    /*
     * Render messages with
     * search highlighting.
     */

    renderMessagesWithSearch(
        term
    );


    /*
     * Scroll to first result.
     */

    scrollToMessageSearchResult();

}


// =========================================================
// RENDER MESSAGES WITH SEARCH
// =========================================================

function renderMessagesWithSearch(
    searchTerm
) {

    const container =
        supportChatElement(
            "messages"
        );


    if (
        !container ||
        !currentChat
    ) {

        return;

    }


    container.innerHTML =
        "";


    const messages =
        currentChat.messages ||
        [];


    messages.forEach(
        function(message) {

            const element =
                createMessageElement(
                    message
                );


            /*
             * Check whether this message
             * is a search result.
             */

            const isResult =
                messageSearchResults.includes(
                    message.id
                );


            if (isResult) {

                element.classList.add(
                    "message-search-result"
                );


                /*
                 * Highlight matching text.
                 */

                const textElement =
                    element.querySelector(
                        ".message-text"
                    );


                if (textElement) {

                    highlightMessageText(
                        textElement,
                        searchTerm
                    );

                }


                /*
                 * Mark the currently
                 * selected result.
                 */

                if (
                    messageSearchResults[
                        currentMessageSearchIndex
                    ] === message.id
                ) {

                    element.classList.add(
                        "message-search-current"
                    );

                }

            }


            container.appendChild(
                element
            );

        }
    );

}


// =========================================================
// HIGHLIGHT SEARCH TEXT
// =========================================================

function highlightMessageText(
    element,
    searchTerm
) {

    if (
        !element ||
        !searchTerm
    ) {

        return;

    }


    const text =
        element.textContent;


    const escapedTerm =
        searchTerm.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );


    const regex =
        new RegExp(
            "(" +
            escapedTerm +
            ")",
            "gi"
        );


    /*
     * Replace the text with
     * highlighted HTML.
     */

    element.innerHTML =
        text.replace(
            regex,
            "<mark>$1</mark>"
        );

}


// =========================================================
// SCROLL TO CURRENT SEARCH RESULT
// =========================================================

function scrollToMessageSearchResult() {

    if (
        currentMessageSearchIndex <
        0
    ) {

        return;

    }


    const messageId =
        messageSearchResults[
            currentMessageSearchIndex
        ];


    if (
        messageId === undefined
    ) {

        return;

    }


    const container =
        supportChatElement(
            "messages"
        );


    if (!container) {

        return;

    }


    const element =
        container.querySelector(
            '[data-message-id="' +
            messageId +
            '"]'
        );


    if (!element) {

        return;

    }


    element.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


// =========================================================
// NEXT SEARCH RESULT
// =========================================================

function nextMessageSearchResult() {

    if (
        messageSearchResults.length ===
        0
    ) {

        return;

    }


    currentMessageSearchIndex++;


    if (
        currentMessageSearchIndex >=
        messageSearchResults.length
    ) {

        currentMessageSearchIndex = 0;

    }


    const searchInput =
        document.getElementById(
            "messageSearchInput"
        );


    const term =
        searchInput
            ? searchInput.value.trim()
            : "";


    renderMessagesWithSearch(
        term
    );


    scrollToMessageSearchResult();

}


// =========================================================
// PREVIOUS SEARCH RESULT
// =========================================================

function previousMessageSearchResult() {

    if (
        messageSearchResults.length ===
        0
    ) {

        return;

    }


    currentMessageSearchIndex--;


    if (
        currentMessageSearchIndex <
        0
    ) {

        currentMessageSearchIndex =
            messageSearchResults.length - 1;

    }


    const searchInput =
        document.getElementById(
            "messageSearchInput"
        );


    const term =
        searchInput
            ? searchInput.value.trim()
            : "";


    renderMessagesWithSearch(
        term
    );


    scrollToMessageSearchResult();

}

// =========================================================
// MESSAGE SEARCH INPUT EVENTS
// =========================================================

function setupMessageSearchEvents() {

    const searchInput =
        document.getElementById(
            "messageSearchInput"
        );


    if (!searchInput) {

        return;

    }


    /*
     * Prevent duplicate listeners.
     */

    if (
        searchInput.dataset.searchReady ===
        "true"
    ) {

        return;

    }


    searchInput.dataset.searchReady =
        "true";


    searchInput.addEventListener(
        "input",
        function() {

            performMessageSearch(
                this.value
            );

        }
    );


    /*
     * Enter = next result.
     */

    searchInput.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                nextMessageSearchResult();

            }

        }
    );


    /*
     * Escape = close search.

     */

    searchInput.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key ===
                "Escape"
            ) {

                closeMessageSearch();

            }

        }
    );

}


// ======================================================
// INITIALIZE MESSAGE SEARCH
// ======================================================

function initializeMessageSearch() {

    setupMessageSearchEvents();

}

// =========================================================
// part 2::  TOGGLE CHAT MUTE
// =========================================================

function toggleChatMute() {

    /*
     * Make sure a chat is currently open.
     */

    if (!currentChat) {

        return;

    }


    /*
     * Toggle mute state.
     */

    currentChat.muted =
        !currentChat.muted;


    /*
     * Close the chat menu.
     */

    closeChatMenu();


    /*
     * Update the chat list.
     */

    if (
        currentChatType ===
        "individual"
    ) {

        renderIndividualChats();

    }
    else {

        renderGroups();

    }


    /*
     * Update the menu text/icon.
     */

    updateChatMuteMenu();


}

// =========================================================
// UPDATE CHAT MUTE MENU
// =========================================================

function updateChatMuteMenu() {

    const icon =
        document.getElementById(
            "chatMuteIcon"
        );

    const text =
        document.getElementById(
            "chatMuteText"
        );


    if (
        !icon ||
        !text ||
        !currentChat
    ) {

        return;

    }


    if (
        currentChat.muted
    ) {

        icon.className =
            "fa-solid fa-bell";

        text.textContent =
            "Unmute Notifications";

    }
    else {

        icon.className =
            "fa-solid fa-bell-slash";

        text.textContent =
            "Mute Notifications";

    }

}

// ======================================================
// TYPING INDICATOR
// ======================================================

let typingIndicatorTimeout = null;
let typingIndicatorChatId = null;


function showTypingIndicator(chatId, userName) {

    const typingElement =
        supportChatElement("typing");

    const typingTextElement =
        supportChatElement("typingText");

    if (!typingElement) {

        return;

    }

    if (typingTextElement) {

        typingTextElement.textContent =
            (userName || "User") + " is typing...";

    }

    typingIndicatorChatId = chatId;

    typingElement.classList.remove("hidden");

    scrollMessagesToBottom();

}


function hideTypingIndicator() {

    const typingElement =
        supportChatElement("typing");

    if (typingElement) {

        typingElement.classList.add("hidden");

    }

    typingIndicatorChatId = null;

    if (typingIndicatorTimeout) {

        clearTimeout(typingIndicatorTimeout);

        typingIndicatorTimeout = null;

    }

}


function simulateTypingReply(chatId, userName) {

    if (typingIndicatorTimeout) {

        clearTimeout(typingIndicatorTimeout);

    }

    const delay =
        1200 + Math.floor(Math.random() * 1500);

    typingIndicatorTimeout =
        setTimeout(
            function() {

                if (
                    currentChat &&
                    currentChat.id === chatId &&
                    currentChatType === "individual"
                ) {

                    showTypingIndicator(chatId, userName);

                    typingIndicatorTimeout =
                        setTimeout(
                            function() {

                                hideTypingIndicator();

                            },
                            2000 + Math.floor(Math.random() * 1500)
                        );

                }

            },
            delay
        );

}



// =========================================================
// part 3::  PIN MESSAGES
// =========================================================

// =========================================================
// Open PIN MESSAGES
// =========================================================

function openPinMessages() {

    /*
     * Make sure a chat is currently open.
     */

    if (!currentChat) {

        return;

    }


    /*
     * Close the chat menu.
     */

    closeChatMenu();


    /*
     * Get the modal.
     */

    const modal =
        document.getElementById(
            "pinMessagesModal"
        );


    if (!modal) {

        console.error(
            "pinMessagesModal element not found"
        );

        return;

    }


    /*
     * Open the modal.
     */

    modal.classList.remove(
        "hidden"
    );

}


// =========================================================
// CLOSE PIN MESSAGES
// =========================================================

function closePinMessages() {

    const modal =
        document.getElementById(
            "pinMessagesModal"
        );


    if (!modal) {

        return;

    }


    modal.classList.add(
        "hidden"
    );

}

// =========================================================
// WRITE PIN MESSAGE
// =========================================================

// =========================================================
// OPEN WRITE PIN MESSAGE
// =========================================================

function openWritePinMessage() {

    /*
     * Make sure a chat is open.
     */

    if (!currentChat) {

        return;

    }


    /*
     * Close the options modal.
     */

    closePinMessages();


    /*
     * Get the write modal.
     */

    const modal =
        document.getElementById(
            "writePinMessageModal"
        );


    const input =
        document.getElementById(
            "pinMessageInput"
        );


    if (!modal || !input) {

        console.error(
            "Write pin message elements not found"
        );

        return;

    }


    /*
     * Clear previous message.
     */

    input.value = "";


    /*
     * Reset character count.
     */

    updatePinMessageCharacterCount();


    /*
     * Open modal.
     */

    modal.classList.remove(
        "hidden"
    );


    /*
     * Focus input.
     */

    setTimeout(
        function() {

            input.focus();

        },
        50
    );

}

// =========================================================
// CLOSE WRITE PIN MESSAGE
// =========================================================

function closeWritePinMessage() {

    const modal =
        document.getElementById(
            "writePinMessageModal"
        );


    if (!modal) {

        return;

    }


    modal.classList.add(
        "hidden"
    );


    const input =
        document.getElementById(
            "pinMessageInput"
        );


    if (input) {

        input.value = "";

    }


    updatePinMessageCharacterCount();

}

// =========================================================
// UPDATE PIN MESSAGE CHARACTER COUNT
// =========================================================

function updatePinMessageCharacterCount() {

    const input =
        document.getElementById(
            "pinMessageInput"
        );


    const counter =
        document.getElementById(
            "pinMessageCharacterCount"
        );


    if (!input || !counter) {

        return;

    }


    counter.textContent =
        input.value.length;

}

// =========================================================
// SETUP PIN MESSAGE INPUT
// =========================================================

function setupPinMessageInput() {

    const input =
        document.getElementById(
            "pinMessageInput"
        );


    if (!input) {

        return;

    }


    /*
     * Prevent duplicate listener.
     */

    if (
        input.dataset.pinInputReady ===
        "true"
    ) {

        return;

    }


    input.dataset.pinInputReady =
        "true";


    input.addEventListener(
        "input",
        function() {

            updatePinMessageCharacterCount();

        }
    );

}

// =========================================================
// CREATE PINNED MESSAGE
// =========================================================

function createPinnedMessage() {

    /*
     * Make sure a chat is open.
     */

    if (!currentChat) {

        return;

    }


    /*
     * Get input.
     */

    const input =
        document.getElementById(
            "pinMessageInput"
        );


    if (!input) {

        return;

    }


    /*
     * Get message text.
     */

    const text =
        input.value.trim();


    /*
     * Do not allow empty messages.
     */

    if (!text) {

        input.focus();

        return;

    }


    /*
     * Make sure messages exists.
     */

    if (
        !Array.isArray(
            currentChat.messages
        )
    ) {

        currentChat.messages = [];

    }


    /*
     * Make sure pinned messages
     * exists for this chat.
     */

    if (
        !Array.isArray(
            currentChat.pinnedMessages
        )
    ) {

        currentChat.pinnedMessages = [];

    }


    /*
     * Create a new message.
     */

    const message = {

        id:
            "MSG-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 8),

        text:
            text,

        sent:
            true,

        read:
            true,

        edited:
            false,

        time:
            getCurrentMessageTime(),

        senderName:
            "Admin",

        pinned:
            true

    };


    /*
     * Add message to chat.
     */

    currentChat.messages.push(
        message
    );


    /*
     * Add message to pinned messages.
     */

    currentChat.pinnedMessages.push(
        message.id
    );


    /*
     * Close modal.
     */

    closeWritePinMessage();


    /*
     * Update chat preview.
     */

    updateChatLastMessage(
        currentChat
    );


    /*
     * Render messages.
     */

    renderMessages();


    /*
     * Update chat list.
     */

    if (
        currentChatType ===
        "individual"
    ) {

        renderIndividualChats();

    }
    else {

        renderGroups();

    }


    /*
     * Scroll to the new message.
     */

    scrollMessagesToBottom();

}



// =========================================================
// SELECT EXISTING PINNED MESSAGES
// =========================================================

// =========================================================
// START SELECT PINNED MESSAGES
// =========================================================

function startSelectPinnedMessages() {

    /*
     * Make sure a chat is open.
     */

    if (!currentChat) {

        return;

    }


    /*
     * Close the Pin Messages options.
     */

    closePinMessages();


    /*
     * Start selection mode.
     */

    pinMessageSelectionMode = true;


    /*
     * Clear previous selections.
     */

    selectedPinMessageIds = [];


    /*
     * Render messages in selection mode.
     */

    renderMessages();

}

// =========================================================
// CANCEL PIN MESSAGE SELECTION
// =========================================================

function cancelPinMessageSelection() {

    pinMessageSelectionMode = false;

    selectedPinMessageIds = [];

    updatePinMessageSelectionBar();


    renderMessages();

}

// ======================================================
// CANCEL PIN MESSAGE SELECTION ON OUTSIDE CLICK
// ======================================================

function setupPinSelectionOutsideClick() {

    document.addEventListener(
        "click",
        function(event) {

            if (!pinMessageSelectionMode) {

                return;

            }


            const isInsideSelectionUI =
                event.target.closest(
                    "#pinMessageSelectionBar, .message"
                );


            if (isInsideSelectionUI) {

                return;

            }


            cancelPinMessageSelection();

        },
        true
    );

}

// =========================================================
// TOGGLE PIN MESSAGE SELECTION
// =========================================================

function togglePinMessageSelection(
    messageId
) {

    if (
        !pinMessageSelectionMode
    ) {

        return;

    }


    const index =
        selectedPinMessageIds.indexOf(
            messageId
        );


    /*
     * Already selected.
     * Remove it.
     */

    if (
        index !== -1
    ) {

        selectedPinMessageIds.splice(
            index,
            1
        );

    }

    /*
     * Not selected.
     * Add it.
     */

    else {

        selectedPinMessageIds.push(
            messageId
        );

    }


    /*
     * Re-render the messages
     * to update the selection UI.
     */

    renderMessages();

}

// =========================================================
// UPDATE PIN MESSAGE SELECTION BAR
// =========================================================

function updatePinMessageSelectionBar() {

    const bar =
        document.getElementById(
            "pinMessageSelectionBar"
        );


    const count =
        document.getElementById(
            "selectedPinMessageCount"
        );


    if (!bar || !count) {

        return;

    }


    /*
     * Not in selection mode.
     */

    if (
        !pinMessageSelectionMode
    ) {

        bar.classList.add(
            "hidden"
        );

        return;

    }


    /*
     * Show selection bar.
     */

    bar.classList.remove(
        "hidden"
    );


    count.textContent =
        selectedPinMessageIds.length;

}

// =========================================================
// PIN SELECTED MESSAGES
// =========================================================

function pinSelectedMessages() {

    if (
        !currentChat
    ) {

        return;

    }


    /*
     * Nothing selected.
     */

    if (
        selectedPinMessageIds.length ===
        0
    ) {

        return;

    }


    /*
     * Make sure pinnedMessages exists.
     */

    if (
        !Array.isArray(
            currentChat.pinnedMessages
        )
    ) {

        currentChat.pinnedMessages = [];

    }


    /*
     * Add each selected message.
     */

    selectedPinMessageIds.forEach(
        function(messageId) {

            /*
             * Don't add the same message twice.
             */

            if (
                !currentChat.pinnedMessages.includes(
                    messageId
                )
            ) {

                currentChat.pinnedMessages.push(
                    messageId
                );

            }


            /*
             * Find the actual message.
             */

            const message =
                currentChat.messages.find(
                    function(item) {

                        return (
                            item.id ===
                            messageId
                        );

                    }
                );


            /*
             * Mark it as pinned.
             */

            if (message) {

                message.pinned = true;

            }

        }
    );


    /*
     * Exit selection mode.
     */

    pinMessageSelectionMode =
        false;


    selectedPinMessageIds = [];


    /*
     * Render normal messages.
     */

    renderMessages();

}

// =========================================================
// GET CURRENT CHAT PINNED MESSAGES
// =========================================================

function getPinnedMessages() {

    if (
        !currentChat ||
        !Array.isArray(
            currentChat.pinnedMessages
        ) ||
        !Array.isArray(
            currentChat.messages
        )
    ) {

        return [];

    }


    return currentChat.pinnedMessages
        .map(
            function(messageId) {

                return currentChat.messages.find(
                    function(message) {

                        return (
                            message.id ===
                            messageId
                        );

                    }
                );

            }
        )
        .filter(
            function(message) {

                return !!message;

            }
        );

}

// =========================================================
// UPDATE PINNED MESSAGE BAR
// =========================================================

function updatePinnedMessageBar() {

    const bar =
        document.getElementById(
            "pinnedMessageBar"
        );


    console.log(
        "PIN BAR 1: bar =",
        bar
    );


    const textElement =
        document.getElementById(
            "pinnedMessageText"
        );


    console.log(
        "PIN BAR 2: textElement =",
        textElement
    );


    const counter =
        document.getElementById(
            "pinnedMessageCounter"
        );


    console.log(
    "PIN BAR 3: counter =",
    counter
);


console.log(
    "PIN BAR CHECK: pinnedMessageBar exists =",
    !!bar
);


console.log(
    "PIN BAR CHECK: pinnedMessageText exists =",
    !!textElement
);


console.log(
    "PIN BAR CHECK: pinnedMessageCounter exists =",
    !!counter
);


    if (
        !bar ||
        !textElement ||
        !counter
    ) {

        console.log(
            "PIN BAR ERROR: Missing pinned message bar element"
        );

        return;

    }


    console.log(
        "PIN BAR 3A: About to call getPinnedMessages()"
    );


    const pinnedMessages =
        getPinnedMessages();


    console.log(
        "PIN BAR 3B: getPinnedMessages() returned"
    );


    console.log(
        "PIN BAR 3C: pinnedMessages =",
        pinnedMessages
    );

console.log(
    "PIN BAR 3D: pinnedMessages.length =",
    pinnedMessages.length
);
    /*
     * No pinned messages.
     */

    if (
        pinnedMessages.length ===
        0
    ) {

        bar.classList.add(
            "hidden"
        );

        currentPinnedMessageIndex =
            0;

        return;

    }


    /*
     * Make sure the index
     * is valid.
     */

    if (
        currentPinnedMessageIndex >=
        pinnedMessages.length
    ) {

        currentPinnedMessageIndex =
            pinnedMessages.length - 1;

    }


    if (
        currentPinnedMessageIndex < 0
    ) {

        currentPinnedMessageIndex =
            0;

    }


    const message =
        pinnedMessages[
            currentPinnedMessageIndex
        ];


    /*
     * Display message.
     */

    textElement.textContent =
        message.text ||
        "";


    /*
     * Display counter.
     */

    counter.textContent =
        (
            currentPinnedMessageIndex +
            1
        ) +
        " of " +
        pinnedMessages.length;


    /*
     * Show bar.
     */

    bar.classList.remove(
        "hidden"
    );

	  // =====================================================
// CREATE PINNED MESSAGE MENU BUTTON
// =====================================================

let menuButton =
    document.getElementById(
        "pinnedMessageMenu"
    );


if (!menuButton) {

    menuButton =
        document.createElement(
            "button"
        );


    menuButton.type =
        "button";


    menuButton.id =
        "pinnedMessageMenu";


    menuButton.className =
        "pinned-message-menu";


    menuButton.innerHTML =
        '<i class="fa-solid fa-ellipsis-vertical"></i>';


    menuButton.addEventListener(
        "click",
        function(event) {

            openPinnedMessageMenu(
                event
            );

        }
    );


    bar.appendChild(
        menuButton
    );

}

    /*
     * Update navigation buttons.
     */

    updatePinnedMessageNavigation(
        pinnedMessages.length
    );

}

// =========================================================
// UPDATE PINNED MESSAGE NAVIGATION
// =========================================================

function updatePinnedMessageNavigation(
    total
) {

    const previousButton =
        document.getElementById(
            "previousPinnedMessage"
        );


    const nextButton =
        document.getElementById(
            "nextPinnedMessage"
        );


    if (
        !previousButton ||
        !nextButton
    ) {

        return;

    }


    /*
     * Hide navigation when
     * there is only one message.
     */

    if (
        total <= 1
    ) {

        previousButton.style.display =
            "none";

        nextButton.style.display =
            "none";

        return;

    }


    previousButton.style.display =
        "flex";

    nextButton.style.display =
        "flex";

}

// =========================================================
// NEXT PINNED MESSAGE
// =========================================================

function nextPinnedMessage() {

    const pinnedMessages =
        getPinnedMessages();


    if (
        pinnedMessages.length <= 1
    ) {

        return;

    }


    currentPinnedMessageIndex++;


    if (
        currentPinnedMessageIndex >=
        pinnedMessages.length
    ) {

        currentPinnedMessageIndex =
            0;

    }


    updatePinnedMessageBar();

}

// =========================================================
// PREVIOUS PINNED MESSAGE
// =========================================================

function previousPinnedMessage() {

    const pinnedMessages =
        getPinnedMessages();


    if (
        pinnedMessages.length <= 1
    ) {

        return;

    }


    currentPinnedMessageIndex--;


    if (
        currentPinnedMessageIndex <
        0
    ) {

        currentPinnedMessageIndex =
            pinnedMessages.length - 1;

    }


    updatePinnedMessageBar();

}

// =========================================================
// VIEW PINNED MESSAGE
// =========================================================



// =========================================================
// OPEN PINNED MESSAGE MENU
// =========================================================

// =========================================================
// OPEN PINNED MESSAGE MENU
// =========================================================

function openPinnedMessageMenu(
    event
) {

    if (event) {

        event.stopPropagation();

    }


    /*
     * Make sure a chat is open.
     */

    if (!currentChat) {

        return;

    }


    /*
     * Get pinned messages.
     */

    const pinnedMessages =
        getPinnedMessages();


    if (
        pinnedMessages.length ===
        0
    ) {

        return;

    }


    /*
     * Remove any existing menu.
     */

    const existingMenu =
        document.getElementById(
            "pinnedMessageActionMenu"
        );


    if (existingMenu) {

        existingMenu.remove();

        return;

    }


    /*
     * Create the menu.
     */

    const menu =
        document.createElement(
            "div"
        );


    menu.id =
        "pinnedMessageActionMenu";


    menu.className =
        "pinned-message-action-menu";


    /*
     * Create Unpin button.
     */

    const unpinButton =
        document.createElement(
            "button"
        );


    unpinButton.type =
        "button";


    unpinButton.innerHTML =
        '<i class="fa-solid fa-thumbtack"></i>' +
        '<span>Unpin message</span>';


    /*
     * Unpin action.
     */

    unpinButton.addEventListener(
        "click",
        function(event) {

            event.stopPropagation();


            /*
             * Remove the menu.
             */

            menu.remove();


            /*
             * Unpin the current
             * pinned message.
             */

            unpinCurrentPinnedMessage();

        }
    );


    /*
     * Add button to menu.
     */

    menu.appendChild(
        unpinButton
    );


    /*
     * Add menu to page.
     */

    document.body.appendChild(
        menu
    );


    /*
     * Position menu near
     * the three-dot button.
     */

    if (event && event.currentTarget) {

        const button =
            event.currentTarget;


        const rect =
            button.getBoundingClientRect();


        menu.style.position =
            "fixed";


        menu.style.top =
            (
                rect.bottom +
                5
            ) +
            "px";


        menu.style.right =
            (
                window.innerWidth -
                rect.right
            ) +
            "px";

    }


    /*
     * Close menu when clicking
     * somewhere else.
     */

    setTimeout(
        function() {

            document.addEventListener(
                "click",
                closePinnedMessageActionMenu,
                {
                    once: true
                }
            );

        },
        0
    );

}


// =========================================================
// CLOSE PINNED MESSAGE ACTION MENU
// =========================================================

function closePinnedMessageActionMenu() {

    const menu =
        document.getElementById(
            "pinnedMessageActionMenu"
        );


    if (menu) {

        menu.remove();

    }

}


// =========================================================
// SCROLL TO CURRENT PINNED MESSAGE
// =========================================================

// =========================================================
// SCROLL TO CURRENT PINNED MESSAGE
// =========================================================

function scrollToCurrentPinnedMessage() {

    if (!currentChat) {

        return;

    }


    const pinnedMessages =
        getPinnedMessages();


    if (
        pinnedMessages.length === 0
    ) {

        return;

    }


    /*
     * Make sure the current index
     * is valid.
     */

    if (
        currentPinnedMessageIndex < 0
    ) {

        currentPinnedMessageIndex = 0;

    }


    if (
        currentPinnedMessageIndex >=
        pinnedMessages.length
    ) {

        currentPinnedMessageIndex =
            pinnedMessages.length - 1;

    }


    /*
     * Get the current pinned message.
     */

    const message =
        pinnedMessages[
            currentPinnedMessageIndex
        ];


    if (!message) {

        return;

    }


    /*
     * Get messages container.
     */

    const messagesContainer =
        supportChatElement(
            "messages"
        );


    if (!messagesContainer) {

        return;

    }


    /*
     * Find the actual message
     * element.
     */

    const messageElement =
        messagesContainer.querySelector(
            '[data-message-id="' +
            message.id +
            '"]'
        );


    if (!messageElement) {

        return;

    }


    /*
     * Remove previous pinned
     * highlight if one exists.
     */

    const oldHighlight =
        messagesContainer.querySelector(
            ".pinned-message-highlight"
        );


    if (oldHighlight) {

        oldHighlight.classList.remove(
            "pinned-message-highlight"
        );

    }


    /*
     * Scroll to the pinned message.
     */

    messageElement.scrollIntoView({

        behavior:
            "smooth",

        block:
            "center"

    });


    /*
     * Highlight the message.
     */

    messageElement.classList.add(
        "pinned-message-highlight"
    );


    /*
     * Remove highlight after
     * 1.5 seconds.
     */

    setTimeout(
        function() {

            messageElement.classList.remove(
                "pinned-message-highlight"
            );

        },
        3500
    );

}

// =========================================================
// UNPIN CURRENT PINNED MESSAGE
// =========================================================

function unpinCurrentPinnedMessage() {

    if (
        !currentChat
    ) {

        return;

    }


    if (
        !Array.isArray(
            currentChat.pinnedMessages
        )
    ) {

        return;

    }


    const pinnedMessages =
        getPinnedMessages();


    if (
        pinnedMessages.length ===
        0
    ) {

        return;

    }


    const message =
        pinnedMessages[
            currentPinnedMessageIndex
        ];


    if (!message) {

        return;

    }


    /*
     * Remove the ID from
     * pinnedMessages.
     */

    currentChat.pinnedMessages =
        currentChat.pinnedMessages.filter(
            function(messageId) {

                return (
                    messageId !==
                    message.id
                );

            }
        );


    /*
     * Mark the message
     * as no longer pinned.
     */

    message.pinned =
        false;


    /*
     * Correct the index.
     */

    const remaining =
        currentChat.pinnedMessages.length;


    if (
        currentPinnedMessageIndex >=
        remaining
    ) {

        currentPinnedMessageIndex =
            Math.max(
                remaining - 1,
                0
            );

    }

	  /*
 * Re-render messages.
 */

renderMessages();


/*
 * Update pinned message bar.
 */

updatePinnedMessageBar();


}


// =========================================================
// Part 4:: MARK CURRENT CHAT AS UNREAD
// =========================================================

function markChatUnread() {

    /*
     * Make sure a chat is currently open.
     */

    if (!currentChat) {

        return;

    }


    /*
     * Mark the chat as unread.
     */

    currentChat.unread = 1;


    /*
     * Make sure the chat has messages.
     */

    if (
        Array.isArray(
            currentChat.messages
        ) &&
        currentChat.messages.length > 0
    ) {

        /*
         * Find the latest message.
         */

        const lastMessage =
            currentChat.messages[
                currentChat.messages.length - 1
            ];


        /*
         * Mark the latest message
         * as unread.
         */

        if (lastMessage) {

            lastMessage.read =
                false;

        }

    }


    /*
     * Update the chat list.
     */

    if (
        currentChatType ===
        "individual"
    ) {

        renderIndividualChats();

    }
    else if (
        currentChatType ===
        "group"
    ) {

        renderGroups();

    }


    /*
     * Update global unread counts.
     */

    updateUnreadCounts();


    /*
     * Close the chat menu.
     */

    closeChatMenu();

}


// =========================================================
// Part 6:: CLEAR MESSAGES
// =========================================================

// =========================================================
// CLEAR CURRENT CHAT MESSAGES
// =========================================================

function clearChatMessages() {

    /*
     * Make sure a chat is currently open.
     */

    if (!currentChat) {

        return;

    }


    /*
     * Close the chat menu.
     */

    closeChatMenu();


    /*
     * Open the clear messages
     * confirmation dialog.
     */

    openClearMessagesConfirmation();

}

// =========================================================
// OPEN CLEAR MESSAGES CONFIRMATION
// =========================================================

function openClearMessagesConfirmation() {

    /*
     * Make sure a chat is open.
     */

    if (!currentChat) {

        return;

    }


    /*
     * Create the confirmation
     * container.
     */

    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "clearMessagesConfirmation";


    overlay.className =
        "clear-messages-confirmation";


    /*
     * Create the dialog.
     */

    overlay.innerHTML =

        '<div class="clear-messages-dialog">' +

            '<div class="clear-messages-dialog-icon">' +
                '<i class="fa-solid fa-trash"></i>' +
            '</div>' +

            '<h3>Clear messages?</h3>' +

            '<p>' +
                'All messages in this chat will be removed.' +
            '</p>' +

            '<div class="clear-messages-dialog-actions">' +

                '<button ' +
                    'type="button" ' +
                    'class="clear-messages-cancel" ' +
                    'id="cancelClearMessages">' +
                    'Cancel' +
                '</button>' +

                '<button ' +
                    'type="button" ' +
                    'class="clear-messages-confirm" ' +
                    'id="confirmClearMessages">' +
                    'Clear messages' +
                '</button>' +

            '</div>' +

        '</div>';


    /*
     * Add confirmation to page.
     */

    document.body.appendChild(
        overlay
    );


    /*
     * Cancel button.
     */

    const cancelButton =
        document.getElementById(
            "cancelClearMessages"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            function() {

                closeClearMessagesConfirmation();

            }
        );

    }


    /*
     * Confirm button.
     */

    const confirmButton =
        document.getElementById(
            "confirmClearMessages"
        );


    if (confirmButton) {

        confirmButton.addEventListener(
            "click",
            function() {

                confirmClearChatMessages();

            }
        );

    }


    /*
     * Close when clicking
     * the dark background.
     */

    overlay.addEventListener(
        "click",
        function(event) {

            if (
                event.target ===
                overlay
            ) {

                closeClearMessagesConfirmation();

            }

        }
    );

}

// =========================================================
// CONFIRM CLEAR CHAT MESSAGES
// =========================================================

function confirmClearChatMessages() {

    /*
     * Make sure a chat is open.
     */

    if (!currentChat) {

        closeClearMessagesConfirmation();

        return;

    }


    /*
     * Clear all messages.
     */

    currentChat.messages = [];
     currentChat.unread = 0;

    /*
     * Clear pinned messages too.
     */

    currentChat.pinnedMessages = [];


    /*
     * Reset pinned message index.
     */

    currentPinnedMessageIndex =
        0;


    /*
     * Exit pin selection mode.
     */

    pinMessageSelectionMode =
        false;


    selectedPinMessageIds =
        [];


    /*
     * Render the empty chat.
     */

    renderMessages();


    /*
     * Update pinned message bar.
     */

    updatePinnedMessageBar();


    /*
     * Update pin selection bar.
     */

    updatePinMessageSelectionBar();


    /*
     * Update chat preview.
     */

    updateChatLastMessage(
        currentChat
    );


    /*
     * Refresh chat list.
     */

    if (
        currentChatType ===
        "individual"
    ) {

        renderIndividualChats();

    }
    else {

        renderGroups();

    }


    /*
     * Update unread counts.
     */

    updateUnreadCounts();


    /*
     * Close confirmation.

     */

    closeClearMessagesConfirmation();

}

// =========================================================
// CLOSE CLEAR MESSAGES CONFIRMATION
// =========================================================

function closeClearMessagesConfirmation() {

    const overlay =
        document.getElementById(
            "clearMessagesConfirmation"
        );


    if (!overlay) {

        return;

    }


    overlay.remove();

}


// =========================================================
// Part 7:: DELETE CURRENT CHAT
// =========================================================



// ======================================================
// GLOBAL ACCESS
// ======================================================

window.setupMessageActionEvents =
    setupMessageActionEvents;

window.initStage6MessageActions =
    initStage6MessageActions;

window.closeMessageActionMenu =
    closeMessageActionMenu;

window.searchMessages =
    searchMessages;

window.closeMessageSearch =
    closeMessageSearch;

window.nextMessageSearchResult =
    nextMessageSearchResult;

window.previousMessageSearchResult =
    previousMessageSearchResult;

window.toggleChatMute =
    toggleChatMute;
// ======================================================
// 59. GLOBAL EDIT FUNCTIONS
// ======================================================

window.startEditMessage =
    startEditMessage;


window.cancelEditMessage =
    cancelEditMessage;


window.saveEditedMessage =
    saveEditedMessage;


window.isEditingMessage =
    isEditingMessage;

window.copyMessage =
    copyMessage;


window.deleteMessage =
    deleteMessage;


// ======================================================
// 86. REPLY GLOBAL ACCESS
// ======================================================

window.replyToMessage =
    replyToMessage;


window.showReplyPreview =
    showReplyPreview;


window.closeReplyPreview =
    closeReplyPreview;


window.cancelReply =
    cancelReply;


window.sendReplyMessage =
    sendReplyMessage;


window.sendCurrentReply =
    sendCurrentReply;


window.handleReplyAction =
    handleReplyAction;


window.scrollToMessage =
    scrollToMessage;


window.openRepliedMessage =
    openRepliedMessage;


window.isReplying =
    isReplying;


window.getReplyingMessage =
    getReplyingMessage;


window.setupReplyPreviewEvents =
    setupReplyPreviewEvents;



// ======================================================
// 69. MESSAGE ENGINE GLOBAL ACCESS
// ======================================================

window.sendMessage =
    sendMessage;


window.handleMessageInputKeydown =
    handleMessageInputKeydown;


window.getMessageText =
    getMessageText;


window.clearMessageInput =
    clearMessageInput;


window.initializeMessageEngine =
    initializeMessageEngine;



// ======================================================
// GLOBAL ACCESS — CREATE GROUP
// ======================================================

window.openCreateGroupModal =
    openCreateGroupModal;


window.closeCreateGroupModal =
    closeCreateGroupModal;


window.createGroup =
    createGroup;


window.searchGroupMembers =
    searchGroupMembers;

// ======================================================
// SUPPORT CHAT GLOBAL FUNCTIONS
// ======================================================

window.showIndividualChats =
    showIndividualChats;

window.showGroups =
    showGroups;

window.openIndividualChat =
    openIndividualChat;

window.openGroupChat =
    openGroupChat;

window.closeChat =
    closeChat;

window.openNewChatModal =
    openNewChatModal;

window.closeNewChatModal =
    closeNewChatModal;

window.openCreateGroupModal =
    openCreateGroupModal;

window.closeCreateGroupModal =
    closeCreateGroupModal;

window.filterChats =
    filterChats;

window.filterGroups =
    filterGroups;
    

// =========================================================
// GLOBAL CHAT FUNCTIONS
// Required for HTML onclick="" handlers
// =========================================================

window.toggleChatMenu = toggleChatMenu;
window.closeChatMenu = closeChatMenu;
window.sendMessage = sendMessage;



// ==========================================================================
// SUPPORT CHAT SYSTEM
// STAGE 7 — ATTACHMENTS, EMOJI & VOICE MESSAGES
// ==========================================================================

// ======================================================
// TOGGLE ATTACHMENT MENU
// ======================================================

function toggleAttachmentMenu() {

  if (
        editingMessage
    ) {

        cancelEditMessage();

    }

    const menu =
        supportChatElement(
            "attachmentMenu"
        );


    if (!menu) {

        return;

    }


    const isOpening =
        menu.classList.contains(
            "hidden"
        );


    if (isOpening) {

        

        menu.classList.remove(
            "hidden"
        );

        attachmentMenuOpen =
            true;

    }
    else {

        closeAttachmentMenu();

    }

}


// ======================================================
// CLOSE ATTACHMENT MENU
// ======================================================

function closeAttachmentMenu() {

    const menu =
        supportChatElement(
            "attachmentMenu"
        );


    if (menu) {

        menu.classList.add(
            "hidden"
        );

    }


    attachmentMenuOpen =
        false;

}


// ======================================================
// ATTACH PHOTO
// ======================================================

function attachPhoto() {

    closeAttachmentMenu();


    const input =
        supportChatElement(
            "photoInput"
        );


    if (input) {

        input.click();

    }

}


// ======================================================
// ATTACH DOCUMENT
// ======================================================

function attachDocument() {

    closeAttachmentMenu();


    const input =
        supportChatElement(
            "documentInput"
        );


    if (input) {

        input.click();

    }

}


// ======================================================
// ATTACH CAMERA
// ======================================================

function attachCamera() {

    closeAttachmentMenu();


    const input =
        supportChatElement(
            "cameraInput"
        );


    if (input) {

        input.click();

    }

}


// ======================================================
// CHOOSE GROUP PHOTO
// ======================================================

function chooseGroupPhoto() {

    const input =
        supportChatElement(
            "groupPhotoInput"
        );


    if (input) {

        input.click();

    }

}


// ======================================================
// SEND AN ATTACHMENT AS A MESSAGE
// (no upload backend exists, so the attachment
// is represented as a labeled text message)
// ======================================================

function sendAttachmentMessage(
    label,
    type,
    fileData
) {

    if (!currentChat) {

        return;

    }


        const message =
        prepareMessageForSend(
            label,
            type,
            fileData
        );


    const added =
        addMessageToCurrentChat(
            message
        );


    if (!added) {

        return;

    }

       if (
        replyingToMessage
    ) {

        replyingToMessage =
            null;

        closeReplyPreview();

    }


    if (
        currentChatType ===
        "individual"
    ) {

        updateIndividualChatPreview(
            currentChat,
            message
        );


        moveIndividualChatToTop(
            currentChat
        );

    }
    else {

        updateGroupChatPreview(
            currentChat,
            message
        );

    }


    renderMessages();


    if (
        currentChatType ===
        "individual"
    ) {

        renderIndividualChats();

    }
    else {

        renderGroups();

    }


    updateUnreadCounts();


    scrollMessagesToBottom();

}


// ======================================================
// HANDLE FILE INPUT CHANGE
// ======================================================

function handleAttachmentFileChange(
    event,
    icon
) {

    const files =
        event.target.files;


    if (
        !files ||
        files.length === 0
    ) {

        return;

    }


    const file =
        files[0];

    const fileUrl =
        URL.createObjectURL(
            file
        );


    sendAttachmentMessage(
        icon +
        " " +
        file.name,
        "attachment",
        {
            fileUrl:
                fileUrl,

            fileName:
                file.name,

            fileMime:
                file.type
        }
    );


    /*
     * Reset the input so selecting the
     * same file again still fires "change".
     */

    event.target.value =
        "";

}


// ======================================================
// HANDLE GROUP PHOTO INPUT CHANGE
// ======================================================

function handleGroupPhotoChange(
    event
) {

    const files =
        event.target.files;


    if (
        !files ||
        files.length === 0
    ) {

        return;

    }


    const file =
        files[0];


    const reader =
        new FileReader();


    reader.onload =
        function(loadEvent) {

            selectedGroupPhoto =
                loadEvent.target.result;


            const preview =
                supportChatElement(
                    "newGroupAvatar"
                );


            if (preview) {

                preview.innerHTML =
                    '<img src="' +
                    selectedGroupPhoto +
                    '" alt="Group">';

            }

        };


    reader.readAsDataURL(
        file
    );


    event.target.value =
        "";

}


// ======================================================
// SETUP ATTACHMENT EVENTS
// ======================================================

function setupAttachmentEvents() {

    const photoInput =
        supportChatElement(
            "photoInput"
        );


    const documentInput =
        supportChatElement(
            "documentInput"
        );


    const cameraInput =
        supportChatElement(
            "cameraInput"
        );


    const groupPhotoInput =
        supportChatElement(
            "groupPhotoInput"
        );


    if (
        photoInput &&
        !photoInput.dataset.ready
    ) {

        photoInput.addEventListener(
            "change",
            function(event) {

                handleAttachmentFileChange(
                    event,
                    "📷 Photo:"
                );

            }
        );


        photoInput.dataset.ready =
            "true";

    }


    if (
        documentInput &&
        !documentInput.dataset.ready
    ) {

        documentInput.addEventListener(
            "change",
            function(event) {

                handleAttachmentFileChange(
                    event,
                    "📄 Document:"
                );

            }
        );


        documentInput.dataset.ready =
            "true";

    }


    if (
        cameraInput &&
        !cameraInput.dataset.ready
    ) {

        cameraInput.addEventListener(
            "change",
            function(event) {

                handleAttachmentFileChange(
                    event,
                    "📷 Photo:"
                );

            }
        );


        cameraInput.dataset.ready =
            "true";

    }


    if (
        groupPhotoInput &&
        !groupPhotoInput.dataset.ready
    ) {

        groupPhotoInput.addEventListener(
            "change",
            handleGroupPhotoChange
        );


        groupPhotoInput.dataset.ready =
            "true";

    }


    /*
     * Close the attachment menu when
     * clicking anywhere outside it.
     */

    document.addEventListener(
        "click",
        function(event) {

            if (!attachmentMenuOpen) {

                return;

            }


            const menu =
                supportChatElement(
                    "attachmentMenu"
                );


            if (!menu) {

                return;

            }


            const clickedInsideMenu =
                menu.contains(
                    event.target
                );


            const clickedToggleButton =
                event.target.closest(
                    '[onclick="toggleAttachmentMenu()"]'
                );


            if (
                !clickedInsideMenu &&
                !clickedToggleButton
            ) {

                closeAttachmentMenu();

            }

        }
    );

}


// ======================================================
// EMOJI PICKER — EMOJI LIST
// ======================================================




// ======================================================
// TOGGLE EMOJI PICKER
// ======================================================




// ======================================================
// CLOSE EMOJI PICKER
// ======================================================




// ======================================================
// POPULATE EMOJI PICKER
// ======================================================




// ======================================================
// INSERT EMOJI INTO MESSAGE INPUT
// ======================================================




// ======================================================
// START VOICE MESSAGE
// (no microphone/recording backend exists here,
// so this toggles a simple recording indicator and,
// on stop, sends a placeholder voice-note message)
// ======================================================

let voiceMediaRecorder = null;
let voiceRecordedChunks = [];
let voiceStream = null;


function startVoiceMessage() {

    if (
        editingMessage
    ) {

        cancelEditMessage();

    }


    if (!currentChat) {

        return;

    }


    const voiceButton =
        supportChatElement(
            "voiceMessageBtn"
        );


    /*
     * Not currently recording -> start.
     */

    if (!isRecordingVoice) {

        navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then(
                function(stream) {

                    voiceStream = stream;

                    voiceRecordedChunks = [];

                    voiceMediaRecorder =
                        new MediaRecorder(stream);


                    voiceMediaRecorder.addEventListener(
                        "dataavailable",
                        function(event) {

                            if (
                                event.data &&
                                event.data.size > 0
                            ) {

                                voiceRecordedChunks.push(
                                    event.data
                                );

                            }

                        }
                    );


                    voiceMediaRecorder.addEventListener(
                        "stop",
                        function() {

                            const blob =
                                new Blob(
                                    voiceRecordedChunks,
                                    { type: "audio/webm" }
                                );


                            const fileUrl =
                                URL.createObjectURL(
                                    blob
                                );


                            if (voiceStream) {

                                voiceStream.getTracks().forEach(
                                    function(track) {

                                        track.stop();

                                    }
                                );

                                voiceStream = null;

                            }


                            sendAttachmentMessage(
                                "🎤 Voice message",
                                "voice",
                                {
                                    fileUrl:
                                        fileUrl
                                }
                            );

                        }
                    );


                    voiceMediaRecorder.start();


                    isRecordingVoice = true;


                    if (voiceButton) {

                        voiceButton.classList.add(
                            "recording"
                        );

                        voiceButton.title =
                            "Stop recording";

                    }

                }
            )
            .catch(
                function(error) {

                    console.error(
                        "Microphone access denied:",
                        error
                    );

                }
            );


        return;

    }


    /*
     * Already recording -> stop.
     */

    isRecordingVoice = false;


    if (voiceButton) {

        voiceButton.classList.remove(
            "recording"
        );

        voiceButton.title =
            "Voice message";

    }


    if (
        voiceMediaRecorder &&
        voiceMediaRecorder.state !== "inactive"
    ) {

        voiceMediaRecorder.stop();

    }

}


// ==========================================================================
// SUPPORT CHAT SYSTEM
// STAGE 8 — GROUP INFO & GROUP SETTINGS
// ==========================================================================

// ======================================================
// OPEN GROUP INFO
// ======================================================

function openGroupInfo() {

    if (!currentGroup) {

        return;

    }


    closeChatMenu();


    const modal =
        supportChatElement(
            "groupInfoModal"
        );


    if (!modal) {

        return;

    }


    const nameElement =
        supportChatElement(
            "groupInfoName"
        );


    const descriptionElement =
        supportChatElement(
            "groupInfoDescription"
        );


    const memberCountElement =
        supportChatElement(
            "groupInfoMemberCount"
        );


    const avatarElement =
        supportChatElement(
            "groupInfoAvatar"
        );


    if (nameElement) {

        nameElement.textContent =
            currentGroup.name;

    }


    if (descriptionElement) {

        descriptionElement.textContent =
            currentGroup.description ||
            "No description.";

    }


    if (memberCountElement) {

        memberCountElement.textContent =
            currentGroup.members.length +
            " members";

    }


    if (avatarElement) {

        if (currentGroup.avatar) {

            avatarElement.innerHTML =
                '<img src="' +
                currentGroup.avatar +
                '" alt="' +
                currentGroup.name +
                '">';

        }
        else {

            avatarElement.innerHTML =
                '<i class="fa-solid fa-users"></i>';

        }

    }


    renderGroupInfoMembers();


    modal.classList.remove(
        "hidden"
    );

}


// ======================================================
// CLOSE GROUP INFO
// ======================================================

function closeGroupInfo() {

    const modal =
        supportChatElement(
            "groupInfoModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}


// ======================================================
// RENDER GROUP INFO MEMBERS
// ======================================================

function renderGroupInfoMembers() {

    const container =
        supportChatElement(
            "groupMembersList"
        );


    const countElement =
        supportChatElement(
            "groupMembersCount"
        );


    if (
        !container ||
        !currentGroup
    ) {

        return;

    }


    container.innerHTML =
        "";


    if (countElement) {

        countElement.textContent =
            currentGroup.members.length;

    }


    currentGroup.members.forEach(
        function(member) {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "group-member";


            

                    
            const avatarHtml =
                '<div class="group-user-avatar">' +
                getInitials(
                    member.name
                ) +
                '</div>';


       const adminBadge =
                member.role ===
                "Admin"
                    ? '<span class="group-admin-badge">Admin</span>'
                    : "";


            row.innerHTML =
                avatarHtml +
                '<div class="group-member-info">' +
                    '<strong>' +
                    member.name +
                    '</strong>' +
                    '<span>' +
                    member.id +
                    '</span>' +
                '</div>' +
                adminBadge;


            row.addEventListener(
                "click",
                function() {

                    openMemberActions(
                        member
                    );

                }
            );


            container.appendChild(
                row
            );

        }
    );

}


// ======================================================
// OPEN GROUP SETTINGS
// ======================================================

function openGroupSettings() {

    if (!currentGroup) {

        return;

    }


    closeGroupInfo();


    const modal =
        supportChatElement(
            "groupSettingsModal"
        );


    if (!modal) {

        return;

    }


    const sendPermission =
        supportChatElement(
            "groupSendPermission"
        );


    const editPermission =
        supportChatElement(
            "groupEditPermission"
        );


    const addPermission =
        supportChatElement(
            "groupAddPermission"
        );


    const permissions =
        currentGroup.permissions ||
        {};


    if (
        sendPermission &&
        permissions.sendMessages
    ) {

        sendPermission.value =
            permissions.sendMessages;

    }


    if (
        editPermission &&
        permissions.editGroup
    ) {

        editPermission.value =
            permissions.editGroup;

    }


    if (
        addPermission &&
        permissions.addMembers
    ) {

        addPermission.value =
            permissions.addMembers;

    }


    modal.classList.remove(
        "hidden"
    );

}


// ======================================================
// CLOSE GROUP SETTINGS
// ======================================================

function closeGroupSettings() {

    const modal =
        supportChatElement(
            "groupSettingsModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}


// ======================================================
// SAVE GROUP SETTINGS
// ======================================================

function saveGroupSettings() {

    if (!currentGroup) {

        closeGroupSettings();

        return;

    }


    const sendPermission =
        supportChatElement(
            "groupSendPermission"
        );


    const editPermission =
        supportChatElement(
            "groupEditPermission"
        );


    const addPermission =
        supportChatElement(
            "groupAddPermission"
        );


    currentGroup.permissions =
        {

            sendMessages:
                sendPermission
                    ? sendPermission.value
                    : currentGroup.permissions.sendMessages,

            editGroup:
                editPermission
                    ? editPermission.value
                    : currentGroup.permissions.editGroup,

            addMembers:
                addPermission
                    ? addPermission.value
                    : currentGroup.permissions.addMembers

        };


    closeGroupSettings();

}


// ======================================================
// EDIT GROUP INFORMATION
// (opens the create-group modal in "edit" mode)
// ======================================================

function editGroupInformation() {

    openEditGroupModal();

}


// ==========================================================================
// SUPPORT CHAT SYSTEM
// STAGE 9 — MEMBER ACTIONS
// ==========================================================================

// ======================================================
// OPEN MEMBER ACTIONS
// ======================================================

function openMemberActions(
    member
) {

    selectedGroupMember =
        member;


    const modal =
        supportChatElement(
            "memberActionModal"
        );


    const avatarElement =
        supportChatElement(
            "memberActionAvatar"
        );


    const nameElement =
        supportChatElement(
            "memberActionName"
        );


    const roleElement =
        supportChatElement(
            "memberActionRole"
        );


    const adminButton =
        supportChatElement(
            "memberAdminAction"
        );


    if (!modal) {

        return;

    }


        if (avatarElement) {

        avatarElement.textContent =
            getInitials(
                member.name
            );

    }


    if (nameElement) {

        nameElement.textContent =
            member.name;

    }


    if (roleElement) {

        roleElement.textContent =
            member.role;

    }


    if (adminButton) {

        adminButton.innerHTML =

            member.role ===
            "Admin"
                ? '<i class="fa-solid fa-shield"></i> Remove Admin'
                : '<i class="fa-solid fa-shield"></i> Make Admin';

    }


    modal.classList.remove(
        "hidden"
    );

}


// ======================================================
// CLOSE MEMBER ACTIONS
// ======================================================

function closeMemberActions() {

    const modal =
        supportChatElement(
            "memberActionModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}


// ======================================================
// VIEW MEMBER PROFILE
// ======================================================

function viewMemberProfile() {

    if (!selectedGroupMember) {

        return;

    }


    const user =
        findSupportUser(
            selectedGroupMember.id
        );


    closeMemberActions();
    closeGroupInfo();


    if (user) {

        populateUserProfileModal(
            user
        );

    }

}


// ======================================================
// TOGGLE MEMBER ADMIN
// ======================================================

function toggleMemberAdmin() {

    if (
        !selectedGroupMember ||
        !currentGroup
    ) {

        return;

    }


    const member =
        currentGroup.members.find(
            function(item) {

                return (
                    item.id ===
                    selectedGroupMember.id
                );

            }
        );


    if (!member) {

        return;

    }


    member.role =
        member.role ===
        "Admin"
            ? "Member"
            : "Admin";


    selectedGroupMember =
        member;


    closeMemberActions();


    renderGroupInfoMembers();

}


// ======================================================
// REMOVE MEMBER FROM GROUP
// ======================================================

function removeMemberFromGroup() {

    if (
        !selectedGroupMember ||
        !currentGroup
    ) {

        return;

    }


    closeMemberActions();


    deleteActionType =
        "member";

    deleteActionId =
        selectedGroupMember.id;


    const titleElement =
        supportChatElement(
            "deleteConfirmTitle"
        );

    const textElement =
        supportChatElement(
            "deleteConfirmText"
        );

    const confirmBtn =
        supportChatElement(
            "confirmDeleteBtn"
        );


    if (titleElement) {

        titleElement.textContent =
            "Remove Member?";

    }


    if (textElement) {

        textElement.textContent =
            "Remove " +
            selectedGroupMember.name +
            " from this group?";

    }


    if (confirmBtn) {

        confirmBtn.textContent =
            "Remove";

    }


    const modal =
        supportChatElement(
            "deleteConfirmModal"
        );


    if (modal) {

        modal.classList.remove(
            "hidden"
        );

    }

}


// ==========================================================================
// SUPPORT CHAT SYSTEM
// STAGE 10 — USER PROFILE
// ==========================================================================

// ======================================================
// OPEN CURRENT PROFILE
// (header avatar / name click — routes to group info
// for group chats, or the user profile for individual)
// ======================================================

function openCurrentProfile() {

    closeMessagePreviewsOnUiOpen();
  
    if (!currentChat) {

        return;

    }


    if (
        currentChatType ===
        "group"
    ) {

        openGroupInfo();

        return;

    }


    if (currentUser) {

        populateUserProfileModal(
            currentUser
        );

    }

}


// ======================================================
// POPULATE USER PROFILE MODAL
// ======================================================

function populateUserProfileModal(
    user
) {

    const modal =
        supportChatElement(
            "userProfileModal"
        );


    if (
        !modal ||
        !user
    ) {

        return;

    }


    const fields =
        {

            profileName:
                user.name,

            profileUserId:
                user.id,

            profileAccountStatus:
                user.status,

            profileEmail:
                user.email,

            profilePhone:
                user.phone,

            profileJoined:
                user.joined,

            profileVerification:
                user.verification,

            profileBalance:
                "M" +
                Number(
                    user.balance || 0
                ).toFixed(2),

            profileDeposited:
                "M" +
                Number(
                    user.deposited || 0
                ).toFixed(2),

            profileWithdrawn:
                "M" +
                Number(
                    user.withdrawn || 0
                ).toFixed(2),

            profilePlan:
                user.plan ||
                "None"

        };


    Object.keys(
        fields
    ).forEach(
        function(id) {

            const element =
                supportChatElement(
                    id
                );


            if (element) {

                element.textContent =
                    fields[id];

            }

        }
    );


    const avatarElement =
        supportChatElement(
            "profileAvatar"
        );


        if (avatarElement) {

        avatarElement.textContent =
            getInitials(
                user.name
            );

    }


    const onlineElement =
        supportChatElement(
            "profileOnlineStatus"
        );


    if (onlineElement) {

        onlineElement.style.display =
            user.online
                ? "block"
                : "none";

    }


    modal.dataset.profileUserId =
        user.id;


    modal.classList.remove(
        "hidden"
    );

}


// ======================================================
// CLOSE USER PROFILE
// ======================================================

function closeUserProfile() {

    const modal =
        supportChatElement(
            "userProfileModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}


// ======================================================
// VIEW FULL USER PROFILE / ACTIVITY / TRANSACTIONS
// (no dedicated admin pages are wired into this file,
// so these surface the relevant info from what is
// already known about the user)
// ======================================================

// ======================================================
// VIEW FULL USER PROFILE / ACTIVITY / TRANSACTIONS
// Navigates to the relevant admin page via loadAdminPage()
// and hands off which user to focus on via sessionStorage,
// so users.js / transactions.js / activity-log.js can read
// "pendingProfileUserId" on load and pre-filter to them.
// ======================================================

function goToAdminUserRecord(page, userId) {

    if (!userId) {
        return;
    }

    sessionStorage.setItem("pendingProfileUserId", userId);

    closeUserProfile();

    if (typeof loadAdminPage === "function") {
        loadAdminPage(page);
    } else {
        console.warn(
            "loadAdminPage() is not defined — make sure admin.js is loaded before support-chat.js."
        );
    }
}

function viewFullUserProfile() {
    const modal = supportChatElement("userProfileModal");
    const userId = modal ? modal.dataset.profileUserId : null;
    goToAdminUserRecord("users", userId);
}

function deleteChatFromProfile() {

    

    deleteCurrentChat();
    closeUserProfile();

}


// ==========================================================================
// SUPPORT CHAT SYSTEM
// STAGE 11 — DELETE CHAT / DELETE GROUP
// ==========================================================================

// ======================================================
// DELETE CURRENT CHAT
// ======================================================

function deleteCurrentChat() {

    if (currentGroup) {
      deleteCurrentGroup();
      return;
    }

    else if (
        !currentChat ||
        currentChatType !== "individual"
    ) {

        return;

    }


    closeChatMenu();


    deleteActionType =
        "chat";

    deleteActionId =
        currentChat.id;


    const titleElement =
        supportChatElement(
            "deleteConfirmTitle"
        );


    const textElement =
        supportChatElement(
            "deleteConfirmText"
        );


    if (titleElement) {

        titleElement.textContent =
            "Delete Conversation?";

    }


    if (textElement) {

        textElement.textContent =
            "This will permanently delete your conversation with " +
            currentChat.name +
            ". This action cannot be undone.";

    }

      const confirmBtn =
        supportChatElement(
            "confirmDeleteBtn"
        );


    if (confirmBtn) {

        confirmBtn.textContent =
            "Delete";

    }


    const modal =
        supportChatElement(
            "deleteConfirmModal"
        );


    if (modal) {

        modal.classList.remove(
            "hidden"
        );

    }

}


// ======================================================
// DELETE CURRENT GROUP
// ======================================================

function deleteCurrentGroup() {

    if (!currentGroup) {

        return;

    }


    closeGroupInfo();


    deleteActionType =
        "group";

    deleteActionId =
        currentGroup.id;


    const titleElement =
        supportChatElement(
            "deleteConfirmTitle"
        );


    const textElement =
        supportChatElement(
            "deleteConfirmText"
        );


    if (titleElement) {

        titleElement.textContent =
            "Delete Group?";

    }


    if (textElement) {

        textElement.textContent =
            "This will permanently delete \"" +
            currentGroup.name +
            "\" for everyone. This action cannot be undone.";

    }

      const confirmBtn =
        supportChatElement(
            "confirmDeleteBtn"
        );


    if (confirmBtn) {

        confirmBtn.textContent =
            "Delete";

    }


    const modal =
        supportChatElement(
            "deleteConfirmModal"
        );


    if (modal) {

        modal.classList.remove(
            "hidden"
        );

    }

}


// ======================================================
// CLOSE DELETE CONFIRMATION
// ======================================================

function closeDeleteConfirmation() {

    const modal =
        supportChatElement(
            "deleteConfirmModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }


    deleteActionType =
        null;

    deleteActionId =
        null;

    deleteActionIds =
        [];

    deleteActionChatType =
        null;

}


// ======================================================
// CONFIRM DELETE ACTION
// ======================================================

function confirmDeleteAction() {

    if (
        deleteActionType ===
        "chat"
    ) {

        const index =
            individualChats.findIndex(
                function(chat) {

                    return (
                        chat.id ===
                        deleteActionId
                    );

                }
            );


        if (index !== -1) {

            individualChats.splice(
                index,
                1
            );

        }


        if (
            currentChat &&
            currentChat.id ===
            deleteActionId
        ) {

            closeChat();

        }


        renderIndividualChats();

    }
    else if (
        deleteActionType ===
        "group"
    ) {

        const index =
            supportChatGroups.findIndex(
                function(group) {

                    return (
                        group.id ===
                        deleteActionId
                    );

                }
            );


        if (index !== -1) {

            supportChatGroups.splice(
                index,
                1
            );

        }


        if (
            currentChat &&
            currentChat.id ===
            deleteActionId
        ) {

            closeChat();

        }


        renderGroups();

    }
    else if (
        deleteActionType ===
        "bulkChats"
    ) {

        const targetArray =
            deleteActionChatType === "group"
                ? supportChatGroups
                : individualChats;


        const idsToDelete =
            deleteActionIds;


        for (
            let i = targetArray.length - 1;
            i >= 0;
            i--
        ) {

            if (
                idsToDelete.includes(
                    targetArray[i].id
                )
            ) {

                targetArray.splice(
                    i,
                    1
                );

            }

        }


        if (
            currentChat &&
            idsToDelete.includes(
                currentChat.id
            )
        ) {

            closeChat();

        }


        if (
            deleteActionChatType === "group"
        ) {

            renderGroups();

        }
        else {

            renderIndividualChats();

        }


        exitChatSelectionMode();

    }

      else if (
        deleteActionType ===
        "message"
    ) {

        if (
            currentChat &&
            Array.isArray(
                currentChat.messages
            )
        ) {

            const messageIndex =
                currentChat.messages.findIndex(
                    function(item) {

                        return (
                            item.id ===
                            deleteActionId
                        );

                    }
                );


            if (
                messageIndex !==
                -1
            ) {

                currentChat.messages.splice(
                    messageIndex,
                    1
                );


                if (
                    replyingToMessage &&
                    replyingToMessage.id ===
                    deleteActionId
                ) {

                    cancelReply();

                }


                if (
                    editingMessage &&
                    editingMessage.id ===
                    deleteActionId
                ) {

                    cancelEditMessage();

                }


                updateChatLastMessage(
                    currentChat
                );


                renderMessages();


                if (
                    currentChatType ===
                    "individual"
                ) {

                    renderIndividualChats();

                }
                else {

                    renderGroups();

                }


                scrollMessagesToBottom();

            }

        }

    }
    else if (
        deleteActionType ===
        "member"
    ) {

        if (currentGroup) {

            currentGroup.members =
                currentGroup.members.filter(
                    function(member) {

                        return (
                            member.id !==
                            deleteActionId
                        );

                    }
                );


            if (
                selectedGroupMember &&
                selectedGroupMember.id ===
                deleteActionId
            ) {

                selectedGroupMember =
                    null;

            }


            renderGroupInfoMembers();


            const memberCountElement =
                supportChatElement(
                    "groupInfoMemberCount"
                );


            if (memberCountElement) {

                memberCountElement.textContent =
                    currentGroup.members.length +
                    " members";

            }


            renderCurrentChat();


            renderGroups();

        }

    }


    updateUnreadCounts();


    closeDeleteConfirmation();

}


// ======================================================
// GLOBAL ACCESS — STAGE 7-11
// ======================================================

window.toggleAttachmentMenu = toggleAttachmentMenu;
window.attachPhoto = attachPhoto;
window.attachDocument = attachDocument;
window.attachCamera = attachCamera;
window.chooseGroupPhoto = chooseGroupPhoto;

window.startVoiceMessage = startVoiceMessage;

window.openGroupInfo = openGroupInfo;
window.closeGroupInfo = closeGroupInfo;
window.openGroupSettings = openGroupSettings;
window.closeGroupSettings = closeGroupSettings;
window.saveGroupSettings = saveGroupSettings;
window.editGroupInformation = editGroupInformation;
window.openAddMembers = openAddMembers;
window.submitGroupModal = submitGroupModal;

window.viewMemberProfile = viewMemberProfile;
window.toggleMemberAdmin = toggleMemberAdmin;
window.removeMemberFromGroup = removeMemberFromGroup;
window.closeMemberActions = closeMemberActions;

window.openCurrentProfile = openCurrentProfile;
window.closeUserProfile = closeUserProfile;
window.viewFullUserProfile = viewFullUserProfile;



window.deleteCurrentChat = deleteCurrentChat;
window.deleteCurrentGroup = deleteCurrentGroup;
window.confirmDeleteAction = confirmDeleteAction;
window.closeDeleteConfirmation = closeDeleteConfirmation;


// ==========================================================================
// SUPPORT CHAT SYSTEM
// STAGE 12 — CHAT PRIORITY & MULTI-SELECT DELETE
// (press-and-hold a chat to highlight it and open a
// quick-actions modal: toggle priority, or delete —
// deletion supports selecting and removing many chats
// at once)
// ==========================================================================

const CHAT_LONG_PRESS_DURATION =
    500;
// milliseconds to hold before it counts as a long-press

const CHAT_LONG_PRESS_MOVE_TOLERANCE =
    10;
// pixels of finger/mouse movement allowed before a
// long-press is cancelled (treated as a scroll/drag)


// ======================================================
// ATTACH CHAT PRESS HANDLERS
// (wires long-press detection AND normal-tap handling
// onto a single chat list item — called once per item
// as it is created)
//
// All press/long-press state (the timer, whether the
// long-press already fired, the press start position)
// is kept in variables local to this function's closure
// — one private set per chat item — rather than in a
// single shared/global flag. Sharing one global flag
// across every chat item caused a real bug: firing a
// long-press on one chat left the flag "stuck", so the
// very next ordinary click on a *different* chat was
// silently swallowed instead of toggling its selection.
// Scoping the flag per item makes that impossible.
// ======================================================

function attachChatPressHandlers(
    item,
    chatId,
    chatType,
    onTap
) {

    let pressTimer =
        null;

    let pressFired =
        false;

    let pressStartX =
        0;

    let pressStartY =
        0;


    function clearPressTimer() {

        if (pressTimer) {

            clearTimeout(
                pressTimer
            );

            pressTimer =
                null;

        }

    }


    function startPress(
        clientX,
        clientY
    ) {

        clearPressTimer();

        pressFired =
            false;

        pressStartX =
            clientX;

        pressStartY =
            clientY;


        pressTimer =
            setTimeout(
                function() {

                    pressFired =
                        true;

                    pressTimer =
                        null;


                    handleChatLongPress(
                        chatId,
                        chatType
                    );

                },
                CHAT_LONG_PRESS_DURATION
            );

    }


    function endPress() {

        clearPressTimer();

    }


    item.addEventListener(
        "mousedown",
        function(event) {

            startPress(
                event.clientX,
                event.clientY
            );

        }
    );


    item.addEventListener(
        "mouseup",
        endPress
    );


    item.addEventListener(
        "mouseleave",
        endPress
    );


    item.addEventListener(
        "touchstart",
        function(event) {

            const touch =
                event.touches[0];


            startPress(
                touch.clientX,
                touch.clientY
            );

        },
        {
            passive: true
        }
    );


    item.addEventListener(
        "touchend",
        endPress
    );


    item.addEventListener(
        "touchcancel",
        endPress
    );


    item.addEventListener(
        "touchmove",
        function(event) {

            const touch =
                event.touches[0];


            const movedX =
                Math.abs(
                    touch.clientX -
                    pressStartX
                );

            const movedY =
                Math.abs(
                    touch.clientY -
                    pressStartY
                );


            if (
                movedX > CHAT_LONG_PRESS_MOVE_TOLERANCE ||
                movedY > CHAT_LONG_PRESS_MOVE_TOLERANCE
            ) {

                endPress();

            }

        },
        {
            passive: true
        }
    );


    /*
     * Normal tap handling lives here too (rather than
     * a separate click listener elsewhere) so it shares
     * this exact same closure-scoped "pressFired" flag —
     * the only reliable way to tell "this click is the
     * tail end of a long-press that already fired" from
     * "this is an unrelated, ordinary click".
     */

    item.addEventListener(
        "click",
        function(event) {

            event.preventDefault();


            if (pressFired) {

                pressFired =
                    false;

                return;

            }


            if (chatSelectionMode) {

                toggleChatSelection(
                    chatId,
                    chatType
                );

                return;

            }


            onTap();

        }
    );

}


// ======================================================
// HANDLE CHAT LONG PRESS
// ======================================================

function handleChatLongPress(
    chatId,
    chatType
) {

    /*
     * A long-press started on a chat of a
     * different type than the current selection
     * starts a fresh selection instead of mixing
     * individual chats and groups together.
     */

    if (
        chatSelectionMode &&
        chatSelectionType !== chatType
    ) {

        exitChatSelectionMode();

    }


    chatSelectionMode =
        true;

    chatSelectionType =
        chatType;


    if (
        !selectedChatIds.includes(
            chatId
        )
    ) {

        selectedChatIds.push(
            chatId
        );

    }


    refreshChatSelectionUI();


    /*
     * Only show the delete/priority chooser on the
     * FIRST long-press of a selection. Once a mode has
     * already been picked, a long-press on another chat
     * should just add it to the batch, not reopen the
     * modal.
     */

    if (pendingBulkAction === null) {

        openChatActionsModal(
            chatId,
            chatType
        );
  }

}


// ======================================================
// TOGGLE CHAT SELECTION
// (tapping additional chats while selection mode
// is already active)
// ======================================================

function toggleChatSelection(
    chatId,
    chatType
) {

    if (chatType !== chatSelectionType) {

        return;

    }


    const index =
        selectedChatIds.indexOf(
            chatId
        );


    if (index === -1) {

        selectedChatIds.push(
            chatId
        );

    }
    else {

        selectedChatIds.splice(
            index,
            1
        );

    }


    if (selectedChatIds.length === 0) {

        exitChatSelectionMode();

        return;

    }


    refreshChatSelectionUI();

}


// ======================================================
// REFRESH CHAT SELECTION UI
// (updates the selection bar and re-renders the
// active list so highlighted items stay in sync)
// ======================================================

function refreshChatSelectionUI() {

    const bar =
        supportChatElement(
            "chatSelectionBar"
        );

    const countLabel =
        supportChatElement(
            "chatSelectionCount"
        );


    if (bar) {

        if (
            chatSelectionMode &&
            selectedChatIds.length > 0
        ) {

            bar.classList.remove(
                "hidden"
            );

        }
        else {

            bar.classList.add(
                "hidden"
            );

        }

    }


    if (countLabel) {

        countLabel.textContent =
            selectedChatIds.length +
            (
                selectedChatIds.length === 1
                    ? " selected"
                    : " selected"
            );

    }


    /*
     * Groups have no priority concept — hide the
     * header's priority button whenever the current
     * selection is a group selection.
     */

        const headerPriorityBtn =
        supportChatElement(
            "chatSelectionPriorityBtn"
        );

    const headerDeleteBtn =
        supportChatElement(
            "chatSelectionDeleteBtn"
        );


    if (headerPriorityBtn) {

        const hidePriorityBtn =
            chatSelectionType === "group" ||
            pendingBulkAction === "delete";


        if (hidePriorityBtn) {

            headerPriorityBtn.classList.add(
                "hidden"
            );

        }
        else {

            headerPriorityBtn.classList.remove(
                "hidden"
            );

        }

    }


    if (headerDeleteBtn) {

        const hideDeleteBtn =
            pendingBulkAction === "priority";


        if (hideDeleteBtn) {

            headerDeleteBtn.classList.add(
                "hidden"
            );

        }
        else {

            headerDeleteBtn.classList.remove(
                "hidden"
            );

        }

    }


    



  


    if (chatSelectionType === "group") {

        renderGroups();

    }
    else {

        renderIndividualChats();

    }

}


// ======================================================
// EXIT CHAT SELECTION MODE
// ======================================================

function exitChatSelectionMode() {

    chatSelectionMode =
        false;

    chatSelectionType =
        null;

    selectedChatIds =
        [];

    pendingBulkAction =
        null;

    pendingPriorityMode =
        null;


    const bar =
        supportChatElement(
            "chatSelectionBar"
        );


    if (bar) {

        bar.classList.add(
            "hidden"
        );

    }


    renderIndividualChats();

    renderGroups();

}


// ======================================================
// OPEN CHAT ACTIONS MODAL
// ======================================================

function openChatActionsModal(
    anchorChatId,
    chatType
) {

    const modal =
        supportChatElement(
            "chatActionsModal"
        );


    if (!modal) {

        return;

    }


    const anchorChat =
        chatType === "group"
            ? findSupportGroup(
                anchorChatId
              )
            : findIndividualChat(
                anchorChatId
              );


    const titleElement =
        supportChatElement(
            "chatActionsTitle"
        );

    const priorityButton =
        supportChatElement(
            "chatActionsPriorityBtn"
        );


    if (
        titleElement &&
        anchorChat
    ) {

        titleElement.textContent =
            anchorChat.name;

    }


    if (priorityButton) {

        if (
            chatType === "group"
        ) {

            priorityButton.classList.add(
                "hidden"
            );

        } else {

            priorityButton.classList.remove(
                "hidden"
            );

            if (anchorChat) {

                priorityButton.innerHTML =

                    anchorChat.priority
                        ? '<i class="fa-solid fa-star"></i> Remove from Priority'
                        : '<i class="fa-solid fa-star"></i> Add to Priority';

            }

        }

    }


    modal.classList.remove(
        "hidden"
    );

}


// ======================================================
// CLOSE CHAT ACTIONS MODAL
// (does not clear the current selection — the person
// can keep tapping more chats to build a batch before
// deleting or re-opening this modal on another chat)
// ======================================================

function closeChatActionsModal() {
   
    const modal =
        supportChatElement(
            "chatActionsModal"
        );


  if (modal) {

        modal.classList.add(
            "hidden"
        );

    }
  exitChatSelectionMode();

}


function hideChatActionsModal() {

    const modal =
        supportChatElement(
            "chatActionsModal"
        );

    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}

// ======================================================
// CHOOSE BULK DELETE MODE
// (picked from the chat actions modal right after a
// long-press — just records the intent and lets the
// person keep tapping more chats to add to the batch)
// ======================================================

function chooseBulkDeleteMode() {

    if (selectedChatIds.length === 0) {

        closeChatActionsModal();

        return;

    }


    pendingBulkAction =
        "delete";

    pendingPriorityMode =
        null;


    hideChatActionsModal();


    refreshChatSelectionUI();

}


// ======================================================
// CHOOSE BULK PRIORITY MODE
// (picked from the chat actions modal right after a
// long-press — whether this batch is adding to or
// removing from priority is decided once, from the
// anchor chat's own current priority state, and then
// the individual chat list is narrowed down to only the
// chats eligible for that action)
// ======================================================

function chooseBulkPriorityMode() {

    if (selectedChatIds.length === 0) {

        closeChatActionsModal();

        return;

    }


    // groups have no priority concept —
    // only individual chats can be prioritized
    if (chatSelectionType === "group") {

        closeChatActionsModal();

        return;

    }


    const anchorChat =
        findIndividualChat(
            selectedChatIds[0]
        );


    pendingBulkAction =
        "priority";

    pendingPriorityMode =
        anchorChat && anchorChat.priority
            ? "remove"
            : "add";


    hideChatActionsModal();


    refreshChatSelectionUI();

}


// ======================================================
// CONFIRM PRIORITY SELECTED CHATS
// (opens the priority confirmation modal, mirroring
// confirmDeleteSelectedChats for the priority action)
// ======================================================

function confirmPrioritySelectedChats() {

    if (selectedChatIds.length === 0) {

        return;

    }


    // groups have no priority concept —
    // only individual chats can be prioritized
    if (chatSelectionType === "group") {

        return;

    }


    const anchorChat =
        findIndividualChat(
            selectedChatIds[0]
        );


    const newPriority =
        anchorChat
            ? !anchorChat.priority
            : true;


    priorityActionIds =
        [...selectedChatIds];

    priorityActionValue =
        newPriority;


    const count =
        selectedChatIds.length;

    const noun =
        count === 1
            ? "conversation"
            : "conversations";

    const actionWord =
        newPriority
            ? "Add"
            : "Remove";

    const actionPrep =
        newPriority
            ? "to"
            : "from";


    const titleElement =
        supportChatElement(
            "priorityConfirmTitle"
        );

    const textElement =
        supportChatElement(
            "priorityConfirmText"
        );

    const confirmBtn =
        supportChatElement(
            "confirmPriorityBtn"
        );


    if (titleElement) {

        titleElement.textContent =
            actionWord +
            " " +
            count +
            " " +
            noun +
            " " +
            actionPrep +
            " Priority?";

    }


    if (textElement) {

        textElement.textContent =
            newPriority
                ? "The selected " + noun + " will be marked as priority."
                : "The selected " + noun + " will be removed from priority.";

    }


    if (confirmBtn) {

        confirmBtn.textContent =
            actionWord;

    }


    const modal =
        supportChatElement(
            "priorityConfirmModal"
        );


    if (modal) {

        modal.classList.remove(
            "hidden"
        );

    }

}


// ======================================================
// CLOSE PRIORITY CONFIRMATION
// ======================================================

function closePriorityConfirmation() {

    const modal =
        supportChatElement(
            "priorityConfirmModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }


    priorityActionIds =
        [];

    priorityActionValue =
        null;

}


// ======================================================
// CONFIRM PRIORITY ACTION
// (applies the recorded add/remove decision to every
// chat captured at confirmation time)
// ======================================================

function confirmPriorityAction() {

    individualChats.forEach(
        function(chat) {

            if (
                priorityActionIds.includes(
                    chat.id
                )
            ) {

                chat.priority =
                    priorityActionValue;

            }

        }
    );


    exitChatSelectionMode();


    closePriorityConfirmation();


    renderIndividualChats();

}


// ======================================================
// CONFIRM DELETE SELECTED CHATS
// (opens the shared delete-confirmation modal,
// generalized to accept one or many chat ids)
// ======================================================

function confirmDeleteSelectedChats() {

    if (selectedChatIds.length === 0) {

        closeChatActionsModal();

        return;

    }


    hideChatActionsModal();


    deleteActionType =
        "bulkChats";

    deleteActionIds =
        [...selectedChatIds];

    deleteActionChatType =
        chatSelectionType;


    const count =
        selectedChatIds.length;

    const noun =
        chatSelectionType === "group"
            ? (
                count === 1
                    ? "group"
                    : "groups"
              )
            : (
                count === 1
                    ? "conversation"
                    : "conversations"
              );


    const titleElement =
        supportChatElement(
            "deleteConfirmTitle"
        );

    const textElement =
        supportChatElement(
            "deleteConfirmText"
        );


    if (titleElement) {

        titleElement.textContent =
            "Delete " +
            count +
            " " +
            noun +
            "?";

    }


    if (textElement) {

        textElement.textContent =
            "This will permanently delete the selected " +
            noun +
            ". This action cannot be undone.";

    }

      const confirmBtn =
        supportChatElement(
            "confirmDeleteBtn"
        );


    if (confirmBtn) {

        confirmBtn.textContent =
            "Delete";

    }


    const modal =
        supportChatElement(
            "deleteConfirmModal"
        );


    if (modal) {

        modal.classList.remove(
            "hidden"
        );

    }

}

// ======================================================
// CANCEL SELECTION ON OUTSIDE CLICK
// (any click that lands outside the selection bar, the
// chat actions modal, the confirmation modals, or a chat
// list item itself cancels the current selection and
// closes whichever of those modals is open — this also
// fixes the individual/group switch and filter buttons,
// since they count as "outside" and are handled by the
// same check, with no extra code needed in those
// functions)
// ======================================================

function setupChatSelectionOutsideClick() {

    document.addEventListener(
        "click",
        function(event) {

            if (!chatSelectionMode) {

                return;

            }


            const isInsideSelectionUI =
                event.target.closest(
                    "#chatSelectionBar, " +
                    "#chatActionsModal, " +
                    "#deleteConfirmModal, " +
                    "#priorityConfirmModal, " +
                    ".chat-list-item"
                );


            if (isInsideSelectionUI) {

                return;

            }


            exitChatSelectionMode();

            closeChatActionsModal();

            closeDeleteConfirmation();

            closePriorityConfirmation();

        },
        true
        // capture phase — this runs BEFORE the clicked
        // element's own onclick (e.g. showIndividualChats,
        // filterChats), so selection is already cleared
        // by the time those functions run
    );

}


// ======================================================
// GLOBAL ACCESS — STAGE 12
// ======================================================

window.exitChatSelectionMode = exitChatSelectionMode;
window.closeChatActionsModal = closeChatActionsModal;
window.chooseBulkDeleteMode = chooseBulkDeleteMode;
window.chooseBulkPriorityMode = chooseBulkPriorityMode;
window.confirmDeleteSelectedChats = confirmDeleteSelectedChats;
window.confirmPrioritySelectedChats = confirmPrioritySelectedChats;
window.closePriorityConfirmation = closePriorityConfirmation;
window.confirmPriorityAction = confirmPriorityAction;
window.deleteChatFromProfile = deleteChatFromProfile;


// ==========================================================================
// SUPPORT CHAT SYSTEM
// STAGE 13 — SELF-INITIALIZATION
// ==========================================================================
//
// support-chat.html is injected into admin.html's DOM at runtime by
// admin.js rather than loaded as its own page, so a normal script-load
// or DOMContentLoaded moment cannot be relied on to run
// initSupportChatPage() — the markup may not exist yet, or may not
// exist at all if this script loaded once, up front.
//
// This watcher detects the moment ".support-chat" actually appears
// in the DOM (now, or later if it hasn't been injected yet) and
// initializes it automatically. It keeps watching afterward so that
// if admin.js ever removes and re-injects the support chat markup
// (e.g. navigating away from and back to the support tab), it will
// be initialized again. initSupportChatPage() already guards itself
// against double-initializing the same DOM node, so this is safe to
// call as often as mutations occur.
// ==========================================================================

(function watchForSupportChatMount() {

    function attemptSupportChatInit() {

        const supportChat =
            document.querySelector(
                ".support-chat"
            );


        if (supportChat) {

            initSupportChatPage();

        }

    }


    function startWatching() {

        attemptSupportChatInit();


        const observer =
            new MutationObserver(
                attemptSupportChatInit
            );


        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );

    }


    if (document.body) {

        startWatching();

    }
    else {

        document.addEventListener(
            "DOMContentLoaded",
            startWatching
        );

    }

})();


/* ===== js/settings.js ===== */
/* =========================================================
   KT CLOUD MINING ADMIN
   SETTINGS / CONTENT MANAGEMENT — wired to real Supabase
   tables + Storage (bucket: "content")
   ========================================================= */

let settingsVideos = [];
let settingsGuides = [];
let settingsTutorials = [];
let settingsDownloads = [];
let settingsMedia = [];


/* =========================================================
   SHARED HELPERS
   ========================================================= */

function generateSettingsId(prefix) {
    return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

function escapeSettingsHTML(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
}

function capitalizeSettings(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatSettingsCategory(cat) {
    if (!cat) return "Uncategorized";
    return cat.split("-").map(capitalizeSettings).join(" ");
}

function formatSettingsDeleteType(type) {
    return type;
}

function formatFileSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// Uploads a file into the shared "content" storage bucket under
// the given folder, and returns its public URL.
function uploadContentFile(file, folder) {

    const path = folder + "/" + Date.now() + "_" + file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");

    return sb.storage.from("content").upload(path, file)
        .then(({ error }) => {

            if (error) throw error;

            const { data } = sb.storage.from("content").getPublicUrl(path);

            return data.publicUrl;

        });

}


/* =========================================================
   INITIALIZE SETTINGS PAGE
   ========================================================= */

function initSettings() {

    console.log("Initializing KT Settings page...");

    loadSettingsData();

    showSettingsTab("overview");

    console.log("KT Settings page initialized.");
}


/* =========================================================
   LOAD ALL CONTENT FROM SUPABASE
   ========================================================= */

function loadSettingsData() {

    sb.from("videos").select("*").order("sort_order")
        .then(({ data, error }) => {
            if (!error) {
                settingsVideos = data.map(v => ({
                    id: v.id, title: v.title, category: v.category,
                    status: v.status, description: v.description,
                    url: v.url, fileName: v.file_name,
                    thumbnail: v.thumbnail_url, order: v.sort_order
                }));
                renderSettingsVideos();
                renderSettingsOverview();
            }
        });

    sb.from("content_guides").select("*").order("sort_order")
        .then(({ data, error }) => {
            if (!error) {
                settingsGuides = data.map(g => ({
                    id: g.id, title: g.title, category: g.category,
                    status: g.status, description: g.description,
                    content: g.content, video: g.video_url,
                    image: g.image_url, order: g.sort_order
                }));
                renderSettingsGuides();
                renderSettingsOverview();
            }
        });

    sb.from("content_tutorials").select("*").order("sort_order")
        .then(({ data, error }) => {
            if (!error) {
                settingsTutorials = data.map(t => ({
                    id: t.id, title: t.title, category: t.category,
                    status: t.status, description: t.description,
                    content: t.content, video: t.video_url,
                    images: t.images || [], order: t.sort_order
                }));
                renderSettingsTutorials();
                renderSettingsOverview();
            }
        });

    sb.from("content_downloads").select("*").order("sort_order")
        .then(({ data, error }) => {
            if (!error) {
                settingsDownloads = data.map(d => ({
                    id: d.id, title: d.title, category: d.category,
                    status: d.status, description: d.description,
                    url: d.file_url, fileName: d.file_name,
                    fileType: d.file_type, fileSize: d.file_size,
                    order: d.sort_order
                }));
                renderSettingsDownloads();
                renderSettingsOverview();
            }
        });

    sb.from("content_media").select("*").order("created_at", { ascending: false })
        .then(({ data, error }) => {
            if (!error) {
                settingsMedia = data.map(m => ({
                    id: m.id, title: m.title, type: m.type,
                    description: m.description, usage: m.usage,
                    fileName: m.file_name, fileType: m.file_type,
                    fileSize: m.file_size, used: m.used,
                    preview: m.type === "image" ? m.file_url : "",
                    url: m.file_url
                }));
                renderSettingsMedia();
                renderSettingsOverview();
            }
        });

}


/* =========================================================
   OVERVIEW COUNTS
   ========================================================= */

function renderSettingsOverview() {

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    set("settingsVideoCount", settingsVideos.length);
    set("settingsGuideCount", settingsGuides.length);
    set("settingsTutorialCount", settingsTutorials.length);
    set("settingsDownloadCount", settingsDownloads.length);
    set("settingsPhotoCount", settingsMedia.filter(m => m.type === "image").length);
    set("settingsFileCount", settingsMedia.filter(m => m.type !== "image").length);

}


/* =========================================================
   TABS
   ========================================================= */

function showSettingsTab(tabName) {

    document.querySelectorAll(".settings-section")
        .forEach(section => section.classList.remove("active"));

    document.querySelectorAll(".settings-tab")
        .forEach(tab => tab.classList.remove("active"));

    const selectedSection = document.getElementById("settings-" + tabName);
    if (selectedSection) selectedSection.classList.add("active");

    const selectedTab = document.querySelector('.settings-tab[data-tab="' + tabName + '"]');
    if (selectedTab) selectedTab.classList.add("active");

}


/* =========================================================
   VIDEOS
   ========================================================= */

function openAddVideoModal() {

    const modal = document.getElementById("settingsVideoModal");
    const form = document.getElementById("videoForm");

    if (!modal) return;
    if (form) form.reset();

    document.getElementById("videoEditId").value = "";
    document.getElementById("videoModalTitle").textContent = "Add Video";

    modal.classList.add("active");
}

function closeVideoModal() {
    document.getElementById("settingsVideoModal").classList.remove("active");
}

function editSettingsVideo(id) {

    const video = settingsVideos.find(v => v.id === id);
    if (!video) return;

    document.getElementById("videoEditId").value = video.id;
    document.getElementById("videoTitle").value = video.title || "";
    document.getElementById("videoCategory").value = video.category || "";
    document.getElementById("videoStatus").value = video.status || "active";
    document.getElementById("videoDescription").value = video.description || "";
    document.getElementById("videoUrl").value = video.url || "";
    document.getElementById("videoOrder").value = video.order || 0;

    document.getElementById("videoModalTitle").textContent = "Edit Video";
    document.getElementById("settingsVideoModal").classList.add("active");

}

function saveSettingsVideo(event) {

    event.preventDefault();

    const editId = document.getElementById("videoEditId").value;
    const title = document.getElementById("videoTitle").value.trim();
    const category = document.getElementById("videoCategory").value;
    const status = document.getElementById("videoStatus").value;
    const description = document.getElementById("videoDescription").value.trim();
    const videoUrl = document.getElementById("videoUrl").value.trim();
    const videoFile = document.getElementById("videoFile");
    const thumbnailInput = document.getElementById("videoThumbnail");
    const displayOrder = parseInt(document.getElementById("videoOrder").value) || 0;

    if (!title) { alert("Please enter a video title."); return; }
    if (!category) { alert("Please select a video category."); return; }

    const existing = editId ? settingsVideos.find(v => v.id === editId) : null;

    const payload = {
        title, category, status, description,
        sort_order: displayOrder
    };

    Promise.resolve()

        .then(() => {

            // A real video file was uploaded — store it and use its URL
            if (videoFile && videoFile.files.length > 0) {
                payload.file_name = videoFile.files[0].name;
                return uploadContentFile(videoFile.files[0], "videos").then(url => {
                    payload.url = url;
                });
            }

            // Otherwise use the pasted URL (e.g. a YouTube link)
            payload.url = videoUrl || (existing ? existing.url : "");
            payload.file_name = existing ? existing.fileName : "";

        })

        .then(() => {

            if (thumbnailInput && thumbnailInput.files.length > 0) {
                return uploadContentFile(thumbnailInput.files[0], "thumbnails").then(url => {
                    payload.thumbnail_url = url;
                });
            }

        })

        .then(() => {

            if (editId) {
                return sb.from("videos").update(payload).eq("id", editId);
            } else {
                return sb.from("videos").insert(payload);
            }

        })

        .then(({ error }) => {

            if (error) {
                alert("Failed to save video: " + error.message);
                return;
            }

            loadSettingsData();
            closeVideoModal();
            alert(editId ? "Video updated successfully." : "Video added successfully.");

        })

        .catch(error => {
            alert("Upload failed: " + error.message);
        });

}

function renderSettingsVideos(videos) {

    const container = document.getElementById("settingsVideoList");
    if (!container) return;

    const list = videos || settingsVideos;

    if (list.length === 0) {
        container.innerHTML =
            '<div class="settings-empty-state">' +
                '<i class="fa-solid fa-film"></i>' +
                '<h3>No Educational Videos</h3>' +
                '<p>Add educational videos for users to watch.</p>' +
            '</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(video => {

        const item = document.createElement("div");
        item.className = "settings-content-item";

        const thumbnail = video.thumbnail
            ? '<img src="' + video.thumbnail + '" alt="Video thumbnail">'
            : '<i class="fa-solid fa-film"></i>';

        item.innerHTML =
            '<div class="settings-content-thumbnail">' + thumbnail + '</div>' +
            '<div class="settings-content-info">' +
                '<h3 class="settings-content-title">' + escapeSettingsHTML(video.title) + '</h3>' +
                '<p class="settings-content-description">' +
                    escapeSettingsHTML(video.description || "No description available.") +
                '</p>' +
                '<div class="settings-content-meta">' +
                    '<span class="settings-badge settings-badge-category">' +
                        escapeSettingsHTML(formatSettingsCategory(video.category)) +
                    '</span>' +
                    '<span class="settings-badge ' +
                        (video.status === "active" ? "settings-badge-active" : "settings-badge-inactive") +
                    '">' + escapeSettingsHTML(capitalizeSettings(video.status)) + '</span>' +
                    '<span class="settings-badge settings-badge-category">Order: ' + Number(video.order || 0) + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="settings-content-actions">' +
                '<button type="button" class="settings-content-action" title="Edit Video" onclick="editSettingsVideo(\'' + video.id + '\')">' +
                    '<i class="fa-solid fa-pen"></i>' +
                '</button>' +
                '<button type="button" class="settings-content-action delete" title="Delete Video" onclick="openSettingsDeleteModal(\'' + video.id + '\', \'video\')">' +
                    '<i class="fa-solid fa-trash"></i>' +
                '</button>' +
            '</div>';

        container.appendChild(item);

    });

}


/* =========================================================
   GUIDES
   ========================================================= */

function openAddGuideModal() {

    const modal = document.getElementById("settingsGuideModal");
    const form = document.getElementById("guideForm");

    if (!modal) return;
    if (form) form.reset();

    document.getElementById("guideEditId").value = "";
    document.getElementById("guideModalTitle").textContent = "Add Guide";

    modal.classList.add("active");
}

function closeGuideModal() {
    document.getElementById("settingsGuideModal").classList.remove("active");
}

function editSettingsGuide(id) {

    const guide = settingsGuides.find(g => g.id === id);
    if (!guide) return;

    document.getElementById("guideEditId").value = guide.id;
    document.getElementById("guideTitle").value = guide.title || "";
    document.getElementById("guideCategory").value = guide.category || "";
    document.getElementById("guideStatus").value = guide.status || "active";
    document.getElementById("guideDescription").value = guide.description || "";
    document.getElementById("guideContent").value = guide.content || "";
    document.getElementById("guideVideo").value = guide.video || "";
    document.getElementById("guideOrder").value = guide.order || 0;

    document.getElementById("guideModalTitle").textContent = "Edit Guide";
    document.getElementById("settingsGuideModal").classList.add("active");

}

function saveSettingsGuide(event) {

    event.preventDefault();

    const editId = document.getElementById("guideEditId").value;
    const title = document.getElementById("guideTitle").value.trim();
    const category = document.getElementById("guideCategory").value;

    if (!title) { alert("Please enter a guide title."); return; }
    if (!category) { alert("Please select a guide category."); return; }

    const payload = {
        title, category,
        status: document.getElementById("guideStatus").value,
        description: document.getElementById("guideDescription").value.trim(),
        content: document.getElementById("guideContent").value.trim(),
        video_url: document.getElementById("guideVideo").value.trim(),
        sort_order: parseInt(document.getElementById("guideOrder").value) || 0
    };

    const imageInput = document.getElementById("guideImage");

    Promise.resolve()

        .then(() => {
            if (imageInput && imageInput.files && imageInput.files.length > 0) {
                return uploadContentFile(imageInput.files[0], "guides").then(url => {
                    payload.image_url = url;
                });
            }
        })

        .then(() => {
            if (editId) {
                return sb.from("content_guides").update(payload).eq("id", editId);
            } else {
                return sb.from("content_guides").insert(payload);
            }
        })

        .then(({ error }) => {

            if (error) {
                alert("Failed to save guide: " + error.message);
                return;
            }

            loadSettingsData();
            closeGuideModal();
            alert(editId ? "Guide updated successfully." : "Guide added successfully.");

        })

        .catch(error => alert("Upload failed: " + error.message));

}

function renderSettingsGuides(guides) {

    const container = document.getElementById("settingsGuideList");
    if (!container) return;

    const list = guides || settingsGuides;

    if (list.length === 0) {
        container.innerHTML =
            '<div class="settings-empty-state">' +
                '<i class="fa-solid fa-book"></i>' +
                '<h3>No Guides</h3>' +
                '<p>Add help guides for users to read.</p>' +
            '</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(guide => {

        const item = document.createElement("div");
        item.className = "settings-content-item";

        const thumbnail = guide.image
            ? '<img src="' + guide.image + '" alt="Guide image">'
            : '<i class="fa-solid fa-book"></i>';

        item.innerHTML =
            '<div class="settings-content-thumbnail">' + thumbnail + '</div>' +
            '<div class="settings-content-info">' +
                '<h3 class="settings-content-title">' + escapeSettingsHTML(guide.title) + '</h3>' +
                '<p class="settings-content-description">' +
                    escapeSettingsHTML(guide.description || "No description available.") +
                '</p>' +
                '<div class="settings-content-meta">' +
                    '<span class="settings-badge settings-badge-category">' +
                        escapeSettingsHTML(formatSettingsCategory(guide.category)) +
                    '</span>' +
                    '<span class="settings-badge ' +
                        (guide.status === "active" ? "settings-badge-active" : "settings-badge-inactive") +
                    '">' + escapeSettingsHTML(capitalizeSettings(guide.status)) + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="settings-content-actions">' +
                '<button type="button" class="settings-content-action" title="Edit Guide" onclick="editSettingsGuide(\'' + guide.id + '\')">' +
                    '<i class="fa-solid fa-pen"></i>' +
                '</button>' +
                '<button type="button" class="settings-content-action delete" title="Delete Guide" onclick="openSettingsDeleteModal(\'' + guide.id + '\', \'guide\')">' +
                    '<i class="fa-solid fa-trash"></i>' +
                '</button>' +
            '</div>';

        container.appendChild(item);

    });

}


/* =========================================================
   TUTORIALS
   ========================================================= */

function openAddTutorialModal() {

    const modal = document.getElementById("settingsTutorialModal");
    const form = document.getElementById("tutorialForm");

    if (!modal) return;
    if (form) form.reset();

    document.getElementById("tutorialEditId").value = "";
    document.getElementById("tutorialModalTitle").textContent = "Add Tutorial";

    modal.classList.add("active");
}

function closeTutorialModal() {
    document.getElementById("settingsTutorialModal").classList.remove("active");
}

function editSettingsTutorial(id) {

    const tutorial = settingsTutorials.find(t => t.id === id);
    if (!tutorial) return;

    document.getElementById("tutorialEditId").value = tutorial.id;
    document.getElementById("tutorialTitle").value = tutorial.title || "";
    document.getElementById("tutorialCategory").value = tutorial.category || "";
    document.getElementById("tutorialStatus").value = tutorial.status || "active";
    document.getElementById("tutorialDescription").value = tutorial.description || "";
    document.getElementById("tutorialContent").value = tutorial.content || "";
    document.getElementById("tutorialVideo").value = tutorial.video || "";
    document.getElementById("tutorialOrder").value = tutorial.order || 0;

    document.getElementById("tutorialModalTitle").textContent = "Edit Tutorial";
    document.getElementById("settingsTutorialModal").classList.add("active");

}

function saveSettingsTutorial(event) {

    event.preventDefault();

    const editId = document.getElementById("tutorialEditId").value;
    const title = document.getElementById("tutorialTitle").value.trim();
    const category = document.getElementById("tutorialCategory").value;

    if (!title) { alert("Please enter a tutorial title."); return; }
    if (!category) { alert("Please select a tutorial category."); return; }

    const payload = {
        title, category,
        status: document.getElementById("tutorialStatus").value,
        description: document.getElementById("tutorialDescription").value.trim(),
        content: document.getElementById("tutorialContent").value.trim(),
        video_url: document.getElementById("tutorialVideo").value.trim(),
        sort_order: parseInt(document.getElementById("tutorialOrder").value) || 0
    };

    const imagesInput = document.getElementById("tutorialImages");
    const existing = editId ? settingsTutorials.find(t => t.id === editId) : null;

    Promise.resolve()

        .then(() => {

            if (imagesInput && imagesInput.files && imagesInput.files.length > 0) {

                const uploads = Array.from(imagesInput.files).map(file =>
                    uploadContentFile(file, "tutorials")
                );

                return Promise.all(uploads).then(urls => {
                    payload.images = (existing ? existing.images : []).concat(urls);
                });

            } else {
                payload.images = existing ? existing.images : [];
            }

        })

        .then(() => {
            if (editId) {
                return sb.from("content_tutorials").update(payload).eq("id", editId);
            } else {
                return sb.from("content_tutorials").insert(payload);
            }
        })

        .then(({ error }) => {

            if (error) {
                alert("Failed to save tutorial: " + error.message);
                return;
            }

            loadSettingsData();
            closeTutorialModal();
            alert(editId ? "Tutorial updated successfully." : "Tutorial added successfully.");

        })

        .catch(error => alert("Upload failed: " + error.message));

}

function renderSettingsTutorials(tutorials) {

    const container = document.getElementById("settingsTutorialList");
    if (!container) return;

    const list = tutorials || settingsTutorials;

    if (list.length === 0) {
        container.innerHTML =
            '<div class="settings-empty-state">' +
                '<i class="fa-solid fa-graduation-cap"></i>' +
                '<h3>No Tutorials</h3>' +
                '<p>Add step-by-step tutorials for users.</p>' +
            '</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(tutorial => {

        const item = document.createElement("div");
        item.className = "settings-content-item";

        const thumbnail = (tutorial.images && tutorial.images.length > 0)
            ? '<img src="' + tutorial.images[0] + '" alt="Tutorial image">'
            : '<i class="fa-solid fa-graduation-cap"></i>';

        item.innerHTML =
            '<div class="settings-content-thumbnail">' + thumbnail + '</div>' +
            '<div class="settings-content-info">' +
                '<h3 class="settings-content-title">' + escapeSettingsHTML(tutorial.title) + '</h3>' +
                '<p class="settings-content-description">' +
                    escapeSettingsHTML(tutorial.description || "No description available.") +
                '</p>' +
                '<div class="settings-content-meta">' +
                    '<span class="settings-badge settings-badge-category">' +
                        escapeSettingsHTML(formatSettingsCategory(tutorial.category)) +
                    '</span>' +
                    '<span class="settings-badge ' +
                        (tutorial.status === "active" ? "settings-badge-active" : "settings-badge-inactive") +
                    '">' + escapeSettingsHTML(capitalizeSettings(tutorial.status)) + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="settings-content-actions">' +
                '<button type="button" class="settings-content-action" title="Edit Tutorial" onclick="editSettingsTutorial(\'' + tutorial.id + '\')">' +
                    '<i class="fa-solid fa-pen"></i>' +
                '</button>' +
                '<button type="button" class="settings-content-action delete" title="Delete Tutorial" onclick="openSettingsDeleteModal(\'' + tutorial.id + '\', \'tutorial\')">' +
                    '<i class="fa-solid fa-trash"></i>' +
                '</button>' +
            '</div>';

        container.appendChild(item);

    });

}


/* =========================================================
   DOWNLOADS
   ========================================================= */

function openAddDownloadModal() {

    const modal = document.getElementById("settingsDownloadModal");
    const form = document.getElementById("downloadForm");

    if (!modal) return;
    if (form) form.reset();

    document.getElementById("downloadEditId").value = "";
    document.getElementById("downloadModalTitle").textContent = "Add Download";

    modal.classList.add("active");
}

function closeDownloadModal() {
    document.getElementById("settingsDownloadModal").classList.remove("active");
}

function editSettingsDownload(id) {

    const item = settingsDownloads.find(d => d.id === id);
    if (!item) return;

    document.getElementById("downloadEditId").value = item.id;
    document.getElementById("downloadTitle").value = item.title || "";
    document.getElementById("downloadCategory").value = item.category || "";
    document.getElementById("downloadStatus").value = item.status || "active";
    document.getElementById("downloadDescription").value = item.description || "";
    document.getElementById("downloadUrl").value = item.url || "";
    document.getElementById("downloadOrder").value = item.order || 0;

    document.getElementById("downloadModalTitle").textContent = "Edit Download";
    document.getElementById("settingsDownloadModal").classList.add("active");

}

function saveSettingsDownload(event) {

    event.preventDefault();

    const editId = document.getElementById("downloadEditId").value;
    const title = document.getElementById("downloadTitle").value.trim();
    const category = document.getElementById("downloadCategory").value;
    const fileInput = document.getElementById("downloadFile");
    const urlValue = document.getElementById("downloadUrl").value.trim();
    const existing = editId ? settingsDownloads.find(d => d.id === editId) : null;

    if (!title) { alert("Please enter a file name."); return; }
    if (!category) { alert("Please select a category."); return; }

    if (!urlValue && (!fileInput || fileInput.files.length === 0) && !existing) {
        alert("Please provide a file or file URL.");
        return;
    }

    const payload = {
        title, category,
        status: document.getElementById("downloadStatus").value,
        description: document.getElementById("downloadDescription").value.trim(),
        sort_order: parseInt(document.getElementById("downloadOrder").value) || 0
    };

    Promise.resolve()

        .then(() => {

            if (fileInput && fileInput.files.length > 0) {

                const file = fileInput.files[0];
                payload.file_name = file.name;
                payload.file_type = file.type;
                payload.file_size = file.size;

                return uploadContentFile(file, "downloads").then(url => {
                    payload.file_url = url;
                });

            } else {

                payload.file_url = urlValue || (existing ? existing.url : "");
                payload.file_name = existing ? existing.fileName : "";
                payload.file_type = existing ? existing.fileType : "";
                payload.file_size = existing ? existing.fileSize : 0;

            }

        })

        .then(() => {
            if (editId) {
                return sb.from("content_downloads").update(payload).eq("id", editId);
            } else {
                return sb.from("content_downloads").insert(payload);
            }
        })

        .then(({ error }) => {

            if (error) {
                alert("Failed to save download: " + error.message);
                return;
            }

            loadSettingsData();
            closeDownloadModal();
            alert(editId ? "Download updated successfully." : "Download added successfully.");

        })

        .catch(error => alert("Upload failed: " + error.message));

}

function renderSettingsDownloads(downloads) {

    const container = document.getElementById("settingsDownloadList");
    if (!container) return;

    const list = downloads || settingsDownloads;

    if (list.length === 0) {
        container.innerHTML =
            '<div class="settings-empty-state">' +
                '<i class="fa-solid fa-file-arrow-down"></i>' +
                '<h3>No Downloads</h3>' +
                '<p>Add downloadable files for users.</p>' +
            '</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(item => {

        const el = document.createElement("div");
        el.className = "settings-content-item";

        el.innerHTML =
            '<div class="settings-content-thumbnail"><i class="fa-solid fa-file-arrow-down"></i></div>' +
            '<div class="settings-content-info">' +
                '<h3 class="settings-content-title">' + escapeSettingsHTML(item.title) + '</h3>' +
                '<p class="settings-content-description">' +
                    escapeSettingsHTML(item.description || "No description available.") +
                '</p>' +
                '<div class="settings-content-meta">' +
                    '<span class="settings-badge settings-badge-category">' +
                        escapeSettingsHTML(formatSettingsCategory(item.category)) +
                    '</span>' +
                    '<span class="settings-badge ' +
                        (item.status === "active" ? "settings-badge-active" : "settings-badge-inactive") +
                    '">' + escapeSettingsHTML(capitalizeSettings(item.status)) + '</span>' +
                    (item.fileSize ? '<span class="settings-badge settings-badge-category">' + formatFileSize(item.fileSize) + '</span>' : '') +
                '</div>' +
            '</div>' +
            '<div class="settings-content-actions">' +
                '<button type="button" class="settings-content-action" title="Edit" onclick="editSettingsDownload(\'' + item.id + '\')">' +
                    '<i class="fa-solid fa-pen"></i>' +
                '</button>' +
                '<button type="button" class="settings-content-action delete" title="Delete" onclick="openSettingsDeleteModal(\'' + item.id + '\', \'download\')">' +
                    '<i class="fa-solid fa-trash"></i>' +
                '</button>' +
            '</div>';

        container.appendChild(el);

    });

}


/* =========================================================
   MEDIA LIBRARY
   ========================================================= */

function openUploadMediaModal() {

    const form = document.getElementById("mediaForm");
    if (form) form.reset();

    document.getElementById("settingsMediaModal").classList.add("active");
}

function closeMediaModal() {
    document.getElementById("settingsMediaModal").classList.remove("active");
}

function saveSettingsMedia(event) {

    event.preventDefault();

    const title = document.getElementById("mediaTitle").value.trim();
    const type = document.getElementById("mediaType").value;
    const description = document.getElementById("mediaDescription").value.trim();
    const fileInput = document.getElementById("mediaFile");
    const usage = document.getElementById("mediaUsage").value;

    if (!title) { alert("Please enter a media name."); return; }
    if (!type) { alert("Please select a media type."); return; }
    if (!fileInput || fileInput.files.length === 0) { alert("Please select a file."); return; }

    const file = fileInput.files[0];

    uploadContentFile(file, "media")

        .then(url => {

            return sb.from("content_media").insert({
                title, type, description, usage,
                file_url: url,
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
                used: false
            });

        })

        .then(({ error }) => {

            if (error) {
                alert("Failed to save media: " + error.message);
                return;
            }

            loadSettingsData();
            closeMediaModal();
            alert("Media uploaded successfully.");

        })

        .catch(error => alert("Upload failed: " + error.message));

}

function renderSettingsMedia(media) {

    const container = document.getElementById("settingsMediaList");
    if (!container) return;

    const list = media || settingsMedia;

    if (list.length === 0) {
        container.innerHTML =
            '<div class="settings-empty-state">' +
                '<i class="fa-solid fa-photo-film"></i>' +
                '<h3>No Media Files</h3>' +
                '<p>Upload images and files to your media library.</p>' +
            '</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(item => {

        const el = document.createElement("div");
        el.className = "settings-content-item";

        const thumbnail = item.type === "image" && item.preview
            ? '<img src="' + item.preview + '" alt="' + escapeSettingsHTML(item.title) + '">'
            : '<i class="fa-solid fa-file"></i>';

        el.innerHTML =
            '<div class="settings-content-thumbnail">' + thumbnail + '</div>' +
            '<div class="settings-content-info">' +
                '<h3 class="settings-content-title">' + escapeSettingsHTML(item.title) + '</h3>' +
                '<p class="settings-content-description">' +
                    escapeSettingsHTML(item.description || "No description.") +
                '</p>' +
                '<div class="settings-content-meta">' +
                    '<span class="settings-badge settings-badge-category">' + escapeSettingsHTML(item.type) + '</span>' +
                    '<span class="settings-badge settings-badge-category">' + formatFileSize(item.fileSize) + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="settings-content-actions">' +
                '<button type="button" class="settings-content-action delete" title="Delete" onclick="openSettingsDeleteModal(\'' + item.id + '\', \'media\')">' +
                    '<i class="fa-solid fa-trash"></i>' +
                '</button>' +
            '</div>';

        container.appendChild(el);

    });

}


/* =========================================================
   DELETE (shared across all 5 content types)
   ========================================================= */

function openSettingsDeleteModal(id, type) {

    document.getElementById("settingsDeleteId").value = id;
    document.getElementById("settingsDeleteType").value = type;

    const message = document.getElementById("settingsDeleteMessage");
    if (message) {
        message.textContent =
            "Are you sure you want to delete this " + formatSettingsDeleteType(type) + "? This action cannot be undone.";
    }

    document.getElementById("settingsDeleteModal").classList.add("active");

}

function closeSettingsDeleteModal() {
    document.getElementById("settingsDeleteModal").classList.remove("active");
}

const SETTINGS_DELETE_TABLES = {
    video: "videos",
    guide: "content_guides",
    tutorial: "content_tutorials",
    download: "content_downloads",
    media: "content_media"
};

function confirmSettingsDelete() {

    const id = document.getElementById("settingsDeleteId").value;
    const type = document.getElementById("settingsDeleteType").value;

    if (!id || !type) return;

    const table = SETTINGS_DELETE_TABLES[type];
    if (!table) return;

    sb.from(table).delete().eq("id", id)

        .then(({ error }) => {

            closeSettingsDeleteModal();

            if (error) {
                alert("Failed to delete: " + error.message);
                return;
            }

            loadSettingsData();

        });

}


/* ===== js/dashboard.js ===== */
// =====================================
// DASHBOARD
// =====================================


// =====================================
// SAMPLE DATA
// Used as a fallback while /api/dashboard/stats
// isn't connected yet. Once your backend is live,
// this is only used if the request fails.
// =====================================

const dashboardSampleStats = {

    totalUsers: 12540,

    activePlans: 8,

    totalDeposits: 850000,

    totalWithdrawals: 320500

};



// =====================================
// FORMAT HELPERS
// =====================================

function formatNumber(value){

    return Number(value).toLocaleString("en-US");

}


function formatCurrency(value){

    return "M " + formatNumber(value);

}



// =====================================
// RENDER STATS INTO THE CARDS
// =====================================

function renderDashboardStats(stats){

    document.getElementById("statTotalUsers").textContent =
        formatNumber(stats.totalUsers);

    document.getElementById("statActivePlans").textContent =
        formatNumber(stats.activePlans);

    document.getElementById("statTotalDeposits").textContent =
        formatCurrency(stats.totalDeposits);

    document.getElementById("statTotalWithdrawals").textContent =
        formatCurrency(stats.totalWithdrawals);

}



// =====================================
// LOAD STATS FROM BACKEND
// =====================================

function loadDashboardStats(){

    sb.rpc("get_dashboard_stats")

        .then(({ data, error }) => {

            if(error){

                throw error;

            }

            const row = data[0];

            renderDashboardStats({
                totalUsers: row.total_users,
                activePlans: row.active_plans,
                totalDeposits: row.total_deposits,
                totalWithdrawals: row.total_withdrawals
            });

        })

        .catch(error => {

            console.warn(
                "Dashboard stats request failed, using sample data:",
                error
            );

            renderDashboardStats(dashboardSampleStats);

        });

}



// =====================================
// INIT DASHBOARD
// =====================================

function initDashboard(){

    console.log("Dashboard initialized");

    loadDashboardStats();

}
