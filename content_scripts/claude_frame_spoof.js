// Inject before any page JS runs so React's iframe-detection sees window.top === window.
// Also observes exactly what DOM change hides the sidebar, for diagnosis.

(function () {
  if (window.top === window) return;

  const script = document.createElement("script");
  script.textContent = `(function () {
    // ── 1. Spoof iframe-detection properties ─────────────────────────────
    const _self = window;
    let spoofed = {};
    ["top", "parent"].forEach(function (prop) {
      try {
        Object.defineProperty(window, prop, {
          get: function () { return _self; },
          configurable: true,
        });
        spoofed[prop] = window[prop] === _self;
      } catch (e) {
        spoofed[prop + "_err"] = e.message;
      }
    });
    try {
      Object.defineProperty(window, "frameElement", {
        get: function () { return null; },
        configurable: true,
      });
      spoofed.frameElement = window.frameElement === null;
    } catch (e) {
      spoofed.frameElement_err = e.message;
    }
    console.log("[claude-spoof] property override result:", JSON.stringify(spoofed));

    // ── 2. Capture-restore: clone sidebar before React removes it ────────────
    var _capturedNav    = null;
    var _capturedParent = null;
    var _capturedNext   = null;   // next sibling — for re-insertion order
    var _restoreGuard   = false;

    function restoreNav() {
      if (_restoreGuard || !_capturedNav || !_capturedParent) return;
      if (document.contains(_capturedNav)) return;  // still in DOM
      _restoreGuard = true;
      console.log("[claude-spoof] RESTORING nav to DOM");
      try {
        if (_capturedNext && document.contains(_capturedNext)) {
          _capturedParent.insertBefore(_capturedNav, _capturedNext);
        } else {
          _capturedParent.appendChild(_capturedNav);
        }
      } catch (e) {
        console.warn("[claude-spoof] restore failed:", e.message);
      }
      _restoreGuard = false;
    }

    var _obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.type !== "childList") return;

        // Log what's being added (debug — first 3 seconds only)
        if (!_capturedNav && window._spoof_logUntil && Date.now() < window._spoof_logUntil) {
          m.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1 || node.tagName === "SCRIPT" || node.tagName === "STYLE") return;
            console.log("[claude-spoof] ADDED:", node.tagName,
              (node.dataset && node.dataset.testid) || "",
              node.className.toString().slice(0, 80));
          });
        }

        // Capture: any nav OR aside OR element containing pin-sidebar-toggle
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1 || _capturedNav) return;
          var target = null;
          if (node.tagName === "NAV" || node.tagName === "ASIDE") {
            target = node;
          } else if (node.querySelector) {
            target = node.querySelector("nav") || node.querySelector("aside") ||
                     node.querySelector('[data-testid="pin-sidebar-toggle"]');
            if (target && target.tagName !== "NAV" && target.tagName !== "ASIDE") {
              // found toggle inside a div — capture the closest sizeable parent
              target = target.closest("nav,aside") || target.parentElement;
            }
          }
          if (!target) return;
          _capturedNav    = target;
          _capturedParent = target.parentElement;
          _capturedNext   = target.nextSibling;
          console.log("[claude-spoof] CAPTURED:", target.tagName, target.className.toString().slice(0, 100));
        });

        // Restore: watch for captured element being removed
        m.removedNodes.forEach(function (node) {
          if (node !== _capturedNav) return;
          console.log("[claude-spoof] REMOVED by React — restoring");
          window.requestAnimationFrame(restoreNav);
        });
      });
    });

    window._spoof_logUntil = Date.now() + 3000;

    _obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    console.log("[claude-spoof] capture-restore observer active");
  })();`;

  (document.head || document.documentElement).prepend(script);
  script.remove();
})();
