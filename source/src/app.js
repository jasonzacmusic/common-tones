"use strict";
/* ============ Common Tones — the student app: ladder, play-along, "which note moved?" quiz, metronome ============ */
const $ = id => document.getElementById(id);
const S = { key: "G", mode: "major", size: 3, ex: "out", target: "all", shape: 0, hits: 4, hands: "both", bpm: 60, countIn: true, click: true,
  tab: "play", earShape: "root", earSet: "all", earGap: "short" };
try { const p = JSON.parse(localStorage.getItem("commontones.app.v1") || "{}"); Object.keys(S).forEach(k => { if (p[k] !== undefined) S[k] = p[k]; }); } catch (e) {}
if (window.__baking) Object.assign(S, { key: "G", mode: "major", size: 3, ex: "out", target: "all", shape: 0, hits: 4, hands: "both", bpm: 60, tab: "play" });
const save = () => { try { localStorage.setItem("commontones.app.v1", JSON.stringify(S)); } catch (e) {} };
const MODES = { major: "Major", natural: "Minor", harmonic: "Harmonic minor" };
const keyLabel = (k, mode) => mode === "major" ? pretty(k) : scale(k, "natural")[0].name + "m";
const scaleName = () => S.mode === "major" ? pretty(S.key) + " major" : scale(S.key, "natural")[0].name + (S.mode === "harmonic" ? " harmonic minor" : " minor");
const notesOf = v => v.notes.map(n => n.name).join(" ");
const moveText = mv => mv.length ? mv.map(m => `${m.from.name} ${m.st > 0 ? "↑" : "↓"} ${m.to.name}`).join(" · ") : "nothing moves";
const side = mv => !mv.length ? "home" : mv[0].st > 0 ? "up" : "down";
const ORDER = [5, 2, 3, 4, 1, 6];

