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
        document.querySelector(".logout-confirm-btn");

    if(confirmBtn){

        confirmBtn.disabled = true;
        confirmBtn.textContent = "Logging out...";
    }

    const { error } =
        await sb.auth.signOut();

    if(error){

        console.error(
            "Logout failed:",
            error
        );

        if(confirmBtn){

            confirmBtn.disabled = false;
            confirmBtn.textContent = "Confirm";
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
