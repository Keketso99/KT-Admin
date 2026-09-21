// ===============================
// NOTIFICATIONS PAGE
// ===============================

let notificationsData = [];
let selectedNotification = null;
let selectedNotificationId = null;
let currentNotificationTab = "all";
let currentNotificationTabButton = null;

// ===============================
// ACTION -> ICON / LABEL MAPPING
// (only the "request created" actions logged under category REQUESTS
//  ever reach this page — see audit_user_requests / admin_send_notification)
// ===============================

const NOTIFICATION_ICONS = {
    deposit_requested: "fa-solid fa-wallet",
    withdrawal_requested: "fa-solid fa-money-bill-transfer",
    notification_sent: "fa-solid fa-paper-plane",
    password_reset_requested: "fa-solid fa-key",
    withdrawal_pin_reset_requested: "fa-solid fa-key",
    personal_info_change_requested: "fa-solid fa-user-pen",
    payment_methods_change_requested: "fa-solid fa-credit-card",
    kyc_verification_requested: "fa-solid fa-id-card",
    kyc_resubmission_requested: "fa-solid fa-file-circle-question",
    unblock_requested: "fa-solid fa-user-check"
};

const NOTIFICATION_LABELS = {
    deposit_requested: "Deposit Request",
    withdrawal_requested: "Withdrawal Request",
    notification_sent: "Notification Sent",
    password_reset_requested: "Forgot Password Request",
    withdrawal_pin_reset_requested: "Forgot Withdrawal PIN Request",
    personal_info_change_requested: "Personal Information Change Request",
    payment_methods_change_requested: "Payment Method Change Request",
    kyc_verification_requested: "KYC Verification Request",
    kyc_resubmission_requested: "KYC Resubmission Request",
    unblock_requested: "Account Reactivation Request"
};

const AUDIENCE_LABELS = {
    all: "All Users",
    verified: "Verified Users",
    not_verified: "Not Verified Users"
};

function labelForAction(action){

    if(NOTIFICATION_LABELS[action]) return NOTIFICATION_LABELS[action];

    return String(action)
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

}

