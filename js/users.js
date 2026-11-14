// ===================================
// USERS PAGE
// ===================================

function initUsers(){

    console.log("Users initialized");

    // ===============================
    // ELEMENTS
    // ===============================

    const usersList = document.getElementById("usersList");

    if(window.KTPager) KTPager.attach(usersList, { rows: "tr[data-userid]" });

    const searchInput = document.getElementById("userSearch");

    const statusFilter = document.getElementById("statusFilter");

    const refreshBtn = document.querySelector(".refresh-btn");

  

    // Statistics

    const totalUsersEl = document.getElementById("totalUsers");

    const activeUsersEl = document.getElementById("activeUsers");

    const blockedUsersEl = document.getElementById("blockedUsers");

    const requestUsersEl = document.getElementById("requestUsers");

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

    // A user "has a request" when any of these is open:
    //   - password / PIN / KYC reset or reactivation request (account_reset_requests, pending)
    //   - personal information change request
    //   - payment methods change request
    function markRequests(row, user, resetKinds){

        const labels = [];

        resetKinds.forEach(kind => {
            if(kind === "password") labels.push("Password reset");
            else if(kind === "pin") labels.push("PIN reset");
            else if(kind === "kyc") labels.push("KYC reset");
            else if(kind === "unblock") labels.push("Reactivation");
        });

        if(user.change_requested) labels.push("Personal info change");
        if(user.payment_methods_change_requested) labels.push("Payment methods change");

        if(labels.length){
            row.dataset.hasRequest = "1";
            row.title = "Requests: " + labels.join(", ");
        }

    }

    // Message shown when the users table has nothing to display
    function syncUsersEmpty(){

        KTUI.syncTableEmpty(
            usersList,
            3,
            function(){

                const hasUsers = usersList.querySelector("tr[data-userid]") !== null;
                const term = searchInput ? searchInput.value.trim() : "";
                const filter = statusFilter ? statusFilter.value.toLowerCase() : "all";

                if(!hasUsers) return "No users yet.";
                if(term) return "No users match your search.";
                if(filter === "requests") return "No users have open requests.";
                if(filter === "blocked") return "No blocked users.";
                if(filter === "active") return "No active users.";

                return "No users found.";

            },
            "fa-solid fa-users"
        );

    }

    function loadUsers(){

        Promise.all([
            sb.rpc("admin_list_users"),
            sb.from("account_reset_requests").select("user_id, kind").eq("status", "pending")
        ])

            .then(([usersRes, requestsRes]) => {

                const { data, error } = usersRes;

                if(error){
                    console.error("Failed to load users:", error);
                    return;
                }

                // If the requests lookup fails, users still load (flags only).
                const resetKindsByUser = {};

                if(!requestsRes.error && requestsRes.data){
                    requestsRes.data.forEach(r => {
                        (resetKindsByUser[r.user_id] = resetKindsByUser[r.user_id] || []).push(r.kind);
                    });
                }

                usersList.innerHTML = "";

                data.forEach(user => {

                    const row = createUserRow(user);

                    markRequests(row, user, resetKindsByUser[user.id] || []);

                    usersList.appendChild(row);

                });

                updateStatistics();

                // Keep any search / status filter the admin has applied
                // (matters for live refreshes while they are filtering).
                if(statusFilter && statusFilter.value && statusFilter.value.toLowerCase() !== "all"){
                    statusFilter.dispatchEvent(new Event("change"));
                }
                if(searchInput && searchInput.value){
                    searchInput.dispatchEvent(new Event("keyup"));
                }

                syncUsersEmpty();

                applyPendingProfileFilter();

            })

            .catch(err => {
                console.error("Failed to load users:", err);
            });

    }

    // ===============================
    // OPEN A SPECIFIC USER FROM ELSEWHERE
    // (e.g. Support Chat's "View Full Profile")
    // ===============================

    function applyPendingProfileFilter(){

        const pendingUserId = sessionStorage.getItem("pendingProfileUserId");

        if(!pendingUserId) return;

        sessionStorage.removeItem("pendingProfileUserId");

        const row = usersList.querySelector('tr[data-userid="' + pendingUserId + '"]');

        if(!row) return;

        const nameEl = row.querySelector("h4");

        if(searchInput && nameEl){
            searchInput.value = nameEl.textContent.trim();
            searchInput.dispatchEvent(new Event("keyup"));
        }

        openUserModal(row);

    }

    // ===============================
    // UPDATE STATISTICS
    // ===============================

    function updateStatistics(){

        const rows = document.querySelectorAll("#usersList tr");

        let total = document.querySelectorAll("#usersList tr[data-userid]").length;

        let active = 0;

        let blocked = 0;

        let requests = 0;

        rows.forEach(row=>{

            let status = row.querySelector(".status");

            if(!status) return;

            let text = status.textContent.trim().toLowerCase();

            // VIP users are active accounts, so they count as Active.
            if(text==="active" || text==="vip"){

                active++;

            }

            else if(text==="blocked"){

                blocked++;

            }

            if(row.dataset.hasRequest === "1"){

                requests++;

            }

        });

        totalUsersEl.textContent = total;

        activeUsersEl.textContent = active;

        blockedUsersEl.textContent = blocked;

        if(requestUsersEl) requestUsersEl.textContent = requests;

    }

    loadUsers();

    if(window.KTRealtime){
        KTRealtime.register("users", ["profile_signals","kyc_submissions"], loadUsers);
    }

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

            syncUsersEmpty();

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

                else if(value==="requests"){

                    row.style.display =
                    row.dataset.hasRequest === "1"
                    ? "table-row"
                    : "none";

                }

                else if(value==="active"){

                    // VIP users are active accounts too.
                    row.style.display =
                    (status==="active" || status==="vip")
                    ? "table-row"
                    : "none";

                }

                else{

                    row.style.display =
                    status===value
                    ? "table-row"
                    : "none";

                }

            });

            syncUsersEmpty();

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

  function getInitials(fullName) {
    if (!fullName) return "";
    const parts = fullName.trim().split(" ");
    let initials = parts[0].charAt(0).toUpperCase();
    if (parts.length > 1) {
        initials += parts[1].charAt(0).toUpperCase();
    }
    return initials;
}

