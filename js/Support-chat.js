// ======================================================
// SUPPORT CHAT — real, Supabase-backed (individual chats only)
// Rebuilt from the local-mock version to use real data end to
// end: support_conversations / support_messages, real users
// (profiles), real wallet/deposit/withdrawal/KYC/plan data for
// the profile modal, and a real "support-chat" storage bucket
// for photo/document/camera attachments and voice notes.
//
// Dropped (no real signal exists for these, so faking them
// would be dishonest rather than "real"):
//   - the fake typing-indicator bot reply (simulateTypingReply)
//   - per-message blue "read" ticks (the real user app has no
//     read-receipt concept at all — sent messages always show
//     a single check, never a double check)
//   - "online" presence dot (no presence system) — the chat
//     header shows the user's phone number instead
//   - chat mute (was already dead code — no button in the HTML
//     called toggleChatMute)
// Everything else (reply, edit own messages, delete any
// message, pin/unpin, chat priority + pin-to-top, bulk
// select/delete/priority, message search, new chat, clear
// messages, delete chat, real attachments/voice) is real.
// ======================================================


// ======================================================
// STATE
// ======================================================

const CHAT_LONG_PRESS_DURATION = 500;
const CHAT_LONG_PRESS_MOVE_TOLERANCE = 10;

let supportChatUsers = [];
let individualChats = [];

let currentChat = null;

// ---- Live chat extras: typing, online, read ticks ----
let typingChannel = null;
let userTypingTimer = null;
let chatUserTyping = false;
let chatUserOnline = false;
let lastTypingSentAt = 0;
let presenceHooked = false;

// Lets the live-updates module know which chat is on screen right now
// (so it does not pop up an alert for a conversation you are reading).
window.getOpenSupportChatId = function () {
    return currentChat ? currentChat.id : null;
};
let currentChatType = "individual";
let currentUser = null;

let replyingToMessage = null;
let editingMessage = null;

let currentChatFilter = "all";
let currentChatSearch = "";

let chatMenuOpen = false;
let attachmentMenuOpen = false;

let isRecordingVoice = false;
let voiceMediaRecorder = null;
let voiceRecordedChunks = [];
let voiceStream = null;

let deleteActionType = null;
let deleteActionId = null;
let deleteActionIds = [];

let chatSelectionMode = false;
let selectedChatIds = [];
let pendingBulkAction = null;
let pendingPriorityMode = null;

let pinMessageSelectionMode = false;
let selectedPinMessageIds = [];
let currentPinnedMessageIndex = 0;

let messageSearchActive = false;
let messageSearchQuery = "";
let messageSearchResults = [];
let currentMessageSearchIndex = -1;

let supportAdminId = null;
let supportMsgChannel = null;
let supportConvChannel = null;
let supportChatInitialized = false;


// ======================================================
// DOM HELPER
// ======================================================

function supportChatElement(id) {
    return document.getElementById(id);
}

function getInitials(name) {

    if (!name) return "?";

    const parts = name.trim().split(/\s+/);

    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();

}

function supportEscapeHtml(value) {

    return String(value === null || value === undefined ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

function fullNameOf(row) {
    return (row.username + " " + (row.surname || "")).trim() || "Unknown user";
}

function formatMessageTime(dateString) {

    const date = new Date(dateString);

    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

}

function formatChatListTime(dateString) {

    const date = new Date(dateString);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
    }

    return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });

}

function findIndividualChat(chatId) {
    return individualChats.find(function (chat) { return chat.id === chatId; });
}

function findSupportUser(userId) {
    return supportChatUsers.find(function (u) { return u.id === userId; });
}


// ======================================================
// INIT
// ======================================================

function initSupportChatPage() {

    if (supportChatInitialized) {
        loadSupportConversations();
        return;
    }

    supportChatInitialized = true;

    sb.auth.getUser().then(function (res) {

        supportAdminId = res.data && res.data.user ? res.data.user.id : null;

        loadSupportConversations();
        setupSupportRealtime();

    });

    setupComposerEvents();
    setupAttachmentEvents();
    setupMessageSearchEvents();
    setupPinMessageInput();
    setupChatMenuOutsideClick();
    setupChatSelectionOutsideClick();
    setupPinSelectionOutsideClick();
    setupReplyPreviewEvents();

    const chatSearchInput = supportChatElement("chatSearch");

    if (chatSearchInput) {
        chatSearchInput.addEventListener("input", function () {
            searchChats(chatSearchInput.value);
        });
    }

    const userSearchInput = supportChatElement("userSearchInput");

    if (userSearchInput) {
        userSearchInput.addEventListener("input", function () {
            renderAvailableUsers(userSearchInput.value);
        });
    }

}

function showIndividualChats() {
    // Only one section exists now (groups removed) — nothing to switch,
    // kept only so the header button remains a harmless no-op.
}


// ======================================================
// LOAD CONVERSATIONS
// ======================================================

function showChatLoadingOverlay() {

    const overlay = supportChatElement("chatLoadingOverlay");
    if (overlay) overlay.classList.remove("hidden");

}

function hideChatLoadingOverlay() {

    const overlay = supportChatElement("chatLoadingOverlay");
    if (overlay) overlay.classList.add("hidden");

}

function loadSupportConversations(onDone) {

    sb.rpc("admin_list_support_conversations").then(function (res) {

        if (res.error) {
            console.error("Failed to load support conversations:", res.error);
            if (typeof onDone === "function") onDone();
            return;
        }

        const rows = res.data || [];

        rows.forEach(function (row) {

            const existing = findIndividualChat(row.id);

            const chat = existing || { id: row.id, messages: [] };

            chat.userId = row.user_id;
            chat.name = fullNameOf(row);
            chat.phone = row.phone;
            chat.isBlocked = row.is_blocked;
            chat.status = row.status;
            chat.assignedAdmin = row.assigned_admin;
            chat.priority = row.priority;
            chat.pinned = row.pinned;
            chat.lastMessage = row.last_message
                ? (row.last_sender_type === "admin" ? "You: " : "") + row.last_message
                : "No messages yet";
            chat.lastMessageTime = formatChatListTime(row.last_message_at || row.created_at);
            chat.unread = row.unread_count || 0;

            if (!existing) {
                individualChats.push(chat);
            }

        });

        const validIds = rows.map(function (r) { return r.id; });

        individualChats = individualChats.filter(function (c) { return validIds.indexOf(c.id) !== -1; });

        renderIndividualChats();
        updateUnreadCounts();

        if (currentChat) {
            const fresh = findIndividualChat(currentChat.id);
            if (fresh) {
                fresh.messages = currentChat.messages;
                currentChat = fresh;
                renderCurrentChat();
            }
        }

        refreshUserReadTimes();

        if (typeof onDone === "function") onDone();

    });

}


// ======================================================
// RENDER CHAT LIST
// ======================================================

function renderIndividualChats() {

    const container = supportChatElement("individualChats");
    const emptyState = supportChatElement("noIndividualChats");

    if (!container) return;

    container.innerHTML = "";

    let chats = [...individualChats];

    if (currentChatFilter === "unread") {
        chats = chats.filter(function (chat) { return chat.unread > 0; });
    }

    if (currentChatFilter === "priority") {
        chats = chats.filter(function (chat) { return chat.priority; });
    }

    if (currentChatSearch.trim()) {
        const search = currentChatSearch.toLowerCase().trim();
        chats = chats.filter(function (chat) { return chat.name.toLowerCase().includes(search); });
    }

    if (chatSelectionMode && pendingBulkAction === "priority") {

        if (pendingPriorityMode === "add") {
            chats = chats.filter(function (chat) { return !chat.priority; });
        } else if (pendingPriorityMode === "remove") {
            chats = chats.filter(function (chat) { return chat.priority; });
        }

    }

    chats.sort(function (a, b) {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
    });

    if (chats.length === 0) {
        if (emptyState) {

            const titleEl = emptyState.querySelector("h4");
            const textEl = emptyState.querySelector("p");
            const buttonEl = emptyState.querySelector("button");
            const searchTerm = currentChatSearch.trim();

            let title = "No conversations";
            let text = "Start a new conversation with a user.";
            let showButton = true;

            if (chatSelectionMode && pendingBulkAction === "priority") {
                title = "No conversations available";
                text = pendingPriorityMode === "remove"
                    ? "No conversations are marked as priority."
                    : "Every conversation is already marked as priority.";
                showButton = false;
            } else if (searchTerm) {
                title = "No results";
                text = "No conversations match \"" + searchTerm + "\".";
                showButton = false;
            } else if (currentChatFilter === "unread") {
                title = "No unread conversations";
                text = "You're all caught up.";
                showButton = false;
            } else if (currentChatFilter === "priority") {
                title = "No priority conversations";
                text = "Conversations you mark as priority will appear here.";
                showButton = false;
            }

            if (titleEl) titleEl.textContent = title;
            if (textEl) textEl.textContent = text;
            if (buttonEl) buttonEl.style.display = showButton ? "" : "none";

            emptyState.style.display = "flex";
        }
        updateIndividualChatCount(0);
        return;
    }

    if (emptyState) emptyState.style.display = "none";

    chats.forEach(function (chat) {
        container.appendChild(createIndividualChatItem(chat));
    });

    updateIndividualChatCount(chats.length);

}

function createIndividualChatItem(chat) {

    const item = document.createElement("div");
    item.className = "chat-list-item";

    if (currentChat && currentChat.id === chat.id) {
        item.classList.add("active");
    }

    if (chat.unread > 0) {
        item.classList.add("unread");
    }

    if (selectedChatIds.includes(chat.id)) {
        item.classList.add("chat-selected");
    }

    item.dataset.chatId = chat.id;

    const avatar = document.createElement("div");
    avatar.className = "chat-list-avatar";
    avatar.textContent = getInitials(chat.name);

    const content = document.createElement("div");
    content.className = "chat-list-content";

    const top = document.createElement("div");
    top.className = "chat-list-top";

    const name = document.createElement("h4");
    name.textContent = chat.name;

    const time = document.createElement("span");
    time.textContent = chat.lastMessageTime;

    top.appendChild(name);
    top.appendChild(time);

    const bottom = document.createElement("div");
    bottom.className = "chat-list-bottom";

    const message = document.createElement("p");
    message.textContent = chat.lastMessage;

    bottom.appendChild(message);

    if (chat.unread > 0) {
        const unread = document.createElement("span");
        unread.className = "chat-unread-badge";
        unread.textContent = chat.unread;
        bottom.appendChild(unread);
    }

    if (chat.priority) {
        const priority = document.createElement("i");
        priority.className = "fa-solid fa-star chat-priority";
        bottom.appendChild(priority);
    }

    content.appendChild(top);
    content.appendChild(bottom);

    item.appendChild(avatar);
    item.appendChild(content);

    attachChatPressHandlers(item, chat.id, function () {
        openIndividualChat(chat.id);
    });

    return item;

}

