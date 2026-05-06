
// graph-view.jsx v4 — arrows drawn as a top layer, not SVG markers
function GraphView({ selectedId, onSelect, searchQuery, activeCategories }) {
  const containerRef  = React.useRef(null);
  const svgRef        = React.useRef(null);
  const gRef          = React.useRef(null);
  const simRef        = React.useRef(null);
  const linksDataRef  = React.useRef([]);
  const nodesDataRef  = React.useRef([]);
  const ringsRef      = React.useRef(null);
  const linkSelRef    = React.useRef(null);
  const arrowSelRef   = React.useRef(null);
  const modeRef       = React.useRef("free");
  const initialFitRef = React.useRef(false);
  const zoomRef       = React.useRef(null);
  const savedZoomRef  = React.useRef(null);

  // ── helpers ────────────────────────────────────────────────

  // straight line path, endpoint at circle edge
  function linePath(sx, sy, tx, ty, r) {
    const dx = tx - sx, dy = ty - sy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ex = tx - (dx / len) * r;
    const ey = ty - (dy / len) * r;
    return `M${sx},${sy} L${ex},${ey}`;
  }

  // arrowhead polygon points (equilateral triangle, tip at circle edge)
  function arrowPoints(sx, sy, tx, ty, r) {
    const dx = tx - sx, dy = ty - sy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len, uy = dy / len;   // unit towards target
    const px = -uy, py = ux;             // perpendicular

    const SIZE = 10;                     // half-width of arrow base
    const DEPTH = 16;                    // length of arrow

    // tip sits exactly on the circumference
    const tipX = tx - ux * r;
    const tipY = ty - uy * r;
    // base is DEPTH behind the tip
    const bx = tipX - ux * DEPTH;
    const by = tipY - uy * DEPTH;

    const p1x = bx + px * SIZE, p1y = by + py * SIZE;
    const p2x = bx - px * SIZE, p2y = by - py * SIZE;
    return `${tipX},${tipY} ${p1x},${p1y} ${p2x},${p2y}`;
  }

  // ── Initial setup ────────────────────────────────────────────
  React.useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const W = container.clientWidth || 900;
    const H = container.clientHeight || 650;

    const catPos = {
      network:    { x: W*0.24, y: H*0.28 }, security:   { x: W*0.54, y: H*0.18 },
      database:   { x: W*0.78, y: H*0.33 }, algorithm:  { x: W*0.16, y: H*0.65 },
      hardware:   { x: W*0.42, y: H*0.72 }, software:   { x: W*0.64, y: H*0.68 },
      management: { x: W*0.82, y: H*0.60 }, strategy:   { x: W*0.88, y: H*0.38 },
    };

    const nodes = window.TERMS.map(t => {
      const cp = catPos[t.category] || { x: W/2, y: H/2 };
      return { ...t, x: cp.x+(Math.random()-0.5)*120, y: cp.y+(Math.random()-0.5)*80, r: 9 + (t.frequency || 3) * 2.2 };
    });
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
    const linkData = window.LINKS
      .map(l => ({ source: nodeMap[l.source], target: nodeMap[l.target], sourceId: l.source, targetId: l.target }))
      .filter(l => l.source && l.target);

    nodesDataRef.current = nodes;
    linksDataRef.current = linkData;

    const svg = d3.select(container).append("svg")
      .attr("width","100%").attr("height","100%").style("cursor","grab");
    svgRef.current = svg;

    const zoom = d3.zoom().scaleExtent([0.12,4])
      .on("zoom", e => g.attr("transform", e.transform));
    svg.call(zoom).on("dblclick.zoom", null);
    zoomRef.current = zoom;
    const g = svg.append("g");
    gRef.current = g;

    // ── Ring guides ──────────────────────────────────────────
    const rings = g.append("g").attr("class","ring-group").attr("opacity",0);
    ringsRef.current = rings;
    rings.append("circle").attr("class","ring2").attr("r",310)
      .attr("fill","none").attr("stroke","#E2E8F0")
      .attr("stroke-dasharray","6,5").attr("stroke-width",1.5);
    rings.append("text").attr("x",0).attr("y",-317)
      .attr("text-anchor","middle").attr("font-size",11.5).attr("fill","#CBD5E1")
      .attr("font-family","'Noto Sans JP',sans-serif").text("間接関連（第2層）");
    rings.append("circle").attr("class","ring1").attr("r",175)
      .attr("fill","rgba(241,245,249,0.35)").attr("stroke","#B0C4DE")
      .attr("stroke-dasharray","5,4").attr("stroke-width",1.8);
    rings.append("text").attr("x",0).attr("y",-182)
      .attr("text-anchor","middle").attr("font-size",11.5).attr("fill","#7B9BC0")
      .attr("font-family","'Noto Sans JP',sans-serif").text("直接関連（第1層）");

    // ── Layer 1: link lines ───────────────────────────────────
    const linkSel = g.append("g").attr("class","links")
      .selectAll("path").data(linkData).join("path")
      .attr("fill","none")
      .attr("stroke","#CBD5E1")
      .attr("stroke-width",1.4)
      .attr("stroke-opacity",0.45);
    linkSelRef.current = linkSel;

    // ── Layer 2: nodes ────────────────────────────────────────
    const nodeSel = g.append("g").attr("class","nodes")
      .selectAll("g").data(nodes).join("g")
      .attr("class","node-g").style("cursor","pointer")
      .call(d3.drag()
        .on("start",(e,d)=>{ if(!e.active&&modeRef.current==="free") simRef.current.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; svg.style("cursor","grabbing"); })
        .on("drag", (e,d)=>{ d.fx=e.x; d.fy=e.y; })
        .on("end",  (e,d)=>{ if(!e.active&&modeRef.current==="free") simRef.current.alphaTarget(0); if(modeRef.current==="free"){d.fx=null;d.fy=null;} svg.style("cursor","grab"); }))
      .on("click",(e,d)=>{ e.stopPropagation(); onSelect(d.id); });

    nodeSel.append("circle").attr("class","node-circle")
      .attr("r", d => d.r)
      .attr("fill", d => window.CATEGORIES[d.category]?.color || "#94A3B8")
      .attr("fill-opacity",0.85).attr("stroke","#fff").attr("stroke-width",2.5);

    nodeSel.append("text").attr("class","node-label")
      .text(d => d.name).attr("text-anchor","middle")
      .attr("dy", d => d.r + 14)
      .attr("font-size","10.5px").attr("font-family","'Noto Sans JP',sans-serif")
      .attr("fill","#334155").attr("pointer-events","none");

    // ── Layer 3: arrowheads (ABOVE nodes) ────────────────────
    const arrowSel = g.append("g").attr("class","arrows")
      .selectAll("polygon").data(linkData).join("polygon")
      .attr("fill","#94A3B8")
      .attr("fill-opacity",0)   // hidden in free mode
      .attr("pointer-events","none");
    arrowSelRef.current = arrowSel;

    svg.on("click", () => onSelect(null));

    // ── tick helper ───────────────────────────────────────────
    function updatePositions() {
      linkSel.attr("d", d => linePath(d.source.x, d.source.y, d.target.x, d.target.y, d.target.r));
      nodeSel.attr("transform", d => `translate(${d.x},${d.y})`);
    }

    updatePositions();

    // ── Force simulation ──────────────────────────────────────
    const sim = d3.forceSimulation(nodes)
      .alphaDecay(0.05)
      .velocityDecay(0.45)
      .force("link",  d3.forceLink(linkData).distance(105).strength(0.28))
      .force("charge",d3.forceManyBody().strength(-170))
      .force("x",     d3.forceX(W/2).strength(0.07))
      .force("y",     d3.forceY(H/2).strength(0.07))
      .force("collision", d3.forceCollide().radius(d => 22+(d.frequency||3)*2))
      .stop();

    // settle silently before first paint to avoid jank
    for (let i = 0; i < 120; i++) sim.tick();
    updatePositions();

    let tickCount = 0;
    sim.on("tick", () => {
        if (modeRef.current !== "free") return;
        if (++tickCount % 3 !== 0) return;
        updatePositions();
      })
      .on("end", () => {
        if (modeRef.current !== "free") return;
        if (initialFitRef.current) return;
        initialFitRef.current = true;
        const bb = g.node().getBBox();
        if (!bb.width) return;
        const pad=60, sc=Math.min((W-pad*2)/bb.width,(H-pad*2)/bb.height,1.0);
        const tx=W/2-sc*(bb.x+bb.width/2), ty=H/2-sc*(bb.y+bb.height/2);
        svg.transition().duration(900).call(zoom.transform, d3.zoomIdentity.translate(tx,ty).scale(sc));
      })
      .restart();

    simRef.current = sim;
    return () => { sim.stop(); d3.select(container).selectAll("svg").remove(); };
  }, []);

  // ── Selection → radial layout ────────────────────────────────
  React.useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svg  = svgRef.current;
    const nodes = nodesDataRef.current;
    const links = linksDataRef.current;
    const rings = ringsRef.current;

    if (!selectedId) {
      modeRef.current = "free";
      nodes.forEach(n => { n.fx=null; n.fy=null; });
      simRef.current.alpha(0.4).restart();
      rings.transition().duration(300).attr("opacity",0);
      svg.selectAll(".node-g").transition().duration(400).attr("opacity",1);
      svg.selectAll(".node-g .node-circle").transition().duration(400)
        .attr("r", d => d.r).attr("stroke","#fff").attr("stroke-width",2.5);
      svg.selectAll(".node-g .node-label").transition().duration(400)
        .attr("font-weight","normal").attr("font-size","10.5px");
      svg.selectAll(".links path").transition().duration(400)
        .attr("stroke","#CBD5E1").attr("stroke-opacity",0.45).attr("stroke-width",1.4);
      svg.selectAll(".arrows polygon").transition().duration(300)
        .attr("fill-opacity",0);
      if (savedZoomRef.current) {
        svg.transition().duration(400).call(zoomRef.current.transform, savedZoomRef.current);
        savedZoomRef.current = null;
      }
      return;
    }

    savedZoomRef.current = d3.zoomTransform(svg.node());
    modeRef.current = "radial";
    simRef.current.stop();

    const container = containerRef.current;
    const W = container.clientWidth, H = container.clientHeight;
    const cx = W/2, cy = H/2;

    const depth1 = new Set();
    links.forEach(l => {
      if (l.source.id===selectedId) depth1.add(l.target.id);
      if (l.target.id===selectedId) depth1.add(l.source.id);
    });
    const depth2 = new Set();
    links.forEach(l => {
      if (depth1.has(l.source.id)&&l.target.id!==selectedId&&!depth1.has(l.target.id)) depth2.add(l.target.id);
      if (depth1.has(l.target.id)&&l.source.id!==selectedId&&!depth1.has(l.source.id)) depth2.add(l.source.id);
    });

    const d1 = [...depth1].sort((a,b)=>{
      const na=nodes.find(n=>n.id===a), nb=nodes.find(n=>n.id===b);
      return (na?.category||"").localeCompare(nb?.category||"");
    });
    const d2 = [...depth2];

    const R1 = Math.min(185, Math.max(130, d1.length * 20));
    const R2 = R1 + 135;

    const positions = { [selectedId]: { x:cx, y:cy } };
    d1.forEach((id,i) => {
      const angle = (2*Math.PI*i/d1.length) - Math.PI/2;
      positions[id] = { x: cx+R1*Math.cos(angle), y: cy+R1*Math.sin(angle) };
    });
    d2.forEach((id,i) => {
      const angle = (2*Math.PI*i/d2.length) - Math.PI/2 + (Math.PI/Math.max(d2.length,1));
      positions[id] = { x: cx+R2*Math.cos(angle), y: cy+R2*Math.sin(angle) };
    });

    nodes.forEach(n => {
      const p = positions[n.id];
      if (p) { n.fx=p.x; n.fy=p.y; }
    });

    const VISIBLE = new Set([selectedId, ...depth1, ...depth2]);
    const selNode  = nodes.find(n=>n.id===selectedId);
    const selCat   = selNode?.category;
    const selColor = window.CATEGORIES[selCat]?.color || "#64748B";

    // Animate nodes
    svg.selectAll(".node-g")
      .transition().duration(560).ease(d3.easeCubicOut)
      .attr("transform", d => {
        const p = positions[d.id];
        return p ? `translate(${p.x},${p.y})` : `translate(${d.x},${d.y})`;
      })
      .attr("opacity", d => VISIBLE.has(d.id) ? 1 : 0.04);

    svg.selectAll(".node-g .node-circle")
      .transition().duration(560)
      .attr("r", d => {
        if (d.id===selectedId) return d.r+8;
        if (depth1.has(d.id)) return d.r+1;
        return d.r;
      })
      .attr("stroke",      d => d.id===selectedId ? "#1E293B" : "#fff")
      .attr("stroke-width",d => d.id===selectedId ? 3.5 : 2.5);

    svg.selectAll(".node-g .node-label")
      .transition().duration(560)
      .attr("font-weight", d => (d.id===selectedId||depth1.has(d.id)) ? "700" : "normal")
      .attr("font-size",   d => d.id===selectedId ? "12.5px" : "10.5px");

    // Animate link lines
    svg.selectAll(".links path")
      .transition().duration(560)
      .attr("d", d => {
        const sx = (positions[d.source.id]||d.source).x;
        const sy = (positions[d.source.id]||d.source).y;
        const tx = (positions[d.target.id]||d.target).x;
        const ty = (positions[d.target.id]||d.target).y;
        return linePath(sx, sy, tx, ty, d.target.r);
      })
      .attr("stroke", d => {
        const direct = d.source.id===selectedId||d.target.id===selectedId;
        const d2edge = depth1.has(d.source.id)&&depth1.has(d.target.id);
        return direct ? selColor : (d2edge ? "#94A3B8" : "#E2E8F0");
      })
      .attr("stroke-opacity", d => {
        if (d.source.id===selectedId||d.target.id===selectedId) return 0.7;
        if (depth1.has(d.source.id)&&depth1.has(d.target.id)) return 0.3;
        return 0.03;
      })
      .attr("stroke-width", d => {
        if (d.source.id===selectedId||d.target.id===selectedId) return 2.5;
        if (depth1.has(d.source.id)&&depth1.has(d.target.id)) return 1.2;
        return 1;
      })
      .attr("stroke-dasharray", d =>
        (depth1.has(d.source.id)&&depth1.has(d.target.id)) ? "4,3" : null);

    // Animate arrowheads (top layer — always visible above nodes)
    svg.selectAll(".arrows polygon")
      .transition().duration(560)
      .attr("points", d => {
        const sx = (positions[d.source.id]||d.source).x;
        const sy = (positions[d.source.id]||d.source).y;
        const tx = (positions[d.target.id]||d.target).x;
        const ty = (positions[d.target.id]||d.target).y;
        return arrowPoints(sx, sy, tx, ty, d.target.r);
      })
      .attr("fill", d => {
        const direct = d.source.id===selectedId||d.target.id===selectedId;
        return direct ? selColor : "#94A3B8";
      })
      .attr("fill-opacity", d => {
        if (d.source.id===selectedId||d.target.id===selectedId) return 0.9;
        return 0;
      });

    // Rings
    rings.select(".ring1").attr("r", R1);
    rings.select(".ring2").attr("r", R2);
    rings.selectAll("text").each(function() {
      const el = d3.select(this);
      const isR1 = el.text().includes("第1");
      el.attr("y", isR1 ? -(R1+7) : -(R2+7));
    });
    rings.attr("transform",`translate(${cx},${cy})`)
      .transition().duration(450).attr("opacity",1);

    // Zoom to fit radial layout
    const visiblePos = Object.values(positions);
    const xs = visiblePos.map(p => p.x);
    const ys = visiblePos.map(p => p.y);
    const pad = 80;
    const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
    const bw = maxX - minX, bh = maxY - minY;
    const sc = Math.min(W / bw, H / bh, 2.0);
    const ftx = W/2 - sc * (minX + bw/2);
    const fty = H/2 - sc * (minY + bh/2);
    svg.transition().duration(600).ease(d3.easeCubicOut)
      .call(zoomRef.current.transform, d3.zoomIdentity.translate(ftx, fty).scale(sc));

  }, [selectedId]);

  // ── Search highlight ─────────────────────────────────────────
  React.useEffect(() => {
    if (!svgRef.current || modeRef.current==="radial") return;
    const svg = svgRef.current;
    if (!searchQuery) { svg.selectAll(".node-g").attr("opacity",1); return; }
    const q = searchQuery.toLowerCase();
    svg.selectAll(".node-g").attr("opacity", d =>
      (d.name.includes(searchQuery)||d.description?.toLowerCase().includes(q)||d.reading?.includes(q)) ? 1 : 0.1);
  }, [searchQuery]);

  // ── Category filter ──────────────────────────────────────────
  React.useEffect(() => {
    if (!svgRef.current) return;
    svgRef.current.selectAll(".node-g")
      .style("display", d => activeCategories.has(d.category) ? null : "none");
  }, [activeCategories]);

  return <div ref={containerRef} style={{ width:"100%", height:"100%", background:"transparent" }} />;
}
window.GraphView = GraphView;
