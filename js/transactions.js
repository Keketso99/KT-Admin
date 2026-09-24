// =====================================
// TRANSACTIONS MANAGEMENT
// =====================================

let transactions = {};
let transactionSearchTimer = null;

const TRANSACTION_TYPE_LABELS = {
    deposit: "Deposit",
    withdrawal: "Withdrawal",
    admin_credit: "Credit",
    admin_debit: "Debit",
    bonus: "Bonus",
    mining_payout: "Mining",
    plan_purchase: "Plan Purchase",
    plan_refund: "Plan Refund",
    plan_upgrade: "Plan Upgrade"
};

function formatTransactionType(type){
    const normalized = String(type || "").toLowerCase();

    return TRANSACTION_TYPE_LABELS[normalized] ||
        normalized
            .split("_")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
}

function getTransactionTypeKey(type){
    const normalized = String(type || "").toLowerCase();

    if(normalized === "admin_credit") return "credit";
    if(normalized === "admin_debit") return "debit";

    return normalized;
}

// =====================================
// RECORDING INTEGRITY
// Status means whether the transaction
// has been recorded correctly.
// =====================================

function getTransactionIntegrity(row){

    const type = String(row.type || "").toLowerCase();
    const description = String(row.description || "").trim();
    const referenceId = row.reference_id;

    if(!row.id || !row.user_id || !type || row.amount_zar === null || row.amount_zar === undefined){
        return {
            status: "Incomplete",
            reason: "Required transaction data is missing."
        };
    }

    if(type === "deposit"){
        if(!referenceId){
            return {
                status: "Incomplete",
                reason: "Deposit transaction has no deposit reference ID."
            };
        }

        if(
            description === "Deposit approved" ||
            description.toLowerCase().startsWith("deposit rejected")
        ){
            return { status: "Complete", reason: "" };
        }

        return {
            status: "Incomplete",
            reason: "Deposit outcome is not clearly recorded in the description."
        };
    }

    if(type === "withdrawal"){
        if(!referenceId){
            return {
                status: "Incomplete",
                reason: "Withdrawal transaction has no withdrawal reference ID."
            };
        }

        const lower = description.toLowerCase();

        if(lower === "withdrawal approved" || lower.startsWith("withdrawal approved —")){
            return { status: "Complete", reason: "" };
        }

        if(lower.startsWith("withdrawal rejected")){
            return { status: "Complete", reason: "" };
        }

        if(lower === "withdrawal requested (pending review)"){
            return {
                status: "Incomplete",
                reason: "Withdrawal is still recorded as pending review."
            };
        }

        return {
            status: "Incomplete",
            reason: "Withdrawal outcome is not clearly recorded in the description."
        };
    }

    if(type === "admin_credit"){
        if(!description){
            return {
                status: "Incomplete",
                reason: "Credit transaction has no description."
            };
        }

        return { status: "Complete", reason: "" };
    }

    if(type === "admin_debit"){
        if(!description){
            return {
                status: "Incomplete",
                reason: "Debit transaction has no description."
            };
        }

        return { status: "Complete", reason: "" };
    }

    if(type === "bonus"){
        if(!description){
            return {
                status: "Incomplete",
                reason: "Bonus transaction has no description."
            };
        }

        return { status: "Complete", reason: "" };
    }

    return {
        status: "Incomplete",
        reason: "Transaction type is not part of the supported admin transaction records."
    };
}

// =====================================
// LOAD TRANSACTIONS
// =====================================

async function loadTransactions(){

    const filter = document.getElementById("transactionFilter");
    const search = document.getElementById("transactionSearch");
    const list = document.getElementById("transactionList");

    if(!filter || !search || !list) return;

    list.innerHTML = `
        <tr>
            <td colspan="4" class="transaction-loading">Loading transactions...</td>
        </tr>
    `;

    const type = filter.value || "all";
    const searchValue = search.value.trim();

    const { data, error } = await sb.rpc("admin_search_transactions", {
        p_search: searchValue,
        p_type: type,
        p_limit: 500,
        p_offset: 0
    });

    if(error){
        console.error("Failed to load transactions:", error);

        list.innerHTML = `
            <tr>
                <td colspan="4" class="transaction-empty">
                    Failed to load transactions.
                </td>
            </tr>
        `;
        return;
    }

    transactions = {};

    (data || []).forEach(row => {

        const fullName = [row.username, row.surname]
            .filter(Boolean)
            .join(" ")
            .trim() || "Unknown User";

        const integrity = getTransactionIntegrity(row);

        transactions[row.id] = {
            id: row.id,
            userId: row.user_id,
            user: fullName,
            phone: row.phone || "—",
            rawType: row.type,
            type: formatTransactionType(row.type),
            typeKey: getTransactionTypeKey(row.type),
            amount: "M " + Math.abs(Number(row.amount_zar || 0)).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }),
            date: new Date(row.created_at).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }),
            createdAt: row.created_at,
            referenceId: row.reference_id,
            description: row.description || "",
            status: integrity.status,
            incompleteReason: integrity.reason
        };
    });

    renderTransactions();
}

