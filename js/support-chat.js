// ======================================================
// SUPPORT CHAT SYSTEM
// PART 1 — FOUNDATION
// ======================================================


// ======================================================
// 1. GLOBAL STATE
// ======================================================

// =========================================================
// PIN MESSAGE SELECTION STATE
// =========================================================

let pinMessageSelectionMode = false;

let selectedPinMessageIds = [];

// =========================================================
// PINNED MESSAGE DISPLAY STATE
// =========================================================

let currentPinnedMessageIndex = 0;

// ======================================================
// STAGE 8 — MESSAGE SEARCH
// MESSAGE SEARCH STATE
// ======================================================

let messageSearchActive = false;

let messageSearchQuery = "";

let messageSearchResults = [];

let currentMessageSearchIndex = -1;

// ======================================================
// GROUP MEMBER SELECTION
// ======================================================

let selectedGroupMembers = [];

// ------------------------------------------------------
// Current active conversation
// ------------------------------------------------------

let currentChat = null;


// ------------------------------------------------------
// Current chat type
// ------------------------------------------------------

let currentChatType = "individual";


// ------------------------------------------------------
// Current user
// ------------------------------------------------------

let currentUser = null;


// ------------------------------------------------------
// Current group
// ------------------------------------------------------

let currentGroup = null;


// ------------------------------------------------------
// Reply state
// ------------------------------------------------------

let replyingToMessage = null;


// ------------------------------------------------------
// Edit state
// ------------------------------------------------------

let editingMessage = null;


// ------------------------------------------------------
// Chat filters
// ------------------------------------------------------

let currentChatFilter = "all";

let currentGroupFilter = "all";


// ------------------------------------------------------
// Search state
// ------------------------------------------------------

let currentChatSearch = "";

let currentGroupSearch = "";

let currentMessageSearch = "";


// ------------------------------------------------------
// Chat menu state
// ------------------------------------------------------

let chatMenuOpen = false;


// ------------------------------------------------------
// Attachment menu state
// ------------------------------------------------------

let attachmentMenuOpen = false;


// ------------------------------------------------------
// Emoji picker state
// ------------------------------------------------------




// ------------------------------------------------------
// Voice recording state
// ------------------------------------------------------

let isRecordingVoice = false;

let voiceRecorder = null;

let voiceChunks = [];


// ------------------------------------------------------
// Delete action state
// ------------------------------------------------------

let deleteActionType = null;

let deleteActionId = null;

let deleteActionIds = [];

let deleteActionChatType = null;


// ------------------------------------------------------
// Priority action state (mirrors delete action state,
// used by the priority confirmation modal)
// ------------------------------------------------------

let priorityActionIds = [];

let priorityActionValue = null;
// true = adding to priority, false = removing from priority


// ------------------------------------------------------
// Chat selection state (press-and-hold multi-select)
// ------------------------------------------------------

let chatSelectionMode = false;

let chatSelectionType = null;
// "individual" | "group" | null

let selectedChatIds = [];

let pendingBulkAction = null;
// null | "delete" | "priority" — set once the person
// picks one of the two options in the chat actions modal

let pendingPriorityMode = null;
// null | "add" | "remove" — while pendingBulkAction is
// "priority", this narrows the individual chat list down
// to only the chats eligible for that action
// Note: per-item long-press timing/state lives inside
// attachChatPressHandlers as closure-local variables —
// not here — so that one chat's press gesture can never
// interfere with another chat's click handling.


// ------------------------------------------------------
// Selected group member
// ------------------------------------------------------

let selectedGroupMember = null;

// Create / Edit / Add-members modal mode
let groupModalMode = "create";
let editingGroupId = null;


// ------------------------------------------------------
// Selected group
// ------------------------------------------------------

let selectedGroup = null;


// ------------------------------------------------------
// Group photo
// ------------------------------------------------------

let selectedGroupPhoto = null;


// ------------------------------------------------------
// Support chat initialized
// ------------------------------------------------------

let supportChatInitialized = false;


// ======================================================
// 2. SAMPLE USERS
// ======================================================

const supportChatUsers = [

    {
        id: "USR-1024",
        name: "John",
        email: "john@example.com",
        phone: "+266 5800 1024",
        avatar: "",
        online: true,
        status: "Active",
        verification: "Verified",
        joined: "12 Jun 2026",
        balance: 5000,
        deposited: 12000,
        withdrawn: 7000,
        plan: "Gold Plan"
    },

    {
        id: "USR-1025",
        name: "Mary",
        email: "mary@example.com",
        phone: "+266 5800 1025",
        avatar: "",
        online: false,
        status: "Active",
        verification: "Verified",
        joined: "18 Jun 2026",
        balance: 2800,
        deposited: 8000,
        withdrawn: 5200,
        plan: "Silver Plan"
    },

    {
        id: "USR-1026",
        name: "Thabo",
        email: "thabo@example.com",
        phone: "+266 5800 1026",
        avatar: "",
        online: true,
        status: "Active",
        verification: "Pending",
        joined: "21 Jun 2026",
        balance: 1500,
        deposited: 4000,
        withdrawn: 2500,
        plan: "Starter Plan"
    },

    {
        id: "USR-1027",
        name: "Lerato",
        email: "lerato@example.com",
        phone: "+266 5800 1027",
        avatar: "",
        online: false,
        status: "Blocked",
        verification: "Verified",
        joined: "25 Jun 2026",
        balance: 750,
        deposited: 3000,
        withdrawn: 2250,
        plan: "Starter Plan"
    },

    {
        id: "USR-1028",
        name: "Mpho",
        email: "mpho@example.com",
        phone: "+266 5800 1028",
        avatar: "",
        online: true,
        status: "Active",
        verification: "Verified",
        joined: "30 Jun 2026",
        balance: 9200,
        deposited: 15000,
        withdrawn: 5800,
        plan: "VIP Plan"
    },
        {
        id: "USR-1029",
        name: "Nna",
        email: "Nna@example.com",
        phone: "+266 2900 1029",
        avatar: "",
        online: true,
        status: "Active",
        verification: "Verified",
        joined: "30 Jun 2026",
        balance: 9200,
        deposited: 15000,
        withdrawn: 5800,
        plan: "VIP Plan"
    }

];


// ======================================================
// 3. INDIVIDUAL CHAT DATA
// ======================================================

let individualChats = [

    {
        id: "CHAT-001",
        userId: "USR-1024",
        name: "John",
        avatar: "",
        online: true,
        lastMessage: "Hello admin, I need help with my withdrawal.",
        lastMessageTime: "10:21",
        unread: 2,
        open: true,
        priority: true,
        muted: false,
        pinned: false,
        messages: [

            {
                id: "MSG-001",
                senderId: "USR-1024",
                senderName: "John",
                text: "Hello admin, I need help with my withdrawal.",
                time: "10:20",
                date: "Today",
                sent: false,
                read: true,
                edited: false,
                replyTo: null
            },

            {
                id: "MSG-002",
                senderId: "ADMIN",
                senderName: "Admin",
                text: "Hello John, how can we help you?",
                time: "10:21",
                date: "Today",
                sent: true,
                read: true,
                edited: false,
                replyTo: null
            }

        ]
    },


    {
        id: "CHAT-002",
        userId: "USR-1025",
        name: "Mary",
        avatar: "",
        online: false,
        lastMessage: "Thank you for your help.",
        lastMessageTime: "09:45",
        unread: 0,
        open: true,
        priority: false,
        muted: false,
        pinned: false,
        messages: [

            {
                id: "MSG-003",
                senderId: "USR-1025",
                senderName: "Mary",
                text: "Thank you for your help.",
                time: "09:45",
                date: "Today",
                sent: false,
                read: true,
                edited: false,
                replyTo: null
            }

        ]
    },


    {
        id: "CHAT-003",
        userId: "USR-1026",
        name: "Thabo",
        avatar: "",
        online: true,
        lastMessage: "Can you check my deposit?",
        lastMessageTime: "Yesterday",
        unread: 1,
        open: true,
        priority: false,
        muted: false,
        pinned: false,
        messages: [

            {
                id: "MSG-004",
                senderId: "USR-1026",
                senderName: "Thabo",
                text: "Can you check my deposit?",
                time: "16:30",
                date: "Yesterday",
                sent: false,
                read: false,
                edited: false,
                replyTo: null
            }

        ]
    },


    {
        id: "CHAT-004",
        userId: "USR-1027",
        name: "Lerato",
        avatar: "",
        online: false,
        lastMessage: "I cannot login to my account.",
        lastMessageTime: "Yesterday",
        unread: 0,
        open: false,
        priority: true,
        muted: false,
        pinned: false,
        messages: [

            {
                id: "MSG-005",
                senderId: "USR-1027",
                senderName: "Lerato",
                text: "I cannot login to my account.",
                time: "14:15",
                date: "Yesterday",
                sent: false,
                read: true,
                edited: false,
                replyTo: null
            }

        ]
    },


    {
        id: "CHAT-005",
        userId: "USR-1028",
        name: "Mpho",
        avatar: "",
        online: true,
        lastMessage: "I would like to upgrade my plan.",
        lastMessageTime: "08:10",
        unread: 0,
        open: true,
        priority: false,
        muted: false,
        pinned: true,
        messages: [

            {
                id: "MSG-006",
                senderId: "USR-1028",
                senderName: "Mpho",
                text: "I would like to upgrade my plan.",
                time: "08:10",
                date: "Today",
                sent: false,
                read: true,
                edited: false,
                replyTo: null
            }

        ]
    }

];


// ======================================================
// 4. GROUP DATA
// ======================================================

let supportChatGroups = [

    {
        id: "GROUP-001",
        name: "VIP Members",
        description: "Communication for VIP members.",
        avatar: "",
        unread: 3,
        admin: true,
        muted: false,
        pinned: false,

        permissions: {
            sendMessages: "everyone",
            editGroup: "admins",
            addMembers: "admins"
        },

        members: [

            {
                id: "USR-1028",
                name: "Mpho",
                avatar: "",
                role: "Admin",
                online: true
            },

            {
                id: "USR-1024",
                name: "John",
                avatar: "",
                role: "Member",
                online: true
            },

            {
                id: "USR-1025",
                name: "Mary",
                avatar: "",
                role: "Member",
                online: false
            }

        ],

        messages: [

            {
                id: "GMSG-001",
                senderId: "USR-1028",
                senderName: "Mpho",
                text: "Welcome everyone.",
                time: "09:10",
                date: "Today",
                sent: false,
                read: true,
                edited: false,
                replyTo: null
            },

            {
                id: "GMSG-002",
                senderId: "ADMIN",
                senderName: "Admin",
                text: "Welcome to the VIP group.",
                time: "09:12",
                date: "Today",
                sent: true,
                read: true,
                edited: false,
                replyTo: null
            }

        ]
    },


    {
        id: "GROUP-002",
        name: "Mining Users",
        description: "General mining discussion.",
        avatar: "",
        unread: 0,
        admin: true,
        muted: false,
        pinned: false,

        permissions: {
            sendMessages: "everyone",
            editGroup: "admins",
            addMembers: "admins"
        },

        members: [

            {
                id: "USR-1024",
                name: "John",
                avatar: "",
                role: "Admin",
                online: true
            },

            {
                id: "USR-1026",
                name: "Thabo",
                avatar: "",
                role: "Member",
                online: true
            }

        ],

        messages: [

            {
                id: "GMSG-003",
                senderId: "USR-1026",
                senderName: "Thabo",
                text: "Is there a new mining plan available?",
                time: "Yesterday",
                date: "Yesterday",
                sent: false,
                read: true,
                edited: false,
                replyTo: null
            }

        ]
    }

];


// ======================================================
// 5. DOM HELPERS
// ======================================================

function supportChatElement(id) {

    return document.getElementById(id);

}


// ======================================================
// 6. SHOW INDIVIDUAL CHATS
// ======================================================

function showIndividualChats() {
  /*
 * Close any currently open chat
 * when switching to Individual.
 */

if (
    currentChat
) {

    closeChat();

}

    const individualSection =
        supportChatElement(
            "individualSection"
        );

    const groupSection =
        supportChatElement(
            "groupSection"
        );

    const individualSwitch =
        supportChatElement(
            "individualSwitch"
        );

    const groupSwitch =
        supportChatElement(
            "groupSwitch"
        );


    if (individualSection) {

        individualSection.classList.remove(
            "hidden"
        );

    }


    if (groupSection) {

        groupSection.classList.add(
            "hidden"
        );

    }


    if (individualSwitch) {

        individualSwitch.classList.add(
            "active"
        );

    }


    if (groupSwitch) {

        groupSwitch.classList.remove(
            "active"
        );

    }


    currentChatType =
        "individual";


    renderIndividualChats();

    updateUnreadCounts();

}


// ======================================================
// 7. SHOW GROUPS
// ======================================================

function showGroups() {
  /*
 * Close any currently open chat
 * when switching to Individual.
 */

if (
    currentChat
) {

    closeChat();

}

    const individualSection =
        supportChatElement(
            "individualSection"
        );

    const groupSection =
        supportChatElement(
            "groupSection"
        );

    const individualSwitch =
        supportChatElement(
            "individualSwitch"
        );

    const groupSwitch =
        supportChatElement(
            "groupSwitch"
        );


    if (individualSection) {

        individualSection.classList.add(
            "hidden"
        );

    }


    if (groupSection) {

        groupSection.classList.remove(
            "hidden"
        );

    }


    if (individualSwitch) {

        individualSwitch.classList.remove(
            "active"
        );

    }


    if (groupSwitch) {

        groupSwitch.classList.add(
            "active"
        );

    }


    currentChatType =
        "group";


    renderGroups();

    updateUnreadCounts();

}


// ======================================================
// 8. FIND INDIVIDUAL CHAT
// ======================================================

function findIndividualChat(chatId) {

    return individualChats.find(
        function(chat) {

            return chat.id === chatId;

        }
    );

}


// ======================================================
// 9. FIND GROUP
// ======================================================

function findSupportGroup(groupId) {

    return supportChatGroups.find(
        function(group) {

            return group.id === groupId;

        }
    );

}


// ======================================================
// 10. FIND USER
// ======================================================

function findSupportUser(userId) {

    return supportChatUsers.find(
        function(user) {

            return user.id === userId;

        }
    );

}


// ======================================================
// 11. RENDER INDIVIDUAL CHATS
// ======================================================

