// Manual page: AI chat that teaches how to use the admin app.
// Talks to the "admin-manual" backend function with the admin's own session.

var KT_MANUAL_HISTORY = [];

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
        send.disabled = true;
        if(chips) chips.style.display = "none";
        add(text, "me");
        KT_MANUAL_HISTORY.push({ role: "user", content: text });
        input.value = "";

        var wait = document.createElement("div");
        wait.className = "kt-man-msg bot kt-man-dots";
        wait.innerHTML = "<span></span><span></span><span></span>";
        msgs.appendChild(wait);
        msgs.scrollTop = msgs.scrollHeight;

        function finish(){
            busy = false;
            send.disabled = false;
            if(wait.parentNode) wait.parentNode.removeChild(wait);
            input.focus();
        }

        sb.functions.invoke("admin-manual", { body: { messages: KT_MANUAL_HISTORY.slice(-12) } })
        .then(function(r){
            finish();
            var reply = r && r.data && r.data.reply;
            if(r.error || !reply){
                KT_MANUAL_HISTORY.pop();
                add("The manual is unavailable right now. Please try again.", "bot err");
                return;
            }
            KT_MANUAL_HISTORY.push({ role: "assistant", content: reply });
            add(reply, "bot");
        })
        .catch(function(){
            finish();
            KT_MANUAL_HISTORY.pop();
            add("The manual is unavailable right now. Please try again.", "bot err");
        });
    }

    form.addEventListener("submit", function(e){ e.preventDefault(); ask(input.value); });
    if(chips) chips.addEventListener("click", function(e){
        var b = e.target.closest("button");
        if(b) ask(b.textContent);
    });
}
