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