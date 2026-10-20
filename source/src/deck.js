"use strict";
/* ============ Common Tones — teacher deck: stages on a 1600×900 canvas, scaled to the window. Arrows/space/numbers move it, [ ] change key, A shows answers ============ */
const $ = id => document.getElementById(id);
const D = { key: "G", cur: 0, ans: false, inv: 0 };
try { const p = JSON.parse(localStorage.getItem("commontones.deck.v1") || "{}"); ["key", "cur", "inv"].forEach(k => { if (p[k] !== undefined) D[k] = p[k]; }); } catch (e) {}
if (window.__baking) Object.assign(D, { key: "G", cur: 0, ans: true, inv: 0 });
const saveD = () => { try { localStorage.setItem("commontones.deck.v1", JSON.stringify({ key: D.key, cur: D.cur, inv: D.inv })); } catch (e) {} };
const prompts = list => `<ul class="prompts">${list.map(t => `<li>${t}</li>`).join("")}</ul>`;
const say = t => `<p class="say"><span>say it like this</span>${t}</p>`;
const dsharpNote = names => { const d = names.filter(n => n.includes("𝄪")); return d.length ? ` <small class="ds">(${[...new Set(d)].map(n => n + " is the " + pretty(LET[(LET.indexOf(n[0]) + 1) % 7]) + " key").join(", ")})</small>` : ""; };
/* the key's model: chords, sides, home shapes, moves from each shape */
const SIDE = { 1: "up", 2: "down", 3: "up", 4: "down", 5: "up", 6: "down" };
const NMOVE = { 1: 3, 2: 1, 3: 2, 4: 2, 5: 1, 6: 3 };
function model(key) {
  const ch = diatonic(key, "major", 3), home = homeShapes(ch[0].tones), I = ch[0];
  const sh = home.map(h => ch.map((c, d) => { if (!d) return null; const v = nearest(h, c.tones); return { c, v, mv: moves(h, v).filter(m => m.st) }; }));
  return { key, ch, I, home, sh, sig: key.replace("♯", "#").replace("♭", "b") };
}
const nm = c => c.sym, rnS = c => c.rn;
const notesOf = v => v.notes.map(n => n.name).join(" ");
const shared = (c, I) => c.tones.filter(t => I.tones.some(x => x.pc === t.pc));
function chordChip(c, M, extra = "") { const sh = shared(c, M.I).map(t => t.pc);
  return `<span class="chip ${SIDE[c.d] || "home"}">${c.tones.map(t => `<b class="${sh.includes(t.pc) ? "sh" : ""}">${t.name}</b>`).join("")}</span>${extra}`; }
const moveText = mv => mv.map(m => `${m.from.name} ${m.st > 0 ? "↑" : "↓"} ${m.to.name}`).join(" · ");
function moveKb(host, M, inv, d, o = {}) { const r = M.sh[inv][d]; return drawKeys(host, moveMarks(M.home[inv], r.v, SIDE[d]), Object.assign({ ww: 24, wh: 118 }, o)); }
function pairCard(M, d, inv = 0) { const r = M.sh[inv][d], c = r.c;
  return `<div class="pc ${SIDE[d]}"><h3><span class="rn">${c.rn}</span> ${c.sym} <small>${c.deg}</small></h3><div class="kb"></div>
    <p class="mvline">${r.mv.map(m => `<b>${m.from.name}</b> steps ${m.st > 0 ? "up" : "down"} a ${stepWord(m.st)} to <b>${m.to.name}</b>`).join("<br>")}</p>
    <p class="keep">${shared(c, M.I).length ? `stays: ${shared(c, M.I).map(t => t.name).join(" ")}` : "nothing stays"}</p></div>`; }

