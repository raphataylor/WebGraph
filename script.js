// global variables
var width = window.innerWidth,
    height = window.innerHeight;

var color = d3.scaleOrdinal(d3.schemeCategory20);

var svg = d3.select("#graph").append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(d3.zoom().on("zoom", function () {
        svg.attr("transform", d3.event.transform)
    }))
    .append("g")
    .attr("transform", "translate(40,0)"); // Add some left padding

// resize function
window.onresize = function() {
    width = window.innerWidth;
    height = window.innerHeight;
    svg.attr("width", width).attr("height", height);
    updateLayout(); // Call this function to update the layout when resizing
};

function updateLayout() {
    // Update the tree layout with new dimensions
    treeLayout.size([height - 80, width - 160]);
    
    // Recompute the layout
    root = treeLayout(hierarchy);
    
    // Update node positions
    node.attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });
    
    // Update link paths
    link.attr("d", d3.linkHorizontal()
        .x(function(d) { return d.y; })
        .y(function(d) { return d.x; }));
}

// Declare these variables in the global scope
var treeLayout, root, node, link, hierarchy;

// load and process data
d3.json("space1.json", function(error, data) {
    if (error) {
        console.error("Error loading the JSON file:", error);
        return;
    }

    var space = data.spaces[0]; // assuming we're working with the first space
    
    // Add a root node
    var rootNode = {id: "root", name: "WebGraph", type: "root"};
    var nodes = [rootNode].concat(space.nodes);
    
    var graph = {
        nodes: nodes,
        links: space.links
    };

    // Get nodeSize from settings, or use a default value
    var nodeSize = (space.settings && space.settings.nodeSize) || 5;

    // create a hierarchy
    hierarchy = d3.stratify()
        .id(function(d) { return d.id; })
        .parentId(function(d) {
            if (d.id === "root") return null;
            if (d.type === "tag") return "root";
            return d.tags && d.tags.length > 0 ? d.tags[0] : "root"; // fallback to root if no tags
        })(graph.nodes);

    // create a tree layout
    treeLayout = d3.tree()
        .size([height - 80, width - 160]); // Adjust the size to leave some padding

    root = treeLayout(hierarchy);

    // create links
    link = svg.selectAll(".link")
        .data(root.links())
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d3.linkHorizontal()
            .x(function(d) { return d.y; })
            .y(function(d) { return d.x; }));

    // create nodes
    node = svg.selectAll(".node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", function(d) { return "node" + (d.children ? " node--internal" : " node--leaf"); })
        .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

    // add circles to nodes
    node.append("circle")
        .attr("r", function(d) { 
            if (d.data.type === "root") return nodeSize * 2;
            return d.data.type === 'site' ? nodeSize : nodeSize * 1.5; 
        })
        .style("fill", function (d) { return d.data.color || color(d.data.type); });

    // add favicon to site nodes
    node.filter(function(d) { return d.data.type === 'site'; })
        .append("image")
        .attr("xlink:href", function(d) { return d.data.favicon; })
        .attr("x", -8)
        .attr("y", -8)
        .attr("width", 16)
        .attr("height", 16);

    // add labels to non-site nodes
    node.filter(function(d) { return d.data.type !== 'site'; })
        .append("text")
        .attr("dy", ".35em")
        .attr("x", function(d) { return d.children ? -13 : 13; })
        .style("text-anchor", function(d) { return d.children ? "end" : "start"; })
        .text(function(d) { return d.data.name; });

    // add titles to nodes
    node.append("title")
        .text(function (d) { return d.data.title || d.data.name; });
});