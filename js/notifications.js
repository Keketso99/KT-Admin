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
// ===============================

const NOTIFICATION_ICONS = {
    approved_deposit: "fa-solid fa-wallet",
    rejected_deposit: "fa-solid fa-wallet",
    approved_withdrawal: "fa-solid fa-money-bill-transfer",
    rejected_withdrawal: "fa-solid fa-money-bill-transfer",
    approved_kyc: "fa-solid fa-user-check",
    rejected_kyc: "fa-solid fa-user-xmark",
    reset_kyc: "fa-solid fa-rotate-left",
    requested_kyc_documents: "fa-solid fa-file-circle-question",
    credited_wallet: "fa-solid fa-circle-plus",
    debited_wallet: "fa-solid fa-circle-minus",
    set_user_plan: "fa-solid fa-chart-line"
};

function labelForAction(action){
    return action
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
// LOAD ACTIVITY FEED FROM SUPABASE
// ===============================

function loadNotifications(){

    sb.from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

        .then(({ data, error }) => {

            if(error){
                console.error("Failed to load activity feed:", error);
                return;
            }

            notificationsData = data.map(row => ({
                id: row.id,
                icon: NOTIFICATION_ICONS[row.action] || "fa-solid fa-bell",
                title: labelForAction(row.action),
                message: row.target_table
                    ? `${labelForAction(row.action)} (${row.target_table})`
                    : labelForAction(row.action),
                time: formatRelativeTime(row.created_at),
                status: row.is_read ? "read" : "unread"
            }));

            renderNotifications();

            updateNotificationStats();

            showNotificationTab(currentNotificationTab);

        });

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


function viewNotification(button){

    selectedNotification = button.parentElement;
    selectedNotificationId = selectedNotification.dataset.id;

    document.getElementById("notificationDetails").innerHTML =
    selectedNotification.outerHTML;

    const markBtn = document.querySelector(".mark-read-btn");

    if(selectedNotification.classList.contains("unread")){
        markBtn.textContent = "Mark Read";
    } else {
        markBtn.textContent = "Mark Unread";
    }

    document.getElementById("notificationModal").style.display="flex";

}


function closeNotificationModal(){
    document.getElementById("notificationModal").style.display="none";
}


// ===============================
// MARK READ/UNREAD (real — updates activity_log.is_read)
// ===============================

function markRead(){

    if(!selectedNotificationId) return;

    const isCurrentlyUnread = selectedNotification.classList.contains("unread");

    sb.from("activity_log")
        .update({ is_read: isCurrentlyUnread })
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
// SEND NOTIFICATION (real — broadcasts to all users)
// ===============================

function sendNotification(){

    const title = document.getElementById("notificationTitle").value.trim();

    const message = document.getElementById("notificationMessage").value.trim();

    if(title==="" || message===""){
        alert("Please complete all fields.");
        return;
    }

    // user_id left NULL = broadcast to every user (per the
    // notifications table's design)
    sb.from("notifications")
        .insert({ user_id: null, title: title, body: message })

        .then(({ error }) => {

            if(error){
                alert("Failed to send notification: " + error.message);
                return;
            }

            alert("Notification sent successfully.");

            document.getElementById("notificationTitle").value="";
            document.getElementById("notificationMessage").value="";

            closeSendNotificationModal();

        });

}
