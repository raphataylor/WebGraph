document.addEventListener('DOMContentLoaded', function() {
    const width = 380;
    const height = 380;

    // graph data
    const graph = {
        nodes: [
            { id: 1, name: "Node 1" },
            { id: 2, name: "Node 2" },
            { id: 3, name: "Node 3" },
            { id: 4, name: "Node 4" },
            { id: 5, name: "Node 5" }
        ],
        links: [
            { source: 0, target: 1 },
            { source: 0, target: 2 },
            { source: 1, target: 3 },
            { source: 2, target: 4 }
        ]
    };

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const svg = d3.select("#graph")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // log dimensions
    console.log("svg size:", width, height);

    const g = svg.append("g");

    // zoom setup
    const zoom = d3.zoom()
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
            // log zoom
            console.log("zoom:", event.transform);
        });
    
    svg.call(zoom);

    // layout setup
    const layout = cola.d3adaptor(d3)
        .size([width, height])
        .nodes(graph.nodes)
        .links(graph.links)
        .jaccardLinkLengths(80)
        .avoidOverlaps(true)
        .handleDisconnected(false);

    // links
    const link = g.selectAll(".link")
        .data(graph.links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke", "#999")
        .style("stroke-width", 2);

    // nodes
    const node = g.selectAll(".node")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("class", "node")
        .attr("r", 15)
        .style("fill", (d, i) => color(i))
        .call(layout.drag);

    node.append("title")
        .text(d => d.name);

    // log node data
    console.log("nodes:", graph.nodes);

    layout.on("tick", function() {
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);

        // log node positions
        console.log("node positions:", graph.nodes.map(n => ({id: n.id, x: n.x, y: n.y})));
    });

    // start layout
    layout.start(30, 0, 50);

    // center graph
    layout.on("end", function() {
        const bounds = g.node().getBBox();
        const scale = 0.8 / Math.max(bounds.width / width, bounds.height / height);
        const tx = -bounds.x * scale + (width - bounds.width * scale) / 2;
        const ty = -bounds.y * scale + (height - bounds.height * scale) / 2;

        g.attr("transform", `translate(${tx},${ty})scale(${scale})`);
        svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));

        // log final transform
        console.log("final transform:", `translate(${tx},${ty})scale(${scale})`);
    });
});