function renderIndividualChats() {

    const container =
        supportChatElement(
            "individualChats"
        );

    const emptyState =
        supportChatElement(
            "noIndividualChats"
        );


    if (!container) {

        return;

    }


    container.innerHTML = "";


    let chats =
        [...individualChats];


    if (
        currentChatFilter ===
        "unread"
    ) {

        chats =
            chats.filter(
                function(chat) {

                    return chat.unread > 0;

                }
            );

    }


    if (
        currentChatFilter ===
        "open"
    ) {

        chats =
            chats.filter(
                function(chat) {

                    return chat.open;

                }
            );

    }


    if (
        currentChatFilter ===
        "priority"
    ) {

        chats =
            chats.filter(
                function(chat) {

                    return chat.priority;

                }
            );

    }


    if (
        currentChatSearch.trim()
    ) {

        const search =
            currentChatSearch
                .toLowerCase()
                .trim();


        chats =
            chats.filter(
                function(chat) {

                    return (

                        chat.name
                            .toLowerCase()
                            .includes(search)

                    );

                }
            );

    }


    /*
     * While building a priority-add/remove selection,
     * only show chats eligible for that action — chats
     * already marked priority stay hidden while adding,
     * and only priority chats show while removing.
     */

    if (
        chatSelectionMode &&
        chatSelectionType === "individual" &&
        pendingBulkAction === "priority"
    ) {

        if (pendingPriorityMode === "add") {

            chats =
                chats.filter(
                    function(chat) {

                        return !chat.priority;

                    }
                );

        }
        else if (pendingPriorityMode === "remove") {

            chats =
                chats.filter(
                    function(chat) {

                        return chat.priority;

                    }
                );

        }

    }


    /*
     * Pinned conversations first.
     */

    chats.sort(
        function(a, b) {

            if (
                a.pinned &&
                !b.pinned
            ) {

                return -1;

            }

            if (
                !a.pinned &&
                b.pinned
            ) {

                return 1;

            }

            return 0;

        }
    );


    if (
        chats.length === 0
    ) {

        if (emptyState) {

            emptyState.style.display =
                "flex";

        }


        updateIndividualChatCount(
            0
        );


        return;

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    chats.forEach(
        function(chat) {

            const item =
                createIndividualChatItem(
                    chat
                );


            container.appendChild(
                item
            );

        }
    );


    updateIndividualChatCount(
        chats.length
    );

}


// ======================================================
// 12. CREATE INDIVIDUAL CHAT ITEM
// ======================================================

function createIndividualChatItem(
    chat
) {

    const item =
        document.createElement(
            "div"
        );


    item.className =
        "chat-list-item";


    if (
        currentChat &&
        currentChat.id ===
        chat.id &&
        currentChatType ===
        "individual"
    ) {

        item.classList.add(
            "active"
        );

    }


    if (
        chat.unread > 0
    ) {

        item.classList.add(
            "unread"
        );

    }


    if (
        chatSelectionType === "individual" &&
        selectedChatIds.includes(
            chat.id
        )
    ) {

        item.classList.add(
            "chat-selected"
        );

    }


    item.dataset.chatId =
        chat.id;


    const avatar =
        document.createElement(
            "div"
        );


    avatar.className =
        "chat-list-avatar";


        avatar.textContent =
        getInitials(
            chat.name
        );


    if (
        chat.online
    ) {

        const online =
            document.createElement(
                "span"
            );


        online.className =
            "online-dot";


        avatar.appendChild(
            online
        );

    }


    const content =
        document.createElement(
            "div"
        );


    content.className =
        "chat-list-content";


    const top =
        document.createElement(
            "div"
        );


    top.className =
        "chat-list-top";


    const name =
        document.createElement(
            "h4"
        );


    name.textContent =
        chat.name;


    const time =
        document.createElement(
            "span"
        );


    time.textContent =
        chat.lastMessageTime;


    top.appendChild(
        name
    );


    top.appendChild(
        time
    );


    const bottom =
        document.createElement(
            "div"
        );


    bottom.className =
        "chat-list-bottom";


    const message =
        document.createElement(
            "p"
        );


    message.textContent =
        chat.lastMessage;


    bottom.appendChild(
        message
    );


    if (
        chat.unread > 0
    ) {

        const unread =
            document.createElement(
                "span"
            );


        unread.className =
            "chat-unread-badge";


        unread.textContent =
            chat.unread;


        bottom.appendChild(
            unread
        );

    }


    if (
        chat.priority
    ) {

        const priority =
            document.createElement(
                "i"
            );


        priority.className =
            "fa-solid fa-star chat-priority";


        bottom.appendChild(
            priority
        );

    }


    content.appendChild(
        top
    );


    content.appendChild(
        bottom
    );


    item.appendChild(
        avatar
    );


    item.appendChild(
        content
    );


    attachChatPressHandlers(
        item,
        chat.id,
        "individual",
        function() {

            openIndividualChat(
                chat.id
            );

        }
    );

    return item;

}


// ======================================================
// 13. UPDATE INDIVIDUAL COUNT
// ======================================================

function updateIndividualChatCount(
    count
) {

    const element =
        supportChatElement(
            "individualChatCount"
        );


    if (!element) {

        return;

    }


    element.textContent =
        count +
        (
            count === 1
                ? " conversation"
                : " conversations"
        );

}


// ======================================================
// 14. GET INITIALS
// ======================================================

function getInitials(
    name
) {

    if (
        !name
    ) {

        return "?";

    }


    const parts =
        name
            .trim()
            .split(
                /\s+/
            );


    if (
        parts.length === 1
    ) {

        return parts[0]
            .charAt(0)
            .toUpperCase();

    }


    return (
        parts[0].charAt(0) +
        parts[
            parts.length - 1
        ].charAt(0)
    ).toUpperCase();

}


// ======================================================
// 15. OPEN INDIVIDUAL CHAT
// ======================================================

function openIndividualChat(
    chatId
) {

    cancelPinMessageSelection(); 

    const chat =
        findIndividualChat(
            chatId
        );
        
        


    if (!chat) {

        return;

    }


    currentChat =
        chat;

    currentChatType =
        "individual";

    currentGroup =
        null;

    currentUser =
        findSupportUser(
            chat.userId
        );

    updateChatMuteMenu();
    currentPinnedMessageIndex = 0;


    /*
     * Mark messages as read.
     */

    chat.messages.forEach(
        function(message) {

            if (
                !message.sent
            ) {

                message.read =
                    true;

            }

        }
    );


    chat.unread =
        0;


    openChatWindow();


    renderCurrentChat();


    renderIndividualChats();


    updateUnreadCounts();

}


// ======================================================
// 16. OPEN GROUP CHAT
// ======================================================

function openGroupChat(
    groupId
) {

     cancelPinMessageSelection(); 

    const group =
        findSupportGroup(
            groupId
        );


    if (!group) {

        return;

    }


    currentChat =
        group;

    currentGroup =
        group;

    currentChatType =
        "group";

    currentUser =
        null;


    group.unread =
        0;


    group.messages.forEach(
        function(message) {

            if (
                !message.sent
            ) {

                message.read =
                    true;

            }

        }
    );


    openChatWindow();


    renderCurrentChat();


    renderGroups();


    updateUnreadCounts();

}


// ======================================================
// 17. OPEN CHAT WINDOW
// ======================================================

// ======================================================
// OPEN CHAT WINDOW
// ======================================================

function openChatWindow() {

    const emptyChat =
        supportChatElement("emptyChat");

    const chatWindow =
        supportChatElement("chatWindow");

    const chatMain =
        supportChatElement("chatMain");


    if (emptyChat) {

        emptyChat.classList.add("hidden");

        emptyChat.hidden = true;

    }


    if (chatWindow) {

        chatWindow.classList.remove("hidden");

        chatWindow.hidden = false;

        chatWindow.style.display = "";

        chatWindow.style.visibility = "visible";

        chatWindow.style.opacity = "1";

    }


    if (chatMain) {

        chatMain.classList.add("chat-open");

        chatMain.classList.remove("chat-closed");

    }


    // ==================================================
    // DIAGNOSTIC
    // ==================================================

    console.log("========== CHAT OPEN TEST ==========");

    console.log(
        "chatWindow classes:",
        chatWindow
            ? chatWindow.className
            : "NOT FOUND"
    );

    console.log(
        "chatWindow hidden:",
        chatWindow
            ? chatWindow.hidden
            : "NOT FOUND"
    );

    console.log(
        "chatWindow display:",
        chatWindow
            ? getComputedStyle(chatWindow).display
            : "NOT FOUND"
    );

    console.log(
        "chatWindow visibility:",
        chatWindow
            ? getComputedStyle(chatWindow).visibility
            : "NOT FOUND"
    );

    console.log(
        "chatWindow opacity:",
        chatWindow
            ? getComputedStyle(chatWindow).opacity
            : "NOT FOUND"
    );

    console.log(
        "chatWindow rect:",
        chatWindow
            ? chatWindow.getBoundingClientRect()
            : "NOT FOUND"
    );


    console.log(
        "chatMain classes:",
        chatMain
            ? chatMain.className
            : "NOT FOUND"
    );

    console.log(
        "chatMain display:",
        chatMain
            ? getComputedStyle(chatMain).display
            : "NOT FOUND"
    );

    console.log(
        "chatMain visibility:",
        chatMain
            ? getComputedStyle(chatMain).visibility
            : "NOT FOUND"
    );

    console.log(
        "chatMain rect:",
        chatMain
            ? chatMain.getBoundingClientRect()
            : "NOT FOUND"
    );

    console.log(
        "==================================="
    );

}


// ======================================================
// 18. CLOSE CHAT
// ======================================================

// ======================================================
// CLOSE CHAT
// ======================================================

function closeChat() {

    currentChat = null;

    currentGroup = null;

      hideTypingIndicator();


    const chatWindow =
        supportChatElement("chatWindow");

    const emptyChat =
        supportChatElement("emptyChat");

    const chatMain =
        supportChatElement("chatMain");


    // --------------------------------------------------
    // Hide chat window
    // --------------------------------------------------

    if (chatWindow) {

        chatWindow.classList.add("hidden");

        chatWindow.hidden = true;

    }


    // --------------------------------------------------
    // Show empty state
    // --------------------------------------------------

    if (emptyChat) {

        emptyChat.classList.remove("hidden");

        emptyChat.hidden = false;

    }


    // --------------------------------------------------
    // Close chat main
    // --------------------------------------------------

    if (chatMain) {

        chatMain.classList.remove("chat-open");

        chatMain.classList.add("chat-closed");

    }


    closeChatMenu();

    cancelReply();

    cancelEditMessage();
  
    cancelPinMessageSelection();

    

}


// ======================================================
// 19. RENDER CURRENT CHAT
// ======================================================

function renderCurrentChat() {

    if (
        !currentChat
    ) {

        return;

    }


    const nameElement =
        supportChatElement(
            "chatName"
        );

    const statusElement =
        supportChatElement(
            "chatStatus"
        );

    const avatarElement =
        supportChatElement(
            "chatAvatar"
        );

    const onlineElement =
        supportChatElement(
            "chatOnlineStatus"
        );


    const groupInfoBar =
        supportChatElement(
            "groupChatInfoBar"
        );

    const groupMemberSummary =
        supportChatElement(
            "groupMemberSummary"
        );

    if (
        currentChatType ===
        "group"
    ) {

        renderCurrentGroupHeader();


        if (
            groupInfoBar &&
            currentChat
        ) {

            groupInfoBar.classList.remove(
                "hidden"
            );

        }


        if (
            groupMemberSummary &&
            currentChat
        ) {

            groupMemberSummary.textContent =
                currentChat.members.length +
                " members";

        }

    }
    else {

        if (groupInfoBar) {

            groupInfoBar.classList.add(
                "hidden"
            );

        }


        if (nameElement) {

            nameElement.textContent =
                currentChat.name;

        }


        if (statusElement) {

            statusElement.textContent =
                currentChat.online
                    ? "Online"
                    : "Offline";

        }


                if (avatarElement) {

            avatarElement.removeAttribute(
                "src"
            );

            avatarElement.style.display =
                "none";

        }


        const avatarInitialsElement =
            supportChatElement(
                "chatAvatarInitials"
            );


        if (avatarInitialsElement) {

            avatarInitialsElement.textContent =
                getInitials(
                    currentChat.name
                );

            avatarInitialsElement.classList.remove(
                "hidden"
            );

        }


        if (onlineElement) {

            onlineElement.style.display =
                currentChat.online
                    ? "block"
                    : "none";

        }

    }


    renderMessages();

}

// =========================================================
// CHAT MENU
// =========================================================

function toggleChatMenu() {

    const menu =
        document.getElementById(
            "chatMenu"
        );


    const moreButton =
        document.getElementById(
            "chatMoreButton"
        );


    const closeButton =
        document.getElementById(
            "chatMenuCloseButton"
        );


    if (!menu) {

        console.error(
            "chatMenu element not found"
        );

        return;

    }


    const isOpening =
        menu.classList.contains(
            "hidden"
        );


    if (isOpening) {

        /*
         * Open menu.
         */

        menu.classList.remove(
            "hidden"
        );

        closeMessagePreviewsOnUiOpen();

      
    const deleteLabel =
            document.getElementById(
                "deleteChatMenuLabel"
            );


        if (deleteLabel) {

            deleteLabel.textContent =
                currentChatType === "group"
                    ? "Delete Group"
                    : "Delete Chat";

        }

        /*
         * Hide 3 dots.
         */

        if (moreButton) {

            moreButton.style.display =
                "none";

        }


        /*
         * Show X.
         */

        if (closeButton) {

            closeButton.style.display =
                "flex";

        }


        /*
         * Start outside-click listener.
         */

        setupChatMenuOutsideClick();

    }
    else {

        /*
         * Close menu.
         */

        closeChatMenu();

    }

}


// =========================================================
// CHAT MENU OUTSIDE CLICK
// =========================================================

function setupChatMenuOutsideClick() {

    /*
     * Remove any previous listener first.
     *
     * This prevents duplicate listeners
     * if the menu is opened many times.
     */

    document.removeEventListener(
        "click",
        handleChatMenuOutsideClick
    );


    /*
     * Add the listener.
     */

    setTimeout(
        function() {

            document.addEventListener(
                "click",
                handleChatMenuOutsideClick
            );

        },
        0
    );

}


// =========================================================
// HANDLE CHAT MENU OUTSIDE CLICK
// =========================================================

function handleChatMenuOutsideClick(
    event
) {

    const menu =
        document.getElementById(
            "chatMenu"
        );


    if (!menu) {

        return;

    }


    /*
     * If the menu is already closed,
     * there is nothing to do.
     */

    if (
        menu.classList.contains(
            "hidden"
        )
    ) {

        return;

    }


    /*
     * If the click happened inside
     * the menu, do nothing.
     */

    if (
        menu.contains(
            event.target
        )
    ) {

        return;

    }


    /*
     * If the click was on the More
     * button, do nothing.
     *
     * toggleChatMenu() already handles
     * opening/closing the menu.
     */

    const moreButton =
        event.target.closest(
            '[onclick="toggleChatMenu()"]'
        );


    if (moreButton) {

        return;

    }


    /*
     * Otherwise the click happened
     * outside the menu.
     */

    closeChatMenu();

}


// =========================================================
// CLOSE CHAT MENU
// =========================================================

function closeChatMenu() {

    const menu =
        document.getElementById(
            "chatMenu"
        );


    const moreButton =
        document.getElementById(
            "chatMoreButton"
        );


    const closeButton =
        document.getElementById(
            "chatMenuCloseButton"
        );


    /*
     * Close menu.
     */

    if (menu) {

        menu.classList.add(
            "hidden"
        );

    }


    /*
     * Show 3 dots again.
     */

    if (moreButton) {

        moreButton.style.display =
            "flex";

    }


    /*
     * Hide X.
     */

    if (closeButton) {

        closeButton.style.display =
            "none";
      

    }


    /*
     * Remove outside-click listener.
     */

    document.removeEventListener(
        "click",
        handleChatMenuOutsideClick
    );

}



// ======================================================
// 20. RENDER GROUP HEADER
// ======================================================

function renderCurrentGroupHeader() {

    const group =
        currentGroup ||
        currentChat;


    if (!group) {

        return;

    }


    const nameElement =
        supportChatElement(
            "chatName"
        );

    const statusElement =
        supportChatElement(
            "chatStatus"
        );

    const avatarElement =
        supportChatElement(
            "chatAvatar"
        );

    const onlineElement =
        supportChatElement(
            "chatOnlineStatus"
        );


    if (nameElement) {

        nameElement.textContent =
            group.name;

    }


    if (statusElement) {

        statusElement.textContent =
            group.members.length +
            " members";

    }


    if (avatarElement) {

        if (
            group.avatar
        ) {

            avatarElement.src =
                group.avatar;

            avatarElement.style.display =
                "block";

        }
        else {

            avatarElement.removeAttribute(
                "src"
            );

            avatarElement.style.display =
                "none";

        }

    }

      const avatarInitialsElement =
        supportChatElement(
            "chatAvatarInitials"
        );


    if (avatarInitialsElement) {

        avatarInitialsElement.classList.add(
            "hidden"
        );

    }


    if (onlineElement) {

        onlineElement.style.display =
            "none";

    }

}


// ======================================================
// 21. RENDER MESSAGES
// ======================================================

function renderMessages() {

    const container =
        supportChatElement(
            "messages"
        );


    if (
        !container ||
        !currentChat
    ) {

        return;

    }


    container.innerHTML =
        "";


    const messages =
        currentChat.messages ||
        [];


    messages.forEach(
        function(message) {

            const element =
                createMessageElement(
                    message
                );


            container.appendChild(
                element
            );

        }
    );

    if (
          !pinMessageSelectionMode
            ) {

         scrollMessagesToBottom();

       }


      updatePinMessageSelectionBar();
      updatePinnedMessageBar();

}


// ======================================================
// 22. CREATE MESSAGE ELEMENT
// ======================================================

function createMessageElement(
    message
) {

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "message " +
        (
            message.sent
                ? "sent"
                : "received"
        );


    wrapper.dataset.messageId =
        message.id;

     /*
 * Pin message selection mode.
 */

if (
    pinMessageSelectionMode
) {

    wrapper.classList.add(
        "pin-selection-mode"
    );


    if (
        selectedPinMessageIds.includes(
            message.id
        )
    ) {

        wrapper.classList.add(
            "pin-message-selected"
        );

    }


    wrapper.addEventListener(
        "click",
        function(event) {

            /*
             * Do not treat clicks on
             * message action controls
             * as message selection.
             */

            if (
                event.target.closest(
                    ".message-actions"
                ) ||
                event.target.closest(
                    ".message-action-menu"
                )
            ) {

                return;

            }


            event.stopPropagation();


            togglePinMessageSelection(
                message.id
            );

        }
    );

}


    const content =
        document.createElement(
            "div"
        );


    content.className =
        "message-content";


    /*
     * Reply preview.
     */

    /*
 * Reply preview.
 */

if (
    message.replyTo
) {

    const reply =
        document.createElement(
            "div"
        );


    reply.className =
        "message-reply";


    /*
     * Make the reply clickable so
     * the original message can be
     * located in the conversation.
     */

    reply.dataset.replyMessageId =
        message.replyTo.id || "";


    /*
     * Reply sender.
     */

    const replySender =
        document.createElement(
            "strong"
        );


    replySender.className =
        "message-reply-sender";


    replySender.textContent =
        message.replyTo.senderName ||
        (
            message.replyTo.senderId ===
            "ADMIN"
                ? "You"
                : "User"
        );


    /*
     * Original message text.
     */

    const replyText =
        document.createElement(
            "span"
        );


    replyText.className =
        "message-reply-text";


    replyText.textContent =
        message.replyTo.text ||
        "";


    /*
     * Add sender and original
     * message to the reply box.
     */

    reply.appendChild(
        replySender
    );


    reply.appendChild(
        replyText
    );


    /*
     * Clicking the quoted message
     * jumps to the original message.
     */

    reply.addEventListener(
        "click",
        function(event) {

            event.stopPropagation();


            if (
                message.replyTo.id
            ) {

                openRepliedMessage(
                    message.replyTo.id
                );

            }

        }
    );


    content.appendChild(
        reply
    );

}


    /*
     * Sender name for groups.
     */

    if (
        currentChatType ===
        "group" &&
        !message.sent
    ) {

        const sender =
            document.createElement(
                "strong"
            );


        sender.className =
            "message-sender";


        sender.textContent =
            message.senderName ||
            "User";


        content.appendChild(
            sender
        );

    }


   if (
        message.type === "voice" &&
        message.fileUrl
    ) {

        const audio =
            document.createElement(
                "audio"
            );

        audio.className =
            "message-voice-player";

        audio.controls = true;

        audio.src =
            message.fileUrl;

        content.appendChild(
            audio
        );

    }
    else if (
        message.type === "attachment" &&
        message.fileUrl
    ) {

        const isImage =
            message.fileMime &&
            message.fileMime.indexOf("image/") === 0;


        if (isImage) {

            const link =
                document.createElement(
                    "a"
                );

            link.href =
                message.fileUrl;

            link.target =
                "_blank";

            link.rel =
                "noopener";

            link.className =
                "message-attachment-image-link";


            const img =
                document.createElement(
                    "img"
                );

            img.className =
                "message-attachment-image";

            img.src =
                message.fileUrl;

            img.alt =
                message.fileName ||
                "Image";


            link.appendChild(
                img
            );

            content.appendChild(
                link
            );

        }
        else {

            const fileCard =
                document.createElement(
                    "a"
                );

            fileCard.href =
                message.fileUrl;

            fileCard.download =
                message.fileName ||
                "file";

            fileCard.className =
                "message-attachment-file";

            fileCard.innerHTML =
                '<i class="fa-solid fa-file"></i>' +
                '<span>' +
                (
                    message.fileName ||
                    message.text ||
                    "File"
                ) +
                '</span>';

            content.appendChild(
                fileCard
            );

        }


        const caption =
            document.createElement(
                "p"
            );

        caption.className =
            "message-text";

        caption.textContent =
            message.text ||
            "";

        content.appendChild(
            caption
        );

    }
    else {

        const text =
            document.createElement(
                "p"
            );

        text.className =
            "message-text";

        text.textContent =
            message.text ||
            "";

        content.appendChild(
            text
        );

    }


    const meta =
        document.createElement(
            "div"
        );


    meta.className =
        "message-meta";


    const time =
        document.createElement(
            "span"
        );


    time.textContent =
        message.time ||
        "";


    meta.appendChild(
        time
    );


    if (
        message.edited
    ) {

        const edited =
            document.createElement(
                "span"
            );


        edited.textContent =
            " edited";


        meta.appendChild(
            edited
        );

    }


    if (
        message.sent
    ) {

        const status =
            document.createElement(
                "i"
            );


        status.className =
            message.read
                ? "fa-solid fa-check-double"
                : "fa-solid fa-check";


        meta.appendChild(
            status
        );

    }


    content.appendChild(
        meta
    );


    wrapper.appendChild(
        content
    );


    /*
     * Message actions.
     */

    setupMessageActionEvents(
    wrapper,
    message.id
);


    return wrapper;

}


// ======================================================
// 23. SCROLL MESSAGES
// ======================================================

function scrollMessagesToBottom() {

    const container =
        supportChatElement(
            "messages"
        );


    if (!container) {

        return;

    }


    requestAnimationFrame(
        function() {

            container.scrollTop =
                container.scrollHeight;

        }
    );

}


// ======================================================
// 24. FILTER CHATS
// ======================================================

function filterChats(
    filter,
    button
) {

    currentChatFilter =
        filter ||
        "all";


    document
        .querySelectorAll(
            "#individualSection .chat-filter"
        )
        .forEach(
            function(item) {

                item.classList.remove(
                    "active"
                );

            }
        );


    if (button) {

        button.classList.add(
            "active"
        );

    }


    renderIndividualChats();

}


// ======================================================
// 25. FILTER GROUPS
// ======================================================

function filterGroups(
    filter,
    button
) {

    currentGroupFilter =
        filter ||
        "all";


    document
        .querySelectorAll(
            "#groupSection .chat-filter"
        )
        .forEach(
            function(item) {

                item.classList.remove(
                    "active"
                );

            }
        );


    if (button) {

        button.classList.add(
            "active"
        );

    }


    renderGroups();

}


// ======================================================
// 26. SEARCH CHATS
// ======================================================

function searchChats(
    value
) {

    currentChatSearch =
        value ||
        "";


    renderIndividualChats();


    const clearButton =
        supportChatElement(
            "clearChatSearch"
        );


    if (clearButton) {

        clearButton.style.display =
            currentChatSearch.length
                ? "block"
                : "none";

    }

}


// ======================================================
// 27. CLEAR CHAT SEARCH
// ======================================================

function clearChatSearch() {

    const input =
        supportChatElement(
            "chatSearch"
        );


    if (input) {

        input.value =
            "";

    }


    currentChatSearch =
        "";


    const clearButton =
        supportChatElement(
            "clearChatSearch"
        );


    if (clearButton) {

        clearButton.style.display =
            "none";

    }


    renderIndividualChats();

}


// ======================================================
// 28. RENDER GROUPS
// ======================================================

function renderGroups() {

    const container =
        supportChatElement(
            "groupChats"
        );

    const emptyState =
        supportChatElement(
            "noGroups"
        );


    if (!container) {

        return;

    }


    container.innerHTML =
        "";


    let groups =
        [...supportChatGroups];


    if (
        currentGroupFilter ===
        "unread"
    ) {

        groups =
            groups.filter(
                function(group) {

                    return group.unread > 0;

                }
            );

    }


    if (
        currentGroupFilter ===
        "admin"
    ) {

        groups =
            groups.filter(
                function(group) {

                    return group.admin;

                }
            );

    }


    const groupSearch =
        supportChatElement(
            "groupSearch"
        );


    const searchValue =
        groupSearch
            ? groupSearch.value
            : "";


    if (
        searchValue.trim()
    ) {

        const search =
            searchValue
                .toLowerCase()
                .trim();


        groups =
            groups.filter(
                function(group) {

                    return (

                        group.name
                            .toLowerCase()
                            .includes(search)


                    );

                }
            );

    }


    if (
        groups.length === 0
    ) {

        if (emptyState) {

            emptyState.style.display =
                "flex";

        }


        updateGroupChatCount(
            0
        );


        return;

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    groups.forEach(
        function(group) {

            container.appendChild(
                createGroupChatItem(
                    group
                )
            );

        }
    );


    updateGroupChatCount(
        groups.length
    );

}


// ======================================================
// 29. CREATE GROUP CHAT ITEM
// ======================================================

function createGroupChatItem(
    group
) {

    const item =
        document.createElement(
            "div"
        );


    item.className =
        "chat-list-item";


    if (
        currentGroup &&
        currentGroup.id ===
        group.id
    ) {

        item.classList.add(
            "active"
        );

    }


    if (
        group.unread > 0
    ) {

        item.classList.add(
            "unread"
        );

    }


    if (
        chatSelectionType === "group" &&
        selectedChatIds.includes(
            group.id
        )
    ) {

        item.classList.add(
            "chat-selected"
        );

    }


    item.dataset.chatId =
        group.id;


    const avatar =
        document.createElement(
            "div"
        );


    avatar.className =
        "chat-list-avatar group-avatar";


    if (
        group.avatar
    ) {

        const image =
            document.createElement(
                "img"
            );


        image.src =
            group.avatar;


        image.alt =
            group.name;


        avatar.appendChild(
            image
        );

    }
    else {

        const icon =
            document.createElement(
                "i"
            );


        icon.className =
            "fa-solid fa-users";


        avatar.appendChild(
            icon
        );

    }


    const content =
        document.createElement(
            "div"
        );


    content.className =
        "chat-list-content";


    const top =
        document.createElement(
            "div"
        );


    top.className =
        "chat-list-top";


    const name =
        document.createElement(
            "h4"
        );


    name.textContent =
        group.name;


    const members =
        document.createElement(
            "span"
        );


    members.textContent =
        group.members.length +
        " members";


    top.appendChild(
        name
    );


    top.appendChild(
        members
    );


    const bottom =
        document.createElement(
            "div"
        );


    bottom.className =
        "chat-list-bottom";


    const lastMessage =
        group.messages.length
            ? group.messages[
                group.messages.length - 1
              ]
            : null;


    const message =
        document.createElement(
            "p"
        );


    message.textContent =
        lastMessage
            ? lastMessage.text
            : "No messages";


    bottom.appendChild(
        message
    );


    if (
        group.unread > 0
    ) {

        const unread =
            document.createElement(
                "span"
            );


        unread.className =
            "chat-unread-badge";


        unread.textContent =
            group.unread;


        bottom.appendChild(
            unread
        );

    }


    if (
        group.priority
    ) {

        const priority =
            document.createElement(
                "i"
            );


        priority.className =
            "fa-solid fa-star chat-priority";


        bottom.appendChild(
            priority
        );

    }


    content.appendChild(
        top
    );


    content.appendChild(
        bottom
    );


    item.appendChild(
        avatar
    );


    item.appendChild(
        content
    );


    attachChatPressHandlers(
        item,
        group.id,
        "group",
        function() {

            openGroupChat(
                group.id
            );

        }
    );


    return item;

}


// ======================================================
// 30. UPDATE GROUP COUNT
// ======================================================

function updateGroupChatCount(
    count
) {

    const element =
        supportChatElement(
            "groupChatCount"
        );


    if (!element) {

        return;

    }


    element.textContent =
        count +
        (
            count === 1
                ? " group"
                : " groups"
        );

}


// ======================================================
// 31. SEARCH GROUPS
// ======================================================

function searchGroups(
    value
) {

    renderGroups();

}


// ======================================================
// 32. UPDATE UNREAD COUNTS
// ======================================================

function updateUnreadCounts() {

    const individualUnread =
        individualChats.reduce(
            function(total, chat) {

                return total +
                    (
                        Number(
                            chat.unread
                        ) || 0
                    );

            },
            0
        );


    const groupUnread =
        supportChatGroups.reduce(
            function(total, group) {

                return total +
                    (
                        Number(
                            group.unread
                        ) || 0
                    );

            },
            0
        );


    const individualElement =
        supportChatElement(
            "individualUnread"
        );


    const groupElement =
        supportChatElement(
            "groupUnread"
        );


    if (
        individualElement
    ) {

        individualElement.textContent =
            individualUnread;

    }


    if (
        groupElement
    ) {

        groupElement.textContent =
            groupUnread;

    }

}


// ======================================================
// 33. INITIALIZE CHAT DATA
// ======================================================

function initializeChatData() {

    updateUnreadCounts();

    renderIndividualChats();

    renderGroups();

}


// ======================================================
// 34. INITIALIZE INDIVIDUAL CHATS
// ======================================================

function initializeIndividualChats() {

    renderIndividualChats();

}


// ======================================================
// 35. INITIALIZE GROUPS
// ======================================================

function initializeGroups() {

    renderGroups();

}


// ======================================================
// 36. OPEN NEW CHAT MODAL
// ======================================================

function openNewChatModal() {

    const modal =
        supportChatElement(
            "newChatModal"
        );


    if (!modal) {

        return;

    }


    modal.classList.remove(
        "hidden"
    );


    renderAvailableUsers();


    const searchInput =
        supportChatElement(
            "userSearchInput"
        );


    if (searchInput) {

        searchInput.value =
            "";

    if (!searchInput.dataset.wired) {

            searchInput.addEventListener(
                "input",
                function() {

                    renderAvailableUsers(
                        searchInput.value
                    );

                }
            );


            searchInput.dataset.wired =
                "true";
    }

        setTimeout(
            function() {

                searchInput.focus();

            },
            50
        );

    }

}


// ======================================================
// 37. CLOSE NEW CHAT MODAL
// ======================================================

function closeNewChatModal() {

    const modal =
        supportChatElement(
            "newChatModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}


// ======================================================
// 38. RENDER AVAILABLE USERS
// ======================================================

function renderAvailableUsers(
    searchValue = ""
) {

    const container =
        supportChatElement(
            "availableUsers"
        );


    if (!container) {

        return;

    }


    container.innerHTML =
        "";


    const search =
        String(
            searchValue
        )
            .toLowerCase()
            .trim();


    let users =
        [...supportChatUsers];


    if (search) {

        users =
            users.filter(
                function(user) {

                    return (

                        user.name
                            .toLowerCase()
                            .includes(search)

                        ||

                        user.email
                            .toLowerCase()
                            .includes(search)

                        ||

                        user.id
                            .toLowerCase()
                            .includes(search)

                    );

                }
            );

    }


    users.forEach(
        function(user) {

            const item =
                document.createElement(
                    "button"
                );


            item.type =
                "button";


            item.className =
                "available-user";


            const avatar =
                document.createElement(
                    "div"
                );


            avatar.className =
                "available-user-avatar";


            avatar.textContent =
                getInitials(
                    user.name
                );


            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "available-user-info";


            const name =
                document.createElement(
                    "strong"
                );


            name.textContent =
                user.name;


            const id =
                document.createElement(
                    "span"
                );


            id.textContent =
                user.id;


            info.appendChild(
                name
            );


            info.appendChild(
                id
            );


            item.appendChild(
                avatar
            );


            item.appendChild(
                info
            );


            item.addEventListener(
                "click",
                function() {

                    startNewConversation(
                        user.id
                    );

                }
            );


            container.appendChild(
                item
            );

        }
    );


    if (
        users.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "available-users-empty";


        empty.textContent =
            "No users found.";


        container.appendChild(
            empty
        );

    }

}


// ======================================================
// 39. START NEW CONVERSATION
// ======================================================

function startNewConversation(
    userId
) {

    const user =
        findSupportUser(
            userId
        );


    if (!user) {

        return;

    }


    let chat =
        individualChats.find(
            function(item) {

                return item.userId ===
                    userId;

            }
        );


    if (!chat) {

        chat = {

            id:
                "CHAT-" +
                Date.now(),

            userId:
                user.id,

            name:
                user.name,

            avatar:
                user.avatar,

            online:
                user.online,

            lastMessage:
                "",

            lastMessageTime:
                "",

            unread:
                0,

            open:
                true,

            priority:
                false,

            muted:
                false,

            pinned:
                false,

            messages:
                []

        };


        individualChats.unshift(
            chat
        );

    }


    closeNewChatModal();


    showIndividualChats();


    openIndividualChat(
        chat.id
    );

}


// ======================================================
// SUPPORT CHAT SYSTEM
// STAGE 1 — INITIALIZATION
// ======================================================


// ======================================================
// 40. GLOBAL FUNCTION ACCESS
// ======================================================

window.showIndividualChats =
    showIndividualChats;


window.showGroups =
    showGroups;


window.openIndividualChat =
    openIndividualChat;


window.openGroupChat =
    openGroupChat;


window.closeChat =
    closeChat;


window.filterChats =
    filterChats;


window.filterGroups =
    filterGroups;


window.searchChats =
    searchChats;


window.clearChatSearch =
    clearChatSearch;


window.searchGroups =
    searchGroups;


window.openNewChatModal =
    openNewChatModal;


window.closeNewChatModal =
    closeNewChatModal;


window.startNewConversation =
    startNewConversation;


// ======================================================
// 41. SETUP STAGE 1 EVENTS
// ======================================================

function setupSupportChatStage1() {

    const chatSearch =
        supportChatElement(
            "chatSearch"
        );


    const groupSearch =
        supportChatElement(
            "groupSearch"
        );


    /*
     * Individual chat search
     */

    if (
        chatSearch &&
        !chatSearch.dataset.stage1Ready
    ) {

        chatSearch.addEventListener(
            "input",
            function(event) {

                searchChats(
                    event.target.value
                );

            }
        );


        chatSearch.dataset.stage1Ready =
            "true";

    }


    /*
     * Group search
     */

    if (
        groupSearch &&
        !groupSearch.dataset.stage1Ready
    ) {

        groupSearch.addEventListener(
            "input",
            function(event) {

                searchGroups(
                    event.target.value
                );

            }
        );


        groupSearch.dataset.stage1Ready =
            "true";

    }

}


// ======================================================
// 42. INITIALIZE SUPPORT CHAT PAGE
// ======================================================

function initSupportChatPage() {

    /*
     * Check whether the Support Chat HTML
     * currently exists.
     */

    const supportChat =
        document.querySelector(
            ".support-chat"
        );


    if (!supportChat) {

        return;

    }


    /*
     * Do not initialize the same page
     * more than once.
     */

    if (
        supportChat.dataset.initialized ===
        "true"
    ) {

        return;

    }


    supportChat.dataset.initialized =
        "true";


    /*
     * Reset Stage 1 state.
     */

    currentChat =
        null;


    currentGroup =
        null;


    currentUser =
        null;


    currentChatType =
        "individual";


    currentChatFilter =
        "all";


    currentGroupFilter =
        "all";


    currentChatSearch =
        "";


    currentGroupSearch =
        "";


    currentMessageSearch =
        "";


    /*
     * Initialize chat data.
     */

    updateUnreadCounts();


    /*
     * Render both lists.
     */

    renderIndividualChats();


    renderGroups();


    /*
     * Setup search events.
     */

    setupSupportChatStage1();
    setupCreateGroupEvents();
    initializeMessageSearch();
    initStage6MessageActions();
    setupPinMessageInput();
    setupAttachmentEvents();
    setupChatSelectionOutsideClick();
    setupPinSelectionOutsideClick();
    


    /*
     * Make Individual the default view.
     */

    showIndividualChats();


}


// ======================================================
// 43. GLOBAL INITIALIZATION ACCESS
// ======================================================

window.initSupportChatPage =
    initSupportChatPage;
    


// ======================================================
// SUPPORT CHAT SYSTEM
// STAGE 2 — CREATE GROUP
// ======================================================


// ======================================================
// 44. OPEN CREATE GROUP MODAL
// ======================================================

// ======================================================
// OPEN CREATE GROUP MODAL
// ======================================================

function openCreateGroupModal() {

    groupModalMode =
        "create";

    editingGroupId =
        null;

    selectedGroupPhoto =
        null;


    showAllGroupModalSections();


    setGroupModalTitle(
        "Create Group",
        "Create a group and add users."
    );


    setGroupModalSubmitLabel(
        "Create Group",
        "fa-solid fa-users"
    );


    const modal =
        supportChatElement(
            "createGroupModal"
        );


    if (!modal) {

        return;

    }


    selectedGroupMembers = [];


    const groupName =
        supportChatElement(
            "groupNameInput"
        );


    const description =
        supportChatElement(
            "groupDescriptionInput"
        );


    const searchInput =
        supportChatElement(
            "memberSearchInput"
        );


    const avatarPreview =
        supportChatElement(
            "newGroupAvatar"
        );


    if (groupName) {

        groupName.value =
            "";

    }


    if (description) {

        description.value =
            "";

    }


    if (searchInput) {

        searchInput.value =
            "";

    }


    if (avatarPreview) {

        avatarPreview.innerHTML =
            '<i class="fa-solid fa-users"></i>';

    }


    resetGroupPermissionSelects(
        {

            sendMessages:
                "everyone",

            editGroup:
                "admins",

            addMembers:
                "admins"

        }
    );


    modal.classList.remove(
        "hidden"
    );


    renderGroupUserSelection();


    if (searchInput) {

        setTimeout(
            function() {

                searchInput.focus();

            },
            50
        );

    }

}


// ======================================================
// SHOW ALL GROUP MODAL SECTIONS
// ======================================================

function showAllGroupModalSections() {

    const sectionIds =
        [

            "groupModalAvatarSection",
            "groupModalNameSection",
            "groupModalDescriptionSection",
            "groupModalMembersSection",
            "groupModalPermissionsSection"

        ];


    sectionIds.forEach(
        function(id) {

            const section =
                supportChatElement(
                    id
                );


            if (section) {

                section.classList.remove(
                    "hidden"
                );

            }

        }
    );

}


// ======================================================
// SET GROUP MODAL TITLE
// ======================================================

function setGroupModalTitle(
    title,
    subtitle
) {

    const titleElement =
        supportChatElement(
            "createGroupModalTitle"
        );


    const subtitleElement =
        supportChatElement(
            "createGroupModalSubtitle"
        );


    if (titleElement) {

        titleElement.textContent =
            title;

    }


    if (subtitleElement) {

        subtitleElement.textContent =
            subtitle;

    }

}


// ======================================================
// SET GROUP MODAL SUBMIT LABEL
// ======================================================

function setGroupModalSubmitLabel(
    label,
    iconClass
) {

    const labelElement =
        supportChatElement(
            "groupModalSubmitLabel"
        );


    const iconElement =
        supportChatElement(
            "groupModalSubmitIcon"
        );


    if (labelElement) {

        labelElement.textContent =
            label;

    }


    if (iconElement) {

        iconElement.className =
            iconClass;

    }

}


// ======================================================
// RESET GROUP PERMISSION SELECTS
// ======================================================

function resetGroupPermissionSelects(
    permissions
) {

    const sendPermission =
        supportChatElement(
            "sendMessagesPermission"
        );


    const editPermission =
        supportChatElement(
            "editGroupPermission"
        );


    const addPermission =
        supportChatElement(
            "addMembersPermission"
        );


    if (
        sendPermission &&
        permissions.sendMessages
    ) {

        sendPermission.value =
            permissions.sendMessages;

    }


    if (
        editPermission &&
        permissions.editGroup
    ) {

        editPermission.value =
            permissions.editGroup;

    }


    if (
        addPermission &&
        permissions.addMembers
    ) {

        addPermission.value =
            permissions.addMembers;

    }

}


// ======================================================
// OPEN EDIT GROUP MODAL (used by editGroupInformation)
// ======================================================

function openEditGroupModal() {

    if (!currentGroup) {

        return;

    }


    closeGroupInfo();


    groupModalMode =
        "edit";

    editingGroupId =
        currentGroup.id;

    selectedGroupPhoto =
        currentGroup.avatar ||
        null;


    showAllGroupModalSections();


    /*
     * Editing an existing group does not
     * change its membership here — that is
     * handled from Add Members instead.
     */

    const membersSection =
        supportChatElement(
            "groupModalMembersSection"
        );


    if (membersSection) {

        membersSection.classList.add(
            "hidden"
        );

    }


    setGroupModalTitle(
        "Edit Group",
        "Update this group's details."
    );


    setGroupModalSubmitLabel(
        "Save Changes",
        "fa-solid fa-check"
    );


    const modal =
        supportChatElement(
            "createGroupModal"
        );


    const groupName =
        supportChatElement(
            "groupNameInput"
        );


    const description =
        supportChatElement(
            "groupDescriptionInput"
        );


    const avatarPreview =
        supportChatElement(
            "newGroupAvatar"
        );


    if (!modal) {

        return;

    }


    if (groupName) {

        groupName.value =
            currentGroup.name ||
            "";

    }


    if (description) {

        description.value =
            currentGroup.description ||
            "";

    }


    if (avatarPreview) {

        if (currentGroup.avatar) {

            avatarPreview.innerHTML =
                '<img src="' +
                currentGroup.avatar +
                '" alt="' +
                currentGroup.name +
                '">';

        }
        else {

            avatarPreview.innerHTML =
                '<i class="fa-solid fa-users"></i>';

        }

    }


    resetGroupPermissionSelects(
        currentGroup.permissions ||
        {}
    );


    modal.classList.remove(
        "hidden"
    );

}


// ======================================================
// OPEN ADD MEMBERS MODAL (used by openAddMembers)
// ======================================================

function openAddMembers() {

    if (!currentGroup) {

        return;

    }


    closeGroupInfo();


    groupModalMode =
        "addMembers";

    editingGroupId =
        currentGroup.id;

    selectedGroupMembers =
        [];


    showAllGroupModalSections();


    const hideIds =
        [

            "groupModalAvatarSection",
            "groupModalNameSection",
            "groupModalDescriptionSection",
            "groupModalPermissionsSection"

        ];


    hideIds.forEach(
        function(id) {

            const section =
                supportChatElement(
                    id
                );


            if (section) {

                section.classList.add(
                    "hidden"
                );

            }

        }
    );


    setGroupModalTitle(
        "Add Members",
        "Select users to add to this group."
    );


    setGroupModalSubmitLabel(
        "Add Members",
        "fa-solid fa-user-plus"
    );


    const modal =
        supportChatElement(
            "createGroupModal"
        );


    const searchInput =
        supportChatElement(
            "memberSearchInput"
        );


    if (!modal) {

        return;

    }


    if (searchInput) {

        searchInput.value =
            "";

    }


    modal.classList.remove(
        "hidden"
    );


    renderGroupUserSelection();


    if (searchInput) {

        setTimeout(
            function() {

                searchInput.focus();

            },
            50
        );

    }

}


// ======================================================
// 45. CLOSE CREATE GROUP MODAL
// ======================================================

function closeCreateGroupModal() {

    const modal =
        supportChatElement(
            "createGroupModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }


    selectedGroupMembers = [];

    selectedGroupPhoto = null;

    groupModalMode =
        "create";

    editingGroupId =
        null;

}


// ======================================================
// SUBMIT GROUP MODAL (dispatch by mode)
// ======================================================

function submitGroupModal() {

    if (
        groupModalMode ===
        "edit"
    ) {

        saveGroupEdit();

    }
    else if (
        groupModalMode ===
        "addMembers"
    ) {

        addSelectedMembersToGroup();

    }
    else {

        createGroup();

    }

}



// ======================================================
// 48. CREATE GROUP
// ======================================================

function createGroup() {

    const nameInput =
        supportChatElement(
            "groupNameInput"
        );


    const descriptionInput =
        supportChatElement(
            "groupDescriptionInput"
        );


    const sendPermission =
        supportChatElement(
            "sendMessagesPermission"
        );


    const editPermission =
        supportChatElement(
            "editGroupPermission"
        );


    const addPermission =
        supportChatElement(
            "addMembersPermission"
        );


    const groupName =
        nameInput
            ? nameInput.value.trim()
            : "";


    const description =
        descriptionInput
            ? descriptionInput.value.trim()
            : "";


    /*
     * Validate group name.
     */

    if (!groupName) {

        alert(
            "Please enter a group name."
        );


        if (nameInput) {

            nameInput.focus();

        }


        return;

    }


    /*
     * Get selected members.
     */

    const members =
    selectedGroupMembers.map(
        function(userId) {

            const user =
                findSupportUser(userId);

            return {

                id:
                    user.id,

                name:
                    user.name,

                avatar:
                    user.avatar,

                role:
                    "Member",

                online:
                    user.online

            };

        }
    );


    /*
     * Create group object.
     */

    const newGroup = {

        id:
            "GROUP-" +
            Date.now(),

        name:
            groupName,

        description:
            description,

        avatar:
            selectedGroupPhoto
                ? selectedGroupPhoto
                : "",

        unread:
            0,

        admin:
            true,

        muted:
            false,

        pinned:
            false,


        permissions: {

            sendMessages:
                sendPermission
                    ? sendPermission.value
                    : "everyone",

            editGroup:
                editPermission
                    ? editPermission.value
                    : "admins",

            addMembers:
                addPermission
                    ? addPermission.value
                    : "admins"

        },


        members:
            members,


        messages:
            []

    };


    /*
     * Add new group to the beginning
     * of the group list.
     */

    supportChatGroups.unshift(
        newGroup
    );


    /*
     * Close modal.
     */

    closeCreateGroupModal();


    /*
     * Switch to Groups.
     */

    showGroups();


    /*
     * Re-render groups.
     */

    renderGroups();


    /*
     * Update unread counters.
     */

    updateUnreadCounts();


    /*
     * Open the newly created group.
     */

    openGroupChat(
        newGroup.id
    );

}


// ======================================================
// SAVE GROUP EDIT
// ======================================================

function saveGroupEdit() {

    const group =
        findSupportGroup(
            editingGroupId
        );


    if (!group) {

        closeCreateGroupModal();

        return;

    }


    const nameInput =
        supportChatElement(
            "groupNameInput"
        );


    const descriptionInput =
        supportChatElement(
            "groupDescriptionInput"
        );


    const sendPermission =
        supportChatElement(
            "sendMessagesPermission"
        );


    const editPermission =
        supportChatElement(
            "editGroupPermission"
        );


    const addPermission =
        supportChatElement(
            "addMembersPermission"
        );


    const groupName =
        nameInput
            ? nameInput.value.trim()
            : "";


    if (!groupName) {

        alert(
            "Please enter a group name."
        );


        if (nameInput) {

            nameInput.focus();

        }


        return;

    }


    group.name =
        groupName;

    group.description =
        descriptionInput
            ? descriptionInput.value.trim()
            : group.description;

    group.avatar =
        selectedGroupPhoto
            ? selectedGroupPhoto
            : group.avatar;


    group.permissions =
        {

            sendMessages:
                sendPermission
                    ? sendPermission.value
                    : group.permissions.sendMessages,

            editGroup:
                editPermission
                    ? editPermission.value
                    : group.permissions.editGroup,

            addMembers:
                addPermission
                    ? addPermission.value
                    : group.permissions.addMembers

        };


    closeCreateGroupModal();


    renderGroups();


    if (
        currentChatType === "group" &&
        currentChat &&
        currentChat.id === group.id
    ) {

        renderCurrentChat();

    }

}


// ======================================================
// ADD SELECTED MEMBERS TO GROUP
// ======================================================

function addSelectedMembersToGroup() {

    const group =
        findSupportGroup(
            editingGroupId
        );


    if (!group) {

        closeCreateGroupModal();

        return;

    }


    if (
        selectedGroupMembers.length === 0
    ) {

        alert(
            "Please select at least one user to add."
        );

        return;

    }


    if (
        !Array.isArray(
            group.members
        )
    ) {

        group.members =
            [];

    }


    selectedGroupMembers.forEach(
        function(userId) {

            const alreadyMember =
                group.members.some(
                    function(member) {

                        return (
                            member.id ===
                            userId
                        );

                    }
                );


            if (alreadyMember) {

                return;

            }


            const user =
                findSupportUser(
                    userId
                );


            if (!user) {

                return;

            }


            group.members.push(
                {

                    id:
                        user.id,

                    name:
                        user.name,

                    avatar:
                        user.avatar,

                    role:
                        "Member",

                    online:
                        user.online

                }
            );

        }
    );


    closeCreateGroupModal();


    if (
        currentChatType === "group" &&
        currentChat &&
        currentChat.id === group.id
    ) {

        renderCurrentChat();

        openGroupInfo();

    }

}


// ======================================================
// 49. GROUP MEMBER SEARCH
// ======================================================

function searchGroupMembers(
    value
) {

    renderGroupUserSelection(
        value
    );

}


// ======================================================
// 50. GROUP CREATION EVENTS
// ======================================================

function setupCreateGroupEvents() {

    const memberSearch =
        supportChatElement(
            "memberSearchInput"
        );


    if (
        memberSearch &&
        !memberSearch.dataset.createGroupReady
    ) {

        memberSearch.addEventListener(
            "input",
            function(event) {

                searchGroupMembers(
                    event.target.value
                );

            }
        );


        memberSearch.dataset.createGroupReady =
            "true";

    }

}


// ======================================================
// RENDER GROUP USER SELECTION
// ======================================================

function renderGroupUserSelection(
    searchValue = ""
) {

    const container =
        supportChatElement(
            "groupUserSelection"
        );


    if (!container) {

        return;

    }


    container.innerHTML = "";


    const search =
        String(searchValue)
            .toLowerCase()
            .trim();


    let users =
        [...supportChatUsers];


    // ----------------------------------------------
    // EXCLUDE EXISTING GROUP MEMBERS
    // (only relevant in "Add Members" mode)
    // ----------------------------------------------

    if (
        groupModalMode ===
        "addMembers" &&
        editingGroupId
    ) {

        const group =
            findSupportGroup(
                editingGroupId
            );


        if (
            group &&
            Array.isArray(
                group.members
            )
        ) {

            const existingIds =
                group.members.map(
                    function(member) {

                        return member.id;

                    }
                );


            users =
                users.filter(
                    function(user) {

                        return (
                            !existingIds.includes(
                                user.id
                            )
                        );

                    }
                );

        }

    }


    // ----------------------------------------------
    // SEARCH USERS
    // ----------------------------------------------

    if (search) {

        users =
            users.filter(
                function(user) {

                    return (

                        user.name
                            .toLowerCase()
                            .includes(search)

                        ||

                        user.email
                            .toLowerCase()
                            .includes(search)

                        ||

                        user.id
                            .toLowerCase()
                            .includes(search)

                    );

                }
            );

    }


    // ----------------------------------------------
    // CREATE USER ITEMS
    // ----------------------------------------------

    users.forEach(
        function(user) {

            const item =
                document.createElement(
                    "button"
                );


            item.type =
                "button";


            item.className =
                "group-user-item";


            if (
                selectedGroupMembers.includes(
                    user.id
                )
            ) {

                item.classList.add(
                    "selected"
                );

            }


            // --------------------------------------
            // AVATAR
            // --------------------------------------

            const avatar =
                document.createElement(
                    "div"
                );


            avatar.className =
                "group-user-avatar";


            avatar.textContent =
                getInitials(
                    user.name
                );


            // --------------------------------------
            // USER INFORMATION
            // --------------------------------------

            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "group-user-info";


            const name =
                document.createElement(
                    "strong"
                );


            name.textContent =
                user.name;


            const userId =
                document.createElement(
                    "span"
                );


            userId.textContent =
                user.id;


            info.appendChild(
                name
            );


            info.appendChild(
                userId
            );


            // --------------------------------------
            // CHECKBOX
            // --------------------------------------

            const check =
                document.createElement(
                    "span"
                );


            check.className =
                "group-user-check";


            if (
                selectedGroupMembers.includes(
                    user.id
                )
            ) {

                check.innerHTML =
                    '<i class="fa-solid fa-check"></i>';

            }


            item.appendChild(
                avatar
            );


            item.appendChild(
                info
            );


            item.appendChild(
                check
            );


            // --------------------------------------
            // CLICK
            // --------------------------------------

            item.addEventListener(
                "click",
                function() {

                    toggleGroupMember(
                        user.id
                    );

                }
            );


            container.appendChild(
                item
            );

        }
    );


    // ----------------------------------------------
    // NO USERS
    // ----------------------------------------------

    if (
        users.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "group-users-empty";


        empty.textContent =
            "No users found.";


        container.appendChild(
            empty
        );

    }

}


// ======================================================
// TOGGLE GROUP MEMBER
// ======================================================

function toggleGroupMember(
    userId
) {

    const index =
        selectedGroupMembers.indexOf(
            userId
        );


    if (
        index === -1
    ) {

        selectedGroupMembers.push(
            userId
        );

    }
    else {

        selectedGroupMembers.splice(
            index,
            1
        );

    }


    const searchInput =
        supportChatElement(
            "memberSearchInput"
        );


    renderGroupUserSelection(
        searchInput
            ? searchInput.value
            : ""
    );

}



// ======================================================
// SUPPORT CHAT SYSTEM
// STAGE 3 — MESSAGE ENGINE
// ======================================================


// ======================================================
// 51. GET MESSAGE INPUT
// ======================================================

function getMessageInput() {

    /*
     * Try the main message input first.
     */

    let input =
        supportChatElement(
            "messageInput"
        );


    /*
     * If the main input does not exist,
     * try common textarea/input IDs.
     */

    if (!input) {

        input =
            supportChatElement(
                "chatMessageInput"
            );

    }


    if (!input) {

        input =
            supportChatElement(
                "messageText"
            );

    }


    return input;

}


// ======================================================
// 52. GENERATE MESSAGE ID
// ======================================================

function generateMessageId() {

    return (
        "MSG-" +
        Date.now() +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 8)
    );

}


// ======================================================
// 53. GET CURRENT MESSAGE TEXT
// ======================================================

function getMessageText() {

    const input =
        getMessageInput();


    if (!input) {

        return "";

    }


    return String(
        input.value || ""
    ).trim();

}


// ======================================================
// 54. CLEAR MESSAGE INPUT
// ======================================================

function clearMessageInput() {

    const input =
        getMessageInput();


    if (!input) {

        return;

    }


    input.value =
        "";


    /*
     * Trigger input event so that
     * any send-button UI updates.
     */

    input.dispatchEvent(
        new Event(
            "input",
            {
                bubbles: true
            }
        )
    );


    input.focus();

}


// ======================================================
// 55. GET CURRENT TIME
// ======================================================

function getCurrentMessageTime() {

    const now =
        new Date();


    let hours =
        now.getHours();


    const minutes =
        now.getMinutes();


    const period =
        hours >= 12
            ? "PM"
            : "AM";


    hours =
        hours % 12 ||
        12;


    return (
        String(hours) +
        ":" +
        String(minutes)
            .padStart(2, "0") +
        " " +
        period
    );

}


// ======================================================
// 56. GET CURRENT MESSAGE DATE
// ======================================================

function getCurrentMessageDate() {

    const now =
        new Date();


    return "Today";

}


// ======================================================
// 57. CREATE MESSAGE OBJECT
// ======================================================

function createNewMessage(
    text,
    type,
    fileData
) {

    const message = {

        id:
            generateMessageId(),

        senderId:
            "ADMIN",

        senderName:
            "Admin",

        text:
            text,

        type:
            type || "text",
      
        time:
            getCurrentMessageTime(),

        date:
            getCurrentMessageDate(),

        sent:
            true,

        read:
            true,

        edited:
            false,

        replyTo:
            null

       };
  
   if (fileData) {

        message.fileUrl =
            fileData.fileUrl;

        message.fileName =
            fileData.fileName;

        message.fileMime =
            fileData.fileMime;

         }


    return message;

}
  


// ======================================================
// 58. ADD MESSAGE TO CURRENT CHAT
// ======================================================

function addMessageToCurrentChat(
    message
) {

    if (
        !currentChat
    ) {

        return false;

    }


    /*
     * Make sure the messages array exists.
     */

    if (
        !Array.isArray(
            currentChat.messages
        )
    ) {

        currentChat.messages =
            [];

    }


    /*
     * Add the message.
     */

    currentChat.messages.push(
        message
    );


    return true;

}


// ======================================================
// 59. UPDATE INDIVIDUAL CHAT PREVIEW
// ======================================================

function updateIndividualChatPreview(
    chat,
    message
) {

    if (
        !chat ||
        !message
    ) {

        return;

    }


    chat.lastMessage =
        message.text;


    chat.lastMessageTime =
        message.time;


    /*
     * An outgoing admin message does not
     * create an unread count.
     */

    chat.unread =
        Number(
            chat.unread
        ) || 0;


}


// ======================================================
// 60. UPDATE GROUP CHAT PREVIEW
// ======================================================



// ======================================================
// 60. UPDATE GROUP CHAT PREVIEW
// ======================================================

function updateGroupChatPreview(
    group,
    message
) {

    if (
        !group ||
        !message
    ) {

        return;

    }


    /*
     * Make sure the group has a messages array.
     */

    if (
        !Array.isArray(
            group.messages
        )
    ) {

        group.messages =
            [];

    }


    /*
     * Store the latest message.
     */

    group.lastMessage =
        message.text ||
        "";


    /*
     * Store the latest message time.
     */

    group.lastMessageTime =
        message.time ||
        "";


    /*
     * Outgoing admin messages should
     * not increase the unread count.
     */

    group.unread =
        Number(
            group.unread
        ) || 0;

}


// ======================================================
// 61. MOVE INDIVIDUAL CHAT TO TOP
// ======================================================

function moveIndividualChatToTop(
    chat
) {

    if (
        !chat
    ) {

        return;

    }


    const index =
        individualChats.indexOf(
            chat
        );


    if (
        index === -1
    ) {

        return;

    }


    /*
     * Remove the chat from its current
     * position.
     */

    individualChats.splice(
        index,
        1
    );


    /*
     * Put the conversation at the top.
     */

    individualChats.unshift(
        chat
    );

}


// ======================================================
// 62. SEND MESSAGE
// ======================================================

// ======================================================
// 62. SEND MESSAGE
// ======================================================

function sendMessage() {


 /*
 * If currently editing a message,
 * save the edit instead of sending
 * a new message.
 */

if (
    isEditingMessage()
) {

    saveEditedMessage();

    return;

}
    /*
     * There must be an active conversation.
     */

    if (
        !currentChat
    ) {

        return;

    }


    /*
     * Get text from the message input.
     */

    const text =
        getMessageText();


    /*
     * Do not send empty messages.
     */

    if (
        !text
    ) {

        return;

    }


    /*
     * Create the message.
     *
     * prepareMessageForSend()
     * automatically checks whether
     * we are replying to another message.
     */

    const message =
        prepareMessageForSend(
            text
        );


    /*
     * Add message to current conversation.
     */

    const added =
        addMessageToCurrentChat(
            message
        );


    if (!added) {

        return;

    }


    /*
     * Individual chat.
     */

    if (
        currentChatType ===
        "individual"
    ) {

        updateIndividualChatPreview(
            currentChat,
            message
        );


        moveIndividualChatToTop(
            currentChat
        );

    }

       if (
        currentChatType === "individual" &&
        currentUser
    ) {

        simulateTypingReply(
            currentChat.id,
            currentUser.name
        );

    }


    /*
     * Group chat.
     */

    if (
        currentChatType ===
        "group"
    ) {

        updateGroupChatPreview(
            currentChat,
            message
        );

    }


    /*
     * Clear reply state after
     * successfully sending the message.
     */

    if (
        replyingToMessage
    ) {

        replyingToMessage =
            null;


        closeReplyPreview();

    }


    /*
     * Clear the input.
     */

    clearMessageInput();


    /*
     * Render the updated conversation.
     */

    renderMessages();


    /*
     * Update the conversation list.
     */

    if (
        currentChatType ===
        "individual"
    ) {

        renderIndividualChats();

    }
    else {

        renderGroups();

    }


    /*
     * Update unread counters.
     */

    updateUnreadCounts();


    /*
     * Keep the message area at the bottom.
     */

    scrollMessagesToBottom();

}


// ======================================================
// 63. SEND MESSAGE WITH ENTER
// ======================================================

function handleMessageInputKeydown(
    event
) {

    if (!event) {

        return;

    }


    /*
     * Enter sends the message.
     *
     * Shift + Enter creates a new line.
     */

    if (
        event.key ===
        "Enter" &&
        !event.shiftKey
    ) {

        event.preventDefault();


        sendMessage();

    }

}


// ======================================================
// 64. UPDATE MESSAGE AFTER SEND
// =======


// ======================================================
// 65. GET LAST MESSAGE
// ======================================================

function getLastMessage(
    chat
) {

    if (
        !chat ||
        !Array.isArray(
            chat.messages
        )
    ) {

        return null;

    }


    if (
        chat.messages.length === 0
    ) {

        return null;

    }


    return chat.messages[
        chat.messages.length - 1
    ];

}


// ======================================================
// 66. UPDATE LAST MESSAGE PREVIEW
// ======================================================




// ======================================================
// 66. UPDATE LAST MESSAGE PREVIEW
// ======================================================

function updateLastMessagePreview(
    chat
) {

    if (
        !chat
    ) {

        return;

    }


    const lastMessage =
        getLastMessage(
            chat
        );


    /*
     * If there are no messages,
     * clear the preview.
     */

    if (!lastMessage) {

        chat.lastMessage =
            "";

        chat.lastMessageTime =
            "";

        return;

    }


    /*
     * Update preview for both
     * individual chats and groups.
     */

    chat.lastMessage =
        lastMessage.text ||
        "";


    chat.lastMessageTime =
        lastMessage.time ||
        "";

}


// ======================================================
// 67. CHECK MESSAGE INPUT
// ======================================================

function messageInputHasText() {

    const text =
        getMessageText();


    return (
        text.length > 0
    );

}


// ======================================================
// 68. INITIALIZE MESSAGE ENGINE
// ======================================================

function initializeMessageEngine() {

    const input =
        getMessageInput();


    if (
        !input
    ) {

        return;

    }


    /*
     * Prevent duplicate event listeners.
     */

    if (
        input.dataset.messageEngineReady ===
        "true"
    ) {

        return;

    }


    input.addEventListener(
        "keydown",
        handleMessageInputKeydown
    );


    input.dataset.messageEngineReady =
        "true";

}


// ======================================================
// SUPPORT CHAT SYSTEM
// STAGE 4 — REPLY
// ======================================================


// ======================================================
// 70. START REPLY
// ======================================================

function replyToMessage(
    messageId
) {

    if (
        !currentChat
    ) {

        return;

    }


    const message =
        currentChat.messages.find(
            function(item) {

                return item.id ===
                    messageId;

            }
        );


    if (!message) {

        return;

    }

     /*
 * Reply and edit cannot be active
 * at the same time.
 */

if (
    editingMessage
) {

    cancelEditMessage();

}
 
    /*
     * Store the message currently
     * being replied to.
     */

    replyingToMessage =
        message;


    /*
     * Show the reply preview.
     */

    showReplyPreview(
        message
    );


    /*
     * Focus the message input.
     */

    const input =
        getMessageInput();


    if (input) {

        input.focus();

    }

}


// ======================================================
// 71. SHOW REPLY PREVIEW
// ======================================================

function showReplyPreview(
    message
) {

    if (!message) {

        return;

    }


    /*
     * Try the main reply preview ID.
     */

    let preview =
        supportChatElement(
            "replyPreview"
        );


    /*
     * If the existing HTML uses another
     * common ID, support it as well.
     */

    if (!preview) {

        preview =
            supportChatElement(
                "messageReplyPreview"
            );

    }


    if (!preview) {

        return;

    }


    /*
     * Find the reply text element.
     */

    let textElement =
        supportChatElement(
            "replyMessage"
        );


    if (!textElement) {

        textElement =
            preview.querySelector(
                ".reply-preview-text"
            );

    }


    if (!textElement) {

        textElement =
            preview.querySelector(
               (".reply-text")
            );

    }


    /*
     * Find the sender element.
     */

    let senderElement =
        supportChatElement(
            "replyUser"
        );


    if (!senderElement) {

        senderElement =
            preview.querySelector(
                ".reply-preview-sender"
            );

    }


    /*
     * Display sender name.
     */

    if (senderElement) {

        senderElement.textContent =
            message.sent
                ? "You"
                : (
                    message.senderName ||
                    "User"
                );

    }


    /*
     * Display message text.
     */

    if (textElement) {

        textElement.textContent =
            message.text ||
            "";

    }


    /*
     * Store the original message ID
     * on the preview itself.
     */

    preview.dataset.messageId =
        message.id;


    /*
     * Make preview visible.
     */

    preview.classList.remove(
        "hidden"
    );


    preview.hidden =
        false;


    preview.style.display =
        "";


}


// ======================================================
// 72. CLOSE REPLY PREVIEW
// ======================================================

function closeReplyPreview() {

    let preview =
        supportChatElement(
            "replyPreview"
        );


    if (!preview) {

        preview =
            supportChatElement(
                "messageReplyPreview"
            );

    }


    if (!preview) {

        return;

    }


    preview.classList.add(
        "hidden"
    );


    preview.hidden =
        true;


    preview.style.display =
        "none";


    delete preview.dataset.messageId;

}


// ======================================================
// 73. CANCEL REPLY
// ======================================================

function cancelReply() {

    replyingToMessage =
        null;


    closeReplyPreview();


    /*
     * Return focus to the message input.
     */

    const input =
        getMessageInput();


    if (input) {

        input.focus();

    }

}


// ======================================================
// 74. GET REPLY DATA
// ======================================================

function getReplyData() {

    if (
        !replyingToMessage
    ) {

        return null;

    }


    return {

        id:
            replyingToMessage.id,

        senderId:
            replyingToMessage.senderId,

        senderName:
            replyingToMessage.senderName,

        text:
            replyingToMessage.text,

        time:
            replyingToMessage.time

    };

}


// ======================================================
// 75. CREATE MESSAGE WITH REPLY
// ======================================================

function createMessageWithReply(
    text,
    type,
    fileData
) {

    const message =
        createNewMessage(
            text,
            type,
            fileData
        );


    const replyData =
        getReplyData();


    if (
        replyData
    ) {

        message.replyTo =
            replyData;

    }


    return message;

}


// ======================================================
// 76. SEND REPLY MESSAGE
// ======================================================

function sendReplyMessage(
    text
) {

    if (
        !currentChat
    ) {

        return;

    }


    const messageText =
        String(
            text ||
            ""
        ).trim();


    if (
        !messageText
    ) {

        return;

    }


    /*
     * Create message with reply information.
     */

    const message =
        createMessageWithReply(
            messageText
        );


    /*
     * Add to current conversation.
     */

    const added =
        addMessageToCurrentChat(
            message
        );


    if (!added) {

        return;

    }


    /*
     * Update individual chat preview.
     */

    if (
        currentChatType ===
        "individual"
    ) {

        updateIndividualChatPreview(
            currentChat,
            message
        );


        moveIndividualChatToTop(
            currentChat
        );

    }


    /*
     * Group message.
     */

    if (
        currentChatType ===
        "group"
    ) {

        updateGroupChatPreview(
            currentChat,
            message
        );

    }


    /*
     * Clear reply state.
     */

    replyingToMessage =
        null;


    closeReplyPreview();


    /*
     * Clear message input if this
     * function was called from the input.
     */

    clearMessageInput();


    /*
     * Render conversation again.
     */

    renderMessages();


    /*
     * Render conversation list.
     */

    if (
        currentChatType ===
        "individual"
    ) {

        renderIndividualChats();

    }
    else {

        renderGroups();

    }


    updateUnreadCounts();


    scrollMessagesToBottom();

}


// ======================================================
// 77. REPLY FROM CURRENT INPUT
// ======================================================

function sendCurrentReply() {

    if (
        !replyingToMessage
    ) {

        return false;

    }


    const text =
        getMessageText();


    if (
        !text
    ) {

        return false;

    }


    sendReplyMessage(
        text
    );


    return true;

}


// ======================================================
// 78. REPLY BUTTON HANDLER
// ======================================================

function handleReplyAction(
    messageId
) {

    replyToMessage(
        messageId
    );

}


// ======================================================
// 79. FIND MESSAGE ELEMENT
// ======================================================

function findMessageElement(
    messageId
) {

    const container =
        supportChatElement(
            "messages"
        );


    if (!container) {

        return null;

    }


    return container.querySelector(
        '[data-message-id="' +
        messageId +
        '"]'
    );

}


// ======================================================
// 80. SCROLL TO REPLIED MESSAGE
// ======================================================

// ------------------------------------------------------
// Message highlight state (scrollToMessage) — tracks
// the currently-highlighted message and its pending
// timeout, so jumping to a new replied message cancels
// any highlight still in progress
// ------------------------------------------------------

let messageHighlightTimeout = null;

let highlightedMessageElement = null;


function scrollToMessage(
    messageId
) {

    const element =
        findMessageElement(
            messageId
        );


    if (!element) {

        return;

    }


    element.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });


    /*
     * Cancel any highlight still in progress from a
     * previous call, so only one message is ever
     * highlighted at a time.
     */

    if (messageHighlightTimeout) {

        clearTimeout(
            messageHighlightTimeout
        );

        messageHighlightTimeout =
            null;

    }


    if (
        highlightedMessageElement &&
        highlightedMessageElement !== element
    ) {

        highlightedMessageElement.classList.remove(
            "message-highlight"
        );

    }


    /*
     * Temporarily highlight the message.
     */

    element.classList.add(
        "message-highlight"
    );

    highlightedMessageElement =
        element;


    messageHighlightTimeout =
        setTimeout(
            function() {

                element.classList.remove(
                    "message-highlight"
                );


                if (
                    highlightedMessageElement ===
                    element
                ) {

                    highlightedMessageElement =
                        null;

                }


                messageHighlightTimeout =
                    null;

            },
            4500
        );

}




// ======================================================
// 81. OPEN REPLIED MESSAGE
// ======================================================

function openRepliedMessage(
    messageId
) {

    if (
        !messageId
    ) {

        return;

    }


    scrollToMessage(
        messageId
    );

}


// ======================================================
// 82. SETUP REPLY PREVIEW EVENTS
// ======================================================

function setupReplyPreviewEvents() {

    let preview =
        supportChatElement(
            "replyPreview"
        );


    if (!preview) {

        preview =
            supportChatElement(
                "messageReplyPreview"
            );

    }


    if (
        !preview
    ) {

        return;

    }


    /*
     * Prevent duplicate listeners.
     */

    if (
        preview.dataset.replyReady ===
        "true"
    ) {

        return;

    }


    /*
     * Look for a cancel button.
     */

    const cancelButton =
        preview.querySelector(
            "[data-action='cancel-reply']"
        ) ||
        preview.querySelector(
            ".cancel-reply"
        ) ||
        preview.querySelector(
            ".reply-preview-close"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                cancelReply();

            }
        );

    }


    preview.dataset.replyReady =
        "true";

}


