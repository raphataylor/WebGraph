document.addEventListener('DOMContentLoaded', function() {
    const urlInput = document.getElementById('url');
    const tagsInput = document.getElementById('tags');
    const notesInput = document.getElementById('notes');
    const saveButton = document.getElementById('saveButton');
    const form = document.getElementById('bookmarkForm');

    // Get the current tab's URL
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        urlInput.value = tabs[0].url;
    });

    form.addEventListener('submit', function(event) {
        event.preventDefault();

        const bookmark = {
            url: urlInput.value,
            tags: tagsInput.value.split(',').map(tag => tag.trim()),
            notes: notesInput.value,
            dateAdded: new Date().toISOString()
        };

        // Save the bookmark
        chrome.storage.local.get('bookmarks', function(result) {
            const bookmarks = result.bookmarks || [];
            bookmarks.push(bookmark);
            chrome.storage.local.set({bookmarks: bookmarks}, function() {
                console.log('Bookmark saved');
                // TODO: Add visual feedback for the user
                window.close(); // Close the popup after saving
            });
        });

        // Capture screenshot (this is a placeholder - actual implementation will be more complex)
        chrome.tabs.captureVisibleTab(null, {}, function(dataUrl) {
            // TODO: Save the screenshot
            console.log('Screenshot captured');
        });
    });
});