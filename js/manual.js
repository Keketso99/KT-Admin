// Manual page: a built-in guide that answers "how do I...?" questions about the
// admin app. Works fully inside the admin app (no server, no AI service needed).
// It only knows how to USE the app and refuses anything sensitive.

var KT_MANUAL_HISTORY = [];

var KT_MANUAL_REFUSAL = "I can only help with how to use the admin app, so I can't help with that. Try asking things like \"How do I approve a withdrawal?\" or \"How do I set my admin nickname?\"";

// Requests that are never answered.
var KT_MANUAL_BLOCKED = [
    /\b(source ?code|codebase|repo(sitory)?|github|html|javascript|css|hosting|deploy(ment)?|\bcode\b)/i,
    /\b(database|db|sql|supabase|postgres|schema|rls|policy|policies|rpc|edge function|api|key|keys|secret|token|service role|env(ironment)? variable|backend|backup|query)\b/i,
    /\b(who (is|are)|who can|who has)\b.{0,40}\b(authori[sz]ed|allowed|permitted|able|access)\b|\bmain admin\b|\bsuper ?admin\b|\bpermissions?\b|\bprivileges?\b|\bauthori[sz]ed\b|\bauthori[sz]ation\b/i,
    /\b(send|sent|give|show|list|tell|export|dump|share|display|get|email|text)\b.{0,30}\b(user|users|customer|customers|client|clients|admin|admins)\b.{0,30}\b(info|information|data|details|emails?|phones?|numbers?|balances?|passwords?|pins?|records?|list|names?)\b/i,
    /\b(bypass|hack|crack|exploit|get around|break into|steal)\b/i,
    /\b(ignore|forget|disregard)\b.{0,30}\b(instructions|rules|prompt)\b|\bsystem prompt\b|\bjailbreak\b/i
];

