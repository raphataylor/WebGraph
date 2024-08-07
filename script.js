// global variables
var width = window.innerWidth,
    height = window.innerHeight;

var color = d3.scaleOrdinal(d3.schemeCategory20);

var cola = cola.d3adaptor(d3)
    .size([width, height]);

var svg = d3.select("#graph").append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(d3.zoom().on("zoom", function () {
        svg.attr("transform", d3.event.transform)
    }))
    .append("g");

// resize function
window.onresize = function() {
    width = window.innerWidth;
    height = window.innerHeight;
    svg.attr("width", width).attr("height", height);
    cola.size([width, height]).resume();
};

// load and process data
d3.json("miserables.json", function (error, graph) {
    if (error) throw error;

    // create hierarchical structure
    var groupMap = {};
    var rootNode = {name: "Root", group: 0, isRoot: true};
    graph.nodes.push(rootNode);

    graph.nodes.forEach(function (v, i) {
        var g = v.group;
        if (typeof groupMap[g] == 'undefined') {
            groupMap[g] = {name: "Group " + g, group: g, isGroup: true};
            graph.nodes.push(groupMap[g]);
            graph.links.push({source: rootNode, target: groupMap[g], value: 1});
        }
        graph.links.push({source: groupMap[g], target: v, value: 1});

        v.width = v.height = 10;
    });

    // set up constraints for hierarchy
    var constraints = [];
    graph.nodes.forEach(function(v, i) {
        if (v.isRoot) {
            constraints.push({type: "alignment", axis: "y", offsets: [{node: i, offset: 0}]});
        } else if (v.isGroup) {
            constraints.push({type: "alignment", axis: "y", offsets: [{node: i, offset: 100}]});
        } else {
            constraints.push({type: "alignment", axis: "y", offsets: [{node: i, offset: 200}]});
        }
    });

    // set up cola layout
    cola
        .nodes(graph.nodes)
        .links(graph.links)
        .constraints(constraints)
        .jaccardLinkLengths(40, 0.7)
        .avoidOverlaps(true)
        .start(50, 0, 50);

    // create links
    var link = svg.selectAll(".link")
        .data(graph.links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke-width", function (d) { return Math.sqrt(d.value); });

    // create nodes
    var node = svg.selectAll(".node")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("class", function(d) { return d.isRoot ? "root" : d.isGroup ? "group" : "node"; })
        .attr("r", function(d) { return d.isRoot ? 15 : d.isGroup ? 10 : 5; })
        .style("fill", function (d) { return d.isRoot ? "#fff" : color(d.group); })
        .call(cola.drag);

    // add titles to nodes
    node.append("title")
        .text(function (d) { return d.name; });

    // update positions on tick
    cola.on('tick', function () {
        link.attr("x1", function (d) { return d.source.x; })
            .attr("y1", function (d) { return d.source.y; })
            .attr("x2", function (d) { return d.target.x; })
            .attr("y2", function (d) { return d.target.y; });

        node.attr("cx", function (d) { return d.x; })
            .attr("cy", function (d) { return d.y; });
    });
});