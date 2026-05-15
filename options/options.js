const listEl = document.getElementById("tab-list");
const formEl = document.getElementById("add-form");
const labelInput = document.getElementById("add-label");
const urlInput = document.getElementById("add-url");
const errorEl = document.getElementById("add-error");

function slugify(label) {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "tab";
}

function uniqueId(base, existing) {
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function validateUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  return u.toString();
}

async function loadTabs() {
  const { tabs } = await browser.storage.local.get("tabs");
  return Array.isArray(tabs) ? tabs : [];
}

async function saveTabs(tabs) {
  const patch = { tabs };
  const { activeTabId } = await browser.storage.local.get("activeTabId");
  if (activeTabId && !tabs.some(t => t.id === activeTabId && t.enabled !== false)) {
    const fallback = tabs.find(t => t.enabled !== false);
    patch.activeTabId = fallback ? fallback.id : null;
  }
  await browser.storage.local.set(patch);
}

function render(tabs) {
  listEl.replaceChildren();
  if (tabs.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No tabs. Add one below.";
    listEl.appendChild(li);
    return;
  }
  for (const tab of tabs) {
    const li = document.createElement("li");

    const enabled = document.createElement("input");
    enabled.type = "checkbox";
    enabled.checked = tab.enabled !== false;
    enabled.title = "Enabled";
    enabled.addEventListener("change", () => toggleEnabled(tab.id, enabled.checked));

    const labelCell = document.createElement("span");
    labelCell.className = "label-cell";
    labelCell.textContent = tab.label;

    const urlCell = document.createElement("span");
    urlCell.className = "url-cell";
    urlCell.textContent = tab.url;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => removeTab(tab.id));

    li.append(enabled, labelCell, urlCell, remove);
    listEl.appendChild(li);
  }
}

async function refresh() {
  const tabs = await loadTabs();
  render(tabs);
}

async function toggleEnabled(id, value) {
  const tabs = await loadTabs();
  const idx = tabs.findIndex(t => t.id === id);
  if (idx < 0) return;
  tabs[idx] = { ...tabs[idx], enabled: value };
  await saveTabs(tabs);
}

async function removeTab(id) {
  const tabs = (await loadTabs()).filter(t => t.id !== id);
  await saveTabs(tabs);
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
}
function clearError() {
  errorEl.textContent = "";
  errorEl.hidden = true;
  labelInput.classList.remove("invalid");
  urlInput.classList.remove("invalid");
}

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const label = labelInput.value.trim();
  const rawUrl = urlInput.value.trim();
  if (!label) {
    labelInput.classList.add("invalid");
    showError("Label is required.");
    return;
  }
  const normalized = validateUrl(rawUrl);
  if (!normalized) {
    urlInput.classList.add("invalid");
    showError("URL must be a valid http(s):// address.");
    return;
  }
  const tabs = await loadTabs();
  const existingIds = new Set(tabs.map(t => t.id));
  const id = uniqueId(slugify(label), existingIds);
  tabs.push({ id, label, url: normalized, enabled: true });
  await saveTabs(tabs);
  formEl.reset();
  labelInput.focus();
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && "tabs" in changes) refresh();
});

refresh();