// Guide entries: keywords (all words of ANY one set must appear) -> answer.
var KT_MANUAL_TOPICS = [
    { k: [["approve","withdrawal"],["accept","withdrawal"],["pay","withdrawal"],["withdrawal","request"]],
      a: "To approve a withdrawal:\n1. Open Finance > Withdrawals.\n2. On the Pending tab, tap the request.\n3. Check the amount, method and destination.\n4. Tap Approve once you have paid the user, or Reject to decline it." },
    { k: [["reject","withdrawal"],["decline","withdrawal"]],
      a: "To reject a withdrawal: Finance > Withdrawals > Pending tab > tap the request > Reject." },
    { k: [["approve","deposit"],["accept","deposit"],["reject","deposit"],["deposit","request"],["deposit","screenshot"]],
      a: "To handle a deposit:\n1. Open Finance > Deposits.\n2. On the Pending tab, tap the request.\n3. Check the amount, method and the user's confirmation screenshot.\n4. Tap Approve to credit the user, or Reject to decline it." },
    { k: [["transactions"],["transaction","history"],["export"]],
      a: "Finance > Transactions shows the history of all money movements. Use the search and filters to find entries, and the export button to download them." },
    { k: [["reset","password"],["user","password"],["forgot","password"]],
      a: "To reset a user's password:\n1. Open Users and tap the user.\n2. Tap Password.\n3. Tap Reset (or Reject if you don't want to reset it).\n4. The new password is shown once. Give it to the user." },
    { k: [["reset","pin"],["withdrawal","pin"]],
      a: "To reset a user's withdrawal PIN:\n1. Open Users and tap the user.\n2. Tap Reset PIN.\n3. Tap Reset. The user can then set a new PIN." },
    { k: [["credit"],["add","balance"],["bonus"],["reward"]],
      a: "To add balance: Users > tap the user > Credit > enter the amount > Save. For a bonus use the Reward button the same way." },
    { k: [["debit"],["subtract","balance"],["deduct"],["remove","balance"]],
      a: "To subtract balance: Users > tap the user > Debit > enter the amount > confirm." },
    { k: [["assign","plan"],["give","plan"],["mining","plan","user"]],
      a: "To give a user a plan: Users > tap the user > Assign Plan > choose the plan > Save." },
    { k: [["block","user"],["unblock"],["activate","user"],["reactivat"],["suspend"]],
      a: "To block or reactivate a user: Users > tap the user > Block (or Activate) > confirm. Account reactivation requests appear under the Requests filter on the Users page." },
    { k: [["edit","user"],["change","request"],["personal","information"],["payment","method"]],
      a: "To handle a user's change request (personal info or payment methods): Users > set the filter to Requests > tap the user > Approve Changes or Reject. To edit a user yourself: tap the user > Edit User > Save." },
    { k: [["delete","user"],["remove","user"]],
      a: "To delete a user: Users > tap the user > Delete > confirm. If the app says you are not authorized, this action is not available to your account." },
    { k: [["find","user"],["search","user"],["filter","user"],["users","page"]],
      a: "Users page: use the search box and the filter (All, Active, Blocked, Requests). Tap Refresh to reload. Tap any user to open their window with all actions." },
    { k: [["verify","user"],["kyc"],["verification"],["approve","verification"],["documents"]],
      a: "To review KYC verification:\n1. Open Verification.\n2. Use the filters: Pending, Approved, Rejected, Requests (resubmission requests) or Resets.\n3. Tap a user to view their documents.\n4. Tap Approve or Reject." },
    { k: [["resubmi"],["reset","verification"]],
      a: "To handle a resubmission request: Verification > Requests filter > tap the user > Reset Verification (lets them submit again) or Reject Resubmission." },
    { k: [["plan","add"],["add","plan"],["create","plan"],["new","plan"],["edit","plan"],["disable","plan"],["delete","plan"],["manage","plan"]],
      a: "Manage Plans: tap Add to create a plan. Tap a plan to edit it and Save, Disable/Enable it, or Delete it (with a confirmation)." },
    { k: [["exchange"],["currency"],["rate"]],
      a: "Exchange Rates: tap Add to create a currency pair. Tap a pair to change its rate and Save, or Delete it." },
    { k: [["send","notification"],["notify"],["announcement"],["broadcast"],["message","all","users"]],
      a: "To send a notification:\n1. Open Notifications.\n2. Tap Send Notification.\n3. Choose All Users, Verified or Not Verified.\n4. Write the title and message and tap Send." },
    { k: [["notification"],["unread"],["mark","read"]],
      a: "Notifications page: see Total, Unread and Read counts and use the tabs. Tap a notification to view it, mark it unread, or delete it." },
    { k: [["support","chat"],["chat"],["reply","user"],["conversation"],["message","user"]],
      a: "Support Chat: each admin has their own private chats. Use the filters All, Unread, Priority and Requests. Tap a chat to reply. Tap New conversation to start a chat with a user. Chats of users with unhandled requests can't be deleted. A \"Passed on\" badge marks chats handed over from a removed admin." },
    { k: [["passed","on"]],
      a: "A \"Passed on\" badge marks a chat that was handed over to you from an admin whose admin role was removed." },
    { k: [["nickname"],["rename"],["display","name"]],
      a: "To set or rename your admin nickname:\n1. Open Settings and enter the settings password.\n2. Open Admins.\n3. Tap Rename nickname at the bottom of the list.\n4. Enter a name and Save.\nNicknames must be unique. Users see your nickname in KT Support." },
    { k: [["assign","admin"],["add","admin"],["new","admin"],["make","admin"],["remove","admin"],["admin","role"]],
      a: "Admin roles are managed in Settings > Admins (enter the settings password first). Use the assign or remove buttons there. If the app says you are not authorized, this action is not available to your account." },
    { k: [["settings","password"],["change","settings"],["create","password"],["password","settings"],["settings"]],
      a: "Settings opens with the settings password. If it has not been created yet, you will see a message saying so. To change it: Settings > Safety > Change password." },
    { k: [["sound"],["alert"],["push"],["notifications","off"],["notifications","on"],["mute"]],
      a: "To turn alert sound or device notifications on or off: Settings > Sound & Notifications." },
    { k: [["login","history"],["audit"],["login","record"]],
      a: "Settings > Audit shows login history. Delete options may not be available to your account." },
    { k: [["activity"],["log"],["history"]],
      a: "Activity Logs lists the actions taken in the app. Tap an entry to see Activity Details. Use search and filters to find entries." },
    { k: [["media"],["video"],["guide"],["download"],["upload"]],
      a: "Media has tabs: Overview, Videos, Guides and Downloads. Use the Add button in a tab to upload an item, tap an item to edit or delete it, and use the search and filters to find items." },
    { k: [["dashboard"],["total","users"],["overview"]],
      a: "The Dashboard shows overview cards. Total users counts users only (admins are not included)." },
    { k: [["logout"],["log","out"],["sign","out"]],
      a: "To log out: open the menu and tap Logout at the bottom of the sidebar, then tap Confirm." },
    { k: [["login"],["sign","in"],["forgot","my"],["install"],["home","screen"]],
      a: "Sign in with your admin email and password. To install the app, use your browser's Install or Add to Home screen option." },
    { k: [["not","authorized"],["not","allowed"],["cant"],["can't"],["cannot"]],
      a: "If the app says you are not authorized to do something, that action is not available to your account." },
    { k: [["hello"],["hi"],["help"],["manual"],["what","can","you"]],
      a: "I can show you how to do things in the admin app: withdrawals, deposits, users, verification, plans, exchange rates, notifications, support chat, media and settings. Ask me a how-to question." }
];