// ======================================================
// 83. UPDATE MESSAGE CREATION FOR REPLY
// ======================================================

function prepareMessageForSend(
    text,
    type,
    fileData
) {

    if (
        replyingToMessage
    ) {

        return createMessageWithReply(
            text,
            type,
            fileData
        );

    }


    return createNewMessage(
        text,
        type,
        fileData
    );

}


// ======================================================
// 84. REPLY STATE CHECK
// ======================================================

function isReplying() {

    return (
        replyingToMessage !==
        null
    );

}


// ======================================================
// 85. GET REPLYING MESSAGE
// ======================================================

function getReplyingMessage() {

    return replyingToMessage;

}


// ======================================================
// SUPPORT CHAT SYSTEM
// STAGE 5 — EDIT MESSAGE
// ======================================================


// ======================================================
// 51. START EDIT MESSAGE
// ======================================================

function startEditMessage(
    messageId
) {

    if (
        !currentChat
    ) {

        return;

    }


    const message =
        currentChat.messages.find(
            function(item) {

                return item.id ===
                    messageId;

            }
        );


    if (!message) {

        return;

    }


    /*
     * Only sent messages can be edited.
     */

    if (
        !message.sent
    ) {

        return;

    }

     /*
     * Voice messages cannot be edited.
     */

    if (
        message.type === "voice"
    ) {

        return;

    }

 /*
 * Edit and reply cannot be active
 * at the same time.
 */

if (
    replyingToMessage
) {

    cancelReply();

}

    /*
     * Save the message currently
     * being edited.
     */

    editingMessage =
        message;


    /*
     * Find the message input.
     */

    const input =
        supportChatElement(
            "messageInput"
        );


    if (!input) {

        return;

    }


    /*
     * Put the original message
     * inside the input.
     */

    input.value =
        message.text ||
        "";


    /*
     * Change input state.
     */

    input.dataset.editing =
        "true";


    input.dataset.editingMessageId =
        message.id;


    /*
     * Show edit preview.
     */

    showEditPreview(
        message
    );


    /*
     * Focus the input.
     */

    setTimeout(
        function() {

            input.focus();


            /*
             * Put cursor at the end
             * of the message.
             */

            const length =
                input.value.length;


            if (
                typeof input.setSelectionRange ===
                "function"
            ) {

                input.setSelectionRange(
                    length,
                    length
                );

            }

        },
        50
    );


    /*
     * Close any open message
     * action menu.
     */

    /*
 * Close any open message
 * action menu.
 */

closeMessageActionMenu();


    /*
     * Close chat menu if open.
     */

    closeChatMenu();

}


