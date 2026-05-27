// Content script runs in the claude.ai iframe at document_start.
// Logs go to the Firefox Browser Console (Ctrl+Shift+J).
console.log('[llm-router] content script loaded in', location.href);

const s = document.createElement('script');
s.textContent = `(function () {
  const r = {};
  try {
    Object.defineProperty(window, 'top',    { get: () => window, configurable: true });
    r.top = 'ok';
  } catch (e) { r.top = e.message; }
  try {
    Object.defineProperty(window, 'parent', { get: () => window, configurable: true });
    r.parent = 'ok';
  } catch (e) { r.parent = e.message; }
  try {
    const orig = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { get: () => 1440, configurable: true });
    r.innerWidth = 'ok (was ' + orig + ')';
  } catch (e) { r.innerWidth = e.message; }
  console.log('[llm-router] page-context spoof result:', JSON.stringify(r));
  console.log('[llm-router] window.top===window:', window.top === window, '| innerWidth:', window.innerWidth);
})();`;
(document.head || document.documentElement).prepend(s);
s.remove();