function updateIndividualChatCount(count) {

    const element = supportChatElement("individualChatCount");
    if (!element) return;

    element.textContent = count + (count === 1 ? " conversation" : " conversations");

}

function filterChats(filter, button) {

    currentChatFilter = filter || "all";

    document.querySelectorAll("#individualSection .chat-filter")
        .forEach(function (item) { item.classList.remove("active"); });

    if (button) button.classList.add("active");

    renderIndividualChats();

}

function searchChats(value) {

    currentChatSearch = value || "";

    renderIndividualChats();

    const clearButton = supportChatElement("clearChatSearch");

    if (clearButton) {
        clearButton.style.display = currentChatSearch.length ? "block" : "none";
    }

}

function clearChatSearch() {

    const input = supportChatElement("chatSearch");
    if (input) input.value = "";

    currentChatSearch = "";

    const clearButton = supportChatElement("clearChatSearch");
    if (clearButton) clearButton.style.display = "none";

    renderIndividualChats();

}

function updateUnreadCounts() {

    const total = individualChats.reduce(function (sum, chat) {
        return sum + (Number(chat.unread) || 0);
    }, 0);

    const element = supportChatElement("individualUnread");
    if (element) element.textContent = total;

}


// ======================================================
// OPEN / CLOSE CHAT WINDOW
// ======================================================

function openIndividualChat(chatId) {

    const chat = findIndividualChat(chatId);
    if (!chat) return;

    // Switching straight from another open chat: mark that one read.
    if (currentChat && currentChat.id !== chat.id) {
        markConversationRead(currentChat.id);
    }

    if (chatSelectionMode) exitChatSelectionMode();
    closeMessageSearch();
    cancelReply();
    cancelEditMessage();

    currentChat = chat;
    currentChatType = "individual";
    currentUser = { id: chat.userId, name: chat.name, phone: chat.phone };

    chatUserTyping = false;
    chatUserOnline = false;
    startTypingChannel(chat.id);

    if (!presenceHooked && window.KTRealtime && typeof KTRealtime.onPresence === "function") {
        presenceHooked = true;
        KTRealtime.onPresence(refreshChatUserOnline);
    }

    openChatWindow();
    renderCurrentChat();
    refreshChatUserOnline();

    if (!chat.messagesLoaded) {

        showChatLoadingOverlay();

        sb.from("support_messages")
            .select("*")
            .eq("conversation_id", chatId)
            .eq("hidden_from_admin", false)
            .order("created_at", { ascending: true })
            .then(function (res) {

                hideChatLoadingOverlay();

                if (res.error) {
                    console.error("Failed to load messages:", res.error);
                    return;
                }

                chat.messages = (res.data || [])
                    .filter(function (row) { return row.deleted_by !== "admin" && row.cleared_by !== "admin"; })
                    .map(mapSupportMessageRow);
                chat.messagesLoaded = true;

                if (currentChat && currentChat.id === chatId) {
                    renderMessages();
                    updatePinnedMessageBar();
                    scrollMessagesToBottom();
                }

            });

    } else {

        hideChatLoadingOverlay();
        renderMessages();
        updatePinnedMessageBar();
        scrollMessagesToBottom();

    }

    markConversationRead(chatId);

}

function mapSupportMessageRow(row) {

    return {
        id: row.id,
        senderId: row.sender_id,
        senderType: row.sender_type,
        senderName: row.sender_type === "admin" ? "You" : (currentUser ? currentUser.name : "User"),
        text: row.content,
        createdAt: row.created_at,
        time: formatMessageTime(row.created_at),
        sent: row.sender_type === "admin",
        edited: !!row.edited_at,
        replyToId: row.reply_to_id,
        isPinned: row.is_pinned,
        type: row.message_type || "text",
        fileUrl: row.attachment_url,
        fileName: row.attachment_name,
        fileMime: row.attachment_mime,
        // Never hides the message — just marks it, same idea as "edited".
        deletedBy: row.deleted_by || null,
        clearedBy: row.cleared_by || null
    };

}

function markConversationRead(chatId, onDone) {

    sb.from("support_conversations")
        .update({ admin_last_read_at: new Date().toISOString() })
        .eq("id", chatId)
        .then(function (res) {

            if (res.error) {
                console.error("Failed to mark conversation read:", res.error);
                if (typeof onDone === "function") onDone();
                return;
            }

            const chat = findIndividualChat(chatId);
            if (chat) chat.unread = 0;

            renderIndividualChats();
            updateUnreadCounts();

            if (typeof onDone === "function") onDone();

        });

}

// ======================================================
// LIVE EXTRAS — typing indicator, online status, read ticks
// ======================================================

function updateChatHeaderStatus() {

    if (!currentChat) return;

    const statusEl = supportChatElement("chatStatus");
    const onlineDot = supportChatElement("chatOnlineStatus");

    const base = currentChat.phone + (currentChat.isBlocked ? " · Blocked" : "");

    if (statusEl) {
        if (chatUserTyping) statusEl.textContent = "typing…";
        else statusEl.textContent = (chatUserOnline ? "Online · " : "") + base;
    }

    if (onlineDot) onlineDot.style.display = chatUserOnline ? "" : "none";

}

function refreshChatUserOnline() {

    if (!currentChat || !window.KTRealtime || typeof KTRealtime.isUserOnline !== "function") {
        chatUserOnline = false;
        updateChatHeaderStatus();
        return;
    }

    const id = currentChat.id;

    KTRealtime.isUserOnline(currentChat.userId).then(function (online) {
        if (!currentChat || currentChat.id !== id) return;
        if (online !== chatUserOnline) {
            chatUserOnline = online;
            updateChatHeaderStatus();
        }
    });

}

function stopTypingChannel() {

    if (typingChannel) {
        try { sb.removeChannel(typingChannel); } catch (e) { /* ignore */ }
        typingChannel = null;
    }

    clearTimeout(userTypingTimer);
    chatUserTyping = false;

}

function startTypingChannel(chatId) {

    stopTypingChannel();

    typingChannel = sb.channel("typing-" + chatId, { config: { broadcast: { self: false } } });

    typingChannel
        .on("broadcast", { event: "typing" }, function (msg) {

            if (!msg || !msg.payload || msg.payload.from !== "user") return;
            if (!currentChat || currentChat.id !== chatId) return;

            chatUserTyping = true;
            updateChatHeaderStatus();

            clearTimeout(userTypingTimer);
            userTypingTimer = setTimeout(function () {
                chatUserTyping = false;
                updateChatHeaderStatus();
            }, 4000);

        })
        .subscribe();

}

function sendTypingSignal() {

    if (!typingChannel || !currentChat) return;

    const now = Date.now();
    if (now - lastTypingSentAt < 2000) return;
    lastTypingSentAt = now;

    typingChannel.send({ type: "broadcast", event: "typing", payload: { from: "admin" } });

}

// Updates the ticks of messages already on screen (no re-render, no scroll jump).
function updateReadTicks() {

    if (!currentChat) return;

    const readAt = currentChat.userLastReadAt ? new Date(currentChat.userLastReadAt).getTime() : 0;

    (currentChat.messages || []).forEach(function (message) {

        if (!message.sent) return;

        const wrapper = document.querySelector('#messages [data-message-id="' + message.id + '"]');
        const tick = wrapper ? wrapper.querySelector(".msg-tick") : null;
        if (!tick) return;

        const read = readAt && new Date(message.createdAt).getTime() <= readAt;
        tick.className = (read ? "fa-solid fa-check-double" : "fa-solid fa-check") + " msg-tick";
        tick.style.color = read ? "" : "#94a3b8";

    });

}

function refreshUserReadTimes() {

    sb.from("support_conversations")
        .select("id, user_last_read_at")
        .then(function (res) {

            if (res.error || !res.data) return;

            let openChanged = false;

            res.data.forEach(function (row) {

                const chat = findIndividualChat(row.id);
                if (!chat) return;

                if (chat.userLastReadAt !== row.user_last_read_at) {
                    chat.userLastReadAt = row.user_last_read_at;
                    if (currentChat && currentChat.id === chat.id) openChanged = true;
                }

            });

            if (openChanged) updateReadTicks();

        });

}

function openChatWindow() {

    const emptyChat = supportChatElement("emptyChat");
    const chatWindow = supportChatElement("chatWindow");
    const chatMain = supportChatElement("chatMain");

    if (emptyChat) emptyChat.style.display = "none";
    if (chatWindow) chatWindow.classList.remove("hidden");
    if (chatMain) chatMain.classList.add("chat-open");

}

function closeChat() {

    const emptyChat = supportChatElement("emptyChat");
    const chatWindow = supportChatElement("chatWindow");
    const chatMain = supportChatElement("chatMain");

    if (emptyChat) emptyChat.style.display = "flex";
    if (chatWindow) chatWindow.classList.add("hidden");
    if (chatMain) chatMain.classList.remove("chat-open");

    const closingChatId = currentChat ? currentChat.id : null;

    stopTypingChannel();
    chatUserOnline = false;

    currentChat = null;
    currentUser = null;

    closeMessageSearch();
    cancelReply();
    cancelEditMessage();
    closeChatMenu();

    showChatLoadingOverlay();

    if (closingChatId) {
        // Everything on screen while the chat was open has been seen.
        markConversationRead(closingChatId, function () {
            loadSupportConversations(hideChatLoadingOverlay);
        });
    } else {
        loadSupportConversations(hideChatLoadingOverlay);
    }

}

