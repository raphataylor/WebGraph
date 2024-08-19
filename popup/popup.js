document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('bookmarkForm');
  const openVisualizationButton = document.getElementById('openVisualization');

  // Populate the form with the current tab's information
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      document.getElementById('title').value = currentTab.title;
      document.getElementById('url').value = currentTab.url;
  });

  form.addEventListener('submit', function(e) {
      e.preventDefault();

      const bookmark = {
          title: document.getElementById('title').value,
          url: document.getElementById('url').value,
          tags: document.getElementById('tags').value.split(',').map(tag => tag.trim()),
          notes: document.getElementById('notes').value,
          dateCreated: new Date().toISOString().split('T')[0],
          visits: 1
      };

      chrome.runtime.sendMessage({action: "addBookmark", bookmark: bookmark}, function(response) {
          if (response && response.success) {
              alert('Bookmark added successfully!');
              window.close();
          } else {
              alert('Error adding bookmark. Please try again.');
          }
      });
  });

  openVisualizationButton.addEventListener('click', function() {
      chrome.tabs.create({url: chrome.runtime.getURL('visualization/GraphVisualization.html')});
  });
});