function openUserModal(row) {
    currentRow = row;

    let hiddenData = row.querySelector(".user-hidden-data");
    const fullName = row.querySelector("h4").textContent;

    modalUserName.textContent = fullName;
    modalUserID.textContent = "User ID : " + row.dataset.userid;

    // Replace avatar with initials
    const modalAvatar = document.getElementById("modalAvatar");
    modalAvatar.textContent = getInitials(fullName);

    // … existing code for email, gender, etc.

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
        updateVerifyUserButton();

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
                        const rejectOther = activateActions.querySelector(".activate-reject-btn");
                        const done = KTUI.busy(confirmBtn, "Activating...", [rejectOther]);
                        sb.rpc("admin_activate_user", { p_user_id: userId })
                            .then(({ error }) => {
                                done();
                                if(error){
                                    KTUI.notify("Failed to activate user: " + error.message);
                                    return;
                                }
                                applyActivatedUI();
                                activateModal.style.display = "none";
                                KTUI.success("User activated successfully.");
                            });
                    };
                }

                const rejectBtn = activateActions.querySelector(".activate-reject-btn");
                if(rejectBtn){
                    rejectBtn.onclick = function(){
                        const confirmOther = activateActions.querySelector(".activate-confirm-btn");
                        const done = KTUI.busy(rejectBtn, "Rejecting...", [confirmOther]);
                        sb.rpc("admin_reject_unblock_request", { p_user_id: userId })
                            .then(({ error }) => {
                                done();
                                if(error){
                                    KTUI.notify("Failed to reject request: " + error.message);
                                    return;
                                }
                                KTUI.success("Reactivation request rejected.");
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

            
            blockModal.style.display="flex";

        }

        else{

            
            renderActivateModal();
            activateModal.style.display="flex";

        }

    });

    if(confirmBlockBtn){

        confirmBlockBtn.onclick=function(){

            if(!currentRow) return;

            const done = KTUI.busy(confirmBlockBtn, "Blocking...");

            sb.from("profiles")
                .update({ is_blocked: true })
                .eq("id", currentRow.dataset.userid)

                .then(({ error }) => {

                    done();

                    if(error){
                        KTUI.notify("Failed to block user: " + error.message);
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

                    KTUI.notify("User blocked successfully");

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

        const done = KTUI.busy(changeApproveBtn, "Approving...", [changeRejectBtn]);

        sb.rpc(rpcName, {
            p_user_id: userId
        })

        .then(({ error }) => {

            done();

            if(error){

    KTUI.notify(
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

        const done = KTUI.busy(changeRejectBtn, "Rejecting...", [changeApproveBtn]);

        sb.rpc(rpcName, {
            p_user_id: userId
        })

        .then(({ error }) => {

            done();

            if(error){

    KTUI.notify(
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
            
            creditModal.style.display="flex";
        };

    }

    if(creditSave){

        creditSave.onclick=function(){

            if(!currentRow) return;

            let amount = Number(document.getElementById("creditAmount").value);

            if(amount <= 0){
                KTUI.notify("Enter a valid amount");
                return;
            }

            const done = KTUI.busy(creditSave, "Crediting...");

            sb.rpc("admin_credit_wallet", {
                p_user_id: currentRow.dataset.userid,
                p_amount: amount,
                p_note: "Manual admin credit"
            })

            .then(({ error }) => {

                done();

                if(error){
                    KTUI.notify("Failed to credit balance: " + error.message);
                    return;
                }

                creditModal.style.display="none";
                document.getElementById("creditAmount").value="";

                loadUsers();

                KTUI.notify("Balance credited successfully");

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
            
            debitModal.style.display="flex";
        };

    }

    if(debitSave){

        debitSave.onclick=function(){

            if(!currentRow) return;

            let amount = Number(document.getElementById("debitAmount").value);

            if(amount <= 0){
                KTUI.notify("Enter a valid amount");
                return;
            }

            const done = KTUI.busy(debitSave, "Debiting...");

            sb.rpc("admin_debit_wallet", {
                p_user_id: currentRow.dataset.userid,
                p_amount: amount,
                p_note: "Manual admin debit"
            })

            .then(({ error }) => {

                done();

                if(error){
                    KTUI.notify("Failed to debit balance: " + error.message);
                    return;
                }

                debitModal.style.display="none";
                document.getElementById("debitAmount").value="";

                loadUsers();

                KTUI.notify("Balance debited successfully");

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
                KTUI.notify("Select a plan");
                return;
            }

            const done = KTUI.busy(planSave, "Updating...");

            sb.rpc("admin_set_user_plan", {
                p_user_id: currentRow.dataset.userid,
                p_plan_id: newPlanId
            })

            .then(({ error }) => {

                done();

                if(error){
                    KTUI.notify("Failed to update plan: " + error.message);
                    return;
                }

                const planName = plansCache.find(p => p.id === newPlanId)?.name || "Updated";

                currentRow.querySelector(".user-hidden-data .plan").textContent = planName;
                modalPlan.textContent = planName;

                planModal.style.display="none";

                KTUI.notify("Mining plan updated successfully");

            });

        };

    }

    // ===============================
    // ADD BONUS (real — admin_add_bonus)
    // ===============================

    const rewardBtn = document.querySelector(".reward-btn");

    if(rewardBtn){

        rewardBtn.onclick=function(){

            if(!currentRow) return;

            const bonusUserId = currentRow.dataset.userid;

            KTUI.prompt("Enter the bonus amount to add to this user's balance.", {
                title: "Add Bonus",
                placeholder: "0.00",
                inputMode: "decimal",
                confirmText: "Add Bonus",
                busyText: "Adding...",
                run: function(value){

                    const amount = Number(String(value).trim());

                    return sb.rpc("admin_add_bonus", {
                        p_user_id: bonusUserId,
                        p_amount: amount,
                        p_note: "Bonus added by admin"
                    }).then(({ error }) => {

                        if(error){
                            return "Failed to add bonus: " + error.message;
                        }

                        loadUsers();

                        KTUI.success("Bonus added successfully");

                        return null;

                    });

                },
                validate: function(value){
                    const n = Number(String(value).trim());
                    if(String(value).trim() === "" || isNaN(n) || n <= 0){
                        return "Enter a valid amount greater than 0.";
                    }
                    return null;
                }
            });

        };

    }

    // ===============================
    // VERIFY USER
    // ===============================

    // ===============================
// VERIFY USER
// ===============================

const verifyBtn =
    document.querySelector(".verify-btn");

const verifyUserModal =
    document.getElementById("verifyUserModal");

const verifyUserMessage =
    document.getElementById("verifyUserMessage");

const verifyUserActions =
    document.getElementById("verifyUserActions");


// ---------------------------------
// Update Verify User Button
// ---------------------------------

function updateVerifyUserButton(){

    if(!verifyBtn || !currentRow) return;

    const userId =
        currentRow.dataset.userid;


    // ---------------------------------
    // Loading state
    // ---------------------------------

    verifyBtn.disabled = true;

    verifyBtn.textContent = "Loading...";

    verifyBtn.classList.remove(
        "verified-user-btn"
    );


    // ---------------------------------
    // Get the user's LATEST KYC record
    // ---------------------------------

    sb.from("kyc_submissions")
        .select("id, status, created_at")
        .eq("user_id", userId)
        .order("created_at", {
            ascending: false
        })
        .limit(1)
        .maybeSingle()

        .then(({ data, error }) => {

            if(error){

                console.error(
                    "Failed to check user verification:",
                    error
                );

                // Do not incorrectly show Verified
                verifyBtn.textContent =
                    "Verify User";

                verifyBtn.disabled = false;

                verifyBtn.classList.remove(
                    "verified-user-btn"
                );

                return;
            }


            // ---------------------------------
            // No KYC record
            // ---------------------------------

            if(!data){

                verifyBtn.textContent =
                    "Verify User";

                verifyBtn.disabled = false;

                verifyBtn.classList.remove(
                    "verified-user-btn"
                );

                return;
            }


            // ---------------------------------
            // Latest KYC record is approved
            // ---------------------------------

            if(data.status === "approved"){

                verifyBtn.textContent =
                    "Verified";

                verifyBtn.disabled = true;

                verifyBtn.classList.add(
                    "verified-user-btn"
                );

                return;
            }


            // ---------------------------------
            // Latest KYC record is NOT approved
            // ---------------------------------

            verifyBtn.textContent =
                "Verify User";

            verifyBtn.disabled = false;

            verifyBtn.classList.remove(
                "verified-user-btn"
            );

        })

        .catch(error => {

            console.error(
                "Verification status check failed:",
                error
            );

            verifyBtn.textContent =
                "Verify User";

            verifyBtn.disabled = false;

            verifyBtn.classList.remove(
                "verified-user-btn"
            );

        });

}


// ---------------------------------
// Open Verification Check Modal
// ---------------------------------

// =================================
// CHECK USER VERIFICATION SUBMISSION
// =================================

// =================================
// CHECK USER VERIFICATION SUBMISSION
// =================================

function openVerifyUserCheck(){

    if(!currentRow) return;

    const userId =
        currentRow.dataset.userid;

    // =================================
    // OPEN MODAL
    // =================================

    verifyUserMessage.textContent =
        "Checking verification status...";

    verifyUserActions.innerHTML = `
        <button
            type="button"
            class="verify-user-close">
            Close
        </button>
    `;

    verifyUserModal.style.display = "flex";

    // Bind Close immediately
    bindVerifyUserClose();


    // =================================
    // CHECK LATEST KYC RECORD
    // =================================

    sb.from("kyc_submissions")
        .select(
            "id, status, needs_resubmission, created_at"
        )
        .eq("user_id", userId)
        .order("created_at", {
            ascending: false
        })
        .limit(1)
        .maybeSingle()

        .then(({ data, error }) => {

            if(error){

                console.error(
                    "Failed to check KYC submission:",
                    error
                );

                verifyUserMessage.textContent =
                    "Failed to check verification status.";

                // Close button is already bound
                return;
            }


            // =================================
            // NO KYC RECORD
            // =================================

            if(!data){

                verifyUserMessage.textContent =
                    "This user has not submitted KYC verification.";

                // Close button remains available
                return;
            }


            // =================================
            // RESET / RESUBMISSION REQUIRED
            // =================================

            if(
                data.status === "rejected" &&
                data.needs_resubmission === true
            ){

                verifyUserMessage.textContent =
                    "This user has not submitted KYC verification.";

                // Close button remains available
                return;
            }


            // =================================
            // PENDING
            // =================================

            if(data.status === "pending"){

                verifyUserMessage.textContent =
                    "This user has submitted KYC verification.";

                verifyUserActions.innerHTML = `
                    <button
                        type="button"
                        class="verify-user-close">
                        Close
                    </button>

                    <button
                        type="button"
                        class="verify-user-confirm">
                        Verify
                    </button>
                `;

                // Re-bind because innerHTML replaced the buttons
                bindVerifyUserClose();

                const confirmBtn =
                    verifyUserActions.querySelector(
                        ".verify-user-confirm"
                    );

                if(confirmBtn){

                    confirmBtn.onclick = function(){

                        window.verificationUserId =
                            userId;

                        verifyUserModal.style.display =
                            "none";

                        userModal.style.display =
                            "none";

                        loadAdminPage("verification");

                    };

                }

                return;
            }


            // =================================
            // REJECTED
            // =================================

            if(data.status === "rejected"){

                verifyUserMessage.textContent =
                    "This user has not submitted KYC verification.";

                // Close button remains available
                return;
            }


            // =================================
            // APPROVED
            // =================================

            if(data.status === "approved"){

                verifyUserMessage.textContent =
                    "This user has submitted KYC verification.";

                // Close button already exists and is bound
                return;
            }


            // =================================
            // FALLBACK
            // =================================

            verifyUserMessage.textContent =
                "This user has not submitted KYC verification.";

        })

        .catch(error => {

            console.error(
                "Verification status check failed:",
                error
            );

            verifyUserMessage.textContent =
                "Failed to check verification status.";

        });
}


// ---------------------------------
// Close Verification Check Modal
// ---------------------------------

function bindVerifyUserClose(){

    if(!verifyUserActions) return;

    verifyUserActions.onclick = function(event){

        const closeButton =
            event.target.closest(".verify-user-close");

        if(!closeButton) return;

        verifyUserModal.style.display = "none";

        if(verifyUserMessage){
            verifyUserMessage.textContent =
                "Checking verification status...";
        }
    };
}


// =================================
// VERIFY USER BUTTON CLICK
// =================================

if(verifyBtn){

    verifyBtn.onclick = function(){

        if(!currentRow) return;

        // Do nothing while checking
        if(verifyBtn.disabled) return;

        openVerifyUserCheck();

    };

}


// ===============================
// RESET PASSWORD
// ===============================

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
                    if(window.KTPerm && !KTPerm.require("reset a user's password")) return;
                    const rejectOther = resetPasswordActions.querySelector(".password-reset-reject-btn");
                    const done = KTUI.busy(confirmBtn, "Resetting...", [rejectOther]);
                    sb.rpc("admin_reset_password", { p_user_id: userId })
                        .then(({ data, error }) => {
                            done();
                            if(error){
                                KTUI.notify("Failed to reset password: " + error.message);
                                return;
                            }
                            KTUI.alert("The password was reset. Give this new password to the user:", {
                                type: "success",
                                title: "Password Reset",
                                value: String(data),
                                okText: "Done"
                            });
                            renderResetPasswordModal();
                        });
                };
            }

            const rejectBtn = resetPasswordActions.querySelector(".password-reset-reject-btn");
            if(rejectBtn){
                rejectBtn.onclick = function(){
                    const confirmOther = resetPasswordActions.querySelector(".password-reset-confirm-btn");
                    const done = KTUI.busy(rejectBtn, "Rejecting...", [confirmOther]);
                    sb.rpc("admin_reject_reset_request", { p_user_id: userId, p_kind: "password" })
                        .then(({ error }) => {
                            done();
                            if(error){
                                KTUI.notify("Failed to reject request: " + error.message);
                                return;
                            }
                            KTUI.success("Password reset request rejected.");
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
                        if(window.KTPerm && !KTPerm.require("reset a user's withdrawal PIN")) return;
                        const rejectOther = resetPinActions.querySelector(".pin-reset-reject-btn");
                        const done = KTUI.busy(confirmBtn, "Resetting...", [rejectOther]);
                        sb.rpc("admin_reset_withdrawal_pin", { p_user_id: userId })
                            .then(({ error }) => {
                                done();
                                if(error){
                                    KTUI.notify("Failed to reset PIN: " + error.message);
                                    return;
                                }
                                KTUI.notify("Withdrawal PIN reset — the user can add a new one.");
                                renderResetPinModal();
                            });
                    };
                }

                const rejectBtn = resetPinActions.querySelector(".pin-reset-reject-btn");
                if(rejectBtn){
                    rejectBtn.onclick = function(){
                        const confirmOther = resetPinActions.querySelector(".pin-reset-confirm-btn");
                        const done = KTUI.busy(rejectBtn, "Rejecting...", [confirmOther]);
                        sb.rpc("admin_reject_reset_request", { p_user_id: userId, p_kind: "pin" })
                            .then(({ error }) => {
                                done();
                                if(error){
                                    KTUI.notify("Failed to reject request: " + error.message);
                                    return;
                                }
                                KTUI.success("PIN reset request rejected.");
                                renderResetPinModal();
                            });
                    };
                }

            });

    }

    if(pinResetBtn){

        pinResetBtn.onclick=function(){
            if(!currentRow) return;

            renderResetPinModal();
            resetPinModal.style.display="flex";
        };

    }

    // ===============================
    // WITHDRAWAL STATUS (waiting period + reset)
    // ===============================
    // Opens a small modal that checks the user:
    //   waiting -> shows the time left + a "Reset withdrawal" button
    //   pending -> tells the admin to handle the request on the Withdrawals page
    //   open    -> "No waiting period"
    // Reset (after an in-app confirmation) lets the user withdraw straight away.

    const withdrawWaitBtn = document.querySelector(".withdraw-wait-btn");

    const withdrawWaitModal = document.getElementById("withdrawWaitModal");

    const withdrawWaitStatus = document.getElementById("withdrawWaitStatus");

    const withdrawWaitActions = document.getElementById("withdrawWaitActions");

    let withdrawWaitTimer = null;

    let withdrawWaitToken = 0;

    function stopWithdrawWaitTimer(){
        if(withdrawWaitTimer){
            clearInterval(withdrawWaitTimer);
            withdrawWaitTimer = null;
        }
    }

    function closeWithdrawWaitModal(){
        stopWithdrawWaitTimer();
        withdrawWaitToken++;
        withdrawWaitModal.style.display = "none";
    }

    function bindWithdrawWaitClose(){
        const closeBtn = withdrawWaitActions.querySelector(".cancel-btn");
        if(closeBtn){
            closeBtn.onclick = closeWithdrawWaitModal;
        }
    }

    function formatWithdrawWaitLeft(ms){
        if(ms < 0) ms = 0;
        const total = Math.floor(ms / 1000);
        const d = Math.floor(total / 86400);
        const h = Math.floor((total % 86400) / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        return d + "d " + h + "h " + m + "m " + s + "s";
    }

    function renderWithdrawWaitModal(){

        if(!currentRow) return;

        const userId = currentRow.dataset.userid;

        const token = ++withdrawWaitToken;

        stopWithdrawWaitTimer();

        withdrawWaitStatus.textContent = "Checking withdrawal status…";
        withdrawWaitActions.innerHTML = '<button class="cancel-btn">Close</button>';
        bindWithdrawWaitClose();

        Promise.all([
            sb.rpc("admin_get_user_withdrawal_gate", { p_user_id: userId }),
            sb.rpc("admin_get_withdrawal_cycle").then(function(r){ return r; }, function(){ return { data: null }; })
        ])

            .then(([gateRes, cycleRes]) => {

                const data = gateRes.data, error = gateRes.error;
                const shared = !!(cycleRes && cycleRes.data && cycleRes.data.mode === "shared" && cycleRes.data.phase);

                if(token !== withdrawWaitToken) return;

                if(error){
                    withdrawWaitStatus.textContent = "Failed to check status: " + error.message;
                    return;
                }

                const row = Array.isArray(data) ? data[0] : data;

                const state = row ? row.state : "open";

                if(state === "pending"){
                    withdrawWaitStatus.textContent =
                        "This user has a pending withdrawal request. Approve or reject it on the Withdrawals page.";
                    return;
                }

                if(state !== "waiting"){
                    withdrawWaitStatus.textContent = shared
                        ? "Withdrawals are open for everyone now. This user can make one request in this open period."
                        : "No waiting period. This user can make a withdrawal now.";
                    return;
                }

                // waiting: live countdown, based on the server clock
                const availableMs = new Date(row.available_at).getTime();
                const offset = new Date(row.server_now).getTime() - Date.now();

                const paint = function(){
                    if(withdrawWaitModal.style.display === "none"){
                        stopWithdrawWaitTimer();
                        return;
                    }
                    const left = availableMs - (Date.now() + offset);
                    if(left <= 0){
                        stopWithdrawWaitTimer();
                        renderWithdrawWaitModal();
                        return;
                    }
                    withdrawWaitStatus.textContent = shared
                        ? (cycleRes.data.phase === "closed"
                            ? "Withdrawals are closed for everyone. Opens in: "
                            : "This user already withdrew in this open period. Opens again in: ") + formatWithdrawWaitLeft(left)
                        : "This user is waiting to withdraw again. Time left: " + formatWithdrawWaitLeft(left);
                };

                paint();
                withdrawWaitTimer = setInterval(paint, 1000);

                if(shared){
                    // the shared timer decides for everyone: nothing to reset for one user
                    withdrawWaitActions.innerHTML = '<button class="cancel-btn">Close</button>';
                    bindWithdrawWaitClose();
                    return;
                }

                withdrawWaitActions.innerHTML =
                    '<button class="cancel-btn">Close</button>' +
                    '<button class="reset-btn withdraw-wait-reset-btn">Reset withdrawal</button>';
                bindWithdrawWaitClose();

                const resetBtn = withdrawWaitActions.querySelector(".withdraw-wait-reset-btn");

                if(resetBtn){

                    resetBtn.onclick = function(){

                        if(window.KTPerm && !KTPerm.require("reset a user's withdrawal waiting period")) return;

                        KTUI.confirm(
                            "Reset this user's withdrawal waiting period?\n\nThe countdown is removed and the user can make a withdrawal straight away. Their withdrawal history is not changed.",
                            {
                                title: "Reset withdrawal",
                                confirmText: "Reset",
                                busyText: "Resetting...",
                                run: function(){
                                    return sb.rpc("admin_reset_withdrawal_wait", { p_user_id: userId })
                                        .then(function(res){
                                            return res.error ? res.error.message : null;
                                        });
                                }
                            }
                        ).then(function(ok){
                            if(!ok) return;
                            KTUI.success("Withdrawal reset. The user can withdraw now.");
                            renderWithdrawWaitModal();
                        });

                    };

                }

            });

    }

    if(withdrawWaitBtn && withdrawWaitModal){

        withdrawWaitBtn.onclick = function(){
            if(!currentRow) return;

            renderWithdrawWaitModal();
            withdrawWaitModal.style.display = "flex";
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

// ======================================================
// RENDER HISTORY
// ======================================================

function renderHistoryRecords(){

    const search =
        (userHistorySearch.value || "")
        .trim()
        .toLowerCase();


    const filtered =
        userHistoryRecords.filter(record => {

            let method = "—";

if(userHistoryType === "deposit"){

    method = formatDepositMethodLabel(record.method, record.network);

}else{

    method =
        record.payment_methods
            ? formatWithdrawalMethodLabel(record.payment_methods.method, record.network)
            : "—";

}


            const searchableText = [

                method,

                record.amount_zar,

                record.created_at,

                record.status

            ]

            .map(value =>
                formatHistoryValue(value)
            )

            .join(" ")

            .toLowerCase();


            return !search ||
                   searchableText.includes(search);

        });


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


    let html = `

        <table class="user-history-table">

            <thead>

                <tr>

                    <th>Method</th>

                    <th>Amount</th>

                    <th>Date</th>

                    <th>Status</th>

                </tr>

            </thead>

            <tbody>

    `;


    filtered.forEach(record => {

        // ================================================
        // METHOD
        // ================================================

        let method = "—";


        if(userHistoryType === "deposit"){

            method =
               formatDepositMethodLabel(record.method, record.network) || "—";

        }

        else{

            method =

                record.payment_methods

                    ? formatUserHistoryWithdrawalMethod(
                        record.payment_methods.method,
                        record.network
                    )

                    : "—";

        }


        // ================================================
        // AMOUNT
        // ================================================

        const amount =

            record.amount_zar !== null &&
            record.amount_zar !== undefined

                ? "M " +
                  Number(
                      record.amount_zar
                  ).toLocaleString(
                      "en-US",
                      {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                      }
                  )

                : "—";


        // ================================================
        // DATE
        // ================================================

        const date =

            formatHistoryDate(
                record.created_at
            );


        // ================================================
        // STATUS
        // ================================================

        const status =

            formatHistoryValue(
                record.status
            );


        html += `

            <tr>

                <td>
                    ${escapeHistoryHtml(method)}
                </td>

                <td>
                    ${escapeHistoryHtml(amount)}
                </td>

                <td>
                    ${escapeHistoryHtml(date)}
                </td>

                <td>
                    ${escapeHistoryHtml(status)}
                </td>

            </tr>

        `;

    });


    html += `

            </tbody>

        </table>

    `;


    userHistoryBody.innerHTML = html;

}

// ======================================================
// WITHDRAWAL METHOD LABEL
// Uses the same method mapping as withdrawals.js
// ======================================================

function formatUserHistoryWithdrawalMethod(method, network){

    return method ? KTNetwork.label(method, network) : "—";

}


  // ======================================================
// DEPOSIT METHOD LABEL
// ======================================================

function formatDepositMethodLabel(method, network){

    return method ? KTNetwork.label(method, network) : "—";

}
  
// ======================================================
// OPEN USER HISTORY
// ======================================================

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


    

    userHistoryModal.style.display = "flex";


    try{

        let data;

        let error;


        // ==================================================
        // DEPOSIT HISTORY
        // ==================================================

        if(type === "deposit"){

            const result =

                await sb

                    .from("deposits")

                    .select(`
                        id,
                        user_id,
                        amount_zar,
                        method,
                        network,
                        status,
                        created_at
                    `)

                    .eq("user_id", userId)

                    .order(
                        "created_at",
                        {
                            ascending:false
                        }
                    );


            data = result.data;

            error = result.error;

        }


        // ==================================================
        // WITHDRAWAL HISTORY
        // ==================================================

        else{

            const result =

                await sb

                    .from("withdrawals")

                    .select(`
                        id,
                        user_id,
                        amount_zar,
                        status,
                        created_at,
                        network,
                        payment_methods(method)
                    `)

                    .eq("user_id", userId)

                    .order(
                        "created_at",
                        {
                            ascending:false
                        }
                    );


            data = result.data;

            error = result.error;

        }


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
    // PLANS HISTORY
    // Shows every plan this user has had (first plan -> current plan) from the ADMIN's own record
    // table (admin_plan_history). Deleting here never touches what the user sees in their app,
    // and the user deleting their own records never touches this table.
    // Press and hold a PAST plan to select it, then delete the selected ones.
    // The current (active) plan can never be deleted.
    // ===============================

    const plansHistoryBtn = document.querySelector(".plans-history-btn");
    const plansHistoryModal = document.getElementById("plansHistoryModal");
    const plansHistoryBody = document.getElementById("plansHistoryBody");
    const plansHistoryUser = document.getElementById("plansHistoryUser");
    const plansHistoryBar = document.getElementById("plansHistoryBar");
    const plansHistoryCount = document.getElementById("plansHistoryCount");
    const plansHistoryHint = document.getElementById("plansHistoryHint");

    let phUserId = null;
    let phRows = [];
    let phPicked = {};
    let phSelecting = false;
    const PH_HOLD_MS = 500;
    let phHold = { timer: null, x: 0, y: 0, fired: false };

    function phEsc(v){
        return String(v == null ? "" : v)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function phMoney(v){
        if(v === null || v === undefined) return "—";
        return "M " + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function phDate(v){
        if(!v) return "—";
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
    }

    const PH_STATUS = {
        active:    { label: "Current",   cls: "s-active" },
        completed: { label: "Completed", cls: "s-done" },
        upgraded:  { label: "Upgraded",  cls: "s-up" },
        cancelled: { label: "Cancelled", cls: "s-cancel" }
    };

    function phPickedIds(){
        return Object.keys(phPicked);
    }

    function phPaintBar(){
        const n = phPickedIds().length;
        plansHistoryBar.style.display = phSelecting ? "flex" : "none";
        plansHistoryCount.textContent = n + " selected";
        document.getElementById("plansHistoryDelete").disabled = !n;
        plansHistoryHint.style.display = phSelecting ? "none" : "";
        plansHistoryBody.classList.toggle("ph-pad", phSelecting);
    }

    function phPaintList(){
        if(!phRows.length){
            plansHistoryBody.innerHTML = '<div class="user-history-empty">This user has no plan history yet.</div>';
            return;
        }
        plansHistoryBody.innerHTML = phRows.map(function(r, i){ return [r, i]; }).reverse().map(function(pair){
            const r = pair[0], i = pair[1];
            const st = PH_STATUS[r.status] || { label: phEsc(r.status || "—"), cls: "s-done" };
            const locked = r.status === "active";
            const next = phRows[i + 1];
            const ended = locked ? "Ongoing" : phDate(r.completed_at || (next && next.started_at) || null);
            const name = r.plan_name || "Plan";
            return '<div class="ph-row' + (phSelecting ? " selecting" : "") + (phPicked[r.id] ? " picked" : "") + (locked ? " locked" : "") + '" data-id="' + phEsc(r.id) + '">' +
                '<span class="ph-check"><i class="fa-solid fa-check"></i></span>' +
                '<div class="ph-main">' +
                    '<div class="ph-top"><b>' + (i + 1) + '. ' + phEsc(name) + '</b><span class="ph-badge ' + st.cls + '">' + st.label + '</span></div>' +
                    '<div class="ph-meta"><span>Price: ' + phEsc(phMoney(r.price_paid_zar)) + '</span><span>Days: ' + phEsc(r.day_count == null ? "—" : r.day_count) + '</span></div>' +
                    '<div class="ph-meta"><span>Started: ' + phEsc(phDate(r.started_at)) + '</span></div>' +
                    '<div class="ph-meta"><span>Ended: ' + phEsc(ended) + '</span></div>' +
                '</div></div>';
        }).join("");
    }

    async function phLoad(silent){
        if(!silent) plansHistoryBody.innerHTML = '<div class="user-history-loading">Loading plans history...</div>';
        const userId = phUserId;
        const { data, error } = await sb
            .from("admin_plan_history")
            .select("id, plan_name, price_paid_zar, day_count, status, started_at, completed_at, created_at")
            .eq("user_id", userId)
            .order("started_at", { ascending: true })
            .order("created_at", { ascending: true });
        if(userId !== phUserId || plansHistoryModal.style.display === "none") return;
        if(error){
            if(!silent) plansHistoryBody.innerHTML = '<div class="user-history-error">Could not load plans history.</div>';
            return;
        }
        phRows = data || [];
        if(silent){
            const keep = {};
            phRows.forEach(function(r){ if(phPicked[r.id] && r.status !== "active") keep[r.id] = true; });
            phPicked = keep;
            if(!phPickedIds().length) phSelecting = false;
        }else{
            phPicked = {};
            phSelecting = false;
        }
        phPaintList();
        phPaintBar();
    }

    // Live updates: the list refreshes by itself when this user's plan records change.
    let phChannel = null, phPoll = null, phLiveTimer = null;
    function phLiveStart(){
        phLiveStop();
        try{
            phChannel = sb.channel("plans-history-" + phUserId + "-" + Date.now())
                .on("postgres_changes", { event: "*", schema: "public", table: "admin_plan_history", filter: "user_id=eq." + phUserId }, function(){
                    clearTimeout(phLiveTimer);
                    phLiveTimer = setTimeout(function(){ phLoad(true); }, 250);
                })
                .subscribe();
        }catch(e){ phChannel = null; }
        // safety net in case the live connection drops
        phPoll = setInterval(function(){ if(!document.hidden) phLoad(true); }, 12000);
    }
    function phLiveStop(){
        clearTimeout(phLiveTimer);
        if(phPoll){ clearInterval(phPoll); phPoll = null; }
        if(phChannel){ try{ sb.removeChannel(phChannel); }catch(e){} phChannel = null; }
    }

    function phClose(){
        plansHistoryModal.style.display = "none";
        phLiveStop();
        phSelecting = false;
        phPicked = {};
        clearTimeout(phHold.timer);
        phHold.timer = null;
        // close the "N selected / Cancel / Delete" bar together with the window
        phPaintBar();
        plansHistoryBar.style.display = "none";
    }

    function phToggle(id){
        const r = phRows.filter(function(x){ return x.id === id; })[0];
        if(!r || r.status === "active") return;
        if(phPicked[id]) delete phPicked[id]; else phPicked[id] = true;
        if(!phPickedIds().length) phSelecting = false;
        phPaintList();
        phPaintBar();
    }

    function phDeleteSelected(){
        if(window.KTPerm && !KTPerm.require("delete plans history")) return;
        const ids = phPickedIds();
        if(!ids.length) return;
        const word = ids.length === 1 ? "1 plan record" : ids.length + " plan records";
        let result = null;
        KTUI.confirm("Delete " + word + " from this user's plans history?\n\nThis only removes them from the admin\'s own plans history. The user still sees their own records, and the user\'s wallet, current plan and other pages are not changed.\n\nThis cannot be undone.", {
            title: "Delete plans history",
            danger: true,
            confirmText: "Delete",
            busyText: "Deleting...",
            run: function(){
                return sb.rpc("admin_delete_plan_history", { p_user_id: phUserId, p_ids: ids }).then(function(res){
                    if(res.error) return res.error.message || "Could not delete these records.";
                    result = res.data;
                    return null;
                });
            }
        }).then(function(ok){
            if(!ok) return;
            const n = result && Number(result.deleted) || 0;
            KTUI.success((n === 1 ? "1 record" : n + " records") + " deleted.");
            phPicked = {}; phSelecting = false;
            phLoad(true);
        });
    }

    if(plansHistoryBtn && plansHistoryModal){

        plansHistoryBtn.onclick = function(){
            if(!currentRow) return;
            phUserId = currentRow.dataset.userid;
            plansHistoryUser.textContent = (currentRow.querySelector("h4") || {}).textContent || "User";
            phSelecting = false;
            phPicked = {};
            phPaintBar();
            plansHistoryModal.style.display = "flex";
            phLoad();
            phLiveStart();
        };

        document.getElementById("plansHistoryClose").onclick = phClose;
        plansHistoryModal.addEventListener("click", function(e){ if(e.target === plansHistoryModal) phClose(); });
        document.getElementById("plansHistoryCancel").onclick = function(){ phSelecting = false; phPicked = {}; phPaintList(); phPaintBar(); };
        document.getElementById("plansHistoryDelete").onclick = phDeleteSelected;

        plansHistoryBody.addEventListener("pointerdown", function(e){
            const row = e.target.closest(".ph-row");
            if(!row) return;
            phHold.fired = false;
            phHold.x = e.clientX; phHold.y = e.clientY;
            clearTimeout(phHold.timer);
            const id = row.getAttribute("data-id");
            phHold.timer = setTimeout(function(){
                phHold.fired = true;
                const r = phRows.filter(function(x){ return x.id === id; })[0];
                if(r && r.status === "active"){
                    KTUI.info("The current plan cannot be deleted.");
                    return;
                }
                phSelecting = true;
                phPicked[id] = true;
                phPaintList();
                phPaintBar();
                try{ if(navigator.vibrate) navigator.vibrate(15); }catch(x){}
            }, PH_HOLD_MS);
        });
        plansHistoryBody.addEventListener("pointermove", function(e){
            if(!phHold.timer) return;
            if(Math.abs(e.clientX - phHold.x) > 10 || Math.abs(e.clientY - phHold.y) > 10){ clearTimeout(phHold.timer); phHold.timer = null; }
        });
        ["pointerup", "pointercancel", "pointerleave"].forEach(function(ev){
            plansHistoryBody.addEventListener(ev, function(){ clearTimeout(phHold.timer); phHold.timer = null; });
        });
        plansHistoryBody.addEventListener("contextmenu", function(e){ if(e.target.closest(".ph-row")) e.preventDefault(); });
        plansHistoryBody.addEventListener("click", function(e){
            const row = e.target.closest(".ph-row");
            if(!row) return;
            if(phHold.fired){ phHold.fired = false; return; }
            if(phSelecting){
                const id = row.getAttribute("data-id");
                const r = phRows.filter(function(x){ return x.id === id; })[0];
                if(r && r.status === "active"){ KTUI.info("The current plan cannot be deleted."); return; }
                phToggle(id);
            }
        });

    }

    // ===============================

    // ===============================
    // REFERRALS (real — admin_get_user_referrals / admin_set_referral_reward)
    // Shows one user's referral code, total earned and referral list.
    // The reward per referral is ONE setting for everyone: changing it here
    // updates every user's app instantly (the user app listens live).
    // ===============================

    const referralBtn = document.querySelector(".referral-btn");
    const referralsModal = document.getElementById("referralsModal");

    if(referralBtn && referralsModal){

        const refRewardValue = document.getElementById("refRewardValue");
        const refRewardEditBtn = document.getElementById("refRewardEditBtn");
        const refTotalEarned = document.getElementById("refTotalEarned");
        const refCode = document.getElementById("refCode");
        const refCopyBtn = document.getElementById("refCopyBtn");
        const refSearch = document.getElementById("refSearch");
        const refCount = document.getElementById("refCount");
        const refList = document.getElementById("refList");
        const refCloseBtn = document.getElementById("refCloseBtn");

        let refUserId = null;
        let refToken = 0;
        let refData = null;

        function refMoney(v){
            return "M " + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        function refEsc(v){
            return String(v == null ? "" : v)
                .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        }

        function closeReferralsModal(){
            refToken++;
            refUserId = null;
            referralsModal.style.display = "none";
        }

        function renderReferralList(){

            const all = (refData && refData.referrals) || [];

            refCount.textContent = String(all.length);

            const q = refSearch.value.trim().toLowerCase();
            const qDigits = q.replace(/\D/g, "");

            const rows = !q ? all : all.filter(function(r){
                return String(r.name || "").toLowerCase().indexOf(q) !== -1 ||
                    (qDigits !== "" && String(r.phone || "").replace(/\D/g, "").indexOf(qDigits) !== -1);
            });

            if(all.length === 0){
                refList.innerHTML = '<div class="ref-empty">No referrals yet.</div>';
                return;
            }

            if(rows.length === 0){
                refList.innerHTML = '<div class="ref-empty">No referrals match your search.</div>';
                return;
            }

            refList.innerHTML = rows.map(function(r){
                const mark = r.rewarded
                    ? '<span class="ref-tick" title="Reward earned"><i class="fa-solid fa-check"></i></span>'
                    : '<span class="ref-dots" title="No reward yet"><i></i><i></i><i></i></span>';
                return '<div class="ref-item">' +
                    '<div class="ref-item-text">' +
                        '<div class="ref-item-name">' + refEsc(r.name || "—") + '</div>' +
                        '<div class="ref-item-phone">' + refEsc(r.phone || "") + '</div>' +
                    '</div>' + mark +
                '</div>';
            }).join("");

        }

        function paintReferrals(){
            refRewardValue.textContent = refMoney(refData.reward_zar);
            refTotalEarned.textContent = refMoney(refData.total_earned_zar);
            refCode.textContent = refData.code || "—";
            refCopyBtn.disabled = !refData.code;
            renderReferralList();
        }

        function loadReferrals(){

            if(!refUserId) return;

            const token = ++refToken;

            refData = null;
            refRewardValue.textContent = "—";
            refTotalEarned.textContent = "—";
            refCode.textContent = "—";
            refCopyBtn.disabled = true;
            refCount.textContent = "0";
            refList.innerHTML = '<div class="ref-empty"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';

            sb.rpc("admin_get_user_referrals", { p_user_id: refUserId }).then(function(res){

                if(token !== refToken) return;

                if(res.error){
                    refList.innerHTML = '<div class="ref-empty">Failed to load referrals.</div>';
                    KTUI.error("Failed to load referrals: " + res.error.message);
                    return;
                }

                refData = res.data || { referrals: [] };
                paintReferrals();

            });

        }

        referralBtn.onclick = function(){

            if(!currentRow) return;

            refUserId = currentRow.dataset.userid;
            refSearch.value = "";

            referralsModal.style.display = "flex";

            loadReferrals();

        };

        refCloseBtn.onclick = closeReferralsModal;

        refSearch.oninput = function(){
            if(refData) renderReferralList();
        };

        refCopyBtn.onclick = function(){

            if(!refData || !refData.code) return;

            const code = String(refData.code);

            function done(ok){
                if(ok) KTUI.success("Referral code copied");
                else KTUI.error("Couldn't copy the code. Please copy it manually.");
            }

            if(navigator.clipboard && navigator.clipboard.writeText){
                navigator.clipboard.writeText(code).then(function(){ done(true); }, function(){ done(false); });
                return;
            }

            try{
                const t = document.createElement("textarea");
                t.value = code;
                t.setAttribute("readonly", "");
                t.style.position = "fixed";
                t.style.opacity = "0";
                document.body.appendChild(t);
                t.select();
                const ok = document.execCommand("copy");
                document.body.removeChild(t);
                done(ok);
            }catch(e){
                done(false);
            }

        };

        refRewardEditBtn.onclick = function(){

            if(!refData) return;

            KTUI.prompt("Enter how much a user earns for each referral. This is the same for all users and applies from the next reward on. Rewards already paid do not change.", {
                title: "Referral reward",
                placeholder: "0.00",
                inputMode: "decimal",
                value: String(Number(refData.reward_zar || 0)),
                confirmText: "Save",
                busyText: "Saving...",
                validate: function(value){
                    const s = String(value).trim();
                    const n = Number(s);
                    if(s === "" || isNaN(n) || n < 0){
                        return "Enter a valid amount (0 or more).";
                    }
                    if(n > 1000000){
                        return "That amount is too large.";
                    }
                    return null;
                },
                run: function(value){

                    return sb.rpc("admin_set_referral_reward", {
                        p_amount: Number(String(value).trim())
                    }).then(function(res){

                        if(res.error){
                            return "Failed to change the reward: " + res.error.message;
                        }

                        if(refData){
                            refData.reward_zar = res.data;
                            if(referralsModal.style.display !== "none") paintReferrals();
                        }

                        KTUI.success("Referral reward updated");

                        return null;

                    });

                }
            });

        };

    }

    

    // ===============================
    // DELETE USER — moves the user to the Trash (admin_trash_user RPC). Nothing is erased here;
    // permanent deletion lives in Settings > Trash.
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
            if(window.KTPerm && !KTPerm.require("delete a user")) return;
            if(!currentRow) return;
            userModal.style.display="none";
            deleteModal.style.display="flex";
        };

    }

    if(confirmDelete){

        confirmDelete.onclick=function(){

            if(window.KTPerm && !KTPerm.require("delete a user")) return;

            if(!currentRow) return;

            const done = KTUI.busy(confirmDelete, "Moving...");

            sb.rpc("admin_trash_user", { p_user_id: currentRow.dataset.userid })

                .then(({ error }) => {

                    done();

                    deleteModal.style.display="none";

                    if(error){
                        KTUI.notify(error.message || "Could not move this user to the Trash.");
                        return;
                    }

                    currentRow.remove();
                    currentRow = null;

                    syncUsersEmpty();

                    KTUI.notify("User moved to Trash.");

                });

        };

    }
}