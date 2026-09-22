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

// =========================================================
// ADMIN DEVICE / CLIENT INFORMATION
// =========================================================

function getAdminClientInfo(){
    const ua = navigator.userAgent || "";

    let deviceName = "Unknown device";
    let osName = "Unknown";
    let osVersion = "Unknown";

    const androidMatch = ua.match(/Android\s+([0-9.]+)/i);

    if(androidMatch){
        osName = "Android";
        osVersion = androidMatch[1];

        const modelMatch = ua.match(
            /Android\s+[0-9.]+;\s*(?:[a-z]{2}-[A-Z]{2};\s*)?([^;)]+?)(?:\s+Build\/|\))/i
        );

        if(modelMatch && modelMatch[1]){
            deviceName = modelMatch[1].trim();
        }
    }
    else if(/iPhone/i.test(ua)){
        osName = "iOS";
        deviceName = "iPhone";
    }
    else if(/iPad/i.test(ua)){
        osName = "iOS";
        deviceName = "iPad";
    }
    else if(/Windows NT/i.test(ua)){
        osName = "Windows";
        deviceName = "Windows device";

        const windowsMatch = ua.match(/Windows NT\s+([0-9.]+)/i);
        if(windowsMatch){
            osVersion = windowsMatch[1];
        }
    }
    else if(/Mac OS X/i.test(ua)){
        osName = "macOS";
        deviceName = "Mac";

        const macMatch = ua.match(/Mac OS X\s+([0-9_]+)/i);
        if(macMatch){
            osVersion = macMatch[1].replace(/_/g, ".");
        }
    }

    let deviceId = localStorage.getItem("kt_admin_device_id");

    if(!deviceId){
        if(typeof crypto !== "undefined" && crypto.randomUUID){
            deviceId = crypto.randomUUID();
        }else{
            deviceId = "kt-admin-" + Date.now() + "-" + Math.random().toString(36).substring(2);
        }

        localStorage.setItem("kt_admin_device_id", deviceId);
    }

    return {
        deviceId,
        deviceName,
        osName,
        osVersion
    };
}

// =========================================================
// HANDLE AUTHENTICATED ADMIN-PANEL SESSION
// =========================================================

async function handleAuthedSession(session){

    // Always restore the logout button when entering
    // an authenticated admin session.
    resetLogoutButtonState();

    const clientInfo = getAdminClientInfo();
    const isAdmin = await checkIsAdmin(session.user.id);

    if(isAdmin){
        // Only an account that has the admin role is allowed to create
        // a successful ADMIN APP login audit record.
        sb.rpc("admin_record_successful_login", {
            p_device_id: clientInfo.deviceId,
            p_device_name: clientInfo.deviceName,
            p_os_name: clientInfo.osName,
            p_os_version: clientInfo.osVersion,
            p_approximate_location: null,
            p_session_id: null
        }).then(({ error: logError }) => {
            if(logError){
                console.warn("Admin login audit error:", logError);
            }
        });

        hideLoginOverlay();

        if(typeof loadAdminPage === "function"){
            loadAdminPage("dashboard");
        }
        return;
    }

    // A real Supabase login succeeded, but this account is not an admin.
    // This is an ADMIN APP security event, not a normal User App login.
    const { error: securityError } = await sb.rpc(
        "admin_record_non_admin_login",
        {
            p_device_id: clientInfo.deviceId,
            p_device_name: clientInfo.deviceName,
            p_os_name: clientInfo.osName,
            p_os_version: clientInfo.osVersion,
            p_approximate_location: null,
            p_session_id: null
        }
    );

    if(securityError){
        console.warn("Non-admin login audit error:", securityError);
    }

    await sb.auth.signOut();
    showLoginOverlay("This account doesn't have admin access.");
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

    const { data, error } = await sb.auth.signInWithPassword({
        email,
        password
    });

    btn.disabled = false;
    btn.textContent = "Sign In";

    if(error){
        // This RPC is explicitly for the ADMIN APP. It is separate from
        // the User App's authentication flow.
        const clientInfo = getAdminClientInfo();

        const maskedIdentifier =
            email.length > 4
                ? "******" + email.slice(-4)
                : "******";

        sb.rpc("admin_record_failed_login", {
            p_identifier_masked: maskedIdentifier,
            p_reason: "Invalid credentials",
            p_device_name: clientInfo.deviceName,
            p_os_name: clientInfo.osName,
            p_os_version: clientInfo.osVersion,
            p_approximate_location: null
        }).then(({ error: logError }) => {
            if(logError){
                console.warn("Failed-login audit error:", logError);
            }
        });

        showLoginOverlay(error.message);
        return;
    }

    await handleAuthedSession(data.session);
}

// =========================================================
// LOGOUT CONFIRMATION MODAL
// =========================================================

function openLogoutModal(){
    const modal = document.getElementById("logoutModal");
    if(!modal) return;
    modal.classList.add("show");
}

function closeLogoutModal(){
    const modal = document.getElementById("logoutModal");
    if(!modal) return;
    modal.classList.remove("show");
}

function resetLogoutButtonState(){
    const confirmBtn = document.querySelector(".logout-confirm-btn");

    if(!confirmBtn) return;

    confirmBtn.disabled = false;
    confirmBtn.textContent = "Confirm";
}

// =========================================================
// CONFIRM ADMIN LOGOUT
// =========================================================

async function confirmAdminLogout(){
    const confirmBtn = document.querySelector(".logout-confirm-btn");

    if(confirmBtn){
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Logging out...";
    }

    // The RPC is admin-specific and runs before the Supabase session is
    // destroyed so auth.uid() is still available to the database.
    const { error: auditError } = await sb.rpc("admin_record_logout");

    if(auditError){
        console.warn("Logout audit error:", auditError);
    }

    const { error } = await sb.auth.signOut();

    if(error){
        console.error("Logout failed:", error);

        if(confirmBtn){
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Confirm";
        }
        return;
    }

    resetLogoutButtonState();
    closeLogoutModal();
    showLoginOverlay();
}

function adminLogout(){
    openLogoutModal();
}

// =========================================================
// CLOSE LOGOUT MODAL — OUTSIDE CLICK
// =========================================================

document.addEventListener("click", function(event){
    const modal = document.getElementById("logoutModal");
    if(!modal) return;

    if(modal.classList.contains("show") && event.target === modal){
        closeLogoutModal();
    }
});

document.addEventListener("DOMContentLoaded", initAuth);


/* ===== js/admin.js ===== */
// ==============================
// ADMIN PAGE LOADING SYSTEM
// ==============================


const adminBody = document.getElementById("admin-body");

// ==============================
// ADMIN PAGE LOADING SYSTEM
// ==============================




// ======================================================
// GLOBAL PAGE LOADER
// ======================================================

const globalPageLoader =
    document.getElementById("global-page-loader");


let pageLoading = false;

let pageFetchRequests = 0;

let pageLoadGeneration = 0;

let pageLoadQuietTimer = null;


// ======================================================
// SHOW GLOBAL LOADER
// ======================================================

function showGlobalPageLoader(){

    if(!globalPageLoader) return;

    globalPageLoader.classList.add("show");

}


// ======================================================
// HIDE GLOBAL LOADER
// ======================================================

function hideGlobalPageLoader(){

    if(!globalPageLoader) return;

    globalPageLoader.classList.remove("show");

}


// ======================================================
// WAIT UNTIL INITIAL PAGE REQUESTS ARE FINISHED
// ======================================================

function finishGlobalPageLoading(generation){

    if(generation !== pageLoadGeneration){

        return;

    }


    clearTimeout(pageLoadQuietTimer);


    /*
     * Give the page a very short quiet period.
     *
     * This is important because page initialization can
     * start another Supabase request immediately after
     * the first request finishes.
     */

    pageLoadQuietTimer = setTimeout(()=>{

        if(generation !== pageLoadGeneration){

            return;

        }


        if(pageFetchRequests === 0){

            pageLoading = false;

            hideGlobalPageLoader();

        }

        else{

            finishGlobalPageLoading(generation);

        }

    },120);

}


// ======================================================
// TRACK FETCH REQUESTS DURING PAGE INITIALIZATION
// ======================================================
//
// Supabase requests use fetch internally.
// This allows the global loader to wait for those
// requests without changing every individual page JS.
// ======================================================

const originalFetch = window.fetch.bind(window);


window.fetch = function(...args){

    const shouldTrack =
        pageLoading === true;


    if(shouldTrack){

        pageFetchRequests++;

    }


    return originalFetch(...args)

        .finally(()=>{

            if(!shouldTrack){

                return;

            }


            pageFetchRequests--;


            if(pageFetchRequests < 0){

                pageFetchRequests = 0;

            }

        });

};


// ======================================================
// START PAGE LOADING
// ======================================================

function startGlobalPageLoading(){

    pageLoadGeneration++;

    pageLoading = true;

    pageFetchRequests = 0;

    clearTimeout(pageLoadQuietTimer);

    showGlobalPageLoader();

    return pageLoadGeneration;

}

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

// ======================================================
// ADMIN PAGE CACHE
// ======================================================

const pageCache = {};


// ======================================================
// LOAD ADMIN PAGE
// ======================================================

