import DataManager from '../utils/DataManager.js';

class GraphVisualization {
  constructor(element) {
    this.element = element;
    this.dataManager = new DataManager();
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.color = d3.scaleOrdinal(d3.schemeCategory10);
    this.svg = null;
    this.container = null;
    this.simulation = null;
    this.nodeSize = 10;
    this.linkSize = 2;
    this.charge = -200;
    this.linkDistance = 50;
    this.nodes = [];
    this.links = [];
    this.tagMap = new Map();
    this.initializeGraph();
    this.setupEventListeners();
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

    d3.select("#search-bar").on("input", () => {
      const searchTerm = d3.select("#search-bar").property("value").toLowerCase();
      this.highlightNodes(searchTerm);
    });

    d3.select("#go-to-link").on("click", () => {
      if (this.selectedNode && this.selectedNode.url) {
        window.open(this.selectedNode.url, '_blank');
      }
    });

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
      .force("collision", d3.forceCollide().radius(this.nodeSize * 3));

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
    this.container.selectAll(".link")
      .data(links)
      .enter().append("line")
      .attr("class", "link")
      .attr("stroke-width", this.linkSize);
  }

  drawNodes(nodes) {
    const node = this.container.selectAll(".node")
      .data(nodes)
      .enter().append("g")
      .attr("class", d => "node " + (d.tags ? "site" : "tag"))
      .call(d3.drag()
        .on("start", (event, d) => this.dragstarted(event, d))
        .on("drag", (event, d) => this.dragged(event, d))
        .on("end", (event, d) => this.dragended(event, d)))
      .on("click", (event, d) => this.nodeClicked(d));

    node.append("circle")
      .attr("r", d => d.tags ? this.nodeSize : this.nodeSize * 2);

    node.append("text")
      .attr("dy", ".35em")
      .attr("x", d => d.tags ? this.nodeSize * 1.5 : this.nodeSize * 2.5)
      .text(d => d.name || d.title);

    node.filter(d => d.tags && d.favicon)
      .append("image")
      .attr("xlink:href", d => d.favicon)
      .attr("x", -this.nodeSize * 0.8)
      .attr("y", -this.nodeSize * 0.8)
      .attr("width", this.nodeSize * 1.6)
      .attr("height", this.nodeSize * 1.6);

    node.append("title")
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
      .alpha(1)
      .restart();
  }

  highlightNodes(searchTerm) {
    this.container.selectAll(".node")
      .classed("highlighted", d => {
        const nodeText = (d.name || d.title || "").toLowerCase();
        return nodeText.includes(searchTerm);
      });
  }

  nodeClicked(d) {
    this.selectedNode = d;
    this.updateSidebar(d);
  }

  updateSidebar(node) {
    const snapshotViewer = d3.select("#snapshot-viewer");
    const notesViewer = d3.select("#notes-viewer");

    if (node.tags) {
      snapshotViewer.html(`<img src="${node.snapshot || 'placeholder.png'}" alt="Site snapshot" style="width:100%;">`);
      notesViewer.html(`<h3>${node.title}</h3><p>${node.notes || 'No notes available.'}</p>`);
      d3.select("#go-to-link").style("display", "block");
    } else {
      snapshotViewer.html("");
      notesViewer.html(`<h3>${node.name}</h3><p>Tag with ${node.childCount || 0} associated sites.</p>`);
      d3.select("#go-to-link").style("display", "none");
    }
  }
}

// Initialize the graph
const graph = new GraphVisualization("#graph");