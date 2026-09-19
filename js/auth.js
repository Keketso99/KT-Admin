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
