// Inject into the page context before Claude's scripts run,
// so window.top/parent appear as if this is a top-level window.
const s = document.createElement('script');
s.textContent = `(function () {
  try {
    Object.defineProperty(window, 'top',    { get: () => window, configurable: true });
    Object.defineProperty(window, 'parent', { get: () => window, configurable: true });
  } catch (_) {}
})();`;
(document.head || document.documentElement).prepend(s);
s.remove();
