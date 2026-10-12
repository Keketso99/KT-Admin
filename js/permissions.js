// =========================================================
// KT ADMIN — MAIN ADMIN PERMISSIONS
//
// One admin (the "main admin") can delete records, set/change passwords and
// PINs, assign/remove admins and change Manage Plans, Exchange Rates and Media.
// Every other admin gets a "not authorized" dialog for those actions.
//
// The database enforces the same rules, so this file only decides what to
// show. KTPerm.require("delete users") returns true when allowed; otherwise it
// shows the dialog and returns false:
//
//     if(!KTPerm.require("delete users")) return;
// =========================================================

(function(){

    var state = { isSuper: false, superId: null, loaded: false };

    function load(){
        return sb.rpc("admin_permission_info").then(function(res){
            if(res.error){
                // The database function is not installed yet (or a network
                // problem). Do not lock the app: the database still enforces
                // the rules on every action.
                state.isSuper = true;
                state.superId = null;
            } else {
                var d = res.data || {};
                state.isSuper = d.is_super === true;
                state.superId = d.super_id || null;
            }
            state.loaded = true;
            return state.isSuper;
        }).catch(function(){
            state.isSuper = true;
            state.loaded = true;
            return true;
        });
    }

    function deny(action){
        var what = action ? " " + action : " perform this action";
        KTUI.alert("You are not authorized to" + what + ".", {
            title: "Not authorized",
            type: "warning",
            okText: "Close"
        });
        return false;
    }

    function require(action){
        if(state.isSuper) return true;
        return deny(action);
    }

    window.KTPerm = {
        load: load,
        require: require,
        deny: deny,
        get isSuper(){ return state.isSuper; }
    };

    // a different account signing in must be checked again
    if(typeof sb !== "undefined" && sb.auth && typeof sb.auth.onAuthStateChange === "function"){
        sb.auth.onAuthStateChange(function(event){
            if(event === "SIGNED_OUT"){
                state.isSuper = false; state.superId = null; state.loaded = false;
            }
        });
    }

})();
