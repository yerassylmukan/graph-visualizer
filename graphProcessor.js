const defaultColor = "#97C2FC";
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
});