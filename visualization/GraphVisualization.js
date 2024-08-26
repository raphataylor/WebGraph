import DataManager from '../utils/DataManager.js';

class GraphVisualization {
  constructor(element) {
    this.element = element;
    this.dataManager = new DataManager();
    this.renderer = new GraphRenderer(element, this);
    this.interactionHandler = new InteractionHandler(this);
    this.settingsManager = new SettingsManager();
    this.sidebarManager = new SidebarManager(this);
    
    this.width = window.innerWidth - 500; // Adjust for sidebars
    this.height = window.innerHeight;
    this.color = d3.scaleOrdinal(d3.schemeCategory10);
    
    this.nodes = [];
    this.links = [];
    this.tagMap = new Map();
    this.selectedNode = null;
    
    this.initializeGraph();
    this.setupEventListeners();
    this.checkAndShowWelcomeScreen();
  }

  async initializeGraph() {
    await this.settingsManager.loadSettings();
    this.renderer.createVisualization(this.width, this.height, this.settingsManager.settings);
    await this.loadBookmarksData();
  }

  setupEventListeners() {
    this.interactionHandler.setup();
  }

  async loadBookmarksData() {
    try {
      const data = await this.dataManager.loadData();
      const space = data.spaces[0];
      if (!space) throw new Error("No space found in data");

      const tags = space.tags || [];
      const sites = space.sites || [];

      this.tagMap = new Map(tags.map(tag => [tag.name.toLowerCase(), tag]));

      this.nodes = [...tags, ...sites];
      this.links = DataUtils.createLinks(sites, this.tagMap);

      const groups = DataUtils.createGroups(tags, sites);

      this.renderer.updateVisualization(this.nodes, this.links, groups);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  handleNodeClick(node) {
    this.selectedNode = node;
    this.sidebarManager.updateSidebar(node);
    this.sidebarManager.updateActionButtons(node);
  }

  async updateNodeTags(node) {
    try {
      await this.dataManager.updateBookmark(node.id, { tags: node.tags });
      await this.loadBookmarksData(); // Reload and redraw the entire graph
    } catch (error) {
      console.error("Error updating bookmark tags:", error);
      throw error;
    }
  }

  checkAndShowWelcomeScreen() {
    chrome.storage.local.get(['showWelcomeScreen'], (result) => {
      if (result.showWelcomeScreen) {
        this.displayWelcomeScreen();
        chrome.storage.local.set({ showWelcomeScreen: false });
      }
    });
  }

  displayWelcomeScreen() {
    const welcomeScreen = document.createElement('div');
    welcomeScreen.id = 'welcome-screen';
    welcomeScreen.innerHTML = `
      <div class="welcome-content">
        <h2>Welcome to WebGraph!</h2>
        <p>Here's a quick guide to get you started:</p>
        <ul>
          <li>Pan and zoom the graph using your mouse or touchpad</li>
          <li>Click on nodes to view details in the sidebar</li>
          <li>Drag nodes to rearrange the graph</li>
          <li>Use the search bar to find specific nodes</li>
          <li>Adjust graph settings in the left sidebar</li>
          <li>Add bookmarks by browsing the web and hitting Ctrl + Shift + Y or Cmd + Shift + Y for MacOS</li>
          <li>Add multiple tags to see a self-organising, semantic structure build up as you add more bookmarks</li>
          <li>An example data set has been pre-loaded so you can get a feel for how the graph can look</li>
          <li>Click "Clear All Bookmarks" to begin your own graph!</li>
        </ul>
        <button id="close-welcome">Got it, let's start!</button>
      </div>
    `;
    document.body.appendChild(welcomeScreen);

    document.getElementById('close-welcome').addEventListener('click', () => {
      welcomeScreen.style.display = 'none';
    });
  }
}

class GraphRenderer {
  constructor(element, graphVisualization) {
    this.graphVisualization = graphVisualization;
    this.svg = d3.select(element).append("svg");
    this.container = this.svg.append("g");
    this.width = window.innerWidth - 500;
    this.height = window.innerHeight;
    this.color = d3.scaleOrdinal(d3.schemeCategory10);
    this.simulation = null;
    this.nodeElements = null;
    this.linkElements = null;
    this.groupElements = null;

    this.setupZoom();
  }

  setupZoom() {
    const zoom = d3.zoom()
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        this.container.attr("transform", event.transform);
      });

    this.svg.call(zoom);
  }

