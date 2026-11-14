// Manual page: a built-in guide that answers "how do I...?" questions about the
// admin app. Works fully inside the admin app (no server, no AI service needed).
// It only knows how to USE the app and refuses anything sensitive.

// Conversations are kept per admin, only in memory: logging out (or another
// admin signing in) starts everyone fresh.
var KT_MANUAL_CHATS = {};
var KT_MANUAL_UID = null;
var KT_MANUAL_HISTORY = [];

(function(){
    if(!window.sb || !sb.auth || !sb.auth.onAuthStateChange) return;
    // Only sets variables here (no supabase calls inside this callback).
    sb.auth.onAuthStateChange(function(event, session){
        var uid = session && session.user ? session.user.id : null;
        if(event === "SIGNED_OUT" || !uid){
            KT_MANUAL_CHATS = {};
            KT_MANUAL_UID = null;
            KT_MANUAL_HISTORY = [];
            return;
        }
        if(uid !== KT_MANUAL_UID){
            KT_MANUAL_CHATS = {};
            KT_MANUAL_HISTORY = [];
        }
        KT_MANUAL_UID = uid;
    });
})();

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
      a: "To delete a user: Users > tap the user > Delete > confirm. The user is moved to the Trash, nothing is erased yet. Their deposits, withdrawals, transactions and plans stay in the other pages and in the Dashboard totals. To bring them back or erase them for good, open Settings > Trash. If the app says you are not authorized, this action is not available to your account." },
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
    { k: [["login","history"],["audit"],["login","record"],["profit","loss"]],
      a: "Settings > Audit has profit and loss balancing, a spreadsheet download, and delete audit records. Deleting audit records only affects the audit, not deposits, withdrawals or wallets. Sign-ins and security events are in Settings > Security log. Delete options may not be available to your account." },
    { k: [["activity"],["log"],["history"]],
      a: "Activity Logs lists the actions taken in the app. Tap an entry to see Activity Details. Use search and filters to find entries." },
    { k: [["media"],["video"],["guide"],["download"],["upload"]],
      a: "Media has tabs: Overview, Videos, Guides and Downloads. In Guides and Downloads, use the Add button to upload an item, tap an item to edit or delete it, and use the search and filters to find items. The Videos tab is read-only: videos can no longer be added, edited or deleted, because the lessons in the user app are now built into the app. Video guides (Help & Support and Home) show a thumbnail in the user app before the video is played: when you add a video guide you can choose a thumbnail image, or leave it empty and the first picture of the video is used automatically. For a video guide that has no thumbnail yet, open it and tap Save once to create one." },
    { k: [["dashboard"],["total","users"],["overview"]],
      a: "The Dashboard shows overview cards: total users (users only, admins are not included), active plans, Total Deposits and Total Withdrawals. The two money totals keep counting approved deposits and withdrawals even after you delete those records. To lower a total by an amount, use Settings > Manual delete > Dashboard." },
    { k: [["logout"],["log","out"],["sign","out"]],
      a: "To log out: open the menu and tap Logout at the bottom of the sidebar, then tap Confirm." },
    { k: [["login"],["sign","in"],["forgot","my"],["install"],["home","screen"]],
      a: "Sign in with your admin email and password. To install the app, use your browser's Install or Add to Home screen option." },
    { k: [["not","authorized"],["not","allowed"],["cant"],["can't"],["cannot"]],
      a: "If the app says you are not authorized to do something, that action is not available to your account." },
    { k: [["withdrawal","day"],["days","between","withdrawals"],["waiting","days"],["withdrawal","wait"],["same","for","everyone"],["shared","timer"],["open","closed","timer"],["withdrawal","timer"],["withdrawal","schedule"],["open","time"],["closed","time"]],
      a: "Withdrawal Day (Finance > Withdrawals > Withdrawal Day) has two modes:\n\nPer user: each user has their own timer. After a user's withdrawal is approved, that user waits the number of days you set (0 to 365) before the next one. Enter the days and tap Save. 0 means no waiting, but a user can still send only one request at a time.\n\nSame for everyone: one shared timer for all users, not tied to anyone's withdrawal. Enter an Open time and a Closed time (days, hours, minutes, seconds), then tap Start. Withdrawals open for everyone right away for the open time, then close for everyone for the closed time, and this repeats. In each open period a user can make one request (a rejected request can be sent again). Start replaces the per user timers. To change the times, enter new ones and tap Restart (it starts again with an open period). Tap Stop to go back to the per user timers.\n\nChanging the per user days does not affect countdowns already running. Only the main admin can change this." },
    { k: [["method","switch"],["close","method"],["open","method"],["turn","method"],["disable","method"],["enable","method"],["switch","off","method"],["method","button"],["method","closed"],["switch","off"],["turn","off","deposits"],["turn","off","withdrawals"],["close","deposits"],["close","withdrawals"]],
      a: "To open or close a method (USDT, M-Pesa, EcoCash):\n1. Open Finance > Withdrawals or Finance > Deposits.\n2. Tap Method.\n3. Use the switch next to the method. On means open, off means closed.\nThe withdrawal and deposit switches are separate. When a method is off, users see that it is closed and cannot continue with it. Requests already sent are not affected." },
    { k: [["payment","details"],["payments","button"],["change","address"],["usdt","address"],["till","number"],["merchant","code"],["change","title"],["edit","payment"],["deposit","details"]],
      a: "To change what users see and copy on the Deposit page:\n1. Open Finance > Deposits.\n2. Tap Payments.\n3. For each method (USDT, M-Pesa, EcoCash) edit the Title and the Details. For USDT the details are the address, and any text is accepted, it is not checked.\n4. Tap Save on that method and confirm.\nUsers see the new details straight away. They are not notified." },
    { k: [["usdt","network"],["trc","20"],["network","brackets"],["change","network"],["erc","20"],["bep","20"]],
      a: "The USDT network is the part in brackets in the USDT title, for example USDT ADDRESS (TRC-20). In Finance > Deposits > Payments, USDT has two fields: Title (the part outside the brackets) and Network (the part inside). The network shows everywhere users and admins see USDT, for deposits and withdrawals.\nImportant:\n- You cannot change the USDT title, network or address while there are pending USDT deposits or withdrawals. Approve or reject them first.\n- When you change the address or network, every user's linked USDT method is removed and they must link a new one. The app shows you this before you confirm." },
    { k: [["usdt","pending"],["cannot","change","usdt"],["usdt","blocked"],["linked","usdt"]],
      a: "USDT payment details cannot be changed while any USDT deposit or withdrawal is pending, so nobody pays to a changed address by mistake. Handle the pending requests first (Finance > Deposits and Finance > Withdrawals), then change it in Payments. After a change, users must link their USDT method again." },
    { k: [["manual","delete"],["delete","records"],["delete","old"],["delete","deposits"],["delete","withdrawals"],["delete","notifications"],["delete","logs"],["clear","records"]],
      a: "Settings > Manual delete removes records of one page at a time: Deposits, Withdrawals, Transactions, Notifications, Security log or Activity log.\n1. Open Settings, enter the settings password, tap Manual delete.\n2. Choose the page.\n3. Delete by days (older than, or the last N days) with Check and delete, or press and hold a record to select the ones you want and tap Delete.\nPending deposits and withdrawals are never deleted. Deleting never changes other pages, wallet balances or the Dashboard totals. Deleted records cannot be restored. Only the main admin can use it." },
    { k: [["reduce","dashboard"],["lower","dashboard"],["deduct","dashboard"],["reduce","total"],["lower","total"],["deduct","total"],["total","deposits"],["total","withdrawals"],["dashboard","amount"]],
      a: "To lower the Dashboard totals by an amount:\n1. Open Settings, enter the settings password, tap Manual delete, then the Dashboard button.\n2. Choose Total withdrawals or Total deposits.\n3. Enter the amount to deduct. It must be more than 0 and cannot be more than the current total.\n4. Tap Check and deduct and confirm.\nOnly the Dashboard number changes. Deposits, withdrawals, transactions and wallets stay as they are. It cannot be undone, but every deduction is kept in the History list of that section and in the activity log. Later approved deposits and withdrawals still add to the total." },
    { k: [["trash"],["restore","user"],["erase","user"],["deleted","users"],["bring","back","user"]],
      a: "Settings > Trash holds users you deleted from the Users page. Open Settings, enter the settings password, tap Trash. You can restore a user, or erase them for good. Erasing removes their personal data, but their deposits, withdrawals, transactions and plans stay in the other pages and in the Dashboard totals, shown as Deleted user. Erasing cannot be undone, so download the spreadsheet offered first if you need a copy." },
    { k: [["trusted","device"],["new","device"],["approve","device"],["remove","device"]],
      a: "Settings > Trusted Devices lists the devices admins sign in from. Approve a new device or remove one you no longer trust." },
    { k: [["security","log"],["wrong","code"],["locked","admin"],["sign","out","everywhere"],["sign","ins"]],
      a: "Settings > Security log shows sign-ins, wrong codes, new devices and locked admins, and has a sign out everywhere option. Open Settings and enter the settings password first." },
    { k: [["lessons"],["educational"],["film","icon"],["add","video"],["upload","video"],["video","lessons"]],
      a: "The film icon page in the user app now shows 16 educational lessons, each 10 pages (crypto basics up to futures, margin trading and trading bots) that are part of the app itself. They do not affect user earnings. Because of this, Media > Videos is read-only: videos can no longer be added, edited or deleted there." },
    { k: [["referral"],["referrals"],["invite"],["invited"]],
      a: "Referrals let a verified user invite friends for extra earning. It never affects withdrawals.\n- A user gets a 6-digit referral code automatically when their verification (KYC) is approved. Friends type it in the optional Referral code field when they sign up.\n- To see a user's referrals: Users > tap the user > Referrals. You see their Total earned, their code (with a copy button), a search box and the list of people they invited. A green tick means the reward was earned, three gray dots mean not yet.\n- The reward is paid once, when the invited person's first deposit is approved. It goes to the referrer's balance and shows in their History > Mining as Referral reward.\n- Referred users stay in the list until they are deleted for good. Total earned never goes down.\n- The reward amount is set in Settings > Referrals." },
    { k: [["referral","reward"],["referral","amount"],["change","referral"],["set","referral"],["referral","settings"],["referral","pay"],["referral","earn"]],
      a: "The referral reward is one amount for everyone, set in Settings > Referrals (enter your settings password first). It shows the Referral reward and the Total distributed.\nOnly the main admin can change it: tap the pen (Change), enter the amount and save. Other admins can see it but get a not authorised message if they try to change it.\nThe new amount applies from the next reward onward and shows instantly in every user's app. Rewards already paid keep their old amount. The reward is paid once per referred person, on their first approved deposit, so if the amount is 0 at that moment that person never earns a reward." },
    { k: [["total","distributed"],["rewards","distributed"],["referral","total"],["referral","paid"],["referral","distributed"]],
      a: "Settings > Referrals (enter your settings password) shows Total distributed: all referral rewards paid to all users so far, with the number of rewards paid. It never goes down, even when a user is deleted for good. To see one user's total, open Users > tap the user > Referrals." },
    { k: [["hello"],["hi"],["help"],["manual"],["what","can","you"]],
      a: "I can show you how to do things in the admin app: withdrawals, deposits, payment methods and details, users, verification, plans, exchange rates, notifications, support chat, media, referrals and settings. Ask me a how-to question." }
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

    var chatKey = KT_MANUAL_UID || "me";
    KT_MANUAL_HISTORY = KT_MANUAL_CHATS[chatKey] || (KT_MANUAL_CHATS[chatKey] = []);
    var generation = 0;

    function show(){
        msgs.innerHTML = "";
        if(KT_MANUAL_HISTORY.length){
            KT_MANUAL_HISTORY.forEach(function(m){ add(m.content, m.role === "user" ? "me" : "bot"); });
            if(chips) chips.style.display = "none";
        } else {
            add("Hi! I'm the admin manual. Ask me how to do anything in the app.", "bot");
            if(chips) chips.style.display = "";
        }
    }
    show();

    var busy = false;

    var refresh = document.getElementById("manRefresh");
    if(refresh) refresh.addEventListener("click", function(){
        generation++;            // ignore any answer still on its way
        KT_MANUAL_HISTORY.length = 0;
        busy = false;
        if(send) send.disabled = false;
        input.value = "";
        show();
        input.focus();
    });

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

        var myGen = generation;
        setTimeout(function(){
            if(myGen !== generation) return;
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
