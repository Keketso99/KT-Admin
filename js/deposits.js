// =====================================
// DEPOSIT MANAGEMENT
// =====================================


// =====================================
// LIVE DATA (populated from Supabase)
// =====================================

let deposits = {};


// =====================================
// METHOD LABEL HELPER
// =====================================

function formatDepositMethodLabel(method){

    const labels = {
        usdt_trc20: "USDT (TRC20)",
        mpesa: "M-Pesa",
        ecocash: "EcoCash"
    };

    return labels[method] || method;

}


// =====================================
// LOAD DEPOSITS FROM SUPABASE
// =====================================

function loadDeposits(){

    sb.from("deposits")
        .select("id, amount_zar, method, transaction_ref, proof_url, status, created_at, profiles(username)")
        .order("created_at", { ascending: false })

        .then(({ data, error }) => {

            if(error){

                console.error("Failed to load deposits:", error);

                return;

            }

            deposits = {};

            data.forEach(row => {

                deposits[row.id] = {

                    id: row.id,

                    user: row.profiles ? row.profiles.username : "Unknown",

                    method: formatDepositMethodLabel(row.method),

                    transaction: row.transaction_ref || "—",

                    amount: "M " + Number(row.amount_zar).toLocaleString("en-US"),

                    date: new Date(row.created_at).toLocaleDateString("en-US", {
                        day: "2-digit", month: "short", year: "numeric"
                    }),

                    status: row.status.charAt(0).toUpperCase() + row.status.slice(1),

                    proof: row.proof_url || ""

                };

            });

            renderDepositTables();

            updateDepositStats();

        });

}



// =====================================
// INIT DEPOSITS
// =====================================

function initDeposits(){

    console.log("Deposits initialized");


    // Load real data (renders + updates stats when it arrives)

    loadDeposits();


    // Show Pending by default

    showDepositTab("pending");

}



// =====================================
// UPDATE DEPOSIT STATISTICS
// =====================================

function updateDepositStats(){

    let pending = 0;

    let approved = 0;

    let rejected = 0;


    Object.values(deposits).forEach(deposit => {

        if(deposit.status === "Pending"){

            pending++;

        }

        else if(deposit.status === "Approved"){

            approved++;

        }

        else if(deposit.status === "Rejected"){

            rejected++;

        }

    });



    // =================================
    // UPDATE COUNTERS
    // =================================

    const pendingCount =
        document.getElementById("dpendingCount");

    const approvedCount =
        document.getElementById("dapprovedCount");

    const rejectedCount =
        document.getElementById("drejectedCount");


    if(pendingCount){

        pendingCount.textContent = pending;

    }


    if(approvedCount){

        approvedCount.textContent = approved;

    }


    if(rejectedCount){

        rejectedCount.textContent = rejected;

    }

}

// =====================================
// SHOW EMPTY DEPOSIT MESSAGE
// =====================================

function showEmptyDepositMessage(
    list,
    message,
    columnCount
){

    if(!list) return;


    list.innerHTML = `

        <tr class="empty-deposit-row">

            <td colspan="${columnCount}">

                <div class="empty-deposit-message">

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
// RENDER ALL DEPOSIT TABLES
// =====================================

function renderDepositTables(){

    const pendingList =
        document.getElementById("pendingDepositsList");

    const approvedList =
        document.getElementById("approvedDepositsList");

    const rejectedList =
        document.getElementById("rejectedDepositsList");


    // =================================
    // CHECK TABLES
    // =================================

    if(!pendingList ||
       !approvedList ||
       !rejectedList){

        console.warn(
            "Deposit table elements not found"
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
    // NOTE: deposit.id is now a UUID (e.g. "3fa85f64-5717-...").
    // It must be wrapped in quotes inside onclick="..." — an
    // unquoted UUID is invalid JavaScript (the hyphens get read
    // as subtraction), which would silently break every button.

    Object.values(deposits).forEach(deposit => {


        // =================================
        // PENDING
        // =================================

        if(deposit.status === "Pending"){

            pendingList.innerHTML += `

                <tr>

                    <td>
                        ${deposit.user}
                    </td>

                    <td>
                        ${deposit.date}
                    </td>

                    <td>

                        <button
                            class="review-btn"
                            onclick="openDepositReview('${deposit.id}')">

                            Review

                        </button>

                    </td>

                </tr>

            `;

        }



        // =================================
        // APPROVED
        // =================================

        else if(deposit.status === "Approved"){

            approvedList.innerHTML += `

                <tr>

                    <td>
                        ${deposit.user}
                    </td>

                    <td>
                        ${deposit.date}
                    </td>

                    <td>

                        <span class="approved">
                            Approved
                        </span>

                    </td>

                    <td>

                        <button
                            class="view-btn"
                            onclick="openDepositReview('${deposit.id}')">

                            View

                        </button>

                    </td>

                </tr>

            `;

        }



        // =================================
        // REJECTED
        // =================================

        else if(deposit.status === "Rejected"){

            rejectedList.innerHTML += `

                <tr>

                    <td>
                        ${deposit.user}
                    </td>

                    <td>
                        ${deposit.date}
                    </td>

                    <td>

                        <span class="rejected">
                            Rejected
                        </span>

                    </td>

                    <td>

                        <button
                            class="view-btn"
                            onclick="openDepositReview('${deposit.id}')">

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

        showEmptyDepositMessage(
            pendingList,
            "No pending deposit requests",
            3
        );

    }


    // Approved
    if(approvedList.children.length === 0){

        showEmptyDepositMessage(
            approvedList,
            "No approved deposits",
            4
        );

    }


    // Rejected
    if(rejectedList.children.length === 0){

        showEmptyDepositMessage(
            rejectedList,
            "No rejected deposits",
            4
        );

    }

}



