import DataManager from '../utils/DataManager.js';

class GraphVisualization {
  constructor(element) {
    this.element = element;
    this.dataManager = new DataManager();
    this.width = window.innerWidth - 500; // Adjust for sidebars
    this.height = window.innerHeight;
    this.color = d3.scaleOrdinal(d3.schemeCategory10);
    this.svg = null;
    this.container = null;
    this.simulation = null;
    this.nodeSize = 10;
    this.linkSize = 2;
    this.charge = -200;
    this.linkDistance = 50;
    this.collisionStrength = 0.5;
    this.gravityStrength = 0.1;
    this.alpha = 1;
    this.alphaDecay = 0.0228;
    this.alphaMin = 0.001;
    this.velocityDecay = 0.4;
    this.nodes = [];
    this.links = [];
    this.tagMap = new Map();
    this.selectedNode = null;
    this.showWelcomeScreen = true;
    this.initializeGraph();
    this.setupEventListeners();
    this.checkAndShowWelcomeScreen();
  }

  initializeGraph() {
    this.svg = d3.select(this.element).append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .call(d3.zoom().on("zoom", (event) => {
        this.container.attr("transform", event.transform);
      }));

    this.container = this.svg.append("g");
    this.loadBookmarksData();
  }

  setupEventListeners() {
    d3.select("#node-size").on("input", () => {
      this.nodeSize = +d3.select("#node-size").property("value");
      this.updateVisualization();
    });

    d3.select("#link-size").on("input", () => {
      this.linkSize = +d3.select("#link-size").property("value");
      this.updateVisualization();
    });

    d3.select("#charge").on("input", () => {
      this.charge = +d3.select("#charge").property("value");
      this.updateSimulation();
    });

    d3.select("#link-distance").on("input", () => {
      this.linkDistance = +d3.select("#link-distance").property("value");
      this.updateSimulation();
    });

    d3.select("#collision-strength").on("input", () => {
      this.collisionStrength = +d3.select("#collision-strength").property("value");
      this.updateSimulation();
    });

    d3.select("#gravity-strength").on("input", () => {
      this.gravityStrength = +d3.select("#gravity-strength").property("value");
      this.updateSimulation();
    });

    d3.select("#alpha").on("input", () => {
      this.alpha = +d3.select("#alpha").property("value");
      this.simulation.alpha(this.alpha);
    });

    d3.select("#alpha-decay").on("input", () => {
      this.alphaDecay = +d3.select("#alpha-decay").property("value");
      this.updateSimulation();
    });

    d3.select("#alpha-min").on("input", () => {
      this.alphaMin = +d3.select("#alpha-min").property("value");
      this.updateSimulation();
    });

    d3.select("#velocity-decay").on("input", () => {
      this.velocityDecay = +d3.select("#velocity-decay").property("value");
      this.updateSimulation();
    });

    const searchBar = document.getElementById('search-bar');
    searchBar.addEventListener('input', (event) => {
      const searchTerm = event.target.value.toLowerCase();
      this.highlightNodes(searchTerm);
    });

    /* searchBar.addEventListener('blur', () => {
      searchBar.value = ''; // Clear the search bar
      this.highlightNodes(''); // Clear all highlighting
    }); */

    d3.select("#go-to-link").on("click", () => this.goToLink());
    d3.select("#remove-bookmark").on("click", () => this.removeSelectedBookmark());
    d3.select("#clear-all-bookmarks").on("click", () => this.clearAllBookmarks());
  }

