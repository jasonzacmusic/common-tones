"use strict";
/* ============ Common Tones — the music engine. Spelled letter by letter, never from pitch classes. ============ */
const LET = "CDEFGAB", NAT = [0, 2, 4, 5, 7, 9, 11];
const mod = (a, n) => ((a % n) + n) % n;
const accStr = a => a === 1 ? "♯" : a === -1 ? "♭" : a === 2 ? "𝄪" : a === -2 ? "𝄫" : "";
function parse(name) { const L = name[0], acc = name.slice(1).split("").reduce((a, c) => a + (c === "#" ? 1 : c === "b" ? -1 : 0), 0); return { L, acc, pc: mod(NAT[LET.indexOf(L)] + acc, 12) }; }
function mk(L, pc) { let acc = pc - NAT[LET.indexOf(L)]; acc = mod(acc + 6, 12) - 6; return { L, acc, pc: mod(pc, 12), name: L + accStr(acc) }; }
const pretty = n => { const p = parse(n); return p.L + accStr(p.acc); };
/* the 12 major keys the deck offers (no E♯/B♯/F♭/C♭ tonics) */
const KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const MAJ = [0, 2, 4, 5, 7, 9, 11];
/* the scale of a major key, or of its relative minor (natural / harmonic) */
function scale(key, mode) {
  const k = parse(key), li = LET.indexOf(k.L);
  const maj = MAJ.map((s, d) => mk(LET[(li + d) % 7], k.pc + s));
  if (mode === "major") return maj;
  const nat = [5, 6, 0, 1, 2, 3, 4].map(d => maj[d]);
  if (mode === "natural") return nat;
  return nat.map((t, d) => d === 6 ? mk(t.L, t.pc + 1) : t); /* harmonic: raise the 7th */
}
const ROLES = ["root", "3rd", "5th", "7th"];
/* stacked-third chord on degree d (0-based), size 3 or 4 */
function chordOn(sc, d, size) { return Array.from({ length: size }, (_, k) => Object.assign({}, sc[(d + 2 * k) % 7], { role: ROLES[k] })); }
function quality(t) { const iv = t.map(x => mod(x.pc - t[0].pc, 12)).join(",");
  return ({ "0,4,7": "", "0,3,7": "m", "0,3,6": "dim", "0,4,8": "aug", "0,4,7,11": "maj7", "0,4,7,10": "7", "0,3,7,10": "m7", "0,3,6,10": "m7♭5", "0,3,6,9": "dim7", "0,3,7,11": "m(maj7)", "0,4,8,11": "maj7♯5" })[iv] ?? "?"; }
const RN = ["I", "II", "III", "IV", "V", "VI", "VII"];
function roman(d, q) { const low = ["m", "dim", "m7", "m7♭5", "dim7", "m(maj7)"].includes(q); let r = low ? RN[d].toLowerCase() : RN[d];
  return r + ({ "": "", m: "", dim: "°", aug: "+", maj7: "maj7", 7: "7", m7: "7", "m7♭5": "ø7", dim7: "°7", "m(maj7)": "(maj7)", "maj7♯5": "+maj7" })[q]; }
