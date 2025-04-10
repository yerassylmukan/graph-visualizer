var edges;
var nodes;
var network;
var container = document.getElementById('mynetwork');
var options, data;

const defaultColor = "#97c2fc";
const visitedColor = "#ffa500";
const finishedColor = "#999999";
const sccColors = ["#ff9999", "#99ff99", "#9999ff", "#ffcc99", "#cc99ff"];

let shouldPause = false;    
let shouldStop = false;

nodes = new vis.DataSet([{"color": "#97c2fc", "id": 0, "label": "0", "shape": "circle"}, {"color": "#97c2fc", "id": 1, "label": "1", "shape": "circle"}, {"color": "#97c2fc", "id": 2, "label": "2", "shape": "circle"}]);
edges = new vis.DataSet([{"arrows": "to", "from": 0, "to": 1}, {"arrows": "to", "from": 1, "to": 2}, {"arrows": "to", "from": 2, "to": 0}]);

let rawNodes = [
    { id: 0, label: "0", color: defaultColor },
    { id: 1, label: "1", color: defaultColor },
    { id: 2, label: "2", color: defaultColor },
    { id: 3, label: "3", color: defaultColor },
    { id: 4, label: "4", color: defaultColor }
];

let rawEdges = [
    { from: 0, to: 2, arrows: "to" },
    { from: 2, to: 1, arrows: "to" },
    { from: 1, to: 0, arrows: "to" },
    { from: 0, to: 3, arrows: "to" },
    { from: 3, to: 4, arrows: "to" }
];

window.addEventListener("DOMContentLoaded", () => {
    const nodeEditor = ace.edit("nodeCountEditor");
    nodeEditor.setTheme("ace/theme/dawn");
    nodeEditor.session.setMode("ace/mode/text");
    nodeEditor.setShowPrintMargin(false);
    nodeEditor.renderer.setShowGutter(true);
    nodeEditor.setReadOnly(true);
  
    const graphEditor = ace.edit("graphDataEditor");
    graphEditor.setTheme("ace/theme/dawn");
    graphEditor.session.setMode("ace/mode/text");
    graphEditor.setShowPrintMargin(false);
    graphEditor.renderer.setShowGutter(true);
    graphEditor.setValue(
`0 2
2 1
1 0
0 3
3 4`, 1);
  
    function processGraphData() {
      const lines = graphEditor.getValue().trim().split('\n').filter(line => line.trim() !== '');
      const nodeSet = new Set();
  
      rawNodes = [];
      rawEdges = [];
      lines.forEach((line, index) => {
        const parts = line.trim().split(/\s+/).map(Number);
  
        if (parts.length !== 2 || parts.some(isNaN)) {
          console.warn(`Skipping invalid line ${index + 1}: "${line}"`);
          return;
        }
  
        const [from, to] = parts;
        rawEdges.push({ from, to, arrows: "to" });
        nodeSet.add(from);
        nodeSet.add(to);
      });
  
      if (nodeSet.size === 0) {
        nodeEditor.setValue("0", -1);
        console.clear();
        console.log("No valid edges found.");
        return;
      }
  
      const maxNodeId = Math.max(...nodeSet);
      rawNodes = Array.from({ length: maxNodeId + 1 }, (_, i) => ({
        id: i,
        label: i.toString(),
        color: defaultColor
      }));
  
      nodeEditor.setValue((maxNodeId + 1).toString(), -1);
  
      console.clear();
      console.log(rawNodes);
      console.log(rawEdges);
    }
  
    graphEditor.session.on('change', processGraphData);
    processGraphData();

    drawGraph();
});

function drawGraph() {
    
    shouldStop = true;

    //shouldStop = true;
    nodes = new vis.DataSet(JSON.parse(JSON.stringify(rawNodes)));
    edges = new vis.DataSet(JSON.parse(JSON.stringify(rawEdges)));

    // adding nodes and edges to the graph
    data = {nodes: nodes, edges: edges};
    var options = {
        "configure": {
            "enabled": false
        },
        "edges": {
            "color": {
                "inherit": true
            },
            "smooth": {
                "enabled": false,
                "type": "dynamic"
            }
        },
        "interaction": {
            "dragNodes": true,
            "hideEdgesOnDrag": false,
            "hideNodesOnDrag": false
        },
        "physics": {
            "enabled": true,
            "stabilization": {
                "enabled": true,
                "fit": true,
                "iterations": 1000,
                "onlyDynamicEdges": false,
                "updateInterval": 50
            }
        }
    };

    network = new vis.Network(container, data, options);
    return network;
}

