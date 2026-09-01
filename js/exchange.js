// =================================
// EXCHANGE RATES PAGE
// =================================

let ratesCache = {};
let selectedRateId = null;
let pendingDeleteId = null;

// =================================
// LOAD RATES FROM SUPABASE
// =================================

function loadRates(){

    sb.from("exchange_rates")
        .select("*")
        .order("updated_at", { ascending: false })

        .then(({ data, error }) => {

            if(error){
                console.error("Failed to load exchange rates:", error);
                return;
            }

            ratesCache = {};

            data.forEach(row => {
                ratesCache[row.id] = row;
            });

            renderRates();

            if(data.length > 0){
                const mostRecent = data[0].updated_at;
                const d = new Date(mostRecent);
                document.getElementById("lastUpdated").innerText =
                    "Last Updated: " + d.toLocaleDateString() + " " + d.toLocaleTimeString();
            }

        });

}

function renderRates(){

    const table = document.getElementById("rateTableBody");
    if(!table){
        console.error("rateTableBody not found");
        return;
    }

    table.innerHTML = "";

    Object.values(ratesCache).forEach(item => {

        const pair = item.from_currency + "/" + item.to_currency;

        const row = document.createElement("tr");
        row.dataset.id = item.id;

        row.innerHTML = `
            <td>${pair}</td>
            <td><span>${parseFloat(item.rate).toFixed(4)}</span></td>
            <td>
                <button class="edit-rate-btn" onclick="openRateModal('${item.id}')">
                    Edit
                </button>
            </td>
        `;
        table.appendChild(row);

    });

}

// =================================
// INITIALIZE PAGE
// =================================

function initExchangeRates() {

    console.log("Exchange Rates Loaded");

    loadRates();

}

// =================================
// EDIT RATE MODAL
// =================================

function openRateModal(id) {

    const item = ratesCache[id];
    if(!item) return;

    selectedRateId = id;

    document.getElementById("currencyPair").value = item.from_currency + "/" + item.to_currency;
    document.getElementById("newRate").value = parseFloat(item.rate).toFixed(4);

    document.getElementById("rateModal").style.display = "flex";
}

function closeRateModal() {
    document.getElementById("rateModal").style.display = "none";
    selectedRateId = null;
}

// =================================
// SAVE EDITED RATE (real — updates exchange_rates)
// =================================

function saveRate() {

    if (selectedRateId === null) return;

    let newRate = document.getElementById("newRate").value;
    if (newRate === "") {
        alert("Please enter rate");
        return;
    }

    sb.auth.getUser().then(({ data: { user } }) => {

        sb.from("exchange_rates")
            .update({ rate: Number(newRate), updated_by: user ? user.id : null })
            .eq("id", selectedRateId)

            .then(({ error }) => {

                if(error){
                    alert("Failed to save rate: " + error.message);
                    return;
                }

                closeRateModal();

                loadRates();

            });

    });

}

// =================================
// DELETE CURRENCY PAIR
// =================================

function deleteCurrencyPair() {

    if (selectedRateId === null) return;

    const item = ratesCache[selectedRateId];
    if(!item) return;

    const pair = item.from_currency + "/" + item.to_currency;

    openConfirmDeleteModal(pair, selectedRateId);
}

// =================================
// ADD NEW CURRENCY PAIR MODAL
// =================================

function openAddRateModal() {
    document.getElementById("addRateModal").style.display = "flex";
}

function closeAddRateModal() {
    document.getElementById("addRateModal").style.display = "none";
    document.getElementById("newCurrencyPair").value = "";
    document.getElementById("newCurrencyRate").value = "";
}

// =================================
// ADD NEW CURRENCY PAIR (real — inserts into exchange_rates)
// =================================

function addCurrencyPair() {

    let pair = document.getElementById("newCurrencyPair").value.trim();
    let rate = document.getElementById("newCurrencyRate").value;

    if (pair === "" || rate === "") {
        alert("Please fill all fields");
        return;
    }

    const parts = pair.split("/");

    if(parts.length !== 2 || parts[0].trim() === "" || parts[1].trim() === ""){
        alert('Enter the pair like "ZAR/USD"');
        return;
    }

    sb.auth.getUser().then(({ data: { user } }) => {

        sb.from("exchange_rates")
            .insert({
                from_currency: parts[0].trim().toUpperCase(),
                to_currency: parts[1].trim().toUpperCase(),
                rate: Number(rate),
                updated_by: user ? user.id : null
            })

            .then(({ error }) => {

                if(error){

                    if(error.code === "23505"){
                        alert("That currency pair already exists.");
                    } else {
                        alert("Failed to add pair: " + error.message);
                    }

                    return;
                }

                closeAddRateModal();

                loadRates();

            });

    });

}

// =================================
// CLOSE MODAL WHEN CLICK OUTSIDE
// =================================

window.addEventListener("click", function(event) {
    let editModal = document.getElementById("rateModal");
    let addModal = document.getElementById("addRateModal");

    if (event.target === editModal) closeRateModal();
    if (event.target === addModal) closeAddRateModal();
});


// =================================
// DELETE CONFIRMATION MODAL
// =================================

let pendingDeletePair = null;

function openConfirmDeleteModal(pair, id) {

    pendingDeleteId = id;
    pendingDeletePair = pair;

    document.getElementById("confirmDeleteMessage").innerText =
        "Are you sure you want to delete " + pair + "?";

    document.getElementById("confirmDeleteModal").style.display = "flex";
}

function closeConfirmDeleteModal() {
    document.getElementById("confirmDeleteModal").style.display = "none";
    pendingDeleteId = null;
    pendingDeletePair = null;
}

function confirmDelete() {

    if (!pendingDeleteId) {
        closeConfirmDeleteModal();
        return;
    }

    sb.from("exchange_rates").delete().eq("id", pendingDeleteId)

        .then(({ error }) => {

            if(error){
                alert("Failed to delete pair: " + error.message);
                closeConfirmDeleteModal();
                return;
            }

            closeRateModal();
            closeConfirmDeleteModal();

            loadRates();

        });

}
