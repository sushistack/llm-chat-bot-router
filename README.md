# LLM Chat Bot Router

A Bitwarden-style Firefox sidebar that hosts multiple AI chat sites (DeepSeek, Claude, Gemini, ChatGPT) as switchable iframes. Built for users who want to escape the fixed-model lock-in of Firefox's built-in AI sidebar and freely jump between hosted AI chats.

## Features

- Tab strip with persistent iframes — logged-in sessions survive switching
- `declarativeNetRequest` ruleset strips `X-Frame-Options` / CSP for the bundled hosts so they render inside the sidebar
- Options page to add, remove, or disable custom AI chat sites at runtime
- Dark-mode-first UI with light fallback via `prefers-color-scheme`
- Compact mode on narrow widths: non-selected tabs collapse to favicon only, horizontal wheel-scroll for the tab strip
- 5-second iframe load timeout with an "Open in new tab" fallback link

## Install (development)

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Click **"Load Temporary Add-on…"**.
3. Select `manifest.json` in this directory.
4. Open the sidebar from View → Sidebar → **LLM Router** (or click the toolbar icon).

## Customizing tabs

Click **Options** at the bottom of the sidebar (or go to `about:addons` → this extension → Preferences). Add tabs with a label and an `https://` URL.

Custom-added hosts are **not** automatically covered by the DNR ruleset — sites that send `X-Frame-Options: DENY` may render blank, in which case the 5-second fallback offers "Open in new tab".

## Project layout

```
manifest.json              MV3 manifest (sidebar_action, DNR, options_ui)
rules/frame_unblock.json   Static DNR ruleset for the 4 default hosts
sidebar/                   Sidebar panel (HTML/CSS/JS), iframe stack, tab strip
options/                   Options page (CRUD for the tab list)
icons/                     Extension icon + per-site favicons
_locales/en/               i18n stubs
```

## Stack

Vanilla JS / HTML / CSS. No build step, no bundler, no npm dependencies.

## Status

Early scaffold (v0.1). Page-context features (Summarize / Explain active tab) are deferred to a follow-up release.
