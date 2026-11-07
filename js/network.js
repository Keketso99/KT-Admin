// =========================================================
// KT ADMIN — USDT NETWORK LABEL
// The network (e.g. TRC-20) is set in Deposits > Payments. Every deposit,
// withdrawal and linked address remembers the network it was made under
// (column "network"). Records made before that existed have no network
// stored and were all TRC-20, so an empty value means TRC-20.
// =========================================================

window.KTNetwork = {

    LEGACY: "TRC-20",

    // "USDT (TRC-20)" for a USDT record, the plain label for the others
    label: function(method, recordNetwork){

        var plain = { mpesa: "M-Pesa", ecocash: "EcoCash" };

        if(method === "usdt_trc20"){
            return "USDT (" + (String(recordNetwork || "").trim() || this.LEGACY) + ")";
        }

        return plain[method] || method;

    }

};
