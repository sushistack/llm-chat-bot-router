const DYNAMIC_RULE_ID = 100;
const STRIP_HEADERS = ["x-frame-options", "content-security-policy", "content-security-policy-report-only"];

// ── Approach 1: declarativeNetRequest dynamic rule ────────────────────────────
// urlFilter required for Firefox to apply the condition correctly.
browser.declarativeNetRequest.updateDynamicRules({
  removeRuleIds: [DYNAMIC_RULE_ID],
  addRules: [{
    id: DYNAMIC_RULE_ID,
    priority: 2,
    action: {
      type: "modifyHeaders",
      responseHeaders: STRIP_HEADERS.map(h => ({ header: h, operation: "remove" })),
    },
    condition: {
      resourceTypes: ["sub_frame"],
    },
  }],
}).then(async () => {
  const dynamic = await browser.declarativeNetRequest.getDynamicRules();
  const rulesets = await browser.declarativeNetRequest.getEnabledRulesets();
  console.log("[llm-router] dynamic rules:", JSON.stringify(dynamic));
  console.log("[llm-router] enabled rulesets:", rulesets);
}).catch(e => {
  console.warn("[llm-router] dynamic rule failed:", e.message);
});

// ── Approach 2a: strip Sec-Fetch-* / Referer before sending ──────────────────
// Cloudflare detects iframe requests via Sec-Fetch-Dest: iframe and moz-extension Referer,
// then serves a bot-challenge page (cf-mitigated: challenge) which itself has x-frame-options.
// Stripping these request headers makes the request look like a regular top-level navigation.
if (browser.webRequest && browser.webRequest.onBeforeSendHeaders) {
  const STRIP_REQUEST_HEADERS = ["sec-fetch-dest", "sec-fetch-mode", "sec-fetch-site", "sec-fetch-user", "referer"];
  browser.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      const headers = (details.requestHeaders || []).filter(
        h => !STRIP_REQUEST_HEADERS.includes(h.name.toLowerCase())
      );
      return { requestHeaders: headers };
    },
    { urls: ["<all_urls>"], types: ["sub_frame"] },
    ["blocking", "requestHeaders"]
  );
}

// ── Approach 2b: webRequest blocking as fallback ──────────────────────────────
if (browser.webRequest && browser.webRequest.onHeadersReceived) {
  browser.webRequest.onHeadersReceived.addListener(
    (details) => {
      const before = (details.responseHeaders || []).map(h => h.name.toLowerCase());
      const hasFrameHeader = before.some(n => STRIP_HEADERS.includes(n));
      const headers = (details.responseHeaders || []).filter(
        h => !STRIP_HEADERS.includes(h.name.toLowerCase())
      );
      if (hasFrameHeader) {
        console.log("[llm-router] stripped frame headers from:", details.url);
      }
      return { responseHeaders: headers };
    },
    { urls: ["<all_urls>"], types: ["sub_frame"] },
    ["blocking", "responseHeaders"]
  );
  console.log("[llm-router] webRequest listener active");
}