async function dfsAnimate(startNodeId) {

    shouldStop = false;

    var nodes = network.body.data.nodes;
    var edges = network.body.data.edges;

    const visited = new Set();
    const stack = [{ id: startNodeId, phase: "pre" }];

    while (stack.length > 0) {
        const top = stack.pop();
        const current = top.id;

        if (top.phase === "pre") {
            if (!visited.has(current)) {
                visited.add(current);

                // Mark as visiting
                nodes.update({ id: current, color: visitedColor });
                await sleep(1000);

                // Push for post-processing
                stack.push({ id: current, phase: "post" });

                // Push neighbors (in reverse order for DFS)
                const neighbors = edges.get({
                    filter: e => e.from === current
                }).map(e => e.to);

                for (let i = neighbors.length - 1; i >= 0; i--) {
                    const neighbor = neighbors[i];
                    if (!visited.has(neighbor)) {
                        stack.push({ id: neighbor, phase: "pre" });
                    }
                }
            }
        } else if (top.phase === "post") {
            // Now the node is finished
            nodes.update({ id: current, color: finishedColor });
            await sleep(500);
        }
    }
}

async function startKosaraju() {
    
    resetGraph(); 
    shouldStop = false;
    
    try {
        //drawGraph(); 
        await sleep(1000);
    
        // --- Step 1: Transpose first
        const transposed = {};
        rawNodes.forEach(n => transposed[n.id] = []);
        rawEdges.forEach(e => transposed[e.to].push(e.from));
    
        // --- Set network to transposed edges
        edges = new vis.DataSet(rawEdges.map(e => ({
            from: e.to,
            to: e.from,
            arrows: "to"
        })));
        network.setData({ nodes, edges });
        await sleep(1000);
    
        // --- Step 2: DFS on transposed graph
        const visited = new Set();
        const finishStack = [];
    
        async function dfs1(nodeId) {
            if(shouldStop) return;
            visited.add(nodeId);
        
            // Mark as visiting (orange)
            nodes.update({ id: nodeId, color: visitedColor });
            await sleep(1000);
        
            for (const neighbor of transposed[nodeId]) {
            if(shouldStop) return;
            if (!visited.has(neighbor)) {
                await dfs1(neighbor);
            }
            }
        
            // Mark as finished (gray)
            nodes.update({ id: nodeId, color: finishedColor });
            await sleep(1000);
        
            finishStack.push(nodeId);
        }
    
        for (const n of rawNodes) {
        if (!visited.has(n.id)) {
            await dfs1(n.id);
        }
        }
    
        // --- Step 3: Switch back to original graph
        edges = new vis.DataSet(rawEdges); // original direction
        network.setData({ nodes, edges });
        await sleep(1000);
    
        // --- Step 4: DFS on original graph by finish order
        const adj = {};
        rawNodes.forEach(n => adj[n.id] = []);
        rawEdges.forEach(e => adj[e.from].push(e.to));
    
        const visited2 = new Set();
        let sccId = 0;
    
        async function dfs2(nodeId) {
            if(shouldStop) return;
            visited2.add(nodeId);
            nodes.update({ id: nodeId, color: sccColors[sccId % sccColors.length] });
            await sleep(1000);
            for (const neighbor of adj[nodeId]) {
            if(shouldStop) return;
            if (!visited2.has(neighbor)) {
                await dfs2(neighbor);
            }
            }
        }
    
        while (finishStack.length > 0) {
        const node = finishStack.pop();
        if (!visited2.has(node)) {
            await dfs2(node);
            sccId++;
        }
        }
    } catch(e) {
        if(e.message === "Stopped"){
            console.log("Algorithms was stopped");
        } else {
            throw e;
        }
    }
}

async function sleep(ms) {
    if (shouldStop) throw new Error("Stopped");
    await waitWhilePaused(); // wait here if paused
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (shouldStop) reject(new Error("Stopped"));
            else resolve();
        }, ms);
    });
}

function togglePause() {
    shouldPause = !shouldPause;
    const btn = document.getElementById("pause");
    btn.innerText = shouldPause ? "Resume" : "Pause";
    btn.style.backgroundColor = shouldPause ? "green" : "red";
}

function waitWhilePaused() {
    return new Promise(resolve => {
        const check = () => {
            if (shouldPause) {
                setTimeout(check, 100); // keep checking every 100ms
            } else {
                resolve(); // resume when unpaused
            }
        };
        check();
    });
}

function transposeGraph() {
    // Transpose the graph by reversing the direction of edges
    var node = network.body.data.nodes;
    var edge = network.body.data.edges;

    const transposedEdges = edge.get().map(edge => ({
        from: edge.to,
        to: edge.from,
        arrows: 'to'
    }));
    
    network.setData({ nodes: node, edges: new vis.DataSet(transposedEdges) });
}

function clearGraph() {
    // Clear the graph by removing all nodes and edges
    shouldStop = true;
    network = new vis.Network(container, {}, options); // Create a new network instance
    // network.setData({ nodes: new vis.DataSet(), edges: new vis.DataSet() });
}

function resetGraph() {
    // Reset the graph to its original state
    shouldStop = true;

    nodes = new vis.DataSet(JSON.parse(JSON.stringify(rawNodes)));
    edges = new vis.DataSet(JSON.parse(JSON.stringify(rawEdges)));

    network.setData({ nodes, edges });
}