  async loadBookmarksData() {
    try {
      const data = await this.dataManager.loadData();
      const space = data.spaces[0];
      const tags = space.tags || [];
      const sites = space.sites || [];
      
      // Create the tagMap using tag names
      this.tagMap = new Map(tags.map(tag => [tag.name.toLowerCase(), tag]));
      
      this.createVisualization(tags, sites);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  async removeSelectedBookmark() {
    if (this.selectedNode && this.selectedNode.tags) {  // Check if it's a bookmark node
      try {
        await this.dataManager.removeBookmark(this.selectedNode.id);
        this.loadBookmarksData();  // Reload and redraw the graph
      } catch (error) {
        console.error("Error removing bookmark:", error);
      }
    }
  }

  async clearAllBookmarks() {
    if (confirm("Are you sure you want to clear all bookmarks? This action cannot be undone.")) {
      try {
        await this.dataManager.clearAll();
        this.loadBookmarksData();  // Reload and redraw the graph
      } catch (error) {
        console.error("Error clearing bookmarks:", error);
      }
    }
  }

  createVisualization(tags, sites) {
    this.nodes = [...tags, ...sites];
    this.links = this.createLinks(sites);

    const groups = this.createGroups(tags, sites);

    this.simulation = d3.forceSimulation(this.nodes)
      .force("link", d3.forceLink(this.links).id(d => d.id).distance(this.linkDistance))
      .force("charge", d3.forceManyBody().strength(this.charge))
      .force("center", d3.forceCenter(this.width / 2, this.height / 2))
      .force("collision", d3.forceCollide().radius(this.nodeSize * 3).strength(this.collisionStrength))
      .alpha(this.alpha)
      .alphaDecay(this.alphaDecay)
      .alphaMin(this.alphaMin)
      .velocityDecay(this.velocityDecay);

    this.drawGroups(groups);
    this.drawLinks(this.links);
    this.drawNodes(this.nodes);

    this.simulation.on("tick", () => this.ticked());
  }

  createLinks(sites) {
    const links = [];
    sites.forEach(site => {
      if (site.tags) {
        site.tags.forEach(tagName => {
          // debugging console log
          console.log(`Processing site: ${site.title}, tags: ${site.tags}`);
          const lowercaseTagName = tagName.toLowerCase();
          if (this.tagMap.has(lowercaseTagName)) {
            links.push({ source: site.id, target: this.tagMap.get(lowercaseTagName).id });
          } else {
            console.warn(`Tag with name "${tagName}" not found for site ${site.id}`);
          }
        });
      }
    });
    return links;
  }

  createGroups(tags, sites) {
    return tags.map(tag => ({
      id: tag.id,
      nodes: [tag, ...sites.filter(site => site.tags && site.tags.map(t => t.toLowerCase()).includes(tag.name.toLowerCase()))]
    }));
  }

  drawGroups(groups) {
    this.container.selectAll('.group')
      .data(groups)
      .enter().append('path')
      .attr('class', 'group')
      .style("fill", (d, i) => this.color(i))
      .style("stroke", (d, i) => d3.rgb(this.color(i)).darker())
      .style("opacity", 0.3);
  }

  drawLinks(links) {
    console.log(`Drawing ${links.length} links`);
    this.container.selectAll(".link")
      .data(links)
      .enter().append("line")
      .attr("class", "link")
      .attr("stroke-width", this.linkSize);
  }

  drawNodes(nodes) {
    const node = this.container.selectAll(".node")
      .data(nodes)
      .join("g")  // Use join instead of enter().append()
      .attr("class", d => "node " + (d.tags ? "site" : "tag"))
      .call(d3.drag()
        .on("start", (event, d) => this.dragstarted(event, d))
        .on("drag", (event, d) => this.dragged(event, d))
        .on("end", (event, d) => this.dragended(event, d)))
      .on("click", (event, d) => this.nodeClicked(d));
  
    node.selectAll("circle")
      .data(d => [d])
      .join("circle")
      .attr("r", d => d.tags ? this.nodeSize : this.nodeSize * 2);
  
    node.selectAll("text")
      .data(d => [d])
      .join("text")
      .attr("dy", ".35em")
      .attr("x", d => d.tags ? this.nodeSize * 1.5 : this.nodeSize * 2.5)
      .text(d => d.name || d.title);
  
    node.selectAll("image")
      .data(d => d.tags && d.favicon ? [d] : [])
      .join("image")
      .attr("xlink:href", d => d.favicon)
      .attr("x", -this.nodeSize * 0.8)
      .attr("y", -this.nodeSize * 0.8)
      .attr("width", this.nodeSize * 1.6)
      .attr("height", this.nodeSize * 1.6);
  
    node.selectAll("title")
      .data(d => [d])
      .join("title")
      .text(d => {
        if (d.tags) {
          return `${d.title}\nURL: ${d.url}\nVisits: ${d.visits}\nCreated: ${d.dateCreated}\nNotes: ${d.notes}`;
        } else {
          return `${d.name}\nSites: ${d.childCount}`;
        }
      });
  }

  ticked() {
    this.container.selectAll(".link")
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    this.container.selectAll(".node")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    this.container.selectAll(".group")
      .attr("d", this.groupPath);
  }

  groupPath(d) {
    const hull = d3.polygonHull(d.nodes.map(n => [n.x, n.y]));
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

  updateVisualization() {
    this.container.selectAll(".node circle")
      .attr("r", d => d.tags ? this.nodeSize : this.nodeSize * 2);

    this.container.selectAll(".link")
      .attr("stroke-width", this.linkSize);
  }

  updateSimulation() {
    this.simulation
      .force("link", d3.forceLink(this.links).id(d => d.id).distance(this.linkDistance))
      .force("charge", d3.forceManyBody().strength(this.charge))
      .force("center", d3.forceCenter(this.width / 2, this.height / 2).strength(this.gravityStrength))
      .force("collision", d3.forceCollide().radius(this.nodeSize * 3).strength(this.collisionStrength))
      .alpha(this.alpha)
      .alphaDecay(this.alphaDecay)
      .alphaMin(this.alphaMin)
      .velocityDecay(this.velocityDecay)
      .restart();
  }

  highlightNodes(searchTerm) {
    this.container.selectAll(".node")
      .classed("highlighted", d => {
        if (searchTerm === '') {
          return false; // Remove highlighting when search term is empty
        }
        const nodeText = (d.name || d.title || "").toLowerCase();
        return nodeText.includes(searchTerm);
      });
  }

  nodeClicked(d) {
    this.selectedNode = d;
    this.updateSidebar(d);
    this.updateActionButtons(d);
  }

  async updateSidebar(node) {
    const snapshotViewer = d3.select("#snapshot-viewer");
    const notesViewer = d3.select("#notes-viewer");
  
    if (node.tags) {  // It's a site node
      try {
        const snapshot = await this.dataManager.getSnapshot(node.id);
        if (snapshot) {
          snapshotViewer.html(`
            <div class="snapshot-container">
              <img src="${snapshot}" alt="Site snapshot" class="snapshot-image">
              <button class="snapshot-resize" data-state="small">+</button>
            </div>
          `);
          this.setupSnapshotResize();
        } else {
          // Use favicon as a small thumbnail if snapshot is not available
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

  setupTagEditor(node) {
    const tagContainer = document.getElementById('tag-container');
    const tagInput = document.getElementById('tag-input');

    this.renderTags(node, tagContainer);

    tagInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const newTag = tagInput.value.trim();
        if (newTag && !node.tags.includes(newTag)) {
          node.tags.push(newTag);
          await this.updateNodeTags(node);
          this.renderTags(node, tagContainer);
          tagInput.value = '';
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
        await this.updateNodeTags(node);
        this.renderTags(node, container);
      };
      tagElement.appendChild(removeButton);
      container.appendChild(tagElement);
    });
  }

  async updateNodeTags(node) {
    try {
      await this.dataManager.updateBookmark(node.id, { tags: node.tags });
      this.loadBookmarksData();  // Reload and redraw the graph
    } catch (error) {
      console.error("Error updating bookmark tags:", error);
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

  goToLink() {
    if (this.selectedNode && this.selectedNode.url) {
      window.open(this.selectedNode.url, '_blank');
    }
  }

  async removeSelectedBookmark() {
    if (this.selectedNode && this.selectedNode.tags) {  // Check if it's a site node
      try {
        await this.dataManager.removeBookmark(this.selectedNode.id);
        this.loadBookmarksData();  // Reload and redraw the graph
      } catch (error) {
        console.error("Error removing bookmark:", error);
      }
    }
  }

  getAssociatedSitesCount(tagNode) {
    return this.nodes.filter(node => node.tags && node.tags.includes(tagNode.name)).length;
  }

  checkAndShowWelcomeScreen() {
    if (this.showWelcomeScreen) {
      this.displayWelcomeScreen();
    }
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
        </ul>
        <button id="close-welcome">Got it, let's start!</button>
      </div>
    `;
    document.body.appendChild(welcomeScreen);

    document.getElementById('close-welcome').addEventListener('click', () => {
      welcomeScreen.style.display = 'none';
      this.showWelcomeScreen = false;
    });
  }
}

// Initialize the graph
const graph = new GraphVisualization("#graph");