// create a context menu item
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "open-webgraph",
      title: "Open WebGraph in new tab",
      contexts: ["action"]
    });
  });
  
  // handle context menu click
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "open-webgraph") {
      chrome.tabs.create({ url: "index.html" });
    }
  });
  
  // listen for messages from the popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openInNewTab") {
      chrome.tabs.create({ url: "index.html" });
    }
  });