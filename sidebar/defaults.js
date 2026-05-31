export const DEFAULT_TABS = [
  { id: "claude",      label: "Claude",      url: "https://claude.ai",             icon: "icons/sites/claude.png",      enabled: true },
  { id: "deepseek",    label: "DeepSeek",    url: "https://chat.deepseek.com",     icon: "icons/sites/deepseek.png",    enabled: true },
  { id: "gemini",      label: "Gemini",      url: "https://gemini.google.com",     icon: "icons/sites/gemini.png",      enabled: true },
  { id: "grok",        label: "Grok",        url: "https://grok.com",              icon: "icons/sites/grok.png",        enabled: true },
  { id: "chatgpt",     label: "ChatGPT",     url: "https://chatgpt.com",           icon: "icons/sites/chatgpt.png",     enabled: true },
{ id: "qwen",        label: "Qwen",        url: "https://chat.qwen.ai",          icon: "icons/sites/qwen.png",        enabled: true }
];

export function faviconFor(tab) {
  if (!tab.icon) return null;
  if (/^(https?:|data:)/.test(tab.icon)) return tab.icon;
  return browser.runtime.getURL(tab.icon);
}
