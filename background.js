browser.runtime.onMessage.addListener((message) => {
  if (message.type === "setPanel") {
    return browser.sidebarAction.setPanel({ panel: message.panel });
  }
  if (message.type === "getState") {
    return browser.storage.local.get(["tabs", "activeTabId"]);
  }
});
