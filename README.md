# LinkedIn Scraper

A simple Chrome extension for scraping LinkedIn comment activity pages.

## What it does

- Runs on LinkedIn comment activity pages matching `https://www.linkedin.com/*/*/recent-activity/comments/`
- Extracts posts, profile information, images, and timestamp details
- Communicates with the extension popup or background scripts via message passing

## Files

- `manifest.json` - Chrome extension manifest (MV3)
- `content-script.js` - Scrapes LinkedIn page content
- `index.html` - Extension popup page
- `options.html` / `options.css` / `options.js` - Extension options UI
- `style.css` - Global extension styling
- `script.js` - Main extension logic
- `docs.md` - Additional project notes

## Install locally

1. Open Chrome and go to `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this repository folder

## Usage

1. Navigate to a LinkedIn page with comment activity
2. Open the extension popup
3. Trigger the scraper from the popup
4. The extension will collect and return available posts from the page

## Notes

- The extension currently requests permissions for `activeTab` and `storage`
- It is designed for LinkedIn pages and may not work on other sites
- No build step is required for local testing