const HISTORY = [
  ["Before it was a chord,", "the dominant was the note monks chanted the psalms on — usually a fifth above the final. Latin <i>dominari</i>: to rule."],
  ["1722 · 1726 · Rameau.", "The <i>Traité</i>, then the subdominant: the dominant mirrored, a fifth below home instead of above."],
  ["1893 · Riemann", "coins \"function\": just three — tonic, subdominant, dominant. Every other chord leans on one of them."],
  ["The German trap:", "ask a German musician for G major's \"Parallele\" and you get E minor — what we call the relative."],
  ["\"The law of the shortest way\"", "— Bruckner's name for it, as Schoenberg tells it: hold what's shared, move the rest the least distance."]
];
const chainSyms = (M, c) => c.map(d => M.ch[d].sym).join(" → "), chainRoots = (M, c) => c.map(d => M.ch[d].tones[0].name).join(" ");
/* one walk through every chord in the key, nearest shape each time, from the root-position home chord */
function chainStage(k, t, chain, say) { return { k, t, chain: true, b(m, M) {
  const inv = D.inv || 0, h = M.home[inv]; let cur = h; const items = chain.map((d, i) => { const prev = cur; if (i) cur = nearest(cur, M.ch[d].tones);
    return { v: cur, col: d === 0 ? C.home : sideCol(SIDE[d]), label: M.ch[d].sym, sub: i ? moveText(moves(prev, cur).filter(x => x.st)) : "start", heldMidi: i ? prev.notes.map(n => n.midi).filter(x => cur.notes.some(n => n.midi === x)) : [] }; });
  const pick = `<div class="invpick"><span>start from</span>${M.home.map((x, i) => `<button type="button" data-inv="${i}" class="${i === inv ? "on" : ""}">${INVS[i]} · ${notesOf(x)}</button>`).join("")}<em>I</em></div>`;
  m.innerHTML = `<div class="stf wide"></div><div class="hero2"><div class="kbBig"></div><div class="side">${pick}${prompts(say(M))}</div></div>`;
  m.querySelectorAll(".invpick button").forEach(b => b.addEventListener("click", () => { D.inv = +b.dataset.inv; show(); }));
  drawChordRow(m.querySelector(".stf"), items, M.sig, { width: 900, height: 200, top: 46, fs: 19, subFs: 14 });
  drawKeys(m.querySelector(".kbBig"), h.notes.map(n => ({ midi: n.midi, name: n.name, col: C.home })).concat([{ midi: h.notes[0].midi - 12 - (mod(h.notes[0].midi - M.I.tones[0].pc, 12)), name: M.I.tones[0].name, col: C.lh }]), { ww: 34, wh: 190 }); } }; }
