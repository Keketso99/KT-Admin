// Stops pull-down-to-refresh in the installed admin app.
(function () {
  // Blocks the browser "pull down to refresh" gesture. A downward drag is only
  // allowed when something on screen can still scroll up (a list, a chat, a modal).
  var startY = 0, startX = 0, tracking = false;

  function canScrollUp(el) {
    while (el && el !== document.body && el !== document.documentElement) {
      var oy = window.getComputedStyle(el).overflowY;
      if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight && el.scrollTop > 0) return true;
      el = el.parentElement;
    }
    var root = document.scrollingElement || document.documentElement;
    return root.scrollTop > 0;
  }

  document.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) { tracking = false; return; }
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    tracking = true;
  }, { passive: true });

  document.addEventListener("touchmove", function (e) {
    if (!tracking || e.touches.length !== 1) return;
    var dy = e.touches[0].clientY - startY;
    var dx = e.touches[0].clientX - startX;
    if (dy > 0 && Math.abs(dy) > Math.abs(dx) && !canScrollUp(e.target) && e.cancelable) {
      e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener("touchend", function () { tracking = false; }, { passive: true });
  document.addEventListener("touchcancel", function () { tracking = false; }, { passive: true });
})();
