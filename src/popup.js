// initialise the graph in the popup
function initialiseGraph() {
    const container = document.getElementById('graph-container');
    if (container) {
        const width = container.clientWidth;
        const height = container.clientHeight;

        // placeholder for graph initialisation
        container.innerHTML = 'Graph placeholder';
    } else {
        console.error('Graph container not found');
    }
}

// handle "open in new tab" button click
document.getElementById('open-new-tab')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openInNewTab' });
});

// initialise popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initialiseGraph();
});