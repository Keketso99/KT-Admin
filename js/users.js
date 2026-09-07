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

    const approveBtn = document.querySelector(".approve-btn");
    const approveModal = document.getElementById("approveModal");
    const approveCancelBtn = document.querySelector(".approve-cancel-btn");
    const approvePersonalBtn = document.querySelector(".approve-personal-btn");
    const approvePaymentBtn = document.querySelector(".approve-payment-btn");

    function updateApproveButton(){

        if(!currentRow || !approveBtn) return;

        const hiddenData = currentRow.querySelector(".user-hidden-data");
        const infoLocked = hiddenData.querySelector(".info-locked").textContent === "1";
        const paymentMethodsLocked = hiddenData.querySelector(".payment-methods-locked").textContent === "1";

        const anyLocked = infoLocked || paymentMethodsLocked;

        approveBtn.textContent = anyLocked ? "Approve Changes" : "Already Editable";
        approveBtn.disabled = !anyLocked;

        if(approvePersonalBtn){
            approvePersonalBtn.disabled = !infoLocked;
        }
        if(approvePaymentBtn){
            approvePaymentBtn.disabled = !paymentMethodsLocked;
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

        approvePersonalBtn.onclick=function(){

            if(!currentRow) return;

            sb.rpc("admin_approve_profile_changes", {
                p_user_id: currentRow.dataset.userid
            })

            .then(({ error }) => {

                approveModal.style.display="none";

                if(error){
                    alert("Failed to approve changes: " + error.message);
                    return;
                }

                const hiddenData = currentRow.querySelector(".user-hidden-data");
                hiddenData.querySelector(".info-locked").textContent = "0";
                hiddenData.querySelector(".change-requested").textContent = "0";

                modalInfoStatus.textContent = "Editable (approved)";
                updateApproveButton();

                alert("Changes approved — the user can now edit their personal information.");

            });

        };

    }

    if(approvePaymentBtn){

        approvePaymentBtn.onclick=function(){

            if(!currentRow) return;

            sb.rpc("admin_approve_payment_methods_changes", {
                p_user_id: currentRow.dataset.userid
            })

            .then(({ error }) => {

                approveModal.style.display="none";

                if(error){
                    alert("Failed to approve changes: " + error.message);
                    return;
                }

                const hiddenData = currentRow.querySelector(".user-hidden-data");
                hiddenData.querySelector(".payment-methods-locked").textContent = "0";
                hiddenData.querySelector(".payment-methods-change-requested").textContent = "0";

                modalPaymentMethodsStatus.textContent = "Editable (approved)";
                updateApproveButton();

                alert("Changes approved — the user can now edit their payment methods.");

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