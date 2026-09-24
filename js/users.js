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
    // ADD BONUS (real — admin_add_bonus)
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

            sb.rpc("admin_add_bonus", {
                p_user_id: currentRow.dataset.userid,
                p_amount: bonus,
                p_note: "Bonus added by admin"
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

    verifyBtn.disabled = false;
    verifyBtn.textContent = "Verify User";
    verifyBtn.classList.remove("verified-user-btn");

    sb.from("kyc_submissions")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle()

        .then(({ data, error }) => {

            if(error){

                console.error(
                    "Failed to check user verification:",
                    error
                );

                return;
            }

            if(data){

                verifyBtn.textContent = "Verified";

                verifyBtn.disabled = true;

                verifyBtn.classList.add(
                    "verified-user-btn"
                );

            }

        });

}


// ---------------------------------
// Open Verification Check Modal
// ---------------------------------

function openVerifyUserCheck(){

    if(!currentRow || !verifyUserModal) return;

    const userId =
        currentRow.dataset.userid;

    verifyUserModal.style.display = "flex";

    verifyUserMessage.textContent =
        "Checking whether this user has submitted KYC verification...";

    verifyUserActions.innerHTML = `
        <button
            type="button"
            class="verify-user-close">
            Close
        </button>
    `;

    bindVerifyUserClose();


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

                verifyUserMessage.textContent =
                    "Failed to check verification: " +
                    error.message;

                return;
            }


            // ---------------------------------
            // No KYC submission
            // ---------------------------------

            if(!data){

                verifyUserMessage.textContent =
                    "This user has not submitted KYC verification.";

                verifyUserActions.innerHTML = `
                    <button
                        type="button"
                        class="verify-user-close">
                        Close
                    </button>
                `;

                bindVerifyUserClose();

                return;
            }


            // ---------------------------------
            // KYC submission exists
            // ---------------------------------

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

            bindVerifyUserClose();


            const confirmBtn =
                verifyUserActions.querySelector(
                    ".verify-user-confirm"
                );


            if(confirmBtn){

                confirmBtn.onclick = function(){

                    /*
                     * Tell the Verification page which
                     * user must be displayed.
                     */

                    window.verificationUserId =
                        userId;

                    verifyUserModal.style.display =
                        "none";

                    userModal.style.display =
                        "none";

                    loadAdminPage("verification");

                };

            }

        });

}


// ---------------------------------
// Close Verification Check Modal
// ---------------------------------

function bindVerifyUserClose(){

    const closeBtn =
        verifyUserActions.querySelector(
            ".verify-user-close"
        );

    if(closeBtn){

        closeBtn.onclick = function(){

            verifyUserModal.style.display =
                "none";

        };

    }

}


if(verifyBtn){

    verifyBtn.onclick = function(){

        if(!currentRow) return;

        /*
         * If the button is already disabled,
         * the user is verified.
         */

        if(verifyBtn.disabled) return;

        openVerifyUserCheck();

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

    method = formatDepositMethodLabel(record.method);

}else{

    method =
        record.payment_methods
            ? formatWithdrawalMethodLabel(record.payment_methods.method)
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
               formatDepositMethodLabel(record.method) || "—";

        }

        else{

            method =

                record.payment_methods

                    ? formatUserHistoryWithdrawalMethod(
                        record.payment_methods.method
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

function formatUserHistoryWithdrawalMethod(method){

    const labels = {

        usdt_trc20: "USDT (TRC20)",

        mpesa: "M-Pesa",

        ecocash: "EcoCash"

    };

    return labels[method] || method || "—";

}


  // ======================================================
// DEPOSIT METHOD LABEL
// ======================================================

function formatDepositMethodLabel(method){

    const labels = {

        usdt_trc20: "USDT (TRC20)",

        mpesa: "M-Pesa",

        ecocash: "EcoCash"

    };

    return labels[method] || method || "—";

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