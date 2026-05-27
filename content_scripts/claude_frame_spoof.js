console.log('[llm-router] content script loaded in', location.href);

// Override window.parent + innerWidth in page context before Claude scripts run
const s = document.createElement('script');
s.textContent = `(function () {
  try { Object.defineProperty(window, 'parent', { get: () => window, configurable: true }); } catch (_) {}
  try { Object.defineProperty(window, 'innerWidth', { get: () => 1440, configurable: true }); } catch (_) {}

  // After React renders, inspect internals to find sidebar state dispatch
  window.addEventListener('load', function () {
    setTimeout(function () {
      // Next.js router / data
      try {
        const nd = window.__NEXT_DATA__;
        console.log('[llm-router] __NEXT_DATA__ page:', nd && nd.page, '| props keys:', nd && Object.keys(nd.props || {}).join(','));
      } catch(e) {}
      try {
        const nr = window.next && window.next.router;
        console.log('[llm-router] next.router pathname:', nr && nr.pathname, '| route:', nr && nr.route);
      } catch(e) {}

      // Body direct children (layout structure)
      Array.from(document.body.children).forEach((el, i) => {
        console.log('[llm-router] body[' + i + ']', el.tagName, el.id || '', el.className.substring(0, 80));
      });

      // Find React fiber key
      const rootEl = document.getElementById('__next');
      const fiberKey = rootEl && Object.keys(rootEl).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternals'));
      console.log('[llm-router] react fiber key:', fiberKey || 'NOT FOUND');

      if (rootEl && fiberKey) {
        // Walk fiber tree looking for sidebar/nav state
        function walkFiber(fiber, depth) {
          if (!fiber || depth > 200) return;
          const ms = fiber.memoizedState;
          if (ms && ms.queue && typeof ms.queue.dispatch === 'function') {
            const val = ms.memoizedState;
            const str = typeof val === 'boolean' || typeof val === 'string' ? String(val)
              : (val && typeof val === 'object' ? Object.keys(val).join(',') : typeof val);
            const name = fiber.type && (fiber.type.displayName || fiber.type.name || '');
            if (str.length < 200) {
              console.log('[llm-router] hook state | comp:', name, '| val:', str, '| dispatch:', ms.queue.dispatch.toString().substring(0, 60));
            }
          }
          walkFiber(fiber.child, depth + 1);
          walkFiber(fiber.sibling, depth + 1);
        }
        try { walkFiber(rootEl[fiberKey], 0); } catch(e) { console.log('[llm-router] fiber walk error:', e.message); }
      }
    }, 3000);
  });
})();`;
(document.head || document.documentElement).prepend(s);
s.remove();
