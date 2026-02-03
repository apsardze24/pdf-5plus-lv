
# Chrome Extension Specification: PDF & Image Editor Companion

## Overview
This document specifies the requirements for a Google Chrome Extension designed to integrate with the web application `pdf.5plus.lv`. The extension allows users to right-click on any image in their browser and send it directly to the web app for conversion or editing.

## Core Features
1.  **Context Menu Integration**: Adds an item to the browser's right-click context menu for images.
2.  **Configurable Settings**: A popup or options page to configure the target URL and preferred tools.
3.  **URL Construction**: Generates a specific URL with query parameters to pass the image to the web app.

---

## 1. Context Menu Behavior

When a user right-clicks on an image (`<img src="...">`), the context menu should show options based on the user's settings.

**Default Behavior (Factory Settings):**
*   **Menu Item Label:** "Send to PDF.5PLUS.LV"
*   **Action:** Opens a new tab with the target URL.

**Advanced Behavior (Based on Settings):**
If the user enables specific modes in settings, the context menu can either be a single click (default mode) or a parent menu with sub-items:
*   *Parent:* "PDF & Image Tools"
    *   *Sub-item 1:* "Send to Converter"
    *   *Sub-item 2:* "Send to Editor"

---

## 2. Options / Settings Page

The extension must have an Options page (accessible via `chrome://extensions` -> Details -> Extension options, or a popup).

**Required Fields:**

### A. Destination URL
*   **Label:** "Target Website URL"
*   **Input Type:** Text Field
*   **Default Value:** `https://pdf.5plus.lv/`
*   **Description:** "The base URL of the web application. Change this if you are hosting a private instance."

### B. Enabled Tools (Checkboxes)
*   **Label:** "Context Menu Options"
*   **Checkbox 1:** `[x] Show 'Send to Converter'` (Default: Checked)
*   **Checkbox 2:** `[x] Show 'Send to Editor'` (Default: Checked)

*Logic:*
*   If both are checked, create a parent menu item with two sub-items.
*   If only one is checked, create a single top-level menu item directly for that mode.

---

## 3. Technical Implementation Details

### Manifest (v3) Requirements
*   **Permissions:**
    *   `contextMenus`: To create the right-click menu.
    *   `storage`: To save user settings (Target URL, enabled modes).
    *   `activeTab`: To access the image URL securely if needed (though `srcUrl` from context menu usually suffices).

### Background Script Logic
The service worker (`background.js`) should listen for `chrome.contextMenus.onClicked`.

**URL Construction Algorithm:**

1.  **Get Base URL:** Retrieve `targetBaseUrl` from storage (default: `https://pdf.5plus.lv/`). Ensure it doesn't end with a slash, or handle the slash correctly.
2.  **Get Image URL:** Retrieve `info.srcUrl` from the context menu event.
3.  **Encode Image URL:** Use `encodeURIComponent(info.srcUrl)` to ensure special characters (like `&` or `?`) inside the image URL don't break the query string.
4.  **Determine Mode:**
    *   If the user clicked "Send to Converter": `mode = 'converter'`
    *   If the user clicked "Send to Editor": `mode = 'editor'`
5.  **Construct Final URL:**
    ```javascript
    const finalUrl = `${baseUrl}?image=${encodedImageUrl}&mode=${mode}`;
    ```
    *Example:* `https://pdf.5plus.lv/?image=https%3A%2F%2Fexample.com%2Fimage.jpg&mode=converter`

6.  **Open Tab:**
    ```javascript
    chrome.tabs.create({ url: finalUrl });
    ```

### Handling "Data URIs" (Base64)
*   *Note:* The web app uses a proxy (`corsproxy.io`) to fetch images. This works for standard HTTP/HTTPS URLs.
*   *Limitation:* If `info.srcUrl` is a `data:image/...;base64` string, the URL might be too long for a GET request query parameter.
*   *Handling:* The extension should ideally check if the URL starts with `data:`. If it is a very long data URI, the extension might need to show a warning that "Direct Base64 image transfer via URL is not supported" or attempt to upload it (though strictly adhering to the "URL passing" requirement, sticking to HTTP links is safest).

---

## 4. UI/UX Design (Options Page)

*   **Style:** Clean, modern, matching the `slate-900` / `brand-blue` aesthetic of the main app if possible (Dark Mode).
*   **Save Button:** Explicit "Save" button to confirm changes to permissions/menus.
*   **Feedback:** Show "Settings Saved" toast or message.

---

## 5. Development Checklist

1.  [ ] **Initialize Project:** Create `manifest.json`, `background.js`, `options.html`, `options.js`.
2.  [ ] **Implement Settings:** Create the HTML form for Target URL and Mode Checkboxes. Save/Load from `chrome.storage.sync`.
3.  [ ] **Implement Context Menu:** In `background.js`, read settings on startup and `onInstalled` to create the correct menu items (`chrome.contextMenus.create`).
4.  [ ] **Implement Click Handler:** Capture the click, construct the URL according to the spec above, and open the tab.
5.  [ ] **Test:**
    *   Test with default settings.
    *   Test changing the URL (e.g., to `localhost:3000` for dev).
    *   Test disabling one of the modes.
