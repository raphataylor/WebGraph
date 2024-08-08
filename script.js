// Global variables
var width = window.innerWidth,
    height = window.innerHeight;

var color = d3.scaleOrdinal(d3.schemeCategory10);

var svg = d3.select("#graph").append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(d3.zoom().on("zoom", function() {
        container.attr("transform", d3.event.transform);
    }));

var container = svg.append("g");

// Load and process data
d3.json("space1.json", function(error, data) {
    if (error) throw error;
    
    var space = data.spaces[0];
    var nodes = space.nodes;
    var links = space.links;

    // Create a map of node id to node object
    var nodeMap = {};
    nodes.forEach(function(node) {
        nodeMap[node.id] = node;
    });

    // Process links to use node objects instead of ids
    links = links.map(function(link) {
        return {
            source: nodeMap[link.source],
            target: nodeMap[link.target]
        };
    });

    // Create groups (one for each tag)
    var groups = nodes.filter(function(n) { return n.type === "tag"; })
        .map(function(tag) {
            return {
                id: tag.id,
                nodes: [tag].concat(nodes.filter(function(n) {
                    return n.type === "site" && links.some(function(l) {
                        return (l.source.id === tag.id && l.target.id === n.id) || 
                               (l.target.id === tag.id && l.source.id === n.id);
                    });
                }))
            };
        });

    // Create force simulation
    var simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(function(d) { return d.id; }).distance(50))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(30))
        .on("tick", ticked);

    // Create group backgrounds
    var group = container.selectAll('.group')
        .data(groups)
        .enter().append('path')
        .attr('class', 'group')
        .style("fill", function (d, i) { return color(i); })
        .style("stroke", function (d, i) { return d3.rgb(color(i)).darker(); })
        .style("opacity", 0.3);

    // Create links
    var link = container.selectAll(".link")
        .data(links)
        .enter().append("line")
        .attr("class", "link");

    // Create nodes
    var node = container.selectAll(".node")
        .data(nodes)
        .enter().append("g")
        .attr("class", function(d) { return "node " + d.type; })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // Add circles to nodes
    node.append("circle")
        .attr("r", function(d) { return d.type === "tag" ? 20 : 10; });

    // Add labels to nodes
    node.append("text")
        .attr("dy", ".35em")
        .attr("x", function(d) { return d.type === "tag" ? 25 : 15; })
        .text(function(d) { return d.name || d.title || d.id; });

    // Add favicon to site nodes
    node.filter(function(d) { return d.type === "site" && d.favicon; })
        .append("image")
        .attr("xlink:href", function(d) { return d.favicon; })
        .attr("x", -8)
        .attr("y", -8)
        .attr("width", 16)
        .attr("height", 16);

    function ticked() {
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

        group.attr("d", groupPath);
    }

    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    function groupPath(d) {
        var hull = d3.polygonHull(d.nodes.map(function(n) { return [n.x, n.y]; }));
        if (hull) {
            return "M" + hull.join("L") + "Z";
        } else {
            return "";
        }
    }
});