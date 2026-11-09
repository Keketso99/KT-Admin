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

function formatWithdrawalMethodLabel(method, network){

    return KTNetwork.label(method, network);

}


// =====================================
// LOAD WITHDRAWALS FROM SUPABASE
// =====================================

function loadWithdrawals(){

    sb.from("withdrawals")
        .select("id, amount_zar, status, created_at, network, profiles(username), payment_methods(method)")
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
                        ? formatWithdrawalMethodLabel(row.payment_methods.method, row.network)
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
let wdCycle = null;        // last answer of admin_get_withdrawal_cycle
let wdOffset = 0;          // server clock minus this device's clock
let wdView = "per_user";
let wdTimer = null;
let wdToken = 0;
let wdLegacy = false;      // true when the cycle SQL has not been run yet

function wdEl(id){ return document.getElementById(id); }

function wdFmt(ms){
    if(ms < 0) ms = 0;
    const t = Math.floor(ms / 1000);
    const d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    const p = n => String(n).padStart(2, "0");
    return d + "d " + p(h) + ":" + p(m) + ":" + p(s);
}

function wdLen(secs){
    secs = Number(secs) || 0;
    const d = Math.floor(secs / 86400), h = Math.floor((secs % 86400) / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    const parts = [];
    if(d) parts.push(d + (d === 1 ? " day" : " days"));
    if(h) parts.push(h + (h === 1 ? " hour" : " hours"));
    if(m) parts.push(m + (m === 1 ? " minute" : " minutes"));
    if(s || !parts.length) parts.push(s + (s === 1 ? " second" : " seconds"));
    return parts.join(" ");
}

function wdSetFields(pfx, secs){
    secs = Number(secs) || 0;
    const v = { D: Math.floor(secs / 86400), H: Math.floor((secs % 86400) / 3600), M: Math.floor((secs % 3600) / 60), S: secs % 60 };
    Object.keys(v).forEach(k => { const el = wdEl(pfx + k); if(el) el.value = String(v[k]); });
}

// returns seconds, or null when a box is not a whole number >= 0
function wdReadFields(pfx){
    let total = 0;
    const mult = { D: 86400, H: 3600, M: 60, S: 1 };
    for(const k of ["D", "H", "M", "S"]){
        const el = wdEl(pfx + k);
        const raw = el ? String(el.value).trim() : "";
        if(raw === "") continue;
        if(!/^\d+$/.test(raw)) return null;
        total += parseInt(raw, 10) * mult[k];
    }
    return total;
}

function wdStopTimer(){
    if(wdTimer){ clearInterval(wdTimer); wdTimer = null; }
}

function wdSetView(view){
    wdView = view === "shared" ? "shared" : "per_user";
    const per = wdEl("wdViewPer"), all = wdEl("wdViewAll");
    if(!per || !all) return;
    per.style.display = wdView === "per_user" ? "" : "none";
    all.style.display = wdView === "shared" ? "" : "none";
    wdEl("wdSegPer").classList.toggle("on", wdView === "per_user");
    wdEl("wdSegAll").classList.toggle("on", wdView === "shared");
    const save = wdEl("withdrawalDaysSaveBtn");
    if(save) save.style.display = wdView === "per_user" ? "" : "none";
    wdPaintStatus();
}

function wdRunning(){
    return !!(wdCycle && wdCycle.mode === "shared" && wdCycle.phase);
}

function wdPaintStatus(){
    const status = wdEl("withdrawalDaysStatus");
    if(!status) return;
    status.className = "wday-status";
    if(wdView === "per_user"){
        status.textContent = withdrawalDaysLoaded === null ? "" :
            (withdrawalDaysLoaded === 0
                ? "Saved per user setting: no waiting period."
                : "Saved per user setting: " + withdrawalDaysLoaded + (withdrawalDaysLoaded === 1 ? " day" : " days") + " between withdrawals.");
    } else {
        status.textContent = "";
    }
    const note = wdEl("wdPerNote");
    if(note){
        if(wdRunning()){
            note.style.display = "";
            note.innerHTML = 'The shared timer for everyone is running, so these per user timers are not used right now. Stop it to use per user timers again. ' +
                '<button type="button" class="wclose-btn" onclick="wdStop(this)">Stop shared timer</button>';
        } else {
            note.style.display = "none";
            note.innerHTML = "";
        }
    }
}

function wdPaintRun(){
    const run = wdEl("wdRun"), start = wdEl("wdStartBtn"), stop = wdEl("wdStopBtn");
    if(!run) return;
    if(wdRunning()){
        const left = new Date(wdCycle.phase_ends_at).getTime() - (Date.now() + wdOffset);
        const open = wdCycle.phase === "open";
        run.className = "wday-run " + (open ? "open" : "closed");
        run.innerHTML = (open ? "Running: OPEN now" : "Running: CLOSED now") +
            '<small>' + (open ? "Closes in " : "Opens in ") + wdFmt(left) + '</small>' +
            '<small>Open ' + wdLen(wdCycle.open_secs) + ' · Closed ' + wdLen(wdCycle.closed_secs) + '</small>';
        if(start) start.textContent = "Restart";
        if(stop) stop.style.display = "";
    } else {
        run.className = "wday-run";
        run.textContent = "Not running. Users follow the per user timers.";
        if(start) start.textContent = "Start";
        if(stop) stop.style.display = "none";
    }
}

function wdStartTimer(){
    wdStopTimer();
    let lastAsk = 0;
    wdTimer = setInterval(function(){
        const modal = wdEl("withdrawalDaysModal");
        if(!modal || modal.style.display === "none"){ wdStopTimer(); return; }
        wdPaintRun();
        if(wdRunning() && new Date(wdCycle.phase_ends_at).getTime() <= Date.now() + wdOffset && Date.now() - lastAsk > 2000){
            lastAsk = Date.now();
            wdLoadCycle(false);
        }
    }, 1000);
}

function wdApplyCycle(c, fillFields){
    wdCycle = c;
    wdOffset = new Date(c.server_now).getTime() - Date.now();
    withdrawalDaysLoaded = Number(c.interval_days) || 0;
    if(fillFields){
        wdEl("withdrawalDaysInput").value = String(withdrawalDaysLoaded);
        wdSetFields("wdO", c.open_secs);
        wdSetFields("wdC", c.closed_secs);
    }
    wdPaintRun();
    wdPaintStatus();
    wdStartTimer();
}

function wdLoadCycle(fillFields){
    const token = ++wdToken;
    return sb.rpc("admin_get_withdrawal_cycle").then(({ data, error }) => {
        if(token !== wdToken) return;
        if(error) return Promise.reject(error);
        wdApplyCycle(data, fillFields);
    });
}

function wdLockInputs(lock){
    ["withdrawalDaysInput", "wdOD", "wdOH", "wdOM", "wdOS", "wdCD", "wdCH", "wdCM", "wdCS"].forEach(id => {
        const el = wdEl(id); if(el) el.disabled = lock;
    });
    const save = wdEl("withdrawalDaysSaveBtn"), start = wdEl("wdStartBtn");
    if(save) save.disabled = lock;
    if(start) start.disabled = lock;
}

function openWithdrawalDays(){

    const modal = wdEl("withdrawalDaysModal");
    const body = wdEl("wdBody");
    const status = wdEl("withdrawalDaysStatus");

    if(!modal || !body || !status) return;

    modal.style.display = "flex";

    wdCycle = null;
    withdrawalDaysLoaded = null;
    wdLegacy = false;
    wdEl("withdrawalDaysInput").value = "";
    ["wdO", "wdC"].forEach(p => ["D", "H", "M", "S"].forEach(k => { wdEl(p + k).value = ""; }));
    wdLockInputs(true);
    status.textContent = "";
    status.className = "wday-status";
    wdEl("wdSeg").style.display = "";
    wdSetView("per_user");
    wdEl("wdRun").textContent = "Loading…";
    body.classList.add("wday-loading");

    wdLoadCycle(true)

        .then(() => {
            body.classList.remove("wday-loading");
            wdLockInputs(false);
            wdSetView(wdRunning() ? "shared" : "per_user");
            // no input.focus(): it would pop the phone keyboard open by itself
        })

        .catch(error => {
            // the shared-timer SQL is not installed yet: fall back to the per user setting only
            sb.rpc("admin_get_withdrawal_interval").then(({ data, error: err2 }) => {
                body.classList.remove("wday-loading");
                if(err2){
                    status.textContent = "Failed to load: " + err2.message;
                    status.className = "wday-status wday-status-error";
                    return;
                }
                wdLegacy = true;
                withdrawalDaysLoaded = Number(data) || 0;
                wdEl("withdrawalDaysInput").value = String(withdrawalDaysLoaded);
                wdEl("wdSeg").style.display = "none";
                wdLockInputs(true);
                wdEl("withdrawalDaysInput").disabled = false;
                wdEl("withdrawalDaysSaveBtn").disabled = false;
                wdSetView("per_user");
            });
        });

}

function closeWithdrawalDays(){

    const modal = wdEl("withdrawalDaysModal");

    wdStopTimer();
    wdToken++;

    if(modal){
        modal.style.display = "none";
    }

}

function saveWithdrawalDays(button){

    if(window.KTPerm && !KTPerm.require("change the withdrawal interval")) return;

    const input = wdEl("withdrawalDaysInput");
    const status = wdEl("withdrawalDaysStatus");

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
            if(wdCycle) wdCycle.interval_days = days;

            closeWithdrawalDays();

            KTUI.success(
                wdRunning()
                    ? "Saved. It will be used when you stop the shared timer."
                    : (days === 0
                        ? "Saved. Users can withdraw without waiting (one request at a time)."
                        : "Saved. Users wait " + days + (days === 1 ? " day" : " days") + " after an approved withdrawal.")
            );

        });

}

