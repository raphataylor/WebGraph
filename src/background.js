// Create a context menu item
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "open-webgraph",
      title: "Open WebGraph in new tab",
      contexts: ["action"]
    });
  });
  
  // Handle context menu click
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "open-webgraph") {
      chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
    }
  });
  
  // Handle extension icon click
  chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
  });