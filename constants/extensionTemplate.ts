
export const MANIFEST_JSON = `{
  "manifest_version": 3,
  "name": "PDF & Image Editor Companion",
  "version": "3.6.0",
  "description": "Send images directly to pdf.5plus.lv by downloading them in the background.",
  "permissions": [
    "contextMenus",
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "options_page": "options.html",
  "icons": {
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  }
}`;

export const BACKGROUND_JS = `
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['targetUrl', 'showConverter', 'showEditor'], (result) => {
    if (!result.targetUrl) {
      chrome.storage.sync.set({
        targetUrl: 'https://pdf.5plus.lv/',
        showConverter: true,
        showEditor: true
      });
    }
    createMenus();
  });
});

const safeCreate = (params) => {
    chrome.contextMenus.create(params, () => {
        if (chrome.runtime.lastError) {}
    });
};

function createMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.storage.sync.get(['targetUrl', 'showConverter', 'showEditor'], (items) => {
      const showConv = items.showConverter !== false; 
      const showEdit = items.showEditor !== false;    

      if (showConv && showEdit) {
        safeCreate({ id: "parent", title: "Send to PDF.5PLUS.LV", contexts: ["image"] });
        safeCreate({ parentId: "parent", id: "converter", title: "Send to Converter", contexts: ["image"] });
        safeCreate({ parentId: "parent", id: "editor", title: "Send to Editor", contexts: ["image"] });
      } else if (showConv) {
        safeCreate({ id: "converter", title: "Send Image to Converter", contexts: ["image"] });
      } else if (showEdit) {
        safeCreate({ id: "editor", title: "Send Image to Editor", contexts: ["image"] });
      }
    });
  });
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && (changes.showConverter || changes.showEditor)) {
    createMenus();
  }
});

const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const imageUrl = info.srcUrl;
  const mode = info.menuItemId === 'editor' ? 'editor' : 'converter';

  if (!imageUrl) return;

  chrome.storage.sync.get(['targetUrl'], async (items) => {
    let baseUrl = items.targetUrl || 'https://pdf.5plus.lv/';
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    try {
        console.log("Extension fetching:", imageUrl);
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const base64Data = await blobToBase64(blob);
        
        chrome.tabs.create({ url: baseUrl }, (newTab) => {
            const listener = (tabId, changeInfo) => {
                if (tabId === newTab.id && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        func: (data, mime, fname, targetMode) => {
                            window.postMessage({
                                type: 'EXTENSION_IMAGE_DATA',
                                base64Data: data,
                                mimeType: mime,
                                filename: fname,
                                targetMode: targetMode
                            }, '*');
                        },
                        args: [base64Data, blob.type, 'pasted-image', mode]
                    });
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
        });

    } catch (error) {
        console.error("Extension fetch failed:", error);
        const encodedImage = encodeURIComponent(imageUrl);
        const finalUrl = \`\${baseUrl}/?image=\${encodedImage}&mode=\${mode}\`;
        chrome.tabs.create({ url: finalUrl });
    }
  });
});
`;

export const OPTIONS_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Extension Options</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 20px; min-width: 350px; }
    h2 { border-bottom: 1px solid #334155; padding-bottom: 10px; margin-top: 0; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 8px; font-weight: 500; }
    input[type="text"] { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #475569; background-color: #1e293b; color: white; box-sizing: border-box; }
    .checkbox-group { display: flex; align-items: center; margin-bottom: 10px; }
    input[type="checkbox"] { margin-right: 10px; transform: scale(1.2); cursor: pointer; }
    label.cb-label { margin-bottom: 0; cursor: pointer; }
    button { background-color: #2563eb; color: white; border: none; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%; transition: background 0.2s; }
    button:hover { background-color: #1d4ed8; }
    #status { margin-top: 15px; color: #4ade80; text-align: center; height: 20px; font-size: 0.9em; min-height: 20px;}
    .note { font-size: 0.8em; color: #94a3b8; margin-top: 5px; }
  </style>
</head>
<body>
  <h2>Extension Settings</h2>
  
  <div class="form-group">
    <label for="targetUrl">Target Website URL:</label>
    <input type="text" id="targetUrl" placeholder="https://pdf.5plus.lv/">
    <div class="note">URL of the editor web app.</div>
  </div>

  <div class="form-group">
    <label>Context Menu Options:</label>
    <div class="checkbox-group">
      <input type="checkbox" id="showConverter">
      <label for="showConverter" class="cb-label">Show 'Send to Converter'</label>
    </div>
    <div class="checkbox-group">
      <input type="checkbox" id="showEditor">
      <label for="showEditor" class="cb-label">Show 'Send to Editor'</label>
    </div>
  </div>

  <button id="save">Save Settings</button>
  <div id="status"></div>

  <script src="options.js"></script>
</body>
</html>`;

export const OPTIONS_JS = `
function save_options() {
  var targetUrl = document.getElementById('targetUrl').value;
  var showConverter = document.getElementById('showConverter').checked;
  var showEditor = document.getElementById('showEditor').checked;
  
  if (targetUrl && !targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
  }

  chrome.storage.sync.set({
    targetUrl: targetUrl,
    showConverter: showConverter,
    showEditor: showEditor
  }, function() {
    var status = document.getElementById('status');
    status.textContent = 'Settings saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 2000);
    chrome.runtime.getBackgroundPage(function(bg) {
        if(bg && bg.createMenus) bg.createMenus();
    });
  });
}

function restore_options() {
  chrome.storage.sync.get({
    targetUrl: 'https://pdf.5plus.lv/',
    showConverter: true,
    showEditor: true
  }, function(items) {
    document.getElementById('targetUrl').value = items.targetUrl;
    document.getElementById('showConverter').checked = items.showConverter;
    document.getElementById('showEditor').checked = items.showEditor;
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
`;

// Simple red square icon base64
export const ICON_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
