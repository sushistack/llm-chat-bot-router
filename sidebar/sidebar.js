import { DEFAULT_TABS, faviconFor } from "./defaults.js";

const STORAGE_KEYS = ["tabs", "activeTabId", "firstRun"];
const stripEl = document.getElementById("tab-strip");
const emptyEl = document.getElementById("empty-state");

let state = { tabs: [], activeTabId: null };

function migrateStoredTabs(tabs) {
  const defaults = new Map(DEFAULT_TABS.map(t => [t.id, t]));
  let changed = false;
  const result = tabs.map(t => {
    if (!t || typeof t !== "object" || t.icon) return t;
    const def = defaults.get(t.id);
    if (!def || !def.icon) return t;
    changed = true;
    return { ...t, icon: def.icon };
  });
  return { tabs: result, changed };
}

async function loadState() {
  const stored = await browser.storage.local.get(STORAGE_KEYS);
  if (stored.firstRun !== false) {
    await browser.storage.local.set({
      tabs: DEFAULT_TABS,
      activeTabId: DEFAULT_TABS[0].id,
      firstRun: false
    });
    return { tabs: DEFAULT_TABS, activeTabId: DEFAULT_TABS[0].id };
  }
  const raw = Array.isArray(stored.tabs) ? stored.tabs : [];
  const { tabs: migrated, changed } = migrateStoredTabs(raw);
  if (changed) await browser.storage.local.set({ tabs: migrated });
  return {
    tabs: migrated,
    activeTabId: stored.activeTabId ?? null
  };
}

function renderStrip() {
  stripEl.replaceChildren();
  const enabled = state.tabs.filter(t => t.enabled !== false);
  if (enabled.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  for (const tab of enabled) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.tabId = tab.id;
    btn.title = tab.label;
    btn.setAttribute("aria-selected", String(tab.id === state.activeTabId));
    btn.addEventListener("click", () => activateTab(tab.id));

    const iconUrl = faviconFor(tab);
    if (iconUrl) {
      const img = document.createElement("img");
      img.className = "tab-favicon";
      img.src = iconUrl;
      img.alt = "";
      img.loading = "lazy";
      img.addEventListener("error", () => img.remove(), { once: true });
      btn.appendChild(img);
    }
    const text = document.createElement("span");
    text.textContent = tab.label;
    btn.appendChild(text);

    stripEl.appendChild(btn);
  }
}

async function activateTab(id) {
  const tab = state.tabs.find(t => t.id === id && t.enabled !== false);
  if (!tab) return;
  for (const btn of stripEl.querySelectorAll("button")) {
    btn.setAttribute("aria-selected", String(btn.dataset.tabId === id));
  }
  if (state.activeTabId !== id) {
    state.activeTabId = id;
    await browser.storage.local.set({ activeTabId: id });
  }
  browser.sidebarAction.setPanel({ panel: tab.url });
}

function resolveInitialActive() {
  const enabled = state.tabs.filter(t => t.enabled !== false);
  if (enabled.length === 0) return null;
  const stored = enabled.find(t => t.id === state.activeTabId);
  return stored ? stored.id : enabled[0].id;
}

async function bootstrap() {
  state = await loadState();
  renderStrip();
  const initial = resolveInitialActive();
  if (initial) await activateTab(initial);
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (!("tabs" in changes) && !("activeTabId" in changes)) return;
  if ("tabs" in changes) state.tabs = Array.isArray(changes.tabs.newValue) ? changes.tabs.newValue : [];
  if ("activeTabId" in changes) state.activeTabId = changes.activeTabId.newValue ?? null;
  renderStrip();
  const initial = resolveInitialActive();
  if (initial) activateTab(initial);
});

stripEl.addEventListener("wheel", (e) => {
  if (e.deltaY === 0) return;
  e.preventDefault();
  stripEl.scrollLeft += e.deltaY + e.deltaX;
}, { passive: false });

document.getElementById("open-options").addEventListener("click", (e) => {
  e.preventDefault();
  browser.runtime.openOptionsPage();
});
document.getElementById("open-options-from-empty").addEventListener("click", (e) => {
  e.preventDefault();
  browser.runtime.openOptionsPage();
});

bootstrap();
