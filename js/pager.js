// =========================================================
// KT ADMIN — PAGINATION
//
// One shared page switcher « 1 2 3 » for every page that lists records.
//
//   KTPager.attach(listElement, { rows: "css selector for the record rows" })
//
// It works on top of whatever the page already draws: rows that the page's own
// search / filter / tab hides (style.display = "none") are not counted, and
// the pager only hides the rows that belong to other pages. Re-draws (live
// refresh) keep the current page. Search / filter / tab changes go back to
// page 1.
//
//   KTPager.render(hostElement, { page, pages, total, size, onPage })
// draws just the buttons (used by the Security log, which holds its own list).
// =========================================================

(function(){

    var PAGE_SIZE = 10;

    function el(tag, cls, text){
        var n = document.createElement(tag);
        if(cls) n.className = cls;
        if(text != null) n.textContent = text;
        return n;
    }

    // numbers to show: 1 … current-1 current current+1 … last
    function pageNumbers(page, pages){
        var set = {};
        [1, pages, page - 1, page, page + 1].forEach(function(n){
            if(n >= 1 && n <= pages) set[n] = true;
        });
        var list = Object.keys(set).map(Number).sort(function(a, b){ return a - b; });
        var out = [];
        list.forEach(function(n, i){
            if(i && n - list[i - 1] > 1) out.push("...");
            out.push(n);
        });
        return out;
    }

    function render(host, o){
        host.innerHTML = "";
        host.className = "kt-pager";
        if(!o.pages || o.pages <= 1){ host.hidden = true; return; }
        host.hidden = false;

        var bar = el("div", "pagination");

        function btn(label, page, disabled, active, aria){
            var b = el("button", active ? "active-page" : "", label);
            b.type = "button";
            if(aria) b.setAttribute("aria-label", aria);
            if(disabled){ b.disabled = true; }
            else b.onclick = function(){ o.onPage(page); };
            return b;
        }

        bar.appendChild(btn("«", o.page - 1, o.page <= 1, false, "Previous page"));
        pageNumbers(o.page, o.pages).forEach(function(n){
            if(n === "..."){ bar.appendChild(el("span", "kt-pager-gap", "…")); return; }
            bar.appendChild(btn(String(n), n, false, n === o.page, "Page " + n));
        });
        bar.appendChild(btn("»", o.page + 1, o.page >= o.pages, false, "Next page"));
        host.appendChild(bar);

        var from = (o.page - 1) * o.size + 1;
        var to = Math.min(o.total, o.page * o.size);
        host.appendChild(el("div", "kt-pager-info", "Showing " + from + "–" + to + " of " + o.total));
    }

    function isEmptyRow(row){
        if(row.classList.contains("kt-empty-row")) return true;
        if(/empty/i.test(row.className || "")) return true;
        var first = row.children[0];
        return !!(first && row.children.length === 1 && first.hasAttribute && first.hasAttribute("colspan"));
    }

    function pageRoot(node){
        var n = node;
        while(n && n.parentElement && n.parentElement.id !== "admin-body") n = n.parentElement;
        return n || node;
    }

    function attach(list, opts){
        if(!list || list.__ktPager) return;
        opts = opts || {};
        var size = opts.size || PAGE_SIZE;
        var rowSel = opts.rows || ":scope > *";
        var state = { page: 1 };
        var timer = null;

        var anchor = list.closest("table") || list;
        anchor.style.scrollMarginTop = "8px";
        var after = (list.closest("table") && list.closest("table").parentElement) || list;

        var host = el("div", "kt-pager");
        host.hidden = true;
        after.parentNode.insertBefore(host, after.nextSibling);

        function rows(){
            return Array.prototype.filter.call(list.querySelectorAll(rowSel), function(r){
                return !isEmptyRow(r);
            });
        }

        function recompute(){
            timer = null;
            var all = rows();
            var eligible = all.filter(function(r){ return r.style.display !== "none" && !r.hidden; });
            var pages = Math.max(1, Math.ceil(eligible.length / size));
            if(state.page > pages) state.page = pages;
            if(state.page < 1) state.page = 1;

            all.forEach(function(r){ r.classList.remove("kt-pg-hide"); });
            eligible.forEach(function(r, i){
                if(Math.floor(i / size) !== state.page - 1) r.classList.add("kt-pg-hide");
            });

            var visible = list.getClientRects().length > 0;   // not on a hidden tab
            render(host, {
                page: state.page, pages: pages, total: eligible.length, size: size,
                onPage: function(p){
                    state.page = p;
                    recompute();
                    try{ anchor.scrollIntoView({ block: "start", behavior: "smooth" }); }catch(e){}
                }
            });
            if(!visible) host.hidden = true;
        }

        function schedule(){
            if(timer) return;
            timer = setTimeout(recompute, 30);
        }

        function reset(){
            state.page = 1;
            setTimeout(recompute, 60);
        }

        var obs = new MutationObserver(schedule);
        obs.observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "hidden"] });

        // search / filter / tab changes -> page 1
        var root = pageRoot(list);
        function inModal(t){ return !!(t.closest && t.closest("[class*='modal'], [id*='odal']")); }
        function onField(e){
            var t = e.target;
            if(!t || inModal(t)) return;
            if(t.matches && t.matches("input, select, textarea")) reset();
        }
        function onClick(e){
            var t = e.target && e.target.closest ? e.target.closest("button, [role='tab'], .tab") : null;
            if(!t || inModal(t)) return;
            if(/tab/i.test(t.className || "")){ reset(); }
        }
        root.addEventListener("input", onField);
        root.addEventListener("change", onField);
        root.addEventListener("click", onClick);

        list.__ktPager = { recompute: recompute, reset: reset };
        recompute();
    }

    window.KTPager = { attach: attach, render: render, PAGE_SIZE: PAGE_SIZE };

})();
