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

    // =====================================================
    // SECURITY / LOGIN AUDIT
    // =====================================================

    const ua =
        navigator.userAgent;


    let deviceName =
        "Unknown device";

    let osName =
        "Unknown";

    let osVersion =
        "Unknown";


    // -----------------------------------------------------
    // Android
    // -----------------------------------------------------

    const androidMatch =
        ua.match(/Android\s+([0-9.]+)/i);


    if(androidMatch){

        osName =
            "Android";

        osVersion =
            androidMatch[1];


        const modelMatch =
            ua.match(
                /Android\s+[0-9.]+;\s*(?:[a-z]{2}-[A-Z]{2};\s*)?([^;)]+?)(?:\s+Build\/|\))/i
            );


        if(
            modelMatch &&
            modelMatch[1]
        ){

            deviceName =
                modelMatch[1].trim();

        }

    }


    // -----------------------------------------------------
    // iPhone
    // -----------------------------------------------------

    else if(
        /iPhone/i.test(ua)
    ){

        osName =
            "iOS";

        deviceName =
            "iPhone";

    }


    // -----------------------------------------------------
    // iPad
    // -----------------------------------------------------

    else if(
        /iPad/i.test(ua)
    ){

        osName =
            "iOS";

        deviceName =
            "iPad";

    }


    // -----------------------------------------------------
    // Windows
    // -----------------------------------------------------

    else if(
        /Windows NT/i.test(ua)
    ){

        osName =
            "Windows";

        deviceName =
            "Windows device";

    }


    // -----------------------------------------------------
    // macOS
    // -----------------------------------------------------

    else if(
        /Mac OS X/i.test(ua)
    ){

        osName =
            "macOS";

        deviceName =
            "Mac";

    }


    // -----------------------------------------------------
    // Record successful Admin login
    // -----------------------------------------------------

    sb.rpc(
        "record_successful_login",
        {

            p_device_name:
                deviceName,

            p_os_name:
                osName,

            p_os_version:
                osVersion,

            p_approximate_location:
                null,

            p_session_id:
                null

        }
    )
    .then(
        ({
            error: logError
        }) => {

            if(logError){

                console.warn(
                    "Admin login audit error:",
                    logError
                );

            }

        }
    );


    hideLoginOverlay();


    if(
        typeof loadAdminPage ===
        "function"
    ){

        loadAdminPage(
            "dashboard"
        );

    }

}
    
    else {
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

    const { data, error } =
    await sb.auth.signInWithPassword({
        email,
        password
    });

btn.disabled = false;
btn.textContent = "Sign In";


if(error){

    // =====================================================
    // SECURITY AUDIT — FAILED ADMIN LOGIN
    // =====================================================

    const maskedIdentifier =
        email.length > 4
            ? "******" +
              email.slice(-4)
            : "******";


    const ua =
        navigator.userAgent;


    let deviceName =
        "Unknown device";

    let osName =
        "Unknown";

    let osVersion =
        "Unknown";


    // -----------------------------------------------------
    // Android
    // -----------------------------------------------------

    const androidMatch =
        ua.match(/Android\s+([0-9.]+)/i);


    if(androidMatch){

        osName =
            "Android";

        osVersion =
            androidMatch[1];


        const modelMatch =
            ua.match(
                /Android\s+[0-9.]+;\s*(?:[a-z]{2}-[A-Z]{2};\s*)?([^;)]+?)(?:\s+Build\/|\))/i
            );


        if(
            modelMatch &&
            modelMatch[1]
        ){

            deviceName =
                modelMatch[1].trim();

        }

    }


    // -----------------------------------------------------
    // iPhone
    // -----------------------------------------------------

    else if(
        /iPhone/i.test(ua)
    ){

        osName =
            "iOS";

        deviceName =
            "iPhone";

    }


    // -----------------------------------------------------
    // iPad
    // -----------------------------------------------------

    else if(
        /iPad/i.test(ua)
    ){

        osName =
            "iOS";

        deviceName =
            "iPad";

    }


    // -----------------------------------------------------
    // Windows
    // -----------------------------------------------------

    else if(
        /Windows NT/i.test(ua)
    ){

        osName =
            "Windows";

        deviceName =
            "Windows device";

    }


    // -----------------------------------------------------
    // macOS
    // -----------------------------------------------------

    else if(
        /Mac OS X/i.test(ua)
    ){

        osName =
            "macOS";

        deviceName =
            "Mac";

    }


    // -----------------------------------------------------
    // Write security event.
    // -----------------------------------------------------

    sb.rpc(
        "record_failed_login",
        {

            p_identifier_masked:
                maskedIdentifier,

            p_reason:
                "Invalid credentials",

            p_device_name:
                deviceName,

            p_os_name:
                osName,

            p_os_version:
                osVersion,

            p_approximate_location:
                null

        }
    )
    .then(
        ({
            error: logError
        }) => {

            if(logError){

                console.warn(
                    "Failed-login audit error:",
                    logError
                );

            }

        }
    );


    showLoginOverlay(
        error.message
    );

    return;
}


await handleAuthedSession(
    data.session
);
}

// =========================================================
// LOGOUT CONFIRMATION MODAL
// =========================================================

function openLogoutModal(){

    const modal =
        document.getElementById("logoutModal");

    if(!modal) return;

    modal.classList.add("show");
}


// =========================================================
// CLOSE LOGOUT CONFIRMATION MODAL
// =========================================================

function closeLogoutModal(){

    const modal =
        document.getElementById("logoutModal");

    if(!modal) return;

    modal.classList.remove("show");
}


// =========================================================
// CONFIRM ADMIN LOGOUT
// =========================================================

async function confirmAdminLogout(){

    const confirmBtn =
        document.querySelector(
            ".logout-confirm-btn"
        );


    if(confirmBtn){

        confirmBtn.disabled =
            true;

        confirmBtn.textContent =
            "Logging out...";

    }


    // =====================================================
    // RECORD LOGOUT BEFORE SESSION IS DESTROYED
    // =====================================================

    const {
        error: auditError
    } = await sb.rpc(
        "record_logout"
    );


    if(auditError){

        console.warn(
            "Logout audit error:",
            auditError
        );

    }


    // =====================================================
    // ACTUAL LOGOUT
    // =====================================================

    const {
        error
    } =
        await sb.auth.signOut();


    if(error){

        console.error(
            "Logout failed:",
            error
        );


        if(confirmBtn){

            confirmBtn.disabled =
                false;

            confirmBtn.textContent =
                "Confirm";

        }

        return;

    }


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

    const modal =
        document.getElementById("logoutModal");

    if(!modal) return;

    if(
        modal.classList.contains("show") &&
        event.target === modal
    ){

        closeLogoutModal();

    }

});

document.addEventListener("DOMContentLoaded", initAuth);