function loadAdminPage(page){

    const loadingGeneration =
        startGlobalPageLoading();


    adminBody.classList.remove("page-fade-in");


    const render = (data) => {

        /*
         * A newer page may have been requested while this
         * page was loading.
         *
         * If so, do not allow the older page to hide the
         * loader or overwrite the newer page.
         */

        if(
            loadingGeneration !== pageLoadGeneration
        ){

            return;

        }


        adminBody.innerHTML = data;

        adminBody.appendChild(modalOverlay);


        // Reset scroll position

        adminBody.scrollTop = 0;


        // Change active menu

        setActiveMenu(page);


        // Trigger fade-in transition

        requestAnimationFrame(()=>{

            adminBody.classList.add(
                "page-fade-in"
            );

        });


        // ==================================================
        // INITIALIZE PAGE SCRIPTS
        // ==================================================

        switch(page){

            case "transactions":

                if(
                    typeof initTransactions === "function"
                ){

                    initTransactions();

                }

            break;


            case "withdrawals":

                if(
                    typeof initWithdrawals === "function"
                ){

                    initWithdrawals();

                }

            break;


            case "deposits":

                if(
                    typeof initDeposits === "function"
                ){

                    initDeposits();

                }

            break;


            case "plans":

                if(
                    typeof initPlans === "function"
                ){

                    initPlans();

                }

            break;


            case "users":

                if(
                    typeof initUsers === "function"
                ){

                    initUsers();

                }

            break;


            case "verification":

                if(
                    typeof initVerification === "function"
                ){

                    initVerification();

                }

            break;


            case "exchange":

                if(
                    typeof initExchangeRates === "function"
                ){

                    initExchangeRates();

                }

            break;


            case "notifications":

                if(
                    typeof initNotifications === "function"
                ){

                    initNotifications();

                }

            break;


            case "activity-log":

                if(
                    typeof initActivityLogs === "function"
                ){

                    initActivityLogs();

                }

            break;


            case "support-chat":

                if(
                    typeof initSupportChatPage === "function"
                ){

                    initSupportChatPage();

                }

            break;


            case "settings":

                if(
                    typeof initSettings === "function"
                ){

                    initSettings();

                }

            break;


            case "dashboard":

                if(
                    typeof initDashboard === "function"
                ){

                    initDashboard();

                }

            break;

        }


        /*
         * The page's initialization functions above may have
         * started Supabase/fetch requests.
         *
         * Wait until those requests have finished before
         * removing the loader.
         */

        finishGlobalPageLoading(
            loadingGeneration
        );

    };


    // ==================================================
    // SERVE FROM CACHE
    // ==================================================

    if(pageCache[page]){

        render(pageCache[page]);

        return;

    }


    // ==================================================
    // LOAD PAGE HTML
    // ==================================================

    fetch(
        "admin-pages/" + page + ".html"
    )

    .then(response=>{

        if(!response.ok){

            throw new Error(
                "Page not found"
            );

        }


        return response.text();

    })

    .then(data=>{

        pageCache[page] = data;

        render(data);

    })

    .catch(error=>{

        if(
            loadingGeneration !== pageLoadGeneration
        ){

            return;

        }


        adminBody.innerHTML = `

        <div class="admin-card">

            <h2>Page Error</h2>

            <p>${error.message}</p>

        </div>

        `;


        requestAnimationFrame(()=>{

            adminBody.classList.add(
                "page-fade-in"
            );

        });


        /*
         * Even if the page fails, never leave the
         * loading spinner stuck on the screen.
         */

        pageLoading = false;

        pageFetchRequests = 0;

        hideGlobalPageLoader();

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
    admin_debit: "Debit",
    bonus: "Bonus"
};

function formatTransactionType(type, description = ""){

    const normalizedType =
        String(type || "").toLowerCase();

    const normalizedDescription =
        String(description || "").toLowerCase();

    /*
     * admin_credit is used for both:
     * - Credit Balance
     * - Add Bonus
     *
     * Bonus transactions are identified by
     * their transaction description.
     */
    if(
        normalizedType === "admin_credit" &&
        normalizedDescription.includes("bonus")
    ){
        return "Bonus";
    }

    return TRANSACTION_TYPE_LABELS[normalizedType] ||
        normalizedType
            .split("_")
            .map(w =>
                w.charAt(0).toUpperCase() +
                w.slice(1)
            )
            .join(" ");
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

                    type: formatTransactionType(
    row.type,
    row.description
),

typeKey:
    row.type === "admin_credit" &&
    String(row.description || "")
        .toLowerCase()
        .includes("bonus")
        ? "bonus"
        : row.type,

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
                <span class="gender">${user.gender || ""}</span>
                <span class="country">${user.country || ""}</span>
                <span class="reg-date">${user.created_at ? new Date(user.created_at).toLocaleDateString() : ""}</span>
 <span class="info-locked">${user.info_locked ? "1" : "0"}</span>
                <span class="change-requested">${user.change_requested ? "1" : "0"}</span>
                <span class="payment-methods-locked">${user.payment_methods_locked ? "1" : "0"}</span>
                <span class="payment-methods-change-requested">${user.payment_methods_change_requested ? "1" : "0"}</span>
            </td>
        `;;

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
    // USER MANAGEMENT MODAL
    // ===============================

    const userModal = document.getElementById("userModal");

    const modalUserName = document.getElementById("modalUserName");

    const modalUserID = document.getElementById("modalUserID");

        const modalEmail = document.getElementById("modalEmail");

    const modalGender = document.getElementById("modalGender");

    const modalPhone = document.getElementById("modalPhone");

    const modalCountry = document.getElementById("modalCountry");

    const modalRegDate = document.getElementById("modalRegDate");

    const modalBalance = document.getElementById("modalBalance");

    const modalPlan = document.getElementById("modalPlan");

    const modalStatus = document.getElementById("modalStatus");

        const modalInfoStatus = document.getElementById("modalInfoStatus");

    const modalPaymentMethodsStatus = document.getElementById("modalPaymentMethodsStatus");

    // ===============================
    // OPEN USER MODAL
    // ===============================

    function openUserModal(row){

        currentRow = row;

        let hiddenData = row.querySelector(".user-hidden-data");

        modalUserName.textContent = row.querySelector("h4").textContent;

        modalUserID.textContent = "User ID : " + row.dataset.userid;

                modalEmail.textContent = hiddenData.querySelector(".email").textContent;

        modalGender.textContent = hiddenData.querySelector(".gender").textContent || "—";

        modalPhone.textContent = hiddenData.querySelector(".phone").textContent || "—";

        modalCountry.textContent = hiddenData.querySelector(".country").textContent || "—";

        modalRegDate.textContent = hiddenData.querySelector(".reg-date").textContent || "—";

        modalBalance.textContent = hiddenData.querySelector(".balance").textContent;

        modalPlan.textContent = hiddenData.querySelector(".plan").textContent;

        modalStatus.textContent = row.querySelector(".status").textContent.trim();

        const infoLocked = hiddenData.querySelector(".info-locked").textContent === "1";
        const changeRequested = hiddenData.querySelector(".change-requested").textContent === "1";

                modalInfoStatus.textContent = infoLocked
            ? (changeRequested ? "Locked — change requested" : "Locked")
            : "Editable (approved)";

        const paymentMethodsLocked = hiddenData.querySelector(".payment-methods-locked").textContent === "1";
        const paymentMethodsChangeRequested = hiddenData.querySelector(".payment-methods-change-requested").textContent === "1";

        modalPaymentMethodsStatus.textContent = paymentMethodsLocked
            ? (paymentMethodsChangeRequested ? "Locked — change requested" : "Locked")
            : "Editable (approved)";

        updateStatusButton();
        updateApproveButton();

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

    const activateModal = document.getElementById("activateModal");

    const activateStatus = document.getElementById("activateStatus");

    const activateActions = document.getElementById("activateActions");

    function bindActivateClose(){
        const closeBtn = activateActions.querySelector(".cancel-btn");
        if(closeBtn){
            closeBtn.onclick = function(){ activateModal.style.display = "none"; };
        }
    }

    function applyActivatedUI(){

        if(!currentRow) return;

        const status = currentRow.querySelector(".status");

        status.classList.remove("blocked");
        status.classList.add("active");
        status.textContent = "Active";
        modalStatus.textContent = "Active";

        updateStatusButton();
        updateStatistics();

    }

    function renderActivateModal(){

        if(!currentRow) return;

        const userId = currentRow.dataset.userid;

        activateStatus.textContent = "Checking for a pending request…";
        activateActions.innerHTML = '<button class="cancel-btn">Close</button>';
        bindActivateClose();

        sb.from("account_reset_requests").select("id").eq("user_id", userId).eq("kind","unblock").eq("status","pending").maybeSingle()

            .then(({ data, error }) => {

                if(error){
                    activateStatus.textContent = "Failed to check request: " + error.message;
                    return;
                }

                const pending = data;

                activateStatus.textContent = pending
                    ? "This user has requested reactivation."
                    : "No reactivation request.";

                let buttonsHtml = '<button class="cancel-btn">Close</button>';
                buttonsHtml += '<button class="reset-btn activate-confirm-btn">Activate</button>';
                if(pending){
                    buttonsHtml += '<button class="reset-btn reject-btn activate-reject-btn">Reject</button>';
                }
                activateActions.innerHTML = buttonsHtml;
                bindActivateClose();

                const confirmBtn = activateActions.querySelector(".activate-confirm-btn");
                if(confirmBtn){
                    confirmBtn.onclick = function(){
                        sb.rpc("admin_activate_user", { p_user_id: userId })
                            .then(({ error }) => {
                                if(error){
                                    alert("Failed to activate user: " + error.message);
                                    return;
                                }
                                applyActivatedUI();
                                activateModal.style.display = "none";
                            });
                    };
                }

                const rejectBtn = activateActions.querySelector(".activate-reject-btn");
                if(rejectBtn){
                    rejectBtn.onclick = function(){
                        sb.rpc("admin_reject_unblock_request", { p_user_id: userId })
                            .then(({ error }) => {
                                if(error){
                                    alert("Failed to reject request: " + error.message);
                                    return;
                                }
                                renderActivateModal();
                            });
                    };
                }

            });

    }

    toggleUserStatus.addEventListener("click",function(){

        if(!currentRow) return;

        const status = currentRow.querySelector(".status");

        if(status.classList.contains("active")){

            userModal.style.display="none";
            blockModal.style.display="flex";

        }

        else{

            userModal.style.display="none";
            renderActivateModal();
            activateModal.style.display="flex";

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
                ".user-modal, .credit-modal, .debit-modal, .plan-modal, .edit-user-modal, .delete-modal, .block-modal, .reset-password-modal"
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
           e.target.classList.contains("reset-password-modal")){

            e.target.style.display="none";

        }

    };

    

       
        // ===============================
    // APPROVE CHANGES — opens a modal to pick which page to unlock
    // (admin_approve_profile_changes / admin_approve_payment_methods_changes)
    // ===============================
    // Admins no longer type in the user's new details themselves — the user
    // edits their own Personal Information or Payment Methods page once this
    // unlocks it. These buttons just approve that request via SECURITY
    // DEFINER RPCs so the unlock/audit logic lives in one place (see
    // enforce_profile_lock / enforce_payment_method_lock in SQL).

// =========================================================
// CHANGE REQUEST TOAST
// =========================================================

function showChangeRequestToast(message, type = "success"){

    const existingToast =
        document.querySelector(".change-request-toast");

    if(existingToast){
        existingToast.remove();
    }

    const toast =
        document.createElement("div");

    toast.className =
        `change-request-toast ${type}`;

    toast.textContent =
        message;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    setTimeout(() => {

        toast.classList.remove("show");

        setTimeout(() => {
            toast.remove();
        }, 500);

    }, 5000);
}

  
    const approveBtn = document.querySelector(".approve-btn");

const approveModal =
    document.getElementById("approveModal");

const approveCancelBtn =
    document.querySelector(".approve-cancel-btn");
  
const approvePersonalBtn =
    document.querySelector(".approve-personal-btn");

const approvePaymentBtn =
    document.querySelector(".approve-payment-btn");

const changeDecisionModal =
    document.getElementById("changeDecisionModal");

const changeDecisionTitle =
    document.getElementById("changeDecisionTitle");

const changeDecisionText =
    document.getElementById("changeDecisionText");

const changeApproveBtn =
    document.querySelector(".change-approve-btn");

const changeRejectBtn =
    document.querySelector(".change-reject-btn");

let selectedChangePage = null;

function updateApproveButton(){

    if(!currentRow || !approveBtn) return;

    const hiddenData = currentRow.querySelector(".user-hidden-data");

    const changeRequested =
        hiddenData.querySelector(".change-requested").textContent === "1";

    const paymentMethodsChangeRequested =
        hiddenData.querySelector(".payment-methods-change-requested").textContent === "1";

    const anyRequested =
        changeRequested || paymentMethodsChangeRequested;

    // Main button
    approveBtn.textContent =
        anyRequested
            ? "Approve Changes"
            : "No Pending Requests";

    approveBtn.disabled = !anyRequested;

    // Personal Information button
    if(approvePersonalBtn){

        approvePersonalBtn.style.display =
            changeRequested
                ? "inline-block"
                : "none";

    }

    // Payment Methods button
    if(approvePaymentBtn){

        approvePaymentBtn.style.display =
            paymentMethodsChangeRequested
                ? "inline-block"
                : "none";

    }

}

    if(approveBtn){

        approveBtn.onclick=function(){
            if(!currentRow) return;
            updateApproveButton();
            approveModal.style.display="flex";
        };

    }

    if(approveCancelBtn){

        approveCancelBtn.onclick=function(){
            approveModal.style.display="none";
        };

    }

    if(approvePersonalBtn){

    approvePersonalBtn.onclick = function(){

        if(!currentRow) return;

        selectedChangePage = "personal";

        changeDecisionTitle.textContent =
            "Personal Information";

        changeDecisionText.textContent =
            "Approve or reject the Personal Information change request.";

        approveModal.style.display = "none";

        changeDecisionModal.style.display = "flex";

    };

}

    if(approvePaymentBtn){

    approvePaymentBtn.onclick = function(){

        if(!currentRow) return;

        selectedChangePage = "payment";

        changeDecisionTitle.textContent =
            "Payment Methods";

        changeDecisionText.textContent =
            "Approve or reject the Payment Methods change request.";

        approveModal.style.display = "none";

        changeDecisionModal.style.display = "flex";

    };

}

  // =========================================================
// CHANGE REQUEST — APPROVE / REJECT
// =========================================================

if(changeApproveBtn){

    changeApproveBtn.onclick = function(){

        if(!currentRow || !selectedChangePage) return;

        const userId = currentRow.dataset.userid;

        let rpcName = "";

        if(selectedChangePage === "personal"){
            rpcName = "admin_approve_profile_changes";
        }

        if(selectedChangePage === "payment"){
            rpcName = "admin_approve_payment_methods_changes";
        }

        if(!rpcName) return;

        changeApproveBtn.disabled = true;
        changeRejectBtn.disabled = true;

        sb.rpc(rpcName, {
            p_user_id: userId
        })

        .then(({ error }) => {

            changeApproveBtn.disabled = false;
            changeRejectBtn.disabled = false;

            if(error){

    alert(
        "Failed to approve changes: " +
        error.message
    );

    return;
}

showChangeRequestToast(
    selectedChangePage === "personal"
        ? "Personal Information change request approved successfully."
        : "Payment Methods change request approved successfully."
);

            const hiddenData =
                currentRow.querySelector(".user-hidden-data");

            if(selectedChangePage === "personal"){

                hiddenData
                    .querySelector(".info-locked")
                    .textContent = "0";

                hiddenData
                    .querySelector(".change-requested")
                    .textContent = "0";

                modalInfoStatus.textContent =
                    "Editable (approved)";
            }

            if(selectedChangePage === "payment"){

                hiddenData
                    .querySelector(".payment-methods-locked")
                    .textContent = "0";

                hiddenData
                    .querySelector(".payment-methods-change-requested")
                    .textContent = "0";

                modalPaymentMethodsStatus.textContent =
                    "Editable (approved)";
            }

            changeDecisionModal.style.display = "none";

            selectedChangePage = null;

            updateApproveButton();

        });

    };

}

  if(changeRejectBtn){

    changeRejectBtn.onclick = function(){

        if(!currentRow || !selectedChangePage) return;

        const userId = currentRow.dataset.userid;

        let rpcName = "";

        if(selectedChangePage === "personal"){
            rpcName = "admin_reject_profile_changes";
        }

        if(selectedChangePage === "payment"){
            rpcName = "admin_reject_payment_methods_changes";
        }

        if(!rpcName) return;

        changeApproveBtn.disabled = true;
        changeRejectBtn.disabled = true;

        sb.rpc(rpcName, {
            p_user_id: userId
        })

        .then(({ error }) => {

            changeApproveBtn.disabled = false;
            changeRejectBtn.disabled = false;

            if(error){

    alert(
        "Failed to reject changes: " +
        error.message
    );

    return;
}

showChangeRequestToast(
    selectedChangePage === "personal"
        ? "Personal Information change request rejected successfully."
        : "Payment Methods change request rejected successfully."
);

const hiddenData =
                currentRow.querySelector(".user-hidden-data");

            if(selectedChangePage === "personal"){

                hiddenData
                    .querySelector(".change-requested")
                    .textContent = "0";

                modalInfoStatus.textContent =
                    "Locked — request rejected";
            }

            if(selectedChangePage === "payment"){

                hiddenData
                    .querySelector(".payment-methods-change-requested")
                    .textContent = "0";

                modalPaymentMethodsStatus.textContent =
                    "Locked — request rejected";
            }

            changeDecisionModal.style.display = "none";

            selectedChangePage = null;

            updateApproveButton();

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
    // RESET PASSWORD (real — request/reset/reject flow)
    // ===============================
    // Admin no longer sends a reset email to profiles.email (that address
    // isn't the real auth login identity anyway — login uses phone). Instead
    // this shows whether the user has requested a reset, lets the admin
    // generate a brand-new random password (written straight into
    // auth.users via admin_reset_password), or reject the request.

    const passwordBtn = document.querySelector(".password-btn");

    const resetPasswordModal = document.getElementById("resetPasswordModal");

    const resetPasswordStatus = document.getElementById("resetPasswordStatus");

    const resetPasswordActions = document.getElementById("resetPasswordActions");

    function renderResetPasswordModal(){

        if(!currentRow) return;

        const userId = currentRow.dataset.userid;

        resetPasswordStatus.textContent = "Checking for a pending request…";
        resetPasswordActions.innerHTML = '<button class="cancel-btn">Close</button>';
        bindResetPasswordClose();

        Promise.all([
            sb.from("account_reset_requests").select("id").eq("user_id", userId).eq("kind","password").eq("status","pending").maybeSingle(),
            sb.from("profiles").select("temp_password_display").eq("id", userId).maybeSingle()
        ]).then(([reqRes, profRes]) => {

            if(reqRes.error){ resetPasswordStatus.textContent = "Failed to check request: " + reqRes.error.message; return; }
            if(profRes.error){ resetPasswordStatus.textContent = "Failed to check request: " + profRes.error.message; return; }

            const pending = reqRes.data;
            const tempPassword = profRes.data ? profRes.data.temp_password_display : null;

            let statusHtml = "";

            if(tempPassword){
                statusHtml += "Generated password (not yet changed by user): <strong>" + tempPassword + "</strong><br><br>";
            }

            if(pending){
                statusHtml += "This user has requested a password reset.";
            } else if(!tempPassword){
                statusHtml += "No pending password reset request for this user.";
            }

            resetPasswordStatus.innerHTML = statusHtml;

            let buttonsHtml = '<button class="cancel-btn">Close</button>';
            if(pending){
                buttonsHtml += '<button class="reset-btn password-reset-confirm-btn">Reset</button>';
                buttonsHtml += '<button class="reset-btn reject-btn password-reset-reject-btn">Reject</button>';
            }
            resetPasswordActions.innerHTML = buttonsHtml;
            bindResetPasswordClose();

            const confirmBtn = resetPasswordActions.querySelector(".password-reset-confirm-btn");
            if(confirmBtn){
                confirmBtn.onclick = function(){
                    sb.rpc("admin_reset_password", { p_user_id: userId })
                        .then(({ data, error }) => {
                            if(error){
                                alert("Failed to reset password: " + error.message);
                                return;
                            }
                            alert("Password reset. New password: " + data);
                            renderResetPasswordModal();
                        });
                };
            }

            const rejectBtn = resetPasswordActions.querySelector(".password-reset-reject-btn");
            if(rejectBtn){
                rejectBtn.onclick = function(){
                    sb.rpc("admin_reject_reset_request", { p_user_id: userId, p_kind: "password" })
                        .then(({ error }) => {
                            if(error){
                                alert("Failed to reject request: " + error.message);
                                return;
                            }
                            renderResetPasswordModal();
                        });
                };
            }

        });

    }

    function bindResetPasswordClose(){
        const closeBtn = resetPasswordActions.querySelector(".cancel-btn");
        if(closeBtn){
            closeBtn.onclick = function(){ resetPasswordModal.style.display = "none"; };
        }
    }

    if(passwordBtn){

        passwordBtn.onclick=function(){
            if(!currentRow) return;
            userModal.style.display="none";
            renderResetPasswordModal();
            resetPasswordModal.style.display="flex";
        };

    }

    // ===============================
    // RESET WITHDRAWAL PIN (real — request/reset/reject flow)
    // ===============================
    // Reset just clears withdrawal_pin_hash, same as if the user never set
    // one — they go through "Add withdrawal PIN" again from scratch.

    const pinResetBtn = document.querySelector(".pin-reset-btn");

    const resetPinModal = document.getElementById("resetPinModal");

    const resetPinStatus = document.getElementById("resetPinStatus");

    const resetPinActions = document.getElementById("resetPinActions");

    function bindResetPinClose(){
        const closeBtn = resetPinActions.querySelector(".cancel-btn");
        if(closeBtn){
            closeBtn.onclick = function(){ resetPinModal.style.display = "none"; };
        }
    }

    function renderResetPinModal(){

        if(!currentRow) return;

        const userId = currentRow.dataset.userid;

        resetPinStatus.textContent = "Checking for a pending request…";
        resetPinActions.innerHTML = '<button class="cancel-btn">Close</button>';
        bindResetPinClose();

        sb.from("account_reset_requests").select("id").eq("user_id", userId).eq("kind","pin").eq("status","pending").maybeSingle()

            .then(({ data, error }) => {

                if(error){
                    resetPinStatus.textContent = "Failed to check request: " + error.message;
                    return;
                }

                const pending = data;

                resetPinStatus.textContent = pending
                    ? "This user has requested a withdrawal PIN reset."
                    : "No pending withdrawal PIN reset request for this user.";

                let buttonsHtml = '<button class="cancel-btn">Close</button>';
                if(pending){
                    buttonsHtml += '<button class="reset-btn pin-reset-confirm-btn">Reset</button>';
                    buttonsHtml += '<button class="reset-btn reject-btn pin-reset-reject-btn">Reject</button>';
                }
                resetPinActions.innerHTML = buttonsHtml;
                bindResetPinClose();

                const confirmBtn = resetPinActions.querySelector(".pin-reset-confirm-btn");
                if(confirmBtn){
                    confirmBtn.onclick = function(){
                        sb.rpc("admin_reset_withdrawal_pin", { p_user_id: userId })
                            .then(({ error }) => {
                                if(error){
                                    alert("Failed to reset PIN: " + error.message);
                                    return;
                                }
                                alert("Withdrawal PIN reset — the user can add a new one.");
                                renderResetPinModal();
                            });
                    };
                }

                const rejectBtn = resetPinActions.querySelector(".pin-reset-reject-btn");
                if(rejectBtn){
                    rejectBtn.onclick = function(){
                        sb.rpc("admin_reject_reset_request", { p_user_id: userId, p_kind: "pin" })
                            .then(({ error }) => {
                                if(error){
                                    alert("Failed to reject request: " + error.message);
                                    return;
                                }
                                renderResetPinModal();
                            });
                    };
                }

            });

    }

    if(pinResetBtn){

        pinResetBtn.onclick=function(){
            if(!currentRow) return;
            userModal.style.display="none";
            renderResetPinModal();
            resetPinModal.style.display="flex";
        };

    }

    // ===============================
    // DEPOSIT / WITHDRAWAL HISTORY
    // ===============================

    


// ======================================================
// DEPOSIT / WITHDRAWAL HISTORY
// ======================================================

const userHistoryModal =
    document.getElementById("userHistoryModal");

const userHistoryTitle =
    document.getElementById("userHistoryTitle");

const userHistoryUser =
    document.getElementById("userHistoryUser");

const userHistorySearch =
    document.getElementById("userHistorySearch");

const userHistoryBody =
    document.getElementById("userHistoryBody");

const userHistoryClose =
    document.getElementById("userHistoryClose");


let userHistoryType = "deposit";

let userHistoryRecords = [];


// ======================================================
// FORMAT VALUE
// ======================================================

function formatHistoryValue(value){

    if(
        value === null ||
        value === undefined ||
        value === ""
    ){
        return "—";
    }

    if(typeof value === "boolean"){

        return value ? "Yes" : "No";

    }

    if(typeof value === "object"){

        return JSON.stringify(value);

    }

    return String(value);

}


// ======================================================
// FORMAT DATE
// ======================================================

function formatHistoryDate(value){

    if(!value){

        return "—";

    }

    const date = new Date(value);

    if(Number.isNaN(date.getTime())){

        return formatHistoryValue(value);

    }

    return date.toLocaleString();

}


// ======================================================
// SEARCHABLE RECORD TEXT
// ======================================================

function getHistoryRecordText(record){

    return Object.entries(record)

        .map(([key, value]) =>
            `${key} ${formatHistoryValue(value)}`
        )

        .join(" ")

        .toLowerCase();

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHistoryHtml(value){

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


// ======================================================
// DETERMINE TABLE COLUMNS
// ======================================================

function getHistoryColumns(records){

    const preferred = [

        "created_at",
        "amount",
        "method",
        "status",
        "account_details",
        "transaction_id",
        "reference",
        "id"

    ];


    const available = [];


    preferred.forEach(key => {

        if(
            records.some(record =>
                Object.prototype.hasOwnProperty.call(
                    record,
                    key
                )
            )
        ){

            available.push(key);

        }

    });


    const extras = [];


    records.forEach(record => {

        Object.keys(record).forEach(key => {

            if(
                key === "user_id" ||
                available.includes(key) ||
                extras.includes(key)
            ){

                return;

            }

            extras.push(key);

        });

    });


    return [

        ...available,
        ...extras

    ].slice(0, 8);

}


// ======================================================
// RENDER HISTORY
// ======================================================

function renderHistoryRecords(){

    const search =
        (userHistorySearch.value || "")
        .trim()
        .toLowerCase();


    const filtered =
        userHistoryRecords.filter(record =>

            !search ||
            getHistoryRecordText(record)
                .includes(search)

        );


    if(!filtered.length){

        userHistoryBody.innerHTML = `

            <div class="user-history-empty">

                ${
                    userHistoryRecords.length

                    ? "No matching records found."

                    : `No ${userHistoryType}
                       history found for this user.`
                }

            </div>

        `;

        return;

    }


    const columns =
        getHistoryColumns(filtered);


    let html = `

        <table class="user-history-table">

            <thead>

                <tr>

    `;


    columns.forEach(column => {

        const label =
            column

                .replace(/_/g, " ")

                .replace(/\b\w/g, char =>
                    char.toUpperCase()
                );


        html += `

            <th>
                ${escapeHistoryHtml(label)}
            </th>

        `;

    });


    html += `

                </tr>

            </thead>

            <tbody>

    `;


    filtered.forEach(record => {

        html += "<tr>";


        columns.forEach(column => {

            let value = record[column];


            if(
                column === "created_at" ||
                column === "updated_at" ||
                column.endsWith("_at")
            ){

                value =
                    formatHistoryDate(value);

            }else{

                value =
                    formatHistoryValue(value);

            }


            html += `

                <td>
                    ${escapeHistoryHtml(value)}
                </td>

            `;

        });


        html += "</tr>";

    });


    html += `

            </tbody>

        </table>

    `;


    userHistoryBody.innerHTML = html;

}


// ======================================================
// OPEN USER HISTORY
// ======================================================

async function openUserHistory(type){

    if(!currentRow){

        return;

    }


    const userId =
        currentRow.dataset.userid;


    const userName =
        currentRow.querySelector("h4")
        ?.textContent || "User";


    userHistoryType = type;

    userHistoryRecords = [];


    userHistorySearch.value = "";


    userHistoryTitle.textContent =

        type === "deposit"

            ? "Deposit History"

            : "Withdrawal History";


    userHistoryUser.textContent =
        userName;


    userHistoryBody.innerHTML = `

        <div class="user-history-loading">

            Loading ${type} history...

        </div>

    `;


    userModal.style.display = "none";

    userHistoryModal.style.display = "flex";


    const tableName =

        type === "deposit"

            ? "deposits"

            : "withdrawals";


    try{

        const { data, error } =

            await sb

                .from(tableName)

                .select("*")

                .eq("user_id", userId)

                .order(
                    "created_at",
                    {
                        ascending:false
                    }
                );


        if(error){

            console.error(
                `Failed to load ${type} history:`,
                error
            );


            userHistoryBody.innerHTML = `

                <div class="user-history-error">

                    Failed to load ${type}
                    history:
                    ${escapeHistoryHtml(
                        error.message
                    )}

                </div>

            `;

            return;

        }


        userHistoryRecords =
            Array.isArray(data)
                ? data
                : [];


        renderHistoryRecords();


    }catch(error){

        console.error(
            `Failed to load ${type} history:`,
            error
        );


        userHistoryBody.innerHTML = `

            <div class="user-history-error">

                Failed to load ${type}
                history.

            </div>

        `;

    }

}


// ======================================================
// CLOSE HISTORY
// ======================================================

function closeUserHistory(){

    userHistoryModal.style.display =
        "none";


    userHistoryRecords = [];


    userHistorySearch.value = "";

}


// ======================================================
// SEARCH
// ======================================================

if(userHistorySearch){

    userHistorySearch.addEventListener(
        "input",
        renderHistoryRecords
    );

}


// ======================================================
// CLOSE BUTTON
// ======================================================

if(userHistoryClose){

    userHistoryClose.onclick =
        closeUserHistory;

}


// ======================================================
// CLOSE WHEN CLICKING OUTSIDE
// ======================================================

if(userHistoryModal){

    userHistoryModal.addEventListener(
        "click",
        function(e){

            if(e.target === userHistoryModal){

                closeUserHistory();

            }

        }
    );

}


// ======================================================
// DEPOSIT HISTORY BUTTON
// ======================================================

const depositBtn =
    document.querySelector(".deposit-btn");


if(depositBtn){

    depositBtn.onclick = function(){

        openUserHistory("deposit");

    };

}


// ======================================================
// WITHDRAWAL HISTORY BUTTON
// ======================================================

const withdrawBtn =
    document.querySelector(".withdraw-btn");


if(withdrawBtn){

    withdrawBtn.onclick = function(){

        openUserHistory("withdrawal");

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
    // DELETE USER — real (admin_delete_user RPC)
    // ===============================
    // Deletes the auth.users row via a SECURITY DEFINER function; profiles
    // cascades automatically (ON DELETE CASCADE). Any other table that
    // references this user without a cascade will surface as a clear
    // foreign-key error here instead of silently doing nothing.

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

            sb.rpc("admin_delete_user", { p_user_id: currentRow.dataset.userid })

                .then(({ error }) => {

                    deleteModal.style.display="none";

                    if(error){
                        alert("Failed to delete user: " + error.message);
                        return;
                    }

                    currentRow.remove();
                    currentRow = null;

                    alert("User deleted.");

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
    const rejectResubmissionBtn = document.querySelector(".reject-resubmission-btn");
    const resubmissionStatusEl = document.getElementById("resubmissionStatus");
  
    let selectedRow = null;
    let kycData = {};

    // ===============================
    // Load KYC submissions from Supabase
    // ===============================

    function loadKyc(){

                sb.from("kyc_submissions")
            .select("id, user_id, id_front_url, id_back_url, selfie_url, status, needs_resubmission, admin_note, created_at, country, profiles(username, surname, email, phone)")
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
                      country: row.country,
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
 reviewCountry.textContent = entry.country || "—";

                reviewIdFront.src = entry.idFront;
                reviewIdBack.src = entry.idBack;
                reviewSelfie.src = entry.selfie;

                document.getElementById("adminNoteInput").value = "";

                                if (entry.status === "pending") {

                    approveBtn.style.display = "inline-block";
                    rejectBtn.style.display = "inline-block";
                    requestBtn.style.display = "inline-block";
                    resetBtn.style.display = "none";
                    rejectResubmissionBtn.style.display = "none";
                    resubmissionStatusEl.style.display = "none";

                } else {

                    approveBtn.style.display = "none";
                    rejectBtn.style.display = "none";
                    requestBtn.style.display = "none";
                    resetBtn.style.display = "inline-block";

                }

                if (entry.status === "approved") {
                    refreshResubmissionStatus(entry.userId);
                } else {
                    rejectResubmissionBtn.style.display = "none";
                    resubmissionStatusEl.style.display = "none";
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
        const note = document.getElementById("adminNoteInput").value.trim() || null;

        sb.rpc("approve_kyc", { p_kyc_id: kycId, p_note: note })

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
        const note = document.getElementById("adminNoteInput").value.trim() || null;

        sb.rpc("reject_kyc", { p_kyc_id: kycId, p_note: note })

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
        const note = document.getElementById("adminNoteInput").value.trim() || null;
        const entry = kycData[kycId];

        sb.rpc("admin_reset_kyc", { p_kyc_id: kycId, p_note: note })

            .then(({ error }) => {

                if(error){
                    alert("Failed to reset: " + error.message);
                    return Promise.reject(error);
                }

                // Fulfilling the reset also resolves any pending resubmission
                // request, so "Resubmission pending" doesn't linger after this.
                // Chained (not fire-and-forget) so a failure here is visible
                // instead of silently leaving a stale pending row behind.
                if (entry && entry.userId) {
                    return sb.rpc("admin_complete_kyc_reset_request", { p_user_id: entry.userId });
                }

            })

            .then((result) => {

                if (result && result.error) {
                    alert("Reset succeeded, but failed to clear the pending resubmission request: " + result.error.message + " — reject it manually from the resubmission status area if it still shows pending.");
                }

                modal.style.display = "none";

                loadKyc();

            })

            .catch(() => {
                // Reset itself already alerted above; nothing more to do.
            });

    };

    // ===============================
    // Request Documents (real — sends a notification)
    // ===============================

    requestBtn.onclick = function () {

        if (!selectedRow) return;

        const kycId = selectedRow.dataset.kycid;
        const note = document.getElementById("adminNoteInput").value.trim() || null;

        sb.rpc("admin_request_kyc_documents", { p_kyc_id: kycId, p_note: note })

            .then(({ error }) => {

                if(error){
                    alert("Failed to send request: " + error.message);
                    return;
                }

                alert("Request for additional documents has been sent.");

                modal.style.display = "none";

            });

        };

    // ===============================
    // Resubmission status (real — account_reset_requests, kind='kyc')
    // ===============================

    function refreshResubmissionStatus(userId) {

        resubmissionStatusEl.style.display = "block";
        resubmissionStatusEl.textContent = "Checking resubmission status…";
        rejectResubmissionBtn.style.display = "none";

        sb.from("account_reset_requests")
            .select("id")
            .eq("user_id", userId)
            .eq("kind", "kyc")
            .eq("status", "pending")
            .maybeSingle()

            .then(({ data, error }) => {

                if (error) {
                    resubmissionStatusEl.textContent = "Failed to check resubmission status: " + error.message;
                    return;
                }

                if (data) {
                    resubmissionStatusEl.textContent = "This user has requested a resubmission.";
                    rejectResubmissionBtn.style.display = "inline-block";
                } else {
                    resubmissionStatusEl.textContent = "No resubmission request.";
                    rejectResubmissionBtn.style.display = "none";
                }

            });

    }

    rejectResubmissionBtn.onclick = function () {

        if (!selectedRow) return;

        const kycId = selectedRow.dataset.kycid;
        const entry = kycData[kycId];
        if (!entry || !entry.userId) return;

        const note = document.getElementById("adminNoteInput").value.trim() || null;

        sb.rpc("admin_reject_kyc_resubmission", { p_user_id: entry.userId, p_note: note })

            .then(({ error }) => {

                if (error) {
                    alert("Failed to reject resubmission: " + error.message);
                    return;
                }

                alert("Resubmission request rejected — the user has been notified.");

                refreshResubmissionStatus(entry.userId);

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
// (only the "request created" actions logged under category REQUESTS
//  ever reach this page — see audit_user_requests / admin_send_notification)
// ===============================

const NOTIFICATION_ICONS = {
    deposit_requested: "fa-solid fa-wallet",
    withdrawal_requested: "fa-solid fa-money-bill-transfer",
    notification_sent: "fa-solid fa-paper-plane",
    password_reset_requested: "fa-solid fa-key",
    withdrawal_pin_reset_requested: "fa-solid fa-key",
    personal_info_change_requested: "fa-solid fa-user-pen",
    payment_methods_change_requested: "fa-solid fa-credit-card",
    kyc_verification_requested: "fa-solid fa-id-card",
    kyc_resubmission_requested: "fa-solid fa-file-circle-question",
    unblock_requested: "fa-solid fa-user-check"
};

const NOTIFICATION_LABELS = {
    deposit_requested: "Deposit Request",
    withdrawal_requested: "Withdrawal Request",
    notification_sent: "Notification Sent",
    password_reset_requested: "Forgot Password Request",
    withdrawal_pin_reset_requested: "Forgot Withdrawal PIN Request",
    personal_info_change_requested: "Personal Information Change Request",
    payment_methods_change_requested: "Payment Method Change Request",
    kyc_verification_requested: "KYC Verification Request",
    kyc_resubmission_requested: "KYC Resubmission Request",
    unblock_requested: "Account Reactivation Request"
};

const AUDIENCE_LABELS = {
    all: "All Users",
    verified: "Verified Users",
    not_verified: "Not Verified Users"
};

function labelForAction(action){

    if(NOTIFICATION_LABELS[action]) return NOTIFICATION_LABELS[action];

    return String(action)
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

function formatFullTime(dateString){

    const date = new Date(dateString);

    return date.toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

}

function escapeNotifHtml(value){

    return String(value === null || value === undefined ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

// ===============================
// MESSAGE BUILDING (short summary shown in the list + top of modal)
// ===============================

function messageForEntry(row, name){

    const meta = row.metadata || {};
    const who = name || "A user";

    switch(row.action){

        case "deposit_requested":
            return who + " requested a deposit of R" +
                Number(meta.amount_zar || 0).toFixed(2) +
                (meta.method ? " via " + labelForAction(meta.method) : "");

        case "withdrawal_requested":
            return who + " requested a withdrawal of R" +
                Number(meta.amount_zar || 0).toFixed(2) +
                (meta.method ? " via " + labelForAction(meta.method) : "");

        case "notification_sent":
            return "Sent to " +
                (AUDIENCE_LABELS[meta.audience] || meta.audience || "users") +
                " (" + (meta.recipient_count || 0) + "): " +
                (meta.title || "");

        case "password_reset_requested":
            return who + " requested a password reset.";

        case "withdrawal_pin_reset_requested":
            return who + " requested a withdrawal PIN reset.";

        case "personal_info_change_requested":
            return who + " requested to change personal information.";

        case "payment_methods_change_requested":
            return who + " requested to change payment methods.";

        case "kyc_verification_requested":
            return who + " submitted KYC verification documents.";

        case "kyc_resubmission_requested":
            return who + " requested to resubmit KYC verification.";

        case "unblock_requested":
            return who + " requested account reactivation.";

        default:
            return labelForAction(row.action);

    }

}

// ===============================
// DETAIL ROWS (full breakdown shown in the View modal)
// ===============================

function detailRowsForEntry(entry){

    const meta = entry.metadata || {};
    const rows = [];

    if(entry.action === "notification_sent"){

        rows.push({ label: "Sent by", value: "You (Admin)" });
        rows.push({ label: "Audience", value: AUDIENCE_LABELS[meta.audience] || meta.audience || "—" });
        rows.push({ label: "Recipients", value: String(meta.recipient_count || 0) });
        rows.push({ label: "Title", value: meta.title || "—" });
        rows.push({ label: "Message", value: meta.body || "—" });

    } else {

        rows.push({ label: "Requested by", value: entry.requesterName || "Unknown user" });

        if(entry.action === "deposit_requested"){
            rows.push({ label: "Amount", value: "R" + Number(meta.amount_zar || 0).toFixed(2) });
            if(meta.method) rows.push({ label: "Method", value: labelForAction(meta.method) });
        }

        if(entry.action === "withdrawal_requested"){
            rows.push({ label: "Amount", value: "R" + Number(meta.amount_zar || 0).toFixed(2) });
            if(meta.method) rows.push({ label: "Method", value: labelForAction(meta.method) });
        }

        if(entry.action === "kyc_verification_requested" && meta.country){
            rows.push({ label: "Country", value: meta.country });
        }

    }

    rows.push({ label: "Submitted", value: entry.fullTime });

    return rows;

}

function renderNotificationDetail(entry){

    const container = document.getElementById("notificationDetails");

    if(!entry){
        container.innerHTML = "<p>This notification could not be found.</p>";
        return;
    }

    const rowsHtml = detailRowsForEntry(entry)
        .map(r =>
            "<div class=\"notif-detail-row\">" +
                "<span>" + escapeNotifHtml(r.label) + "</span>" +
                "<strong>" + escapeNotifHtml(r.value) + "</strong>" +
            "</div>"
        )
        .join("");

    container.innerHTML =
        "<div class=\"notif-detail\">" +

            "<div class=\"notif-detail-head\">" +
                "<div class=\"notif-detail-icon\"><i class=\"" + entry.icon + "\"></i></div>" +
                "<div>" +
                    "<h4>" + escapeNotifHtml(entry.title) + "</h4>" +
                    "<span class=\"notif-status-badge " + entry.status + "\" id=\"notifDetailStatusBadge\">" +
                        (entry.status === "unread" ? "Unread" : "Read") +
                    "</span>" +
                "</div>" +
            "</div>" +

            "<p class=\"notif-detail-message\">" + escapeNotifHtml(entry.message) + "</p>" +

            "<div class=\"notif-detail-grid\">" + rowsHtml + "</div>" +

        "</div>";

}

// ===============================
// LOAD REQUEST-EVENT FEED FROM SUPABASE
// ===============================

function loadNotifications(){

    sb.from("activity_log")
        .select("*")
        .eq("category", "REQUESTS")
        .order("created_at", { ascending: false })
        .limit(100)

        .then(({ data, error }) => {

            if(error){
                console.error("Failed to load notifications:", error);
                return;
            }

            const rows = data || [];

            // notification_sent rows are logged against the admin, not a
            // requesting user — only look up names for rows that have one.
            const userIds = [...new Set(
                rows
                    .filter(r => r.action !== "notification_sent" && r.actor_id)
                    .map(r => r.actor_id)
            )];

            if(userIds.length === 0){
                buildNotificationsData(rows, {});
                return;
            }

            sb.from("profiles")
                .select("id, username, surname")
                .in("id", userIds)

                .then(({ data: profileRows, error: profileError }) => {

                    if(profileError){
                        console.error("Failed to load requester names:", profileError);
                    }

                    const names = {};

                    (profileRows || []).forEach(p => {
                        names[p.id] = (p.username + " " + (p.surname || "")).trim();
                    });

                    buildNotificationsData(rows, names);

                });

        });

}

function buildNotificationsData(rows, names){

    notificationsData = rows.map(row => {

        const name = names[row.actor_id] || null;

        return {
            id: row.id,
            action: row.action,
            metadata: row.metadata || {},
            icon: NOTIFICATION_ICONS[row.action] || "fa-solid fa-bell",
            title: labelForAction(row.action),
            message: messageForEntry(row, name),
            requesterName: name,
            time: formatRelativeTime(row.created_at),
            fullTime: formatFullTime(row.created_at),
            status: row.is_read ? "read" : "unread"
        };

    });

    renderNotifications();

    updateNotificationStats();

    showNotificationTab(currentNotificationTab);

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
            "<h4>" + escapeNotifHtml(entry.title) + "</h4>" +
            "<p>" + escapeNotifHtml(entry.message) + "</p>" +
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


// ===============================
// VIEW (renders a full detail card, marks read on open —
// real, updates activity_log.is_read)
// ===============================

function viewNotification(button){

    const row = button.parentElement;

    selectedNotification = row;
    selectedNotificationId = row.dataset.id;

    const entry = notificationsData.find(e => String(e.id) === String(selectedNotificationId));

    renderNotificationDetail(entry);

    document.getElementById("notificationModal").style.display="flex";

    if(row.classList.contains("unread")){

        sb.from("activity_log")
            .update({ is_read: true })
            .eq("id", selectedNotificationId)

            .then(({ error }) => {

                if(error){
                    console.error("Failed to mark as read:", error);
                    return;
                }

                row.classList.remove("unread");
                row.classList.add("read");

                if(entry) entry.status = "read";

                const badge = document.getElementById("notifDetailStatusBadge");

                if(badge){
                    badge.classList.remove("unread");
                    badge.classList.add("read");
                    badge.textContent = "Read";
                }

                updateNotificationStats();

            });

    }

}


function closeNotificationModal(){
    document.getElementById("notificationModal").style.display="none";
}


// ===============================
// MARK UNREAD (real — updates activity_log.is_read)
// Viewing a notification already marks it read, so this button only
// ever needs to do one thing: put it back to unread.
// ===============================

function markNotificationUnread(){

    if(!selectedNotificationId) return;

    sb.from("activity_log")
        .update({ is_read: false })
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
// SEND NOTIFICATION (real — via admin_send_notification RPC,
// resolves audience to real recipients and inserts one row per user)
// ===============================

function sendNotification(){

    const title = document.getElementById("notificationTitle").value.trim();

    const message = document.getElementById("notificationMessage").value.trim();

    const audience = document.getElementById("notificationAudience").value;

    if(title==="" || message===""){
        alert("Please complete all fields.");
        return;
    }

    const sendBtn = document.querySelector(".send-notif-btn");

    if(sendBtn){
        sendBtn.disabled = true;
        sendBtn.textContent = "Sending...";
    }

    sb.rpc("admin_send_notification", {
        p_title: title,
        p_body: message,
        p_audience: audience
    })

        .then(({ data, error }) => {

            if(sendBtn){
                sendBtn.disabled = false;
                sendBtn.textContent = "Send";
            }

            if(error){
                alert("Failed to send notification: " + error.message);
                return;
            }

            const count = Number(data || 0);

            alert("Notification sent to " + count + (count === 1 ? " user." : " users."));

            document.getElementById("notificationTitle").value="";
            document.getElementById("notificationMessage").value="";

            closeSendNotificationModal();

            loadNotifications();

        });

}

/* ===== js/activity-log.js ===== */
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
// DELETE ACTIVITY RECORDS
// =========================================================

let activityDeleteCategory = null;


/* =================================
   OPEN CATEGORY MODAL
================================= */

function openDeleteActivityModal(){

    const modal = document.getElementById("activityDeleteModal");

    if(!modal) return;

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");

    document.body.classList.add("activity-modal-open");
}


/* =================================
   CLOSE CATEGORY MODAL
================================= */

function closeDeleteActivityModal(){

    const modal = document.getElementById("activityDeleteModal");

    if(!modal) return;

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");

    /*
     * Keep body locked if the confirmation modal
     * is currently open.
     */
    const confirmModal = document.getElementById(
        "activityDeleteConfirmModal"
    );

    if(!confirmModal || !confirmModal.classList.contains("show")){
        document.body.classList.remove("activity-modal-open");
    }
}


/* =================================
   OPEN CONFIRMATION
================================= */

function requestDeleteActivityCategory(category){

    const allowedCategories = [
        "all",
        "login",
        "changes",
        "transactions",
        "users",
        "security"
    ];

    if(!allowedCategories.includes(category)){
        return;
    }

    activityDeleteCategory = category;

    closeDeleteActivityModal();

    const confirmModal = document.getElementById(
        "activityDeleteConfirmModal"
    );

    const confirmText = document.getElementById(
        "activityDeleteConfirmText"
    );

    if(!confirmModal || !confirmText){
        return;
    }

    const categoryNames = {
        all: "All",
        login: "Login",
        changes: "Changes",
        transactions: "Transactions",
        users: "Users",
        security: "Security"
    };

    const categoryName = categoryNames[category];

    if(category === "all"){

        confirmText.textContent =
            "This will permanently delete all activity records. This action cannot be undone.";

    }else{

        confirmText.textContent =
            `This will permanently delete all ${categoryName} activity records. This action cannot be undone.`;

    }

    confirmModal.classList.add("show");
    confirmModal.setAttribute("aria-hidden", "false");

    document.body.classList.add("activity-modal-open");
}


/* =================================
   CLOSE CONFIRMATION
================================= */

function closeDeleteActivityConfirmModal(){

    const modal = document.getElementById(
        "activityDeleteConfirmModal"
    );

    if(!modal) return;

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");

    activityDeleteCategory = null;

    document.body.classList.remove("activity-modal-open");
}


/* =================================
   CONFIRM DELETE
================================= */

async function confirmDeleteActivityRecords(){

    if(!activityDeleteCategory){
        return;
    }

    const category = activityDeleteCategory;

    const button = document.getElementById(
        "confirmDeleteActivityBtn"
    );

    if(button){

        button.disabled = true;

        button.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
    }

    try{

        const { data, error } = await sb.rpc(
            "admin_delete_activity_logs",
            {
                p_category: category
            }
        );

        if(error){
            throw error;
        }

        const deletedCount = Number(data || 0);

        closeDeleteActivityConfirmModal();

        /*
         * Reload the Activity Log from the database.
         */
        await loadActivityLogs();

        /*
         * Show a small notification if the global notification
         * function exists in the Admin app.
         */
        if(typeof showToast === "function"){

            showToast(
                `${deletedCount} activity record${deletedCount === 1 ? "" : "s"} deleted.`,
                "success"
            );

        }else if(typeof showNotification === "function"){

            showNotification(
                `${deletedCount} activity record${deletedCount === 1 ? "" : "s"} deleted.`,
                "success"
            );

        }else{

            console.log(
                `${deletedCount} activity record${deletedCount === 1 ? "" : "s"} deleted.`
            );

        }

    }catch(error){

        console.error(
            "Failed to delete activity records:",
            error
        );

        alert(
            error?.message ||
            "Failed to delete activity records."
        );

    }finally{

        if(button){

            button.disabled = false;

            button.innerHTML = "Delete";

        }

        activityDeleteCategory = null;
    }
}

// =========================================================
// GLOBAL ACCESS
// =========================================================

window.initActivityLogs = initActivityLogs;
window.loadActivityLogs = loadActivityLogs;
window.showActivityTab = showActivityTab;
window.viewActivity = viewActivity;
window.closeActivityModal = closeActivityModal;

window.openDeleteActivityModal = openDeleteActivityModal;
window.closeDeleteActivityModal = closeDeleteActivityModal;
window.requestDeleteActivityCategory = requestDeleteActivityCategory;
window.closeDeleteActivityConfirmModal = closeDeleteActivityConfirmModal;
window.confirmDeleteActivityRecords = confirmDeleteActivityRecords;

/* ===== js/support-chat.js ===== */
// ======================================================
// SUPPORT CHAT — real, Supabase-backed (individual chats only)
// Rebuilt from the local-mock version to use real data end to
// end: support_conversations / support_messages, real users
// (profiles), real wallet/deposit/withdrawal/KYC/plan data for
// the profile modal, and a real "support-chat" storage bucket
// for photo/document/camera attachments and voice notes.
//
// Dropped (no real signal exists for these, so faking them
// would be dishonest rather than "real"):
//   - the fake typing-indicator bot reply (simulateTypingReply)
//   - per-message blue "read" ticks (the real user app has no
//     read-receipt concept at all — sent messages always show
//     a single check, never a double check)
//   - "online" presence dot (no presence system) — the chat
//     header shows the user's phone number instead
//   - chat mute (was already dead code — no button in the HTML
//     called toggleChatMute)
// Everything else (reply, edit own messages, delete any
// message, pin/unpin, chat priority + pin-to-top, bulk
// select/delete/priority, message search, new chat, clear
// messages, delete chat, real attachments/voice) is real.
// ======================================================


// ======================================================
// STATE
// ======================================================

const CHAT_LONG_PRESS_DURATION = 500;
const CHAT_LONG_PRESS_MOVE_TOLERANCE = 10;

let supportChatUsers = [];
let individualChats = [];

let currentChat = null;
let currentChatType = "individual";
let currentUser = null;

let replyingToMessage = null;
let editingMessage = null;

let currentChatFilter = "all";
let currentChatSearch = "";

let chatMenuOpen = false;
let attachmentMenuOpen = false;

let isRecordingVoice = false;
let voiceMediaRecorder = null;
let voiceRecordedChunks = [];
let voiceStream = null;

let deleteActionType = null;
let deleteActionId = null;
let deleteActionIds = [];

let chatSelectionMode = false;
let selectedChatIds = [];
let pendingBulkAction = null;
let pendingPriorityMode = null;

let pinMessageSelectionMode = false;
let selectedPinMessageIds = [];
let currentPinnedMessageIndex = 0;

let messageSearchActive = false;
let messageSearchQuery = "";
let messageSearchResults = [];
let currentMessageSearchIndex = -1;

let supportAdminId = null;
let supportMsgChannel = null;
let supportConvChannel = null;
let supportChatInitialized = false;


// ======================================================
// DOM HELPER
// ======================================================

function supportChatElement(id) {
    return document.getElementById(id);
}

function getInitials(name) {

    if (!name) return "?";

    const parts = name.trim().split(/\s+/);

    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();

}

function supportEscapeHtml(value) {

    return String(value === null || value === undefined ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

function fullNameOf(row) {
    return (row.username + " " + (row.surname || "")).trim() || "Unknown user";
}

function formatMessageTime(dateString) {

    const date = new Date(dateString);

    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

}

function formatChatListTime(dateString) {

    const date = new Date(dateString);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
    }

    return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });

}

function findIndividualChat(chatId) {
    return individualChats.find(function (chat) { return chat.id === chatId; });
}

function findSupportUser(userId) {
    return supportChatUsers.find(function (u) { return u.id === userId; });
}


// ======================================================
// INIT
// ======================================================

function initSupportChatPage() {

    if (supportChatInitialized) {
        loadSupportConversations();
        return;
    }

    supportChatInitialized = true;

    sb.auth.getUser().then(function (res) {

        supportAdminId = res.data && res.data.user ? res.data.user.id : null;

        loadSupportConversations();
        setupSupportRealtime();

    });

    setupComposerEvents();
    setupAttachmentEvents();
    setupMessageSearchEvents();
    setupPinMessageInput();
    setupChatMenuOutsideClick();
    setupChatSelectionOutsideClick();
    setupPinSelectionOutsideClick();
    setupReplyPreviewEvents();

    const chatSearchInput = supportChatElement("chatSearch");

    if (chatSearchInput) {
        chatSearchInput.addEventListener("input", function () {
            searchChats(chatSearchInput.value);
        });
    }

    const userSearchInput = supportChatElement("userSearchInput");

    if (userSearchInput) {
        userSearchInput.addEventListener("input", function () {
            renderAvailableUsers(userSearchInput.value);
        });
    }

}

function showIndividualChats() {
    // Only one section exists now (groups removed) — nothing to switch,
    // kept only so the header button remains a harmless no-op.
}


// ======================================================
// LOAD CONVERSATIONS
// ======================================================

function loadSupportConversations() {

    sb.rpc("admin_list_support_conversations").then(function (res) {

        if (res.error) {
            console.error("Failed to load support conversations:", res.error);
            return;
        }

        const rows = res.data || [];

        rows.forEach(function (row) {

            const existing = findIndividualChat(row.id);

            const chat = existing || { id: row.id, messages: [] };

            chat.userId = row.user_id;
            chat.name = fullNameOf(row);
            chat.phone = row.phone;
            chat.isBlocked = row.is_blocked;
            chat.status = row.status;
            chat.assignedAdmin = row.assigned_admin;
            chat.priority = row.priority;
            chat.pinned = row.pinned;
            chat.lastMessage = row.last_message
                ? (row.last_sender_type === "admin" ? "You: " : "") + row.last_message
                : "No messages yet";
            chat.lastMessageTime = formatChatListTime(row.last_message_at || row.created_at);
            chat.unread = row.unread_count || 0;

            if (!existing) {
                individualChats.push(chat);
            }

        });

        const validIds = rows.map(function (r) { return r.id; });

        individualChats = individualChats.filter(function (c) { return validIds.indexOf(c.id) !== -1; });

        if (!supportChatUsers.length) {
            supportChatUsers = rows.map(function (row) {
                return { id: row.user_id, name: fullNameOf(row), phone: row.phone };
            });
        }

        renderIndividualChats();
        updateUnreadCounts();

        if (currentChat) {
            const fresh = findIndividualChat(currentChat.id);
            if (fresh) {
                fresh.messages = currentChat.messages;
                currentChat = fresh;
                renderCurrentChat();
            }
        }

    });

}


// ======================================================
// RENDER CHAT LIST
// ======================================================

function renderIndividualChats() {

    const container = supportChatElement("individualChats");
    const emptyState = supportChatElement("noIndividualChats");

    if (!container) return;

    container.innerHTML = "";

    let chats = [...individualChats];

    if (currentChatFilter === "unread") {
        chats = chats.filter(function (chat) { return chat.unread > 0; });
    }

    if (currentChatFilter === "priority") {
        chats = chats.filter(function (chat) { return chat.priority; });
    }

    if (currentChatSearch.trim()) {
        const search = currentChatSearch.toLowerCase().trim();
        chats = chats.filter(function (chat) { return chat.name.toLowerCase().includes(search); });
    }

    if (chatSelectionMode && pendingBulkAction === "priority") {

        if (pendingPriorityMode === "add") {
            chats = chats.filter(function (chat) { return !chat.priority; });
        } else if (pendingPriorityMode === "remove") {
            chats = chats.filter(function (chat) { return chat.priority; });
        }

    }

    chats.sort(function (a, b) {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
    });

    if (chats.length === 0) {
        if (emptyState) emptyState.style.display = "flex";
        updateIndividualChatCount(0);
        return;
    }

    if (emptyState) emptyState.style.display = "none";

    chats.forEach(function (chat) {
        container.appendChild(createIndividualChatItem(chat));
    });

    updateIndividualChatCount(chats.length);

}

function createIndividualChatItem(chat) {

    const item = document.createElement("div");
    item.className = "chat-list-item";

    if (currentChat && currentChat.id === chat.id) {
        item.classList.add("active");
    }

    if (chat.unread > 0) {
        item.classList.add("unread");
    }

    if (selectedChatIds.includes(chat.id)) {
        item.classList.add("chat-selected");
    }

    item.dataset.chatId = chat.id;

    const avatar = document.createElement("div");
    avatar.className = "chat-list-avatar";
    avatar.textContent = getInitials(chat.name);

    const content = document.createElement("div");
    content.className = "chat-list-content";

    const top = document.createElement("div");
    top.className = "chat-list-top";

    const name = document.createElement("h4");
    name.textContent = chat.name;

    const time = document.createElement("span");
    time.textContent = chat.lastMessageTime;

    top.appendChild(name);
    top.appendChild(time);

    const bottom = document.createElement("div");
    bottom.className = "chat-list-bottom";

    const message = document.createElement("p");
    message.textContent = chat.lastMessage;

    bottom.appendChild(message);

    if (chat.unread > 0) {
        const unread = document.createElement("span");
        unread.className = "chat-unread-badge";
        unread.textContent = chat.unread;
        bottom.appendChild(unread);
    }

    if (chat.priority) {
        const priority = document.createElement("i");
        priority.className = "fa-solid fa-star chat-priority";
        bottom.appendChild(priority);
    }

    content.appendChild(top);
    content.appendChild(bottom);

    item.appendChild(avatar);
    item.appendChild(content);

    attachChatPressHandlers(item, chat.id, function () {
        openIndividualChat(chat.id);
    });

    return item;

}

function updateIndividualChatCount(count) {

    const element = supportChatElement("individualChatCount");
    if (!element) return;

    element.textContent = count + (count === 1 ? " conversation" : " conversations");

}

function filterChats(filter, button) {

    currentChatFilter = filter || "all";

    document.querySelectorAll("#individualSection .chat-filter")
        .forEach(function (item) { item.classList.remove("active"); });

    if (button) button.classList.add("active");

    renderIndividualChats();

}

function searchChats(value) {

    currentChatSearch = value || "";

    renderIndividualChats();

    const clearButton = supportChatElement("clearChatSearch");

    if (clearButton) {
        clearButton.style.display = currentChatSearch.length ? "block" : "none";
    }

}

function clearChatSearch() {

    const input = supportChatElement("chatSearch");
    if (input) input.value = "";

    currentChatSearch = "";

    const clearButton = supportChatElement("clearChatSearch");
    if (clearButton) clearButton.style.display = "none";

    renderIndividualChats();

}

function updateUnreadCounts() {

    const total = individualChats.reduce(function (sum, chat) {
        return sum + (Number(chat.unread) || 0);
    }, 0);

    const element = supportChatElement("individualUnread");
    if (element) element.textContent = total;

}


// ======================================================
// OPEN / CLOSE CHAT WINDOW
// ======================================================

function openIndividualChat(chatId) {

    const chat = findIndividualChat(chatId);
    if (!chat) return;

    if (chatSelectionMode) exitChatSelectionMode();
    closeMessageSearch();
    cancelReply();
    cancelEditMessage();

    currentChat = chat;
    currentChatType = "individual";
    currentUser = { id: chat.userId, name: chat.name, phone: chat.phone };

    openChatWindow();
    renderCurrentChat();

    if (!chat.messagesLoaded) {

        sb.from("support_messages")
            .select("*")
            .eq("conversation_id", chatId)
            .order("created_at", { ascending: true })
            .then(function (res) {

                if (res.error) {
                    console.error("Failed to load messages:", res.error);
                    return;
                }

                chat.messages = (res.data || []).map(mapSupportMessageRow);
                chat.messagesLoaded = true;

                if (currentChat && currentChat.id === chatId) {
                    renderMessages();
                    updatePinnedMessageBar();
                    scrollMessagesToBottom();
                }

            });

    } else {

        renderMessages();
        updatePinnedMessageBar();
        scrollMessagesToBottom();

    }

    markConversationRead(chatId);

}

function mapSupportMessageRow(row) {

    return {
        id: row.id,
        senderId: row.sender_id,
        senderType: row.sender_type,
        senderName: row.sender_type === "admin" ? "You" : (currentUser ? currentUser.name : "User"),
        text: row.content,
        createdAt: row.created_at,
        time: formatMessageTime(row.created_at),
        sent: row.sender_type === "admin",
        edited: !!row.edited_at,
        replyToId: row.reply_to_id,
        isPinned: row.is_pinned,
        type: row.message_type || "text",
        fileUrl: row.attachment_url,
        fileName: row.attachment_name,
        fileMime: row.attachment_mime
    };

}

function markConversationRead(chatId) {

    sb.from("support_conversations")
        .update({ admin_last_read_at: new Date().toISOString() })
        .eq("id", chatId)
        .then(function (res) {

            if (res.error) {
                console.error("Failed to mark conversation read:", res.error);
                return;
            }

            const chat = findIndividualChat(chatId);
            if (chat) chat.unread = 0;

            renderIndividualChats();
            updateUnreadCounts();

        });

}

function openChatWindow() {

    const emptyChat = supportChatElement("emptyChat");
    const chatWindow = supportChatElement("chatWindow");
    const chatMain = supportChatElement("chatMain");

    if (emptyChat) emptyChat.style.display = "none";
    if (chatWindow) chatWindow.classList.remove("hidden");
    if (chatMain) chatMain.classList.add("chat-open");

}

function closeChat() {

    const emptyChat = supportChatElement("emptyChat");
    const chatWindow = supportChatElement("chatWindow");
    const chatMain = supportChatElement("chatMain");

    if (emptyChat) emptyChat.style.display = "flex";
    if (chatWindow) chatWindow.classList.add("hidden");
    if (chatMain) chatMain.classList.remove("chat-open");

    currentChat = null;
    currentUser = null;

    closeMessageSearch();
    cancelReply();
    cancelEditMessage();
    closeChatMenu();

}

function renderCurrentChat() {

    if (!currentChat) return;

    const nameEl = supportChatElement("chatName");
    const statusEl = supportChatElement("chatStatus");
    const avatarImg = supportChatElement("chatAvatar");
    const avatarInitials = supportChatElement("chatAvatarInitials");
    const onlineDot = supportChatElement("chatOnlineStatus");

    if (nameEl) nameEl.textContent = currentChat.name;
    if (statusEl) statusEl.textContent = currentChat.phone + (currentChat.isBlocked ? " · Blocked" : "");

    if (avatarImg) avatarImg.style.display = "none";

    if (avatarInitials) {
        avatarInitials.classList.remove("hidden");
        avatarInitials.textContent = getInitials(currentChat.name);
    }

    if (onlineDot) onlineDot.style.display = "none";

    renderMessages();
    updatePinnedMessageBar();

}

function toggleChatMenu() {

    const menu = supportChatElement("chatMenu");
    const moreBtn = supportChatElement("chatMoreButton");
    const closeBtn = supportChatElement("chatMenuCloseButton");

    chatMenuOpen = !chatMenuOpen;

    if (menu) menu.classList.toggle("hidden", !chatMenuOpen);
    if (moreBtn) moreBtn.style.display = chatMenuOpen ? "none" : "";
    if (closeBtn) closeBtn.style.display = chatMenuOpen ? "" : "none";

}

function closeChatMenu() {

    chatMenuOpen = false;

    const menu = supportChatElement("chatMenu");
    const moreBtn = supportChatElement("chatMoreButton");
    const closeBtn = supportChatElement("chatMenuCloseButton");

    if (menu) menu.classList.add("hidden");
    if (moreBtn) moreBtn.style.display = "";
    if (closeBtn) closeBtn.style.display = "none";

}

function setupChatMenuOutsideClick() {

    document.addEventListener("click", function (event) {

        if (!chatMenuOpen) return;

        const menu = supportChatElement("chatMenu");
        const moreBtn = supportChatElement("chatMoreButton");

        if (menu && (menu.contains(event.target) || (moreBtn && moreBtn.contains(event.target)))) {
            return;
        }

        closeChatMenu();

    });

}


// ======================================================
// RENDER MESSAGES
// ======================================================

function renderMessages() {

    const container = supportChatElement("messages");
    if (!container || !currentChat) return;

    container.innerHTML = "";

    (currentChat.messages || []).forEach(function (message) {
        container.appendChild(createMessageElement(message));
    });

    if (messageSearchActive) {
        performMessageSearch();
    }

}

function createMessageElement(message) {

    const wrapper = document.createElement("div");
    wrapper.className = "message " + (message.sent ? "sent" : "received");
    wrapper.dataset.messageId = message.id;

    if (message.isPinned) {
        wrapper.classList.add("message-pinned");
    }

    if (pinMessageSelectionMode) {

        wrapper.classList.add("pin-selection-mode");

        if (selectedPinMessageIds.includes(message.id)) {
            wrapper.classList.add("pin-message-selected");
        }

        wrapper.addEventListener("click", function (event) {

            if (event.target.closest(".message-actions") || event.target.closest(".message-action-menu")) {
                return;
            }

            event.stopPropagation();
            togglePinMessageSelection(message.id);

        });

    }

    const content = document.createElement("div");
    content.className = "message-content";

    if (message.replyToId) {

        const replied = currentChat.messages.find(function (m) { return m.id === message.replyToId; });

        const reply = document.createElement("div");
        reply.className = "message-reply";
        reply.dataset.replyMessageId = message.replyToId;

        const replySender = document.createElement("strong");
        replySender.className = "message-reply-sender";
        replySender.textContent = replied ? (replied.sent ? "You" : replied.senderName) : "Message";

        const replyText = document.createElement("span");
        replyText.className = "message-reply-text";
        replyText.textContent = replied ? replied.text : "Original message not available";

        reply.appendChild(replySender);
        reply.appendChild(replyText);

        reply.addEventListener("click", function (event) {
            event.stopPropagation();
            openRepliedMessage(message.replyToId);
        });

        content.appendChild(reply);

    }

    if (message.type === "voice" && message.fileUrl) {

        const audio = document.createElement("audio");
        audio.className = "message-voice-player";
        audio.controls = true;
        audio.src = message.fileUrl;

        content.appendChild(audio);

    } else if (message.type !== "text" && message.fileUrl) {

        const isImage = message.fileMime && message.fileMime.indexOf("image/") === 0;

        if (isImage) {

            const link = document.createElement("a");
            link.href = message.fileUrl;
            link.target = "_blank";
            link.rel = "noopener";
            link.className = "message-attachment-image-link";

            const img = document.createElement("img");
            img.className = "message-attachment-image";
            img.src = message.fileUrl;
            img.alt = message.fileName || "Image";

            link.appendChild(img);
            content.appendChild(link);

        } else {

            const fileCard = document.createElement("a");
            fileCard.href = message.fileUrl;
            fileCard.target = "_blank";
            fileCard.rel = "noopener";
            fileCard.className = "message-attachment-file";
            fileCard.innerHTML =
                '<i class="fa-solid fa-file"></i><span>' +
                supportEscapeHtml(message.fileName || message.text || "File") +
                "</span>";

            content.appendChild(fileCard);

        }

        const caption = document.createElement("p");
        caption.className = "message-text";
        caption.textContent = message.text || "";
        content.appendChild(caption);

    } else {

        const text = document.createElement("p");
        text.className = "message-text";
        text.textContent = message.text || "";
        content.appendChild(text);

    }

    const meta = document.createElement("div");
    meta.className = "message-meta";

    const time = document.createElement("span");
    time.textContent = message.time || "";
    meta.appendChild(time);

    if (message.edited) {
        const edited = document.createElement("span");
        edited.textContent = " edited";
        meta.appendChild(edited);
    }

    if (message.isPinned) {
        const pin = document.createElement("i");
        pin.className = "fa-solid fa-thumbtack message-pin-indicator";
        meta.appendChild(pin);
    }

    if (message.sent) {
        const status = document.createElement("i");
        status.className = "fa-solid fa-check";
        meta.appendChild(status);
    }

    content.appendChild(meta);
    wrapper.appendChild(content);

    setupMessageActionEvents(wrapper, message.id);

    return wrapper;

}

function scrollMessagesToBottom() {

    const container = supportChatElement("messages");
    if (container) container.scrollTop = container.scrollHeight;

}


// ======================================================
// COMPOSER — SEND / REPLY / EDIT
// ======================================================

function getMessageInput() {
    return supportChatElement("messageInput");
}

function getMessageText() {

    const input = getMessageInput();
    if (!input) return "";

    return String(input.value || "").trim();

}

function clearMessageInput() {

    const input = getMessageInput();
    if (!input) return;

    input.value = "";
    input.dataset.editing = "false";
    delete input.dataset.editingMessageId;
    input.focus();

}

function messageInputHasText() {
    return getMessageText().length > 0;
}

function setupComposerEvents() {

    const input = getMessageInput();
    if (!input) return;

    input.addEventListener("keydown", handleMessageInputKeydown);

    input.addEventListener("input", function () {

        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 120) + "px";

    });

}

function handleMessageInputKeydown(event) {

    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }

}

function isEditingMessage() {
    return !!editingMessage;
}

function sendMessage() {

    if (isEditingMessage()) {
        saveEditedMessage();
        return;
    }

    if (!currentChat) return;

    const text = getMessageText();
    if (!text) return;

    const replyToId = replyingToMessage ? replyingToMessage.id : null;

    clearMessageInput();
    cancelReply();

    sb.from("support_messages")
        .insert({
            conversation_id: currentChat.id,
            sender_type: "admin",
            sender_id: supportAdminId,
            content: text,
            reply_to_id: replyToId
        })
        .select("*")
        .single()
        .then(function (res) {

            if (res.error) {
                alert("Failed to send message: " + res.error.message);
                return;
            }

            if (!currentChat.messages.some(function (m) { return m.id === res.data.id; })) {
                currentChat.messages.push(mapSupportMessageRow(res.data));
                renderMessages();
                scrollMessagesToBottom();
            }

            loadSupportConversations();

        });

}


// ======================================================
// REPLY
// ======================================================

function replyToMessage(messageId) {

    if (!currentChat) return;

    const message = currentChat.messages.find(function (item) { return item.id === messageId; });
    if (!message) return;

    if (editingMessage) cancelEditMessage();

    replyingToMessage = message;
    showReplyPreview(message);

    const input = getMessageInput();
    if (input) input.focus();

}

function showReplyPreview(message) {

    const preview = supportChatElement("replyPreview");
    if (!preview) return;

    const textElement = supportChatElement("replyMessage");
    const senderElement = supportChatElement("replyUser");

    if (senderElement) senderElement.textContent = message.sent ? "You" : (message.senderName || "User");
    if (textElement) textElement.textContent = message.text || "";

    preview.dataset.messageId = message.id;
    preview.classList.remove("hidden");

}

function closeReplyPreview() {

    const preview = supportChatElement("replyPreview");
    if (!preview) return;

    preview.classList.add("hidden");
    delete preview.dataset.messageId;

}

function cancelReply() {

    replyingToMessage = null;
    closeReplyPreview();

}

function setupReplyPreviewEvents() {
    // Reply-preview cancel button already wired via onclick="cancelReply()" in HTML.
}

function findMessageElement(messageId) {
    return document.querySelector('.message[data-message-id="' + messageId + '"]');
}

let messageHighlightTimeout = null;
let highlightedMessageElement = null;

function scrollToMessage(messageId) {

    const element = findMessageElement(messageId);
    if (!element) return;

    element.scrollIntoView({ behavior: "smooth", block: "center" });

    if (highlightedMessageElement) {
        highlightedMessageElement.classList.remove("message-highlight");
    }

    element.classList.add("message-highlight");
    highlightedMessageElement = element;

    if (messageHighlightTimeout) clearTimeout(messageHighlightTimeout);

    messageHighlightTimeout = setTimeout(function () {
        element.classList.remove("message-highlight");
    }, 1600);

}

function openRepliedMessage(messageId) {
    scrollToMessage(messageId);
}


// ======================================================
// EDIT (admin's own sent messages only — enforced for
// real by a DB trigger too, not just this UI check)
// ======================================================

function startEditMessage(messageId) {

    if (!currentChat) return;

    const message = currentChat.messages.find(function (item) { return item.id === messageId; });
    if (!message) return;

    if (!message.sent) return;
    if (message.type === "voice") return;

    if (replyingToMessage) cancelReply();

    editingMessage = message;

    const input = supportChatElement("messageInput");
    if (!input) return;

    input.value = message.text || "";
    input.dataset.editing = "true";
    input.dataset.editingMessageId = message.id;

    showEditPreview(message);

    setTimeout(function () {
        input.focus();
        const length = input.value.length;
        if (typeof input.setSelectionRange === "function") {
            input.setSelectionRange(length, length);
        }
    }, 50);

    closeMessageActionMenu();
    closeChatMenu();

}

function showEditPreview(message) {

    const preview = supportChatElement("editPreview");
    if (!preview) return;

    const textElement = supportChatElement("editMessage");
    if (textElement) textElement.textContent = message.text || "";

    preview.classList.remove("hidden");

}

function cancelEditMessage() {

    editingMessage = null;

    const input = supportChatElement("messageInput");

    if (input) {
        input.dataset.editing = "false";
        delete input.dataset.editingMessageId;
        input.value = "";
    }

    const editPreview = supportChatElement("editPreview");

    if (editPreview) {
        editPreview.classList.add("hidden");
    }

}

function saveEditedMessage() {

    if (!editingMessage) return false;

    const input = supportChatElement("messageInput");
    if (!input) return false;

    const newText = input.value.trim();
    if (!newText) return false;

    if (newText === editingMessage.text) {
        cancelEditMessage();
        return false;
    }

    const messageId = editingMessage.id;

    sb.from("support_messages")
        .update({ content: newText })
        .eq("id", messageId)
        .select("*")
        .single()
        .then(function (res) {

            if (res.error) {
                alert("Failed to save edit: " + res.error.message);
                return;
            }

            const target = currentChat && currentChat.messages.find(function (m) { return m.id === messageId; });

            if (target) {
                target.text = res.data.content;
                target.edited = !!res.data.edited_at;
                renderMessages();
            }

            loadSupportConversations();

        });

    editingMessage = null;
    input.value = "";
    input.dataset.editing = "false";
    delete input.dataset.editingMessageId;

    const preview = supportChatElement("editPreview");
    if (preview) preview.classList.add("hidden");

    return true;

}


// ======================================================
// MESSAGE ACTION MENU (long-press / right-click on a message)
// ======================================================

let messageLongPressTimer = null;
let activeMessageActionMenu = null;
let activeActionMessageId = null;

function setupMessageActionEvents(wrapper, messageId) {

    let startX = 0;
    let startY = 0;

    function startTimer(x, y) {
        startX = x;
        startY = y;
        clearTimeout(messageLongPressTimer);
        messageLongPressTimer = setTimeout(function () {
            showMessageActionMenu(wrapper, messageId);
        }, CHAT_LONG_PRESS_DURATION);
    }

    function cancelTimer() {
        clearTimeout(messageLongPressTimer);
    }

    wrapper.addEventListener("mousedown", function (e) { startTimer(e.clientX, e.clientY); });
    wrapper.addEventListener("mouseup", cancelTimer);
    wrapper.addEventListener("mouseleave", cancelTimer);

    wrapper.addEventListener("touchstart", function (e) {
        const t = e.touches[0];
        startTimer(t.clientX, t.clientY);
    }, { passive: true });

    wrapper.addEventListener("touchmove", function (e) {
        const t = e.touches[0];
        if (Math.abs(t.clientX - startX) > CHAT_LONG_PRESS_MOVE_TOLERANCE ||
            Math.abs(t.clientY - startY) > CHAT_LONG_PRESS_MOVE_TOLERANCE) {
            cancelTimer();
        }
    }, { passive: true });

    wrapper.addEventListener("touchend", cancelTimer);
    wrapper.addEventListener("touchcancel", cancelTimer);

    wrapper.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        showMessageActionMenu(wrapper, messageId);
    });

}

function getMessageElement(target) {
    return target.closest(".message");
}

function getMessageId(messageElement) {
    return messageElement ? messageElement.dataset.messageId : null;
}

function closeMessageActionMenu() {

    if (activeMessageActionMenu) {
        activeMessageActionMenu.remove();
        activeMessageActionMenu = null;
    }

    activeActionMessageId = null;

    document.removeEventListener("click", closeMessageActionMenuOnOutsideClick);

}

function showMessageActionMenu(messageElement, messageId) {

    closeMessageActionMenu();

    if (!messageElement || !messageId) return;
    if (pinMessageSelectionMode) return;

    activeActionMessageId = messageId;

    const targetMessage = currentChat
        ? currentChat.messages.find(function (item) { return item.id === messageId; })
        : null;

    if (!targetMessage) return;

    const canEdit = targetMessage.sent && targetMessage.type !== "voice";

    const editButtonMarkup = canEdit
        ? '<button type="button" data-action="edit"><i class="fa-solid fa-pen"></i><span>Edit</span></button>'
        : "";

    const pinLabel = targetMessage.isPinned ? "Unpin" : "Pin";
    const pinIcon = targetMessage.isPinned ? "fa-solid fa-thumbtack-slash" : "fa-solid fa-thumbtack";

    const menu = document.createElement("div");
    menu.className = "message-action-menu";

    menu.innerHTML =
        '<button type="button" data-action="reply"><i class="fa-solid fa-reply"></i><span>Reply</span></button>' +
        editButtonMarkup +
        '<button type="button" data-action="pin"><i class="' + pinIcon + '"></i><span>' + pinLabel + '</span></button>' +
        '<button type="button" data-action="copy"><i class="fa-solid fa-copy"></i><span>Copy</span></button>' +
        '<button type="button" data-action="delete"><i class="fa-solid fa-trash"></i><span>Delete</span></button>' +
        '<button type="button" data-action="close"><i class="fa-solid fa-xmark"></i><span>Close</span></button>';

    document.body.appendChild(menu);
    activeMessageActionMenu = menu;

    const rect = messageElement.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    let top = rect.top - menuRect.height - 8;
    let left = rect.left;

    if (top < 10) top = rect.bottom + 8;
    if (left + menuRect.width > window.innerWidth - 10) left = window.innerWidth - menuRect.width - 10;
    if (left < 10) left = 10;
    if (top + menuRect.height > window.innerHeight - 10) top = window.innerHeight - menuRect.height - 10;
    if (top < 10) top = 10;

    menu.style.position = "fixed";
    menu.style.top = top + "px";
    menu.style.left = left + "px";
    menu.style.zIndex = "999999";

    menu.addEventListener("click", function (event) {

        const button = event.target.closest("button");
        if (!button) return;

        const action = button.dataset.action;

        if (action === "close") {
            closeMessageActionMenu();
            return;
        }

        closeMessageActionMenu();

        if (action === "reply") { replyToMessage(messageId); return; }
        if (action === "edit") { startEditMessage(messageId); return; }
        if (action === "pin") { toggleSingleMessagePin(messageId, !targetMessage.isPinned); return; }
        if (action === "copy") { copyMessage(messageId); return; }
        if (action === "delete") { deleteMessage(messageId); return; }

    });

    setTimeout(function () {
        document.addEventListener("click", closeMessageActionMenuOnOutsideClick);
    }, 0);

}

function closeMessageActionMenuOnOutsideClick(event) {

    if (activeMessageActionMenu && !activeMessageActionMenu.contains(event.target)) {
        closeMessageActionMenu();
        document.removeEventListener("click", closeMessageActionMenuOnOutsideClick);
    }

}

function copyMessage(messageId) {

    const message = currentChat && currentChat.messages.find(function (m) { return m.id === messageId; });
    if (!message) return;

    const text = message.text || "";

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () { fallbackCopyMessage(text); });
    } else {
        fallbackCopyMessage(text);
    }

}

function fallbackCopyMessage(text) {

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try { document.execCommand("copy"); } catch (e) { /* no-op */ }

    document.body.removeChild(textarea);

}


// ======================================================
// DELETE MESSAGE (shared confirm modal)
// ======================================================

function deleteMessage(messageId) {

    if (!currentChat) return;

    deleteActionType = "message";
    deleteActionId = messageId;

    const titleElement = supportChatElement("deleteConfirmTitle");
    const textElement = supportChatElement("deleteConfirmText");
    const confirmBtn = supportChatElement("confirmDeleteBtn");
    const modal = supportChatElement("deleteConfirmModal");

    if (titleElement) titleElement.textContent = "Delete Message?";
    if (textElement) textElement.textContent = "This will permanently delete this message. This action cannot be undone.";
    if (confirmBtn) confirmBtn.textContent = "Delete";
    if (modal) modal.classList.remove("hidden");

}

function closeDeleteConfirmation() {

    const modal = supportChatElement("deleteConfirmModal");
    if (modal) modal.classList.add("hidden");

    deleteActionType = null;
    deleteActionId = null;
    deleteActionIds = [];

}

function confirmDeleteAction() {

    if (deleteActionType === "message") {

        const messageId = deleteActionId;

        sb.from("support_messages").delete().eq("id", messageId).then(function (res) {

            if (res.error) {
                alert("Failed to delete message: " + res.error.message);
                return;
            }

            if (currentChat) {

                const index = currentChat.messages.findIndex(function (m) { return m.id === messageId; });

                if (index !== -1) currentChat.messages.splice(index, 1);
                if (replyingToMessage && replyingToMessage.id === messageId) cancelReply();
                if (editingMessage && editingMessage.id === messageId) cancelEditMessage();

                renderMessages();
                updatePinnedMessageBar();

            }

            loadSupportConversations();

        });

    } else if (deleteActionType === "chat") {

        const chatId = deleteActionId;

        sb.from("support_conversations").delete().eq("id", chatId).then(function (res) {

            if (res.error) {
                alert("Failed to delete conversation: " + res.error.message);
                return;
            }

            const index = individualChats.findIndex(function (c) { return c.id === chatId; });
            if (index !== -1) individualChats.splice(index, 1);

            if (currentChat && currentChat.id === chatId) closeChat();

            renderIndividualChats();
            updateUnreadCounts();

        });

    } else if (deleteActionType === "bulkChats") {

        const ids = deleteActionIds;

        sb.from("support_conversations").delete().in("id", ids).then(function (res) {

            if (res.error) {
                alert("Failed to delete conversations: " + res.error.message);
                return;
            }

            individualChats = individualChats.filter(function (c) { return !ids.includes(c.id); });

            if (currentChat && ids.includes(currentChat.id)) closeChat();

            renderIndividualChats();
            updateUnreadCounts();
            exitChatSelectionMode();

        });

    } else if (deleteActionType === "clearMessages") {

        const chatId = deleteActionId;

        sb.from("support_messages").delete().eq("conversation_id", chatId).then(function (res) {

            if (res.error) {
                alert("Failed to clear messages: " + res.error.message);
                return;
            }

            const chat = findIndividualChat(chatId);

            if (chat) {
                chat.messages = [];
                chat.lastMessage = "No messages yet";
            }

            if (currentChat && currentChat.id === chatId) {
                renderMessages();
                updatePinnedMessageBar();
            }

            loadSupportConversations();

        });

    }

    closeDeleteConfirmation();

}


// ======================================================
// MARK UNREAD / CLEAR MESSAGES / DELETE CHAT
// ======================================================

function markChatUnread() {

    if (!currentChat) return;

    sb.from("support_conversations")
        .update({ admin_last_read_at: null })
        .eq("id", currentChat.id)
        .then(function (res) {

            if (res.error) {
                alert("Failed to mark as unread: " + res.error.message);
                return;
            }

            loadSupportConversations();

        });

    closeChatMenu();

}

function clearChatMessages() {

    if (!currentChat) return;

    closeChatMenu();

    deleteActionType = "clearMessages";
    deleteActionId = currentChat.id;

    const titleElement = supportChatElement("deleteConfirmTitle");
    const textElement = supportChatElement("deleteConfirmText");
    const confirmBtn = supportChatElement("confirmDeleteBtn");
    const modal = supportChatElement("deleteConfirmModal");

    if (titleElement) titleElement.textContent = "Clear Messages?";
    if (textElement) textElement.textContent = "All messages in this chat will be permanently deleted.";
    if (confirmBtn) confirmBtn.textContent = "Clear";
    if (modal) modal.classList.remove("hidden");

}

function deleteCurrentChat() {

    if (!currentChat) return;

    closeChatMenu();

    deleteActionType = "chat";
    deleteActionId = currentChat.id;

    const titleElement = supportChatElement("deleteConfirmTitle");
    const textElement = supportChatElement("deleteConfirmText");
    const confirmBtn = supportChatElement("confirmDeleteBtn");
    const modal = supportChatElement("deleteConfirmModal");

    if (titleElement) titleElement.textContent = "Delete Conversation?";
    if (textElement) textElement.textContent = "This will permanently delete your conversation with " + currentChat.name + ". This action cannot be undone.";
    if (confirmBtn) confirmBtn.textContent = "Delete";
    if (modal) modal.classList.remove("hidden");

}


// ======================================================
// PIN MESSAGES
// ======================================================

function getPinnedMessages() {

    if (!currentChat) return [];

    return currentChat.messages.filter(function (m) { return m.isPinned; });

}

function openPinMessages() {

    closeChatMenu();

    const modal = supportChatElement("pinMessagesModal");
    if (modal) modal.classList.remove("hidden");

}

function closePinMessages() {

    const modal = supportChatElement("pinMessagesModal");
    if (modal) modal.classList.add("hidden");

}

function openWritePinMessage() {

    closePinMessages();

    const modal = supportChatElement("writePinMessageModal");
    const input = supportChatElement("pinMessageInput");

    if (input) input.value = "";

    updatePinMessageCharacterCount();

    if (modal) modal.classList.remove("hidden");

}

function closeWritePinMessage() {

    const modal = supportChatElement("writePinMessageModal");
    if (modal) modal.classList.add("hidden");

}

function updatePinMessageCharacterCount() {

    const input = supportChatElement("pinMessageInput");
    const counter = supportChatElement("pinMessageCharacterCount");

    if (input && counter) counter.textContent = input.value.length;

}

function setupPinMessageInput() {

    const input = supportChatElement("pinMessageInput");

    if (input) {
        input.addEventListener("input", updatePinMessageCharacterCount);
    }

}

function createPinnedMessage() {

    if (!currentChat) return;

    const input = supportChatElement("pinMessageInput");
    const text = input ? input.value.trim() : "";

    if (!text) return;

    sb.from("support_messages")
        .insert({
            conversation_id: currentChat.id,
            sender_type: "admin",
            sender_id: supportAdminId,
            content: text,
            is_pinned: true,
            pinned_at: new Date().toISOString(),
            pinned_by: supportAdminId
        })
        .select("*")
        .single()
        .then(function (res) {

            if (res.error) {
                alert("Failed to pin message: " + res.error.message);
                return;
            }

            currentChat.messages.push(mapSupportMessageRow(res.data));

            renderMessages();
            updatePinnedMessageBar();
            scrollMessagesToBottom();

            closeWritePinMessage();
            loadSupportConversations();

        });

}

function startSelectPinnedMessages() {

    closePinMessages();

    pinMessageSelectionMode = true;
    selectedPinMessageIds = [];

    renderMessages();
    updatePinMessageSelectionBar();

}

function cancelPinMessageSelection() {

    pinMessageSelectionMode = false;
    selectedPinMessageIds = [];

    renderMessages();
    updatePinMessageSelectionBar();

}

function setupPinSelectionOutsideClick() {
    // Selection is exited explicitly (Cancel / Pin buttons) — no outside-click needed.
}

function togglePinMessageSelection(messageId) {

    const index = selectedPinMessageIds.indexOf(messageId);

    if (index === -1) {
        selectedPinMessageIds.push(messageId);
    } else {
        selectedPinMessageIds.splice(index, 1);
    }

    renderMessages();
    updatePinMessageSelectionBar();

}

function updatePinMessageSelectionBar() {

    const bar = supportChatElement("pinMessageSelectionBar");
    const countLabel = supportChatElement("selectedPinMessageCount");

    if (bar) bar.classList.toggle("hidden", !pinMessageSelectionMode);
    if (countLabel) countLabel.textContent = selectedPinMessageIds.length;

}

function pinSelectedMessages() {

    if (selectedPinMessageIds.length === 0) {
        cancelPinMessageSelection();
        return;
    }

    const ids = selectedPinMessageIds;

    sb.from("support_messages")
        .update({ is_pinned: true, pinned_at: new Date().toISOString(), pinned_by: supportAdminId })
        .in("id", ids)
        .then(function (res) {

            if (res.error) {
                alert("Failed to pin messages: " + res.error.message);
                return;
            }

            currentChat.messages.forEach(function (m) {
                if (ids.includes(m.id)) m.isPinned = true;
            });

            cancelPinMessageSelection();
            updatePinnedMessageBar();

        });

}

function toggleSingleMessagePin(messageId, pin) {

    sb.from("support_messages")
        .update(pin
            ? { is_pinned: true, pinned_at: new Date().toISOString(), pinned_by: supportAdminId }
            : { is_pinned: false, pinned_at: null, pinned_by: null })
        .eq("id", messageId)
        .then(function (res) {

            if (res.error) {
                alert("Failed to update pin: " + res.error.message);
                return;
            }

            const target = currentChat && currentChat.messages.find(function (m) { return m.id === messageId; });
            if (target) target.isPinned = pin;

            renderMessages();
            updatePinnedMessageBar();

        });

}

function unpinCurrentPinnedMessage() {

    const pinned = getPinnedMessages();
    const message = pinned[currentPinnedMessageIndex];

    if (!message) return;

    toggleSingleMessagePin(message.id, false);

}

function updatePinnedMessageBar() {

    const bar = supportChatElement("pinnedMessageBar");
    const textEl = supportChatElement("pinnedMessageText");
    const counterEl = supportChatElement("pinnedMessageCounter");
    const pinText = supportChatElement("messagePinText");

    const pinned = getPinnedMessages();

    if (pinText) pinText.textContent = pinned.length > 0 ? "Pinned Messages (" + pinned.length + ")" : "Pin Messages";

    if (!bar) return;

    if (pinned.length === 0) {
        bar.classList.add("hidden");
        currentPinnedMessageIndex = 0;
        return;
    }

    bar.classList.remove("hidden");

    if (currentPinnedMessageIndex >= pinned.length) {
        currentPinnedMessageIndex = pinned.length - 1;
    }

    const current = pinned[currentPinnedMessageIndex];

    if (textEl) textEl.textContent = current.text || "";
    if (counterEl) counterEl.textContent = (currentPinnedMessageIndex + 1) + " of " + pinned.length;

}

function nextPinnedMessage() {

    const pinned = getPinnedMessages();
    if (pinned.length === 0) return;

    currentPinnedMessageIndex = (currentPinnedMessageIndex + 1) % pinned.length;
    updatePinnedMessageBar();
    scrollToCurrentPinnedMessage();

}

function previousPinnedMessage() {

    const pinned = getPinnedMessages();
    if (pinned.length === 0) return;

    currentPinnedMessageIndex = (currentPinnedMessageIndex - 1 + pinned.length) % pinned.length;
    updatePinnedMessageBar();
    scrollToCurrentPinnedMessage();

}

function scrollToCurrentPinnedMessage() {

    const pinned = getPinnedMessages();
    const message = pinned[currentPinnedMessageIndex];

    if (message) scrollToMessage(message.id);

}


// ======================================================
// MESSAGE SEARCH (within the open chat)
// ======================================================

function searchMessages() {

    closeChatMenu();

    messageSearchActive = true;
    messageSearchQuery = "";
    messageSearchResults = [];
    currentMessageSearchIndex = -1;

    const bar = supportChatElement("messageSearchBar");
    const input = supportChatElement("messageSearchInput");

    if (bar) bar.classList.remove("hidden");
    if (input) { input.value = ""; input.focus(); }

}

function closeMessageSearch() {

    messageSearchActive = false;
    messageSearchQuery = "";
    messageSearchResults = [];
    currentMessageSearchIndex = -1;

    const bar = supportChatElement("messageSearchBar");
    if (bar) bar.classList.add("hidden");

    renderMessages();

}

function setupMessageSearchEvents() {

    const input = supportChatElement("messageSearchInput");

    if (input) {
        input.addEventListener("input", function () {
            messageSearchQuery = input.value;
            performMessageSearch();
        });
    }

}

function performMessageSearch() {

    if (!currentChat) return;

    const query = messageSearchQuery.trim().toLowerCase();

    document.querySelectorAll("#messages .message-text").forEach(function (el) {
        el.innerHTML = supportEscapeHtml(el.textContent);
    });

    if (!query) {
        messageSearchResults = [];
        currentMessageSearchIndex = -1;
        return;
    }

    messageSearchResults = currentChat.messages
        .filter(function (m) { return (m.text || "").toLowerCase().includes(query); })
        .map(function (m) { return m.id; });

    currentMessageSearchIndex = messageSearchResults.length > 0 ? 0 : -1;

    messageSearchResults.forEach(function (id) {
        const el = findMessageElement(id);
        const textEl = el ? el.querySelector(".message-text") : null;
        if (textEl) highlightMessageText(textEl, query);
    });

    scrollToMessageSearchResult();

}

function highlightMessageText(textEl, query) {

    const original = textEl.textContent;
    const lower = original.toLowerCase();
    const index = lower.indexOf(query);

    if (index === -1) return;

    textEl.innerHTML =
        supportEscapeHtml(original.slice(0, index)) +
        '<mark class="message-search-highlight">' + supportEscapeHtml(original.slice(index, index + query.length)) + '</mark>' +
        supportEscapeHtml(original.slice(index + query.length));

}

function scrollToMessageSearchResult() {

    if (currentMessageSearchIndex === -1) return;

    const id = messageSearchResults[currentMessageSearchIndex];
    if (id) scrollToMessage(id);

}

function nextMessageSearchResult() {

    if (messageSearchResults.length === 0) return;

    currentMessageSearchIndex = (currentMessageSearchIndex + 1) % messageSearchResults.length;
    scrollToMessageSearchResult();

}

function previousMessageSearchResult() {

    if (messageSearchResults.length === 0) return;

    currentMessageSearchIndex = (currentMessageSearchIndex - 1 + messageSearchResults.length) % messageSearchResults.length;
    scrollToMessageSearchResult();

}


// ======================================================
// ATTACHMENTS (real upload to the "support-chat" storage bucket)
// ======================================================

function toggleAttachmentMenu() {

    attachmentMenuOpen = !attachmentMenuOpen;

    const menu = supportChatElement("attachmentMenu");
    if (menu) menu.classList.toggle("hidden", !attachmentMenuOpen);

}

function closeAttachmentMenu() {

    attachmentMenuOpen = false;

    const menu = supportChatElement("attachmentMenu");
    if (menu) menu.classList.add("hidden");

}

function attachPhoto() {

    closeAttachmentMenu();

    const input = supportChatElement("photoInput");
    if (input) input.click();

}

function attachDocument() {

    closeAttachmentMenu();

    const input = supportChatElement("documentInput");
    if (input) input.click();

}

function attachCamera() {

    closeAttachmentMenu();

    const input = supportChatElement("cameraInput");
    if (input) input.click();

}

function setupAttachmentEvents() {

    const photoInput = supportChatElement("photoInput");
    const documentInput = supportChatElement("documentInput");
    const cameraInput = supportChatElement("cameraInput");

    if (photoInput) photoInput.addEventListener("change", function (e) { handleAttachmentFileChange(e, "photo"); });
    if (documentInput) documentInput.addEventListener("change", function (e) { handleAttachmentFileChange(e, "document"); });
    if (cameraInput) cameraInput.addEventListener("change", function (e) { handleAttachmentFileChange(e, "camera"); });

    document.addEventListener("click", function (event) {

        if (!attachmentMenuOpen) return;

        const menu = supportChatElement("attachmentMenu");
        const btn = document.querySelector('[onclick="toggleAttachmentMenu()"]');

        if (menu && (menu.contains(event.target) || (btn && btn.contains(event.target)))) return;

        closeAttachmentMenu();

    });

}

function handleAttachmentFileChange(event, kind) {

    const file = event.target.files && event.target.files[0];
    event.target.value = "";

    if (!file || !currentChat) return;

    uploadAndSendAttachment(file, kind);

}

function uploadAndSendAttachment(file, kind) {

    const path = currentChat.id + "/" + Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");

    sb.storage.from("support-chat").upload(path, file).then(function (uploadRes) {

        if (uploadRes.error) {
            alert("Failed to upload file: " + uploadRes.error.message);
            return;
        }

        const publicUrlRes = sb.storage.from("support-chat").getPublicUrl(path);
        const url = publicUrlRes.data.publicUrl;

        const label =
            (kind === "camera" ? "📷 " : kind === "document" ? "📎 " : "🖼️ ") + file.name;

        sb.from("support_messages")
            .insert({
                conversation_id: currentChat.id,
                sender_type: "admin",
                sender_id: supportAdminId,
                content: label,
                message_type: kind === "document" ? "document" : "photo",
                attachment_url: url,
                attachment_name: file.name,
                attachment_mime: file.type
            })
            .select("*")
            .single()
            .then(function (res) {

                if (res.error) {
                    alert("Failed to send attachment: " + res.error.message);
                    return;
                }

                currentChat.messages.push(mapSupportMessageRow(res.data));
                renderMessages();
                scrollMessagesToBottom();
                loadSupportConversations();

            });

    });

}


// ======================================================
// VOICE MESSAGE (real recording, real upload)
// ======================================================

function startVoiceMessage() {

    if (isRecordingVoice) {
        stopVoiceRecording(true);
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Voice recording is not supported in this browser.");
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {

        voiceStream = stream;
        voiceRecordedChunks = [];

        voiceMediaRecorder = new MediaRecorder(stream);

        voiceMediaRecorder.addEventListener("dataavailable", function (e) {
            if (e.data && e.data.size > 0) voiceRecordedChunks.push(e.data);
        });

        voiceMediaRecorder.addEventListener("stop", function () {

            const blob = new Blob(voiceRecordedChunks, { type: "audio/webm" });

            voiceStream.getTracks().forEach(function (track) { track.stop(); });
            voiceStream = null;

            if (blob.size > 0 && currentChat) {
                uploadAndSendVoiceMessage(blob);
            }

        });

        voiceMediaRecorder.start();
        isRecordingVoice = true;

        const btn = supportChatElement("voiceMessageBtn");
        if (btn) btn.classList.add("recording");

    }).catch(function () {
        alert("Microphone access was denied.");
    });

}

function stopVoiceRecording() {

    if (voiceMediaRecorder && isRecordingVoice) {
        voiceMediaRecorder.stop();
    }

    isRecordingVoice = false;

    const btn = supportChatElement("voiceMessageBtn");
    if (btn) btn.classList.remove("recording");

}

function uploadAndSendVoiceMessage(blob) {

    const path = currentChat.id + "/" + Date.now() + "-voice.webm";

    sb.storage.from("support-chat").upload(path, blob, { contentType: "audio/webm" }).then(function (uploadRes) {

        if (uploadRes.error) {
            alert("Failed to upload voice message: " + uploadRes.error.message);
            return;
        }

        const publicUrlRes = sb.storage.from("support-chat").getPublicUrl(path);
        const url = publicUrlRes.data.publicUrl;

        sb.from("support_messages")
            .insert({
                conversation_id: currentChat.id,
                sender_type: "admin",
                sender_id: supportAdminId,
                content: "🎤 Voice message",
                message_type: "voice",
                attachment_url: url,
                attachment_name: "voice-message.webm",
                attachment_mime: "audio/webm"
            })
            .select("*")
            .single()
            .then(function (res) {

                if (res.error) {
                    alert("Failed to send voice message: " + res.error.message);
                    return;
                }

                currentChat.messages.push(mapSupportMessageRow(res.data));
                renderMessages();
                scrollMessagesToBottom();
                loadSupportConversations();

            });

    });

}


// ======================================================
// NEW CHAT MODAL
// ======================================================

function openNewChatModal() {

    const modal = supportChatElement("newChatModal");
    const input = supportChatElement("userSearchInput");

    if (input) input.value = "";

    if (supportChatUsers.length > 0) {

        renderAvailableUsers("");

    } else {

        sb.from("profiles")
            .select("id, username, surname, phone")
            .order("username", { ascending: true })
            .then(function (res) {

                if (res.error) {
                    console.error("Failed to load users:", res.error);
                    return;
                }

                supportChatUsers = (res.data || []).map(function (row) {
                    return { id: row.id, name: fullNameOf(row), phone: row.phone };
                });

                renderAvailableUsers("");

            });

    }

    if (modal) modal.classList.remove("hidden");

}

function closeNewChatModal() {

    const modal = supportChatElement("newChatModal");
    if (modal) modal.classList.add("hidden");

}

function renderAvailableUsers(query) {

    const container = supportChatElement("availableUsers");
    if (!container) return;

    const search = (query || "").trim().toLowerCase();

    let users = supportChatUsers;

    if (search) {
        users = users.filter(function (u) {
            return u.name.toLowerCase().includes(search) || String(u.phone || "").toLowerCase().includes(search);
        });
    }

    if (users.length === 0) {
        container.innerHTML = '<p class="available-users-empty">No users found.</p>';
        return;
    }

    container.innerHTML = users.map(function (u) {

        return (
            '<div class="available-user" onclick="startNewConversation(\'' + u.id + '\')">' +
                '<div class="chat-list-avatar">' + supportEscapeHtml(getInitials(u.name)) + '</div>' +
                '<div>' +
                    '<h5>' + supportEscapeHtml(u.name) + '</h5>' +
                    '<p>' + supportEscapeHtml(u.phone || "") + '</p>' +
                '</div>' +
            '</div>'
        );

    }).join("");

}

function startNewConversation(userId) {

    const existing = individualChats.find(function (c) { return c.userId === userId; });

    if (existing) {
        closeNewChatModal();
        openIndividualChat(existing.id);
        return;
    }

    sb.from("support_conversations")
        .insert({ user_id: userId, status: "open", assigned_admin: supportAdminId })
        .select("*")
        .single()
        .then(function (res) {

            if (res.error) {
                alert("Failed to start conversation: " + res.error.message);
                return;
            }

            closeNewChatModal();

            loadSupportConversations();

            setTimeout(function () { openIndividualChat(res.data.id); }, 200);

        });

}


// ======================================================
// USER PROFILE MODAL
// ======================================================

function openCurrentProfile() {

    if (!currentChat) return;

    const modal = supportChatElement("userProfileModal");
    if (modal) modal.dataset.profileUserId = currentChat.userId;

    populateUserProfileModal(currentChat.userId, currentChat.name);

    if (modal) modal.classList.remove("hidden");

}

function closeUserProfile() {

    const modal = supportChatElement("userProfileModal");
    if (modal) modal.classList.add("hidden");

}

function populateUserProfileModal(userId, fallbackName) {

    const nameEl = supportChatElement("profileName");
    const avatarEl = supportChatElement("profileAvatar");
    const statusEl = supportChatElement("profileAccountStatus");

    if (nameEl) nameEl.textContent = fallbackName || "User";
    if (avatarEl) avatarEl.textContent = getInitials(fallbackName);

    [
        "profileEmail", "profilePhone", "profileJoined", "profileVerification",
        "profileBalance", "profileDeposited", "profileWithdrawn", "profilePlan"
    ].forEach(function (id) {
        const el = supportChatElement(id);
        if (el) el.textContent = "—";
    });

    sb.rpc("admin_get_support_user_profile", { p_user_id: userId }).then(function (res) {

        if (res.error || !res.data || res.data.length === 0) {
            console.error("Failed to load user profile:", res.error);
            return;
        }

        const p = res.data[0];

        const fullName = (p.username + " " + (p.surname || "")).trim();

        if (nameEl) nameEl.textContent = fullName || fallbackName;
        if (avatarEl) avatarEl.textContent = getInitials(fullName || fallbackName);

        if (statusEl) {
            statusEl.textContent = p.is_blocked ? "Blocked" : "Active";
            statusEl.className = "profile-status " + (p.is_blocked ? "blocked" : "active");
        }

        setText("profileEmail", p.email || "—");
        setText("profilePhone", p.phone || "—");
        setText("profileJoined", p.created_at ? new Date(p.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—");
        setText("profileVerification", p.kyc_status ? (p.kyc_status.charAt(0).toUpperCase() + p.kyc_status.slice(1)) : "Not submitted");

        setText("profileBalance", "R" + Number(p.balance_zar || 0).toFixed(2));
        setText("profileDeposited", "R" + Number(p.total_deposited_zar || 0).toFixed(2));
        setText("profileWithdrawn", "R" + Number(p.total_withdrawn_zar || 0).toFixed(2));
        setText("profilePlan", p.active_plan_name || "None");

    });

}

function setText(id, value) {

    const el = supportChatElement(id);
    if (el) el.textContent = value;

}

function goToAdminUserRecord(page, userId) {

    if (!userId) return;

    sessionStorage.setItem("pendingProfileUserId", userId);

    closeUserProfile();

    if (typeof loadAdminPage === "function") {
        loadAdminPage(page);
    } else {
        console.warn("loadAdminPage() is not defined — make sure admin.js is loaded before support-chat.js.");
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


// ======================================================
// BULK SELECTION (long-press a chat: delete or priority,
// in bulk, across multiple chats)
// ======================================================

function attachChatPressHandlers(item, chatId, onTap) {

    let pressTimer = null;
    let pressFired = false;
    let pressStartX = 0;
    let pressStartY = 0;

    function clearPressTimer() {
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    }

    function startPress(clientX, clientY) {

        clearPressTimer();
        pressFired = false;
        pressStartX = clientX;
        pressStartY = clientY;

        pressTimer = setTimeout(function () {
            pressFired = true;
            pressTimer = null;
            handleChatLongPress(chatId);
        }, CHAT_LONG_PRESS_DURATION);

    }

    function endPress() {
        clearPressTimer();
    }

    item.addEventListener("mousedown", function (e) { startPress(e.clientX, e.clientY); });
    item.addEventListener("mouseup", endPress);
    item.addEventListener("mouseleave", endPress);

    item.addEventListener("touchstart", function (e) {
        const t = e.touches[0];
        startPress(t.clientX, t.clientY);
    }, { passive: true });

    item.addEventListener("touchend", endPress);
    item.addEventListener("touchcancel", endPress);

    item.addEventListener("touchmove", function (e) {
        const t = e.touches[0];
        if (Math.abs(t.clientX - pressStartX) > CHAT_LONG_PRESS_MOVE_TOLERANCE ||
            Math.abs(t.clientY - pressStartY) > CHAT_LONG_PRESS_MOVE_TOLERANCE) {
            endPress();
        }
    }, { passive: true });

    item.addEventListener("click", function (event) {

        event.preventDefault();

        if (pressFired) { pressFired = false; return; }

        if (chatSelectionMode) {
            toggleChatSelection(chatId);
            return;
        }

        onTap();

    });

}

function handleChatLongPress(chatId) {

    chatSelectionMode = true;

    if (!selectedChatIds.includes(chatId)) {
        selectedChatIds.push(chatId);
    }

    refreshChatSelectionUI();

    if (pendingBulkAction === null) {
        openChatActionsModal(chatId);
    }

}

function toggleChatSelection(chatId) {

    const index = selectedChatIds.indexOf(chatId);

    if (index === -1) {
        selectedChatIds.push(chatId);
    } else {
        selectedChatIds.splice(index, 1);
    }

    if (selectedChatIds.length === 0) {
        exitChatSelectionMode();
        return;
    }

    refreshChatSelectionUI();

}

function refreshChatSelectionUI() {

    const bar = supportChatElement("chatSelectionBar");
    const countLabel = supportChatElement("chatSelectionCount");

    if (bar) bar.classList.toggle("hidden", !(chatSelectionMode && selectedChatIds.length > 0));
    if (countLabel) countLabel.textContent = selectedChatIds.length + " selected";

    const priorityBtn = supportChatElement("chatSelectionPriorityBtn");
    const deleteBtn = supportChatElement("chatSelectionDeleteBtn");

    if (priorityBtn) priorityBtn.classList.toggle("hidden", pendingBulkAction === "delete");
    if (deleteBtn) deleteBtn.classList.toggle("hidden", pendingBulkAction === "priority");

    renderIndividualChats();

}

function exitChatSelectionMode() {

    chatSelectionMode = false;
    selectedChatIds = [];
    pendingBulkAction = null;
    pendingPriorityMode = null;

    const bar = supportChatElement("chatSelectionBar");
    if (bar) bar.classList.add("hidden");

    renderIndividualChats();

}

function openChatActionsModal(chatId) {

    const modal = supportChatElement("chatActionsModal");
    if (modal) { modal.dataset.chatId = chatId; modal.classList.remove("hidden"); }

}

function closeChatActionsModal() {

    const modal = supportChatElement("chatActionsModal");
    if (modal) modal.classList.add("hidden");

}

function chooseBulkDeleteMode() {

    pendingBulkAction = "delete";
    closeChatActionsModal();
    refreshChatSelectionUI();

}

function chooseBulkPriorityMode() {

    const modal = supportChatElement("chatActionsModal");
    const anchorChatId = modal ? modal.dataset.chatId : null;
    const anchorChat = findIndividualChat(anchorChatId);

    pendingBulkAction = "priority";
    pendingPriorityMode = anchorChat && anchorChat.priority ? "remove" : "add";

    closeChatActionsModal();
    refreshChatSelectionUI();

}

function confirmDeleteSelectedChats() {

    if (selectedChatIds.length === 0) return;

    deleteActionType = "bulkChats";
    deleteActionIds = [...selectedChatIds];

    const titleElement = supportChatElement("deleteConfirmTitle");
    const textElement = supportChatElement("deleteConfirmText");
    const confirmBtn = supportChatElement("confirmDeleteBtn");
    const modal = supportChatElement("deleteConfirmModal");

    if (titleElement) titleElement.textContent = "Delete " + selectedChatIds.length + " Conversation" + (selectedChatIds.length === 1 ? "" : "s") + "?";
    if (textElement) textElement.textContent = "This will permanently delete the selected conversations. This action cannot be undone.";
    if (confirmBtn) confirmBtn.textContent = "Delete";
    if (modal) modal.classList.remove("hidden");

}

function closePriorityConfirmation() {

    const modal = supportChatElement("priorityConfirmModal");
    if (modal) modal.classList.add("hidden");

}

function confirmPrioritySelectedChats() {

    if (selectedChatIds.length === 0) return;

    if (pendingBulkAction !== "priority") {

        const anchorChat = findIndividualChat(selectedChatIds[selectedChatIds.length - 1]);
        pendingPriorityMode = anchorChat && anchorChat.priority ? "remove" : "add";
        pendingBulkAction = "priority";

    }

    const titleElement = supportChatElement("priorityConfirmTitle");
    const textElement = supportChatElement("priorityConfirmText");
    const modal = supportChatElement("priorityConfirmModal");

    const verb = pendingPriorityMode === "remove" ? "remove from" : "add to";

    if (titleElement) titleElement.textContent = "Update Priority?";
    if (textElement) textElement.textContent = "This will " + verb + " priority for " + selectedChatIds.length + " conversation" + (selectedChatIds.length === 1 ? "" : "s") + ".";
    if (modal) modal.classList.remove("hidden");

}

function confirmPriorityAction() {

    const ids = [...selectedChatIds];
    const makePriority = pendingPriorityMode !== "remove";

    sb.from("support_conversations")
        .update({ priority: makePriority })
        .in("id", ids)
        .then(function (res) {

            if (res.error) {
                alert("Failed to update priority: " + res.error.message);
                return;
            }

            ids.forEach(function (id) {
                const chat = findIndividualChat(id);
                if (chat) chat.priority = makePriority;
            });

            renderIndividualChats();
            exitChatSelectionMode();
            closePriorityConfirmation();

        });

}

function setupChatSelectionOutsideClick() {

    document.addEventListener("click", function (event) {

        if (!chatSelectionMode) return;

        const bar = supportChatElement("chatSelectionBar");
        const actionsModal = supportChatElement("chatActionsModal");
        const deleteModal = supportChatElement("deleteConfirmModal");
        const priorityModal = supportChatElement("priorityConfirmModal");

        const insideAny =
            (bar && bar.contains(event.target)) ||
            (actionsModal && !actionsModal.classList.contains("hidden") && actionsModal.contains(event.target)) ||
            (deleteModal && !deleteModal.classList.contains("hidden") && deleteModal.contains(event.target)) ||
            (priorityModal && !priorityModal.classList.contains("hidden") && priorityModal.contains(event.target)) ||
            event.target.closest(".chat-list-item");

        if (insideAny) return;

        exitChatSelectionMode();
        closeChatActionsModal();

    });

}


// ======================================================
// REALTIME
// ======================================================

function setupSupportRealtime() {

    if (supportMsgChannel) return;

    supportMsgChannel = sb.channel("support-messages-admin")
        .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, handleIncomingSupportMessageChange)
        .subscribe();

    supportConvChannel = sb.channel("support-conversations-admin")
        .on("postgres_changes", { event: "*", schema: "public", table: "support_conversations" }, function () {
            loadSupportConversations();
        })
        .subscribe();

}

function handleIncomingSupportMessageChange(payload) {

    if (payload.eventType === "DELETE") {

        const chat = individualChats.find(function (c) {
            return c.messages && c.messages.some(function (m) { return m.id === payload.old.id; });
        });

        if (chat) {
            chat.messages = chat.messages.filter(function (m) { return m.id !== payload.old.id; });
            if (currentChat && currentChat.id === chat.id) { renderMessages(); updatePinnedMessageBar(); }
        }

        return;

    }

    const row = payload.new;
    const chat = findIndividualChat(row.conversation_id);

    if (!chat) { loadSupportConversations(); return; }
    if (!chat.messagesLoaded) return;

    const existingIndex = chat.messages.findIndex(function (m) { return m.id === row.id; });

    if (existingIndex === -1) {
        chat.messages.push(mapSupportMessageRow(row));
    } else {
        chat.messages[existingIndex] = mapSupportMessageRow(row);
    }

    if (currentChat && currentChat.id === chat.id) {

        renderMessages();
        updatePinnedMessageBar();

        if (row.sender_type === "user") {
            scrollMessagesToBottom();
        }

    }

    loadSupportConversations();

}


/* ===== js/settings.js ===== */
/* =========================================================
   KT CLOUD MINING ADMIN
   SETTINGS / CONTENT MANAGEMENT — wired to real Supabase
   tables + Storage (bucket: "content")

   Three content types managed here:
   - videos          -> "Educational Videos" -> user app /videos (film icon page)
   - content_guides  -> "Guides" -> Help & Support placeholders (photo or video)
   - content_downloads -> "Downloads" -> Help & Support downloads section (PDF only)
   ========================================================= */

let settingsVideos = [];
let settingsGuides = [];
let settingsDownloads = [];


/* =========================================================
   SHARED HELPERS
   ========================================================= */

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

// Simple toast — used for the video-upload confirmation.
let settingsToastTimer = null;

function showSettingsToast(message) {

    const toast = document.getElementById("settingsToast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    if (settingsToastTimer) clearTimeout(settingsToastTimer);
    settingsToastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);

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

    sb.from("videos").select("*").order("created_at")
        .then(({ data, error }) => {
            if (error) {
                console.error("Failed to load videos:", error);
                return;
            }
            settingsVideos = data.map(v => ({
                id: v.id, title: v.title,
                description: v.description,
                url: v.url, fileName: v.file_name,
                thumbnail: v.thumbnail_url
            }));
            renderSettingsVideos();
            renderSettingsOverview();
        });

    sb.from("content_guides").select("*").order("created_at")
        .then(({ data, error }) => {
            if (error) {
                console.error("Failed to load guides:", error);
                return;
            }
            settingsGuides = data.map(g => ({
                id: g.id, title: g.title, category: g.category,
                status: g.status,
                video: g.video_url, image: g.image_url
            }));
            renderSettingsGuides();
            renderSettingsOverview();
        });

    sb.from("content_downloads").select("*").order("created_at")
        .then(({ data, error }) => {
            if (error) {
                console.error("Failed to load downloads:", error);
                return;
            }
            settingsDownloads = data.map(d => ({
                id: d.id, title: d.title,
                description: d.description,
                url: d.file_url, fileName: d.file_name,
                fileType: d.file_type, fileSize: d.file_size
            }));
            renderSettingsDownloads();
            renderSettingsOverview();
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
    set("settingsDownloadCount", settingsDownloads.length);

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

    const selectedTab = document.querySelector('.settings-tab[data-settings-tab="' + tabName + '"]');
    if (selectedTab) selectedTab.classList.add("active");

}


/* =========================================================
   VIDEOS  (Educational Videos -> user app /videos page)
   Add form: title, description, video file, thumbnail only.
   ========================================================= */

function openAddVideoModal() {

    const modal = document.getElementById("settingsVideoModal");
    const form = document.getElementById("videoForm");

    if (!modal) return;
    if (form) form.reset();

    document.getElementById("videoEditId").value = "";
    document.getElementById("videoModalTitle").textContent = "Add Video";

    modal.style.display = "flex";
}

function closeVideoModal() {
    const modal = document.getElementById("settingsVideoModal");

    if (modal) {
        modal.style.display = "none";
    }
}

function editSettingsVideo(id) {

    const video = settingsVideos.find(v => v.id === id);
    if (!video) return;

    document.getElementById("videoEditId").value = video.id;
    document.getElementById("videoTitle").value = video.title || "";
    document.getElementById("videoDescription").value = video.description || "";

    document.getElementById("videoModalTitle").textContent = "Edit Video";
    document.getElementById("settingsVideoModal").classList.add("active");

}

function saveSettingsVideo(event) {

    event.preventDefault();

    const editId = document.getElementById("videoEditId").value;
    const title = document.getElementById("videoTitle").value.trim();
    const description = document.getElementById("videoDescription").value.trim();
    const videoFile = document.getElementById("videoFile");
    const thumbnailInput = document.getElementById("videoThumbnail");

    if (!title) { alert("Please enter a video title."); return; }

    if (!editId && (!videoFile || videoFile.files.length === 0)) {
        alert("Please choose a video file.");
        return;
    }

    const payload = { title, description };

    Promise.resolve()

        .then(() => {

            if (videoFile && videoFile.files.length > 0) {
                payload.file_name = videoFile.files[0].name;
                return uploadContentFile(videoFile.files[0], "videos").then(url => {
                    payload.url = url;
                });
            }

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
            showSettingsToast("Video uploaded successfully");

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

function filterSettingsVideos() {

    const search = (document.getElementById("videoSearchInput").value || "").toLowerCase();

    const filtered = settingsVideos.filter(v => {
        return !search || (v.title || "").toLowerCase().includes(search);
    });

    renderSettingsVideos(filtered);

}


/* =========================================================
   GUIDES  (Help & Support video/photo placeholders)
   Add form: title, category, status (photo/video), one media file
   that switches between a photo picker and a video picker.
   ========================================================= */

function toggleGuideMediaField() {

    const status = document.getElementById("guideStatus").value;
    const photoField = document.getElementById("guidePhotoField");
    const videoField = document.getElementById("guideVideoField");

    if (status === "video") {
        photoField.style.display = "none";
        videoField.style.display = "";
    } else {
        photoField.style.display = "";
        videoField.style.display = "none";
    }

}

function openAddGuideModal() {

    const modal = document.getElementById("settingsGuideModal");
    const form = document.getElementById("guideForm");

    if (!modal) return;
    if (form) form.reset();

    document.getElementById("guideEditId").value = "";
    document.getElementById("guideModalTitle").textContent = "Add Guide";
    document.getElementById("guideStatus").value = "photo";
    toggleGuideMediaField();

    modal.style.display = "flex";
}

function closeGuideModal() {
    const modal = document.getElementById("settingsGuideModal");

    if (modal) {
        modal.style.display = "none";
    }
}

function editSettingsGuide(id) {

    const guide = settingsGuides.find(g => g.id === id);
    if (!guide) return;

    document.getElementById("guideEditId").value = guide.id;
    document.getElementById("guideTitle").value = guide.title || "";
    document.getElementById("guideCategory").value = guide.category || "";
    document.getElementById("guideStatus").value = guide.status || "photo";
    toggleGuideMediaField();

    document.getElementById("guideModalTitle").textContent = "Edit Guide";
    document.getElementById("settingsGuideModal").classList.add("active");

}

function saveSettingsGuide(event) {

    event.preventDefault();

    const editId = document.getElementById("guideEditId").value;
    const title = document.getElementById("guideTitle").value.trim();
    const category = document.getElementById("guideCategory").value;
    const status = document.getElementById("guideStatus").value;

    if (!title) { alert("Please enter a guide title."); return; }
    if (!category) { alert("Please select a guide category."); return; }

    const imageInput = document.getElementById("guideImage");
    const videoInput = document.getElementById("guideVideoFile");

    const hasNewFile = status === "video"
        ? (videoInput && videoInput.files.length > 0)
        : (imageInput && imageInput.files.length > 0);

    if (!editId && !hasNewFile) {
        alert(status === "video" ? "Please choose a guide video." : "Please choose a guide photo.");
        return;
    }

    const payload = { title, category, status };

    Promise.resolve()

        .then(() => {

            if (status === "video" && videoInput && videoInput.files.length > 0) {
                return uploadContentFile(videoInput.files[0], "guides").then(url => {
                    payload.video_url = url;
                });
            }

            if (status === "photo" && imageInput && imageInput.files.length > 0) {
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
                '<p>Add help guides for users to see.</p>' +
            '</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(guide => {

        const item = document.createElement("div");
        item.className = "settings-content-item";

        const thumbnail = guide.status === "video"
            ? '<i class="fa-solid fa-circle-play"></i>'
            : (guide.image ? '<img src="' + guide.image + '" alt="Guide photo">' : '<i class="fa-solid fa-image"></i>');

        item.innerHTML =
            '<div class="settings-content-thumbnail">' + thumbnail + '</div>' +
            '<div class="settings-content-info">' +
                '<h3 class="settings-content-title">' + escapeSettingsHTML(guide.title) + '</h3>' +
                '<div class="settings-content-meta">' +
                    '<span class="settings-badge settings-badge-category">' +
                        escapeSettingsHTML(formatSettingsCategory(guide.category)) +
                    '</span>' +
                    '<span class="settings-badge settings-badge-active">' +
                        escapeSettingsHTML(capitalizeSettings(guide.status)) +
                    '</span>' +
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

function filterSettingsGuides() {

    const search = (document.getElementById("guideSearchInput").value || "").toLowerCase();
    const category = document.getElementById("guideCategoryFilter").value;
    const type = document.getElementById("guideStatusFilter").value;

    const filtered = settingsGuides.filter(g => {
        const matchesSearch = !search || (g.title || "").toLowerCase().includes(search);
        const matchesCategory = category === "all" || g.category === category;
        const matchesType = type === "all" || g.status === type;
        return matchesSearch && matchesCategory && matchesType;
    });

    renderSettingsGuides(filtered);

}


/* =========================================================
   DOWNLOADS  (Help & Support downloads section — PDF only)
   Add form: file name, description, upload PDF only.
   ========================================================= */

function openAddDownloadModal() {

    const modal = document.getElementById("settingsDownloadModal");
    const form = document.getElementById("downloadForm");

    if (!modal) return;
    if (form) form.reset();

    document.getElementById("downloadEditId").value = "";
    document.getElementById("downloadModalTitle").textContent = "Add Download";

    modal.style.display = "flex";
}

function closeDownloadModal() {
    const modal = document.getElementById("settingsDownloadModal");

    if (modal) {
        modal.style.display = "none";
    }
}

function editSettingsDownload(id) {

    const item = settingsDownloads.find(d => d.id === id);
    if (!item) return;

    document.getElementById("downloadEditId").value = item.id;
    document.getElementById("downloadTitle").value = item.title || "";
    document.getElementById("downloadDescription").value = item.description || "";

    document.getElementById("downloadModalTitle").textContent = "Edit Download";
    document.getElementById("settingsDownloadModal").classList.add("active");

}

function saveSettingsDownload(event) {

    event.preventDefault();

    const editId = document.getElementById("downloadEditId").value;
    const title = document.getElementById("downloadTitle").value.trim();
    const fileInput = document.getElementById("downloadFile");

    if (!title) { alert("Please enter a file name."); return; }

    const file = fileInput && fileInput.files.length > 0 ? fileInput.files[0] : null;

    if (!editId && !file) {
        alert("Please choose a PDF file.");
        return;
    }

    if (file && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        alert("Only PDF files are supported.");
        return;
    }

    const payload = {
        title,
        description: document.getElementById("downloadDescription").value.trim()
    };

    Promise.resolve()

        .then(() => {

            if (file) {
                payload.file_name = file.name;
                payload.file_type = file.type || "application/pdf";
                payload.file_size = file.size;

                return uploadContentFile(file, "downloads").then(url => {
                    payload.file_url = url;
                });
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
                '<p>Add downloadable PDF files for users.</p>' +
            '</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(item => {

        const el = document.createElement("div");
        el.className = "settings-content-item";

        el.innerHTML =
            '<div class="settings-content-thumbnail"><i class="fa-solid fa-file-pdf"></i></div>' +
            '<div class="settings-content-info">' +
                '<h3 class="settings-content-title">' + escapeSettingsHTML(item.title) + '</h3>' +
                '<p class="settings-content-description">' +
                    escapeSettingsHTML(item.description || "No description available.") +
                '</p>' +
                (item.fileSize ? '<div class="settings-content-meta"><span class="settings-badge settings-badge-category">' + formatFileSize(item.fileSize) + '</span></div>' : '') +
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

function filterSettingsDownloads() {

    const search = (document.getElementById("downloadSearchInput").value || "").toLowerCase();

    const filtered = settingsDownloads.filter(d => {
        return !search || (d.title || "").toLowerCase().includes(search);
    });

    renderSettingsDownloads(filtered);

}


/* =========================================================
   DELETE (shared across videos / guides / downloads)
   ========================================================= */

function openSettingsDeleteModal(id, type) {

    document.getElementById("settingsDeleteId").value = id;
    document.getElementById("settingsDeleteType").value = type;

    const message = document.getElementById("settingsDeleteMessage");
    if (message) {
        message.textContent =
            "Are you sure you want to delete this " + formatSettingsDeleteType(type) + "? This action cannot be undone.";
    }

    document.getElementById("settingsDeleteModal").style.display = "flex";

}

function closeSettingsDeleteModal() {
    const modal = document.getElementById("settingsDeleteModal");

    if (modal) {
        modal.style.display = "none";
    }
}

const SETTINGS_DELETE_TABLES = {
    video: "videos",
    guide: "content_guides",
    download: "content_downloads"
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

/* =========================================================
   SETTINGS MODALS — CLICK OUTSIDE TO CLOSE
   Same behavior as Users page modals
========================================================= */

document.addEventListener("click", function(event) {

    if (
        event.target.classList.contains("settings-modal")
    ) {

        event.target.style.display = "none";

    }

});

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
// PENDINGS TABLE
// =====================================

function renderPendingCounts(counts){

    document.getElementById("pendingKyc").textContent =
        formatNumber(counts.kycPending);

    document.getElementById("pendingDeposits").textContent =
        formatNumber(counts.depositsPending);

    document.getElementById("pendingWithdrawals").textContent =
        formatNumber(counts.withdrawalsPending);

    document.getElementById("pendingPasswordResets").textContent =
        formatNumber(counts.passwordResetsPending);

    document.getElementById("pendingPinResets").textContent =
        formatNumber(counts.pinResetsPending);

            document.getElementById("pendingChangeRequests").textContent =
        formatNumber(counts.changeRequestsPending);

    document.getElementById("pendingKycResets").textContent =
        formatNumber(counts.kycResetsPending);

    document.getElementById("pendingUnblockRequests").textContent =
        formatNumber(counts.unblockRequestsPending);

}


function loadPendingCounts(){

    sb.rpc("get_pending_counts")

        .then(({ data, error }) => {

            if(error){
                throw error;
            }

            const row = data[0];

            renderPendingCounts({
                kycPending: row.kyc_pending,
                depositsPending: row.deposits_pending,
                withdrawalsPending: row.withdrawals_pending,
                passwordResetsPending: row.password_resets_pending,
                pinResetsPending: row.pin_resets_pending,
                changeRequestsPending: row.change_requests_pending,
                kycResetsPending: row.kyc_resets_pending,
                unblockRequestsPending: row.unblock_requests_pending
            });

        })

        .catch(error => {

            console.warn("Pending counts request failed:", error);

        });

}



// =====================================
// INIT DASHBOARD
// =====================================

function initDashboard(){

    console.log("Dashboard initialized");

    loadDashboardStats();
    loadPendingCounts();

}
