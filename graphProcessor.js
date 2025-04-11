// graphProcessor.js (Refactored + Button Locking with Pause Handling)

let edges, nodes, network;
const container = document.getElementById("mynetwork");
const defaultColor = "#97c2fc";
const visitedColor = "#ffa500";
const finishedColor = "#999999";
const sccColors = ["#ff9999", "#99ff99", "#9999ff", "#ffcc99", "#cc99ff"];

let rawNodes = [], rawEdges = [];
let shouldPause = false;
let shouldStop = false;

window.addEventListener("DOMContentLoaded", () => {
  setupEditors();
});

function setupEditors() {
  const nodeEditor = ace.edit("nodeCountEditor");
  const graphEditor = ace.edit("graphDataEditor");

  [nodeEditor, graphEditor].forEach(editor => {
    editor.setTheme("ace/theme/dawn");
    editor.setShowPrintMargin(false);
    editor.renderer.setShowGutter(true);
  });

  nodeEditor.session.setMode("ace/mode/text");
  nodeEditor.setReadOnly(true);

  graphEditor.session.setMode("ace/mode/text");
  graphEditor.setValue(`0 2\n2 1\n1 0\n0 3\n3 4`, 1);
  graphEditor.session.on("change", () => processGraphData(nodeEditor, graphEditor));

  processGraphData(nodeEditor, graphEditor);
}

function processGraphData(nodeEditor, graphEditor) {
  const lines = graphEditor.getValue().trim().split("\n").filter(Boolean);
  const nodeSet = new Set();
  rawEdges = [];

  lines.forEach((line, index) => {
    const [from, to] = line.trim().split(/\s+/).map(Number);
    if (isNaN(from) || isNaN(to)) {
      console.warn(`Skipping invalid line ${index + 1}: \"${line}\"`);
      return;
    }
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
  rawNodes = Array.from({ length: maxNodeId + 1 }, (_, i) => ({ id: i, label: i.toString(), color: defaultColor }));
  nodeEditor.setValue((maxNodeId + 1).toString(), -1);

  console.clear();
  console.log(rawNodes, rawEdges);
  drawGraph();
}

function drawGraph() {
  shouldStop = true;
  nodes = new vis.DataSet(JSON.parse(JSON.stringify(rawNodes)));
  edges = new vis.DataSet(JSON.parse(JSON.stringify(rawEdges)));

  const options = {
    configure: { enabled: false },
    edges: { color: { inherit: true }, smooth: { enabled: false, type: "dynamic" } },
    interaction: { dragNodes: true, hideEdgesOnDrag: false, hideNodesOnDrag: false },
    physics: { enabled: true, stabilization: { enabled: true, fit: true, iterations: 1000, updateInterval: 50 } },
  };

  network = new vis.Network(container, { nodes, edges }, options);
  return network;
}

async function dfsAnimate(startNodeId) {
  resetGraph();
  shouldStop = false;
  disableControls();

  const visited = new Set();
  const stack = [{ id: startNodeId, phase: "pre" }];

  while (stack.length > 0) {
    const { id: current, phase } = stack.pop();

    if (phase === "pre" && !visited.has(current)) {
      visited.add(current);
      nodes.update({ id: current, color: visitedColor });
      await sleep(1000);

      stack.push({ id: current, phase: "post" });
      const neighbors = edges.get({ filter: e => e.from === current }).map(e => e.to);

      for (let i = neighbors.length - 1; i >= 0; i--) {
        if (!visited.has(neighbors[i])) stack.push({ id: neighbors[i], phase: "pre" });
      }
    } else if (phase === "post") {
      nodes.update({ id: current, color: finishedColor });
      await sleep(500);
    }
  }

  enableControls();
}

async function startKosaraju() {
  resetGraph();
  shouldStop = false;
  disableControls();

  try {
    await sleep(1000);
    const transposed = {};
    rawNodes.forEach(n => transposed[n.id] = []);
    rawEdges.forEach(e => transposed[e.to].push(e.from));

    edges = new vis.DataSet(rawEdges.map(e => ({ from: e.to, to: e.from, arrows: "to" })));
    network.setData({ nodes, edges });
    await sleep(1000);

    const visited = new Set();
    const finishStack = [];

    async function dfs1(id) {
      if (shouldStop || visited.has(id)) return;
      visited.add(id);
      nodes.update({ id, color: visitedColor });
      await sleep(1000);

      for (const neighbor of transposed[id]) {
        if (!visited.has(neighbor)) await dfs1(neighbor);
      }

      nodes.update({ id, color: finishedColor });
      await sleep(1000);
      finishStack.push(id);
    }

    for (const n of rawNodes) if (!visited.has(n.id)) await dfs1(n.id);

    edges = new vis.DataSet(rawEdges);
    network.setData({ nodes, edges });
    await sleep(1000);

    const adj = {};
    rawNodes.forEach(n => adj[n.id] = []);
    rawEdges.forEach(e => adj[e.from].push(e.to));

    const visited2 = new Set();
    let sccId = 0;

    async function dfs2(id) {
      if (shouldStop || visited2.has(id)) return;
      visited2.add(id);
      nodes.update({ id, color: sccColors[sccId % sccColors.length] });
      await sleep(1000);

      for (const neighbor of adj[id]) if (!visited2.has(neighbor)) await dfs2(neighbor);
    }

    while (finishStack.length > 0) {
      const id = finishStack.pop();
      if (!visited2.has(id)) {
        await dfs2(id);
        sccId++;
      }
    }
  } catch (e) {
    if (e.message === "Stopped") console.log("Algorithm was stopped");
    else throw e;
  }

  enableControls();
}

function transposeGraph() {
  const transposedEdges = edges.get().map(e => ({ from: e.to, to: e.from, arrows: "to" }));
  network.setData({ nodes, edges: new vis.DataSet(transposedEdges) });
}

function clearGraph() {
  shouldStop = true;
  network = new vis.Network(container, {}, {});
}

function resetGraph() {
  shouldStop = true;
  nodes = new vis.DataSet(JSON.parse(JSON.stringify(rawNodes)));
  edges = new vis.DataSet(JSON.parse(JSON.stringify(rawEdges)));
  network.setData({ nodes, edges });
}

function togglePause() {
  shouldPause = !shouldPause;
  const btn = document.getElementById("pause");
  btn.innerText = shouldPause ? "Resume" : "Pause";
  btn.style.backgroundColor = shouldPause ? "green" : "red";

  const controlButtons = ["dfs", "transpose", "draw", "kosaraju", "clear", "reset"];
  controlButtons.forEach(id => {
    const button = document.getElementById(id);
    if (button) button.disabled = shouldPause;
  });
}

function waitWhilePaused() {
  return new Promise(resolve => {
    const check = () => (shouldPause ? setTimeout(check, 100) : resolve());
    check();
  });
}

async function sleep(ms) {
  if (shouldStop) throw new Error("Stopped");
  await waitWhilePaused();
  return new Promise((resolve, reject) => {
    setTimeout(() => (shouldStop ? reject(new Error("Stopped")) : resolve()), ms);
  });
}

function disableControls() {
  document.querySelectorAll(".controls button").forEach(btn => btn.disabled = true);
  document.getElementById("pause").disabled = false;
}

function enableControls() {
  document.querySelectorAll(".controls button").forEach(btn => btn.disabled = false);
}