// ======================================================
// 52. SHOW EDIT PREVIEW
// ======================================================

function showEditPreview(
    message
) {

    const preview =
        supportChatElement(
            "editPreview"
        );


    if (!preview) {

        return;

    }


    /*
     * Find the text element.
     */

    let textElement =
        supportChatElement(
            "editMessage"
        );


    if (!textElement) {

        textElement =
            preview.querySelector(
                ".edit-preview-text"
            );

    }


    if (!textElement) {

        textElement =
            preview.querySelector(
                ".edit-text"
            );

    }


    if (textElement) {

        textElement.textContent =
            message.text ||
            "";

    }


    /*
     * Show the preview.
     */

    preview.classList.remove(
        "hidden"
    );


    preview.hidden =
        false;


    preview.style.display =
        "";


}


// ======================================================
// 53. CANCEL EDIT MESSAGE
// ======================================================

function cancelEditMessage() {

    editingMessage =
        null;


    const input =
        supportChatElement(
            "messageInput"
        );


    if (input) {

        input.dataset.editing =
            "false";


        delete input.dataset
            .editingMessageId;

    }


    /*
     * Hide edit preview.
     */

    /*
 * Hide edit preview.
 */

const editPreview =
    supportChatElement(
        "editPreview"
    );


if (editPreview) {

    editPreview.classList.add(
        "hidden"
    );


    editPreview.hidden =
        true;


    editPreview.style.display =
        "none";

}


    /*
     * Clear input only when
     * we were editing.
     */

    if (input) {

        input.value =
            "";

    }


    /*
     * Restore normal input state.
     */

    updateMessageInputState();

}

// ======================================================
// CLOSE MESSAGE PREVIEWS WHEN OPENING OTHER CHAT UI
// (reply/edit previews should only stay open while the
// user is interacting with the chat footer itself —
// not when opening the chat menu, profile, or search)
// ======================================================

function closeMessagePreviewsOnUiOpen() {

    if (
        replyingToMessage
    ) {

        cancelReply();

    }

    if (
        editingMessage
    ) {

        cancelEditMessage();

    }

}


// ======================================================
// 54. SAVE EDITED MESSAGE
// ======================================================

function saveEditedMessage() {

    if (
        !editingMessage
    ) {

        return false;

    }


    const input =
        supportChatElement(
            "messageInput"
        );


    if (!input) {

        return false;

    }


    const newText =
        input.value.trim();


    /*
     * Do not allow an empty
     * edited message.
     */

    if (!newText) {

        return false;

    }


    /*
     * Do not save if nothing
     * actually changed.
     */

    if (
        newText ===
        editingMessage.text
    ) {

        cancelEditMessage();

        return false;

    }


    /*
     * Update the message.
     */

    editingMessage.text =
        newText;


    editingMessage.edited =
        true;


    /*
     * Update time.

     * The helper below uses the
     * current browser time.
     */

    editingMessage.time =
        getCurrentMessageTime();


    /*
     * Update the chat preview.
     */

    /*
 * Update the chat preview.
 */

updateLastMessagePreview(
    currentChat
);


    /*
     * Re-render messages.
     */

    renderMessages();

 if (
    currentChatType ===
    "individual"
) {

    renderIndividualChats();

}
else if (
    currentChatType ===
    "group"
) {

    renderGroups();

}


    /*
     * Clear edit state.
     */

    editingMessage =
        null;


    input.value =
        "";


    input.dataset.editing =
        "false";


    delete input.dataset
        .editingMessageId;


    /*
     * Hide edit preview.
     */

/*
 * Hide edit preview.
 */

const preview =
    supportChatElement(
        "editPreview"
    );


if (preview) {

    preview.classList.add(
        "hidden"
    );

    preview.hidden =
        true;

    preview.style.display =
        "none";

}


    /*
     * Restore normal input state.
     */

    updateMessageInputState();


    return true;

}




// ======================================================
// 56. UPDATE CHAT LAST MESSAGE
// ======================================================

// ======================================================
// UPDATE CHAT LAST MESSAGE
// ======================================================

function updateChatLastMessage(
    chat
) {

    if (
        !chat
    ) {

        return;

    }


    const messages =
        Array.isArray(
            chat.messages
        )
            ? chat.messages
            : [];


    /*
     * No messages.
     */

    if (
        messages.length === 0
    ) {

        chat.lastMessage =
            "";

        chat.lastMessageTime =
            "";


        return;

    }


    /*
     * Get the newest message.
     */

    const lastMessage =
        messages[
            messages.length - 1
        ];


    if (!lastMessage) {

        return;

    }


    /*
     * Update the preview text.
     */

    chat.lastMessage =
        lastMessage.text ||
        "";


    /*
     * Update the preview time.
     */

    chat.lastMessageTime =
        lastMessage.time ||
        "";

}


// ======================================================
// 57. UPDATE MESSAGE INPUT STATE
// ======================================================

function updateMessageInputState() {

    const input =
        supportChatElement(
            "messageInput"
        );


    if (!input) {

        return;

    }


    const isEditing =
        editingMessage !==
        null;


    input.dataset.editing =
        isEditing
            ? "true"
            : "false";


    /*
     * Update placeholder.
     */

    if (isEditing) {

        input.placeholder =
            "Edit message...";

    }
    else {

        input.placeholder =
            "Type a message...";

    }


    /*
     * Update edit/send button
     * when the HTML provides one.
     */

    const sendButton =
        supportChatElement(
            "sendMessageBtn"
        );


    if (
        sendButton
    ) {

        if (isEditing) {

            sendButton.title =
                "Save changes";

        }
        else {

            sendButton.title =
                "Send message";

        }

    }

}


// ======================================================
// 58. CHECK WHETHER INPUT IS EDITING
// ======================================================

function isEditingMessage() {

    return (
        editingMessage !==
        null
    );

}


