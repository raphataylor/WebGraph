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
      chrome.tabs.create({ url: "visualization/GraphVisualization.html" });
    }
  });

// Function to load initial data
function loadInitialData() {
  chrome.storage.local.get('webgraph_data', function(result) {
    if (Object.keys(result).length === 0) {
      // If no data in storage, load example data
      fetch(chrome.runtime.getURL('data/bookmarks.json'))
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          chrome.storage.local.set({ 'webgraph_data': data }, function() {
            console.log('Example data loaded into storage');
          });
        })
        .catch(e => {
          console.error('Error loading initial data:', e);
        });
    }
  });
}

// Call loadInitialData when extension is installed or updated
chrome.runtime.onInstalled.addListener(loadInitialData);

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "addBookmark") {
    chrome.storage.local.get('webgraph_data', function(result) {
      let data = result.webgraph_data;
      if (!data) {
        data = { spaces: [{ id: "space1", name: "Personal Bookmarks", tags: [], sites: [] }] };
      }

      // Generate a unique ID for the new bookmark
      const newId = 'site' + (data.spaces[0].sites.length + 1);

      // Create new bookmark object
      const newBookmark = {
        id: newId,
        title: request.bookmark.title,
        url: request.bookmark.url,
        tags: request.bookmark.tags,
        dateCreated: request.bookmark.dateCreated,
        visits: request.bookmark.visits,
        notes: request.bookmark.notes,
        // You would need to implement these:
        // snapshot: captureSnapshot(request.bookmark.url),
        // favicon: getFavicon(request.bookmark.url)
      };

      // Add new bookmark to the data
      data.spaces[0].sites.push(newBookmark);

      // Update tags
      request.bookmark.tags.forEach(tag => {
        if (!data.spaces[0].tags.some(t => t.name === tag)) {
          data.spaces[0].tags.push({ id: 'tag' + (data.spaces[0].tags.length + 1), name: tag });
        }
      });

      // Save updated data back to storage
      chrome.storage.local.set({ 'webgraph_data': data }, function() {
        console.log('Bookmark added to storage');
        sendResponse({success: true});
      });
    });

    return true;  // Indicates that we will send a response asynchronously
  }
});