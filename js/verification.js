// =================================
// VERIFICATION PAGE
// =================================

function initVerification() {

    const totalRequests = document.getElementById("totalRequests");
    const pendingRequests = document.getElementById("pendingRequests");
    const approvedRequests = document.getElementById("approvedRequests");
    const rejectedRequests = document.getElementById("rejectedRequests");

    const modal = document.getElementById("reviewModal");
    const closeModal = document.querySelector(".close-review");

    const reviewName = document.getElementById("reviewName");
    const reviewDate = document.getElementById("reviewDate");
    const reviewEmail = document.getElementById("reviewEmail");
    const reviewPhone = document.getElementById("reviewPhone");
    const reviewCountry = document.getElementById("reviewCountry");

    const reviewIdFront = document.getElementById("reviewIdFront");
    const reviewIdBack = document.getElementById("reviewIdBack");
    const reviewSelfie = document.getElementById("reviewSelfie");

    const approveBtn = document.querySelector(".approve-btn");
    const rejectBtn = document.querySelector(".reject-btn");
    const requestBtn = document.querySelector(".request-btn");
    const resetBtn = document.querySelector(".reset-btn");

    let selectedRow = null;
    let kycData = {};

    // ===============================
    // Load KYC submissions from Supabase
    // ===============================

    function loadKyc(){

        sb.from("kyc_submissions")
            .select("id, user_id, id_front_url, id_back_url, selfie_url, status, needs_resubmission, admin_note, created_at, profiles(username, surname, email, phone)")
            .order("created_at", { ascending: false })

            .then(({ data, error }) => {

                if(error){
                    console.error("Failed to load KYC submissions:", error);
                    return;
                }

                kycData = {};

                data.forEach(row => {

                    const fullName = row.profiles
                        ? [row.profiles.username, row.profiles.surname].filter(Boolean).join(" ")
                        : "Unknown";

                    kycData[row.id] = {
                        id: row.id,
                        userId: row.user_id,
                        createdAt: row.created_at,
                        name: fullName,
                        email: row.profiles ? (row.profiles.email || "") : "",
                        phone: row.profiles ? (row.profiles.phone || "") : "",
                        date: new Date(row.created_at).toLocaleDateString("en-US", {
                            day: "2-digit", month: "short", year: "numeric"
                        }),
                        idFront: row.id_front_url,
                        idBack: row.id_back_url,
                        selfie: row.selfie_url,
                        status: row.status,
                        needsResubmission: row.needs_resubmission,
                        adminNote: row.admin_note
                    };

                });

                renderVerificationData();

                updateKycStats();

            });

    }

    // ===============================
    // Render Rows From Data
    // ===============================

    function renderRow(entry) {

        const tr = document.createElement("tr");

        tr.dataset.kycid = entry.id;
        tr.dataset.status = entry.status;

        const buttonLabel =
            entry.status === "pending" ? "Review" : "View";

        const nameCell = entry.needsResubmission
            ? entry.name + " <span style=\"opacity:.6;font-size:11px;\">(reset)</span>"
            : entry.name;

        tr.innerHTML =
            "<td>" + nameCell + "</td>" +
            "<td>" + entry.date + "</td>" +
            "<td><button class=\"review-btn\">" + buttonLabel + "</button></td>";

        return tr;

    }

    function renderVerificationData() {

        const pendingBody =
            document.querySelector("#pendingList tbody");

        const approvedBody =
            document.querySelector("#approvedList tbody");

        const rejectedBody =
            document.querySelector("#rejectedList tbody");

        pendingBody.innerHTML = "";
        approvedBody.innerHTML = "";
        rejectedBody.innerHTML = "";

        const allEntries = Object.values(kycData);

        // Pending: show every pending row, no dedup needed.
        allEntries
            .filter(entry => entry.status === "pending")
            .forEach(entry => pendingBody.appendChild(renderRow(entry)));

        // Approved/Rejected: only each user's single most recent resolved
        // record — an older superseded outcome (e.g. an earlier rejection
        // before a later approval) is dropped from view.
        const latestResolvedByUser = {};

        allEntries
            .filter(entry => entry.status === "approved" || entry.status === "rejected")
            .forEach(entry => {
                const existing = latestResolvedByUser[entry.userId];
                if (!existing || new Date(entry.createdAt) > new Date(existing.createdAt)) {
                    latestResolvedByUser[entry.userId] = entry;
                }
            });

        Object.values(latestResolvedByUser).forEach(entry => {
            if (entry.status === "approved") {
                approvedBody.appendChild(renderRow(entry));
            } else {
                rejectedBody.appendChild(renderRow(entry));
            }
        });

        loadReviewButtons();

    }

    // ===============================
    // Update Statistics
    // ===============================

    function updateKycStats() {

        const pending =
            document.querySelectorAll("#pendingList tbody tr").length;

        const approved =
            document.querySelectorAll("#approvedList tbody tr").length;

        const rejected =
            document.querySelectorAll("#rejectedList tbody tr").length;

        totalRequests.textContent =
            pending + approved + rejected;

        pendingRequests.textContent = pending;
        approvedRequests.textContent = approved;
        rejectedRequests.textContent = rejected;
    }

    loadKyc();

    // ===============================
    // Tabs
    // ===============================

    const tabs = document.querySelectorAll(".kyc-tab");
    const sections = document.querySelectorAll(".verification-section");

    document.querySelector("#pendingList")
        .closest(".verification-section")
        .style.display = "block";

    document.querySelector("#approvedList")
        .closest(".verification-section")
        .style.display = "none";

    document.querySelector("#rejectedList")
        .closest(".verification-section")
        .style.display = "none";

    tabs.forEach(tab => {

        tab.addEventListener("click", function () {

            tabs.forEach(t =>
                t.classList.remove("active"));

            this.classList.add("active");

            const status =
                this.dataset.status;

            sections.forEach(section => {

                section.style.display = "none";

            });

            if (status === "pending") {

                document.querySelector("#pendingList")
                    .closest(".verification-section")
                    .style.display = "block";

            }

            if (status === "approved") {

                document.querySelector("#approvedList")
                    .closest(".verification-section")
                    .style.display = "block";

            }

            if (status === "rejected") {

                document.querySelector("#rejectedList")
                    .closest(".verification-section")
                    .style.display = "block";

            }

        });

    });

    // ===============================
    // Review Buttons
    // ===============================

    function loadReviewButtons() {

        document.querySelectorAll(".review-btn").forEach(button => {

            button.onclick = function () {

                selectedRow = this.closest("tr");

                const entry = kycData[selectedRow.dataset.kycid];

                if(!entry) return;

                reviewName.textContent = entry.name;
                reviewDate.textContent = entry.date;
                reviewEmail.textContent = entry.email || "—";
                reviewPhone.textContent = entry.phone || "—";
                reviewCountry.textContent = "";

                reviewIdFront.src = entry.idFront;
                reviewIdBack.src = entry.idBack;
                reviewSelfie.src = entry.selfie;

                document.getElementById("adminNoteInput").value = "";

                if (entry.status === "pending") {

                    approveBtn.style.display = "inline-block";
                    rejectBtn.style.display = "inline-block";
                    requestBtn.style.display = "inline-block";
                    resetBtn.style.display = "none";

                } else {

                    approveBtn.style.display = "none";
                    rejectBtn.style.display = "none";
                    requestBtn.style.display = "none";
                    resetBtn.style.display = "inline-block";

                }

                modal.style.display = "flex";

            };

        });

    }

    // ===============================
    // Close Modal
    // ===============================

    closeModal.onclick = function () {

        modal.style.display = "none";

    };

    window.onclick = function (e) {

        if (e.target === modal) {

            modal.style.display = "none";

        }

    };

    // ===============================
    // Approve (real — approve_kyc RPC)
    // ===============================

    
    approveBtn.onclick = function () {

        if (!selectedRow) return;

        const kycId = selectedRow.dataset.kycid;
        const note = document.getElementById("adminNoteInput").value.trim() || null;

        sb.rpc("approve_kyc", { p_kyc_id: kycId, p_note: note })

            .then(({ error }) => {

                if(error){
                    alert("Failed to approve: " + error.message);
                    return;
                }

                modal.style.display = "none";

                loadKyc();

            });

    };

    // ===============================
    // Reject (real — reject_kyc RPC)
    // ===============================

    rejectBtn.onclick = function () {

        if (!selectedRow) return;

        const kycId = selectedRow.dataset.kycid;
        const note = document.getElementById("adminNoteInput").value.trim() || null;

        sb.rpc("reject_kyc", { p_kyc_id: kycId, p_note: note })

            .then(({ error }) => {

                if(error){
                    alert("Failed to reject: " + error.message);
                    return;
                }

                modal.style.display = "none";

                loadKyc();

            });

    };

    // ===============================
    // Reset Verification (real — admin_reset_kyc RPC)
    // ===============================

    resetBtn.onclick = function () {

        if (!selectedRow) return;

        const kycId = selectedRow.dataset.kycid;
        const note = document.getElementById("adminNoteInput").value.trim() || null;

        sb.rpc("admin_reset_kyc", { p_kyc_id: kycId, p_note: note })

            .then(({ error }) => {

                if(error){
                    alert("Failed to reset: " + error.message);
                    return;
                }

                modal.style.display = "none";

                loadKyc();

            });

    };

    // ===============================
    // Request Documents (real — sends a notification)
    // ===============================

    requestBtn.onclick = function () {

        if (!selectedRow) return;

        const kycId = selectedRow.dataset.kycid;
        const note = document.getElementById("adminNoteInput").value.trim() || null;

        sb.rpc("admin_request_kyc_documents", { p_kyc_id: kycId, p_note: note })

            .then(({ error }) => {

                if(error){
                    alert("Failed to send request: " + error.message);
                    return;
                }

                alert("Request for additional documents has been sent.");

                modal.style.display = "none";

            });

    };

}
