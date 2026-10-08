// =========================================================
// KT ADMIN — PUSH NOTIFICATIONS (device side)
// Lets an admin device receive notifications even when the app is closed.
// The notifications themselves are built on the server from the
// notification records (see supabase/functions/send-push).
//
// Header bell:   bell = on,  bell-slash = off.   Tap to turn on / off.
// Loaded after realtime.js. Requires `sb`.
// =========================================================

(function(){

    var VAPID_PUBLIC_KEY = "BEX5orXdHfmARKoe42fYAZIoMShjsZHKBi-lXnp_54dorhTg6neqCoUi53vB1_Im-fO6WydHf1c0xLtRgWgOk-M";

    function supported(){
        return ("serviceWorker" in navigator) && ("PushManager" in window) && ("Notification" in window);
    }

    function toBytes(b64u){
        var pad = "=".repeat((4 - b64u.length % 4) % 4);
        var b64 = (b64u + pad).replace(/-/g, "+").replace(/_/g, "/");
        var raw = atob(b64);
        var out = new Uint8Array(raw.length);
        for(var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
        return out;
    }

    function say(title, text){
        if(window.KTRealtime && KTRealtime.toast) KTRealtime.toast(title, text, null);
        else if(window.KTUI) KTUI.notify(title + ": " + text);
    }

    function getRegistration(){
        return navigator.serviceWorker.ready;
    }

    function currentSubscription(){
        return getRegistration().then(function(reg){ return reg.pushManager.getSubscription(); });
    }

    function saveSubscription(sub){
        return sb.auth.getSession().then(function(res){
            var session = res && res.data && res.data.session;
            if(!session) return false;

            var json = sub.toJSON();
            var keys = json.keys || {};

            return sb.from("admin_push_subscriptions")
                .upsert({
                    user_id: session.user.id,
                    endpoint: sub.endpoint,
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                    user_agent: navigator.userAgent,
                    last_seen_at: new Date().toISOString()
                }, { onConflict: "endpoint" })
                .then(function(r){
                    if(r.error){ console.warn("[KTPush] save failed", r.error); return false; }
                    return true;
                });
        });
    }

    function subscribe(){
        return getRegistration().then(function(reg){
            return reg.pushManager.getSubscription().then(function(existing){
                if(existing) return existing;
                return reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: toBytes(VAPID_PUBLIC_KEY)
                });
            });
        });
    }

    // ---- header bell ------------------------------------------------
    var bell = null;

    function paint(on){
        if(!bell) return;
        bell.className = "fa-solid " + (on ? "fa-bell" : "fa-bell-slash");
        bell.style.color = on ? "" : "#9aa3b2";
        bell.title = on ? "Notifications are on (tap to turn off)" : "Turn on notifications";
    }

    function refreshBell(){
        if(!supported()){ paint(false); return Promise.resolve(false); }
        if(Notification.permission !== "granted"){ paint(false); return Promise.resolve(false); }
        return currentSubscription().then(function(sub){
            paint(!!sub);
            return !!sub;
        }).catch(function(){ paint(false); return false; });
    }

    function enable(){
        if(!supported()){
            say("Notifications unavailable",
                "This browser cannot show push notifications. On iPhone, add the app to the Home Screen first.");
            return Promise.resolve(false);
        }
        if(Notification.permission === "denied"){
            say("Notifications are blocked", "Allow notifications for this app in your phone / browser settings, then try again.");
            return Promise.resolve(false);
        }

        return Notification.requestPermission().then(function(permission){
            if(permission !== "granted"){
                paint(false);
                say("Notifications not allowed", "Permission was not granted.");
                return false;
            }
            return subscribe().then(saveSubscription).then(function(ok){
                paint(ok);
                try{ window.dispatchEvent(new Event("kt-push-changed")); }catch(e){}
                say(ok ? "Notifications on" : "Could not turn on notifications",
                    ok ? "You will be alerted even when the app is closed." : "Please try again.");
                return ok;
            });
        }).catch(function(e){
            console.warn("[KTPush] enable failed", e);
            say("Could not turn on notifications", "Please try again.");
            return false;
        });
    }

    function disable(){
        return currentSubscription().then(function(sub){
            if(!sub) return true;
            var endpoint = sub.endpoint;
            return sub.unsubscribe().then(function(){
                return sb.from("admin_push_subscriptions").delete().eq("endpoint", endpoint);
            }).then(function(){ return true; });
        }).then(function(){
            paint(false);
            try{ window.dispatchEvent(new Event("kt-push-changed")); }catch(e){}
            say("Notifications off", "This device will no longer get alerts while the app is closed.");
        }).catch(function(e){ console.warn("[KTPush] disable failed", e); });
    }

    function installBell(){
        if(document.getElementById("kt-push-toggle")) return;
        var logout = document.getElementById("logout-btn");
        if(!logout || !logout.parentNode) return;

        bell = document.createElement("i");
        bell.id = "kt-push-toggle";
        bell.style.cssText = "margin-left:12px;cursor:pointer;";
        bell.addEventListener("click", function(){
            refreshBell().then(function(on){ return on ? disable() : enable(); });
        });
        logout.parentNode.insertBefore(bell, logout);
        paint(false);
    }

    // Call once after sign-in.
    function init(){
        installBell();
        if(!supported()) return;

        // Already allowed on this device: make sure the subscription exists and is saved.
        if(Notification.permission === "granted"){
            subscribe().then(saveSubscription).then(refreshBell).catch(function(e){
                console.warn("[KTPush] sync failed", e);
            });
        } else {
            refreshBell();
        }
    }

    // { supported, permission, subscribed }
    function status(){
        if(!supported()){
            return Promise.resolve({ supported: false, permission: "unsupported", subscribed: false });
        }
        if(Notification.permission !== "granted"){
            return Promise.resolve({ supported: true, permission: Notification.permission, subscribed: false });
        }
        return currentSubscription().then(function(sub){
            return { supported: true, permission: "granted", subscribed: !!sub };
        }).catch(function(){
            return { supported: true, permission: "granted", subscribed: false };
        });
    }

    window.KTPush = { init: init, enable: enable, disable: disable, status: status };

})();