function renderCurrentChat() {

    if (!currentChat) return;

    const nameEl = supportChatElement("chatName");
    const statusEl = supportChatElement("chatStatus");
    const avatarImg = supportChatElement("chatAvatar");
    const avatarInitials = supportChatElement("chatAvatarInitials");
    const onlineDot = supportChatElement("chatOnlineStatus");

    if (nameEl) nameEl.textContent = currentChat.name;
    updateChatHeaderStatus();

    if (avatarImg) avatarImg.style.display = "none";

    if (avatarInitials) {
        avatarInitials.classList.remove("hidden");
        avatarInitials.textContent = getInitials(currentChat.name);
    }

    renderMessages();
    updatePinnedMessageBar();

}

function toggleChatMenu() {

    const menu = supportChatElement("chatMenu");
    const moreBtn = supportChatElement("chatMoreButton");
    const closeBtn = supportChatElement("chatMenuCloseButton");

    chatMenuOpen = !chatMenuOpen;

    if (menu) menu.classList.toggle("hidden", !chatMenuOpen);
    if (moreBtn) moreBtn.style.display = chatMenuOpen ? "none" : "";
    if (closeBtn) closeBtn.style.display = chatMenuOpen ? "" : "none";

}

function closeChatMenu() {

    chatMenuOpen = false;

    const menu = supportChatElement("chatMenu");
    const moreBtn = supportChatElement("chatMoreButton");
    const closeBtn = supportChatElement("chatMenuCloseButton");

    if (menu) menu.classList.add("hidden");
    if (moreBtn) moreBtn.style.display = "";
    if (closeBtn) closeBtn.style.display = "none";

}

function setupChatMenuOutsideClick() {

    document.addEventListener("click", function (event) {

        if (!chatMenuOpen) return;

        const menu = supportChatElement("chatMenu");
        const moreBtn = supportChatElement("chatMoreButton");

        if (menu && (menu.contains(event.target) || (moreBtn && moreBtn.contains(event.target)))) {
            return;
        }

        closeChatMenu();

    });

}


// ======================================================
// RENDER MESSAGES
// ======================================================

function renderMessages() {

    const container = supportChatElement("messages");
    if (!container || !currentChat) return;

    container.innerHTML = "";

    (currentChat.messages || []).forEach(function (message) {
        container.appendChild(createMessageElement(message));
    });

    // Only once the messages have actually loaded (not while still loading).
    if (currentChat.messagesLoaded) {
        KTUI.syncBlockEmpty(container, "No messages yet. Send the first message below.", "fa-regular fa-comments");
    }

    if (messageSearchActive) {
        performMessageSearch();
    }

}

function createMessageElement(message) {

    if (message.type === "notice") {

        const notice = document.createElement("div");
        notice.className = "message-notice";
        notice.dataset.messageId = message.id;
        notice.textContent = message.text;

        return notice;

    }

    const wrapper = document.createElement("div");
    wrapper.className = "message " + (message.sent ? "sent" : "received");
    wrapper.dataset.messageId = message.id;

    if (message.isPinned) {
        wrapper.classList.add("message-pinned");
    }

    if (pinMessageSelectionMode) {

        wrapper.classList.add("pin-selection-mode");

        if (selectedPinMessageIds.includes(message.id)) {
            wrapper.classList.add("pin-message-selected");
        }

        wrapper.addEventListener("click", function (event) {

            if (event.target.closest(".message-actions") || event.target.closest(".message-action-menu")) {
                return;
            }

            event.stopPropagation();
            togglePinMessageSelection(message.id);

        });

    }

    const content = document.createElement("div");
    content.className = "message-content";

    if (message.replyToId) {

        const replied = currentChat.messages.find(function (m) { return m.id === message.replyToId; });

        const reply = document.createElement("div");
        reply.className = "message-reply";
        reply.dataset.replyMessageId = message.replyToId;

        const replySender = document.createElement("strong");
        replySender.className = "message-reply-sender";
        replySender.textContent = replied ? (replied.sent ? "You" : replied.senderName) : "Message";

        const replyText = document.createElement("span");
        replyText.className = "message-reply-text";
        replyText.textContent = replied ? replied.text : "Original message not available";

        reply.appendChild(replySender);
        reply.appendChild(replyText);

        reply.addEventListener("click", function (event) {
            event.stopPropagation();
            openRepliedMessage(message.replyToId);
        });

        content.appendChild(reply);

    }

    if (message.type === "voice" && message.fileUrl) {

        const audio = document.createElement("audio");
        audio.className = "message-voice-player";
        audio.controls = true;
        audio.src = message.fileUrl;

        content.appendChild(audio);

    } else if (message.type !== "text" && message.fileUrl) {

        const isImage = message.fileMime && message.fileMime.indexOf("image/") === 0;

        if (isImage) {

            const link = document.createElement("a");
            link.href = message.fileUrl;
            link.target = "_blank";
            link.rel = "noopener";
            link.className = "message-attachment-image-link";

            const img = document.createElement("img");
            img.className = "message-attachment-image";
            img.src = message.fileUrl;
            img.alt = message.fileName || "Image";

            link.appendChild(img);
            content.appendChild(link);

        } else {

            const fileCard = document.createElement("a");
            fileCard.href = message.fileUrl;
            fileCard.target = "_blank";
            fileCard.rel = "noopener";
            fileCard.className = "message-attachment-file";
            fileCard.innerHTML =
                '<i class="fa-solid fa-file"></i><span>' +
                supportEscapeHtml(message.fileName || message.text || "File") +
                "</span>";

            content.appendChild(fileCard);

        }

        const caption = document.createElement("p");
        caption.className = "message-text";
        caption.textContent = message.text || "";
        content.appendChild(caption);

    } else {

        const text = document.createElement("p");
        text.className = "message-text";
        text.textContent = message.text || "";
        content.appendChild(text);

    }

    const meta = document.createElement("div");
    meta.className = "message-meta";

    const time = document.createElement("span");
    time.textContent = message.time || "";
    meta.appendChild(time);

    if (message.edited) {
        const edited = document.createElement("span");
        edited.textContent = " edited";
        meta.appendChild(edited);
    }

    if (message.deletedBy) {
        const deleted = document.createElement("span");
        deleted.className = "message-deleted-tag";
        deleted.textContent = " deleted";
        meta.appendChild(deleted);
    } else if (message.clearedBy) {
        const cleared = document.createElement("span");
        cleared.className = "message-deleted-tag";
        cleared.textContent = " cleared";
        meta.appendChild(cleared);
    }

    if (message.isPinned) {
        const pin = document.createElement("i");
        pin.className = "fa-solid fa-thumbtack message-pin-indicator";
        meta.appendChild(pin);
    }

    if (message.sent) {
        const status = document.createElement("i");
        const userRead = !!(currentChat && currentChat.userLastReadAt) &&
            new Date(message.createdAt).getTime() <= new Date(currentChat.userLastReadAt).getTime();
        status.className = (userRead ? "fa-solid fa-check-double" : "fa-solid fa-check") + " msg-tick";
        if (!userRead) status.style.color = "#94a3b8";
        meta.appendChild(status);
    }

    content.appendChild(meta);
    wrapper.appendChild(content);

    setupMessageActionEvents(wrapper, message.id);

    return wrapper;

}

function scrollMessagesToBottom() {

    const container = supportChatElement("messages");
    if (container) container.scrollTop = container.scrollHeight;

}


// ======================================================
// COMPOSER — SEND / REPLY / EDIT
// ======================================================

function getMessageInput() {
    return supportChatElement("messageInput");
}

function getMessageText() {

    const input = getMessageInput();
    if (!input) return "";

    return String(input.value || "").trim();

}

function clearMessageInput() {

    const input = getMessageInput();
    if (!input) return;

    input.value = "";
    input.dataset.editing = "false";
    delete input.dataset.editingMessageId;
    input.focus();

}

function messageInputHasText() {
    return getMessageText().length > 0;
}

function setupComposerEvents() {

    const input = getMessageInput();
    if (!input) return;

    input.addEventListener("keydown", handleMessageInputKeydown);

    input.addEventListener("input", function () {

        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 120) + "px";

        if (input.value.trim().length > 0) sendTypingSignal();

    });

}

function handleMessageInputKeydown(event) {

    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }

}

function isEditingMessage() {
    return !!editingMessage;
}

function sendMessage() {

    if (isEditingMessage()) {
        saveEditedMessage();
        return;
    }

    if (!currentChat) return;

    const text = getMessageText();
    if (!text) return;

    const replyToId = replyingToMessage ? replyingToMessage.id : null;

    clearMessageInput();
    cancelReply();

    sb.from("support_messages")
        .insert({
            conversation_id: currentChat.id,
            sender_type: "admin",
            sender_id: supportAdminId,
            content: text,
            reply_to_id: replyToId
        })
        .select("*")
        .single()
        .then(function (res) {

            if (res.error) {
                KTUI.notify("Failed to send message: " + res.error.message);
                return;
            }

            if (!currentChat.messages.some(function (m) { return m.id === res.data.id; })) {
                currentChat.messages.push(mapSupportMessageRow(res.data));
                renderMessages();
                scrollMessagesToBottom();
            }

            loadSupportConversations();

        });

}


// ======================================================
// REPLY
// ======================================================

function replyToMessage(messageId) {

    if (!currentChat) return;

    const message = currentChat.messages.find(function (item) { return item.id === messageId; });
    if (!message) return;
    if (message.deletedBy || message.clearedBy) return;

    if (editingMessage) cancelEditMessage();

    replyingToMessage = message;
    showReplyPreview(message);

    const input = getMessageInput();
    if (input) input.focus();

}

function showReplyPreview(message) {

    const preview = supportChatElement("replyPreview");
    if (!preview) return;

    const textElement = supportChatElement("replyMessage");
    const senderElement = supportChatElement("replyUser");

    if (senderElement) senderElement.textContent = message.sent ? "You" : (message.senderName || "User");
    if (textElement) textElement.textContent = message.text || "";

    preview.dataset.messageId = message.id;
    preview.classList.remove("hidden");

}

function closeReplyPreview() {

    const preview = supportChatElement("replyPreview");
    if (!preview) return;

    preview.classList.add("hidden");
    delete preview.dataset.messageId;

}

function cancelReply() {

    replyingToMessage = null;
    closeReplyPreview();

}

function setupReplyPreviewEvents() {
    // Reply-preview cancel button already wired via onclick="cancelReply()" in HTML.
}