// ======================================================
// STAGE 6 — MESSAGE ACTIONS
// ANDROID / Acode
// ======================================================


// ======================================================
// VARIABLES
// ======================================================

let messageLongPressTimer = null;

let activeMessageActionMenu = null;

let activeActionMessageId = null;


// ======================================================
// GET MESSAGE ELEMENT
// ======================================================

function getMessageElement(target) {

    if (!target) {
        return null;
    }

    if (
        target.classList &&
        target.classList.contains("message")
    ) {

        return target;

    }

    if (target.closest) {

        return target.closest(".message");

    }

    return null;
}


// ======================================================
// GET MESSAGE ID
// ======================================================

function getMessageId(messageElement) {

    if (!messageElement) {
        return null;
    }

    return (
        messageElement.dataset.messageId ||
        messageElement.getAttribute(
            "data-message-id"
        ) ||
        messageElement.id ||
        null
    );

}


// ======================================================
// CLOSE ACTION MENU
// ======================================================

function closeMessageActionMenu() {

    if (activeMessageActionMenu) {

        activeMessageActionMenu.remove();

        activeMessageActionMenu = null;

    }

    activeActionMessageId = null;

}


// ======================================================
// SHOW MESSAGE ACTION MENU
// ======================================================

function showMessageActionMenu(
    messageElement,
    messageId
) {

    closeMessageActionMenu();


    if (
        !messageElement ||
        !messageId
    ) {

        return;

    }


    activeActionMessageId =
        messageId;


    const targetMessage =
        currentChat &&
        Array.isArray(currentChat.messages)
            ? currentChat.messages.find(
                  function(item) {

                      return item.id === messageId;

                  }
              )
            : null;


    const canEditMessage =
        !targetMessage ||
        targetMessage.type !== "voice";


    const editButtonMarkup =
        canEditMessage
            ? '<button type="button" data-action="edit">' +
                  '<i class="fa-solid fa-pen"></i>' +
                  '<span>Edit</span>' +
              '</button>'
            : '';


    const menu =
        document.createElement(
            "div"
        );


    menu.className =
        "message-action-menu";


    menu.innerHTML =

        '<button type="button" data-action="reply">' +
            '<i class="fa-solid fa-reply"></i>' +
            '<span>Reply</span>' +
        '</button>' +

        editButtonMarkup +

        '<button type="button" data-action="copy">' +
            '<i class="fa-solid fa-copy"></i>' +
            '<span>Copy</span>' +
        '</button>' +

        '<button type="button" data-action="delete">' +
            '<i class="fa-solid fa-trash"></i>' +
            '<span>Delete</span>' +
        '</button>' +

        '<button type="button" data-action="close">' +
            '<i class="fa-solid fa-xmark"></i>' +
            '<span>Close</span>' +
        '</button>';


    document.body.appendChild(
        menu
    );


    activeMessageActionMenu =
        menu;


    // ==================================================
    // POSITION MENU
    // ==================================================

    const rect =
        messageElement.getBoundingClientRect();


    const menuRect =
        menu.getBoundingClientRect();


    let top =
        rect.top -
        menuRect.height -
        8;


    let left =
        rect.left;


    /*
     * If there is not enough room above
     * the message, show the menu below it.
     */

    if (
        top < 10
    ) {

        top =
            rect.bottom + 8;

    }


    /*
     * Keep menu inside right edge.
     */

    if (
        left +
        menuRect.width >
        window.innerWidth - 10
    ) {

        left =
            window.innerWidth -
            menuRect.width -
            10;

    }


    /*
     * Keep menu inside left edge.
     */

    if (
        left < 10
    ) {

        left =
            10;

    }


    /*
     * Keep menu inside bottom edge.
     */

    if (
        top +
        menuRect.height >
        window.innerHeight - 10
    ) {

        top =
            window.innerHeight -
            menuRect.height -
            10;

    }


    /*
     * Keep menu inside top edge.
     */

    if (
        top < 10
    ) {

        top =
            10;

    }


    menu.style.position =
        "fixed";


    menu.style.top =
        top + "px";


    menu.style.left =
        left + "px";


    menu.style.zIndex =
        "999999";


    // ==================================================
    // ACTION BUTTONS
    // ==================================================

    menu.addEventListener(
        "click",
        function(event) {

            const button =
                event.target.closest(
                    "button"
                );


            if (!button) {

                return;

            }


            const action =
                button.dataset.action;


            /*
             * Close button.
             */

            if (
                action ===
                "close"
            ) {

                closeMessageActionMenu();

                return;

            }


            /*
             * Close the menu before
             * performing the action.
             */

            closeMessageActionMenu();


            // ==========================================
            // REPLY
            // ==========================================

            if (
                action ===
                "reply"
            ) {

                replyToMessage(
                    messageId
                );

                return;

            }


            // ==========================================
            // EDIT
            // ==========================================

            if (
                action ===
                "edit"
            ) {

                startEditMessage(
                    messageId
                );

                return;

            }


            // ==========================================
            // COPY
            // ==========================================

            if (
                action ===
                "copy"
            ) {

                copyMessage(
                    messageId
                );

                return;

            }


            // ==========================================
            // DELETE
            // ==========================================

            if (
                action ===
                "delete"
            ) {

                deleteMessage(
                    messageId
                );

                return;

            }

        }
    );

}


// ======================================================
// COPY MESSAGE
// ======================================================

function copyMessage(
    messageId
) {

    if (
        !currentChat ||
        !Array.isArray(
            currentChat.messages
        )
    ) {

        return;

    }


    const message =
        currentChat.messages.find(
            function(item) {

                return (
                    item.id ===
                    messageId
                );

            }
        );


    if (!message) {

        return;

    }


    const text =
        String(
            message.text ||
            ""
        );


    if (!text) {

        return;

    }


    /*
     * Use the modern Clipboard API
     * when available.
     */

    if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText ===
        "function"
    ) {

        navigator.clipboard.writeText(
            text
        )
        .then(
            function() {

                console.log(
                    "Message copied."
                );

            }
        )
        .catch(
            function(error) {

                console.error(
                    "Copy failed:",
                    error
                );

                fallbackCopyMessage(
                    text
                );

            }
        );

    }
    else {

        fallbackCopyMessage(
            text
        );

    }

}


// ======================================================
// FALLBACK COPY MESSAGE
// ======================================================

function fallbackCopyMessage(
    text
) {

    const textarea =
        document.createElement(
            "textarea"
        );


    textarea.value =
        text;


    textarea.style.position =
        "fixed";


    textarea.style.left =
        "-9999px";


    textarea.style.top =
        "0";


    document.body.appendChild(
        textarea
    );


    textarea.focus();


    textarea.select();


    try {

        document.execCommand(
            "copy"
        );


        console.log(
            "Message copied."
        );

    }
    catch (error) {

        console.error(
            "Fallback copy failed:",
            error
        );

    }


    document.body.removeChild(
        textarea
    );

}


// ======================================================
// DELETE MESSAGE
// ======================================================

function deleteMessage(
    messageId
) {

    if (
        !currentChat ||
        !Array.isArray(
            currentChat.messages
        )
    ) {

        return;

    }


    const messageIndex =
        currentChat.messages.findIndex(
            function(item) {

                return (
                    item.id ===
                    messageId
                );

            }
        );


    if (
        messageIndex ===
        -1
    ) {

        return;

    }


    deleteActionType =
        "message";

    deleteActionId =
        messageId;


    const titleElement =
        supportChatElement(
            "deleteConfirmTitle"
        );

    const textElement =
        supportChatElement(
            "deleteConfirmText"
        );

    const confirmBtn =
        supportChatElement(
            "confirmDeleteBtn"
        );


    if (titleElement) {

        titleElement.textContent =
            "Delete Message?";

    }


    if (textElement) {

        textElement.textContent =
            "This will permanently delete this message. This action cannot be undone.";

    }


    if (confirmBtn) {

        confirmBtn.textContent =
            "Delete";

    }


    const modal =
        supportChatElement(
            "deleteConfirmModal"
        );


    if (modal) {

        modal.classList.remove(
            "hidden"
        );

    }

}



// ======================================================
// SETUP MESSAGE ACTIONS
// ======================================================

function setupMessageActionEvents() {

    const messagesContainer =
        document.getElementById(
            "messages"
        );


    if (!messagesContainer) {

        console.warn(
            "Stage 6: #messages not found."
        );

        return;

    }


    // Prevent duplicate listeners.

    if (
        messagesContainer.dataset
            .stage6Ready === "true"
    ) {

        return;

    }


    messagesContainer.dataset
        .stage6Ready = "true";


    // ==========================================
    // CLOSE ACTION MENU ON OUTSIDE CLICK
    // (the menu is appended straight to
    // document.body, so any click that doesn't
    // land inside it should close it)
    // ==========================================

    document.addEventListener(
        "click",
        function(event) {

            if (!activeMessageActionMenu) {

                return;

            }


            const isInsideMenu =
                event.target.closest(
                    ".message-action-menu"
                );


            if (isInsideMenu) {

                return;

            }


            closeMessageActionMenu();

        },
        true
    );


  
    // ==========================================
    // TOUCH START
    // ==========================================

    messagesContainer.addEventListener(
        "touchstart",
        function(event) {

            const messageElement =
                getMessageElement(
                    event.target
                );


            if (!messageElement) {
                return;
            }


            const messageId =
                getMessageId(
                    messageElement
                );


            if (!messageId) {

                console.warn(
                    "Stage 6: message has no ID."
                );

                return;

            }


            messageLongPressTimer =
                setTimeout(
                    function() {

                        showMessageActionMenu(
                            messageElement,
                            messageId
                        );

                    },
                    600
                );

        },
        {
            passive: true
        }
    );


    // ==========================================
    // TOUCH END
    // ==========================================

    messagesContainer.addEventListener(
        "touchend",
        function() {

            clearTimeout(
                messageLongPressTimer
            );

            messageLongPressTimer =
                null;

        },
        {
            passive: true
        }
    );


    // ==========================================
    // TOUCH CANCEL
    // ==========================================

    messagesContainer.addEventListener(
        "touchcancel",
        function() {

            clearTimeout(
                messageLongPressTimer
            );

            messageLongPressTimer =
                null;

        },
        {
            passive: true
        }
    );


    // ==========================================
    // TOUCH MOVE
    // ==========================================

    messagesContainer.addEventListener(
        "touchmove",
        function() {

            clearTimeout(
                messageLongPressTimer
            );

            messageLongPressTimer =
                null;

        },
        {
            passive: true
        }
    );


    console.log(
        "Stage 6 message actions ready."
    );

}




// ======================================================
// INITIALIZE STAGE 6
// ======================================================

function initStage6MessageActions() {

    setupMessageActionEvents();

}

// ======================================================
// STAGE 8 — Chat actions
// 
// ======================================================

// =========================================================
// part 1:: MESSAGE SEARCH
// =========================================================




// =========================================================
// OPEN MESSAGE SEARCH
// =========================================================

function searchMessages() {

    const searchBar =
        document.getElementById(
            "messageSearchBar"
        );

    const searchInput =
        document.getElementById(
            "messageSearchInput"
        );

    if (!searchBar || !searchInput) {

        return;

    }


    /*
     * Close the chat menu if it is open.
     */

    closeChatMenu();

    closeMessagePreviewsOnUiOpen();

    /*
     * Open search bar.
     */

    searchBar.classList.remove(
        "hidden"
    );


    /*
     * Clear previous search.
     */

    searchInput.value = "";

    messageSearchResults = [];

    currentMessageSearchIndex = -1;


    /*
     * Focus search input.
     */

    setTimeout(
        function() {

            searchInput.focus();

        },
        50
    );

}


// =========================================================
// CLOSE MESSAGE SEARCH
// =========================================================

function closeMessageSearch() {

    const searchBar =
        document.getElementById(
            "messageSearchBar"
        );

    const searchInput =
        document.getElementById(
            "messageSearchInput"
        );


    if (searchBar) {

        searchBar.classList.add(
            "hidden"
        );

    }


    if (searchInput) {

        searchInput.value = "";

    }


    /*
     * Reset search state.
     */

    messageSearchResults = [];

    currentMessageSearchIndex = -1;


    /*
     * Render normal messages again.
     */

    renderMessages();

}


// =========================================================
// PERFORM MESSAGE SEARCH
// =========================================================

function performMessageSearch(
    searchTerm
) {

    messageSearchResults = [];

    currentMessageSearchIndex = -1;


    if (
        !currentChat ||
        !Array.isArray(
            currentChat.messages
        )
    ) {

        return;

    }


    const term =
        String(
            searchTerm || ""
        )
        .trim()
        .toLowerCase();


    /*
     * Empty search.
     */

    if (!term) {

        renderMessages();

        return;

    }


    /*
     * Find matching messages.
     */

    currentChat.messages.forEach(
        function(message) {

            const text =
                String(
                    message.text || ""
                );


            if (
                text
                .toLowerCase()
                .includes(term)
            ) {

                messageSearchResults.push(
                    message.id
                );

            }

        }
    );


    /*
     * No results.
     */

    if (
        messageSearchResults.length ===
        0
    ) {

        renderMessages();

        return;

    }


    /*
     * Start at the first result.
     */

    currentMessageSearchIndex = 0;


    /*
     * Render messages with
     * search highlighting.
     */

    renderMessagesWithSearch(
        term
    );


    /*
     * Scroll to first result.
     */

    scrollToMessageSearchResult();

}


// =========================================================
// RENDER MESSAGES WITH SEARCH
// =========================================================

function renderMessagesWithSearch(
    searchTerm
) {

    const container =
        supportChatElement(
            "messages"
        );


    if (
        !container ||
        !currentChat
    ) {

        return;

    }


    container.innerHTML =
        "";


    const messages =
        currentChat.messages ||
        [];


    messages.forEach(
        function(message) {

            const element =
                createMessageElement(
                    message
                );


            /*
             * Check whether this message
             * is a search result.
             */

            const isResult =
                messageSearchResults.includes(
                    message.id
                );


            if (isResult) {

                element.classList.add(
                    "message-search-result"
                );


                /*
                 * Highlight matching text.
                 */

                const textElement =
                    element.querySelector(
                        ".message-text"
                    );


                if (textElement) {

                    highlightMessageText(
                        textElement,
                        searchTerm
                    );

                }


                /*
                 * Mark the currently
                 * selected result.
                 */

                if (
                    messageSearchResults[
                        currentMessageSearchIndex
                    ] === message.id
                ) {

                    element.classList.add(
                        "message-search-current"
                    );

                }

            }


            container.appendChild(
                element
            );

        }
    );

}


// =========================================================
// HIGHLIGHT SEARCH TEXT
// =========================================================

function highlightMessageText(
    element,
    searchTerm
) {

    if (
        !element ||
        !searchTerm
    ) {

        return;

    }


    const text =
        element.textContent;


    const escapedTerm =
        searchTerm.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );


    const regex =
        new RegExp(
            "(" +
            escapedTerm +
            ")",
            "gi"
        );


    /*
     * Replace the text with
     * highlighted HTML.
     */

    element.innerHTML =
        text.replace(
            regex,
            "<mark>$1</mark>"
        );

}


// =========================================================
// SCROLL TO CURRENT SEARCH RESULT
// =========================================================

function scrollToMessageSearchResult() {

    if (
        currentMessageSearchIndex <
        0
    ) {

        return;

    }


    const messageId =
        messageSearchResults[
            currentMessageSearchIndex
        ];


    if (
        messageId === undefined
    ) {

        return;

    }


    const container =
        supportChatElement(
            "messages"
        );


    if (!container) {

        return;

    }


    const element =
        container.querySelector(
            '[data-message-id="' +
            messageId +
            '"]'
        );


    if (!element) {

        return;

    }


    element.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


// =========================================================
// NEXT SEARCH RESULT
// =========================================================

function nextMessageSearchResult() {

    if (
        messageSearchResults.length ===
        0
    ) {

        return;

    }


    currentMessageSearchIndex++;


    if (
        currentMessageSearchIndex >=
        messageSearchResults.length
    ) {

        currentMessageSearchIndex = 0;

    }


    const searchInput =
        document.getElementById(
            "messageSearchInput"
        );


    const term =
        searchInput
            ? searchInput.value.trim()
            : "";


    renderMessagesWithSearch(
        term
    );


    scrollToMessageSearchResult();

}


// =========================================================
// PREVIOUS SEARCH RESULT
// =========================================================

function previousMessageSearchResult() {

    if (
        messageSearchResults.length ===
        0
    ) {

        return;

    }


    currentMessageSearchIndex--;


    if (
        currentMessageSearchIndex <
        0
    ) {

        currentMessageSearchIndex =
            messageSearchResults.length - 1;

    }


    const searchInput =
        document.getElementById(
            "messageSearchInput"
        );


    const term =
        searchInput
            ? searchInput.value.trim()
            : "";


    renderMessagesWithSearch(
        term
    );


    scrollToMessageSearchResult();

}

// =========================================================
// MESSAGE SEARCH INPUT EVENTS
// =========================================================

function setupMessageSearchEvents() {

    const searchInput =
        document.getElementById(
            "messageSearchInput"
        );


    if (!searchInput) {

        return;

    }


    /*
     * Prevent duplicate listeners.
     */

    if (
        searchInput.dataset.searchReady ===
        "true"
    ) {

        return;

    }


    searchInput.dataset.searchReady =
        "true";


    searchInput.addEventListener(
        "input",
        function() {

            performMessageSearch(
                this.value
            );

        }
    );


    /*
     * Enter = next result.
     */

    searchInput.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                nextMessageSearchResult();

            }

        }
    );


    /*
     * Escape = close search.

     */

    searchInput.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key ===
                "Escape"
            ) {

                closeMessageSearch();

            }

        }
    );

}


// ======================================================
// INITIALIZE MESSAGE SEARCH
// ======================================================

function initializeMessageSearch() {

    setupMessageSearchEvents();

}

// =========================================================
// part 2::  TOGGLE CHAT MUTE
// =========================================================

function toggleChatMute() {

    /*
     * Make sure a chat is currently open.
     */

    if (!currentChat) {

        return;

    }


    /*
     * Toggle mute state.
     */

    currentChat.muted =
        !currentChat.muted;


    /*
     * Close the chat menu.
     */

    closeChatMenu();


    /*
     * Update the chat list.
     */

    if (
        currentChatType ===
        "individual"
    ) {

        renderIndividualChats();

    }
    else {

        renderGroups();

    }


    /*
     * Update the menu text/icon.
     */

    updateChatMuteMenu();


}

// =========================================================
// UPDATE CHAT MUTE MENU
// =========================================================

function updateChatMuteMenu() {

    const icon =
        document.getElementById(
            "chatMuteIcon"
        );

    const text =
        document.getElementById(
            "chatMuteText"
        );


    if (
        !icon ||
        !text ||
        !currentChat
    ) {

        return;

    }


    if (
        currentChat.muted
    ) {

        icon.className =
            "fa-solid fa-bell";

        text.textContent =
            "Unmute Notifications";

    }
    else {

        icon.className =
            "fa-solid fa-bell-slash";

        text.textContent =
            "Mute Notifications";

    }

}

// ======================================================
// TYPING INDICATOR
// ======================================================

let typingIndicatorTimeout = null;
let typingIndicatorChatId = null;


function showTypingIndicator(chatId, userName) {

    const typingElement =
        supportChatElement("typing");

    const typingTextElement =
        supportChatElement("typingText");

    if (!typingElement) {

        return;

    }

    if (typingTextElement) {

        typingTextElement.textContent =
            (userName || "User") + " is typing...";

    }

    typingIndicatorChatId = chatId;

    typingElement.classList.remove("hidden");

    scrollMessagesToBottom();

}


function hideTypingIndicator() {

    const typingElement =
        supportChatElement("typing");

    if (typingElement) {

        typingElement.classList.add("hidden");

    }

    typingIndicatorChatId = null;

    if (typingIndicatorTimeout) {

        clearTimeout(typingIndicatorTimeout);

        typingIndicatorTimeout = null;

    }

}


function simulateTypingReply(chatId, userName) {

    if (typingIndicatorTimeout) {

        clearTimeout(typingIndicatorTimeout);

    }

    const delay =
        1200 + Math.floor(Math.random() * 1500);

    typingIndicatorTimeout =
        setTimeout(
            function() {

                if (
                    currentChat &&
                    currentChat.id === chatId &&
                    currentChatType === "individual"
                ) {

                    showTypingIndicator(chatId, userName);

                    typingIndicatorTimeout =
                        setTimeout(
                            function() {

                                hideTypingIndicator();

                            },
                            2000 + Math.floor(Math.random() * 1500)
                        );

                }

            },
            delay
        );

}



// =========================================================
// part 3::  PIN MESSAGES
// =========================================================

// =========================================================
// Open PIN MESSAGES
// =========================================================

function openPinMessages() {

    /*
     * Make sure a chat is currently open.
     */

    if (!currentChat) {

        return;

    }


    /*
     * Close the chat menu.
     */

    closeChatMenu();


    /*
     * Get the modal.
     */

    const modal =
        document.getElementById(
            "pinMessagesModal"
        );


    if (!modal) {

        console.error(
            "pinMessagesModal element not found"
        );

        return;

    }


    /*
     * Open the modal.
     */

    modal.classList.remove(
        "hidden"
    );

}


// =========================================================
// CLOSE PIN MESSAGES
// =========================================================

function closePinMessages() {

    const modal =
        document.getElementById(
            "pinMessagesModal"
        );


    if (!modal) {

        return;

    }


    modal.classList.add(
        "hidden"
    );

}

// =========================================================
// WRITE PIN MESSAGE
// =========================================================

// =========================================================
// OPEN WRITE PIN MESSAGE
// =========================================================

function openWritePinMessage() {

    /*
     * Make sure a chat is open.
     */

    if (!currentChat) {

        return;

    }


    /*
     * Close the options modal.
     */

    closePinMessages();


    /*
     * Get the write modal.
     */

    const modal =
        document.getElementById(
            "writePinMessageModal"
        );


    const input =
        document.getElementById(
            "pinMessageInput"
        );


    if (!modal || !input) {

        console.error(
            "Write pin message elements not found"
        );

        return;

    }


    /*
     * Clear previous message.
     */

    input.value = "";


    /*
     * Reset character count.
     */

    updatePinMessageCharacterCount();


    /*
     * Open modal.
     */

    modal.classList.remove(
        "hidden"
    );


    /*
     * Focus input.
     */

    setTimeout(
        function() {

            input.focus();

        },
        50
    );

}

// =========================================================
// CLOSE WRITE PIN MESSAGE
// =========================================================

function closeWritePinMessage() {

    const modal =
        document.getElementById(
            "writePinMessageModal"
        );


    if (!modal) {

        return;

    }


    modal.classList.add(
        "hidden"
    );


    const input =
        document.getElementById(
            "pinMessageInput"
        );


    if (input) {

        input.value = "";

    }


    updatePinMessageCharacterCount();

}

// =========================================================
// UPDATE PIN MESSAGE CHARACTER COUNT
// =========================================================

function updatePinMessageCharacterCount() {

    const input =
        document.getElementById(
            "pinMessageInput"
        );


    const counter =
        document.getElementById(
            "pinMessageCharacterCount"
        );


    if (!input || !counter) {

        return;

    }


    counter.textContent =
        input.value.length;

}

// =========================================================
// SETUP PIN MESSAGE INPUT
// =========================================================

function setupPinMessageInput() {

    const input =
        document.getElementById(
            "pinMessageInput"
        );


    if (!input) {

        return;

    }


    /*
     * Prevent duplicate listener.
     */

    if (
        input.dataset.pinInputReady ===
        "true"
    ) {

        return;

    }


    input.dataset.pinInputReady =
        "true";


    input.addEventListener(
        "input",
        function() {

            updatePinMessageCharacterCount();

        }
    );

}

// =========================================================
// CREATE PINNED MESSAGE
// =========================================================

