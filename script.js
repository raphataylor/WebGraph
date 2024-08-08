// Global variables
var width = window.innerWidth,
    height = window.innerHeight;

var color = d3.scaleOrdinal(d3.schemeCategory10);

var svg = d3.select("#graph").append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(d3.zoom().on("zoom", function () {
        svg.attr("transform", d3.event.transform)
    }))
    .append("g");

var cola;

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
            var groupNodes = [tag].concat(nodes.filter(function(n) {
                return n.type === "site" && links.some(function(l) {
                    return (l.source.id === tag.id && l.target.id === n.id) || 
                           (l.target.id === tag.id && l.source.id === n.id);
                });
            }));
            return {
                leaves: groupNodes.map(function(n) { return nodes.indexOf(n); }),
                id: tag.id,
                padding: 20
            };
        });

    // Initialize cola layout
    cola = cola.d3adaptor(d3)
        .size([width, height])
        .avoidOverlaps(true)
        .handleDisconnected(true)
        .linkDistance(30)
        .groupCompactness(0.5)
        .convergenceThreshold(1e-4)
        .flowLayout('y', 100)
        .symmetricDiffLinkLengths(5)
        .jaccardLinkLengths(30, 0.7);

    // Set up cola layout
    cola
        .nodes(nodes)
        .links(links)
        .groups(groups)
        .start(50, 0, 50, 50);

    // Create group backgrounds
    var group = svg.selectAll('.group')
        .data(groups)
        .enter().append('rect')
        .classed('group', true)
        .attr('rx', 8).attr('ry', 8)
        .style("fill", function (d, i) { return color(i); })
        .style("opacity", 0.3)
        .call(cola.drag);

    // Create links
    var link = svg.selectAll(".link")
        .data(links)
        .enter().append("line")
        .attr("class", "link");

    // Create nodes
    var node = svg.selectAll(".node")
        .data(nodes)
        .enter().append("g")
        .attr("class", function(d) { return "node " + d.type; })
        .call(cola.drag);

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

    // Update positions on tick
    cola.on("tick", function() {
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

        group
            .attr("x", function (d) { return d.bounds.x; })
            .attr("y", function (d) { return d.bounds.y; })
            .attr("width", function (d) { return d.bounds.width(); })
            .attr("height", function (d) { return d.bounds.height(); });
    });
});