function findMessageElement(messageId) {
    return document.querySelector('.message[data-message-id="' + messageId + '"]');
}

let messageHighlightTimeout = null;
let highlightedMessageElement = null;

function scrollToMessage(messageId) {

    const element = findMessageElement(messageId);
    if (!element) return;

    element.scrollIntoView({ behavior: "smooth", block: "center" });

    if (highlightedMessageElement) {
        highlightedMessageElement.classList.remove("message-highlight");
    }

    element.classList.add("message-highlight");
    highlightedMessageElement = element;

    if (messageHighlightTimeout) clearTimeout(messageHighlightTimeout);

    messageHighlightTimeout = setTimeout(function () {
        element.classList.remove("message-highlight");
    }, 1600);

}

function openRepliedMessage(messageId) {
    scrollToMessage(messageId);
}


// ======================================================
// EDIT (admin's own sent messages only — enforced for
// real by a DB trigger too, not just this UI check)
// ======================================================

function startEditMessage(messageId) {

    if (!currentChat) return;

    const message = currentChat.messages.find(function (item) { return item.id === messageId; });
    if (!message) return;

    if (!message.sent) return;
    if (message.type === "voice") return;
    if (message.deletedBy || message.clearedBy) return;

    if (replyingToMessage) cancelReply();

    editingMessage = message;

    const input = supportChatElement("messageInput");
    if (!input) return;

    input.value = message.text || "";
    input.dataset.editing = "true";
    input.dataset.editingMessageId = message.id;

    showEditPreview(message);

    setTimeout(function () {
        input.focus();
        const length = input.value.length;
        if (typeof input.setSelectionRange === "function") {
            input.setSelectionRange(length, length);
        }
    }, 50);

    closeMessageActionMenu();
    closeChatMenu();

}

function showEditPreview(message) {

    const preview = supportChatElement("editPreview");
    if (!preview) return;

    const textElement = supportChatElement("editMessage");
    if (textElement) textElement.textContent = message.text || "";

    preview.classList.remove("hidden");

}

function cancelEditMessage() {

    editingMessage = null;

    const input = supportChatElement("messageInput");

    if (input) {
        input.dataset.editing = "false";
        delete input.dataset.editingMessageId;
        input.value = "";
    }

    const editPreview = supportChatElement("editPreview");

    if (editPreview) {
        editPreview.classList.add("hidden");
    }

}

function saveEditedMessage() {

    if (!editingMessage) return false;

    const input = supportChatElement("messageInput");
    if (!input) return false;

    const newText = input.value.trim();
    if (!newText) return false;

    if (newText === editingMessage.text) {
        cancelEditMessage();
        return false;
    }

    const messageId = editingMessage.id;

    sb.from("support_messages")
        .update({ content: newText })
        .eq("id", messageId)
        .select("*")
        .single()
        .then(function (res) {

            if (res.error) {
                KTUI.notify("Failed to save edit: " + res.error.message);
                return;
            }

            const target = currentChat && currentChat.messages.find(function (m) { return m.id === messageId; });

            if (target) {
                target.text = res.data.content;
                target.edited = !!res.data.edited_at;
                renderMessages();
            }

            KTUI.success("Message updated.");

            loadSupportConversations();

        });

    editingMessage = null;
    input.value = "";
    input.dataset.editing = "false";
    delete input.dataset.editingMessageId;

    const preview = supportChatElement("editPreview");
    if (preview) preview.classList.add("hidden");

    return true;

}


// ======================================================
// MESSAGE ACTION MENU (long-press / right-click on a message)
// ======================================================

let messageLongPressTimer = null;
let activeMessageActionMenu = null;
let activeActionMessageId = null;

function setupMessageActionEvents(wrapper, messageId) {

    let startX = 0;
    let startY = 0;

    function startTimer(x, y) {
        startX = x;
        startY = y;
        clearTimeout(messageLongPressTimer);
        messageLongPressTimer = setTimeout(function () {
            showMessageActionMenu(wrapper, messageId);
        }, CHAT_LONG_PRESS_DURATION);
    }

    function cancelTimer() {
        clearTimeout(messageLongPressTimer);
    }

    wrapper.addEventListener("mousedown", function (e) { startTimer(e.clientX, e.clientY); });
    wrapper.addEventListener("mouseup", cancelTimer);
    wrapper.addEventListener("mouseleave", cancelTimer);

    wrapper.addEventListener("touchstart", function (e) {
        const t = e.touches[0];
        startTimer(t.clientX, t.clientY);
    }, { passive: true });

    wrapper.addEventListener("touchmove", function (e) {
        const t = e.touches[0];
        if (Math.abs(t.clientX - startX) > CHAT_LONG_PRESS_MOVE_TOLERANCE ||
            Math.abs(t.clientY - startY) > CHAT_LONG_PRESS_MOVE_TOLERANCE) {
            cancelTimer();
        }
    }, { passive: true });

    wrapper.addEventListener("touchend", cancelTimer);
    wrapper.addEventListener("touchcancel", cancelTimer);

    wrapper.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        showMessageActionMenu(wrapper, messageId);
    });

}

function getMessageElement(target) {
    return target.closest(".message");
}

function getMessageId(messageElement) {
    return messageElement ? messageElement.dataset.messageId : null;
}

function closeMessageActionMenu() {

    if (activeMessageActionMenu) {
        activeMessageActionMenu.remove();
        activeMessageActionMenu = null;
    }

    activeActionMessageId = null;

    document.removeEventListener("click", closeMessageActionMenuOnOutsideClick);

}

function showMessageActionMenu(messageElement, messageId) {

    closeMessageActionMenu();

    if (!messageElement || !messageId) return;
    if (pinMessageSelectionMode) return;

    activeActionMessageId = messageId;

    const targetMessage = currentChat
        ? currentChat.messages.find(function (item) { return item.id === messageId; })
        : null;

    if (!targetMessage) return;

    // A message the other side deleted/cleared no longer exists on their
    // end, so it can still be read here but not edited or replied to.
    const isLocked = !!(targetMessage.deletedBy || targetMessage.clearedBy);

    const canEdit = targetMessage.sent && targetMessage.type !== "voice" && !isLocked;

    const editButtonMarkup = canEdit
        ? '<button type="button" data-action="edit"><i class="fa-solid fa-pen"></i><span>Edit</span></button>'
        : "";

    const replyButtonMarkup = !isLocked
        ? '<button type="button" data-action="reply"><i class="fa-solid fa-reply"></i><span>Reply</span></button>'
        : "";

    const pinLabel = targetMessage.isPinned ? "Unpin" : "Pin";
    const pinIcon = targetMessage.isPinned ? "fa-solid fa-thumbtack-slash" : "fa-solid fa-thumbtack";

    const menu = document.createElement("div");
    menu.className = "message-action-menu";

    menu.innerHTML =
        replyButtonMarkup +
        editButtonMarkup +
        '<button type="button" data-action="pin"><i class="' + pinIcon + '"></i><span>' + pinLabel + '</span></button>' +
        '<button type="button" data-action="copy"><i class="fa-solid fa-copy"></i><span>Copy</span></button>' +
        '<button type="button" data-action="delete"><i class="fa-solid fa-trash"></i><span>Delete</span></button>' +
        '<button type="button" data-action="close"><i class="fa-solid fa-xmark"></i><span>Close</span></button>';

    document.body.appendChild(menu);
    activeMessageActionMenu = menu;

    const rect = messageElement.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    let top = rect.top - menuRect.height - 8;
    let left = rect.left;

    if (top < 10) top = rect.bottom + 8;
    if (left + menuRect.width > window.innerWidth - 10) left = window.innerWidth - menuRect.width - 10;
    if (left < 10) left = 10;
    if (top + menuRect.height > window.innerHeight - 10) top = window.innerHeight - menuRect.height - 10;
    if (top < 10) top = 10;

    menu.style.position = "fixed";
    menu.style.top = top + "px";
    menu.style.left = left + "px";
    menu.style.zIndex = "999999";

    menu.addEventListener("click", function (event) {

        const button = event.target.closest("button");
        if (!button) return;

        const action = button.dataset.action;

        if (action === "close") {
            closeMessageActionMenu();
            return;
        }

        closeMessageActionMenu();

        if (action === "reply") { replyToMessage(messageId); return; }
        if (action === "edit") { startEditMessage(messageId); return; }
        if (action === "pin") { toggleSingleMessagePin(messageId, !targetMessage.isPinned); return; }
        if (action === "copy") { copyMessage(messageId); return; }
        if (action === "delete") { deleteMessage(messageId); return; }

    });

    setTimeout(function () {
        document.addEventListener("click", closeMessageActionMenuOnOutsideClick);
    }, 0);

}

function closeMessageActionMenuOnOutsideClick(event) {

    if (activeMessageActionMenu && !activeMessageActionMenu.contains(event.target)) {
        closeMessageActionMenu();
        document.removeEventListener("click", closeMessageActionMenuOnOutsideClick);
    }

}

function copyMessage(messageId) {

    const message = currentChat && currentChat.messages.find(function (m) { return m.id === messageId; });
    if (!message) return;

    const text = message.text || "";

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(function () { KTUI.success("Message copied."); })
            .catch(function () { fallbackCopyMessage(text); });
    } else {
        fallbackCopyMessage(text);
    }

}

function fallbackCopyMessage(text) {

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    let copied = false;
    try { copied = document.execCommand("copy"); } catch (e) { /* no-op */ }

    document.body.removeChild(textarea);

    if (copied) KTUI.success("Message copied.");
    else KTUI.warning("Could not copy the message. Press and hold the text to copy it.");

}


// ======================================================
// DELETE MESSAGE (shared confirm modal)
// ======================================================

function deleteMessage(messageId) {

    if (!currentChat) return;

    deleteActionType = "message";
    deleteActionId = messageId;

    const titleElement = supportChatElement("deleteConfirmTitle");
    const textElement = supportChatElement("deleteConfirmText");
    const confirmBtn = supportChatElement("confirmDeleteBtn");
    const modal = supportChatElement("deleteConfirmModal");

    if (titleElement) titleElement.textContent = "Delete Message?";
    if (textElement) textElement.textContent = "This will permanently delete this message. This action cannot be undone.";
    if (confirmBtn) confirmBtn.textContent = "Delete";
    if (modal) modal.classList.remove("hidden");

}