/* ---------- the model for the current key / scale / chord size ---------- */
let M = null;
function model() {
  const ch = diatonic(S.key, S.mode, S.size), home = homeShapes(ch[0].tones);
  const to = home.map(h => ch.map((c, d) => { if (!d) return { c, v: h, mv: [] }; const v = nearest(h, c.tones); const mv = moves(h, v).filter(x => x.st); return { c, v, mv, n: mv.length, side: side(mv) }; }));
  M = { ch, home, to, sig: S.mode === "major" ? S.key.replace("♯", "#").replace("♭", "b") : vfSig(S.key, "natural") };
  if (S.shape >= S.size) S.shape = 0;
  return M;
}
/* ---------- chips ---------- */
function chips(host, items, cur, on) { host.innerHTML = items.map(([v, l]) => `<button type="button" class="chip${String(v) === String(cur) ? " on" : ""}" data-v="${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join("");
  host.querySelectorAll("button").forEach(b => b.addEventListener("click", () => on(b.dataset.v))); }
function drawChips() {
  chips($("keyChips"), KEYS.map(k => [k, keyLabel(k, S.mode)]), S.key, v => { S.key = v; refresh(); });
  chips($("modeChips"), Object.entries(MODES), S.mode, v => { S.mode = v; refresh(); });
  chips($("sizeChips"), [[3, "Triads"], [4, "Seventh chords"]], S.size, v => { S.size = +v; refresh(); });
  chips($("exChips"), Object.entries(CHAINS).map(([k, c]) => [k, c.label]).concat([["out", "Out and back"]], Object.entries(PAIRS).map(([k, p]) => [k, pairLabel(p)])), S.ex, v => { S.ex = v; refresh(); });
  chips($("targetChips"), [["all", "All six"]].concat(ORDER.map(d => [d, `${M.ch[d].rn} · ${M.ch[d].sym}`])), S.target, v => { S.target = v; refresh(); });
  chips($("shapeChips"), M.home.map((h, i) => [i, `${INVS[i]} · ${notesOf(h)}`]), S.shape, v => { S.shape = +v; refresh(); });
  chips($("hitChips"), [[1, "1 · held"], [2, "2"], [4, "4"]], S.hits, v => { S.hits = +v; refresh(); });
  chips($("handChips"), [["both", "Both hands"], ["rh", "Right only"], ["lh", "Left only"]], S.hands, v => { S.hands = v; refresh(); });
  $("targetRow").hidden = S.ex !== "out";
  $("shapeRow").hidden = !!PAIRS[S.ex];
  $("exNote").textContent = CHAINS[S.ex] ? chainNote() : PAIRS[S.ex] ? pairNote() : `Home, out to a chord, home again. Keep the shared notes down; step the rest.`;
  chips($("earShape"), [["root", "Root position"], ["any", "Any shape"]], S.earShape, v => { S.earShape = v; save(); drawChips(); });
  chips($("earSet"), [["all", "All six"], ["near", "Nearest four"]], S.earSet, v => { S.earSet = v; save(); drawChips(); });
  chips($("earGap"), [["short", "Short"], ["long", "Long"]], S.earGap, v => { S.earGap = v; save(); drawChips(); });
}
/* ---------- the ladder ---------- */
function drawLadder() {
  $("ladderKey").textContent = scaleName() + (S.size === 4 ? " · sevenths" : "");
  const t = M.to[0], ups = ORDER.filter(d => t[d].side === "up").sort((a, b) => t[b].n - t[a].n), downs = ORDER.filter(d => t[d].side === "down").sort((a, b) => t[a].n - t[b].n);
  const rung = d => `<button type="button" class="rung ${t[d].side}" data-d="${d}"><span class="n">${t[d].n}</span><span class="rn">${t[d].c.rn}</span><b>${t[d].c.sym}</b><em>${moveText(t[d].mv)}</em></button>`;
  $("ladder").innerHTML = `<div class="lcol"><p class="lh up">Notes rise</p>${ups.map(rung).join("")}</div>
    <div class="lmid"><button type="button" class="tonic" data-d="0"><span class="rn">${M.ch[0].rn}</span><b>${M.ch[0].sym}</b><small>${notesOf(M.home[0])}</small></button></div>
    <div class="lcol"><p class="lh down">Notes fall</p>${downs.map(rung).join("")}</div>`;
  $("ladder").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { const d = +b.dataset.d; const h = M.home[0]; quick(d ? [h, M.to[0][d].v, h] : [h], 0.95, 0.15); }));
}
/* ---------- the play-along sequence ---------- */
/* four walks through all seven chords: roots down a third, up a third, up a fourth (the circle), up a fifth */
const CHAINS = {
  chain: { label: "Thirds down", o: [0, 5, 3, 1, 6, 4, 2], roots: "roots falling in thirds" },
  up3: { label: "Thirds up", o: [0, 2, 4, 6, 1, 3, 5], roots: "roots rising in thirds" },
  circle: { label: "The circle", o: [0, 3, 6, 2, 5, 1, 4], roots: "roots up a fourth each time, round the circle of fifths" },
  up5: { label: "Fifths up", o: [0, 4, 1, 5, 2, 6, 3], roots: "roots up a fifth each time, the circle backwards" } };
const NUMW = ["No notes", "One note", "Two notes", "Three notes"], FING = ["", "one finger", "two fingers", "three fingers"];
function chainNote() { const c = CHAINS[S.ex], h = M.home[S.shape], v = nearest(h, M.ch[c.o[1]].tones), mv = moves(h, v).filter(m => m.st), kept = S.size - mv.length;
  return `Every chord in the key, ${c.roots}. ${NUMW[kept]} ${kept === 1 ? "stays" : "stay"}; ${FING[mv.length]} step ${mv[0].st > 0 ? "up" : "down"} each time.`; }
/* triad pairs: two chords a step apart share nothing, so together they make a six-note scale */
const PAIRS = { pair2: [0, 1], pair7: [6, 0], pair45: [3, 4] };
const TRI = () => diatonic(S.key, S.mode, 3);
const pairLabel = p => `Pair ${TRI()[p[0]].sym} + ${TRI()[p[1]].sym}`;
function pairNote() { const [a, b] = PAIRS[S.ex], t = TRI();
  return `${t[a].sym} and ${t[b].sym} share nothing, so together they make six notes: ${pairScale(scale(S.key, S.mode), t[a], t[b]).map(x => x.name).join(" ")}. Climb them in turn through every shape; the bass walks up the scale.`; }
function sequence() {
  const h = M.home[S.shape], out = [];
  if (PAIRS[S.ex]) { const [a, b] = PAIRS[S.ex], t = TRI(); let low = h.notes[0].midi; while (low > 58) low -= 12; while (low < 47) low += 12;
    let prev = null; pairClimb(t[a], t[b], low).forEach(x => { out.push({ d: x.c.d, c: x.c, v: x.v, prev: prev || x.v }); prev = x.v; }); }
  else if (CHAINS[S.ex]) { let cur = h; CHAINS[S.ex].o.forEach((d, i) => { const prev = cur; if (i) cur = nearest(cur, M.ch[d].tones); out.push({ d, v: cur, prev }); }); }
  else { const ts = S.target === "all" ? ORDER : [+S.target]; ts.forEach(d => { const r = M.to[S.shape][d]; out.push({ d: 0, v: h, prev: out.length ? out[out.length - 1].v : r.v }); out.push({ d, v: r.v, prev: h }); }); }
  out.forEach((x, i) => { if (i === 0) x.prev = out[out.length - 1].v; x.c = x.c || M.ch[x.d]; x.mv = moves(x.prev, x.v).filter(m => m.st); x.side = x.d === 0 ? "home" : M.to[S.shape][x.d].side; });
  return out;
}
function lhMidi(c) { let m = c.tones[0].pc; while (m < 40) m += 12; while (m > 51) m -= 12; return m; }
let SEQ = [], TL = null, RANGE = null;
function buildTL() {
  SEQ = sequence(); const len = 16 / S.hits, R = [], Lh = [];
  SEQ.forEach((x, b) => { for (let i = 0; i < S.hits; i++) R.push({ bar: b, step: i * len, len, midis: x.v.notes.map(n => n.midi), vel: i ? .5 : .62, k: b });
    Lh.push({ bar: b, step: 0, len: 16, midis: [lhMidi(x.c)], vel: .55, k: b }); });
  const all = SEQ.flatMap(x => x.v.notes.map(n => n.midi)).concat(SEQ.map(x => lhMidi(x.c)));
  RANGE = { lo: Math.min(...all) - 1, hi: Math.max(...all) + 1 };
  TL = { R, L: Lh, len: SEQ.length * 16, bars: SEQ };
}
function liveMarks(x) { const m = moveMarks(x.prev, x.v, x.side).filter(k => !k.ring || (x.mv.length && x.d !== 0));
  if (S.hands !== "rh") m.push({ midi: lhMidi(x.c), name: x.c.tones[0].name, col: C.lh }); if (S.hands === "lh") return m.filter(k => k.col === C.lh); return m; }
function showChord(i) {
  const x = SEQ[i]; drawKeys($("live"), liveMarks(x), { lo: RANGE.lo, hi: RANGE.hi, ww: 28, wh: 150, label: "Keyboard: " + x.c.sym });
  $("now").innerHTML = `<span class="rn ${x.side}">${x.c.rn}</span><b class="${x.side}">${x.c.sym}</b><span class="mv">${i === 0 && S.ex === "out" ? "home" : moveText(x.mv)}</span>`;
  document.querySelectorAll("#bars .bar").forEach((b, j) => b.classList.toggle("on", j === i));
}
function drawSeq() {
  buildTL();
  $("bars").innerHTML = SEQ.map((x, i) => `<button type="button" class="bar ${x.side}" data-i="${i}"><span>${x.c.rn}</span>${x.c.sym}</button>`).join("");
  $("bars").querySelectorAll(".bar").forEach(b => b.addEventListener("click", () => { const i = +b.dataset.i; showChord(i); quick([SEQ[i].v], 1.2, 0); }));
  const host = $("staff"); host.innerHTML = ""; const per = 7;
  for (let s = 0; s < SEQ.length; s += per) { const div = document.createElement("div"); host.appendChild(div);
    const items = SEQ.slice(s, s + per).map(x => ({ v: x.v, col: sideCol(x.side), label: x.c.sym, sub: x.c.rn, heldMidi: x.prev.notes.map(n => n.midi) }));
    try { drawChordRow(div, items, M.sig, { width: 140 + 120 * per, height: 170, top: 42, fs: 18, subFs: 14 }); } catch (e) { div.textContent = "The notation could not draw here."; } }
  showChord(0);
}
/* ---------- quick playback (ladder taps, bar taps, the quiz) ---------- */
let quickId = 0;
async function quick(voices, dur, gap) {
  if (Player.on) stopPlay(); const id = ++quickId; const all = voices.flatMap(v => v.notes.map(n => n.midi));
  $("status").textContent = "loading the piano…"; const got = await Piano.warm(all); if (id !== quickId) return;
  if (!got.some(Boolean)) { $("status").textContent = "The piano sound could not load here. Open this page in Chrome or Safari."; return; }
  let t = Piano.now() + .08; voices.forEach(v => { v.notes.forEach(n => Piano.note(n.midi, t, dur, .62)); t += dur + gap; });
  $("status").textContent = "Press Play. Sound starts on your first tap.";
}
/* ---------- transport ---------- */
const hooks = {
  hit(e) { if (e.step === 0 && e.hand === (S.hands === "lh" ? "L" : "R")) $("status").textContent = "playing · " + S.bpm + " bpm"; if (e.hand === "R" && e.step === 0) showChord(e.k); if (e.hand === "L" && S.hands === "lh") showChord(e.k); },
  tick(j) { if (j % 4 === 0) document.querySelectorAll("#dots i").forEach((d, i) => d.classList.toggle("on", i === (j % 16) / 4)); },
  count(k) { $("status").textContent = "count-in · " + (k + 1); document.querySelectorAll("#dots i").forEach((d, i) => d.classList.toggle("on", i === k)); },
  status(t) { $("status").textContent = t; },
  idle() { $("play").textContent = "Play"; $("play").classList.remove("on"); $("status").textContent = "Stopped."; document.querySelectorAll("#dots i").forEach(d => d.classList.remove("on")); }
};
function play() { if (Metro.on) stopMetro(); quickId++; Player.start(TL, { bpm: S.bpm, countIn: S.countIn, click: S.click, hands: S.hands }, hooks); $("play").textContent = "Stop"; $("play").classList.add("on"); }
function stopPlay() { Player.stop(); }
function stopMetro() { Metro.stop(); $("metro").textContent = "Metronome"; $("metro").classList.remove("on"); }
function setBpm(v) { S.bpm = Math.max(40, Math.min(120, v)); $("bpm").value = S.bpm; $("bpmOut").textContent = S.bpm; Player.retempo(S.bpm); Metro.bpm = S.bpm; save(); }

/* ---------- the quiz: which note moved? ---------- */
const Q = { cur: null, right: 0, done: 0, step: 1, first: true, last: -1 };
function earSetup() {
  chips($("ansN"), [[1, "One"], [2, "Two"], [3, "Three"]], "", v => answer(1, +v));
  chips($("ansD"), [["up", "Up"], ["down", "Down"]], "", v => answer(2, v));
  chips($("ansC"), ORDER.map(d => [d, `${M.ch[d].rn} · ${M.ch[d].sym}`]), "", v => answer(3, +v));
  ["step2", "step3"].forEach(s => $(s).classList.add("wait")); $("step1").classList.remove("wait");
}
function earNew() {
  const pool = S.earSet === "near" ? ORDER.filter(d => M.to[0][d].n <= 2) : ORDER.slice(); let d;
  do { d = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && d === Q.last);
  const inv = S.earShape === "root" ? 0 : Math.floor(Math.random() * S.size); const r = M.to[inv][d];
  Q.cur = { d, inv, h: M.home[inv], v: r.v, n: r.n, side: r.side, mv: r.mv }; Q.last = d; Q.step = 1; Q.first = true;
  earSetup(); $("reveal").innerHTML = ""; $("earQ").textContent = `Home: ${M.ch[0].sym} (${INVN[inv]}). Then the mystery chord.`; drawScore(); earPlay();
}
function earPlay() { if (!Q.cur) return earNew(); quick([Q.cur.h, Q.cur.v], 1.25, S.earGap === "long" ? .9 : .25); }
function answer(step, v) {
  if (!Q.cur) { $("earQ").textContent = "Press New question first."; return; }
  if (step !== Q.step) return;
  const ok = step === 1 ? v === Q.cur.n : step === 2 ? v === Q.cur.side : v === Q.cur.d;
  const host = $(["", "ansN", "ansD", "ansC"][step]), btn = host.querySelector(`[data-v="${v}"]`);
  btn.classList.add(ok ? "right" : "wrong");
  if (!ok) { Q.first = false; return; }
  host.querySelectorAll("button").forEach(b => b.disabled = true);
  if (step < 3) { Q.step++; $("step" + Q.step).classList.remove("wait"); return; }
  Q.done++; if (Q.first) Q.right++; drawScore();
  const x = Q.cur; $("reveal").innerHTML = `<p><b class="${x.side}">${M.ch[x.d].sym}</b> · ${M.ch[x.d].deg} · ${moveText(x.mv)}</p><div class="kb"></div><button type="button" id="earNext" class="play">Next question</button>`;
  drawKeys($("reveal").querySelector(".kb"), moveMarks(x.h, x.v, x.side), { ww: 26, wh: 120 });
  $("earNext").addEventListener("click", earNew);
}
function drawScore() { $("score").innerHTML = `<b>${Q.right}</b> of <b>${Q.done}</b><small>right first time</small>`; }

/* ---------- the key table (every key, the current scale and chord size) ---------- */
function drawKeyTable() {
  const head = ORDER.map(d => { const r = M.to[0][d]; return `<th>${r.c.rn}<small>${r.n} ${r.side === "up" ? "↑" : "↓"}</small></th>`; }).join("");
  const rows = KEYS.map(k => { const ch = diatonic(k, S.mode, S.size); return `<tr><th>${keyLabel(k, S.mode)}</th>${ORDER.map(d => `<td>${ch[d].sym}</td>`).join("")}</tr>`; }).join("");
  $("keyTable").innerHTML = `<table><thead><tr><th>${S.mode === "major" ? "Key" : "Minor key"}</th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}
/* ---------- tabs ---------- */
function setTab(t) { S.tab = t; save(); $("panePlay").hidden = t !== "play"; $("paneEar").hidden = t !== "ear"; $("tabPlay").setAttribute("aria-selected", t === "play"); $("tabEar").setAttribute("aria-selected", t === "ear"); if (t === "ear" && Player.on) stopPlay(); }

function refresh() { if (Player.on) stopPlay(); model(); drawChips(); drawLadder(); drawSeq(); drawKeyTable(); Q.cur = null; earSetup(); $("reveal").innerHTML = ""; save(); }
async function boot() {
  try { if (document.fonts && document.fonts.load) await Promise.race([Promise.all([document.fonts.load("30px Bravura"), document.fonts.load("700 20px Fraunces"), document.fonts.load("16px Outfit")]), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  model(); drawChips(); drawLadder(); drawSeq(); drawKeyTable(); earSetup(); drawScore();
  if (window.__baking) { window.__ready = true; return; }
  setTab(S.tab);
  $("tabPlay").addEventListener("click", () => setTab("play")); $("tabEar").addEventListener("click", () => setTab("ear"));
  $("play").addEventListener("click", () => Player.on ? stopPlay() : play());
  $("metro").addEventListener("click", () => { if (Metro.on) return stopMetro(); if (Player.on) stopPlay(); Metro.start(S.bpm, b => document.querySelectorAll("#dots i").forEach((d, i) => d.classList.toggle("on", i === b))); $("metro").textContent = "Stop metronome"; $("metro").classList.add("on"); });
  $("bpm").addEventListener("input", e => setBpm(+e.target.value)); $("slower").addEventListener("click", () => setBpm(S.bpm - 5)); $("faster").addEventListener("click", () => setBpm(S.bpm + 5));
  $("countIn").addEventListener("change", e => { S.countIn = e.target.checked; save(); }); $("click").addEventListener("change", e => { S.click = e.target.checked; save(); });
  $("earNew").addEventListener("click", earNew); $("earAgain").addEventListener("click", earPlay); $("earHome").addEventListener("click", () => quick([Q.cur ? Q.cur.h : M.home[0]], 1.4, 0));
  setBpm(S.bpm); $("countIn").checked = S.countIn; $("click").checked = S.click;
  document.addEventListener("keydown", e => { if (e.target && /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName)) return; if (e.key === " ") { e.preventDefault(); S.tab === "ear" ? earPlay() : (Player.on ? stopPlay() : play()); } });
  window.__ready = true;
}
boot();
