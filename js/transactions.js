// =====================================
// TRANSACTIONS MANAGEMENT
// =====================================


// =====================================
// LIVE DATA (populated from Supabase)
// =====================================

let transactions = {};

const TRANSACTION_TYPE_LABELS = {
    deposit: "Deposit",
    withdrawal: "Withdrawal",
    mining_payout: "Mining",
    plan_purchase: "Plan Purchase",
    plan_refund: "Plan Refund",
    plan_upgrade: "Plan Upgrade",
    admin_credit: "Credit",
    admin_debit: "Debit"
};

function formatTransactionType(type){
    return TRANSACTION_TYPE_LABELS[type] ||
        type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}


// =====================================
// LOAD TRANSACTIONS FROM SUPABASE
// =====================================

function loadTransactions(){

    sb.from("transactions")
        .select("id, user_id, type, amount_zar, description, created_at, profiles(username)")
        .order("created_at", { ascending: false })
        .limit(200)

        .then(({ data, error }) => {

            if(error){
                console.error("Failed to load transactions:", error);
                return;
            }

            transactions = {};

            data.forEach(row => {

                transactions[row.id] = {

                    id: row.id,

                    user: row.profiles ? row.profiles.username : "Unknown",

                    userId: "USR-" + row.user_id.slice(0, 8).toUpperCase(),

                    type: formatTransactionType(row.type),

                    typeKey: row.type,

                    amount: "M " + Math.abs(Number(row.amount_zar)).toLocaleString("en-US", {
                        minimumFractionDigits: 2, maximumFractionDigits: 2
                    }),

                    date: new Date(row.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric"
                    }),

                    // Every row in this table represents money that has
                    // already moved (the ledger is only ever written once
                    // an action succeeds) — there's no separate pending/
                    // rejected state at this level. If a withdrawal is
                    // later rejected, a second reversal row appears here
                    // rather than this row changing status.
                    status: "Completed",

                    description: row.description || ""

                };

            });

            renderTransactions();

        });

}


// =====================================
// INITIALIZE TRANSACTIONS
// =====================================

function initTransactions(){

    const filter =
        document.getElementById("transactionFilter");

    const search =
        document.getElementById("transactionSearch");

    const list =
        document.getElementById("transactionList");


    if(!filter || !search || !list){

        return;

    }


    // Load real data (renders once it arrives)

    loadTransactions();


    // Filter
    filter.addEventListener(
        "change",
        filterTransactions
    );


    // Search
    search.addEventListener(
        "keyup",
        filterTransactions
    );

    // =====================================
    // TRANSACTION MODAL
    // =====================================

    const transactionModal =
        document.getElementById("transactionModal");

    const closeTransactionModal =
        document.getElementById("closeTransactionModal");

    const closeTransactionModalBtn =
        document.getElementById("closeTransactionModalBtn");


    if(closeTransactionModal){

        closeTransactionModal.onclick =
        function(){

            transactionModal.style.display = "none";

        };

    }


    if(closeTransactionModalBtn){

        closeTransactionModalBtn.onclick =
        function(){

            transactionModal.style.display = "none";

        };

    }


    if(transactionModal){

        transactionModal.onclick =
        function(event){

            if(event.target === transactionModal){

                transactionModal.style.display = "none";

            }

        };

    }

}



// =====================================
// RENDER TRANSACTIONS
// =====================================

function renderTransactions(){

    const list =
        document.getElementById("transactionList");


    if(!list){

        return;

    }


    list.innerHTML = "";


    Object.values(transactions)
    .forEach(transaction => {


        const row =
            document.createElement("tr");


        row.setAttribute("data-id", transaction.id);


        // =================================
        // USER
        // =================================

        const userCell =
            document.createElement("td");

        userCell.textContent = transaction.user;


        // =================================
        // TYPE
        // =================================

        const typeCell =
            document.createElement("td");

        const typeBadge =
            document.createElement("span");


        typeBadge.className =
            "transaction-type transaction-type-" +
            transaction.typeKey;


        typeBadge.textContent = transaction.type;


        typeCell.appendChild(typeBadge);



        // =================================
        // DATE
        // =================================

        const dateCell =
            document.createElement("td");

        dateCell.textContent = transaction.date;



        // =================================
        // ACTION
        // =================================

        const actionCell =
            document.createElement("td");


        const viewButton =
            document.createElement("button");


        viewButton.className = "transaction-view-btn";

        viewButton.textContent = "View";

        viewButton.setAttribute("data-id", transaction.id);


        viewButton.onclick = function(){

            viewTransaction(transaction.id);

        };


        actionCell.appendChild(viewButton);



        // =================================
        // ADD CELLS TO ROW
        // =================================

        row.appendChild(userCell);
        row.appendChild(typeCell);
        row.appendChild(dateCell);
        row.appendChild(actionCell);

        list.appendChild(row);

    });


    // Apply current filters

    filterTransactions();

}



// =====================================
// FILTER + SEARCH TRANSACTIONS
// =====================================

function filterTransactions(){

    const filter =
        document.getElementById("transactionFilter");

    const search =
        document.getElementById("transactionSearch");

    const list =
        document.getElementById("transactionList");


    if(!filter || !search || !list){

        return;

    }


    const filterValue =
        filter.value.toLowerCase();


    const searchValue =
        search.value.toLowerCase().trim();



    const rows =
        list.querySelectorAll("tr");



    rows.forEach(row => {


        const transactionId =
            row.getAttribute("data-id")
            .toLowerCase();


        const user =
            row.cells[0].textContent.toLowerCase();


        const type =
            row.cells[1].textContent.trim().toLowerCase();


        const date =
            row.cells[2].textContent.toLowerCase();



        const matchesType =
            filterValue === "all" ||
            type === filterValue;



        const matchesSearch =
            user.includes(searchValue) ||
            transactionId.includes(searchValue) ||
            date.includes(searchValue);



        if(matchesType && matchesSearch){

            row.style.display = "";

        }
        else{

            row.style.display = "none";

        }

    });

}



// =====================================
// VIEW TRANSACTION
// =====================================

function viewTransaction(transactionId){

    const transaction =
        transactions[transactionId];


    if(!transaction){

        return;

    }


    // ================================
    // FILL MODAL FROM REAL DATA
    // ================================

    document.getElementById("modalTransactionId").textContent =
        "#" + transaction.id.slice(0, 8).toUpperCase();


    document.getElementById("modalTransactionIdFull").textContent =
        transaction.id;


    document.getElementById("modalTransactionUser").textContent =
        transaction.user;


    document.getElementById("modalTransactionUserId").textContent =
        transaction.userId;


    document.getElementById("modalTransactionType").textContent =
        transaction.type;


    document.getElementById("modalTransactionAmount").textContent =
        transaction.amount;


    document.getElementById("modalTransactionDate").textContent =
        transaction.date;


    document.getElementById("modalTransactionDescription").textContent =
        transaction.description;



    // ================================
    // STATUS
    // ================================

    const status =
        document.getElementById("modalTransactionStatus");


    status.textContent = transaction.status;


    status.className =
        "transaction-status transaction-status-" +
        transaction.status.toLowerCase();



    // ================================
    // SHOW MODAL
    // ================================

    document.getElementById("transactionModal").style.display = "flex";

}
