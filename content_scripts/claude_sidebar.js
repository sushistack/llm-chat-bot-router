// Custom conversation sidebar for Claude iframe.
// Claude's native sidebar is suppressed in cross-origin iframes, so we build our own.

if (window.top !== window) {
  const NS         = "llm-router-cs";
  const SIDEBAR_ID = NS + "-sidebar";
  const TOGGLE_ID  = NS + "-toggle";
  const STYLE_ID   = NS + "-style";

  let sidebarOpen = false;

  // ── API ───────────────────────────────────────────────────────────────────

  async function discoverOrgId() {
    // 1. Next.js SSR data
    try {
      const nd = window.__NEXT_DATA__;
      const org = nd?.props?.pageProps?.organization?.uuid
               || nd?.props?.pageProps?.org_uuid
               || nd?.props?.initialState?.org_id;
      if (org) return org;
    } catch (_) {}

    // 2. /api/organizations
    try {
      const res = await fetch("/api/organizations", { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        const orgs = Array.isArray(data) ? data : data.organizations || [];
        const id = orgs[0]?.uuid || orgs[0]?.id;
        if (id) return id;
      }
    } catch (_) {}

    // 3. /api/auth/current_account
    try {
      const res = await fetch("/api/auth/current_account", { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        const id = data.account?.memberships?.[0]?.organization?.uuid
                || data.org_id || data.organization_id;
        if (id) return id;
      }
    } catch (_) {}

    return null;
  }

  async function fetchConversations(orgId) {
    const endpoints = [
      `/api/organizations/${orgId}/chat_conversations?limit=50`,
      `/api/organizations/${orgId}/conversations?limit=50`,
    ];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { credentials: "same-origin" });
        if (!res.ok) continue;
        const data = await res.json();
        const list = Array.isArray(data) ? data
                   : (data.conversations || data.data || data.results || []);
        if (list.length > 0) return list;
      } catch (_) {}
    }
    return [];
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function relativeTime(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000)      return "방금";
    if (diff < 3600000)    return Math.floor(diff / 60000) + "분 전";
    if (diff < 86400000)   return Math.floor(diff / 3600000) + "시간 전";
    if (diff < 604800000)  return Math.floor(diff / 86400000) + "일 전";
    return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  }

  function getTitle(conv) {
    return conv.name || conv.title || conv.summary || "새 대화";
  }

  function getUuid(conv) {
    return conv.uuid || conv.id;
  }

  function getUpdatedAt(conv) {
    return conv.updated_at || conv.created_at || conv.last_message_at;
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    // Read Claude's actual computed colors from the body/html elements.
    const bodyStyle = getComputedStyle(document.body);
    const htmlStyle = getComputedStyle(document.documentElement);
    const bodyBg    = bodyStyle.backgroundColor;   // actual computed color
    const bodyColor = bodyStyle.color;
    console.log("[claude-sidebar] body bg:", bodyBg, "| color:", bodyColor);

    // Try CSS variable values (Tailwind stores as raw hsl channels).
    const cs = htmlStyle;
    const rawVars = {};
    ["--bg-100","--bg-200","--bg-300","--text-100","--text-200","--text-300","--text-400",
     "--border-100","--border-200","--accent-main-100"].forEach(v => {
      const val = cs.getPropertyValue(v).trim();
      if (val) rawVars[v] = val;
    });
    console.log("[claude-sidebar] raw CSS vars:", rawVars);

    // Build color helpers: try hsl(var(--x)) first, fall back to hardcoded.
    const hasVar = name => !!rawVars[name];
    const hslVar = (name, fallback) => hasVar(name) ? `hsl(var(${name}))` : fallback;

    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      /* ── Toggle button ─────────────────────────────────────────────── */
      #${TOGGLE_ID} {
        position: fixed;
        top: 10px;
        left: 8px;
        z-index: 2147483647;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: ${hslVar("--text-400", "#8a8f9b")};
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        transition: color 0.15s, background 0.15s, left 0.25s ease;
      }
      #${TOGGLE_ID}:hover {
        color: ${hslVar("--text-100", "#e2e8f0")};
        background: ${hslVar("--bg-200", "rgba(255,255,255,0.07)")};
      }
      #${TOGGLE_ID}[data-open="true"] { display: none; }
      #${TOGGLE_ID} svg {
        width: 20px; height: 20px;
        pointer-events: none;
      }

      /* ── Sidebar panel ──────────────────────────────────────────────── */
      #${SIDEBAR_ID} {
        position: fixed;
        top: 0; left: 0; bottom: 0;
        width: 260px;
        z-index: 2147483646;
        background: ${bodyBg || "#1c1d22"};
        border-right: 1px solid rgba(255,255,255,0.06);
        display: flex;
        flex-direction: column;
        transform: translateX(-260px);
        transition: transform 0.22s cubic-bezier(0.4,0,0.2,1);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      #${SIDEBAR_ID}[data-open="true"] { transform: translateX(0); }

      /* ── Header ─────────────────────────────────────────────────────── */
      #${SIDEBAR_ID} .${NS}-header {
        padding: 12px 8px 8px;
        flex-shrink: 0;
      }
      /* ── Sidebar header row ─────────────────────────────────────────── */
      #${SIDEBAR_ID} .${NS}-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      #${SIDEBAR_ID} .${NS}-title {
        font-size: 11px;
        font-weight: 500;
        color: ${hslVar("--text-400", "#6b7280")};
        letter-spacing: 0.04em;
        margin: 0 0 0 2px;
      }
      #${SIDEBAR_ID} .${NS}-close {
        width: 24px; height: 24px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: ${hslVar("--text-400", "#8a8f9b")};
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        transition: color 0.12s, background 0.12s;
      }
      #${SIDEBAR_ID} .${NS}-close:hover {
        color: ${hslVar("--text-100", "#e2e8f0")};
        background: ${hslVar("--bg-200", "rgba(255,255,255,0.07)")};
      }
      #${SIDEBAR_ID} .${NS}-close svg { width: 20px; height: 20px; pointer-events: none; }

      /* ── New conversation button ─────────────────────────────────────── */
      #${SIDEBAR_ID} .${NS}-new {
        margin: 0 0 8px;
        padding: 8px 12px;
        background: transparent;
        border: none;
        border-radius: 8px;
        color: ${hslVar("--text-300", "#9da4b0")};
        font-size: 13.5px;
        font-family: inherit;
        font-weight: 400;
        cursor: pointer;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        box-sizing: border-box;
        transition: background 0.12s, color 0.12s, border-color 0.12s;
        flex-shrink: 0;
      }
      #${SIDEBAR_ID} .${NS}-new:hover {
        background: ${hslVar("--bg-200", "rgba(255,255,255,0.05)")};
        border-color: ${hslVar("--border-200", "rgba(255,255,255,0.14)")};
        color: ${hslVar("--text-100", "#e2e8f0")};
      }

      /* ── Search ─────────────────────────────────────────────────────── */
      #${SIDEBAR_ID} .${NS}-search {
        width: 100%;
        box-sizing: border-box;
        background: ${hslVar("--bg-200", "rgba(255,255,255,0.04)")};
        border: none;
        border-radius: 8px;
        padding: 7px 12px;
        font-size: 13.5px;
        font-family: inherit;
        color: ${hslVar("--text-100", "#e2e8f0")};
        outline: none;
        transition: border-color 0.15s, background 0.15s;
      }
      #${SIDEBAR_ID} .${NS}-search::placeholder { color: ${hslVar("--text-400", "#4b5563")}; }
      #${SIDEBAR_ID} .${NS}-search:focus {
        background: ${hslVar("--bg-300", "rgba(255,255,255,0.07)")};
      }

      /* ── Conversation list ──────────────────────────────────────────── */
      #${SIDEBAR_ID} .${NS}-list {
        flex: 1;
        overflow-y: auto;
        padding: 4px 6px;
        scrollbar-width: none;
        scrollbar-color: ${hslVar("--border-200", "rgba(255,255,255,0.08)")} transparent;
      }
      #${SIDEBAR_ID} .${NS}-item {
        display: flex;
        flex-direction: column;
        gap: 1px;
        padding: 7px 10px;
        border-radius: 8px;
        cursor: pointer;
        border: none;
        background: transparent;
        width: 100%;
        text-align: left;
        transition: background 0.12s;
      }
      #${SIDEBAR_ID} .${NS}-item:hover { background: ${hslVar("--bg-200", "rgba(255,255,255,0.06)")}; }
      #${SIDEBAR_ID} .${NS}-item.active { background: ${hslVar("--bg-300", "rgba(255,255,255,0.09)")}; }
      #${SIDEBAR_ID} .${NS}-item-title {
        font-size: 13.5px;
        font-weight: 400;
        color: ${hslVar("--text-200", "#cdd2db")};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.45;
      }
      #${SIDEBAR_ID} .${NS}-item-time {
        font-size: 11.5px;
        color: ${hslVar("--text-400", "#555b69")};
        line-height: 1.3;
      }

      /* ── Loading / empty states ─────────────────────────────────────── */
      #${SIDEBAR_ID} .${NS}-state {
        padding: 36px 16px;
        text-align: center;
        font-size: 13px;
        color: ${hslVar("--text-400", "#4b5563")};
      }
      #${SIDEBAR_ID} .${NS}-spinner {
        width: 16px; height: 16px;
        border: 1.5px solid ${hslVar("--border-200", "rgba(255,255,255,0.08)")};
        border-top-color: ${hslVar("--accent-main-100", "#cc7b5a")};
        border-radius: 50%;
        animation: ${NS}-spin 0.65s linear infinite;
        margin: 0 auto 10px;
      }
      @keyframes ${NS}-spin { to { transform: rotate(360deg); } }
    `;
    document.documentElement.appendChild(s);
  }

  // ── Build UI ──────────────────────────────────────────────────────────────

  function createToggleButton() {
    if (document.getElementById(TOGGLE_ID)) return;
    const btn = document.createElement("button");
    btn.id = TOGGLE_ID;
    btn.type = "button";
    btn.setAttribute("aria-label", "대화 목록 열기");
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M16.5 4A1.5 1.5 0 0 1 18 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5v-9A1.5 1.5 0 0 1 3.5 4zM7 15h9.5a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5H7zM3.5 5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5H6V5z"></path></svg>`;
    btn.addEventListener("click", toggleSidebar);
    document.body.appendChild(btn);
  }

  function createSidebar() {
    if (document.getElementById(SIDEBAR_ID)) return;
    const panel = document.createElement("div");
    panel.id = SIDEBAR_ID;
    panel.innerHTML = `
      <div class="${NS}-header">
        <div class="${NS}-header-row">
          <span class="${NS}-title">최근 대화</span>
          <button class="${NS}-close" type="button" aria-label="사이드바 닫기">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M16.5 4A1.5 1.5 0 0 1 18 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5v-9A1.5 1.5 0 0 1 3.5 4zM7 15h9.5a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5H7zM3.5 5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5H6V5z"></path></svg>
          </button>
        </div>
        <button class="${NS}-new" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          새 대화
        </button>
        <input class="${NS}-search" type="search" placeholder="검색..." />
      </div>
      <div class="${NS}-list">
        <div class="${NS}-state">
          <div class="${NS}-spinner"></div>
          불러오는 중...
        </div>
      </div>
    `;

    // Search filter
    const searchEl = panel.querySelector("." + NS + "-search");
    searchEl.addEventListener("input", () => filterConversations(searchEl.value));

    // New conversation
    panel.querySelector("." + NS + "-new").addEventListener("click", () => {
      window.location.href = "/";
    });

    // Close button inside sidebar header
    panel.querySelector("." + NS + "-close").addEventListener("click", toggleSidebar);

    document.body.appendChild(panel);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  let allConversations = [];
  let currentUuid = null;

  function getCurrentUuid() {
    const m = window.location.pathname.match(/\/chat\/([a-f0-9-]{36})/i);
    return m ? m[1] : null;
  }

  function renderList(convs) {
    const list = document.querySelector("#" + SIDEBAR_ID + " ." + NS + "-list");
    if (!list) return;
    currentUuid = getCurrentUuid();

    if (convs.length === 0) {
      list.innerHTML = `<div class="${NS}-state">대화 없음</div>`;
      return;
    }

    list.innerHTML = "";
    convs.forEach(conv => {
      const uuid = getUuid(conv);
      const btn  = document.createElement("button");
      btn.className = NS + "-item" + (uuid === currentUuid ? " active" : "");
      btn.type = "button";
      btn.innerHTML = `
        <span class="${NS}-item-title">${escapeHtml(getTitle(conv))}</span>
        <span class="${NS}-item-time">${relativeTime(getUpdatedAt(conv))}</span>
      `;
      btn.addEventListener("click", () => {
        window.location.href = "/chat/" + uuid;
      });
      list.appendChild(btn);
    });
  }

  function filterConversations(query) {
    const q = query.toLowerCase().trim();
    const filtered = q
      ? allConversations.filter(c => getTitle(c).toLowerCase().includes(q))
      : allConversations;
    renderList(filtered);
  }

  function setError(msg) {
    const list = document.querySelector("#" + SIDEBAR_ID + " ." + NS + "-list");
    if (list) list.innerHTML = `<div class="${NS}-state">${msg}</div>`;
  }

  function escapeHtml(str) {
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  // ── Toggle ────────────────────────────────────────────────────────────────

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    const panel  = document.getElementById(SIDEBAR_ID);
    const toggle = document.getElementById(TOGGLE_ID);
    if (panel)  panel.dataset.open  = sidebarOpen;
    if (toggle) toggle.dataset.open = sidebarOpen;
  }

  function closeSidebarOnOutsideClick(e) {
    if (!sidebarOpen) return;
    const panel  = document.getElementById(SIDEBAR_ID);
    const toggle = document.getElementById(TOGGLE_ID);
    if (panel?.contains(e.target) || toggle?.contains(e.target)) return;
    toggleSidebar();
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  async function boot() {
    injectStyles();
    createToggleButton();
    createSidebar();
    document.addEventListener("click", closeSidebarOnOutsideClick, true);

    try {
      const orgId = await discoverOrgId();
      if (!orgId) { setError("org ID를 찾을 수 없습니다"); return; }
      console.log("[claude-sidebar] org:", orgId);

      const convs = await fetchConversations(orgId);
      allConversations = convs;
      renderList(convs);
      console.log("[claude-sidebar] loaded", convs.length, "conversations");
    } catch (e) {
      console.error("[claude-sidebar] error:", e);
      setError("대화 목록 로드 실패");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}
