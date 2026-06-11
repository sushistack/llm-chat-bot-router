import { DEFAULT_TABS, faviconFor } from "./defaults.js";

const stripEl = document.getElementById("tab-strip");
const emptyEl = document.getElementById("empty-state");
const containerEl = document.getElementById("frame-container");

let state = { tabs: [], activeTabId: null };
let activeTabKey = "activeTabId"; // per-window key, set after window ID is known
const frames = new Map(); // tabId → iframe element

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
  const { id: windowId } = await browser.windows.getCurrent();
  activeTabKey = `activeTabId_w${windowId}`;

  const stored = await browser.storage.local.get(["tabs", "firstRun", activeTabKey]);
  if (stored.firstRun !== false) {
    await browser.storage.local.set({
      tabs: DEFAULT_TABS,
      [activeTabKey]: DEFAULT_TABS[0].id,
      firstRun: false
    });
    return { tabs: DEFAULT_TABS, activeTabId: DEFAULT_TABS[0].id };
  }
  const raw = Array.isArray(stored.tabs) ? stored.tabs : [];
  const { tabs: migrated, changed } = migrateStoredTabs(raw);
  if (changed) await browser.storage.local.set({ tabs: migrated });
  return {
    tabs: migrated,
    activeTabId: stored[activeTabKey] ?? null
  };
}

function getOrCreateFrame(tab) {
  if (frames.has(tab.id)) return frames.get(tab.id);
  const frame = document.createElement("iframe");
  frame.className = "site-frame hidden";
  frame.title = tab.label;
  frame.allowFullscreen = true;
  containerEl.appendChild(frame);
  frames.set(tab.id, frame);
  return frame;
}

function syncFrames() {
  const enabled = new Set(state.tabs.filter(t => t.enabled !== false).map(t => t.id));
  for (const [id, frame] of frames) {
    if (!enabled.has(id)) {
      frame.remove();
      frames.delete(id);
    }
  }
}

function renderStrip() {
  stripEl.replaceChildren();
  const enabled = state.tabs.filter(t => t.enabled !== false);
  if (enabled.length === 0) {
    emptyEl.hidden = false;
    syncFrames();
    return;
  }
  emptyEl.hidden = true;
  syncFrames();
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
    await browser.storage.local.set({ [activeTabKey]: id });
  }

  for (const [tid, frame] of frames) {
    frame.classList.toggle("hidden", tid !== id);
  }

  const frame = getOrCreateFrame(tab);
  frame.classList.remove("hidden");
  if (!frame.src || frame.src === "about:blank") {
    frame.src = tab.url;
  }
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
  // tabs 변경(옵션에서 설정 변경)만 반영, activeTabId 변경은 각 창이 독립적으로 관리
  if (!("tabs" in changes)) return;
  state.tabs = Array.isArray(changes.tabs.newValue) ? changes.tabs.newValue : [];
  renderStrip();
  const initial = resolveInitialActive();
  if (initial) activateTab(initial);
});

stripEl.addEventListener("wheel", (e) => {
  if (e.deltaY === 0) return;
  e.preventDefault();
  stripEl.scrollLeft += e.deltaY + e.deltaX;
}, { passive: false });

document.getElementById("refresh-frame").addEventListener("click", () => {
  const frame = frames.get(state.activeTabId);
  if (!frame || !frame.src || frame.src === "about:blank") return;
  // 교차 출처 iframe은 contentWindow.location.reload()가 막히므로 src 재할당으로 재로드
  frame.src = frame.src;
});

document.getElementById("open-options").addEventListener("click", (e) => {
  e.preventDefault();
  browser.runtime.openOptionsPage();
});
document.getElementById("open-options-from-empty").addEventListener("click", (e) => {
  e.preventDefault();
  browser.runtime.openOptionsPage();
});

bootstrap();