const STAGES = [
  chainStage("Play it first", M => `${M.I.sym}, one finger at a time`, [0, 5, 3, 1, 6, 4, 2, 0], M => [`Play the chain before you say a word: ${chainSyms(M, [0, 5, 3, 1, 6, 4, 2, 0])}.`, "Each chord, only one finger moves, always up a step — from any of the three shapes.", `Left hand: the roots, falling in thirds — ${chainRoots(M, [0, 5, 3, 1, 6, 4, 2, 0])}.`, "Play it twice. Then ask: how did every chord in the key fit under one hand?"]),
  chainStage("Other ways round", M => "Thirds up: the same chords, backwards", [0, 2, 4, 6, 1, 3, 5, 0], M => [`Same seven chords, the other way: ${chainSyms(M, [0, 2, 4, 6, 1, 3, 5, 0])}.`, "Two notes still stay. Now the one finger steps down.", `Left hand: the roots, rising in thirds — ${chainRoots(M, [0, 2, 4, 6, 1, 3, 5, 0])}.`, "Ask: which way did the notes go this time?"]),
  chainStage("Other ways round", M => "Round the circle: one note stays", [0, 3, 6, 2, 5, 1, 4, 0], M => [`Every chord in the key, round the circle: ${chainSyms(M, [0, 3, 6, 2, 5, 1, 4, 0])}.`, "One note stays. Two fingers step up.", `Left hand: up a fourth each time — ${chainRoots(M, [0, 3, 6, 2, 5, 1, 4, 0])}. ${M.ch[3].tones[0].name} to ${M.ch[6].tones[0].name} is the one augmented fourth.`, "The bass leaps round the circle of fifths; the right hand barely moves."]),
  { k: "Other ways round", t: M => "The diatonic circle", b(m, M) {
      const tri = `${M.ch[3].sym} → ${M.ch[6].sym}`;
      m.innerHTML = `<div class="dcirc"><div class="dc"></div><div class="side">${prompts([`The seven chords of ${M.I.sym} sit on seven neighbouring spots of the circle of fifths.`, "Walk it in fourths: each chord keeps the root you just left. That gold note is the one that stays.", `Six steps go round the edge. One, ${tri}, cuts straight across: the key's only tritone, the diminished chord's doorway.`, "Play the circle chain under this. Then from 1st inversion, then 2nd."])}</div></div>`;
      drawDiatonicCircle(m.querySelector(".dc"), M, { w: 1000, h: 1000, r: 360, nr: 74 }); } },
  chainStage("Other ways round", M => "Fifths up: one note stays, two fall", [0, 4, 1, 5, 2, 6, 3, 0], M => [`The circle backwards: ${chainSyms(M, [0, 4, 1, 5, 2, 6, 3, 0])}.`, "One note stays. Two fingers step down.", `Left hand: up a fifth each time — ${chainRoots(M, [0, 4, 1, 5, 2, 6, 3, 0])}. ${M.ch[6].tones[0].name} to ${M.ch[3].tones[0].name} is the one diminished fifth.`, "Four walks, every chord each time: thirds keep two notes, fourths and fifths keep one."]),
  { k: "Shared notes", t: M => `How many notes does each chord share with ${M.I.sym}?`, b(m, M) {
      const grp = [[2, [5, 2], "two shared · one note moves"], [1, [3, 4], "one shared · two notes move"], [0, [1, 6], "none shared · all three move"]];
      m.innerHTML = `<div class="home1">${chordChip(M.I, M, `<span class="lab">${M.I.rn} · tonic</span>`)}</div><div class="groups">${grp.map(([n, ds, cap]) => `<div class="grp g${n}"><p class="gcount"><b>${n}</b> ${cap}</p>${ds.map(d => `<div class="row"><span class="rn ${SIDE[d]}">${M.ch[d].rn}</span><span class="sym">${M.ch[d].sym}</span>${chordChip(M.ch[d], M)}</div>`).join("")}</div>`).join("")}</div>
        ${prompts(["Ask them to count before you show the gold notes.", `The relative minor, ${M.ch[5].sym}, is the submediant — the vi chord.`, "Recap of the triads-and-inversions lesson. New today: which WAY the notes go."])}`; } },
  { k: "Six neighbours", t: M => `Out from ${M.I.sym}: one, two or three notes move`, b(m, M) {
      const card = d => { const r = M.sh[0][d], c = r.c, keep = shared(c, M.I);
        return `<div class="nb ${SIDE[d]}"><div class="kb"></div><div class="tx"><h4><span class="rn">${c.rn}</span> ${c.sym} <small>${c.deg}</small></h4>
          <p class="mvline">${r.mv.map(x => `<b>${x.from.name}</b> ${x.st > 0 ? "↑" : "↓"} <b>${x.to.name}</b> <i>${stepWord(x.st)}</i>`).join(" · ")}</p>
          <p class="keep">${keep.length ? `stays: ${keep.map(t => t.name).join(" ")}` : "nothing stays"}</p></div></div>`; };
      const rows = [[1, 5, 2, "two notes stay"], [2, 3, 4, "one note stays"], [3, 1, 6, "nothing stays"]];
      m.innerHTML = `<div class="six"><span></span><p class="sixh up">notes go UP</p><p class="sixh down">notes go DOWN</p>
        ${rows.map(([n, u, d, cap]) => `<div class="sixn"><b>${n}</b><span>${n === 1 ? "note moves" : "notes move"}</span><small>${cap}</small></div>${card(u)}${card(d)}`).join("")}</div>`;
      const all = [5, 2, 3, 4, 1, 6].flatMap(d => M.sh[0][d].v.notes.map(n => n.midi)).concat(M.home[0].notes.map(n => n.midi)), lo = Math.min(...all) - 1, hi = Math.max(...all) + 1;
      m.querySelectorAll(".six .kb").forEach((h, i) => moveKb(h, M, 0, [5, 2, 3, 4, 1, 6][i], { lo, hi, ww: 18, wh: 78 })); } },
  { k: "Nothing shared", t: M => "The triad pair: two chords, one six-note scale", b(m, M) {
      const sc = scale(M.key, "major"), pairs = [[0, 1], [6, 0], [3, 4]];
      const climb = pairClimb(M.ch[0], M.ch[1], M.home[0].notes[0].midi - 12 < 55 ? M.home[0].notes[0].midi : M.home[0].notes[0].midi - 12);
      m.innerHTML = `<div class="tp3">${pairs.map(([a, b]) => `<div class="tp"><h4><span class="ca">${M.ch[a].sym}</span> + <span class="cb">${M.ch[b].sym}</span> <small>${M.ch[a].rn} + ${M.ch[b].rn}</small></h4><div class="kb"></div><p class="hx">${pairScale(sc, M.ch[a], M.ch[b]).map(t => t.name).join(" ")}</p></div>`).join("")}</div>
        <div class="stf wide tpst"></div>${prompts([`Chords a step apart share nothing, so together they fill six notes of the scale. ${M.ch[3].sym} + ${M.ch[4].sym} (IV + V) is the gospel favourite.`, `Climb the pair: ${climb.map(x => x.c.sym).join(" → ")}. Every shape in turn; the bass walks up ${climb.map(x => x.v.notes[0].name).join(" ")}.`])}`;
      m.querySelectorAll(".tp .kb").forEach((h, i) => { const [a, b] = pairs[i], va = voice(M.ch[a].tones, 0, 60), vb = voice(M.ch[b].tones, 0, va.notes[0].midi + (b === 0 ? -2 : 1));
        drawKeys(h, va.notes.map(n => ({ midi: n.midi, name: n.name, col: a === 0 ? C.home : sideCol(SIDE[a]) })).concat(vb.notes.map(n => ({ midi: n.midi, name: n.name, col: b === 0 ? C.home : sideCol(SIDE[b]) }))), { ww: 24, wh: 110 }); });
      drawChordRow(m.querySelector(".tpst"), climb.map(x => ({ v: x.v, col: x.c.d === 0 ? C.home : sideCol(SIDE[x.c.d]), label: x.c.sym, sub: x.v.notes[0].name })), M.sig, { width: 1500, height: 190, top: 46, fs: 19, subFs: 15 }); } },
  { k: "The ladder", t: M => `Lift the notes, or let them sink`, b(m, M) {
      const rung = (d, n) => `<div class="rung ${SIDE[d]}"><span class="n">${n}</span><span class="rn">${M.ch[d].rn}</span><b>${M.ch[d].sym}</b><small>${M.ch[d].deg}</small><em>${moveText(M.sh[0][d].mv)}</em></div>`;
      m.innerHTML = `<div class="ladder2"><div class="lcol"><p class="lhead up">notes go UP · subdominant side</p>${rung(1, 3)}${rung(3, 2)}${rung(5, 1)}</div>
        <div class="lmid"><div class="tonic"><span class="rn">${M.I.rn}</span><b>${M.I.sym}</b><small>${notesOf(M.home[0])}</small></div><p class="lcap">notes moved</p></div>
        <div class="lcol"><p class="lhead down">notes go DOWN · dominant side</p>${rung(2, 1)}${rung(4, 2)}${rung(6, 3)}</div></div>
        ${prompts(["Up side: vi, IV, ii — the chords that lean away from home.", "Down side: iii, V, vii° — the chords that pull back to it. The leading tone comes in on the way down.", "Same map in every key. Press [ or ] to prove it."])}`; } },
  ...[0, 1, 2].map(inv => ({ k: `From ${INVS[inv]}`, t: M => `${M.I.sym} ${INVN[inv]}: ${notesOf(M.home[inv])}`, b(m, M) {
      m.innerHTML = `<div class="grid6">${[5, 2, 3, 4, 1, 6].map(d => { const r = M.sh[inv][d]; return `<div class="g ${SIDE[d]}"><h4><span class="rn">${r.c.rn}</span> ${r.c.sym} <small>${INVS[r.v.inv]} · ${notesOf(r.v)}</small></h4><div class="kb"></div><p>${moveText(r.mv)}</p></div>`; }).join("")}</div>
        ${prompts([`Home shape: ${M.I.sym} ${INVN[inv]}. Go out to each chord and come straight back.`, "Move only the fingers that must move; hold the gold notes. Left hand: just the roots."])}`;
      const all = M.sh[inv].filter(Boolean).flatMap(r => r.v.notes.map(n => n.midi)).concat(M.home[inv].notes.map(n => n.midi)), lo = Math.min(...all) - 1, hi = Math.max(...all) + 1;
      m.querySelectorAll(".grid6 .kb").forEach((h, i) => moveKb(h, M, inv, [5, 2, 3, 4, 1, 6][i], { lo, hi, ww: 22, wh: 80 })); } })),
  { k: "On the page", t: M => `Out and back, from root position`, b(m, M) {
      const it = d => { const r = M.sh[0][d]; return { v: r.v, col: sideCol(SIDE[d]), label: r.c.sym, sub: r.c.rn, heldMidi: M.home[0].notes.map(n => n.midi) }; };
      const I = { v: M.home[0], col: C.home, label: M.I.sym, sub: M.I.rn };
      m.innerHTML = `<div class="stf"></div><div class="stf"></div>${prompts(["Gold noteheads stay put. Coloured ones are the movers.", "Read it as a drill: tonic, out, tonic, out — then from the other two shapes."])}`;
      const s = m.querySelectorAll(".stf");
      drawChordRow(s[0], [I, it(5), I, it(2), I, it(3), I], M.sig, { width: 980, height: 180, top: 44, fs: 19, subFs: 14 });
      drawChordRow(s[1], [I, it(4), I, it(1), I, it(6), I], M.sig, { width: 980, height: 180, top: 44, fs: 19, subFs: 14 }); } },
  { k: "Ear training", t: M => `Which note moved?`, b(m, M) {
      const Q = [[0, 5], [1, 2], [2, 3], [0, 4], [2, 5], [1, 6], [0, 2], [1, 1]];
      const pos = ["bottom", "middle", "top"];
      m.innerHTML = `<div class="quiz">${Q.map(([inv, d], i) => { const r = M.sh[inv][d], who = r.mv.map(x => pos[M.home[inv].notes.indexOf(x.from)]);
          return `<div class="q"><p class="qn">${i + 1}</p><p class="qq">${M.I.sym} ${INVS[inv]} → ?</p><p class="qa ${D.ans ? "on" : ""} ${SIDE[d]}">${r.c.sym} <small>${r.mv.length === 1 ? `${who[0]} note, ${dirWord(r.mv[0].st)} a ${stepWord(r.mv[0].st)}` : `${r.mv.length} notes ${dirWord(r.mv[0].st)}`}</small></p></div>`; }).join("")}</div>
        <div class="cues"><p><b>Count the movers.</b> One, two or three?</p><p><b>Which way?</b> Up = ${M.ch[5].sym} ${M.ch[3].sym} ${M.ch[1].sym}. Down = ${M.ch[2].sym} ${M.ch[4].sym} ${M.ch[6].sym}.</p><p><b>Half or whole step?</b> The half step down is the ${M.ch[2].sym}.</p><p class="ak">A = show / hide answers</p></div>`; } },
  { k: "Families", t: M => `Why some chords can stand in for others`, b(m, M) {
      const fam = [["home", "Close to home", [0, 5, 2], "same colour · less final"], ["up", "Subdominant side", [3, 1], "leans away"], ["down", "Dominant side", [4, 6], "pulls back home"]];
      const pair = (a, b) => M.ch[a].tones.filter(t => M.ch[b].tones.some(x => x.pc === t.pc)).map(t => t.name).join(" ");
      m.innerHTML = `<div class="fams">${fam.map(([s, h, ds, cap]) => `<div class="fam ${s}"><h3>${h}</h3><p class="cap">${cap}</p>${ds.map(d => `<p class="fr"><span class="rn">${M.ch[d].rn}</span>${M.ch[d].sym}<small>${notesOf({ notes: M.ch[d].tones })}</small></p>`).join("")}</div>`).join("")}</div>
        <div class="proof"><p><b>The proof:</b> play ${M.ch[4].sym} → ${M.ch[5].sym} where the ear expects ${M.ch[4].sym} → ${M.I.sym}. Two of ${M.I.sym}'s notes are still there, so it still lands — but it isn't final. That's the deceptive move.</p>
        <p><b>Links:</b> ${M.ch[1].sym} and ${M.ch[3].sym} share ${pair(1, 3)}. ${M.ch[6].sym} and ${M.ch[4].sym} share ${pair(6, 4)}. ${M.ch[2].sym} sits on the fence: two notes with ${M.I.sym} (${pair(2, 0)}), two with ${M.ch[4].sym} (${pair(2, 4)}).</p></div>`; } },
  { k: "Why the names", t: M => `Tonic, dominant — and the chords in between`, b(m, M) {
      const sc = scale(M.key, "major"), at = d => sc[mod(d, 7)].name;
      m.innerHTML = `<div class="mirror"><div class="mrow">
          <div class="mc up"><b>${at(3)}</b><small>subdominant</small><i>a fifth BELOW the tonic</i></div>
          <div class="mc up"><b>${at(5)}</b><small>submediant</small><i>halfway down to it</i></div>
          <div class="mc home"><b>${at(0)}</b><small>tonic</small><i>home</i></div>
          <div class="mc down"><b>${at(2)}</b><small>mediant</small><i>halfway up to the dominant</i></div>
          <div class="mc down"><b>${at(4)}</b><small>dominant</small><i>a fifth ABOVE the tonic</i></div></div>
        <p class="mcap">Fifths outside, thirds inside. The <em>sub</em>-names are the mirror image below.</p></div>
        <div class="hist">${HISTORY.map(h => `<p><b>${h[0]}</b> ${h[1]}</p>`).join("")}</div>`; } },
  { k: "Minor", t: M => `The same map in ${scale(M.key, "natural")[0].name} minor`, b(m, M) {
      const mi = scale(M.key, "natural")[0].name, nat = diatonic(M.key, "natural", 3), har = diatonic(M.key, "harmonic", 3), I = nat[0];
      const hs = homeShapes(I.tones)[0], row = (cs, d) => { const v = nearest(hs, cs[d].tones), mv = moves(hs, v).filter(x => x.st); return `<div class="mr ${SIDE[d]}"><span class="rn">${cs[d].rn}</span><b>${cs[d].sym}</b><em>${moveText(mv)}</em></div>`; };
      const raised = har[4].tones.map(t => t.name).concat(har[6].tones.map(t => t.name));
      m.innerHTML = `<div class="minor"><div class="mcol"><h3>${mi} minor · natural</h3><p class="same">Same notes as ${M.I.sym} major, same ladder.</p>${[5, 3, 1].map(d => row(nat, d)).join("")}<div class="mi home"><span class="rn">i</span><b>${I.sym}</b><em>${notesOf(hs)}</em></div>${[2, 4, 6].map(d => row(nat, d)).join("")}</div>
        <div class="mcol"><h3>${mi} minor · harmonic</h3><p class="same">Raise the 7th: ${scale(M.key, "natural")[6].name} → ${scale(M.key, "harmonic")[6].name}.${dsharpNote(raised)}</p>${[2, 4, 6].map(d => row(har, d)).join("")}<p class="pull">The down side gets a half step: the pull home is stronger, and v becomes ${har[4].sym} — a major V.</p></div></div>
        ${prompts([`Relative minor (${mi} minor) = same notes, different home.`, "Up side: VI, iv, ii°. Down side: III, v, VII. Same 1–2–3.", "Harmonic minor sharpens the 7th — that's where V7 comes from in minor."])}`; } },
  { k: "Seventh chords", t: M => `Add the 7th: nothing is a stranger any more`, b(m, M) {
      const s7 = diatonic(M.key, "major", 4), I7 = s7[0], hs = { notes: [] }; const hv = homeShapes(I7.tones)[0];
      const rows = [5, 2, 3, 4, 1, 6].map(d => { const v = nearest(hv, s7[d].tones), mv = moves(hv, v).filter(x => x.st), sh = s7[d].tones.filter(t => I7.tones.some(x => x.pc === t.pc)).length;
        return `<div class="sr"><span class="rn">${s7[d].rn}</span><b>${s7[d].sym}</b><span class="dots">${"●".repeat(sh)}${"○".repeat(4 - sh)}</span><em>${moveText(mv)}</em><span class="flip ${mv[0].st > 0 ? "up" : "down"}">${mv[0].st > 0 ? "up" : "down"}</span></div>`; }).join("");
      m.innerHTML = `<div class="sev"><div class="shead"><b>${I7.sym}</b> = ${notesOf({ notes: I7.tones })}</div>${rows}</div>
        ${prompts(["Same ladder: 1 note moves (iii7, vi7), 2 move (IV, V7), 3 move (ii7, viiø7).", `The surprise: the direction flips. ${s7[5].sym} now SINKS the 7th; ${s7[2].sym} LIFTS the root.`, "That flip is Part 2."])}`; } },
  { k: "Circle of fifths", t: M => `The key is three spokes on the circle`, b(m, M) {
      m.innerHTML = `<div class="two"><div class="circ"></div><div class="side"><p class="big">${M.ch[3].sym} · ${M.I.sym} · ${M.ch[4].sym} outside. ${M.ch[1].sym} · ${M.ch[5].sym} · ${M.ch[2].sym} inside. Only ${M.ch[6].sym} lives off the wheel.</p>
        ${prompts([`Same spoke as ${M.I.sym}: ${M.ch[5].sym} — two notes shared.`, `One spoke clockwise: ${M.ch[4].sym} shares one, ${M.ch[2].sym} shares two.`, `One spoke anticlockwise: ${M.ch[3].sym} shares one, ${M.ch[1].sym} shares none.`, "Neighbours on the circle aren't always neighbours under the hand."])}</div></div>`;
      drawCircle(m.querySelector(".circ"), M.key); } },
  { k: "Chord tree", t: M => `Hold ${M.I.tones[0].name}. How many chords grow from it?`, b(m, M) {
      const tr = chordTree(M.I.tones[0].name.replace("♯", "#").replace("♭", "b"), M.key);
      const pm = parse(M.key); const parName = M.I.tones[0].name + " minor";
      m.innerHTML = `<div class="tree"><div class="trunk"><b>${M.I.tones[0].name}</b><small>held</small></div><div class="branches">${tr.map(c => `<div class="br ${c.home}"><b>${c.sym}</b><small>${c.tones.map(t => t.name).join(" ")}</small><i>${M.I.tones[0].name} is the ${c.as}</i><em>${c.home === "major" ? "in " + M.I.sym + " major" : c.home === "minor" ? "borrowed from " + parName : "outside the key"}</em></div>`).join("")}</div></div>
        ${prompts([`Six major and minor chords hold ${M.I.tones[0].name}: as root, third or fifth.`, `Three live in ${M.I.sym} major. The other three come from ${parName} — the same home note, the dark side.`, "Diatonic vs borrowed: one common note is the doorway out of the key. Part 3.", "Every tree, any note: the lesson Find Every Chord That Fits Any Melody Note."])}`; } },
  { k: "Practice plan", t: M => `Five days with ${M.I.sym}`, b(m, M) {
      m.innerHTML = `<ol class="plan"><li><b>Day 1 · the four walks</b><span>Thirds down, thirds up, the circle, fifths up. Every chord in the key, each time — from root position, then 1st, then 2nd inversion.</span></li><li><b>Day 2 · out and back from root position</b><span>Tonic, then each chord, then tonic. Hold the gold notes.</span></li><li><b>Day 3 · from 1st and 2nd inversion</b><span>Same six trips from the other two shapes.</span></li><li><b>Day 4 · ears only</b><span>Someone plays the tonic, then a mystery chord. Count the movers, name the chord.</span></li><li><b>Day 5 · minor + a new key</b><span>${scale(M.key, "natural")[0].name} minor, then the next key round the circle.</span></li></ol>`; } },
  { k: "Close", t: M => `Take it into every key`, b(m, M) {
      m.innerHTML = `<div class="close"><div><h3>The practice app</h3><p>All 12 keys, every shape, the moves highlighted, real piano down to 40 bpm and a metronome.</p></div><div><h3>Patreon</h3><p>The app, the MIDI of this lesson and the notes: patreon.com/jasonzac</p></div><div><h3>Part 2 · Part 3</h3><p>Seventh chords flip the ladder. Then the chord tree: one note, and the doorway out of the key.</p></div></div>`; } }
];

