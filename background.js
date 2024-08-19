import DataManager from './utils/DataManager.js';

const dataManager = new DataManager();

chrome.runtime.onInstalled.addListener(async () => {
  console.log('WebGraph extension installed');
  await dataManager.loadData();
});

// Add context menu item
chrome.contextMenus.create({
  id: "openVisualization",
  title: "Open WebGraph Visualization",
  contexts: ["all"]
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "openVisualization") {
    chrome.tabs.create({ url: "visualization/GraphVisualization.html" });
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "addBookmark") {
    try {
      const newBookmark = await dataManager.addBookmark(request.bookmark);
      sendResponse({success: true, bookmark: newBookmark});
    } catch (error) {
      console.error('Error adding bookmark:', error);
      sendResponse({success: false, error: error.message});
    }
    return true;  // Indicates that we will send a response asynchronously
  }
});