  createVisualization(width, height, settings) {
    this.width = width;
    this.height = height;
    this.settings = settings;
    
    this.svg
      .attr("width", this.width)
      .attr("height", this.height);

      this.simulation = d3.forceSimulation()
      .force("link", d3.forceLink().id(d => d.id).distance(settings.linkDistance))
      .force("charge", d3.forceManyBody().strength(settings.charge))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(settings.nodeSize * 3).strength(settings.collisionStrength))
      .alpha(settings.alpha)
      .alphaDecay(settings.alphaDecay)
      .alphaMin(settings.alphaMin)
      .velocityDecay(settings.velocityDecay);

    this.simulation.on("tick", () => this.ticked());
  }

  ticked() {
    // Check if elements exist before updating
    if (this.linkElements) {
      this.linkElements
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
    }

    if (this.nodeElements) {
      this.nodeElements
        .attr("transform", d => `translate(${d.x},${d.y})`);
    }

    if (this.groupElements) {
      this.groupElements
        .attr("d", this.groupPath.bind(this));
    }
  }

  updateSimulation() {
    this.simulation
      .force("link", d3.forceLink(this.links).id(d => d.id).distance(this.settings.linkDistance))
      .force("charge", d3.forceManyBody().strength(this.settings.charge))
      .force("center", d3.forceCenter(this.width / 2, this.height / 2).strength(this.settings.gravityStrength))
      .force("collision", d3.forceCollide().radius(this.settings.nodeSize * 3).strength(this.settings.collisionStrength))
      .alpha(this.settings.alpha)
      .alphaDecay(this.settings.alphaDecay)
      .alphaMin(this.settings.alphaMin)
      .velocityDecay(this.settings.velocityDecay)
      .restart();
  }

  updateVisualization(nodes, links, groups) {
    this.simulation.nodes(nodes);
    this.simulation.force("link").links(links);


    this.drawGroups(groups);
    this.drawLinks(links);
    this.drawNodes(nodes);

    this.simulation.alpha(1).restart();
  }

  drawLinks(links) {
    this.linkElements = this.container.selectAll(".link")
      .data(links, d => `${d.source.id}-${d.target.id}`)
      .join(
        enter => enter.append("line")
          .attr("class", "link")
          .attr("stroke-width", this.settings.linkSize),
        update => update.attr("stroke-width", this.settings.linkSize),
        exit => exit.remove()
      );
  }

  drawNodes(nodes) {
    this.nodeElements = this.container.selectAll(".node")
      .data(nodes, d => d.id)
      .join(
        enter => {
          const nodeEnter = enter.append("g")
            .attr("class", d => "node " + (d.tags ? "site" : "tag"))
            .call(d3.drag()
              .on("start", (event, d) => this.dragstarted(event, d))
              .on("drag", (event, d) => this.dragged(event, d))
              .on("end", (event, d) => this.dragended(event, d)))
              .on("click", (event, d) => this.graphVisualization.handleNodeClick(d));

          nodeEnter.append("circle")
            .attr("r", d => d.tags ? this.settings.nodeSize : this.settings.nodeSize * 2);

          nodeEnter.append("text")
            .attr("dy", ".35em")
            .attr("x", d => d.tags ? this.settings.nodeSize * 1.5 : this.settings.nodeSize * 2.5)
            .text(d => d.name || d.title);

            return nodeEnter;
          },
          update => update,
          exit => exit.remove()
        );

    this.nodeElements.select("circle")
      .attr("r", d => d.tags ? this.settings.nodeSize : this.settings.nodeSize * 2);

    this.nodeElements.select("text")
      .attr("x", d => d.tags ? this.settings.nodeSize * 1.5 : this.settings.nodeSize * 2.5)
      .text(d => d.name || d.title);
  }

  drawGroups(groups) {
    this.groupElements = this.container.selectAll('.group')
      .data(groups)
      .join(
        enter => enter.insert('path', ':first-child') 
          .attr('class', 'group')
          .style("fill", (d, i) => this.color(i))
          .style("stroke", (d, i) => d3.rgb(this.color(i)).darker())
          .style("opacity", 0.3),
        update => update,
        exit => exit.remove()
      )
      .attr('d', this.groupPath.bind(this));
  }

  groupPath(d) {
    if (!d || !d.nodes || d.nodes.length < 2) return "";
    const hull = d3.polygonHull(d.nodes.map(n => [n.x || 0, n.y || 0]));
    return hull ? `M${hull.join("L")}Z` : "";
  }

  dragstarted(event, d) {
    if (!event.active) this.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  dragended(event, d) {
    if (!event.active) this.simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  highlightNodes(searchTerm) {
    this.nodeElements.classed("highlighted", d => {
      if (searchTerm === '') {
        return false;
      }
      const nodeText = (d.name || d.title || "").toLowerCase();
      return nodeText.includes(searchTerm);
    });
  }
}

class InteractionHandler {
  constructor(graphVisualization) {
    this.graphVisualization = graphVisualization;
  }

  setup() {
    this.setupForceControls();
    this.setupSearchBar();
    this.setupActionButtons();
  }

  setupForceControls() {
    const controls = [
      { id: "node-size", property: "nodeSize" },
      { id: "link-size", property: "linkSize" },
      { id: "charge", property: "charge" },
      { id: "link-distance", property: "linkDistance" },
      { id: "collision-strength", property: "collisionStrength" },
      { id: "gravity-strength", property: "gravityStrength" },
      { id: "alpha", property: "alpha" },
      { id: "alpha-decay", property: "alphaDecay" },
      { id: "alpha-min", property: "alphaMin" },
      { id: "velocity-decay", property: "velocityDecay" }
    ];

    controls.forEach(control => {
      d3.select(`#${control.id}`).on("input", () => {
        const value = +d3.select(`#${control.id}`).property("value");
        this.graphVisualization.settingsManager.updateSetting(control.property, value);
        this.graphVisualization.renderer.updateVisualization(
          this.graphVisualization.nodes,
          this.graphVisualization.links,
          DataUtils.createGroups(
            this.graphVisualization.nodes.filter(n => !n.tags),
            this.graphVisualization.nodes.filter(n => n.tags)
          )
        );
      });
    });
  }

  setupSearchBar() {
    const searchBar = document.getElementById('search-bar');
    searchBar.addEventListener('input', (event) => {
      const searchTerm = event.target.value.toLowerCase();
      this.graphVisualization.renderer.highlightNodes(searchTerm);
    });
  }

  setupActionButtons() {
    d3.select("#go-to-link").on("click", () => this.goToLink());
    d3.select("#remove-bookmark").on("click", () => this.removeSelectedBookmark());
    d3.select("#clear-all-bookmarks").on("click", () => this.clearAllBookmarks());
    d3.select("#reset-defaults").on("click", () => this.resetToDefaults());
  }

  goToLink() {
    if (this.graphVisualization.selectedNode && this.graphVisualization.selectedNode.url) {
      window.open(this.graphVisualization.selectedNode.url, '_blank');
    }
  }

  async removeSelectedBookmark() {
    if (this.graphVisualization.selectedNode && this.graphVisualization.selectedNode.tags) {
      try {
        await this.graphVisualization.dataManager.removeBookmark(this.graphVisualization.selectedNode.id);
        await this.graphVisualization.loadBookmarksData(); // Reload and redraw the entire graph
      } catch (error) {
        console.error("Error removing bookmark:", error);
      }
    }
  }

  async clearAllBookmarks() {
    if (confirm("Are you sure you want to clear all bookmarks? This action cannot be undone.")) {
      try {
        await this.graphVisualization.dataManager.clearAll();
        this.graphVisualization.nodes = [];
        this.graphVisualization.links = [];
        this.graphVisualization.renderer.updateVisualization([], [], []);
        this.graphVisualization.sidebarManager.updateSidebar({});
        this.graphVisualization.sidebarManager.updateActionButtons({});
      } catch (error) {
        console.error("Error clearing bookmarks:", error);
      }
    }
  }

  resetToDefaults() {
    this.graphVisualization.settingsManager.resetToDefaults();
    this.graphVisualization.renderer.updateVisualization(
      this.graphVisualization.nodes,
      this.graphVisualization.links,
      DataUtils.createGroups(
        this.graphVisualization.nodes.filter(n => !n.tags),
        this.graphVisualization.nodes.filter(n => n.tags)
      )
    );
  }

  nodeClicked(d) {
    this.graphVisualization.selectedNode = d;
    this.graphVisualization.sidebarManager.updateSidebar(d);
    this.graphVisualization.sidebarManager.updateActionButtons(d);
  }

  setupDragBehavior() {
    return d3.drag()
      .on("start", (event, d) => this.dragstarted(event, d))
      .on("drag", (event, d) => this.dragged(event, d))
      .on("end", (event, d) => this.dragended(event, d));
  }

  setupZoomBehavior() {
    return d3.zoom().on("zoom", (event) => {
      this.graphVisualization.renderer.container.attr("transform", event.transform);
    });
  }

  dragstarted(event, d) {
    if (!event.active) this.graphVisualization.renderer.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  dragended(event, d) {
    if (!event.active) this.graphVisualization.renderer.simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}

class SettingsManager {
  constructor() {
    this.settings = {
      nodeSize: 10,
      linkSize: 2,
      charge: -200,
      linkDistance: 50,
      collisionStrength: 0.5,
      gravityStrength: 0.1,
      alpha: 1,
      alphaDecay: 0.0228,
      alphaMin: 0.001,
      velocityDecay: 0.4
    };
    this.defaultSettings = { ...this.settings };
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get('forceSettings', (result) => {
        if (result.forceSettings) {
          this.settings = { ...this.settings, ...result.forceSettings };
        }
        resolve();
      });
    });
  }

  saveSettings() {
    chrome.storage.local.set({ forceSettings: this.settings }, () => {
      console.log("Force settings saved:", this.settings);
    });
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();
  }

  resetToDefaults() {
    this.settings = { ...this.defaultSettings };
    this.saveSettings();
  }
}

class SidebarManager {
  constructor(graphVisualization) {
    this.graphVisualization = graphVisualization;
  }

  async updateSidebar(node) {
    const snapshotViewer = d3.select("#snapshot-viewer");
    const notesViewer = d3.select("#notes-viewer");
  
    if (node.tags) {  // It's a site node
      try {
        const snapshot = await this.graphVisualization.dataManager.getSnapshot(node.id);
        if (snapshot) {
          snapshotViewer.html(`
            <div class="snapshot-container">
              <img src="${snapshot}" alt="Site snapshot" class="snapshot-image">
              <button class="snapshot-resize" data-state="small">+</button>
            </div>
          `);
          this.setupSnapshotResize();
        } else {
          snapshotViewer.html(`
            <div style="text-align: center; padding: 20px;">
              <img src="${node.favicon}" alt="Site favicon" style="width:32px; height:32px;">
              <p>No snapshot available</p>
            </div>
          `);
        }
      } catch (error) {
        console.error("Error fetching snapshot:", error);
        snapshotViewer.html(`<p>Error loading snapshot</p>`);
      }
  
      notesViewer.html(`
        <h3>${node.title}</h3>
        <p><strong>URL:</strong> <a href="${node.url}" target="_blank">${node.url}</a></p>
        <div id="tag-editor">
          <p><strong>Tags:</strong></p>
          <div id="tag-container"></div>
          <input type="text" id="tag-input" placeholder="Add a tag...">
        </div>
        <p><strong>Date Created:</strong> ${node.dateCreated}</p>
        <p><strong>Notes:</strong> ${node.notes || 'No notes available'}</p>
      `);

      this.setupTagEditor(node);
    } else {  // It's a tag node
      snapshotViewer.html("");
      notesViewer.html(`<h3>${node.name}</h3><p>Tag with ${this.getAssociatedSitesCount(node)} associated sites.</p>`);
    }
  }

  setupSnapshotResize() {
    const resizeButton = document.querySelector('.snapshot-resize');
    const snapshotContainer = document.querySelector('.snapshot-container');
    const snapshotImage = document.querySelector('.snapshot-image');

    resizeButton.addEventListener('click', () => {
      const currentState = resizeButton.getAttribute('data-state');
      if (currentState === 'small') {
        snapshotContainer.style.position = 'fixed';
        snapshotContainer.style.top = '10%';
        snapshotContainer.style.left = '10%';
        snapshotContainer.style.width = '80%';
        snapshotContainer.style.height = '80%';
        snapshotContainer.style.zIndex = '1000';
        snapshotContainer.style.background = 'white';
        snapshotContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        snapshotImage.style.width = '100%';
        snapshotImage.style.height = '100%';
        snapshotImage.style.objectFit = 'contain';
        resizeButton.textContent = '-';
        resizeButton.setAttribute('data-state', 'large');
      } else {
        snapshotContainer.style = '';
        snapshotImage.style = '';
        resizeButton.textContent = '+';
        resizeButton.setAttribute('data-state', 'small');
      }
    });
  }

  setupTagEditor(node) {
    const tagContainer = document.getElementById('tag-container');
    const tagInput = document.getElementById('tag-input');
  
    if (!node.tags) {
      node.tags = [];
    }

    this.renderTags(node, tagContainer);
  
    tagInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const newTag = tagInput.value.trim();
        if (newTag && !node.tags.includes(newTag)) {
          node.tags.push(newTag);
          try {
            await this.graphVisualization.updateNodeTags(node);
            this.renderTags(node, tagContainer);
            tagInput.value = '';
          } catch (error) {
            console.error("Error updating tags:", error);
          }
        }
      }
    });
  }

  renderTags(node, container) {
    container.innerHTML = '';
    node.tags.forEach(tag => {
      const tagElement = document.createElement('span');
      tagElement.classList.add('tag');
      tagElement.textContent = tag;
      const removeButton = document.createElement('span');
      removeButton.classList.add('tag-remove');
      removeButton.textContent = '×';
      removeButton.onclick = async () => {
        node.tags = node.tags.filter(t => t !== tag);
        await this.graphVisualization.updateNodeTags(node);
        this.renderTags(node, container);
      };
      tagElement.appendChild(removeButton);
      container.appendChild(tagElement);
    });
  }

  updateActionButtons(node) {
    const goToLinkButton = d3.select("#go-to-link");
    const removeBookmarkButton = d3.select("#remove-bookmark");

    if (node.tags) {  // It's a site node
      goToLinkButton.style("display", "block");
      removeBookmarkButton.style("display", "block");
    } else {  // It's a tag node
      goToLinkButton.style("display", "none");
      removeBookmarkButton.style("display", "none");
    }
  }

  getAssociatedSitesCount(tagNode) {
    return this.graphVisualization.nodes.filter(node => node.tags && node.tags.includes(tagNode.name)).length;
  }
}

const DataUtils = {
  createLinks(sites, tagMap) {
    const links = [];
    sites.forEach(site => {
      if (site.tags) {
        site.tags.forEach(tagName => {
          const lowercaseTagName = tagName.toLowerCase();
          if (tagMap.has(lowercaseTagName)) {
            links.push({ source: site.id, target: tagMap.get(lowercaseTagName).id });
          } else {
            console.warn(`Tag with name "${tagName}" not found for site ${site.id}`);
          }
        });
      } else {
        console.warn(`No tags found for site ${site.id}`);
      }
    });
    return links;
  },

  createGroups(tags, sites) {
    return tags.map(tag => ({
      id: tag.id,
      nodes: [tag, ...sites.filter(site => site.tags && site.tags.map(t => t.toLowerCase()).includes(tag.name.toLowerCase()))]
    }));
  }
};

const graph = new GraphVisualization("#graph");