function ktManualAnswer(text){
    var raw = String(text || "");
    for(var i = 0; i < KT_MANUAL_BLOCKED.length; i++){
        if(KT_MANUAL_BLOCKED[i].test(raw)) return KT_MANUAL_REFUSAL;
    }
    var q = raw.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ");
    var best = null, bestScore = 0;
    KT_MANUAL_TOPICS.forEach(function(t){
        t.k.forEach(function(set){
            var ok = set.every(function(w){ return q.indexOf(w) !== -1; });
            if(ok && set.join("").length >= bestScore){
                bestScore = set.join("").length;
                best = t;
            }
        });
    });
    if(best) return best.a;
    return "I couldn't find that in the manual. Try asking in a different way, for example \"How do I approve a withdrawal?\", \"How do I reset a user's password?\" or \"How do I send a notification?\"";
}

function initManual(){
    var msgs = document.getElementById("manMsgs");
    var form = document.getElementById("manForm");
    var input = document.getElementById("manInput");
    var send = document.getElementById("manSend");
    var chips = document.getElementById("manChips");
    if(!msgs || !form) return;

    function add(text, cls){
        var d = document.createElement("div");
        d.className = "kt-man-msg " + cls;
        d.textContent = text;
        msgs.appendChild(d);
        msgs.scrollTop = msgs.scrollHeight;
        return d;
    }

    if(KT_MANUAL_HISTORY.length){
        KT_MANUAL_HISTORY.forEach(function(m){ add(m.content, m.role === "user" ? "me" : "bot"); });
        if(chips) chips.style.display = "none";
    } else {
        add("Hi! I'm the admin manual. Ask me how to do anything in the app.", "bot");
    }

    var busy = false;

    function ask(text){
        text = (text || "").trim();
        if(!text || busy) return;
        busy = true;
        if(send) send.disabled = true;
        if(chips) chips.style.display = "none";
        add(text, "me");
        KT_MANUAL_HISTORY.push({ role: "user", content: text });
        input.value = "";

        var wait = document.createElement("div");
        wait.className = "kt-man-msg bot kt-man-dots";
        wait.innerHTML = "<span></span><span></span><span></span>";
        msgs.appendChild(wait);
        msgs.scrollTop = msgs.scrollHeight;

        setTimeout(function(){
            var reply = ktManualAnswer(text);
            if(wait.parentNode) wait.parentNode.removeChild(wait);
            KT_MANUAL_HISTORY.push({ role: "assistant", content: reply });
            add(reply, "bot");
            busy = false;
            if(send) send.disabled = false;
            input.focus();
        }, 450);
    }

    form.addEventListener("submit", function(e){ e.preventDefault(); ask(input.value); });
    if(chips) chips.addEventListener("click", function(e){
        var b = e.target.closest("button");
        if(b) ask(b.textContent);
    });
}
