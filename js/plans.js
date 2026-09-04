// ======================================================
// PLANS PAGE
// ======================================================

let plansData = [];

// ======================================================
// LOAD PLANS FROM SUPABASE
// ======================================================

function loadPlans(){

    sb.from("plans")
        .select("*")
        .order("sort_order")

        .then(({ data, error }) => {

            if(error){
                console.error("Failed to load plans:", error);
                return;
            }

            plansData = data;

            renderPlans();

        });

}

// ======================================================
// RENDER PLAN TABLE
// ======================================================
function renderPlans(){

    const table = document.getElementById("planList");

    if(!table) return;

    table.innerHTML = "";

    plansData.forEach(function(plan){

        const row = document.createElement("tr");

        row.dataset.planid = plan.id;

        const statusClass = plan.is_active ? "active" : "disabled";

        row.innerHTML = `
            <td>
                ${plan.name}
            </td>

            <td>
                <span class="plan-status plan-status-${statusClass}">
                    ${plan.is_active ? "Active" : "Disabled"}
                </span>
            </td>

            <td>
                <button
                    class="plan-view-btn"
                    data-plan="${plan.name}">
                    View
                </button>
            </td>
        `;

        table.appendChild(row);

    });

}


// ======================================================
// PLAN INITIALIZATION
// ======================================================

function initPlans(){

    loadPlans();

    const modal = document.getElementById("planModal");

    const addButton = document.querySelector(".plan-add-btn");

    const closeButtons = document.querySelectorAll(
        ".plan-close-btn, .plan-close-top"
    );

    const saveButton = document.querySelector(".plan-save-btn");

    const toggleButton = document.querySelector(".plan-toggle-btn");

    const deleteButton = document.querySelector(".plan-delete-btn");

    const deleteConfirmModal = document.getElementById("planDeleteConfirmModal");

    const deleteCancelButton = document.querySelector(".plan-delete-cancel-btn");

    const deleteConfirmButton = document.querySelector(".plan-delete-confirm-btn");

    let currentRow = null;
    let currentPlan = null;

    if(!modal) return;


    // ADD NEW PLAN

    addButton.onclick = function(){

        currentRow = null;
        currentPlan = null;

        document.getElementById("planName").value = "";
        document.getElementById("planPrice").value = "";
        document.getElementById("planDuration").value = "";
        document.getElementById("planDailyReturn").value = "";
        document.getElementById("planTotalReturn").value = "";
        document.getElementById("planHashPower").value = "";
        document.getElementById("planStatus").value = "active";

        document.querySelector(".plan-modal-header h3").innerText = "Add Mining Plan";

        saveButton.innerText = "Create Plan";

        toggleButton.innerText = "Deactivate";

        modal.style.display = "flex";

    };


    // VIEW EXISTING PLAN

        // VIEW EXISTING PLAN — delegated to the table itself so it keeps
    // working after renderPlans() rebuilds the rows (add/edit/delete/reload).

    const planTable = document.getElementById("planList");

    planTable.addEventListener("click", function(e){

        const button = e.target.closest(".plan-view-btn");

        if(!button) return;

        currentRow = button.closest("tr");

        currentPlan = plansData.find(p => p.id === currentRow.dataset.planid);

        if(!currentPlan) return;

        document.getElementById("planName").value = currentPlan.name;
        document.getElementById("planPrice").value = currentPlan.price_zar;
        document.getElementById("planDuration").value = currentPlan.duration_days;
        document.getElementById("planDailyReturn").value = currentPlan.daily_payout_zar;
        document.getElementById("planTotalReturn").value =
            (currentPlan.daily_payout_zar * currentPlan.duration_days).toFixed(2);
        document.getElementById("planHashPower").value = currentPlan.hash_power || "";
        document.getElementById("planStatus").value = currentPlan.is_active ? "active" : "disabled";

        toggleButton.innerText = currentPlan.is_active ? "Deactivate" : "Activate";

        document.querySelector(".plan-modal-header h3").innerText = "Edit Mining Plan";

        saveButton.innerText = "Save Changes";

        modal.style.display = "flex";

    });


    // SAVE / CREATE PLAN

    saveButton.onclick = function(){

        const name = document.getElementById("planName").value.trim();
        const price = Number(document.getElementById("planPrice").value);
        const duration = Number(document.getElementById("planDuration").value);
        const dailyReturn = Number(document.getElementById("planDailyReturn").value);
        const hashPower = document.getElementById("planHashPower").value.trim();
        const status = document.getElementById("planStatus").value;

        if(name === ""){
            alert("Enter plan name");
            return;
        }

        const payload = {
            name: name,
            price_zar: price,
            duration_days: duration,
            daily_payout_zar: dailyReturn,
            hash_power: hashPower,
            is_active: status === "active"
        };

        // CREATE NEW PLAN

        if(currentRow === null){

            payload.sort_order = plansData.length + 1;

            sb.from("plans").insert(payload)

                .then(({ error }) => {

                    if(error){
                        alert("Failed to create plan: " + error.message);
                        return;
                    }

                    modal.style.display = "none";

                    loadPlans();

                });

        }

        // UPDATE EXISTING PLAN

        else{

            sb.from("plans").update(payload).eq("id", currentPlan.id)

                .then(({ error }) => {

                    if(error){
                        alert("Failed to update plan: " + error.message);
                        return;
                    }

                    modal.style.display = "none";

                    loadPlans();

                });

        }

    };


    // CLOSE

    closeButtons.forEach(button=>{

        button.onclick = function(){
            modal.style.display = "none";
        };

    });


    // DELETE

    deleteButton.onclick = function(){

        if(!currentRow || !currentPlan) return;

        document.getElementById("deletePlanMessage").innerHTML =
            'Are you sure you want to delete this plan?<br></br> <strong>' +
            currentPlan.name +
            '</strong>';

        deleteConfirmModal.style.display = "flex";

        document.body.style.overflow = "hidden";

    };


    // ACTIVATE / DEACTIVATE (persists immediately)

    toggleButton.onclick = function(){

        if(!currentRow || !currentPlan) return;

        const newActive = !currentPlan.is_active;

        sb.from("plans").update({ is_active: newActive }).eq("id", currentPlan.id)

            .then(({ error }) => {

                if(error){
                    alert("Failed to update status: " + error.message);
                    return;
                }

                currentPlan.is_active = newActive;

                toggleButton.innerText = newActive ? "Deactivate" : "Activate";

                document.getElementById("planStatus").value = newActive ? "active" : "disabled";

                loadPlans();

            });

    };


    deleteCancelButton.onclick = function(){
        deleteConfirmModal.style.display = "none";
    };


    deleteConfirmButton.onclick = function(){

        if(!currentRow || !currentPlan) return;

        sb.from("plans").delete().eq("id", currentPlan.id)

            .then(({ error }) => {

                deleteConfirmModal.style.display = "none";

                if(error){

                    // Postgres error 23503 = foreign key violation —
                    // this plan still has subscribers referencing it
                    if(error.code === "23503"){
                        alert("Can't delete this plan — it still has users subscribed to it. Deactivate it instead.");
                    } else {
                        alert("Failed to delete plan: " + error.message);
                    }

                    return;
                }

                currentRow = null;
                currentPlan = null;

                modal.style.display = "none";

                loadPlans();

            });

    };

}