function createPinnedMessage() {

    /*
     * Make sure a chat is open.
     */

    if (!currentChat) {

        return;

    }


    /*
     * Get input.
     */

    const input =
        document.getElementById(
            "pinMessageInput"
        );


    if (!input) {

        return;

    }


    /*
     * Get message text.
     */

    const text =
        input.value.trim();


    /*
     * Do not allow empty messages.
     */

    if (!text) {

        input.focus();

        return;

    }


    /*
     * Make sure messages exists.
     */

    if (
        !Array.isArray(
            currentChat.messages
        )
    ) {

        currentChat.messages = [];

    }


    /*
     * Make sure pinned messages
     * exists for this chat.
     */

    if (
        !Array.isArray(
            currentChat.pinnedMessages
        )
    ) {

        currentChat.pinnedMessages = [];

    }


    /*
     * Create a new message.
     */

    const message = {

        id:
            "MSG-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 8),

        text:
            text,

        sent:
            true,

        read:
            true,

        edited:
            false,

        time:
            getCurrentMessageTime(),

        senderName:
            "Admin",

        pinned:
            true

    };


    /*
     * Add message to chat.
     */

    currentChat.messages.push(
        message
    );


    /*
     * Add message to pinned messages.
     */

    currentChat.pinnedMessages.push(
        message.id
    );


    /*
     * Close modal.
     */

    closeWritePinMessage();


    /*
     * Update chat preview.
     */

    updateChatLastMessage(
        currentChat
    );


    /*
     * Render messages.
     */

    renderMessages();


    /*
     * Update chat list.
     */

    if (
        currentChatType ===
        "individual"
    ) {

        renderIndividualChats();

    }
    else {

        renderGroups();

    }


    /*
     * Scroll to the new message.
     */

    scrollMessagesToBottom();

}



// =========================================================
// SELECT EXISTING PINNED MESSAGES
// =========================================================

// =========================================================
// START SELECT PINNED MESSAGES
// =========================================================

function startSelectPinnedMessages() {

    /*
     * Make sure a chat is open.
     */

    if (!currentChat) {

        return;

    }


    /*
     * Close the Pin Messages options.
     */

    closePinMessages();


    /*
     * Start selection mode.
     */

    pinMessageSelectionMode = true;


    /*
     * Clear previous selections.
     */

    selectedPinMessageIds = [];


    /*
     * Render messages in selection mode.
     */

    renderMessages();

}

// =========================================================
// CANCEL PIN MESSAGE SELECTION
// =========================================================

function cancelPinMessageSelection() {

    pinMessageSelectionMode = false;

    selectedPinMessageIds = [];

    updatePinMessageSelectionBar();


    renderMessages();

}

// ======================================================
// CANCEL PIN MESSAGE SELECTION ON OUTSIDE CLICK
// ======================================================

function setupPinSelectionOutsideClick() {

    document.addEventListener(
        "click",
        function(event) {

            if (!pinMessageSelectionMode) {

                return;

            }


            const isInsideSelectionUI =
                event.target.closest(
                    "#pinMessageSelectionBar, .message"
                );


            if (isInsideSelectionUI) {

                return;

            }


            cancelPinMessageSelection();

        },
        true
    );

}

// =========================================================
// TOGGLE PIN MESSAGE SELECTION
// =========================================================

function togglePinMessageSelection(
    messageId
) {

    if (
        !pinMessageSelectionMode
    ) {

        return;

    }


    const index =
        selectedPinMessageIds.indexOf(
            messageId
        );


    /*
     * Already selected.
     * Remove it.
     */

    if (
        index !== -1
    ) {

        selectedPinMessageIds.splice(
            index,
            1
        );

    }

    /*
     * Not selected.
     * Add it.
     */

    else {

        selectedPinMessageIds.push(
            messageId
        );

    }


    /*
     * Re-render the messages
     * to update the selection UI.
     */

    renderMessages();

}

// =========================================================
// UPDATE PIN MESSAGE SELECTION BAR
// =========================================================

function updatePinMessageSelectionBar() {

    const bar =
        document.getElementById(
            "pinMessageSelectionBar"
        );


    const count =
        document.getElementById(
            "selectedPinMessageCount"
        );


    if (!bar || !count) {

        return;

    }


    /*
     * Not in selection mode.
     */

    if (
        !pinMessageSelectionMode
    ) {

        bar.classList.add(
            "hidden"
        );

        return;

    }


    /*
     * Show selection bar.
     */

    bar.classList.remove(
        "hidden"
    );


    count.textContent =
        selectedPinMessageIds.length;

}

// =========================================================
// PIN SELECTED MESSAGES
// =========================================================

function pinSelectedMessages() {

    if (
        !currentChat
    ) {

        return;

    }


    /*
     * Nothing selected.
     */

    if (
        selectedPinMessageIds.length ===
        0
    ) {

        return;

    }


    /*
     * Make sure pinnedMessages exists.
     */

    if (
        !Array.isArray(
            currentChat.pinnedMessages
        )
    ) {

        currentChat.pinnedMessages = [];

    }


    /*
     * Add each selected message.
     */

    selectedPinMessageIds.forEach(
        function(messageId) {

            /*
             * Don't add the same message twice.
             */

            if (
                !currentChat.pinnedMessages.includes(
                    messageId
                )
            ) {

                currentChat.pinnedMessages.push(
                    messageId
                );

            }


            /*
             * Find the actual message.
             */

            const message =
                currentChat.messages.find(
                    function(item) {

                        return (
                            item.id ===
                            messageId
                        );

                    }
                );


            /*
             * Mark it as pinned.
             */

            if (message) {

                message.pinned = true;

            }

        }
    );


    /*
     * Exit selection mode.
     */

    pinMessageSelectionMode =
        false;


    selectedPinMessageIds = [];


    /*
     * Render normal messages.
     */

    renderMessages();

}

// =========================================================
// GET CURRENT CHAT PINNED MESSAGES
// =========================================================

function getPinnedMessages() {

    if (
        !currentChat ||
        !Array.isArray(
            currentChat.pinnedMessages
        ) ||
        !Array.isArray(
            currentChat.messages
        )
    ) {

        return [];

    }


    return currentChat.pinnedMessages
        .map(
            function(messageId) {

                return currentChat.messages.find(
                    function(message) {

                        return (
                            message.id ===
                            messageId
                        );

                    }
                );

            }
        )
        .filter(
            function(message) {

                return !!message;

            }
        );

}

// =========================================================
// UPDATE PINNED MESSAGE BAR
// =========================================================

function updatePinnedMessageBar() {

    const bar =
        document.getElementById(
            "pinnedMessageBar"
        );


    console.log(
        "PIN BAR 1: bar =",
        bar
    );


    const textElement =
        document.getElementById(
            "pinnedMessageText"
        );


    console.log(
        "PIN BAR 2: textElement =",
        textElement
    );


    const counter =
        document.getElementById(
            "pinnedMessageCounter"
        );


    console.log(
    "PIN BAR 3: counter =",
    counter
);


console.log(
    "PIN BAR CHECK: pinnedMessageBar exists =",
    !!bar
);


console.log(
    "PIN BAR CHECK: pinnedMessageText exists =",
    !!textElement
);


console.log(
    "PIN BAR CHECK: pinnedMessageCounter exists =",
    !!counter
);


    if (
        !bar ||
        !textElement ||
        !counter
    ) {

        console.log(
            "PIN BAR ERROR: Missing pinned message bar element"
        );

        return;

    }


    console.log(
        "PIN BAR 3A: About to call getPinnedMessages()"
    );


    const pinnedMessages =
        getPinnedMessages();


    console.log(
        "PIN BAR 3B: getPinnedMessages() returned"
    );


    console.log(
        "PIN BAR 3C: pinnedMessages =",
        pinnedMessages
    );

console.log(
    "PIN BAR 3D: pinnedMessages.length =",
    pinnedMessages.length
);
    /*
     * No pinned messages.
     */

    if (
        pinnedMessages.length ===
        0
    ) {

        bar.classList.add(
            "hidden"
        );

        currentPinnedMessageIndex =
            0;

        return;

    }


    /*
     * Make sure the index
     * is valid.
     */

    if (
        currentPinnedMessageIndex >=
        pinnedMessages.length
    ) {

        currentPinnedMessageIndex =
            pinnedMessages.length - 1;

    }


    if (
        currentPinnedMessageIndex < 0
    ) {

        currentPinnedMessageIndex =
            0;

    }


    const message =
        pinnedMessages[
            currentPinnedMessageIndex
        ];


    /*
     * Display message.
     */

    textElement.textContent =
        message.text ||
        "";


    /*
     * Display counter.
     */

    counter.textContent =
        (
            currentPinnedMessageIndex +
            1
        ) +
        " of " +
        pinnedMessages.length;


    /*
     * Show bar.
     */

    bar.classList.remove(
        "hidden"
    );

	  // =====================================================
// CREATE PINNED MESSAGE MENU BUTTON
// =====================================================

let menuButton =
    document.getElementById(
        "pinnedMessageMenu"
    );


if (!menuButton) {

    menuButton =
        document.createElement(
            "button"
        );


    menuButton.type =
        "button";


    menuButton.id =
        "pinnedMessageMenu";


    menuButton.className =
        "pinned-message-menu";


    menuButton.innerHTML =
        '<i class="fa-solid fa-ellipsis-vertical"></i>';


    menuButton.addEventListener(
        "click",
        function(event) {

            openPinnedMessageMenu(
                event
            );

        }
    );


    bar.appendChild(
        menuButton
    );

}

    /*
     * Update navigation buttons.
     */

    updatePinnedMessageNavigation(
        pinnedMessages.length
    );

}

// =========================================================
// UPDATE PINNED MESSAGE NAVIGATION
// =========================================================

function updatePinnedMessageNavigation(
    total
) {

    const previousButton =
        document.getElementById(
            "previousPinnedMessage"
        );


    const nextButton =
        document.getElementById(
            "nextPinnedMessage"
        );


    if (
        !previousButton ||
        !nextButton
    ) {

        return;

    }


    /*
     * Hide navigation when
     * there is only one message.
     */

    if (
        total <= 1
    ) {

        previousButton.style.display =
            "none";

        nextButton.style.display =
            "none";

        return;

    }


    previousButton.style.display =
        "flex";

    nextButton.style.display =
        "flex";

}

// =========================================================
// NEXT PINNED MESSAGE
// =========================================================

function nextPinnedMessage() {

    const pinnedMessages =
        getPinnedMessages();


    if (
        pinnedMessages.length <= 1
    ) {

        return;

    }


    currentPinnedMessageIndex++;


    if (
        currentPinnedMessageIndex >=
        pinnedMessages.length
    ) {

        currentPinnedMessageIndex =
            0;

    }


    updatePinnedMessageBar();

}

// =========================================================
// PREVIOUS PINNED MESSAGE
// =========================================================

function previousPinnedMessage() {

    const pinnedMessages =
        getPinnedMessages();


    if (
        pinnedMessages.length <= 1
    ) {

        return;

    }


    currentPinnedMessageIndex--;


    if (
        currentPinnedMessageIndex <
        0
    ) {

        currentPinnedMessageIndex =
            pinnedMessages.length - 1;

    }


    updatePinnedMessageBar();

}

// =========================================================
// VIEW PINNED MESSAGE
// =========================================================



// =========================================================
// OPEN PINNED MESSAGE MENU
// =========================================================

// =========================================================
// OPEN PINNED MESSAGE MENU
// =========================================================

function openPinnedMessageMenu(
    event
) {

    if (event) {

        event.stopPropagation();

    }


    /*
     * Make sure a chat is open.
     */

    if (!currentChat) {

        return;

    }


    /*
     * Get pinned messages.
     */

    const pinnedMessages =
        getPinnedMessages();


    if (
        pinnedMessages.length ===
        0
    ) {

        return;

    }


    /*
     * Remove any existing menu.
     */

    const existingMenu =
        document.getElementById(
            "pinnedMessageActionMenu"
        );


    if (existingMenu) {

        existingMenu.remove();

        return;

    }


    /*
     * Create the menu.
     */

    const menu =
        document.createElement(
            "div"
        );


    menu.id =
        "pinnedMessageActionMenu";


    menu.className =
        "pinned-message-action-menu";


    /*
     * Create Unpin button.
     */

    const unpinButton =
        document.createElement(
            "button"
        );


    unpinButton.type =
        "button";


    unpinButton.innerHTML =
        '<i class="fa-solid fa-thumbtack"></i>' +
        '<span>Unpin message</span>';


    /*
     * Unpin action.
     */

    unpinButton.addEventListener(
        "click",
        function(event) {

            event.stopPropagation();


            /*
             * Remove the menu.
             */

            menu.remove();


            /*
             * Unpin the current
             * pinned message.
             */

            unpinCurrentPinnedMessage();

        }
    );


    /*
     * Add button to menu.
     */

    menu.appendChild(
        unpinButton
    );


    /*
     * Add menu to page.
     */

    document.body.appendChild(
        menu
    );


    /*
     * Position menu near
     * the three-dot button.
     */

    if (event && event.currentTarget) {

        const button =
            event.currentTarget;


        const rect =
            button.getBoundingClientRect();


        menu.style.position =
            "fixed";


        menu.style.top =
            (
                rect.bottom +
                5
            ) +
            "px";


        menu.style.right =
            (
                window.innerWidth -
                rect.right
            ) +
            "px";

    }


    /*
     * Close menu when clicking
     * somewhere else.
     */

    setTimeout(
        function() {

            document.addEventListener(
                "click",
                closePinnedMessageActionMenu,
                {
                    once: true
                }
            );

        },
        0
    );

}


// =========================================================
// CLOSE PINNED MESSAGE ACTION MENU
// =========================================================

function closePinnedMessageActionMenu() {

    const menu =
        document.getElementById(
            "pinnedMessageActionMenu"
        );


    if (menu) {

        menu.remove();

    }

}


// =========================================================
// SCROLL TO CURRENT PINNED MESSAGE
// =========================================================

// =========================================================
// SCROLL TO CURRENT PINNED MESSAGE
// =========================================================

function scrollToCurrentPinnedMessage() {

    if (!currentChat) {

        return;

    }


    const pinnedMessages =
        getPinnedMessages();


    if (
        pinnedMessages.length === 0
    ) {

        return;

    }


    /*
     * Make sure the current index
     * is valid.
     */

    if (
        currentPinnedMessageIndex < 0
    ) {

        currentPinnedMessageIndex = 0;

    }


    if (
        currentPinnedMessageIndex >=
        pinnedMessages.length
    ) {

        currentPinnedMessageIndex =
            pinnedMessages.length - 1;

    }


    /*
     * Get the current pinned message.
     */

    const message =
        pinnedMessages[
            currentPinnedMessageIndex
        ];


    if (!message) {

        return;

    }


    /*
     * Get messages container.
     */

    const messagesContainer =
        supportChatElement(
            "messages"
        );


    if (!messagesContainer) {

        return;

    }


    /*
     * Find the actual message
     * element.
     */

    const messageElement =
        messagesContainer.querySelector(
            '[data-message-id="' +
            message.id +
            '"]'
        );


    if (!messageElement) {

        return;

    }


    /*
     * Remove previous pinned
     * highlight if one exists.
     */

    const oldHighlight =
        messagesContainer.querySelector(
            ".pinned-message-highlight"
        );


    if (oldHighlight) {

        oldHighlight.classList.remove(
            "pinned-message-highlight"
        );

    }


    /*
     * Scroll to the pinned message.
     */

    messageElement.scrollIntoView({

        behavior:
            "smooth",

        block:
            "center"

    });


    /*
     * Highlight the message.
     */

    messageElement.classList.add(
        "pinned-message-highlight"
    );


    /*
     * Remove highlight after
     * 1.5 seconds.
     */

    setTimeout(
        function() {

            messageElement.classList.remove(
                "pinned-message-highlight"
            );

        },
        3500
    );

}

// =========================================================
// UNPIN CURRENT PINNED MESSAGE
// =========================================================

function unpinCurrentPinnedMessage() {

    if (
        !currentChat
    ) {

        return;

    }


    if (
        !Array.isArray(
            currentChat.pinnedMessages
        )
    ) {

        return;

    }


    const pinnedMessages =
        getPinnedMessages();


    if (
        pinnedMessages.length ===
        0
    ) {

        return;

    }


    const message =
        pinnedMessages[
            currentPinnedMessageIndex
        ];


    if (!message) {

        return;

    }


    /*
     * Remove the ID from
     * pinnedMessages.
     */

    currentChat.pinnedMessages =
        currentChat.pinnedMessages.filter(
            function(messageId) {

                return (
                    messageId !==
                    message.id
                );

            }
        );


    /*
     * Mark the message
     * as no longer pinned.
     */

    message.pinned =
        false;


    /*
     * Correct the index.
     */

    const remaining =
        currentChat.pinnedMessages.length;


    if (
        currentPinnedMessageIndex >=
        remaining
    ) {

        currentPinnedMessageIndex =
            Math.max(
                remaining - 1,
                0
            );

    }

	  /*
 * Re-render messages.
 */

renderMessages();


/*
 * Update pinned message bar.
 */

updatePinnedMessageBar();


}


// =========================================================
// Part 4:: MARK CURRENT CHAT AS UNREAD
// =========================================================

function markChatUnread() {

    /*
     * Make sure a chat is currently open.
     */

    if (!currentChat) {

        return;

    }


    /*
     * Mark the chat as unread.
     */

    currentChat.unread = 1;


    /*
     * Make sure the chat has messages.
     */

    if (
        Array.isArray(
            currentChat.messages
        ) &&
        currentChat.messages.length > 0
    ) {

        /*
         * Find the latest message.
         */

        const lastMessage =
            currentChat.messages[
                currentChat.messages.length - 1
            ];


        /*
         * Mark the latest message
         * as unread.
         */

        if (lastMessage) {

            lastMessage.read =
                false;

        }

    }


    /*
     * Update the chat list.
     */

    if (
        currentChatType ===
        "individual"
    ) {

        renderIndividualChats();

    }
    else if (
        currentChatType ===
        "group"
    ) {

        renderGroups();

    }


    /*
     * Update global unread counts.
     */

    updateUnreadCounts();


    /*
     * Close the chat menu.
     */

    closeChatMenu();

}


// =========================================================
// Part 6:: CLEAR MESSAGES
// =========================================================

// =========================================================
// CLEAR CURRENT CHAT MESSAGES
// =========================================================

function clearChatMessages() {

    /*
     * Make sure a chat is currently open.
     */

    if (!currentChat) {

        return;

    }


    /*
     * Close the chat menu.
     */

    closeChatMenu();


    /*
     * Open the clear messages
     * confirmation dialog.
     */

    openClearMessagesConfirmation();

}

// =========================================================
// OPEN CLEAR MESSAGES CONFIRMATION
// =========================================================

function openClearMessagesConfirmation() {

    /*
     * Make sure a chat is open.
     */

    if (!currentChat) {

        return;

    }


    /*
     * Create the confirmation
     * container.
     */

    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "clearMessagesConfirmation";


    overlay.className =
        "clear-messages-confirmation";


    /*
     * Create the dialog.
     */

    overlay.innerHTML =

        '<div class="clear-messages-dialog">' +

            '<div class="clear-messages-dialog-icon">' +
                '<i class="fa-solid fa-trash"></i>' +
            '</div>' +

            '<h3>Clear messages?</h3>' +

            '<p>' +
                'All messages in this chat will be removed.' +
            '</p>' +

            '<div class="clear-messages-dialog-actions">' +

                '<button ' +
                    'type="button" ' +
                    'class="clear-messages-cancel" ' +
                    'id="cancelClearMessages">' +
                    'Cancel' +
                '</button>' +

                '<button ' +
                    'type="button" ' +
                    'class="clear-messages-confirm" ' +
                    'id="confirmClearMessages">' +
                    'Clear messages' +
                '</button>' +

            '</div>' +

        '</div>';


    /*
     * Add confirmation to page.
     */

    document.body.appendChild(
        overlay
    );


    /*
     * Cancel button.
     */

    const cancelButton =
        document.getElementById(
            "cancelClearMessages"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            function() {

                closeClearMessagesConfirmation();

            }
        );

    }


    /*
     * Confirm button.
     */

    const confirmButton =
        document.getElementById(
            "confirmClearMessages"
        );


    if (confirmButton) {

        confirmButton.addEventListener(
            "click",
            function() {

                confirmClearChatMessages();

            }
        );

    }


    /*
     * Close when clicking
     * the dark background.
     */

    overlay.addEventListener(
        "click",
        function(event) {

            if (
                event.target ===
                overlay
            ) {

                closeClearMessagesConfirmation();

            }

        }
    );

}

// =========================================================
// CONFIRM CLEAR CHAT MESSAGES
// =========================================================

function confirmClearChatMessages() {

    /*
     * Make sure a chat is open.
     */

    if (!currentChat) {

        closeClearMessagesConfirmation();

        return;

    }


    /*
     * Clear all messages.
     */

    currentChat.messages = [];
     currentChat.unread = 0;

    /*
     * Clear pinned messages too.
     */

    currentChat.pinnedMessages = [];


    /*
     * Reset pinned message index.
     */

    currentPinnedMessageIndex =
        0;


    /*
     * Exit pin selection mode.
     */

    pinMessageSelectionMode =
        false;


    selectedPinMessageIds =
        [];


    /*
     * Render the empty chat.
     */

    renderMessages();


    /*
     * Update pinned message bar.
     */

    updatePinnedMessageBar();


    /*
     * Update pin selection bar.
     */

    updatePinMessageSelectionBar();


    /*
     * Update chat preview.
     */

    updateChatLastMessage(
        currentChat
    );


    /*
     * Refresh chat list.
     */

    if (
        currentChatType ===
        "individual"
    ) {

        renderIndividualChats();

    }
    else {

        renderGroups();

    }


    /*
     * Update unread counts.
     */

    updateUnreadCounts();


    /*
     * Close confirmation.

     */

    closeClearMessagesConfirmation();

}

// =========================================================
// CLOSE CLEAR MESSAGES CONFIRMATION
// =========================================================

function closeClearMessagesConfirmation() {

    const overlay =
        document.getElementById(
            "clearMessagesConfirmation"
        );


    if (!overlay) {

        return;

    }


    overlay.remove();

}


// =========================================================
// Part 7:: DELETE CURRENT CHAT
// =========================================================



// ======================================================
// GLOBAL ACCESS
// ======================================================

window.setupMessageActionEvents =
    setupMessageActionEvents;

window.initStage6MessageActions =
    initStage6MessageActions;

window.closeMessageActionMenu =
    closeMessageActionMenu;

window.searchMessages =
    searchMessages;

window.closeMessageSearch =
    closeMessageSearch;

window.nextMessageSearchResult =
    nextMessageSearchResult;

window.previousMessageSearchResult =
    previousMessageSearchResult;

window.toggleChatMute =
    toggleChatMute;
// ======================================================
// 59. GLOBAL EDIT FUNCTIONS
// ======================================================

window.startEditMessage =
    startEditMessage;


window.cancelEditMessage =
    cancelEditMessage;


window.saveEditedMessage =
    saveEditedMessage;


window.isEditingMessage =
    isEditingMessage;

window.copyMessage =
    copyMessage;


window.deleteMessage =
    deleteMessage;


// ======================================================
// 86. REPLY GLOBAL ACCESS
// ======================================================

window.replyToMessage =
    replyToMessage;


window.showReplyPreview =
    showReplyPreview;


window.closeReplyPreview =
    closeReplyPreview;


window.cancelReply =
    cancelReply;


window.sendReplyMessage =
    sendReplyMessage;


window.sendCurrentReply =
    sendCurrentReply;


window.handleReplyAction =
    handleReplyAction;


window.scrollToMessage =
    scrollToMessage;


window.openRepliedMessage =
    openRepliedMessage;


window.isReplying =
    isReplying;


window.getReplyingMessage =
    getReplyingMessage;


window.setupReplyPreviewEvents =
    setupReplyPreviewEvents;



