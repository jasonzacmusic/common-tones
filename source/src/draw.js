"use strict";
/* ============ Common Tones — drawing: keyboards with names on the keys, VexFlow staves, the ladder, the circle ============ */
const C = { bg: "#15131c", panel: "#1d1a27", line: "#2e2a3b", ink: "#FAFAF4", taupe: "#CFC6B4", dim: "#8f8aa0",
  home: "#F4C16A", up: "#FF8A5C", down: "#5ED6C8", far: "#B9B2C9", lh: "#B49CFF", white: "#FAFAF4", black: "#1b1824", out: "#E86A92" };
const NS = "http://www.w3.org/2000/svg";
const FONT = "Outfit, 'NSMAcc', system-ui, sans-serif", MONO = "'IBM Plex Mono', 'NSMAcc', ui-monospace, monospace", DISP = "Fraunces, 'NSMAcc', Georgia, serif";
function el(tag, attrs, parent, text) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; }
function svgRoot(host, w, h, label) { host.innerHTML = ""; const s = el("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": label, preserveAspectRatio: "xMidYMid meet" }, host); s.style.width = "100%"; s.style.height = "auto"; s.style.display = "block"; return s; }
const isBlack = m => [1, 3, 6, 8, 10].includes(mod(m, 12));
/* side colour of a chord relative to the tonic: up = subdominant side, down = dominant side */
const sideCol = s => s === "home" ? C.home : s === "up" ? C.up : s === "down" ? C.down : s === "lh" ? C.lh : s === "out" ? C.out : C.far;
/* marks: [{midi, name, col, ring (outline only), held (gold underline)}] */
function drawKeys(host, marks, o = {}) {
  let lo = o.lo, hi = o.hi; const ms = marks.map(k => k.midi);
  if (lo == null) { lo = Math.min(...ms) - 2; hi = Math.max(...ms) + 2; }
  while (isBlack(lo) || ![0, 5].includes(mod(lo, 12))) lo--; while (isBlack(hi) || ![4, 11].includes(mod(hi, 12))) hi++;
  const WW = o.ww || 30, WH = o.wh || 150, BW = WW * .6, BH = WH * .62; const whites = []; for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites.push(m);
  const W = whites.length * WW + 2, s = svgRoot(host, W, WH + 4, o.label || "Keyboard: " + marks.filter(k => !k.ring).map(k => k.name).join(" "));
  const xOf = {}; whites.forEach((m, i) => xOf[m] = 1 + i * WW);
  const drawKey = (m, x, w, h, black) => {
    const k = marks.find(q => q.midi === m && !q.ring), r = marks.find(q => q.midi === m && q.ring);
    el("rect", { x, y: 1, width: w, height: h, rx: black ? 3 : 5, fill: k ? k.col : black ? C.black : C.white, stroke: black ? "#000" : "#6d6680", "stroke-width": 1 }, s);
    if (r) el("rect", { x: x + 2.5, y: 3.5, width: w - 5, height: h - 5, rx: 4, fill: "none", stroke: r.col, "stroke-width": 3, "stroke-dasharray": "6 4" }, s);
    if (k && k.held) el("rect", { x: x + 4, y: h - 6, width: w - 8, height: 4, rx: 2, fill: C.bg }, s);
    const lab = k || r;
    if (lab && lab.name) { const fs = black ? Math.max(11, WW * .42) : Math.max(12, WW * .5);
      el("text", { x: x + w / 2, y: h - (black ? 10 : 15), "text-anchor": "middle", "font-family": FONT, "font-weight": 700, "font-size": fs, fill: k ? C.bg : (black ? C.ink : C.bg), opacity: k ? 1 : .55 }, s, lab.name); }
    if (!k && !r && m % 12 === 0 && !black && o.cLabels !== false) el("text", { x: x + w / 2, y: h - 8, "text-anchor": "middle", "font-family": MONO, "font-size": 10, fill: "#8a8399" }, s, "C");
  };
  whites.forEach(m => drawKey(m, xOf[m], WW, WH, false));
  for (let m = lo; m <= hi; m++) if (isBlack(m)) drawKey(m, xOf[m - 1] + WW - BW / 2, BW, BH, true);
  return s;
}
/* a move I → X on one keyboard: held notes gold, arriving notes in the side colour, departed notes dashed */
function moveMarks(from, to, side) {
  const toM = to.notes.map(n => n.midi), fromM = from.notes.map(n => n.midi), out = [];
  to.notes.forEach(n => out.push({ midi: n.midi, name: n.name, col: fromM.includes(n.midi) ? C.home : sideCol(side), held: fromM.includes(n.midi) }));
  from.notes.forEach(n => { if (!toM.includes(n.midi)) out.push({ midi: n.midi, name: n.name, col: sideCol(side), ring: true }); });
  return out;
}
/* ---------- VexFlow ---------- */
const VF = () => window.VexFlow;
function vfSvg(host, W, H) { host.innerHTML = ""; const r = new (VF().Renderer)(host, VF().Renderer.Backends.SVG); r.resize(W, H); const svg = host.querySelector("svg"); svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.removeAttribute("width"); svg.removeAttribute("height"); svg.style.width = "100%"; svg.style.height = "auto"; return { ctx: r.getContext(), svg }; }
const WHITE = { strokeStyle: "#ffffff", fillStyle: "#ffffff", lineWidth: 1.4 };
/* a row of whole-note chords on one treble stave: items = [{v (voiced), col, label, sub, heldMidi:[...]}] */
function drawChordRow(host, items, sig, o = {}) {
  const vf = VF(), W = o.width || 1400, H = o.height || 190, { ctx, svg } = vfSvg(host, W, H);
  svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Staff: " + items.map(i => i.label).join(", "));
  ctx.setFillStyle(C.ink); ctx.setStrokeStyle(C.ink);
  const st = new vf.Stave(10, o.top || 52, W - 20); st.addClef("treble").addKeySignature(sig); st.setStyle(WHITE); st.setContext(ctx).draw();
  const notes = items.map(it => { const n = new vf.StaveNote({ keys: it.v.notes.map(t => t.vf), duration: "w", clef: "treble" });
    it.v.notes.forEach((t, k) => { const c = (it.heldMidi || []).includes(t.midi) ? C.home : it.col; n.setKeyStyle(k, { fillStyle: c, strokeStyle: c }); });
    n.setLedgerLineStyle(WHITE); return n; });
  const voice = new vf.Voice({ numBeats: 4 * items.length, beatValue: 4 }).setStrict(false); voice.addTickables(notes);
  vf.Accidental.applyAccidentals([voice], sig);
  notes.forEach(n => n.getModifiers().forEach(m => { if (m.setStyle) m.setStyle({ fillStyle: C.ink, strokeStyle: C.ink }); }));
  new vf.Formatter().joinVoices([voice]).format([voice], W - 20 - (st.getNoteStartX() - 10) - 40); voice.draw(ctx, st);
  notes.forEach((n, i) => { const x = n.getAbsoluteX() + 9, it = items[i];
    el("text", { x, y: 30, "text-anchor": "middle", "font-family": DISP, "font-weight": 700, "font-size": o.fs || 24, fill: it.labCol || it.col, stroke: "none" }, svg, it.label);
    if (it.sub) el("text", { x, y: H - 10, "text-anchor": "middle", "font-family": FONT, "font-weight": 600, "font-size": o.subFs || 15, fill: C.taupe, stroke: "none" }, svg, it.sub); });
  return svg;
}
/* ---------- the circle of fifths with the key's three spokes lit ---------- */
const CIRC_MAJ = ["C", "G", "D", "A", "E", "B", "F♯/G♭", "D♭", "A♭", "E♭", "B♭", "F"], CIRC_MIN = ["Am", "Em", "Bm", "F♯m", "C♯m", "G♯m", "D♯m/E♭m", "B♭m", "Fm", "Cm", "Gm", "Dm"];
function drawCircle(host, key, D3) {
  const s = svgRoot(host, 620, 620, "Circle of fifths with the key's chords lit"), cx = 310, cy = 310, R1 = 280, R2 = 200, R3 = 128;
  const kpc = parse(key).pc, idx = mod(kpc * 7, 12); /* position of the key on the circle */
  const lit = { [mod(idx - 1, 12)]: "up", [idx]: "home", [mod(idx + 1, 12)]: "down" };
  for (let i = 0; i < 12; i++) { const a0 = (i - .5) / 12 * 2 * Math.PI - Math.PI / 2, a1 = (i + .5) / 12 * 2 * Math.PI - Math.PI / 2, L = lit[i];
    const arc = (r0, r1, fill) => { const p = (r, a) => `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
      el("path", { d: `M${p(r0, a0)} A${r0},${r0} 0 0 1 ${p(r0, a1)} L${p(r1, a1)} A${r1},${r1} 0 0 0 ${p(r1, a0)} Z`, fill, stroke: C.bg, "stroke-width": 3 }, s); };
    arc(R1, R2, L ? sideCol(L) : C.panel); arc(R2, R3, L ? sideCol(L) : "#191623");
    if (L) { arc(R2 - 2, R3, "rgba(0,0,0,.28)"); }
    const am = i / 12 * 2 * Math.PI - Math.PI / 2;
    el("text", { x: cx + (R1 + R2) / 2 * Math.cos(am), y: cy + (R1 + R2) / 2 * Math.sin(am) + 9, "text-anchor": "middle", "font-family": DISP, "font-weight": 700, "font-size": CIRC_MAJ[i].length > 3 ? 19 : 27, fill: L ? C.bg : C.taupe }, s, CIRC_MAJ[i]);
    el("text", { x: cx + (R2 + R3) / 2 * Math.cos(am), y: cy + (R2 + R3) / 2 * Math.sin(am) + 7, "text-anchor": "middle", "font-family": FONT, "font-weight": 700, "font-size": CIRC_MIN[i].length > 4 ? 14 : 20, fill: L ? C.bg : C.dim }, s, CIRC_MIN[i]); }
  el("circle", { cx, cy, r: R3 - 6, fill: C.bg }, s);
  el("text", { x: cx, y: cy - 8, "text-anchor": "middle", "font-family": DISP, "font-weight": 700, "font-size": 30, fill: C.home }, s, pretty(key));
  el("text", { x: cx, y: cy + 24, "text-anchor": "middle", "font-family": MONO, "font-size": 15, fill: C.taupe }, s, "three spokes = the key");
  return s;
}
/* ---------- the diatonic circle of fifths: the key's seven chords on their spots of the 12-key circle, walked in fourths.
   The common tone of every step is the root just left; the one tritone (IV → vii°) cuts across the middle.
   Animation is pure CSS baked into the SVG, so it plays with scripts off and loops for B-roll. ---------- */
function drawDiatonicCircle(host, M, o = {}) {
  const W = o.w || 1000, H = o.h || 1000, cx = W / 2, cy = H / 2 + (o.dy || 0), R = o.r || 360, NR = o.nr || 74, T = o.cycle || 12;
  const s = svgRoot(host, W, H, `The diatonic circle of fifths in ${M.I.sym} major: ${[0, 3, 6, 2, 5, 1, 4, 0].map(d => M.ch[d].sym).join(", ")}`);
  const uid = "dc" + Math.random().toString(36).slice(2, 7), ton = M.ch[0].tones[0].pc;
  const ang = pc => (mod(pc * 7 - ton * 7, 12)) * 30 - 90, P = (pc, r) => [cx + r * Math.cos(ang(pc) * Math.PI / 180), cy + r * Math.sin(ang(pc) * Math.PI / 180)];
  const chain = [0, 3, 6, 2, 5, 1, 4, 0], n = chain.length - 1, lit = new Set(M.ch.map(c => c.tones[0].pc));
  const anim = o.animate !== false, seg = (i, a, b) => `${(a + i * b).toFixed(2)}%`;
  let css = "";
  /* the faint 12-key ring: every key's spot, the seven of this key lit */
  el("circle", { cx, cy, r: R, fill: "none", stroke: C.line, "stroke-width": 2 }, s);
  for (let k = 0; k < 12; k++) { const pc = mod(ton + k * 7, 12), [x, y] = P(pc, R); if (lit.has(pc)) continue;
    el("circle", { cx: x, cy: y, r: 9, fill: C.line }, s);
    const [lx, ly] = P(pc, R + 46); el("text", { x: lx, y: ly + 7, "text-anchor": "middle", "font-family": FONT, "font-size": 20, fill: "#5d5870" }, s, ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"][pc]); }
  /* the walk */
  for (let i = 0; i < n; i++) { const a = M.ch[chain[i]], b = M.ch[chain[i + 1]], [x1, y1] = P(a.tones[0].pc, R), [x2, y2] = P(b.tones[0].pc, R);
    const tri = mod(b.tones[0].pc - a.tones[0].pc, 12) === 6, keep = b.tones.filter(t => a.tones.some(x => x.pc === t.pc)).map(t => t.name).join(" ");
    const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, sx = x1 + ux * (NR + 8), sy = y1 + uy * (NR + 8), ex = x2 - ux * (NR + 20), ey = y2 - uy * (NR + 20);
    const col = tri ? C.out : C.home, cls = `${uid}s${i}`;
    el("path", { d: `M${sx},${sy} L${ex},${ey}`, stroke: col, "stroke-width": tri ? 5 : 7, "stroke-linecap": "round", fill: "none", pathLength: 1, class: cls + " seg", "stroke-dasharray": tri ? "0.03 0.025" : "1" }, s);
    const hx = ex, hy = ey, px = -uy, py = ux; el("path", { d: `M${hx + ux * 16},${hy + uy * 16} L${hx - ux * 6 + px * 13},${hy - uy * 6 + py * 13} L${hx - ux * 6 - px * 13},${hy - uy * 6 - py * 13} Z`, fill: col, class: cls + "h" }, s);
    /* the label: which note stays — outside the ring for neighbours, beside the diameter for the tritone */
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, out = tri ? 0 : 1, dx = mx - cx, dy = my - cy, dl = Math.hypot(dx, dy) || 1;
    const lx = tri ? mx + px * 210 : cx + dx / dl * (R - 110), ly = tri ? my + py * 210 : cy + dy / dl * (R - 110);
    const g = el("g", { class: cls + "l" }, s);
    el("text", { x: lx, y: ly - 4, "text-anchor": "middle", "font-family": DISP, "font-weight": 700, "font-size": 34, fill: tri ? C.out : C.home }, g, keep);
    el("text", { x: lx, y: ly + 22, "text-anchor": "middle", "font-family": MONO, "font-size": 15, "letter-spacing": "1.5", fill: C.taupe }, g, tri ? "STAYS · THE ONE TRITONE" : "STAYS");
    if (anim) { const a0 = seg(i, 4, 12), a1 = seg(i, 9, 12);
      css += `.${cls}{stroke-dashoffset:1;animation:${cls} ${T}s linear infinite}@keyframes ${cls}{0%,${a0}{stroke-dashoffset:${tri ? 0 : 1};opacity:${tri ? 0 : 1}}${a1},92%{stroke-dashoffset:0;opacity:1}97%,100%{stroke-dashoffset:0;opacity:0}}`;
      css += `.${cls}h,.${cls}l{opacity:0;animation:${cls}f ${T}s linear infinite}@keyframes ${cls}f{0%,${a1}{opacity:0}${seg(i, 11, 12)},92%{opacity:1}97%,100%{opacity:0}}`; } }
  /* the seven chords */
  chain.slice(0, n).forEach((d, i) => { const c = M.ch[d], [x, y] = P(c.tones[0].pc, R), col = d === 0 ? C.home : sideCol(SIDE_OF(d)), cls = `${uid}n${i}`;
    const g = el("g", { class: cls }, s);
    el("circle", { cx: x, cy: y, r: NR + 12, fill: "none", stroke: col, "stroke-width": 4, opacity: anim ? 0 : .5, class: cls + "f" }, g);
    el("circle", { cx: x, cy: y, r: NR, fill: C.bg, stroke: col, "stroke-width": 5 }, g);
    el("circle", { cx: x, cy: y, r: NR - 9, fill: col }, g);
    el("text", { x, y: y - 26, "text-anchor": "middle", "font-family": MONO, "font-weight": 700, "font-size": 18, fill: C.bg }, g, c.rn);
    el("text", { x, y: y + 16, "text-anchor": "middle", "font-family": DISP, "font-weight": 700, "font-size": c.sym.length > 3 ? 32 : 40, fill: C.bg }, g, c.sym);
    el("text", { x, y: y + 42, "text-anchor": "middle", "font-family": FONT, "font-weight": 700, "font-size": 14, "letter-spacing": "1", fill: C.bg }, g, c.tones.map(t => t.name).join(" "));
    if (anim && i) { const a1 = seg(i - 1, 9, 12); css += `.${cls}f{animation:${cls} ${T}s linear infinite}@keyframes ${cls}{0%,${a1}{opacity:0}${seg(i - 1, 10.5, 12)}{opacity:1}${seg(i - 1, 16, 12)},92%{opacity:.35}97%,100%{opacity:0}}`; } });
  if (o.title !== false) { el("text", { x: 24, y: 40, "font-family": MONO, "font-size": 16, "letter-spacing": "3", fill: C.dim }, s, "THE DIATONIC CIRCLE");
    el("text", { x: 24, y: 78, "font-family": DISP, "font-weight": 700, "font-size": 30, fill: C.ink, opacity: .9 }, s, `${pretty(M.key)} major`); }
  if (css) { const st = el("style", {}, s); st.textContent = css; }
  return s;
}
const SIDE_OF = d => ({ 1: "up", 2: "down", 3: "up", 4: "down", 5: "up", 6: "down" })[d];