function formatRelativeTime(dateString){

    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);

    if(seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if(minutes < 60) return minutes + (minutes === 1 ? " minute ago" : " minutes ago");

    const hours = Math.floor(minutes / 60);
    if(hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");

    const days = Math.floor(hours / 24);
    if(days < 7) return days + (days === 1 ? " day ago" : " days ago");

    return date.toLocaleDateString();

}

// ===============================
// MESSAGE BUILDING
// ===============================

function messageForEntry(row, name){

    const meta = row.metadata || {};
    const who = name || "A user";

    switch(row.action){

        case "deposit_requested":
            return who + " requested a deposit of R" +
                Number(meta.amount_zar || 0).toFixed(2) +
                (meta.method ? " via " + labelForAction(meta.method) : "");

        case "withdrawal_requested":
            return who + " requested a withdrawal of R" +
                Number(meta.amount_zar || 0).toFixed(2);

        case "notification_sent":
            return "Sent to " +
                (AUDIENCE_LABELS[meta.audience] || meta.audience || "users") +
                " (" + (meta.recipient_count || 0) + "): " +
                (meta.title || "");

        case "password_reset_requested":
            return who + " requested a password reset.";

        case "withdrawal_pin_reset_requested":
            return who + " requested a withdrawal PIN reset.";

        case "personal_info_change_requested":
            return who + " requested to change personal information.";

        case "payment_methods_change_requested":
            return who + " requested to change payment methods.";

        case "kyc_verification_requested":
            return who + " submitted KYC verification documents.";

        case "kyc_resubmission_requested":
            return who + " requested to resubmit KYC verification.";

        case "unblock_requested":
            return who + " requested account reactivation.";

        default:
            return labelForAction(row.action);

    }

}

// ===============================
// LOAD REQUEST-EVENT FEED FROM SUPABASE
// ===============================

function loadNotifications(){

    sb.from("activity_log")
        .select("*")
        .eq("category", "REQUESTS")
        .order("created_at", { ascending: false })
        .limit(100)

        .then(({ data, error }) => {

            if(error){
                console.error("Failed to load notifications:", error);
                return;
            }

            const rows = data || [];

            // notification_sent rows have no requesting user to name —
            // only look up names for rows that reference one.
            const userIds = [...new Set(
                rows
                    .filter(r => r.action !== "notification_sent" && r.target_id)
                    .map(r => r.target_id)
            )];

            if(userIds.length === 0){
                buildNotificationsData(rows, {});
                return;
            }

            sb.from("profiles")
                .select("id, username, surname")
                .in("id", userIds)

                .then(({ data: profileRows, error: profileError }) => {

                    if(profileError){
                        console.error("Failed to load requester names:", profileError);
                    }

                    const names = {};

                    (profileRows || []).forEach(p => {
                        names[p.id] = (p.username + " " + (p.surname || "")).trim();
                    });

                    buildNotificationsData(rows, names);

                });

        });

}

function buildNotificationsData(rows, names){

    notificationsData = rows.map(row => ({
        id: row.id,
        icon: NOTIFICATION_ICONS[row.action] || "fa-solid fa-bell",
        title: labelForAction(row.action),
        message: messageForEntry(row, names[row.target_id]),
        time: formatRelativeTime(row.created_at),
        status: row.is_read ? "read" : "unread"
    }));

    renderNotifications();

    updateNotificationStats();

    showNotificationTab(currentNotificationTab);

}

function renderNotifications(){

    const list = document.getElementById("notificationList");

    list.innerHTML = "";

    notificationsData.forEach(entry=>{

        const row = document.createElement("div");

        row.className = "notification-row " + entry.status;
        row.dataset.id = entry.id;

        row.innerHTML =
        "<div class=\"notification-icon\">" +
            "<i class=\"" + entry.icon + "\"></i>" +
        "</div>" +

        "<div class=\"notification-content\">" +
            "<h4>" + entry.title + "</h4>" +
            "<p>" + entry.message + "</p>" +
            "<small>" + entry.time + "</small>" +
        "</div>" +

        "<button onclick=\"viewNotification(this)\">" +
            "View" +
        "</button>";

        list.appendChild(row);

    });

}


function initNotifications(){

    loadNotifications();

    document.querySelectorAll(".tab-btn")
    .forEach(btn=>{
        btn.classList.remove("active");
    });

    document.querySelector(".tab-btn")
    .classList.add("active");

    showNotificationTab("all");

}


function updateNotificationStats(){

    const total = document.querySelectorAll(".notification-row").length;

    const unread = document.querySelectorAll(".notification-row.unread").length;

    const read = document.querySelectorAll(".notification-row.read").length;

    document.getElementById("totalNotifications").innerHTML = total;

    document.getElementById("unreadNotifications").innerHTML = unread;

    document.getElementById("readNotifications").innerHTML = read;

}


function showNotificationTab(type,button){

    currentNotificationTab = type;

    if(button){
        currentNotificationTabButton = button;
    }

    document.querySelectorAll(".tab-btn")
    .forEach(btn=>{
        btn.classList.remove("active");
    });

    if(button){
        button.classList.add("active");
    }
    else if(currentNotificationTabButton){
        currentNotificationTabButton.classList.add("active");
    }
    else if(type==="all"){
        document.querySelector(".tab-btn").classList.add("active");
    }

    document.querySelectorAll(".notification-row")
    .forEach(row=>{

        if(type==="all"){
            row.style.display="flex";
        }
        else if(row.classList.contains(type)){
            row.style.display="flex";
        }
        else{
            row.style.display="none";
        }

    });

}


// ===============================
// VIEW (marks read on open — real, updates activity_log.is_read)
// ===============================

function viewNotification(button){

    selectedNotification = button.parentElement;
    selectedNotificationId = selectedNotification.dataset.id;

    document.getElementById("notificationDetails").innerHTML =
    selectedNotification.outerHTML;

    document.getElementById("notificationModal").style.display="flex";

    if(selectedNotification.classList.contains("unread")){

        sb.from("activity_log")
            .update({ is_read: true })
            .eq("id", selectedNotificationId)

            .then(({ error }) => {

                if(error){
                    console.error("Failed to mark as read:", error);
                    return;
                }

                selectedNotification.classList.remove("unread");
                selectedNotification.classList.add("read");

                updateNotificationStats();

            });

    }

}


function closeNotificationModal(){
    document.getElementById("notificationModal").style.display="none";
}


// ===============================
// MARK UNREAD (real — updates activity_log.is_read)
// Viewing a notification already marks it read, so this button only
// ever needs to do one thing: put it back to unread.
// ===============================

function markNotificationUnread(){

    if(!selectedNotificationId) return;

    sb.from("activity_log")
        .update({ is_read: false })
        .eq("id", selectedNotificationId)

        .then(({ error }) => {

            if(error){
                alert("Failed to update: " + error.message);
                return;
            }

            closeNotificationModal();

            loadNotifications();

        });

}


function deleteNotification(){
    document.getElementById("deleteConfirmModal").style.display="flex";
}


function closeDeleteConfirmModal(){
    document.getElementById("deleteConfirmModal").style.display="none";
}


// ===============================
// DELETE (real — removes the activity_log row)
// ===============================

function confirmDeleteNotification(){

    if(!selectedNotificationId){
        closeDeleteConfirmModal();
        return;
    }

    sb.from("activity_log").delete().eq("id", selectedNotificationId)

        .then(({ error }) => {

            closeDeleteConfirmModal();
            closeNotificationModal();

            if(error){
                alert("Failed to delete: " + error.message);
                return;
            }

            loadNotifications();

        });

}


function openNotificationModal(){
    document.getElementById("sendNotificationModal").style.display="flex";
}


function closeSendNotificationModal(){
    document.getElementById("sendNotificationModal").style.display="none";
}


// ===============================
// SEND NOTIFICATION (real — via admin_send_notification RPC,
// resolves audience to real recipients and inserts one row per user)
// ===============================

function sendNotification(){

    const title = document.getElementById("notificationTitle").value.trim();

    const message = document.getElementById("notificationMessage").value.trim();

    const audience = document.getElementById("notificationAudience").value;

    if(title==="" || message===""){
        alert("Please complete all fields.");
        return;
    }

    const sendBtn = document.querySelector(".send-notif-btn");

    if(sendBtn){
        sendBtn.disabled = true;
        sendBtn.textContent = "Sending...";
    }

    sb.rpc("admin_send_notification", {
        p_title: title,
        p_body: message,
        p_audience: audience
    })

        .then(({ data, error }) => {

            if(sendBtn){
                sendBtn.disabled = false;
                sendBtn.textContent = "Send";
            }

            if(error){
                alert("Failed to send notification: " + error.message);
                return;
            }

            const count = Number(data || 0);

            alert("Notification sent to " + count + (count === 1 ? " user." : " users."));

            document.getElementById("notificationTitle").value="";
            document.getElementById("notificationMessage").value="";

            closeSendNotificationModal();

            loadNotifications();

        });

}