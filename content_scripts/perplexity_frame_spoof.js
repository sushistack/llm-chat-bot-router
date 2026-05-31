(function () {
  if (window.top === window) return;

  const script = document.createElement("script");
  script.textContent = `(function () {
    const _self = window;
    ["top", "parent"].forEach(function (prop) {
      try {
        Object.defineProperty(window, prop, {
          get: function () { return _self; },
          configurable: true,
        });
      } catch (e) {}
    });
    try {
      Object.defineProperty(window, "frameElement", {
        get: function () { return null; },
        configurable: true,
      });
    } catch (e) {}
  })();`;

  (document.head || document.documentElement).prepend(script);
  script.remove();
})();