// =====================================
// INITIALIZE
// =====================================

function initTransactions(){

    const filter = document.getElementById("transactionFilter");
    const search = document.getElementById("transactionSearch");
    const list = document.getElementById("transactionList");

    if(!filter || !search || !list) return;

    loadTransactions();

    filter.addEventListener("change", loadTransactions);

    search.addEventListener("input", function(){

        clearTimeout(transactionSearchTimer);

        transactionSearchTimer = setTimeout(() => {
            loadTransactions();
        }, 300);
    });

    const transactionModal = document.getElementById("transactionModal");
    const closeTransactionModal = document.getElementById("closeTransactionModal");
    const closeTransactionModalBtn = document.getElementById("closeTransactionModalBtn");

    const closeModal = () => {
        if(transactionModal){
            transactionModal.style.display = "none";
        }
    };

    if(closeTransactionModal) closeTransactionModal.onclick = closeModal;
    if(closeTransactionModalBtn) closeTransactionModalBtn.onclick = closeModal;

    if(transactionModal){
        transactionModal.onclick = function(event){
            if(event.target === transactionModal){
                closeModal();
            }
        };
    }
}

// =====================================
// RENDER
// =====================================

function renderTransactions(){

    const list = document.getElementById("transactionList");
    if(!list) return;

    list.innerHTML = "";

    const values = Object.values(transactions);

    if(values.length === 0){
        list.innerHTML = `
            <tr>
                <td colspan="4" class="transaction-empty">
                    No transactions found.
                </td>
            </tr>
        `;
        return;
    }

    values.forEach(transaction => {

        const row = document.createElement("tr");
        row.setAttribute("data-id", transaction.id);

        const userCell = document.createElement("td");
        userCell.textContent = transaction.user;

        const typeCell = document.createElement("td");
        const typeBadge = document.createElement("span");
        typeBadge.className = "transaction-type transaction-type-" + transaction.typeKey;
        typeBadge.textContent = transaction.type;
        typeCell.appendChild(typeBadge);

        const dateCell = document.createElement("td");
        dateCell.textContent = transaction.date;

        const actionCell = document.createElement("td");
        const viewButton = document.createElement("button");
        viewButton.className = "transaction-view-btn";
        viewButton.textContent = "View";
        viewButton.setAttribute("data-id", transaction.id);
        viewButton.onclick = function(){
            viewTransaction(transaction.id);
        };
        actionCell.appendChild(viewButton);

        row.appendChild(userCell);
        row.appendChild(typeCell);
        row.appendChild(dateCell);
        row.appendChild(actionCell);
        list.appendChild(row);
    });
}

// =====================================
// VIEW TRANSACTION
// =====================================

function viewTransaction(transactionId){

    const transaction = transactions[transactionId];
    if(!transaction) return;

    document.getElementById("modalTransactionId").textContent =
        "#" + transaction.id.slice(0, 8).toUpperCase();

    document.getElementById("modalTransactionIdFull").textContent =
        transaction.id;

    document.getElementById("modalTransactionUser").textContent =
        transaction.user;

    document.getElementById("modalTransactionPhone").textContent =
        transaction.phone;

    document.getElementById("modalTransactionType").textContent =
        transaction.type;

    document.getElementById("modalTransactionAmount").textContent =
        transaction.amount;

    document.getElementById("modalTransactionDate").textContent =
        transaction.date;

    const description = transaction.status === "Incomplete"
        ? `${transaction.description || "No description recorded."} ${transaction.incompleteReason}`.trim()
        : transaction.description;

    document.getElementById("modalTransactionDescription").textContent =
        description || "—";

    const status = document.getElementById("modalTransactionStatus");

    status.textContent = transaction.status;
    status.className =
        "transaction-status transaction-status-" +
        transaction.status.toLowerCase();

    document.getElementById("transactionModal").style.display = "flex";
}
