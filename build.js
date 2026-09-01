// build.js — run with: node build.js
//
// Concatenates all per-page CSS and JS files (in load order) into
// two bundle files, so admin.html loads 2 files instead of 20+.
//
// Your per-page files in css/ and js/ stay the source of truth —
// keep editing those directly like you do now. Just re-run this
// script (node build.js) after you're done editing, before you
// test or deploy, so dist/ picks up your changes.

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;

const CSS_ORDER = [
    "css/admin.css",
    "css/dashboard.css",
    "css/withdrawals.css",
    "css/deposits.css",
    "css/transactions.css",
    "css/plans.css",
    "css/users.css",
    "css/verification.css",
    "css/exchange.css",
    "css/notifications.css",
    "css/activity-log.css",
    "css/support-chat.css",
    "css/settings.css"
];

const JS_ORDER = [
    "js/supabase-client.js",
    "js/auth.js",
    "js/admin.js",
    "js/withdrawals.js",
    "js/deposits.js",
    "js/transactions.js",
    "js/plans.js",
    "js/users.js",
    "js/verification.js",
    "js/exchange.js",
    "js/notifications.js",
    "js/activity-log.js",
    "js/support-chat.js",
    "js/settings.js",
    "js/dashboard.js"
];

function bundle(fileList, outPath){
    const parts = fileList.map(relPath=>{
        const fullPath = path.join(ROOT, relPath);
        const content = fs.readFileSync(fullPath, "utf8");
        return `/* ===== ${relPath} ===== */\n${content}`;
    });

    const outDir = path.dirname(path.join(ROOT, outPath));
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(ROOT, outPath), parts.join("\n\n"));
    console.log("Built:", outPath);
}

bundle(CSS_ORDER, "dist/admin.bundle.css");
bundle(JS_ORDER, "dist/admin.bundle.js");