function chordSym(t) { const q = quality(t); return t[0].name + (q === "dim" ? "°" : q === "aug" ? "+" : q); }
/* names of the degrees */
const DEG = ["tonic", "supertonic", "mediant", "subdominant", "dominant", "submediant", "leading tone"];
const DEG_MIN_NAT7 = "subtonic";
/* the six (or seven) diatonic chords of a key */
function diatonic(key, mode, size) {
  const sc = scale(key, mode);
  return sc.map((_, d) => { const t = chordOn(sc, d, size), q = quality(t); return { d, tones: t, q, rn: roman(d, q), sym: chordSym(t), deg: d === 6 && mode === "natural" ? DEG_MIN_NAT7 : DEG[d] }; });
}
/* one sounding note */
function tone(t, midi) { const oct = Math.floor((midi - t.acc) / 12) - 1; return Object.assign({}, t, { midi, vf: t.L.toLowerCase() + (t.acc === 1 ? "#" : t.acc === -1 ? "b" : t.acc === 2 ? "##" : t.acc === -2 ? "bb" : "") + "/" + oct }); }
/* an inversion of chord tones, lowest note at or above lowMin */
function voice(tones, inv, lowMin) {
  const n = tones.length, order = tones.map((_, k) => tones[(k + inv) % n]);
  let m = order[0].pc; while (m < lowMin) m += 12; while (m - 12 >= lowMin) m -= 12;
  const out = [tone(order[0], m)]; let prev = m;
  for (let k = 1; k < n; k++) { let x = order[k].pc; while (x <= prev) x += 12; out.push(tone(order[k], x)); prev = x; }
  return { inv, notes: out };
}
/* the tonic's three shapes, each placed so its middle note sits nearest A4 — readable on the treble staff */
function homeShapes(tones) {
  return tones.map((_, inv) => { let best = null;
    for (let lo = 52; lo <= 72; lo++) { const v = voice(tones, inv, lo), mid = v.notes[1].midi, sc = Math.abs(mid - 69);
      if (!best || sc < best.sc) best = { sc, v }; }
    return best.v; });
}
/* the shape of `tones` nearest to the shape `from` (sum of semitone moves, voice by voice) */
function nearest(from, tones) {
  let best = null; const lo0 = from.notes[0].midi;
  for (let inv = 0; inv < tones.length; inv++) for (let lo = lo0 - 8; lo <= lo0 + 8; lo++) {
    const v = voice(tones, inv, lo); if (v.notes[0].midi !== lo && v.notes[0].pc !== mod(lo, 12)) continue;
    const cost = v.notes.reduce((a, n, i) => a + Math.abs(n.midi - from.notes[i].midi), 0), kept = v.notes.filter((n, i) => n.midi === from.notes[i].midi).length;
    if (!best || cost < best.cost || (cost === best.cost && kept > best.kept)) best = { cost, kept, v };
  }
  return best.v;
}
/* what moved between two voiced shapes: per voice, from → to, semitones */
function moves(from, to) { return from.notes.map((n, i) => ({ from: n, to: to.notes[i], st: to.notes[i].midi - n.midi })); }
const stepWord = st => Math.abs(st) === 1 ? "half step" : Math.abs(st) === 2 ? "whole step" : Math.abs(st) + " semitones";
const dirWord = st => st > 0 ? "up" : "down";
/* the six major/minor triads that contain one note (held), spelled simply */
const ROOTS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
function triadOf(root, minor) { const r = parse(root), li = LET.indexOf(r.L); return [0, 1, 2].map(k => Object.assign(mk(LET[(li + 2 * k) % 7], r.pc + [0, minor ? 3 : 4, 7][k]), { role: ROLES[k] })); }
function chordTree(held, key) {
  const h = parse(held), out = [];
  const majSet = diatonic(key, "major", 3).map(c => c.sym), par = parallelMinor(key), minSet = par ? diatonic(par.key, "natural", 3).map(c => c.sym) : [];
  [[0, false, "root"], [0, true, "root"], [4, false, "3rd"], [3, true, "3rd"], [7, false, "5th"], [7, true, "5th"]].forEach(([iv, minor, as]) => {
    const pc = mod(h.pc - iv, 12);
    /* spell the root so the held note keeps its own spelling where possible */
    let root = null;
    for (const cand of ROOTS.concat(["C#", "Gb", "Cb", "Fb", "E#", "B#", "D#", "G#", "A#"])) { if (parse(cand).pc !== pc) continue;
      const t = triadOf(cand, minor), hit = t.find(x => x.pc === h.pc); if (hit && hit.name === pretty(held) && t.every(x => Math.abs(x.acc) < 2)) { root = cand; break; } }
    if (!root) root = ROOTS.find(c => parse(c).pc === pc);
    const t = triadOf(root, minor), sym = t[0].name + (minor ? "m" : "");
    const home = majSet.includes(sym) ? "major" : minSet.includes(sym) ? "minor" : "outside";
    out.push({ tones: t, sym, as, home });
  });
  return out;
}
/* G major's parallel minor = G minor, spelled from its relative major (B♭); returns {key: relative major of the parallel minor} */
function parallelMinor(key) { const k = parse(key), rel = mod(k.pc + 3, 12); const name = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"][rel];
  /* sharp-side majors (D, A, E, B, F#) have parallel minors with flat-side relatives that may need 6+ flats — fine for spelling */
  return { key: name }; }
/* key signature string VexFlow wants */
function vfSig(key, mode) { if (mode === "major") return key; const sc = scale(key, "natural"); return sc[0].name.replace("♯", "#").replace("♭", "b") + "m"; }
const INVN = ["root position", "1st inversion", "2nd inversion", "3rd inversion"], INVS = ["root", "1st", "2nd", "3rd"];
/* triad pair: two chords with nothing in common climb through their shapes in turn; the bass walks the six-note scale they make */
function pairClimb(chA, chB, low) { const out = []; let lo = low;
  for (let k = 0; k < 7 || out[out.length - 1].c !== (chA.d === 0 ? chA : chB); k++) { const c = k % 2 ? chB : chA, v = voice(c.tones, Math.floor(k / 2) % 3, lo); out.push({ c, v }); lo = v.notes[0].midi + 1; if (k > 9) break; }
  return out; }
function pairScale(sc, chA, chB) { const pcs = new Set(chA.tones.concat(chB.tones).map(t => t.pc)), i = sc.findIndex(t => t.pc === chA.tones[0].pc);
  return sc.slice(i).concat(sc.slice(0, i)).filter(t => pcs.has(t.pc)); }
