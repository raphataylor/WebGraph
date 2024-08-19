let currentTab = null;

// Fetch current tab information when popup is opened
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  currentTab = tabs[0];
  document.getElementById('title').value = currentTab.title;
  document.getElementById('url').value = currentTab.url;
});

document.getElementById('saveButton').addEventListener('click', function() {
  const title = document.getElementById('title').value;
  const url = document.getElementById('url').value;
  const tags = document.getElementById('tags').value.split(',').map(tag => tag.trim());
  const notes = document.getElementById('notes').value;

  // Generate a unique ID for the new site
  const siteId = 'site' + Date.now();

  // Create the new site object
  const newSite = {
    id: siteId,
    title: title,
    url: url,
    tags: tags,
    dateCreated: new Date().toISOString().split('T')[0],
    visits: 1,
    notes: notes,
    snapshot: "", // We'll implement snapshot functionality in the next step
    favicon: currentTab.favIconUrl || ""
  };

  // Fetch existing data, update it, and save it back
  chrome.storage.local.get(['spaces'], function(result) {
    let spaces = result.spaces || [];
    if (spaces.length === 0) {
      spaces.push({
        id: "space1",
        name: "Default Space",
        tags: [],
        sites: []
      });
    }

    // Add new tags if they don't exist
    tags.forEach(tag => {
      if (!spaces[0].tags.some(t => t.name === tag)) {
        spaces[0].tags.push({
          id: 'tag' + Date.now(),
          name: tag
        });
      }
    });

    // Add the new site
    spaces[0].sites.push(newSite);

    // Save updated data
    chrome.storage.local.set({spaces: spaces}, function() {
      console.log('Bookmark saved');
      // Clear the form
      document.getElementById('title').value = '';
      document.getElementById('tags').value = '';
      document.getElementById('notes').value = '';
    });
  });
});

document.getElementById('openVisualization').addEventListener('click', function() {
  chrome.tabs.create({url: 'visualization.html'});
});