function closeDeleteConfirmation() {

    const modal = supportChatElement("deleteConfirmModal");
    if (modal) modal.classList.add("hidden");

    deleteActionType = null;
    deleteActionId = null;
    deleteActionIds = [];

}

function confirmDeleteAction() {

    // The modal stays open with a loading button until the request finishes.
    const confirmBtn = supportChatElement("confirmDeleteBtn");
    const cancelBtn = confirmBtn && confirmBtn.parentElement
        ? Array.prototype.find.call(confirmBtn.parentElement.querySelectorAll("button"), function (b) { return b !== confirmBtn; })
        : null;

    const done = KTUI.busy(
        confirmBtn,
        deleteActionType === "clearMessages" ? "Clearing..." : "Deleting...",
        [cancelBtn]
    );

    let work = null;

    if (deleteActionType === "message") {

        const messageId = deleteActionId;

        work = sb.rpc("support_delete_message", { p_message_id: messageId, p_side: "admin" }).then(function (res) {

            if (res.error) {
                KTUI.notify("Failed to delete message: " + res.error.message);
                return;
            }

            if (currentChat) {

                // Gone from admin's own view for good (the user still
                // sees it, marked deleted and locked from edit/reply).
                const index = currentChat.messages.findIndex(function (m) { return m.id === messageId; });
                if (index !== -1) currentChat.messages.splice(index, 1);

                if (replyingToMessage && replyingToMessage.id === messageId) cancelReply();
                if (editingMessage && editingMessage.id === messageId) cancelEditMessage();

                renderMessages();
                updatePinnedMessageBar();

            }

            KTUI.success("Message deleted.");

            loadSupportConversations();

        });

    } else if (deleteActionType === "chat") {

        const chatId = deleteActionId;

        work = sb.rpc("support_delete_chat", { p_conversation_id: chatId, p_side: "admin" }).then(function (res) {

            if (res.error) {
                KTUI.notify("Failed to delete conversation: " + res.error.message);
                return;
            }

            const index = individualChats.findIndex(function (c) { return c.id === chatId; });
            if (index !== -1) individualChats.splice(index, 1);

            if (currentChat && currentChat.id === chatId) closeChat();

            renderIndividualChats();
            updateUnreadCounts();

            KTUI.success("Conversation deleted.");

        });

    } else if (deleteActionType === "bulkChats") {

        const ids = deleteActionIds;

        work = Promise.all(ids.map(function (id) {
            return sb.rpc("support_delete_chat", { p_conversation_id: id, p_side: "admin" });
        })).then(function (results) {

            const failed = results.find(function (res) { return res.error; });

            if (failed) {
                KTUI.notify("Failed to delete conversations: " + failed.error.message);
            } else {
                KTUI.success(ids.length === 1 ? "Conversation deleted." : ids.length + " conversations deleted.");
            }

            individualChats = individualChats.filter(function (c) { return !ids.includes(c.id); });

            if (currentChat && ids.includes(currentChat.id)) closeChat();

            renderIndividualChats();
            updateUnreadCounts();
            exitChatSelectionMode();

        });

    } else if (deleteActionType === "clearMessages") {

        const chatId = deleteActionId;

        work = sb.rpc("support_clear_messages", { p_conversation_id: chatId, p_side: "admin" }).then(function (res) {

            if (res.error) {
                KTUI.notify("Failed to clear messages: " + res.error.message);
                return;
            }

            const chat = findIndividualChat(chatId);

            if (chat) {
                // Everything (notices included) is gone from admin's own
                // view for good.
                chat.messages = [];
            }

            if (currentChat && currentChat.id === chatId) {
                renderMessages();
                updatePinnedMessageBar();
            }

            KTUI.success("Messages cleared.");

            loadSupportConversations();

        });

    }

    const finish = function () {
        done();
        closeDeleteConfirmation();
    };

    if (!work) {
        finish();
        return;
    }

    work.then(finish, finish);

}



// ======================================================
// MARK UNREAD / CLEAR MESSAGES / DELETE CHAT
// ======================================================

function markChatUnread() {

    if (!currentChat) return;

    sb.from("support_conversations")
        .update({ admin_last_read_at: null })
        .eq("id", currentChat.id)
        .then(function (res) {

            if (res.error) {
                KTUI.notify("Failed to mark as unread: " + res.error.message);
                return;
            }

            KTUI.success("Marked as unread.");

            loadSupportConversations();

        });

    closeChatMenu();

}

function clearChatMessages() {

    if (!currentChat) return;

    closeChatMenu();

    deleteActionType = "clearMessages";
    deleteActionId = currentChat.id;

    const titleElement = supportChatElement("deleteConfirmTitle");
    const textElement = supportChatElement("deleteConfirmText");
    const confirmBtn = supportChatElement("confirmDeleteBtn");
    const modal = supportChatElement("deleteConfirmModal");

    if (titleElement) titleElement.textContent = "Clear Messages?";
    if (textElement) textElement.textContent = "All messages in this chat will be permanently deleted.";
    if (confirmBtn) confirmBtn.textContent = "Clear";
    if (modal) modal.classList.remove("hidden");

}

function deleteCurrentChat() {

    if (!currentChat) return;

    closeChatMenu();

    deleteActionType = "chat";
    deleteActionId = currentChat.id;

    const titleElement = supportChatElement("deleteConfirmTitle");
    const textElement = supportChatElement("deleteConfirmText");
    const confirmBtn = supportChatElement("confirmDeleteBtn");
    const modal = supportChatElement("deleteConfirmModal");

    if (titleElement) titleElement.textContent = "Delete Conversation?";
    if (textElement) textElement.textContent = "This will permanently delete your conversation with " + currentChat.name + ". This action cannot be undone.";
    if (confirmBtn) confirmBtn.textContent = "Delete";
    if (modal) modal.classList.remove("hidden");

}


// ======================================================
// PIN MESSAGES
// ======================================================

function getPinnedMessages() {

    if (!currentChat) return [];

    return currentChat.messages.filter(function (m) { return m.isPinned; });

}

function openPinMessages() {

    closeChatMenu();

    const modal = supportChatElement("pinMessagesModal");
    if (modal) modal.classList.remove("hidden");

}

function closePinMessages() {

    const modal = supportChatElement("pinMessagesModal");
    if (modal) modal.classList.add("hidden");

}

function openWritePinMessage() {

    closePinMessages();

    const modal = supportChatElement("writePinMessageModal");
    const input = supportChatElement("pinMessageInput");

    if (input) input.value = "";

    updatePinMessageCharacterCount();

    if (modal) modal.classList.remove("hidden");

}

function closeWritePinMessage() {

    const modal = supportChatElement("writePinMessageModal");
    if (modal) modal.classList.add("hidden");

}

function updatePinMessageCharacterCount() {

    const input = supportChatElement("pinMessageInput");
    const counter = supportChatElement("pinMessageCharacterCount");

    if (input && counter) counter.textContent = input.value.length;

}

function setupPinMessageInput() {

    const input = supportChatElement("pinMessageInput");

    if (input) {
        input.addEventListener("input", updatePinMessageCharacterCount);
    }

}

function createPinnedMessage() {

    if (!currentChat) return;

    const input = supportChatElement("pinMessageInput");
    const text = input ? input.value.trim() : "";

    if (!text) return;

    const done = KTUI.busy(document.querySelector('[onclick*="createPinnedMessage"]'), "Pinning...");

    sb.from("support_messages")
        .insert({
            conversation_id: currentChat.id,
            sender_type: "admin",
            sender_id: supportAdminId,
            content: text,
            is_pinned: true,
            pinned_at: new Date().toISOString(),
            pinned_by: supportAdminId
        })
        .select("*")
        .single()
        .then(function (res) {

            done();

            if (res.error) {
                KTUI.notify("Failed to pin message: " + res.error.message);
                return;
            }

            currentChat.messages.push(mapSupportMessageRow(res.data));

            renderMessages();
            updatePinnedMessageBar();
            scrollMessagesToBottom();

            closeWritePinMessage();
            KTUI.success("Message pinned.");
            loadSupportConversations();

        });

}

function startSelectPinnedMessages() {

    closePinMessages();

    pinMessageSelectionMode = true;
    selectedPinMessageIds = [];

    renderMessages();
    updatePinMessageSelectionBar();

}

function cancelPinMessageSelection() {

    pinMessageSelectionMode = false;
    selectedPinMessageIds = [];

    renderMessages();
    updatePinMessageSelectionBar();

}

function setupPinSelectionOutsideClick() {
    // Selection is exited explicitly (Cancel / Pin buttons) — no outside-click needed.
}

function togglePinMessageSelection(messageId) {

    const index = selectedPinMessageIds.indexOf(messageId);

    if (index === -1) {
        selectedPinMessageIds.push(messageId);
    } else {
        selectedPinMessageIds.splice(index, 1);
    }

    renderMessages();
    updatePinMessageSelectionBar();

}

function updatePinMessageSelectionBar() {

    const bar = supportChatElement("pinMessageSelectionBar");
    const countLabel = supportChatElement("selectedPinMessageCount");

    if (bar) bar.classList.toggle("hidden", !pinMessageSelectionMode);
    if (countLabel) countLabel.textContent = selectedPinMessageIds.length;

}

function pinSelectedMessages() {

    if (selectedPinMessageIds.length === 0) {
        cancelPinMessageSelection();
        return;
    }

    const ids = selectedPinMessageIds;

    const done = KTUI.busy(document.querySelector('[onclick*="pinSelectedMessages"]'), "Pinning...");

    sb.from("support_messages")
        .update({ is_pinned: true, pinned_at: new Date().toISOString(), pinned_by: supportAdminId })
        .in("id", ids)
        .then(function (res) {

            done();

            if (res.error) {
                KTUI.notify("Failed to pin messages: " + res.error.message);
                return;
            }

            currentChat.messages.forEach(function (m) {
                if (ids.includes(m.id)) m.isPinned = true;
            });

            cancelPinMessageSelection();
            updatePinnedMessageBar();

            KTUI.success(ids.length === 1 ? "Message pinned." : ids.length + " messages pinned.");

        });

}

