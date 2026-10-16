// KT Admin Panel — Supabase connection
// Uses the same project + publishable key as the user app's .env.
// The publishable key is meant to be public — real access control
// happens via Postgres row-level security, not by hiding this key.

window.sb = supabase.createClient(
    "https://tkvtsvrjzaohqevuxkhc.supabase.co",
    "sb_publishable_jB4BmxofDzNDTdX_n44NcQ_zRDyydgq"
);

// Checks an email + password WITHOUT touching the signed-in session
// (uses a throw-away client that stores nothing). Resolves true / false.
window.ktVerifyPassword = function(email, password){
    try{
        var tmp = supabase.createClient(
            "https://tkvtsvrjzaohqevuxkhc.supabase.co",
            "sb_publishable_jB4BmxofDzNDTdX_n44NcQ_zRDyydgq",
            { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "kt-verify-tmp" } }
        );
        return tmp.auth.signInWithPassword({ email: email, password: password }).then(function(r){
            return !r.error;
        }, function(){ return false; });
    }catch(e){
        return Promise.resolve(false);
    }
};

// Private files (ID documents, deposit proofs, support-chat files) are opened
// with a short-lived signed link instead of a public link. Old records store the
// former public address; this turns it into a signed one (10 minutes, kept for
// 8). Other addresses are returned unchanged.
(function(){
    var RE = /\/storage\/v1\/object\/(?:public|sign)\/(kyc-documents|deposit-proofs|support-chat)\/([^?]+)/;
    var cache = {};

    // already-signed link, or null (lets a page draw immediately when it can)
    window.ktSignedUrlCached = function(url){
        if(!url) return "";
        if(!RE.test(String(url))) return url;
        var hit = cache[url];
        return hit && hit.expires > Date.now() ? hit.url : null;
    };

    window.ktSignedUrl = function(url){
        if(!url) return Promise.resolve("");
        var m = String(url).match(RE);
        if(!m) return Promise.resolve(url);
        var hit = cache[url];
        if(hit && hit.expires > Date.now()) return Promise.resolve(hit.url);
        var path;
        try{ path = decodeURIComponent(m[2]); }catch(e){ path = m[2]; }
        return window.sb.storage.from(m[1]).createSignedUrl(path, 600).then(function(res){
            var u = (res && res.data && res.data.signedUrl) ? res.data.signedUrl : "";
            if(u) cache[url] = { url: u, expires: Date.now() + 8 * 60 * 1000 };
            return u;
        }).catch(function(){ return ""; });
    };

    // set an element attribute now if possible, otherwise as soon as the link is ready
    window.ktApplySigned = function(el, attr, url){
        var now = window.ktSignedUrlCached(url);
        if(now !== null){ el.setAttribute(attr, now); return; }
        window.ktSignedUrl(url).then(function(u){ if(u) el.setAttribute(attr, u); });
    };
})();