function wdStart(button){

    if(window.KTPerm && !KTPerm.require("change the withdrawal schedule")) return;

    const open = wdReadFields("wdO");
    const closed = wdReadFields("wdC");

    if(open === null || closed === null){
        KTUI.warning("Use whole numbers only (0 or more) in the time boxes.");
        return;
    }
    if(open < 1 || closed < 1){
        KTUI.warning("Open time and closed time must each be at least 1 second.");
        return;
    }
    if(open > 31536000 || closed > 31536000){
        KTUI.warning("Open time and closed time can each be at most 365 days.");
        return;
    }

    const again = wdRunning();

    KTUI.confirm(
        (again ? "Restart the shared timer for everyone?" : "Start the shared timer for everyone?") +
        "\n\nOpen: " + wdLen(open) + "\nClosed: " + wdLen(closed) +
        "\n\nWithdrawals open for all users right now. After the open time they close for everyone, and the cycle repeats. " +
        "In each open period a user can make one request. This replaces the per user timers until you stop it.",
        {
            title: again ? "Restart shared timer" : "Start shared timer",
            confirmText: again ? "Restart" : "Start",
            busyText: again ? "Restarting..." : "Starting...",
            run: function(){
                return sb.rpc("admin_start_withdrawal_cycle", { p_open_secs: open, p_closed_secs: closed })
                    .then(function(res){
                        if(res.error) return res.error.message;
                        wdApplyCycle(res.data, false);
                        wdSetView("shared");
                        return null;
                    });
            }
        }
    ).then(function(ok){
        if(ok) KTUI.success(again ? "Shared timer restarted. Withdrawals are open now." : "Shared timer started. Withdrawals are open now.");
    });

}

function wdStop(button){

    if(window.KTPerm && !KTPerm.require("change the withdrawal schedule")) return;

    KTUI.confirm(
        "Stop the shared timer?\n\nThe per user timers are used again (" +
        (withdrawalDaysLoaded === 0 ? "no waiting" : withdrawalDaysLoaded + (withdrawalDaysLoaded === 1 ? " day" : " days") + " between withdrawals") +
        "). Users can make requests under those rules straight away.",
        {
            title: "Stop shared timer",
            confirmText: "Stop",
            busyText: "Stopping...",
            danger: true,
            run: function(){
                return sb.rpc("admin_stop_withdrawal_cycle")
                    .then(function(res){
                        if(res.error) return res.error.message;
                        wdApplyCycle(res.data, false);
                        wdSetView("per_user");
                        return null;
                    });
            }
        }
    ).then(function(ok){
        if(ok) KTUI.success("Shared timer stopped. Per user timers are used again.");
    });

}

window.addEventListener("click", function(e){

    const modal = document.getElementById("withdrawalDaysModal");

    if(modal && e.target === modal){
        closeWithdrawalDays();
    }

});
