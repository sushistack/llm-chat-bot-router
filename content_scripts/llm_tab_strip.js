function getCurrentTabId(tabs) {
  const origin = window.location.origin;
  for (const tab of tabs) {
    try {
      if (new URL(tab.url).origin === origin) return tab.id;
    } catch (_) {}
  }
  return null;
}

function faviconUrlFor(tab) {
  if (!tab.icon) return null;
  if (/^(https?:|data:)/.test(tab.icon)) return tab.icon;
  return browser.runtime.getURL(tab.icon);
}

(async () => {
  if (window.top !== window) return;

  const stored = await browser.storage.local.get(["tabs", "activeTabId"]);
  const tabs = Array.isArray(stored.tabs)
    ? stored.tabs.filter(t => t.enabled !== false)
    : [];
  if (tabs.length === 0) return;

  const activeId = getCurrentTabId(tabs);

  const style = document.createElement("style");
  style.textContent = `
    #llm-router-strip {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 40px;
      z-index: 2147483647;
      background: #1a1b1e;
      border-bottom: 1px solid #2c2e33;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 6px;
      overflow-x: auto;
      scrollbar-width: thin;
      box-sizing: border-box;
    }
    #llm-router-strip button {
      all: unset;
      color: #9aa0a6;
      border: 1px solid transparent;
      border-radius: 6px;
      padding: 4px 10px;
      font: 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex: 0 0 auto;
      white-space: nowrap;
      box-sizing: border-box;
    }
    #llm-router-strip button:hover {
      color: #e6e6e6;
      background: #25262b;
    }
    #llm-router-strip button[aria-selected="true"] {
      color: #e6e6e6;
      background: #25262b;
      border-color: #4f8cff;
    }
    #llm-router-strip img {
      width: 14px;
      height: 14px;
      flex: 0 0 auto;
      border-radius: 2px;
    }
  `;
  document.head.appendChild(style);

  const strip = document.createElement("div");
  strip.id = "llm-router-strip";

  for (const tab of tabs) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = tab.label;
    btn.setAttribute("aria-selected", String(tab.id === activeId));

    btn.addEventListener("click", async () => {
      if (tab.id === activeId) return;
      for (const b of strip.querySelectorAll("button")) {
        b.setAttribute("aria-selected", "false");
      }
      btn.setAttribute("aria-selected", "true");
      await browser.storage.local.set({ activeTabId: tab.id });
      browser.runtime.sendMessage({ type: "setPanel", panel: tab.url });
    });

    const iconUrl = faviconUrlFor(tab);
    if (iconUrl) {
      const img = document.createElement("img");
      img.src = iconUrl;
      img.alt = "";
      img.loading = "lazy";
      img.addEventListener("error", () => img.remove(), { once: true });
      btn.appendChild(img);
    }
    const text = document.createElement("span");
    text.textContent = tab.label;
    btn.appendChild(text);

    strip.appendChild(btn);
  }

  document.body.insertBefore(strip, document.body.firstChild);

  // Push page content below the fixed strip
  document.documentElement.style.scrollPaddingTop = "40px";
  document.body.style.paddingTop = "40px";
  document.body.style.boxSizing = "border-box";

  strip.addEventListener("wheel", (e) => {
    if (e.deltaY === 0) return;
    e.preventDefault();
    strip.scrollLeft += e.deltaY + e.deltaX;
  }, { passive: false });
})();
