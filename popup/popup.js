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

    const url = document.getElementById('url').value;
    const favicon = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`;

    // Capture snapshot of the current tab
    let snapshot = null;
    try {
      snapshot = await captureSnapshot();
    } catch (error) {
      console.error("Failed to capture snapshot:", error);
    }

    const bookmark = {
      title: document.getElementById('title').value,
      url: url,
      tags: document.getElementById('tags').value.split(',').map(tag => tag.trim()),
      notes: document.getElementById('notes').value,
      dateCreated: new Date().toISOString().split('T')[0],
      visits: 1,
      favicon: favicon,
      snapshot: snapshot
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

async function captureSnapshot() {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(dataUrl);
      }
    });
  });
}