// ======================================================
// 69. MESSAGE ENGINE GLOBAL ACCESS
// ======================================================

window.sendMessage =
    sendMessage;


window.handleMessageInputKeydown =
    handleMessageInputKeydown;


window.getMessageText =
    getMessageText;


window.clearMessageInput =
    clearMessageInput;


window.initializeMessageEngine =
    initializeMessageEngine;



// ======================================================
// GLOBAL ACCESS — CREATE GROUP
// ======================================================

window.openCreateGroupModal =
    openCreateGroupModal;


window.closeCreateGroupModal =
    closeCreateGroupModal;


window.createGroup =
    createGroup;


window.searchGroupMembers =
    searchGroupMembers;

// ======================================================
// SUPPORT CHAT GLOBAL FUNCTIONS
// ======================================================

window.showIndividualChats =
    showIndividualChats;

window.showGroups =
    showGroups;

window.openIndividualChat =
    openIndividualChat;

window.openGroupChat =
    openGroupChat;

window.closeChat =
    closeChat;

window.openNewChatModal =
    openNewChatModal;

window.closeNewChatModal =
    closeNewChatModal;

window.openCreateGroupModal =
    openCreateGroupModal;

window.closeCreateGroupModal =
    closeCreateGroupModal;

window.filterChats =
    filterChats;

window.filterGroups =
    filterGroups;
    

// =========================================================
// GLOBAL CHAT FUNCTIONS
// Required for HTML onclick="" handlers
// =========================================================

window.toggleChatMenu = toggleChatMenu;
window.closeChatMenu = closeChatMenu;
window.sendMessage = sendMessage;



// ==========================================================================
// SUPPORT CHAT SYSTEM
// STAGE 7 — ATTACHMENTS, EMOJI & VOICE MESSAGES
// ==========================================================================

// ======================================================
// TOGGLE ATTACHMENT MENU
// ======================================================

function toggleAttachmentMenu() {

  if (
        editingMessage
    ) {

        cancelEditMessage();

    }

    const menu =
        supportChatElement(
            "attachmentMenu"
        );


    if (!menu) {

        return;

    }


    const isOpening =
        menu.classList.contains(
            "hidden"
        );


    if (isOpening) {

        

        menu.classList.remove(
            "hidden"
        );

        attachmentMenuOpen =
            true;

    }
    else {

        closeAttachmentMenu();

    }

}


// ======================================================
// CLOSE ATTACHMENT MENU
// ======================================================

function closeAttachmentMenu() {

    const menu =
        supportChatElement(
            "attachmentMenu"
        );


    if (menu) {

        menu.classList.add(
            "hidden"
        );

    }


    attachmentMenuOpen =
        false;

}


// ======================================================
// ATTACH PHOTO
// ======================================================

function attachPhoto() {

    closeAttachmentMenu();


    const input =
        supportChatElement(
            "photoInput"
        );


    if (input) {

        input.click();

    }

}


// ======================================================
// ATTACH DOCUMENT
// ======================================================

function attachDocument() {

    closeAttachmentMenu();


    const input =
        supportChatElement(
            "documentInput"
        );


    if (input) {

        input.click();

    }

}


// ======================================================
// ATTACH CAMERA
// ======================================================

function attachCamera() {

    closeAttachmentMenu();


    const input =
        supportChatElement(
            "cameraInput"
        );


    if (input) {

        input.click();

    }

}


// ======================================================
// CHOOSE GROUP PHOTO
// ======================================================

function chooseGroupPhoto() {

    const input =
        supportChatElement(
            "groupPhotoInput"
        );


    if (input) {

        input.click();

    }

}


// ======================================================
// SEND AN ATTACHMENT AS A MESSAGE
// (no upload backend exists, so the attachment
// is represented as a labeled text message)
// ======================================================

function sendAttachmentMessage(
    label,
    type,
    fileData
) {

    if (!currentChat) {

        return;

    }


        const message =
        prepareMessageForSend(
            label,
            type,
            fileData
        );


    const added =
        addMessageToCurrentChat(
            message
        );


    if (!added) {

        return;

    }

       if (
        replyingToMessage
    ) {

        replyingToMessage =
            null;

        closeReplyPreview();

    }


    if (
        currentChatType ===
        "individual"
    ) {

        updateIndividualChatPreview(
            currentChat,
            message
        );


        moveIndividualChatToTop(
            currentChat
        );

    }
    else {

        updateGroupChatPreview(
            currentChat,
            message
        );

    }


    renderMessages();


    if (
        currentChatType ===
        "individual"
    ) {

        renderIndividualChats();

    }
    else {

        renderGroups();

    }


    updateUnreadCounts();


    scrollMessagesToBottom();

}


// ======================================================
// HANDLE FILE INPUT CHANGE
// ======================================================

function handleAttachmentFileChange(
    event,
    icon
) {

    const files =
        event.target.files;


    if (
        !files ||
        files.length === 0
    ) {

        return;

    }


    const file =
        files[0];

    const fileUrl =
        URL.createObjectURL(
            file
        );


    sendAttachmentMessage(
        icon +
        " " +
        file.name,
        "attachment",
        {
            fileUrl:
                fileUrl,

            fileName:
                file.name,

            fileMime:
                file.type
        }
    );


    /*
     * Reset the input so selecting the
     * same file again still fires "change".
     */

    event.target.value =
        "";

}


// ======================================================
// HANDLE GROUP PHOTO INPUT CHANGE
// ======================================================

function handleGroupPhotoChange(
    event
) {

    const files =
        event.target.files;


    if (
        !files ||
        files.length === 0
    ) {

        return;

    }


    const file =
        files[0];


    const reader =
        new FileReader();


    reader.onload =
        function(loadEvent) {

            selectedGroupPhoto =
                loadEvent.target.result;


            const preview =
                supportChatElement(
                    "newGroupAvatar"
                );


            if (preview) {

                preview.innerHTML =
                    '<img src="' +
                    selectedGroupPhoto +
                    '" alt="Group">';

            }

        };


    reader.readAsDataURL(
        file
    );


    event.target.value =
        "";

}


// ======================================================
// SETUP ATTACHMENT EVENTS
// ======================================================

function setupAttachmentEvents() {

    const photoInput =
        supportChatElement(
            "photoInput"
        );


    const documentInput =
        supportChatElement(
            "documentInput"
        );


    const cameraInput =
        supportChatElement(
            "cameraInput"
        );


    const groupPhotoInput =
        supportChatElement(
            "groupPhotoInput"
        );


    if (
        photoInput &&
        !photoInput.dataset.ready
    ) {

        photoInput.addEventListener(
            "change",
            function(event) {

                handleAttachmentFileChange(
                    event,
                    "📷 Photo:"
                );

            }
        );


        photoInput.dataset.ready =
            "true";

    }


    if (
        documentInput &&
        !documentInput.dataset.ready
    ) {

        documentInput.addEventListener(
            "change",
            function(event) {

                handleAttachmentFileChange(
                    event,
                    "📄 Document:"
                );

            }
        );


        documentInput.dataset.ready =
            "true";

    }


    if (
        cameraInput &&
        !cameraInput.dataset.ready
    ) {

        cameraInput.addEventListener(
            "change",
            function(event) {

                handleAttachmentFileChange(
                    event,
                    "📷 Photo:"
                );

            }
        );


        cameraInput.dataset.ready =
            "true";

    }


    if (
        groupPhotoInput &&
        !groupPhotoInput.dataset.ready
    ) {

        groupPhotoInput.addEventListener(
            "change",
            handleGroupPhotoChange
        );


        groupPhotoInput.dataset.ready =
            "true";

    }


    /*
     * Close the attachment menu when
     * clicking anywhere outside it.
     */

    document.addEventListener(
        "click",
        function(event) {

            if (!attachmentMenuOpen) {

                return;

            }


            const menu =
                supportChatElement(
                    "attachmentMenu"
                );


            if (!menu) {

                return;

            }


            const clickedInsideMenu =
                menu.contains(
                    event.target
                );


            const clickedToggleButton =
                event.target.closest(
                    '[onclick="toggleAttachmentMenu()"]'
                );


            if (
                !clickedInsideMenu &&
                !clickedToggleButton
            ) {

                closeAttachmentMenu();

            }

        }
    );

}


// ======================================================
// EMOJI PICKER — EMOJI LIST
// ======================================================




// ======================================================
// TOGGLE EMOJI PICKER
// ======================================================




// ======================================================
// CLOSE EMOJI PICKER
// ======================================================




// ======================================================
// POPULATE EMOJI PICKER
// ======================================================




// ======================================================
// INSERT EMOJI INTO MESSAGE INPUT
// ======================================================




// ======================================================
// START VOICE MESSAGE
// (no microphone/recording backend exists here,
// so this toggles a simple recording indicator and,
// on stop, sends a placeholder voice-note message)
// ======================================================

let voiceMediaRecorder = null;
let voiceRecordedChunks = [];
let voiceStream = null;


function startVoiceMessage() {

    if (
        editingMessage
    ) {

        cancelEditMessage();

    }


    if (!currentChat) {

        return;

    }


    const voiceButton =
        supportChatElement(
            "voiceMessageBtn"
        );


    /*
     * Not currently recording -> start.
     */

    if (!isRecordingVoice) {

        navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then(
                function(stream) {

                    voiceStream = stream;

                    voiceRecordedChunks = [];

                    voiceMediaRecorder =
                        new MediaRecorder(stream);


                    voiceMediaRecorder.addEventListener(
                        "dataavailable",
                        function(event) {

                            if (
                                event.data &&
                                event.data.size > 0
                            ) {

                                voiceRecordedChunks.push(
                                    event.data
                                );

                            }

                        }
                    );


                    voiceMediaRecorder.addEventListener(
                        "stop",
                        function() {

                            const blob =
                                new Blob(
                                    voiceRecordedChunks,
                                    { type: "audio/webm" }
                                );


                            const fileUrl =
                                URL.createObjectURL(
                                    blob
                                );


                            if (voiceStream) {

                                voiceStream.getTracks().forEach(
                                    function(track) {

                                        track.stop();

                                    }
                                );

                                voiceStream = null;

                            }


                            sendAttachmentMessage(
                                "🎤 Voice message",
                                "voice",
                                {
                                    fileUrl:
                                        fileUrl
                                }
                            );

                        }
                    );


                    voiceMediaRecorder.start();


                    isRecordingVoice = true;


                    if (voiceButton) {

                        voiceButton.classList.add(
                            "recording"
                        );

                        voiceButton.title =
                            "Stop recording";

                    }

                }
            )
            .catch(
                function(error) {

                    console.error(
                        "Microphone access denied:",
                        error
                    );

                }
            );


        return;

    }


    /*
     * Already recording -> stop.
     */

    isRecordingVoice = false;


    if (voiceButton) {

        voiceButton.classList.remove(
            "recording"
        );

        voiceButton.title =
            "Voice message";

    }


    if (
        voiceMediaRecorder &&
        voiceMediaRecorder.state !== "inactive"
    ) {

        voiceMediaRecorder.stop();

    }

}


// ==========================================================================
// SUPPORT CHAT SYSTEM
// STAGE 8 — GROUP INFO & GROUP SETTINGS
// ==========================================================================

// ======================================================
// OPEN GROUP INFO
// ======================================================

function openGroupInfo() {

    if (!currentGroup) {

        return;

    }


    closeChatMenu();


    const modal =
        supportChatElement(
            "groupInfoModal"
        );


    if (!modal) {

        return;

    }


    const nameElement =
        supportChatElement(
            "groupInfoName"
        );


    const descriptionElement =
        supportChatElement(
            "groupInfoDescription"
        );


    const memberCountElement =
        supportChatElement(
            "groupInfoMemberCount"
        );


    const avatarElement =
        supportChatElement(
            "groupInfoAvatar"
        );


    if (nameElement) {

        nameElement.textContent =
            currentGroup.name;

    }


    if (descriptionElement) {

        descriptionElement.textContent =
            currentGroup.description ||
            "No description.";

    }


    if (memberCountElement) {

        memberCountElement.textContent =
            currentGroup.members.length +
            " members";

    }


    if (avatarElement) {

        if (currentGroup.avatar) {

            avatarElement.innerHTML =
                '<img src="' +
                currentGroup.avatar +
                '" alt="' +
                currentGroup.name +
                '">';

        }
        else {

            avatarElement.innerHTML =
                '<i class="fa-solid fa-users"></i>';

        }

    }


    renderGroupInfoMembers();


    modal.classList.remove(
        "hidden"
    );

}


// ======================================================
// CLOSE GROUP INFO
// ======================================================

