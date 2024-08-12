// import necessary modules
import { GraphVisualizer } from './visualizer/GraphVisualizer.js';
import { DataManager } from './utils/DataManager.js';

// initialise the graph in the popup
function initialiseGraph() {
    const container = document.getElementById('graph-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // initialise data manager
    const dataManager = new DataManager();

    // load data
    dataManager.loadData().then(data => {
        // initialise graph visualizer
        const graphVisualizer = new GraphVisualizer(container, width, height);

        // create graph
        graphVisualizer.createGraph(data);

        // setup event listeners for graph interactions
        setupGraphInteractions(graphVisualizer);
    }).catch(error => {
        console.error('error loading data:', error);
        container.innerHTML = 'error loading graph data. please try again.';
    });
}

// setup event listeners for graph interactions
function setupGraphInteractions(graphVisualizer) {
    // example: zoom controls
    document.getElementById('zoom-in').addEventListener('click', () => graphVisualizer.zoomIn());
    document.getElementById('zoom-out').addEventListener('click', () => graphVisualizer.zoomOut());

    // example: filter controls
    document.getElementById('filter-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const filterValue = document.getElementById('filter-input').value;
        graphVisualizer.filterNodes(filterValue);
    });
}

// handle "open in new tab" button click
document.getElementById('open-new-tab').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openInNewTab' });
});

// handle search functionality
document.getElementById('search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const searchTerm = document.getElementById('search-input').value;
    // implement search functionality here
    console.log('searching for:', searchTerm);
});

// toggle sidebar visibility
function toggleSidebar(sidebarId) {
    const sidebar = document.getElementById(sidebarId);
    sidebar.classList.toggle('hidden');
}

document.getElementById('toggle-left-sidebar').addEventListener('click', () => toggleSidebar('left-sidebar'));
document.getElementById('toggle-right-sidebar').addEventListener('click', () => toggleSidebar('right-sidebar'));

// initialise popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initialiseGraph();
});

// listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateGraph') {
        // refresh the graph with new data
        initialiseGraph();
    }
});