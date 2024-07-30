document.addEventListener('DOMContentLoaded', function() {
    const width = 800;
    const height = 600;

    // generate 200 nodes
    const nodes = Array.from({ length: 200 }, (_, i) => ({ id: i, name: `Node ${i}` }));

    // generate connections
    const links = [];
    for (let i = 0; i < nodes.length; i++) {
        const numConnections = Math.floor(Math.random() * 3) + 1; // 1 to 3 connections per node
        for (let j = 0; j < numConnections; j++) {
            const target = Math.floor(Math.random() * nodes.length);
            if (target !== i) {
                links.push({ source: i, target: target });
            }
        }
    }

    const graph = { nodes, links };

    // log graph data
    console.log("nodes:", nodes.length, "links:", links.length);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const svg = d3.select("#graph")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const g = svg.append("g");

    // zoom setup
    const zoom = d3.zoom()
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });
    
    svg.call(zoom);

    // layout setup
    const layout = cola.d3adaptor(d3)
        .size([width, height])
        .nodes(graph.nodes)
        .links(graph.links)
        .jaccardLinkLengths(40)
        .avoidOverlaps(true)
        .handleDisconnected(false)
        .convergenceThreshold(0.1); // lower for faster convergence

    // links
    const link = g.selectAll(".link")
        .data(graph.links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke", "#999")
        .style("stroke-width", 1);

    // nodes
    const node = g.selectAll(".node")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("class", "node")
        .attr("r", 3)
        .style("fill", (d, i) => color(i % 10))
        .call(layout.drag);

    node.append("title")
        .text(d => d.name);

    let tickCount = 0;
    layout.on("tick", function() {
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);

        // log every 10th tick for performance
        if (tickCount % 10 === 0) {
            console.log("tick:", tickCount);
        }
        tickCount++;
    });

    // start layout
    console.time("layout");
    layout.start(10, 15, 20);

    // center graph
    layout.on("end", function() {
        console.timeEnd("layout");
        const bounds = g.node().getBBox();
        const scale = 0.95 / Math.max(bounds.width / width, bounds.height / height);
        const tx = -bounds.x * scale + (width - bounds.width * scale) / 2;
        const ty = -bounds.y * scale + (height - bounds.height * scale) / 2;

        g.attr("transform", `translate(${tx},${ty})scale(${scale})`);
        svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));

        console.log("layout completed");
    });
});