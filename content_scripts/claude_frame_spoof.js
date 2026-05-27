console.log('[llm-router] content script loaded in', location.href);

// Override window.parent + innerWidth in page context before Claude scripts run
const s = document.createElement('script');
s.textContent = `(function () {
  const r = {};
  try { Object.defineProperty(window, 'parent', { get: () => window, configurable: true }); r.parent = 'ok'; } catch (e) { r.parent = e.message; }
  try { Object.defineProperty(window, 'innerWidth', { get: () => 1440, configurable: true }); r.innerWidth = 'ok'; } catch (e) { r.innerWidth = e.message; }
  console.log('[llm-router] spoof:', JSON.stringify(r), '| top===window:', window.top === window);
})();`;
(document.head || document.documentElement).prepend(s);
s.remove();

// After React renders, inspect DOM to find the sidebar toggle button
setTimeout(() => {
  const bodyClass = document.body?.className || '';
  const htmlClass = document.documentElement?.className || '';
  console.log('[llm-router] body.class:', JSON.stringify(bodyClass));
  console.log('[llm-router] html.class:', JSON.stringify(htmlClass));

  // Log all buttons visible in the top 120px
  document.querySelectorAll('button').forEach(btn => {
    const r = btn.getBoundingClientRect();
    const style = getComputedStyle(btn);
    if (r.top < 120) {
      console.log('[llm-router] btn@top:', Math.round(r.top), Math.round(r.left),
        '| aria-label:', btn.getAttribute('aria-label'),
        '| data-testid:', btn.getAttribute('data-testid'),
        '| display:', style.display,
        '| visibility:', style.visibility,
        '| class:', btn.className.substring(0, 80));
    }
  });

  // Log first nav/header element HTML snippet
  const nav = document.querySelector('nav, header, [role="navigation"]');
  if (nav) console.log('[llm-router] nav/header snippet:', nav.outerHTML.substring(0, 600));
  else console.log('[llm-router] no nav/header found');
}, 3000);
