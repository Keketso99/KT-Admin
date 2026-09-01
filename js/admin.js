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