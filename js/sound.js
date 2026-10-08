// =========================================================
// KT ADMIN — NOTIFICATION SOUND & ALERT PREFERENCES
// Saved on THIS device (localStorage + IndexedDB for a custom file).
//
//   KTSound.isOn() / setOn(bool)           master switch for alert sounds
//   KTSound.list()                         built-in sounds [{id, name}]
//   KTSound.getChoice() / setChoice(id)    "chime" ... or "custom"
//   KTSound.preview(id)                    play a sound now (even if switched off)
//   KTSound.playAlert()                    what the app plays for a new alert
//   KTSound.saveCustomFile(file)           choose a sound from phone storage
//   KTSound.clearCustom()
//   KTSound.typeEnabled(group)             pop-up alerts per type
//   KTSound.setType(group, bool)
//
// Everything is generated with the Web Audio API — no sound files needed.
// =========================================================

(function(){

    var KEY_ON     = "kt.admin.sound";            // same key the header speaker icon uses
    var KEY_CHOICE = "kt.admin.soundChoice";
    var KEY_TYPES  = "kt.admin.alertTypes";
    var KEY_NAME   = "kt.admin.soundCustomName";

    var MAX_BYTES = 3 * 1024 * 1024;              // 3 MB
    var MAX_SECONDS = 30;

    var GROUPS = [
        { id: "deposits",     label: "Deposits" },
        { id: "withdrawals",  label: "Withdrawals" },
        { id: "verification", label: "Verification (KYC)" },
        { id: "requests",     label: "User requests (password, PIN, profile, reactivation)" },
        { id: "chat",         label: "Support chat messages" }
    ];

    var audioCtx = null;
    var currentEl = null;

    // ---------------------------------------------------------
    // storage helpers (never throw)
    // ---------------------------------------------------------
    function get(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }
    function put(key, val){ try{ localStorage.setItem(key, val); }catch(e){} }
    function del(key){ try{ localStorage.removeItem(key); }catch(e){} }

    function changed(){
        try{ window.dispatchEvent(new Event("kt-sound-changed")); }catch(e){}
    }

    // ---------------------------------------------------------
    // IndexedDB (custom sound file)
    // ---------------------------------------------------------
    function openDb(){
        return new Promise(function(resolve, reject){
            if(!window.indexedDB){ reject(new Error("Storage is not available")); return; }
            var req = indexedDB.open("kt-admin-sounds", 1);
            req.onupgradeneeded = function(){ req.result.createObjectStore("files"); };
            req.onsuccess = function(){ resolve(req.result); };
            req.onerror = function(){ reject(req.error || new Error("Storage error")); };
        });
    }

    function dbGet(){
        return openDb().then(function(db){
            return new Promise(function(resolve, reject){
                var r = db.transaction("files", "readonly").objectStore("files").get("custom");
                r.onsuccess = function(){ resolve(r.result || null); };
                r.onerror = function(){ reject(r.error); };
            });
        });
    }

    function dbPut(blob){
        return openDb().then(function(db){
            return new Promise(function(resolve, reject){
                var tx = db.transaction("files", "readwrite");
                tx.objectStore("files").put(blob, "custom");
                tx.oncomplete = function(){ resolve(); };
                tx.onerror = function(){ reject(tx.error); };
            });
        });
    }

    function dbDelete(){
        return openDb().then(function(db){
            return new Promise(function(resolve, reject){
                var tx = db.transaction("files", "readwrite");
                tx.objectStore("files").delete("custom");
                tx.oncomplete = function(){ resolve(); };
                tx.onerror = function(){ reject(tx.error); };
            });
        });
    }

    // ---------------------------------------------------------
    // Built-in sounds (Web Audio)
    // ---------------------------------------------------------
    function ctx(){
        var AC = window.AudioContext || window.webkitAudioContext;
        if(!AC) return null;
        if(!audioCtx) audioCtx = new AC();
        if(audioCtx.state === "suspended"){ try{ audioCtx.resume(); }catch(e){} }
        return audioCtx;
    }

    // one tone: freq Hz, start offset s, length s, wave type, peak gain
    function tone(c, freq, at, len, type, peak){
        var o = c.createOscillator();
        var g = c.createGain();
        var t0 = c.currentTime + at;
        o.type = type || "sine";
        o.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(peak || 0.2, t0 + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
        o.connect(g);
        g.connect(c.destination);
        o.start(t0);
        o.stop(t0 + len + 0.03);
    }

    var BUILTIN = [
        { id: "chime", name: "Chime",     play: function(c){ tone(c, 880, 0, .35); tone(c, 1175, .16, .5); } },
        { id: "bell",  name: "Bell",      play: function(c){ tone(c, 1046, 0, 1.2, "sine", .22); tone(c, 2093, 0, .8, "sine", .06); } },
        { id: "ding",  name: "Ding",      play: function(c){ tone(c, 1318, 0, .45, "sine", .25); } },
        { id: "pulse", name: "Pulse",     play: function(c){ tone(c, 660, 0, .12, "triangle", .25); tone(c, 660, .2, .12, "triangle", .25); tone(c, 660, .4, .12, "triangle", .25); } },
        { id: "soft",  name: "Soft tone", play: function(c){ tone(c, 523, 0, .5, "triangle", .2); tone(c, 659, .22, .6, "triangle", .2); } },
        { id: "alert", name: "Alert",     play: function(c){ for(var i = 0; i < 3; i++){ tone(c, 880, i * .36, .16, "square", .09); tone(c, 660, i * .36 + .17, .16, "square", .09); } } }
    ];

    function builtin(id){
        for(var i = 0; i < BUILTIN.length; i++) if(BUILTIN[i].id === id) return BUILTIN[i];
        return null;
    }

    // ---------------------------------------------------------
    // Playing
    // ---------------------------------------------------------
    function stopCurrent(){
        if(currentEl){
            try{ currentEl.pause(); }catch(e){}
            currentEl = null;
        }
    }

    function playCustom(){
        return dbGet().then(function(blob){
            if(!blob) return false;
            stopCurrent();
            var url = URL.createObjectURL(blob);
            var a = new Audio(url);
            currentEl = a;
            a.volume = 1;
            var cleanup = function(){ try{ URL.revokeObjectURL(url); }catch(e){} if(currentEl === a) currentEl = null; };
            a.addEventListener("ended", cleanup);
            a.addEventListener("error", cleanup);
            var p = a.play();
            if(p && p.catch) p.catch(cleanup);
            // never play for more than the limit
            setTimeout(function(){ try{ a.pause(); }catch(e){} cleanup(); }, MAX_SECONDS * 1000);
            return true;
        }).catch(function(){ return false; });
    }

    function preview(id){
        if(id === "custom") return playCustom();
        var b = builtin(id) || BUILTIN[0];
        var c = ctx();
        if(!c) return Promise.resolve(false);
        try{ b.play(c); }catch(e){ return Promise.resolve(false); }
        return Promise.resolve(true);
    }

    function isOn(){ return get(KEY_ON) !== "off"; }

    function setOn(on){
        put(KEY_ON, on ? "on" : "off");
        changed();
    }

    function getChoice(){
        var c = get(KEY_CHOICE) || "chime";
        if(c === "custom") return c;
        return builtin(c) ? c : "chime";
    }

    function setChoice(id){
        put(KEY_CHOICE, id === "custom" ? "custom" : (builtin(id) ? id : "chime"));
        changed();
    }

    function playAlert(){
        if(!isOn()) return;
        var choice = getChoice();
        if(choice === "custom"){
            playCustom().then(function(ok){ if(!ok) preview("chime"); });
            return;
        }
        preview(choice);
    }

    // ---------------------------------------------------------
    // Custom sound from phone storage
    // ---------------------------------------------------------
    function saveCustomFile(file){
        return new Promise(function(resolve, reject){
            if(!file) { reject(new Error("No file selected.")); return; }
            if(file.type && file.type.indexOf("audio") !== 0){
                reject(new Error("Please choose an audio file (mp3, wav, m4a, ogg...).")); return;
            }
            if(file.size > MAX_BYTES){
                reject(new Error("That file is too large. Choose a sound under 3 MB.")); return;
            }

            // make sure the browser can really play it, and that it is short
            var url = URL.createObjectURL(file);
            var probe = new Audio();
            var done = false;
            var finish = function(err){
                if(done) return;
                done = true;
                try{ URL.revokeObjectURL(url); }catch(e){}
                if(err){ reject(err); return; }
                dbPut(file).then(function(){
                    put(KEY_NAME, file.name || "Custom sound");
                    put(KEY_CHOICE, "custom");
                    changed();
                    resolve(file.name || "Custom sound");
                }).catch(function(){ reject(new Error("Could not save the sound on this device.")); });
            };
            probe.preload = "metadata";
            probe.onloadedmetadata = function(){
                if(isFinite(probe.duration) && probe.duration > MAX_SECONDS){
                    finish(new Error("That sound is longer than " + MAX_SECONDS + " seconds. Choose a shorter one."));
                } else { finish(null); }
            };
            probe.onerror = function(){ finish(new Error("That file cannot be played on this device.")); };
            probe.src = url;
            setTimeout(function(){ finish(new Error("That file could not be read.")); }, 8000);
        });
    }

    function clearCustom(){
        return dbDelete().catch(function(){}).then(function(){
            del(KEY_NAME);
            if(get(KEY_CHOICE) === "custom") put(KEY_CHOICE, "chime");
            changed();
        });
    }

    function customName(){ return get(KEY_NAME); }

    function hasCustom(){ return !!get(KEY_NAME); }

    // ---------------------------------------------------------
    // Alert types (pop-ups + sound)
    // ---------------------------------------------------------
    function readTypes(){
        try{ return JSON.parse(get(KEY_TYPES) || "{}") || {}; }catch(e){ return {}; }
    }

    function typeEnabled(group){
        var t = readTypes();
        return t[group] !== false;
    }

    function setType(group, on){
        var t = readTypes();
        t[group] = !!on;
        put(KEY_TYPES, JSON.stringify(t));
        changed();
    }

    // which group a notification record belongs to
    function groupForAction(action){
        switch(action){
            case "deposit_requested": return "deposits";
            case "withdrawal_requested": return "withdrawals";
            case "kyc_verification_requested":
            case "kyc_resubmission_requested": return "verification";
            case "support_message_received": return "chat";
            default: return "requests";
        }
    }

    window.KTSound = {
        list: function(){ return BUILTIN.map(function(b){ return { id: b.id, name: b.name }; }); },
        groups: function(){ return GROUPS.slice(); },
        isOn: isOn,
        setOn: setOn,
        getChoice: getChoice,
        setChoice: setChoice,
        preview: preview,
        playAlert: playAlert,
        saveCustomFile: saveCustomFile,
        clearCustom: clearCustom,
        customName: customName,
        hasCustom: hasCustom,
        typeEnabled: typeEnabled,
        setType: setType,
        groupForAction: groupForAction
    };

})();
