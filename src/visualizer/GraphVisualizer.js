import * as d3 from 'd3';

class GraphVisualizer {
  constructor(element) {
    this.element = element;
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
  }

  initializeGraph() {
    this.svg = d3.select(this.element).append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .call(d3.zoom().on("zoom", (event) => {
        this.container.attr("transform", event.transform);
      }));

    this.container = this.svg.append("g");
  }

  loadGraphSettings(settingsUrl) {
    return d3.json(settingsUrl).then(settings => {
      this.nodeSize = settings.nodeSize;
      this.linkSize = settings.linkSize;
      this.charge = settings.forceSettings.charge;
      this.linkDistance = settings.forceSettings.linkDistance;
    }).catch(error => {
      console.error("Error loading the graph settings:", error);
    });
  }

  loadBookmarksData(bookmarksUrl) {
    return d3.json(bookmarksUrl).then(data => {
      if (!data.spaces || data.spaces.length === 0) {
        console.error("No spaces found in the bookmarks data");
        return;
      }

      const space = data.spaces[0];
      const tags = space.tags || [];
      const sites = space.sites || [];

      this.createVisualization(tags, sites);
    }).catch(error => {
      console.error("Error loading the bookmarks data:", error);
    });
  }

  createVisualization(tags, sites) {
    const nodes = tags.concat(sites);
    const links = this.createLinks(sites);
    const groups = this.createGroups(tags, sites);

    this.simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(this.linkDistance))
      .force("charge", d3.forceManyBody().strength(this.charge))
      .force("center", d3.forceCenter(this.width / 2, this.height / 2))
      .force("collision", d3.forceCollide().radius(this.nodeSize * 3));

    this.drawGroups(groups);
    this.drawLinks(links);
    this.drawNodes(nodes);

    this.simulation.on("tick", () => this.ticked());
  }

  createLinks(sites) {
    const links = [];
    sites.forEach(site => {
      if (site.tags) {
        site.tags.forEach(tagId => {
          links.push({ source: site.id, target: tagId });
        });
      }
    });
    return links;
  }

  createGroups(tags, sites) {
    return tags.map(tag => ({
      id: tag.id,
      nodes: [tag].concat(sites.filter(site => site.tags && site.tags.includes(tag.id)))
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
        .on("end", (event, d) => this.dragended(event, d)));

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

  updateSize(width, height) {
    this.width = width;
    this.height = height;
    
    // Update SVG size
    if (this.svg) {
      this.svg
        .attr('width', this.width)
        .attr('height', this.height);
    }

    // Update force simulation
    if (this.simulation) {
      this.simulation
        .force('center', d3.forceCenter(this.width / 2, this.height / 2))
        .restart();
    }

    // Redraw nodes and links if necessary
    this.updateNodePositions();
    this.updateLinkPositions();
  }

  updateNodePositions() {
    // Update node positions based on new size
    if (this.nodeElements) {
      this.nodeElements
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
    }
  }

  updateLinkPositions() {
    // Update link positions based on new size
    if (this.linkElements) {
      this.linkElements
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
    }
  }
}

export default GraphVisualizer;