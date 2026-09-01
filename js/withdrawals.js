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
