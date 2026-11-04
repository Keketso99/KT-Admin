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

    if(window.KTPager){
        ["pendingWithdrawalList", "approvedWithdrawalList", "rejectedWithdrawalList"].forEach(function(id){
            KTPager.attach(document.getElementById(id), { rows: "tr" });
        });
    }


    // Load real data (renders + updates stats when it arrives)

    loadWithdrawals();

    if(window.KTRealtime){
        KTRealtime.register("withdrawals", ["withdrawals"], loadWithdrawals);
    }


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
                        withdrawal.id,
                        approveBtn,
                        rejectBtn
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
                        withdrawal.id,
                        rejectBtn,
                        approveBtn
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

function approveWithdrawal(id, button, otherButton){

    const done = KTUI.busy(button, "Approving...", [otherButton]);

    sb.rpc("approve_withdrawal", { p_withdrawal_id: id })

        .then(({ error }) => {

            done();

            if(error){

                KTUI.notify("Failed to approve withdrawal: " + error.message);

                return;

            }

            closeWithdrawalReview();

            showWithdrawalTab("pending");

            loadWithdrawals();

            KTUI.success("Withdrawal approved successfully.");

            console.log("Withdrawal approved:", id);

        });

}



// =====================================
// REJECT WITHDRAWAL (calls the real RPC)
// =====================================

function rejectWithdrawal(id, button, otherButton){

    const done = KTUI.busy(button, "Rejecting...", [otherButton]);

    sb.rpc("reject_withdrawal", { p_withdrawal_id: id })

        .then(({ error }) => {

            done();

            if(error){

                KTUI.notify("Failed to reject withdrawal: " + error.message);

                return;

            }

            closeWithdrawalReview();

            showWithdrawalTab("pending");

            loadWithdrawals();

            KTUI.success("Withdrawal rejected.");

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



// =====================================
// WITHDRAWAL DAY — interval between a user's approved withdrawals
// (admin_get_withdrawal_interval / admin_set_withdrawal_interval)
// =====================================

let withdrawalDaysLoaded = null;

function openWithdrawalDays(){

    const modal = document.getElementById("withdrawalDaysModal");
    const input = document.getElementById("withdrawalDaysInput");
    const save = document.getElementById("withdrawalDaysSaveBtn");
    const status = document.getElementById("withdrawalDaysStatus");

    if(!modal || !input || !save || !status) return;

    modal.style.display = "flex";

    input.value = "";
    input.disabled = true;
    save.disabled = true;
    status.textContent = "Loading…";
    status.className = "wday-status";

    sb.rpc("admin_get_withdrawal_interval")

        .then(({ data, error }) => {

            if(error){

                status.textContent = "Failed to load: " + error.message;
                status.className = "wday-status wday-status-error";

                return;

            }

            withdrawalDaysLoaded = Number(data) || 0;

            input.value = String(withdrawalDaysLoaded);
            input.disabled = false;
            save.disabled = false;

            status.textContent = withdrawalDaysLoaded === 0
                ? "Currently: no waiting period."
                : "Currently: " + withdrawalDaysLoaded + (withdrawalDaysLoaded === 1 ? " day" : " days") + " between withdrawals.";

            input.focus();

        });

}

function closeWithdrawalDays(){

    const modal = document.getElementById("withdrawalDaysModal");

    if(modal){
        modal.style.display = "none";
    }

}

function saveWithdrawalDays(button){

    if(window.KTPerm && !KTPerm.require("change the withdrawal interval")) return;

    const input = document.getElementById("withdrawalDaysInput");
    const status = document.getElementById("withdrawalDaysStatus");

    if(!input) return;

    const raw = String(input.value).trim();

    if(!/^\d+$/.test(raw)){

        KTUI.warning("Enter a whole number of days (0 or more).");
        return;

    }

    const days = parseInt(raw, 10);

    if(days > 365){

        KTUI.warning("The interval can be at most 365 days.");
        return;

    }

    const done = KTUI.busy(button, "Saving...");

    sb.rpc("admin_set_withdrawal_interval", { p_days: days })

        .then(({ error }) => {

            done();

            if(error){

                KTUI.notify("Failed to save: " + error.message);
                return;

            }

            withdrawalDaysLoaded = days;

            if(status){
                status.className = "wday-status";
                status.textContent = days === 0
                    ? "Currently: no waiting period."
                    : "Currently: " + days + (days === 1 ? " day" : " days") + " between withdrawals.";
            }

            closeWithdrawalDays();

            KTUI.success(
                days === 0
                    ? "Saved. Users can withdraw without waiting (one request at a time)."
                    : "Saved. Users wait " + days + (days === 1 ? " day" : " days") + " after an approved withdrawal."
            );

        });

}

window.addEventListener("click", function(e){

    const modal = document.getElementById("withdrawalDaysModal");

    if(modal && e.target === modal){
        closeWithdrawalDays();
    }

});
