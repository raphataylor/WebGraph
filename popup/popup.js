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

    // Capture and compress snapshot of the current tab
    let snapshot = null;
    try {
      console.log("Attempting to capture snapshot...");
      const originalSnapshot = await captureSnapshot();
      console.log("Snapshot captured successfully. Original length:", originalSnapshot.length);
      
      snapshot = await compressImage(originalSnapshot, 600, 1);
      console.log("Snapshot compressed. New length:", snapshot.length);
      console.log("Compressed snapshot preview:", snapshot.substring(0, 100) + "...");
    } catch (error) {
      console.error("Failed to capture or compress snapshot:", error);
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

    console.log("Bookmark object created:", bookmark);

    try {
      const newBookmark = await dataManager.addBookmark(bookmark);
      console.log("Bookmark added successfully:", newBookmark);
      alert('Bookmark added successfully!');
      window.close();
    } catch (error) {
      console.error("Error adding bookmark:", error);
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
        console.error("Error in captureVisibleTab:", chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        console.log("Tab captured successfully");
        resolve(dataUrl);
      }
    });
  });
}

async function compressImage(base64String, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = base64String;
  });
}