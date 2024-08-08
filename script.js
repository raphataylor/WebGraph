// Global variables
var width = window.innerWidth,
    height = window.innerHeight;

var color = d3.scaleOrdinal(d3.schemeCategory20);

var svg = d3.select("#graph").append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(d3.zoom().on("zoom", function () {
        svg.attr("transform", d3.event.transform)
    }))
    .append("g");

var simulation; // Declare simulation in the global scope

// Resize function
function resizeGraph() {
    width = window.innerWidth;
    height = window.innerHeight;
    svg.attr("width", width).attr("height", height);
    if (simulation) {
        simulation.force("center", d3.forceCenter(width / 2, height / 2));
        simulation.alpha(1).restart();
    }
}

window.addEventListener('resize', resizeGraph);

// Load and process data
d3.json("space1.json", function(error, data) {
    if (error) throw error;

    var space = data.spaces[0];
    var nodes = space.nodes;
    var links = space.links;

    // Create force simulation
    simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(function(d) { return d.id; }))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide(30));

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
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // Add circles to nodes
    node.append("circle")
        .attr("r", function(d) { return d.type === "tag" ? 15 : 10; });

    // Add labels to nodes
    node.append("text")
        .attr("dy", ".35em")
        .attr("x", function(d) { return d.type === "tag" ? 20 : 12; })
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
    simulation.on("tick", function() {
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    });

    // Drag functions
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
});