// global variables
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

// load graph settings
d3.json("graph-settings.json", function(error, settings) {
    if (error) {
        console.error("error loading the graph settings:", error);
        return;
    }

    // use settings in your code
    var nodeSize = settings.nodeSize;
    var linkSize = settings.linkSize;
    var charge = settings.forceSettings.charge;
    var linkDistance = settings.forceSettings.linkDistance;

    // load and process data
    d3.json("bookmarks.json", function(error, data) {
        if (error) {
            console.error("error loading the bookmarks data:", error);
            return;
        }

        // check if data.spaces exists and has at least one element
        if (!data.spaces || data.spaces.length === 0) {
            console.error("no spaces found in the bookmarks data");
            return;
        }

        var space = data.spaces[0]; // assuming we're working with the first space
        var tags = space.tags || [];
        var sites = space.sites || [];

        // create nodes array
        var nodes = tags.concat(sites);

        // create links array
        var links = [];
        sites.forEach(function(site) {
            if (site.tags) {
                site.tags.forEach(function(tagId) {
                    links.push({
                        source: site.id,
                        target: tagId
                    });
                });
            }
        });

        // create a map of node id to node object
        var nodeMap = {};
        nodes.forEach(function(node) {
            nodeMap[node.id] = node;
        });

        // process links to use node objects instead of ids
        links = links.map(function(link) {
            return {
                source: nodeMap[link.source] || link.source,
                target: nodeMap[link.target] || link.target
            };
        });

        // create groups (one for each tag)
        var groups = tags.map(function(tag) {
            return {
                id: tag.id,
                nodes: [tag].concat(sites.filter(function(site) {
                    return site.tags && site.tags.includes(tag.id);
                }))
            };
        });

        // create force simulation
        var simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(function(d) { return d.id; }).distance(linkDistance))
            .force("charge", d3.forceManyBody().strength(charge))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(nodeSize * 3))
            .on("tick", ticked);

        // create group backgrounds
        var group = container.selectAll('.group')
            .data(groups)
            .enter().append('path')
            .attr('class', 'group')
            .style("fill", function (d, i) { return color(i); })
            .style("stroke", function (d, i) { return d3.rgb(color(i)).darker(); })
            .style("opacity", 0.3);

        // create links
        var link = container.selectAll(".link")
            .data(links)
            .enter().append("line")
            .attr("class", "link")
            .attr("stroke-width", linkSize);

        // create nodes
        var node = container.selectAll(".node")
            .data(nodes)
            .enter().append("g")
            .attr("class", function(d) { return "node " + (d.tags ? "site" : "tag"); })
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        // add circles to nodes
        node.append("circle")
            .attr("r", function(d) { return d.tags ? nodeSize : nodeSize * 2; });

        // add labels to nodes
        node.append("text")
            .attr("dy", ".35em")
            .attr("x", function(d) { return d.tags ? nodeSize * 1.5 : nodeSize * 2.5; })
            .text(function(d) { return d.name || d.title; });

        // add favicon to site nodes
        node.filter(function(d) { return d.tags && d.favicon; })
            .append("image")
            .attr("xlink:href", function(d) { return d.favicon; })
            .attr("x", -nodeSize * 0.8)
            .attr("y", -nodeSize * 0.8)
            .attr("width", nodeSize * 1.6)
            .attr("height", nodeSize * 1.6);

        // add tooltip
        node.append("title")
            .text(function(d) {
                if (d.tags) {
                    return d.title + "\nURL: " + d.url + "\nVisits: " + d.visits + "\nCreated: " + d.dateCreated + "\nNotes: " + d.notes;
                } else {
                    return d.name + "\nSites: " + d.childCount;
                }
            });

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
});