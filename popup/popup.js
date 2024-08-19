import DataManager from '../utils/DataManager.js';

const dataManager = new DataManager();

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('bookmarkForm');
  const openVisualizationButton = document.getElementById('openVisualization');

  // Populate the form with the current tab's information
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    document.getElementById('title').value = currentTab.title;
    document.getElementById('url').value = currentTab.url;
  });

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const bookmark = {
      title: document.getElementById('title').value,
      url: document.getElementById('url').value,
      tags: document.getElementById('tags').value.split(',').map(tag => tag.trim()),
      notes: document.getElementById('notes').value,
      dateCreated: new Date().toISOString().split('T')[0],
      visits: 1
    };

    try {
      const newBookmark = await dataManager.addBookmark(bookmark);
      alert('Bookmark added successfully!');
      window.close();
    } catch (error) {
      alert('Error adding bookmark: ' + error.message);
    }
  });

  openVisualizationButton.addEventListener('click', function() {
    chrome.tabs.create({url: chrome.runtime.getURL('visualization/GraphVisualization.html')});
  });
});