function closeGroupInfo() {

    const modal =
        supportChatElement(
            "groupInfoModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}


// ======================================================
// RENDER GROUP INFO MEMBERS
// ======================================================

function renderGroupInfoMembers() {

    const container =
        supportChatElement(
            "groupMembersList"
        );


    const countElement =
        supportChatElement(
            "groupMembersCount"
        );


    if (
        !container ||
        !currentGroup
    ) {

        return;

    }


    container.innerHTML =
        "";


    if (countElement) {

        countElement.textContent =
            currentGroup.members.length;

    }


    currentGroup.members.forEach(
        function(member) {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "group-member";


            

                    
            const avatarHtml =
                '<div class="group-user-avatar">' +
                getInitials(
                    member.name
                ) +
                '</div>';


       const adminBadge =
                member.role ===
                "Admin"
                    ? '<span class="group-admin-badge">Admin</span>'
                    : "";


            row.innerHTML =
                avatarHtml +
                '<div class="group-member-info">' +
                    '<strong>' +
                    member.name +
                    '</strong>' +
                    '<span>' +
                    member.id +
                    '</span>' +
                '</div>' +
                adminBadge;


            row.addEventListener(
                "click",
                function() {

                    openMemberActions(
                        member
                    );

                }
            );


            container.appendChild(
                row
            );

        }
    );

}


// ======================================================
// OPEN GROUP SETTINGS
// ======================================================

function openGroupSettings() {

    if (!currentGroup) {

        return;

    }


    closeGroupInfo();


    const modal =
        supportChatElement(
            "groupSettingsModal"
        );


    if (!modal) {

        return;

    }


    const sendPermission =
        supportChatElement(
            "groupSendPermission"
        );


    const editPermission =
        supportChatElement(
            "groupEditPermission"
        );


    const addPermission =
        supportChatElement(
            "groupAddPermission"
        );


    const permissions =
        currentGroup.permissions ||
        {};


    if (
        sendPermission &&
        permissions.sendMessages
    ) {

        sendPermission.value =
            permissions.sendMessages;

    }


    if (
        editPermission &&
        permissions.editGroup
    ) {

        editPermission.value =
            permissions.editGroup;

    }


    if (
        addPermission &&
        permissions.addMembers
    ) {

        addPermission.value =
            permissions.addMembers;

    }


    modal.classList.remove(
        "hidden"
    );

}


// ======================================================
// CLOSE GROUP SETTINGS
// ======================================================

function closeGroupSettings() {

    const modal =
        supportChatElement(
            "groupSettingsModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}


// ======================================================
// SAVE GROUP SETTINGS
// ======================================================

function saveGroupSettings() {

    if (!currentGroup) {

        closeGroupSettings();

        return;

    }


    const sendPermission =
        supportChatElement(
            "groupSendPermission"
        );


    const editPermission =
        supportChatElement(
            "groupEditPermission"
        );


    const addPermission =
        supportChatElement(
            "groupAddPermission"
        );


    currentGroup.permissions =
        {

            sendMessages:
                sendPermission
                    ? sendPermission.value
                    : currentGroup.permissions.sendMessages,

            editGroup:
                editPermission
                    ? editPermission.value
                    : currentGroup.permissions.editGroup,

            addMembers:
                addPermission
                    ? addPermission.value
                    : currentGroup.permissions.addMembers

        };


    closeGroupSettings();

}


// ======================================================
// EDIT GROUP INFORMATION
// (opens the create-group modal in "edit" mode)
// ======================================================

function editGroupInformation() {

    openEditGroupModal();

}


// ==========================================================================
// SUPPORT CHAT SYSTEM
// STAGE 9 — MEMBER ACTIONS
// ==========================================================================

// ======================================================
// OPEN MEMBER ACTIONS
// ======================================================

function openMemberActions(
    member
) {

    selectedGroupMember =
        member;


    const modal =
        supportChatElement(
            "memberActionModal"
        );


    const avatarElement =
        supportChatElement(
            "memberActionAvatar"
        );


    const nameElement =
        supportChatElement(
            "memberActionName"
        );


    const roleElement =
        supportChatElement(
            "memberActionRole"
        );


    const adminButton =
        supportChatElement(
            "memberAdminAction"
        );


    if (!modal) {

        return;

    }


        if (avatarElement) {

        avatarElement.textContent =
            getInitials(
                member.name
            );

    }


    if (nameElement) {

        nameElement.textContent =
            member.name;

    }


    if (roleElement) {

        roleElement.textContent =
            member.role;

    }


    if (adminButton) {

        adminButton.innerHTML =

            member.role ===
            "Admin"
                ? '<i class="fa-solid fa-shield"></i> Remove Admin'
                : '<i class="fa-solid fa-shield"></i> Make Admin';

    }


    modal.classList.remove(
        "hidden"
    );

}


// ======================================================
// CLOSE MEMBER ACTIONS
// ======================================================

function closeMemberActions() {

    const modal =
        supportChatElement(
            "memberActionModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}


// ======================================================
// VIEW MEMBER PROFILE
// ======================================================

function viewMemberProfile() {

    if (!selectedGroupMember) {

        return;

    }


    const user =
        findSupportUser(
            selectedGroupMember.id
        );


    closeMemberActions();
    closeGroupInfo();


    if (user) {

        populateUserProfileModal(
            user
        );

    }

}


// ======================================================
// TOGGLE MEMBER ADMIN
// ======================================================

function toggleMemberAdmin() {

    if (
        !selectedGroupMember ||
        !currentGroup
    ) {

        return;

    }


    const member =
        currentGroup.members.find(
            function(item) {

                return (
                    item.id ===
                    selectedGroupMember.id
                );

            }
        );


    if (!member) {

        return;

    }


    member.role =
        member.role ===
        "Admin"
            ? "Member"
            : "Admin";


    selectedGroupMember =
        member;


    closeMemberActions();


    renderGroupInfoMembers();

}


// ======================================================
// REMOVE MEMBER FROM GROUP
// ======================================================

function removeMemberFromGroup() {

    if (
        !selectedGroupMember ||
        !currentGroup
    ) {

        return;

    }


    closeMemberActions();


    deleteActionType =
        "member";

    deleteActionId =
        selectedGroupMember.id;


    const titleElement =
        supportChatElement(
            "deleteConfirmTitle"
        );

    const textElement =
        supportChatElement(
            "deleteConfirmText"
        );

    const confirmBtn =
        supportChatElement(
            "confirmDeleteBtn"
        );


    if (titleElement) {

        titleElement.textContent =
            "Remove Member?";

    }


    if (textElement) {

        textElement.textContent =
            "Remove " +
            selectedGroupMember.name +
            " from this group?";

    }


    if (confirmBtn) {

        confirmBtn.textContent =
            "Remove";

    }


    const modal =
        supportChatElement(
            "deleteConfirmModal"
        );


    if (modal) {

        modal.classList.remove(
            "hidden"
        );

    }

}


// ==========================================================================
// SUPPORT CHAT SYSTEM
// STAGE 10 — USER PROFILE
// ==========================================================================

// ======================================================
// OPEN CURRENT PROFILE
// (header avatar / name click — routes to group info
// for group chats, or the user profile for individual)
// ======================================================

function openCurrentProfile() {

    closeMessagePreviewsOnUiOpen();
  
    if (!currentChat) {

        return;

    }


    if (
        currentChatType ===
        "group"
    ) {

        openGroupInfo();

        return;

    }


    if (currentUser) {

        populateUserProfileModal(
            currentUser
        );

    }

}


// ======================================================
// POPULATE USER PROFILE MODAL
// ======================================================

function populateUserProfileModal(
    user
) {

    const modal =
        supportChatElement(
            "userProfileModal"
        );


    if (
        !modal ||
        !user
    ) {

        return;

    }


    const fields =
        {

            profileName:
                user.name,

            profileUserId:
                user.id,

            profileAccountStatus:
                user.status,

            profileEmail:
                user.email,

            profilePhone:
                user.phone,

            profileJoined:
                user.joined,

            profileVerification:
                user.verification,

            profileBalance:
                "M" +
                Number(
                    user.balance || 0
                ).toFixed(2),

            profileDeposited:
                "M" +
                Number(
                    user.deposited || 0
                ).toFixed(2),

            profileWithdrawn:
                "M" +
                Number(
                    user.withdrawn || 0
                ).toFixed(2),

            profilePlan:
                user.plan ||
                "None"

        };


    Object.keys(
        fields
    ).forEach(
        function(id) {

            const element =
                supportChatElement(
                    id
                );


            if (element) {

                element.textContent =
                    fields[id];

            }

        }
    );


    const avatarElement =
        supportChatElement(
            "profileAvatar"
        );


        if (avatarElement) {

        avatarElement.textContent =
            getInitials(
                user.name
            );

    }


    const onlineElement =
        supportChatElement(
            "profileOnlineStatus"
        );


    if (onlineElement) {

        onlineElement.style.display =
            user.online
                ? "block"
                : "none";

    }


    modal.dataset.profileUserId =
        user.id;


    modal.classList.remove(
        "hidden"
    );

}


// ======================================================
// CLOSE USER PROFILE
// ======================================================

function closeUserProfile() {

    const modal =
        supportChatElement(
            "userProfileModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}


// ======================================================
// VIEW FULL USER PROFILE / ACTIVITY / TRANSACTIONS
// (no dedicated admin pages are wired into this file,
// so these surface the relevant info from what is
// already known about the user)
// ======================================================

// ======================================================
// VIEW FULL USER PROFILE / ACTIVITY / TRANSACTIONS
// Navigates to the relevant admin page via loadAdminPage()
// and hands off which user to focus on via sessionStorage,
// so users.js / transactions.js / activity-log.js can read
// "pendingProfileUserId" on load and pre-filter to them.
// ======================================================

function goToAdminUserRecord(page, userId) {

    if (!userId) {
        return;
    }

    sessionStorage.setItem("pendingProfileUserId", userId);

    closeUserProfile();

    if (typeof loadAdminPage === "function") {
        loadAdminPage(page);
    } else {
        console.warn(
            "loadAdminPage() is not defined — make sure admin.js is loaded before support-chat.js."
        );
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


// ==========================================================================
// SUPPORT CHAT SYSTEM
// STAGE 11 — DELETE CHAT / DELETE GROUP
// ==========================================================================

// ======================================================
// DELETE CURRENT CHAT
// ======================================================

function deleteCurrentChat() {

    if (currentGroup) {
      deleteCurrentGroup();
      return;
    }

    else if (
        !currentChat ||
        currentChatType !== "individual"
    ) {

        return;

    }


    closeChatMenu();


    deleteActionType =
        "chat";

    deleteActionId =
        currentChat.id;


    const titleElement =
        supportChatElement(
            "deleteConfirmTitle"
        );


    const textElement =
        supportChatElement(
            "deleteConfirmText"
        );


    if (titleElement) {

        titleElement.textContent =
            "Delete Conversation?";

    }


    if (textElement) {

        textElement.textContent =
            "This will permanently delete your conversation with " +
            currentChat.name +
            ". This action cannot be undone.";

    }

      const confirmBtn =
        supportChatElement(
            "confirmDeleteBtn"
        );


    if (confirmBtn) {

        confirmBtn.textContent =
            "Delete";

    }


    const modal =
        supportChatElement(
            "deleteConfirmModal"
        );


    if (modal) {

        modal.classList.remove(
            "hidden"
        );

    }

}


// ======================================================
// DELETE CURRENT GROUP
// ======================================================

function deleteCurrentGroup() {

    if (!currentGroup) {

        return;

    }


    closeGroupInfo();


    deleteActionType =
        "group";

    deleteActionId =
        currentGroup.id;


    const titleElement =
        supportChatElement(
            "deleteConfirmTitle"
        );


    const textElement =
        supportChatElement(
            "deleteConfirmText"
        );


    if (titleElement) {

        titleElement.textContent =
            "Delete Group?";

    }


    if (textElement) {

        textElement.textContent =
            "This will permanently delete \"" +
            currentGroup.name +
            "\" for everyone. This action cannot be undone.";

    }

      const confirmBtn =
        supportChatElement(
            "confirmDeleteBtn"
        );


    if (confirmBtn) {

        confirmBtn.textContent =
            "Delete";

    }


    const modal =
        supportChatElement(
            "deleteConfirmModal"
        );


    if (modal) {

        modal.classList.remove(
            "hidden"
        );

    }

}


// ======================================================
// CLOSE DELETE CONFIRMATION
// ======================================================

function closeDeleteConfirmation() {

    const modal =
        supportChatElement(
            "deleteConfirmModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }


    deleteActionType =
        null;

    deleteActionId =
        null;

    deleteActionIds =
        [];

    deleteActionChatType =
        null;

}


// ======================================================
// CONFIRM DELETE ACTION
// ======================================================

function confirmDeleteAction() {

    if (
        deleteActionType ===
        "chat"
    ) {

        const index =
            individualChats.findIndex(
                function(chat) {

                    return (
                        chat.id ===
                        deleteActionId
                    );

                }
            );


        if (index !== -1) {

            individualChats.splice(
                index,
                1
            );

        }


        if (
            currentChat &&
            currentChat.id ===
            deleteActionId
        ) {

            closeChat();

        }


        renderIndividualChats();

    }
    else if (
        deleteActionType ===
        "group"
    ) {

        const index =
            supportChatGroups.findIndex(
                function(group) {

                    return (
                        group.id ===
                        deleteActionId
                    );

                }
            );


        if (index !== -1) {

            supportChatGroups.splice(
                index,
                1
            );

        }


        if (
            currentChat &&
            currentChat.id ===
            deleteActionId
        ) {

            closeChat();

        }


        renderGroups();

    }
    else if (
        deleteActionType ===
        "bulkChats"
    ) {

        const targetArray =
            deleteActionChatType === "group"
                ? supportChatGroups
                : individualChats;


        const idsToDelete =
            deleteActionIds;


        for (
            let i = targetArray.length - 1;
            i >= 0;
            i--
        ) {

            if (
                idsToDelete.includes(
                    targetArray[i].id
                )
            ) {

                targetArray.splice(
                    i,
                    1
                );

            }

        }


        if (
            currentChat &&
            idsToDelete.includes(
                currentChat.id
            )
        ) {

            closeChat();

        }


        if (
            deleteActionChatType === "group"
        ) {

            renderGroups();

        }
        else {

            renderIndividualChats();

        }


        exitChatSelectionMode();

    }

      else if (
        deleteActionType ===
        "message"
    ) {

        if (
            currentChat &&
            Array.isArray(
                currentChat.messages
            )
        ) {

            const messageIndex =
                currentChat.messages.findIndex(
                    function(item) {

                        return (
                            item.id ===
                            deleteActionId
                        );

                    }
                );


            if (
                messageIndex !==
                -1
            ) {

                currentChat.messages.splice(
                    messageIndex,
                    1
                );


                if (
                    replyingToMessage &&
                    replyingToMessage.id ===
                    deleteActionId
                ) {

                    cancelReply();

                }


                if (
                    editingMessage &&
                    editingMessage.id ===
                    deleteActionId
                ) {

                    cancelEditMessage();

                }


                updateChatLastMessage(
                    currentChat
                );


                renderMessages();


                if (
                    currentChatType ===
                    "individual"
                ) {

                    renderIndividualChats();

                }
                else {

                    renderGroups();

                }


                scrollMessagesToBottom();

            }

        }

    }
    else if (
        deleteActionType ===
        "member"
    ) {

        if (currentGroup) {

            currentGroup.members =
                currentGroup.members.filter(
                    function(member) {

                        return (
                            member.id !==
                            deleteActionId
                        );

                    }
                );


            if (
                selectedGroupMember &&
                selectedGroupMember.id ===
                deleteActionId
            ) {

                selectedGroupMember =
                    null;

            }


            renderGroupInfoMembers();


            const memberCountElement =
                supportChatElement(
                    "groupInfoMemberCount"
                );


            if (memberCountElement) {

                memberCountElement.textContent =
                    currentGroup.members.length +
                    " members";

            }


            renderCurrentChat();


            renderGroups();

        }

    }


    updateUnreadCounts();


    closeDeleteConfirmation();

}


// ======================================================
// GLOBAL ACCESS — STAGE 7-11
// ======================================================

window.toggleAttachmentMenu = toggleAttachmentMenu;
window.attachPhoto = attachPhoto;
window.attachDocument = attachDocument;
window.attachCamera = attachCamera;
window.chooseGroupPhoto = chooseGroupPhoto;

window.startVoiceMessage = startVoiceMessage;

window.openGroupInfo = openGroupInfo;
window.closeGroupInfo = closeGroupInfo;
window.openGroupSettings = openGroupSettings;
window.closeGroupSettings = closeGroupSettings;
window.saveGroupSettings = saveGroupSettings;
window.editGroupInformation = editGroupInformation;
window.openAddMembers = openAddMembers;
window.submitGroupModal = submitGroupModal;

window.viewMemberProfile = viewMemberProfile;
window.toggleMemberAdmin = toggleMemberAdmin;
window.removeMemberFromGroup = removeMemberFromGroup;
window.closeMemberActions = closeMemberActions;

window.openCurrentProfile = openCurrentProfile;
window.closeUserProfile = closeUserProfile;
window.viewFullUserProfile = viewFullUserProfile;



window.deleteCurrentChat = deleteCurrentChat;
window.deleteCurrentGroup = deleteCurrentGroup;
window.confirmDeleteAction = confirmDeleteAction;
window.closeDeleteConfirmation = closeDeleteConfirmation;


// ==========================================================================
// SUPPORT CHAT SYSTEM
// STAGE 12 — CHAT PRIORITY & MULTI-SELECT DELETE
// (press-and-hold a chat to highlight it and open a
// quick-actions modal: toggle priority, or delete —
// deletion supports selecting and removing many chats
// at once)
// ==========================================================================

const CHAT_LONG_PRESS_DURATION =
    500;
// milliseconds to hold before it counts as a long-press

const CHAT_LONG_PRESS_MOVE_TOLERANCE =
    10;
// pixels of finger/mouse movement allowed before a
// long-press is cancelled (treated as a scroll/drag)


// ======================================================
// ATTACH CHAT PRESS HANDLERS
// (wires long-press detection AND normal-tap handling
// onto a single chat list item — called once per item
// as it is created)
//
// All press/long-press state (the timer, whether the
// long-press already fired, the press start position)
// is kept in variables local to this function's closure
// — one private set per chat item — rather than in a
// single shared/global flag. Sharing one global flag
// across every chat item caused a real bug: firing a
// long-press on one chat left the flag "stuck", so the
// very next ordinary click on a *different* chat was
// silently swallowed instead of toggling its selection.
// Scoping the flag per item makes that impossible.
// ======================================================

function attachChatPressHandlers(
    item,
    chatId,
    chatType,
    onTap
) {

    let pressTimer =
        null;

    let pressFired =
        false;

    let pressStartX =
        0;

    let pressStartY =
        0;


    function clearPressTimer() {

        if (pressTimer) {

            clearTimeout(
                pressTimer
            );

            pressTimer =
                null;

        }

    }


    function startPress(
        clientX,
        clientY
    ) {

        clearPressTimer();

        pressFired =
            false;

        pressStartX =
            clientX;

        pressStartY =
            clientY;


        pressTimer =
            setTimeout(
                function() {

                    pressFired =
                        true;

                    pressTimer =
                        null;


                    handleChatLongPress(
                        chatId,
                        chatType
                    );

                },
                CHAT_LONG_PRESS_DURATION
            );

    }


    function endPress() {

        clearPressTimer();

    }


    item.addEventListener(
        "mousedown",
        function(event) {

            startPress(
                event.clientX,
                event.clientY
            );

        }
    );


    item.addEventListener(
        "mouseup",
        endPress
    );


    item.addEventListener(
        "mouseleave",
        endPress
    );


    item.addEventListener(
        "touchstart",
        function(event) {

            const touch =
                event.touches[0];


            startPress(
                touch.clientX,
                touch.clientY
            );

        },
        {
            passive: true
        }
    );


    item.addEventListener(
        "touchend",
        endPress
    );


    item.addEventListener(
        "touchcancel",
        endPress
    );


    item.addEventListener(
        "touchmove",
        function(event) {

            const touch =
                event.touches[0];


            const movedX =
                Math.abs(
                    touch.clientX -
                    pressStartX
                );

            const movedY =
                Math.abs(
                    touch.clientY -
                    pressStartY
                );


            if (
                movedX > CHAT_LONG_PRESS_MOVE_TOLERANCE ||
                movedY > CHAT_LONG_PRESS_MOVE_TOLERANCE
            ) {

                endPress();

            }

        },
        {
            passive: true
        }
    );


    /*
     * Normal tap handling lives here too (rather than
     * a separate click listener elsewhere) so it shares
     * this exact same closure-scoped "pressFired" flag —
     * the only reliable way to tell "this click is the
     * tail end of a long-press that already fired" from
     * "this is an unrelated, ordinary click".
     */

    item.addEventListener(
        "click",
        function(event) {

            event.preventDefault();


            if (pressFired) {

                pressFired =
                    false;

                return;

            }


            if (chatSelectionMode) {

                toggleChatSelection(
                    chatId,
                    chatType
                );

                return;

            }


            onTap();

        }
    );

}


// ======================================================
// HANDLE CHAT LONG PRESS
// ======================================================

function handleChatLongPress(
    chatId,
    chatType
) {

    /*
     * A long-press started on a chat of a
     * different type than the current selection
     * starts a fresh selection instead of mixing
     * individual chats and groups together.
     */

    if (
        chatSelectionMode &&
        chatSelectionType !== chatType
    ) {

        exitChatSelectionMode();

    }


    chatSelectionMode =
        true;

    chatSelectionType =
        chatType;


    if (
        !selectedChatIds.includes(
            chatId
        )
    ) {

        selectedChatIds.push(
            chatId
        );

    }


    refreshChatSelectionUI();


    /*
     * Only show the delete/priority chooser on the
     * FIRST long-press of a selection. Once a mode has
     * already been picked, a long-press on another chat
     * should just add it to the batch, not reopen the
     * modal.
     */

    if (pendingBulkAction === null) {

        openChatActionsModal(
            chatId,
            chatType
        );
  }

}


// ======================================================
// TOGGLE CHAT SELECTION
// (tapping additional chats while selection mode
// is already active)
// ======================================================

function toggleChatSelection(
    chatId,
    chatType
) {

    if (chatType !== chatSelectionType) {

        return;

    }


    const index =
        selectedChatIds.indexOf(
            chatId
        );


    if (index === -1) {

        selectedChatIds.push(
            chatId
        );

    }
    else {

        selectedChatIds.splice(
            index,
            1
        );

    }


    if (selectedChatIds.length === 0) {

        exitChatSelectionMode();

        return;

    }


    refreshChatSelectionUI();

}


// ======================================================
// REFRESH CHAT SELECTION UI
// (updates the selection bar and re-renders the
// active list so highlighted items stay in sync)
// ======================================================

function refreshChatSelectionUI() {

    const bar =
        supportChatElement(
            "chatSelectionBar"
        );

    const countLabel =
        supportChatElement(
            "chatSelectionCount"
        );


    if (bar) {

        if (
            chatSelectionMode &&
            selectedChatIds.length > 0
        ) {

            bar.classList.remove(
                "hidden"
            );

        }
        else {

            bar.classList.add(
                "hidden"
            );

        }

    }


    if (countLabel) {

        countLabel.textContent =
            selectedChatIds.length +
            (
                selectedChatIds.length === 1
                    ? " selected"
                    : " selected"
            );

    }


    /*
     * Groups have no priority concept — hide the
     * header's priority button whenever the current
     * selection is a group selection.
     */

        const headerPriorityBtn =
        supportChatElement(
            "chatSelectionPriorityBtn"
        );

    const headerDeleteBtn =
        supportChatElement(
            "chatSelectionDeleteBtn"
        );


    if (headerPriorityBtn) {

        const hidePriorityBtn =
            chatSelectionType === "group" ||
            pendingBulkAction === "delete";


        if (hidePriorityBtn) {

            headerPriorityBtn.classList.add(
                "hidden"
            );

        }
        else {

            headerPriorityBtn.classList.remove(
                "hidden"
            );

        }

    }


    if (headerDeleteBtn) {

        const hideDeleteBtn =
            pendingBulkAction === "priority";


        if (hideDeleteBtn) {

            headerDeleteBtn.classList.add(
                "hidden"
            );

        }
        else {

            headerDeleteBtn.classList.remove(
                "hidden"
            );

        }

    }


    



  


    if (chatSelectionType === "group") {

        renderGroups();

    }
    else {

        renderIndividualChats();

    }

}


// ======================================================
// EXIT CHAT SELECTION MODE
// ======================================================

function exitChatSelectionMode() {

    chatSelectionMode =
        false;

    chatSelectionType =
        null;

    selectedChatIds =
        [];

    pendingBulkAction =
        null;

    pendingPriorityMode =
        null;


    const bar =
        supportChatElement(
            "chatSelectionBar"
        );


    if (bar) {

        bar.classList.add(
            "hidden"
        );

    }


    renderIndividualChats();

    renderGroups();

}


// ======================================================
// OPEN CHAT ACTIONS MODAL
// ======================================================

function openChatActionsModal(
    anchorChatId,
    chatType
) {

    const modal =
        supportChatElement(
            "chatActionsModal"
        );


    if (!modal) {

        return;

    }


    const anchorChat =
        chatType === "group"
            ? findSupportGroup(
                anchorChatId
              )
            : findIndividualChat(
                anchorChatId
              );


    const titleElement =
        supportChatElement(
            "chatActionsTitle"
        );

    const priorityButton =
        supportChatElement(
            "chatActionsPriorityBtn"
        );


    if (
        titleElement &&
        anchorChat
    ) {

        titleElement.textContent =
            anchorChat.name;

    }


    if (priorityButton) {

        if (
            chatType === "group"
        ) {

            priorityButton.classList.add(
                "hidden"
            );

        } else {

            priorityButton.classList.remove(
                "hidden"
            );

            if (anchorChat) {

                priorityButton.innerHTML =

                    anchorChat.priority
                        ? '<i class="fa-solid fa-star"></i> Remove from Priority'
                        : '<i class="fa-solid fa-star"></i> Add to Priority';

            }

        }

    }


    modal.classList.remove(
        "hidden"
    );

}


// ======================================================
// CLOSE CHAT ACTIONS MODAL
// (does not clear the current selection — the person
// can keep tapping more chats to build a batch before
// deleting or re-opening this modal on another chat)
// ======================================================

function closeChatActionsModal() {
   
    const modal =
        supportChatElement(
            "chatActionsModal"
        );


  if (modal) {

        modal.classList.add(
            "hidden"
        );

    }
  exitChatSelectionMode();

}


function hideChatActionsModal() {

    const modal =
        supportChatElement(
            "chatActionsModal"
        );

    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}

// ======================================================
// CHOOSE BULK DELETE MODE
// (picked from the chat actions modal right after a
// long-press — just records the intent and lets the
// person keep tapping more chats to add to the batch)
// ======================================================

function chooseBulkDeleteMode() {

    if (selectedChatIds.length === 0) {

        closeChatActionsModal();

        return;

    }


    pendingBulkAction =
        "delete";

    pendingPriorityMode =
        null;


    hideChatActionsModal();


    refreshChatSelectionUI();

}


// ======================================================
// CHOOSE BULK PRIORITY MODE
// (picked from the chat actions modal right after a
// long-press — whether this batch is adding to or
// removing from priority is decided once, from the
// anchor chat's own current priority state, and then
// the individual chat list is narrowed down to only the
// chats eligible for that action)
// ======================================================

function chooseBulkPriorityMode() {

    if (selectedChatIds.length === 0) {

        closeChatActionsModal();

        return;

    }


    // groups have no priority concept —
    // only individual chats can be prioritized
    if (chatSelectionType === "group") {

        closeChatActionsModal();

        return;

    }


    const anchorChat =
        findIndividualChat(
            selectedChatIds[0]
        );


    pendingBulkAction =
        "priority";

    pendingPriorityMode =
        anchorChat && anchorChat.priority
            ? "remove"
            : "add";


    hideChatActionsModal();


    refreshChatSelectionUI();

}


// ======================================================
// CONFIRM PRIORITY SELECTED CHATS
// (opens the priority confirmation modal, mirroring
// confirmDeleteSelectedChats for the priority action)
// ======================================================

function confirmPrioritySelectedChats() {

    if (selectedChatIds.length === 0) {

        return;

    }


    // groups have no priority concept —
    // only individual chats can be prioritized
    if (chatSelectionType === "group") {

        return;

    }


    const anchorChat =
        findIndividualChat(
            selectedChatIds[0]
        );


    const newPriority =
        anchorChat
            ? !anchorChat.priority
            : true;


    priorityActionIds =
        [...selectedChatIds];

    priorityActionValue =
        newPriority;


    const count =
        selectedChatIds.length;

    const noun =
        count === 1
            ? "conversation"
            : "conversations";

    const actionWord =
        newPriority
            ? "Add"
            : "Remove";

    const actionPrep =
        newPriority
            ? "to"
            : "from";


    const titleElement =
        supportChatElement(
            "priorityConfirmTitle"
        );

    const textElement =
        supportChatElement(
            "priorityConfirmText"
        );

    const confirmBtn =
        supportChatElement(
            "confirmPriorityBtn"
        );


    if (titleElement) {

        titleElement.textContent =
            actionWord +
            " " +
            count +
            " " +
            noun +
            " " +
            actionPrep +
            " Priority?";

    }


    if (textElement) {

        textElement.textContent =
            newPriority
                ? "The selected " + noun + " will be marked as priority."
                : "The selected " + noun + " will be removed from priority.";

    }


    if (confirmBtn) {

        confirmBtn.textContent =
            actionWord;

    }


    const modal =
        supportChatElement(
            "priorityConfirmModal"
        );


    if (modal) {

        modal.classList.remove(
            "hidden"
        );

    }

}


// ======================================================
// CLOSE PRIORITY CONFIRMATION
// ======================================================

function closePriorityConfirmation() {

    const modal =
        supportChatElement(
            "priorityConfirmModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }


    priorityActionIds =
        [];

    priorityActionValue =
        null;

}


// ======================================================
// CONFIRM PRIORITY ACTION
// (applies the recorded add/remove decision to every
// chat captured at confirmation time)
// ======================================================

function confirmPriorityAction() {

    individualChats.forEach(
        function(chat) {

            if (
                priorityActionIds.includes(
                    chat.id
                )
            ) {

                chat.priority =
                    priorityActionValue;

            }

        }
    );


    exitChatSelectionMode();


    closePriorityConfirmation();


    renderIndividualChats();

}


// ======================================================
// CONFIRM DELETE SELECTED CHATS
// (opens the shared delete-confirmation modal,
// generalized to accept one or many chat ids)
// ======================================================

function confirmDeleteSelectedChats() {

    if (selectedChatIds.length === 0) {

        closeChatActionsModal();

        return;

    }


    hideChatActionsModal();


    deleteActionType =
        "bulkChats";

    deleteActionIds =
        [...selectedChatIds];

    deleteActionChatType =
        chatSelectionType;


    const count =
        selectedChatIds.length;

    const noun =
        chatSelectionType === "group"
            ? (
                count === 1
                    ? "group"
                    : "groups"
              )
            : (
                count === 1
                    ? "conversation"
                    : "conversations"
              );


    const titleElement =
        supportChatElement(
            "deleteConfirmTitle"
        );

    const textElement =
        supportChatElement(
            "deleteConfirmText"
        );


    if (titleElement) {

        titleElement.textContent =
            "Delete " +
            count +
            " " +
            noun +
            "?";

    }


    if (textElement) {

        textElement.textContent =
            "This will permanently delete the selected " +
            noun +
            ". This action cannot be undone.";

    }

      const confirmBtn =
        supportChatElement(
            "confirmDeleteBtn"
        );


    if (confirmBtn) {

        confirmBtn.textContent =
            "Delete";

    }


    const modal =
        supportChatElement(
            "deleteConfirmModal"
        );


    if (modal) {

        modal.classList.remove(
            "hidden"
        );

    }

}

// ======================================================
// CANCEL SELECTION ON OUTSIDE CLICK
// (any click that lands outside the selection bar, the
// chat actions modal, the confirmation modals, or a chat
// list item itself cancels the current selection and
// closes whichever of those modals is open — this also
// fixes the individual/group switch and filter buttons,
// since they count as "outside" and are handled by the
// same check, with no extra code needed in those
// functions)
// ======================================================

function setupChatSelectionOutsideClick() {

    document.addEventListener(
        "click",
        function(event) {

            if (!chatSelectionMode) {

                return;

            }


            const isInsideSelectionUI =
                event.target.closest(
                    "#chatSelectionBar, " +
                    "#chatActionsModal, " +
                    "#deleteConfirmModal, " +
                    "#priorityConfirmModal, " +
                    ".chat-list-item"
                );


            if (isInsideSelectionUI) {

                return;

            }


            exitChatSelectionMode();

            closeChatActionsModal();

            closeDeleteConfirmation();

            closePriorityConfirmation();

        },
        true
        // capture phase — this runs BEFORE the clicked
        // element's own onclick (e.g. showIndividualChats,
        // filterChats), so selection is already cleared
        // by the time those functions run
    );

}


// ======================================================
// GLOBAL ACCESS — STAGE 12
// ======================================================

window.exitChatSelectionMode = exitChatSelectionMode;
window.closeChatActionsModal = closeChatActionsModal;
window.chooseBulkDeleteMode = chooseBulkDeleteMode;
window.chooseBulkPriorityMode = chooseBulkPriorityMode;
window.confirmDeleteSelectedChats = confirmDeleteSelectedChats;
window.confirmPrioritySelectedChats = confirmPrioritySelectedChats;
window.closePriorityConfirmation = closePriorityConfirmation;
window.confirmPriorityAction = confirmPriorityAction;
window.deleteChatFromProfile = deleteChatFromProfile;


// ==========================================================================
// SUPPORT CHAT SYSTEM
// STAGE 13 — SELF-INITIALIZATION
// ==========================================================================
//
// support-chat.html is injected into admin.html's DOM at runtime by
// admin.js rather than loaded as its own page, so a normal script-load
// or DOMContentLoaded moment cannot be relied on to run
// initSupportChatPage() — the markup may not exist yet, or may not
// exist at all if this script loaded once, up front.
//
// This watcher detects the moment ".support-chat" actually appears
// in the DOM (now, or later if it hasn't been injected yet) and
// initializes it automatically. It keeps watching afterward so that
// if admin.js ever removes and re-injects the support chat markup
// (e.g. navigating away from and back to the support tab), it will
// be initialized again. initSupportChatPage() already guards itself
// against double-initializing the same DOM node, so this is safe to
// call as often as mutations occur.
// ==========================================================================

(function watchForSupportChatMount() {

    function attemptSupportChatInit() {

        const supportChat =
            document.querySelector(
                ".support-chat"
            );


        if (supportChat) {

            initSupportChatPage();

        }

    }


    function startWatching() {

        attemptSupportChatInit();


        const observer =
            new MutationObserver(
                attemptSupportChatInit
            );


        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );

    }


    if (document.body) {

        startWatching();

    }
    else {

        document.addEventListener(
            "DOMContentLoaded",
            startWatching
        );

    }

})();
