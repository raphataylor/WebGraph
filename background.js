chrome.runtime.onInstalled.addListener(() => {
    console.log('WebGraph extension installed');
  });

  // Add context menu item
  chrome.contextMenus.create({
    id: "openVisualization",
    title: "Open WebGraph Visualization",
    contexts: ["all"]
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "openVisualization") {
      chrome.tabs.create({ url: "visualization.html" });
    }
  });