function toggleSingleMessagePin(messageId, pin) {

    sb.from("support_messages")
        .update(pin
            ? { is_pinned: true, pinned_at: new Date().toISOString(), pinned_by: supportAdminId }
            : { is_pinned: false, pinned_at: null, pinned_by: null })
        .eq("id", messageId)
        .then(function (res) {

            if (res.error) {
                KTUI.notify("Failed to update pin: " + res.error.message);
                return;
            }

            const target = currentChat && currentChat.messages.find(function (m) { return m.id === messageId; });
            if (target) target.isPinned = pin;

            renderMessages();
            updatePinnedMessageBar();

            KTUI.success(pin ? "Message pinned." : "Message unpinned.");

        });

}

function unpinCurrentPinnedMessage() {

    const pinned = getPinnedMessages();
    const message = pinned[currentPinnedMessageIndex];

    if (!message) return;

    toggleSingleMessagePin(message.id, false);

}

function updatePinnedMessageBar() {

    const bar = supportChatElement("pinnedMessageBar");
    const textEl = supportChatElement("pinnedMessageText");
    const counterEl = supportChatElement("pinnedMessageCounter");
    const pinText = supportChatElement("messagePinText");

    const pinned = getPinnedMessages();

    if (pinText) pinText.textContent = pinned.length > 0 ? "Pinned Messages (" + pinned.length + ")" : "Pin Messages";

    if (!bar) return;

    if (pinned.length === 0) {
        bar.classList.add("hidden");
        currentPinnedMessageIndex = 0;
        return;
    }

    bar.classList.remove("hidden");

    if (currentPinnedMessageIndex >= pinned.length) {
        currentPinnedMessageIndex = pinned.length - 1;
    }

    const current = pinned[currentPinnedMessageIndex];

    if (textEl) textEl.textContent = current.text || "";
    if (counterEl) counterEl.textContent = (currentPinnedMessageIndex + 1) + " of " + pinned.length;

}

function nextPinnedMessage() {

    const pinned = getPinnedMessages();
    if (pinned.length === 0) return;

    currentPinnedMessageIndex = (currentPinnedMessageIndex + 1) % pinned.length;
    updatePinnedMessageBar();
    scrollToCurrentPinnedMessage();

}

function previousPinnedMessage() {

    const pinned = getPinnedMessages();
    if (pinned.length === 0) return;

    currentPinnedMessageIndex = (currentPinnedMessageIndex - 1 + pinned.length) % pinned.length;
    updatePinnedMessageBar();
    scrollToCurrentPinnedMessage();

}

function scrollToCurrentPinnedMessage() {

    const pinned = getPinnedMessages();
    const message = pinned[currentPinnedMessageIndex];

    if (message) scrollToMessage(message.id);

}


// ======================================================
// MESSAGE SEARCH (within the open chat)
// ======================================================

function searchMessages() {

    closeChatMenu();

    messageSearchActive = true;
    messageSearchQuery = "";
    messageSearchResults = [];
    currentMessageSearchIndex = -1;

    const bar = supportChatElement("messageSearchBar");
    const input = supportChatElement("messageSearchInput");

    if (bar) bar.classList.remove("hidden");
    if (input) { input.value = ""; input.focus(); }

}

function closeMessageSearch() {

    messageSearchActive = false;
    messageSearchQuery = "";
    messageSearchResults = [];
    currentMessageSearchIndex = -1;

    const bar = supportChatElement("messageSearchBar");
    if (bar) bar.classList.add("hidden");

    renderMessages();

}

function setupMessageSearchEvents() {

    const input = supportChatElement("messageSearchInput");

    if (input) {
        let searchNoticeTimer = null;

        input.addEventListener("input", function () {
            messageSearchQuery = input.value;
            performMessageSearch();

            clearTimeout(searchNoticeTimer);
            searchNoticeTimer = setTimeout(function () {
                if (messageSearchQuery.trim() && messageSearchResults.length === 0) {
                    KTUI.info("No messages match your search.");
                }
            }, 700);
        });
    }

}

function performMessageSearch() {

    if (!currentChat) return;

    const query = messageSearchQuery.trim().toLowerCase();

    document.querySelectorAll("#messages .message-text").forEach(function (el) {
        el.innerHTML = supportEscapeHtml(el.textContent);
    });

    if (!query) {
        messageSearchResults = [];
        currentMessageSearchIndex = -1;
        return;
    }

    messageSearchResults = currentChat.messages
        .filter(function (m) { return (m.text || "").toLowerCase().includes(query); })
        .map(function (m) { return m.id; });

    currentMessageSearchIndex = messageSearchResults.length > 0 ? 0 : -1;

    messageSearchResults.forEach(function (id) {
        const el = findMessageElement(id);
        const textEl = el ? el.querySelector(".message-text") : null;
        if (textEl) highlightMessageText(textEl, query);
    });

    scrollToMessageSearchResult();

}

function highlightMessageText(textEl, query) {

    const original = textEl.textContent;
    const lower = original.toLowerCase();
    const index = lower.indexOf(query);

    if (index === -1) return;

    textEl.innerHTML =
        supportEscapeHtml(original.slice(0, index)) +
        '<mark class="message-search-highlight">' + supportEscapeHtml(original.slice(index, index + query.length)) + '</mark>' +
        supportEscapeHtml(original.slice(index + query.length));

}

function scrollToMessageSearchResult() {

    if (currentMessageSearchIndex === -1) return;

    const id = messageSearchResults[currentMessageSearchIndex];
    if (id) scrollToMessage(id);

}

function nextMessageSearchResult() {

    if (messageSearchResults.length === 0) return;

    currentMessageSearchIndex = (currentMessageSearchIndex + 1) % messageSearchResults.length;
    scrollToMessageSearchResult();

}

function previousMessageSearchResult() {

    if (messageSearchResults.length === 0) return;

    currentMessageSearchIndex = (currentMessageSearchIndex - 1 + messageSearchResults.length) % messageSearchResults.length;
    scrollToMessageSearchResult();

}


// ======================================================
// ATTACHMENTS (real upload to the "support-chat" storage bucket)
// ======================================================

function toggleAttachmentMenu() {

    attachmentMenuOpen = !attachmentMenuOpen;

    const menu = supportChatElement("attachmentMenu");
    if (menu) menu.classList.toggle("hidden", !attachmentMenuOpen);

}

function closeAttachmentMenu() {

    attachmentMenuOpen = false;

    const menu = supportChatElement("attachmentMenu");
    if (menu) menu.classList.add("hidden");

}

function attachPhoto() {

    closeAttachmentMenu();

    const input = supportChatElement("photoInput");
    if (input) input.click();

}

function attachDocument() {

    closeAttachmentMenu();

    const input = supportChatElement("documentInput");
    if (input) input.click();

}

function attachCamera() {

    closeAttachmentMenu();

    const input = supportChatElement("cameraInput");
    if (input) input.click();

}

function setupAttachmentEvents() {

    const photoInput = supportChatElement("photoInput");
    const documentInput = supportChatElement("documentInput");
    const cameraInput = supportChatElement("cameraInput");

    if (photoInput) photoInput.addEventListener("change", function (e) { handleAttachmentFileChange(e, "photo"); });
    if (documentInput) documentInput.addEventListener("change", function (e) { handleAttachmentFileChange(e, "document"); });
    if (cameraInput) cameraInput.addEventListener("change", function (e) { handleAttachmentFileChange(e, "camera"); });

    document.addEventListener("click", function (event) {

        if (!attachmentMenuOpen) return;

        const menu = supportChatElement("attachmentMenu");
        const btn = document.querySelector('[onclick="toggleAttachmentMenu()"]');

        if (menu && (menu.contains(event.target) || (btn && btn.contains(event.target)))) return;

        closeAttachmentMenu();

    });

}

function handleAttachmentFileChange(event, kind) {

    const file = event.target.files && event.target.files[0];
    event.target.value = "";

    if (!file) return;

    if (!currentChat) {
        KTUI.notify("Open a conversation first.");
        return;
    }

    uploadAndSendAttachment(file, kind);

}

function uploadAndSendAttachment(file, kind) {

    const path = currentChat.id + "/" + Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");

    sb.storage.from("support-chat").upload(path, file).then(function (uploadRes) {

        if (uploadRes.error) {
            KTUI.notify("Failed to upload file: " + uploadRes.error.message);
            return;
        }

        const publicUrlRes = sb.storage.from("support-chat").getPublicUrl(path);
        const url = publicUrlRes.data.publicUrl;

        const label =
            (kind === "camera" ? "📷 " : kind === "document" ? "📎 " : "🖼️ ") + file.name;

        sb.from("support_messages")
            .insert({
                conversation_id: currentChat.id,
                sender_type: "admin",
                sender_id: supportAdminId,
                content: label,
                message_type: kind === "document" ? "document" : "photo",
                attachment_url: url,
                attachment_name: file.name,
                attachment_mime: file.type
            })
            .select("*")
            .single()
            .then(function (res) {

                if (res.error) {
                    KTUI.notify("Failed to send attachment: " + res.error.message);
                    return;
                }

                currentChat.messages.push(mapSupportMessageRow(res.data));
                renderMessages();
                scrollMessagesToBottom();
                loadSupportConversations();

            });

    });

}


// ======================================================
// VOICE MESSAGE (real recording, real upload)
// ======================================================

function startVoiceMessage() {

    if (isRecordingVoice) {
        stopVoiceRecording(true);
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        KTUI.notify("Voice recording is not supported in this browser.");
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {

        voiceStream = stream;
        voiceRecordedChunks = [];

        voiceMediaRecorder = new MediaRecorder(stream);

        voiceMediaRecorder.addEventListener("dataavailable", function (e) {
            if (e.data && e.data.size > 0) voiceRecordedChunks.push(e.data);
        });

        voiceMediaRecorder.addEventListener("stop", function () {

            const blob = new Blob(voiceRecordedChunks, { type: "audio/webm" });

            voiceStream.getTracks().forEach(function (track) { track.stop(); });
            voiceStream = null;

            if (blob.size > 0 && currentChat) {
                uploadAndSendVoiceMessage(blob);
            }

        });

        voiceMediaRecorder.start();
        isRecordingVoice = true;

        const btn = supportChatElement("voiceMessageBtn");
        if (btn) btn.classList.add("recording");

    }).catch(function () {
        KTUI.notify("Microphone access was denied.");
    });

}