function show() {
  const M = model(D.key), st = STAGES[D.cur], m = $("stage");
  m.innerHTML = `<header class="sh"><p class="kick"><span>${String(D.cur + 1).padStart(2, "0")}</span> ${st.k}</p><h2>${st.t(M)}</h2></header><div class="body"></div>`;
  st.b(m.querySelector(".body"), M);
  $("strip").innerHTML = STAGES.map((s, i) => `<li class="${i === D.cur ? "on" : ""}" data-i="${i}" title="${s.k}"><span>${i + 1}</span></li>`).join("");
  $("strip").querySelectorAll("li").forEach(li => li.addEventListener("click", () => { D.cur = +li.dataset.i; show(); }));
  $("keyName").textContent = pretty(D.key) + " major";
  document.title = "Common Tones — Teacher Deck · " + st.k; saveD();
}
function fit() { const c = $("canvas"), s = Math.min(window.innerWidth / 1600, window.innerHeight / 900); c.style.transform = `translate(-50%, -50%) scale(${s})`; }
function transpose(d) { const i = KEYS.indexOf(D.key); D.key = KEYS[mod(i + d, 12)]; show(); }
async function boot() {
  try { if (document.fonts && document.fonts.load) await Promise.race([Promise.all([document.fonts.load("30px Bravura"), document.fonts.load("700 20px Fraunces"), document.fonts.load("16px Outfit")]), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  if (window.__baking) { const M = model(D.key), m = $("stage"); m.innerHTML = "";
    STAGES.forEach((st, i) => { const sec = document.createElement("section"); sec.className = "baked"; sec.innerHTML = `<header class="sh"><p class="kick"><span>${String(i + 1).padStart(2, "0")}</span> ${st.k}</p><h2>${st.t(M)}</h2></header><div class="body"></div>`; m.appendChild(sec); st.b(sec.querySelector(".body"), M); });
    window.__ready = true; return; }
  show(); fit(); window.addEventListener("resize", fit);
  document.addEventListener("keydown", e => { if ((e.key === "i" || e.key === "I") && !e.metaKey && !e.ctrlKey && !e.altKey && STAGES[D.cur].chain) { D.inv = (D.inv + 1) % 3; show(); e.preventDefault(); } });
  installDeckNav({ total: () => STAGES.length, current: () => D.cur, go: i => { D.cur = i; show(); }, transpose });
  $("hint").textContent = NAV_HINT + " · A answers · I start shape";
  $("prevK").addEventListener("click", () => transpose(-1)); $("nextK").addEventListener("click", () => transpose(1));
  document.addEventListener("keydown", e => { if ((e.key === "a" || e.key === "A") && !e.metaKey && !e.ctrlKey) { D.ans = !D.ans; show(); } });
  window.__ready = true;
}
boot();
