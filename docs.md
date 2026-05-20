# Docs

## Purpose

- Scrape posts from LinkedIn "recent-activity/comments" pages in the active tab.
- Show results in the popup and optionally POST them to a webhook.

## How it works

- Popup UI collects `skip` and `limit`, then sends a scrape request.
- Content script scrolls the page, extracts post text and metadata, and returns results.
- Popup renders JSON and optionally sends it to the webhook with a bearer token.

## Files

- manifest.json: MV3 config, permissions, popup + options, content script match.
- index.html, style.css, script.js: popup UI and scrape + webhook logic.
- options.html, options.css, options.js: webhook + token settings.
- content-script.js: DOM scraping + message handler.

## Messages

- `SCRAPE_LINKEDIN_COMMENTS`: popup -> content script, returns posts array.
- `GET_LINKEDIN_RESULTS`: returns last results + status.

## Data shape

- `url`: post URL built from `data-urn`.
- `post`: text content with normalized line breaks.
- `images`: feedshare image URLs.
- `profileUrl`, `profileName`, `description`, `relativeTime`.

## Permissions

- `activeTab`: send messages to the active tab.
- `storage`: save webhook + token.
- `host_permissions`: LinkedIn pages + webhook destinations.

## Architecture (ASCII)

```
    +--------------------------+
    | LinkedIn comments page   |
    | https://.../recent-...   |
    +------------+-------------+
                             ^
                             | DOM scrape
                             |
    +------------+-------------+
    | content-script.js        |
    | buildEntries + scroll    |
    +------------+-------------+
                             ^
                             | chrome.tabs.sendMessage
                             |
    +------------+-------------+        +---------------------------+
    | Popup UI                 |        | Options Page              |
    | index.html + script.js   |        | options.html + options.js |
    +------------+-------------+        +------------+--------------+
                             |                                   |
                             | chrome.storage.sync               |
                             v                                   v
    +------------------------------------------------------------+
    | Chrome Storage (sync)                                      |
    +------------------------------------------------------------+
                             |
                             | optional POST
                             v
    +----------------------------+
    | Webhook endpoint (https)   |
    +----------------------------+
```

## Notes

- Content script runs only on `https://www.linkedin.com/*/*/recent-activity/comments/`.
- Scrape scrolls up to 30 iterations with ~1200ms delay; stops when page height stabilizes.