function stopVoiceRecording() {

    if (voiceMediaRecorder && isRecordingVoice) {
        voiceMediaRecorder.stop();
    }

    isRecordingVoice = false;

    const btn = supportChatElement("voiceMessageBtn");
    if (btn) btn.classList.remove("recording");

}

function uploadAndSendVoiceMessage(blob) {

    const path = currentChat.id + "/" + Date.now() + "-voice.webm";

    sb.storage.from("support-chat").upload(path, blob, { contentType: "audio/webm" }).then(function (uploadRes) {

        if (uploadRes.error) {
            KTUI.notify("Failed to upload voice message: " + uploadRes.error.message);
            return;
        }

        const publicUrlRes = sb.storage.from("support-chat").getPublicUrl(path);
        const url = publicUrlRes.data.publicUrl;

        sb.from("support_messages")
            .insert({
                conversation_id: currentChat.id,
                sender_type: "admin",
                sender_id: supportAdminId,
                content: "🎤 Voice message",
                message_type: "voice",
                attachment_url: url,
                attachment_name: "voice-message.webm",
                attachment_mime: "audio/webm"
            })
            .select("*")
            .single()
            .then(function (res) {

                if (res.error) {
                    KTUI.notify("Failed to send voice message: " + res.error.message);
                    return;
                }

                currentChat.messages.push(mapSupportMessageRow(res.data));
                renderMessages();
                scrollMessagesToBottom();
                loadSupportConversations();

            });

    });

}


// ======================================================
// NEW CHAT MODAL
// ======================================================

function openNewChatModal() {

    const modal = supportChatElement("newChatModal");
    const input = supportChatElement("userSearchInput");

    if (input) input.value = "";

    sb.from("profiles")
        .select("id, username, surname, phone")
        .order("username", { ascending: true })
        .then(function (res) {

            if (res.error) {
                console.error("Failed to load users:", res.error);
                KTUI.notify("Failed to load users: " + res.error.message);
                return;
            }

            supportChatUsers = (res.data || []).map(function (row) {
                return { id: row.id, name: fullNameOf(row), phone: row.phone };
            });

            renderAvailableUsers("");

        });

    if (modal) modal.classList.remove("hidden");

}

function closeNewChatModal() {

    const modal = supportChatElement("newChatModal");
    if (modal) modal.classList.add("hidden");

}

function renderAvailableUsers(query) {

    const container = supportChatElement("availableUsers");
    if (!container) return;

    const search = (query || "").trim().toLowerCase();

    let users = supportChatUsers;

    if (search) {
        users = users.filter(function (u) {
            return u.name.toLowerCase().includes(search) || String(u.phone || "").toLowerCase().includes(search);
        });
    }

    if (users.length === 0) {
        container.innerHTML = '<p class="available-users-empty">No users found.</p>';
        return;
    }

    container.innerHTML = users.map(function (u) {

        return (
            '<div class="available-user" onclick="startNewConversation(\'' + u.id + '\')">' +
                '<div class="chat-list-avatar">' + supportEscapeHtml(getInitials(u.name)) + '</div>' +
                '<div>' +
                    '<h5>' + supportEscapeHtml(u.name) + '</h5>' +
                    '<p>' + supportEscapeHtml(u.phone || "") + '</p>' +
                '</div>' +
            '</div>'
        );

    }).join("");

}

function startNewConversation(userId) {

    // Check the DATABASE directly, not the local (already-filtered)
    // list — a conversation this admin previously deleted is hidden
    // from individualChats but still exists, and must be reused
    // (un-hidden) rather than duplicated.
    sb.from("support_conversations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .then(function (res) {

            if (res.error) {
                KTUI.notify("Failed to start conversation: " + res.error.message);
                return;
            }

            const existingRow = res.data && res.data.length > 0 ? res.data[0] : null;

            if (existingRow) {

                closeNewChatModal();

                if (existingRow.hidden_from_admin) {

                    sb.from("support_conversations")
                        .update({ hidden_from_admin: false })
                        .eq("id", existingRow.id)
                        .then(function (unhideRes) {

                            if (unhideRes.error) {
                                KTUI.notify("Failed to reopen conversation: " + unhideRes.error.message);
                                return;
                            }

                            loadSupportConversations(function () {
                                openIndividualChat(existingRow.id);
                            });

                        });

                } else {

                    loadSupportConversations(function () {
                        openIndividualChat(existingRow.id);
                    });

                }

                return;

            }

            sb.from("support_conversations")
                .insert({ user_id: userId, status: "open", assigned_admin: supportAdminId })
                .select("*")
                .single()
                .then(function (insertRes) {

                    if (insertRes.error) {
                        KTUI.notify("Failed to start conversation: " + insertRes.error.message);
                        return;
                    }

                    closeNewChatModal();

                    loadSupportConversations(function () {
                        openIndividualChat(insertRes.data.id);
                    });

                });

        });

}


// ======================================================
// USER PROFILE MODAL
// ======================================================

function openCurrentProfile() {

    if (!currentChat) return;

    const modal = supportChatElement("userProfileModal");
    if (modal) modal.dataset.profileUserId = currentChat.userId;

    populateUserProfileModal(currentChat.userId, currentChat.name);

    if (modal) modal.classList.remove("hidden");

}

function closeUserProfile() {

    const modal = supportChatElement("userProfileModal");
    if (modal) modal.classList.add("hidden");

}

