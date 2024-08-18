document.getElementById('saveTab').addEventListener('click', () => {
    // TODO: Implement save tab functionality
    console.log('Save tab clicked');
  });

  document.getElementById('openVisualization').addEventListener('click', () => {
    chrome.tabs.create({ url: 'visualization.html' });
  });