// =====================================
// DEPOSIT TABS
// =====================================

function showDepositTab(tab, clickedButton = null){

    // =================================
    // SECTION IDS
    // =================================

    const sectionIds = {

        pending: "dpending",

        approved: "dapproved",

        rejected: "drejected"

    };


    // =================================
    // HIDE ALL SECTIONS
    // =================================

    document
        .querySelectorAll(".deposit-section")
        .forEach(section => {

            section.classList.remove(
                "active-section"
            );

        });



    // =================================
    // REMOVE ACTIVE TAB
    // =================================

    document
        .querySelectorAll(".dtab-btn")
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
            document.querySelectorAll(".dtab-btn");


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
// OPEN DEPOSIT REVIEW MODAL
// =====================================

function openDepositReview(id){

    const deposit =
        deposits[id];


    // =================================
    // CHECK DEPOSIT
    // =================================

    if(!deposit){

        console.error(
            "Deposit not found:",
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
            deposit.user;

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
            deposit.method;

    }



    // =================================
    // TRANSACTION ID
    // =================================

    const transaction =
        document.getElementById(
            "review-transaction"
        );

    if(transaction){

        transaction.textContent =
            deposit.transaction;

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
            deposit.amount;

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
            deposit.date;

    }



    // =================================
    // PAYMENT PROOF
    // =================================

    const image =
        document.getElementById(
            "review-image"
        );

    if(image){

        image.src =
            deposit.proof || "";

    }



    // =================================
    // OPEN MODAL
    // =================================

    const modal =
        document.getElementById(
            "depositModal"
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
            ".approve-btn"
        );



    // =================================
    // REJECT BUTTON
    // =================================

    const rejectBtn =
        document.querySelector(
            ".reject-btn"
        );



    // =================================
    // PENDING DEPOSIT
    // =================================

    if(deposit.status === "Pending"){


        if(approveBtn){

            approveBtn.style.display =
                "inline-block";


            // Remove old handler

            approveBtn.onclick = null;


            // Add new handler

            approveBtn.onclick =
                function(){

                    approveDeposit(
                        deposit.id
                    );

                };

        }



        if(rejectBtn){

            rejectBtn.style.display =
                "inline-block";


            // Remove old handler

            rejectBtn.onclick = null;


            // Add new handler

            rejectBtn.onclick =
                function(){

                    rejectDeposit(
                        deposit.id
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
// APPROVE DEPOSIT (calls the real RPC)
// =====================================

function approveDeposit(id){

    sb.rpc("approve_deposit", { p_deposit_id: id })

        .then(({ error }) => {

            if(error){

                alert("Failed to approve deposit: " + error.message);

                return;

            }

            closeDepositReview();

            showDepositTab("pending");

            loadDeposits();

            console.log("Deposit approved:", id);

        });

}



// =====================================
// REJECT DEPOSIT (calls the real RPC)
// =====================================

function rejectDeposit(id){

    sb.rpc("reject_deposit", { p_deposit_id: id })

        .then(({ error }) => {

            if(error){

                alert("Failed to reject deposit: " + error.message);

                return;

            }

            closeDepositReview();

            showDepositTab("pending");

            loadDeposits();

            console.log("Deposit rejected:", id);

        });

}



// =====================================
// CLOSE DEPOSIT REVIEW MODAL
// =====================================

function closeDepositReview(){

    const modal =
        document.getElementById(
            "depositModal"
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
                "depositModal"
            );


        if(
            modal &&
            e.target === modal
        ){

            closeDepositReview();

        }

    }
);