function populateUserProfileModal(userId, fallbackName) {

    const nameEl = supportChatElement("profileName");
    const avatarEl = supportChatElement("profileAvatar");
    const statusEl = supportChatElement("profileAccountStatus");

    if (nameEl) nameEl.textContent = fallbackName || "User";
    if (avatarEl) avatarEl.textContent = getInitials(fallbackName);

    [
        "profileEmail", "profilePhone", "profileJoined", "profileVerification",
        "profileBalance", "profileDeposited", "profileWithdrawn", "profilePlan"
    ].forEach(function (id) {
        const el = supportChatElement(id);
        if (el) el.textContent = "—";
    });

    sb.rpc("admin_get_support_user_profile", { p_user_id: userId }).then(function (res) {

        if (res.error || !res.data || res.data.length === 0) {
            console.error("Failed to load user profile:", res.error);
            return;
        }

        const p = res.data[0];

        const fullName = (p.username + " " + (p.surname || "")).trim();

        if (nameEl) nameEl.textContent = fullName || fallbackName;
        if (avatarEl) avatarEl.textContent = getInitials(fullName || fallbackName);

        if (statusEl) {
            statusEl.textContent = p.is_blocked ? "Blocked" : "Active";
            statusEl.className = "profile-status " + (p.is_blocked ? "blocked" : "active");
        }

        setText("profileEmail", p.email || "—");
        setText("profilePhone", p.phone || "—");
        setText("profileJoined", p.created_at ? new Date(p.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—");
        setText("profileVerification", p.kyc_status ? (p.kyc_status.charAt(0).toUpperCase() + p.kyc_status.slice(1)) : "Not submitted");

        setText("profileBalance", "R" + Number(p.balance_zar || 0).toFixed(2));
        setText("profileDeposited", "R" + Number(p.total_deposited_zar || 0).toFixed(2));
        setText("profileWithdrawn", "R" + Number(p.total_withdrawn_zar || 0).toFixed(2));
        setText("profilePlan", p.active_plan_name || "None");

    });

}

function setText(id, value) {

    const el = supportChatElement(id);
    if (el) el.textContent = value;

}

function goToAdminUserRecord(page, userId) {

    if (!userId) return;

    sessionStorage.setItem("pendingProfileUserId", userId);

    closeUserProfile();

    if (typeof loadAdminPage === "function") {
        loadAdminPage(page);
    } else {
        console.warn("loadAdminPage() is not defined — make sure admin.js is loaded before support-chat.js.");
    }

}

function viewFullUserProfile() {

    const modal = supportChatElement("userProfileModal");
    const userId = modal ? modal.dataset.profileUserId : null;

    goToAdminUserRecord("users", userId);

}

function deleteChatFromProfile() {

    deleteCurrentChat();
    closeUserProfile();

}


// ======================================================
// BULK SELECTION (long-press a chat: delete or priority,
// in bulk, across multiple chats)
// ======================================================

function attachChatPressHandlers(item, chatId, onTap) {

    let pressTimer = null;
    let pressFired = false;
    let pressStartX = 0;
    let pressStartY = 0;

    function clearPressTimer() {
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    }

    function startPress(clientX, clientY) {

        clearPressTimer();
        pressFired = false;
        pressStartX = clientX;
        pressStartY = clientY;

        pressTimer = setTimeout(function () {
            pressFired = true;
            pressTimer = null;
            handleChatLongPress(chatId);
        }, CHAT_LONG_PRESS_DURATION);

    }

    function endPress() {
        clearPressTimer();
    }

    item.addEventListener("mousedown", function (e) { startPress(e.clientX, e.clientY); });
    item.addEventListener("mouseup", endPress);
    item.addEventListener("mouseleave", endPress);

    item.addEventListener("touchstart", function (e) {
        const t = e.touches[0];
        startPress(t.clientX, t.clientY);
    }, { passive: true });

    item.addEventListener("touchend", endPress);
    item.addEventListener("touchcancel", endPress);

    item.addEventListener("touchmove", function (e) {
        const t = e.touches[0];
        if (Math.abs(t.clientX - pressStartX) > CHAT_LONG_PRESS_MOVE_TOLERANCE ||
            Math.abs(t.clientY - pressStartY) > CHAT_LONG_PRESS_MOVE_TOLERANCE) {
            endPress();
        }
    }, { passive: true });

    item.addEventListener("click", function (event) {

        event.preventDefault();

        if (pressFired) { pressFired = false; return; }

        if (chatSelectionMode) {
            toggleChatSelection(chatId);
            return;
        }

        onTap();

    });

}

function handleChatLongPress(chatId) {

    chatSelectionMode = true;

    if (!selectedChatIds.includes(chatId)) {
        selectedChatIds.push(chatId);
    }

    refreshChatSelectionUI();

    if (pendingBulkAction === null) {
        openChatActionsModal(chatId);
    }

}

function toggleChatSelection(chatId) {

    const index = selectedChatIds.indexOf(chatId);

    if (index === -1) {
        selectedChatIds.push(chatId);
    } else {
        selectedChatIds.splice(index, 1);
    }

    if (selectedChatIds.length === 0) {
        exitChatSelectionMode();
        return;
    }

    refreshChatSelectionUI();

}

function refreshChatSelectionUI() {

    const bar = supportChatElement("chatSelectionBar");
    const countLabel = supportChatElement("chatSelectionCount");

    if (bar) bar.classList.toggle("hidden", !(chatSelectionMode && selectedChatIds.length > 0));
    if (countLabel) countLabel.textContent = selectedChatIds.length + " selected";

    const priorityBtn = supportChatElement("chatSelectionPriorityBtn");
    const deleteBtn = supportChatElement("chatSelectionDeleteBtn");

    if (priorityBtn) priorityBtn.classList.toggle("hidden", pendingBulkAction === "delete");
    if (deleteBtn) deleteBtn.classList.toggle("hidden", pendingBulkAction === "priority");

    renderIndividualChats();

}

function exitChatSelectionMode() {

    chatSelectionMode = false;
    selectedChatIds = [];
    pendingBulkAction = null;
    pendingPriorityMode = null;

    const bar = supportChatElement("chatSelectionBar");
    if (bar) bar.classList.add("hidden");

    renderIndividualChats();

}

function openChatActionsModal(chatId) {

    const modal = supportChatElement("chatActionsModal");
    const priorityBtn = supportChatElement("chatActionsPriorityBtn");

    const chat = findIndividualChat(chatId);

    if (!modal || !chat) return;

    modal.dataset.chatId = chatId;

    // Update the button depending on the current priority state
    if (priorityBtn) {

        if (chat.priority) {

            priorityBtn.innerHTML =
                '<i class="fa-solid fa-star"></i> Remove Priority';

            priorityBtn.classList.add("remove-priority-action");

        } else {

            priorityBtn.innerHTML =
                '<i class="fa-solid fa-star"></i> Add Priority';

            priorityBtn.classList.remove("remove-priority-action");

        }

    }

    modal.classList.remove("hidden");

}

function closeChatActionsModal() {

    const modal = supportChatElement("chatActionsModal");
    if (modal) modal.classList.add("hidden");

}

function chooseBulkDeleteMode() {

    pendingBulkAction = "delete";
    closeChatActionsModal();
    refreshChatSelectionUI();

}

function resetPrioritySelectionStar() {

    const priorityBtn = supportChatElement("chatSelectionPriorityBtn");

    if (!priorityBtn) return;

    const star = priorityBtn.querySelector("i.fa-star");

    if (star) {
        star.style.color = "";
    }

}

function chooseBulkPriorityMode() {

    const modal = supportChatElement("chatActionsModal");
    const anchorChatId = modal ? modal.dataset.chatId : null;
    const anchorChat = findIndividualChat(anchorChatId);

    pendingBulkAction = "priority";
    pendingPriorityMode = anchorChat && anchorChat.priority ? "remove" : "add";

    // =========================================
// TEMPORARY PRIORITY STAR COLOR
// =========================================

const priorityBtn =
    supportChatElement("chatSelectionPriorityBtn");

if (priorityBtn) {

    const star = priorityBtn.querySelector("i.fa-star");

    if (star) {

        if (pendingPriorityMode === "add") {

            star.style.color = "#FDB913";

        } else {

            star.style.color = "";

        }

    }

}
  
    closeChatActionsModal();
    refreshChatSelectionUI();

}

function confirmDeleteSelectedChats() {

    if (selectedChatIds.length === 0) return;

    deleteActionType = "bulkChats";
    deleteActionIds = [...selectedChatIds];

    const titleElement = supportChatElement("deleteConfirmTitle");
    const textElement = supportChatElement("deleteConfirmText");
    const confirmBtn = supportChatElement("confirmDeleteBtn");
    const modal = supportChatElement("deleteConfirmModal");

    if (titleElement) titleElement.textContent = "Delete " + selectedChatIds.length + " Conversation" + (selectedChatIds.length === 1 ? "" : "s") + "?";
    if (textElement) textElement.textContent = "This will permanently delete the selected conversations. This action cannot be undone.";
    if (confirmBtn) confirmBtn.textContent = "Delete";
    if (modal) modal.classList.remove("hidden");

}

function closePriorityConfirmation() {

    const modal = supportChatElement("priorityConfirmModal");
    if (modal) modal.classList.add("hidden");

   resetPrioritySelectionStar();

}

function confirmPrioritySelectedChats() {

    if (selectedChatIds.length === 0) return;

    if (pendingBulkAction !== "priority") {

        const anchorChat = findIndividualChat(selectedChatIds[selectedChatIds.length - 1]);
        pendingPriorityMode = anchorChat && anchorChat.priority ? "remove" : "add";
        pendingBulkAction = "priority";

    }

    const titleElement = supportChatElement("priorityConfirmTitle");
    const textElement = supportChatElement("priorityConfirmText");
    const modal = supportChatElement("priorityConfirmModal");

    const verb = pendingPriorityMode === "remove" ? "remove from" : "add to";

    if (titleElement) titleElement.textContent = "Update Priority?";
    if (textElement) textElement.textContent = "This will " + verb + " priority for " + selectedChatIds.length + " conversation" + (selectedChatIds.length === 1 ? "" : "s") + ".";
    if (modal) modal.classList.remove("hidden");

}

function confirmPriorityAction() {

    const ids = [...selectedChatIds];
    const makePriority = pendingPriorityMode !== "remove";

    const priorityBtn = supportChatElement("confirmPriorityBtn");
    const priorityCancel = priorityBtn && priorityBtn.parentElement
        ? Array.prototype.find.call(priorityBtn.parentElement.querySelectorAll("button"), function (b) { return b !== priorityBtn; })
        : null;
    const done = KTUI.busy(priorityBtn, "Updating...", [priorityCancel]);

    sb.from("support_conversations")
        .update({ priority: makePriority })
        .in("id", ids)
        .then(function (res) {

            done();

            if (res.error) {
                KTUI.notify("Failed to update priority: " + res.error.message);
                return;
            }

            ids.forEach(function (id) {
                const chat = findIndividualChat(id);
                if (chat) chat.priority = makePriority;
            });

            renderIndividualChats();
            exitChatSelectionMode();
            closePriorityConfirmation();

            KTUI.success(
                makePriority
                    ? (ids.length === 1 ? "Marked as priority." : ids.length + " chats marked as priority.")
                    : (ids.length === 1 ? "Priority removed." : "Priority removed from " + ids.length + " chats.")
            );

        });

}

function setupChatSelectionOutsideClick() {

    document.addEventListener("click", function (event) {

        if (!chatSelectionMode) return;

        const bar = supportChatElement("chatSelectionBar");
        const actionsModal = supportChatElement("chatActionsModal");
        const deleteModal = supportChatElement("deleteConfirmModal");
        const priorityModal = supportChatElement("priorityConfirmModal");

        const insideAny =
            (bar && bar.contains(event.target)) ||
            (actionsModal && actionsModal.contains(event.target)) ||
            (deleteModal && deleteModal.contains(event.target)) ||
            (priorityModal && priorityModal.contains(event.target)) ||
            event.target.closest(".chat-list-item");

        if (insideAny) return;

        exitChatSelectionMode();
        closeChatActionsModal();

    });

}


// ======================================================
// REALTIME
// ======================================================

function setupSupportRealtime() {

    if (supportMsgChannel) return;

    supportMsgChannel = sb.channel("support-messages-admin")
        .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, handleIncomingSupportMessageChange)
        .subscribe();

    supportConvChannel = sb.channel("support-conversations-admin")
        .on("postgres_changes", { event: "*", schema: "public", table: "support_conversations" }, function () {
            loadSupportConversations();
        })
        .subscribe();

}

function handleIncomingSupportMessageChange(payload) {

    if (payload.eventType === "DELETE") {

        const chat = individualChats.find(function (c) {
            return c.messages && c.messages.some(function (m) { return m.id === payload.old.id; });
        });

        if (chat) {
            chat.messages = chat.messages.filter(function (m) { return m.id !== payload.old.id; });
            if (currentChat && currentChat.id === chat.id) { renderMessages(); updatePinnedMessageBar(); }
        }

        return;

    }

    const row = payload.new;

    if (row.hidden_from_admin || row.deleted_by === "admin" || row.cleared_by === "admin") {

        // Hidden from admin — either a notice meant only for the user's
        // side, or a message admin themselves deleted/cleared (gone from
        // their own view for good). Make sure it isn't sitting in local
        // state (e.g. from before it was hidden).
        const chat = findIndividualChat(row.conversation_id);

        if (chat && chat.messages) {

            const index = chat.messages.findIndex(function (m) { return m.id === row.id; });

            if (index !== -1) {
                chat.messages.splice(index, 1);
                if (currentChat && currentChat.id === chat.id) { renderMessages(); updatePinnedMessageBar(); }
            }

        }

        loadSupportConversations();
        return;

    }

    const chat = findIndividualChat(row.conversation_id);

    if (!chat) { loadSupportConversations(); return; }

    // Messages not loaded yet (chat never opened this session): the thread
    // itself needs nothing, but the list / unread badge must still update.
    if (!chat.messagesLoaded) { loadSupportConversations(); return; }

    const existingIndex = chat.messages.findIndex(function (m) { return m.id === row.id; });

    if (existingIndex === -1) {
        chat.messages.push(mapSupportMessageRow(row));
    } else {
        chat.messages[existingIndex] = mapSupportMessageRow(row);
    }

    if (currentChat && currentChat.id === chat.id) {

        renderMessages();
        updatePinnedMessageBar();

        if (row.sender_type === "user") {
            scrollMessagesToBottom();

            chatUserTyping = false;
            updateChatHeaderStatus();

            // Admin is looking at this chat right now: it counts as read.
            // Mark it first (server stamps the time), then refresh the list,
            // so the unread badge never flashes for a message being viewed.
            if (payload.eventType === "INSERT" && !document.hidden) {
                markConversationRead(chat.id, function () { loadSupportConversations(); });
                return;
            }
        }

    }

    loadSupportConversations();

}
