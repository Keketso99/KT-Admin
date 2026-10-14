// KT Admin Panel — Supabase connection
// Uses the same project + publishable key as the user app's .env.
// The publishable key is meant to be public — real access control
// happens via Postgres row-level security, not by hiding this key.

window.sb = supabase.createClient(
    "https://tkvtsvrjzaohqevuxkhc.supabase.co",
    "sb_publishable_jB4BmxofDzNDTdX_n44NcQ_zRDyydgq"
);

// Private files (ID documents, deposit proofs) are opened with a short-lived
// signed link instead of a public link. Old records store the former public
// address; this turns it into a signed one (10 minutes). Other addresses are
// returned unchanged.
window.ktSignedUrl = function(url){
    if(!url) return Promise.resolve("");
    var m = String(url).match(/\/storage\/v1\/object\/(?:public|sign)\/(kyc-documents|deposit-proofs)\/([^?]+)/);
    if(!m) return Promise.resolve(url);
    var path;
    try{ path = decodeURIComponent(m[2]); }catch(e){ path = m[2]; }
    return window.sb.storage.from(m[1]).createSignedUrl(path, 600).then(function(res){
        return (res && res.data && res.data.signedUrl) ? res.data.signedUrl : "";
    }).catch(function(){ return ""; });
};
