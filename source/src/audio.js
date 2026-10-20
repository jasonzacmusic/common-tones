"use strict";
/* ============ sound: a sampled grand piano (NSM Sample Vault subset) + a synthesised click, scheduled on the audio clock ============ */
const Piano = (() => {
  let ctx = null, master = null; const buf = {}, pend = {}; let live = [];
  function ac() { if (!ctx) { try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
      const C = window.AudioContext || window.webkitAudioContext; ctx = new C(); master = ctx.createGain(); master.gain.value = .9; master.connect(ctx.destination); }
    if (ctx.state === "suspended") ctx.resume(); return ctx; }
  function bytes(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  const ks = Object.keys(typeof SAMPLES === "object" ? SAMPLES : {}).map(Number), nearest = m => ks.reduce((a, b) => Math.abs(b - m) < Math.abs(a - m) ? b : a, ks[0]);
  function load(m) { const k = nearest(m); if (buf[k]) return Promise.resolve(buf[k]);
    if (!pend[k]) pend[k] = new Promise((res, rej) => ac().decodeAudioData(bytes(SAMPLES[k]), res, rej)).then(b => (buf[k] = b)).catch(e => { delete pend[k]; throw e; });
    return pend[k]; }
  function note(m, at, dur, vel) { const c = ac(), k = nearest(m), b = buf[k]; if (!b) return;
    const src = c.createBufferSource(); src.buffer = b; src.playbackRate.value = Math.pow(2, (m - k) / 12);
    const g = c.createGain(); g.gain.setValueAtTime(vel, at); g.gain.setValueAtTime(vel, at + dur); g.gain.exponentialRampToValueAtTime(.001, at + dur + .22);
    src.connect(g); g.connect(master); src.start(at); src.stop(at + dur + .25); live.push(src); src.onended = () => { live = live.filter(x => x !== src); }; }
  function click(at, accent) { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.type = "triangle"; o.frequency.value = accent ? 1760 : 1180;
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(accent ? .42 : .26, at + .002); g.gain.exponentialRampToValueAtTime(.001, at + .05);
    o.connect(g); g.connect(master); o.start(at); o.stop(at + .07); return o; }
  function stopAll() { live.forEach(s => { try { s.stop(); } catch (e) {} }); live = []; }
  return { ac, load, note, click, stopAll, now: () => ac().currentTime, warm: list => Promise.all(list.map(m => load(m).catch(() => null))) };
})();

/* the player: 16th-note steps scheduled ahead; the screen follows on the next animation frame */
const Player = (() => {
  let on = false, seqT = null, raf = 0, q = [], nextT = 0, step = 0, cnt = 0, TL = null, byStep = null, opt = null, hooks = null;
  const sp = () => 60 / opt.bpm / 4, ahead = () => document.hidden ? 1.6 : .3;
  function doStep(t) {
    const j = step;
    (byStep.get(j) || []).forEach(e => { const d = e.stac ? Math.min(e.len, 1) * sp() * .55 : e.len * sp() * .96;
      if (opt.hands !== "lh" || e.hand === "L") if (opt.hands !== "rh" || e.hand === "R") e.midis.forEach(m => Piano.note(m, t, Math.max(.06, d), e.vel));
      q.push({ t, fn: () => hooks.hit(e, d) }); });
    if (opt.click && j % 4 === 0) Piano.click(t, j % 16 === 0);
    q.push({ t, fn: () => hooks.tick(j) });
    step = (step + 1) % TL.len;
  }
  function tick() { if (!on) return; const now = Piano.now();
    while (nextT < now + ahead()) { if (cnt > 0) { const k = 4 - cnt; Piano.click(nextT, k === 0); q.push({ t: nextT, fn: () => hooks.count(k) }); cnt--; nextT += sp() * 4; } else { doStep(nextT); nextT += sp(); } } }
  function frame() { if (!on) return; const now = Piano.now(); q.sort((a, b) => a.t - b.t); while (q.length && q[0].t <= now) q.shift().fn(); raf = requestAnimationFrame(frame); }
  async function start(timeline, options, h) {
    stop(); TL = timeline; opt = options; hooks = h; byStep = new Map();
    TL.R.forEach(e => add(e, "R")); TL.L.forEach(e => add(e, "L"));
    function add(e, hand) { const s = e.bar * 16 + e.step, x = Object.assign({ hand }, e); if (!byStep.has(s)) byStep.set(s, []); byStep.get(s).push(x); }
    on = true; hooks.status("loading the piano…");
    const all = new Set(); TL.R.concat(TL.L).forEach(e => e.midis.forEach(m => all.add(m))); const got = await Piano.warm([...all]); if (!on) return;
    if (!got.some(Boolean)) { on = false; hooks.status("The piano sound could not load here. Open this file in Chrome or Safari."); if (hooks.idle) { const st = hooks.status; hooks.idle(); st("The piano sound could not load here. Open this file in Chrome or Safari."); } return; }
    nextT = Piano.now() + .12; step = 0; cnt = opt.countIn ? 4 : 0; q = []; hooks.status("playing · " + opt.bpm + " bpm");
    seqT = setInterval(tick, 25); tick(); raf = requestAnimationFrame(frame);
  }
  function stop() { const was = on; on = false; clearInterval(seqT); cancelAnimationFrame(raf); q = []; Piano.stopAll(); if (was && hooks) hooks.idle(); }
  /* a live tempo change keeps the bar position */
  function retempo(bpm) { if (opt) opt.bpm = bpm; }
  return { start, stop, retempo, get on() { return on; } };
})();

/* the metronome on its own: no piano needed */
const Metro = (() => {
  let on = false, t = null, raf = 0, next = 0, n = 0, q = [], bpm = 65, beats = 4, dots = null;
  function tick() { if (!on) return; const now = Piano.now(), per = 60 / bpm;
    while (next < now + (document.hidden ? 1.6 : .3)) { const b = n % beats, at = next; Piano.click(at, b === 0); q.push({ t: at, fn: () => dots && dots(b) }); next += per; n++; } }
  function frame() { if (!on) return; const now = Piano.now(); while (q.length && q[0].t <= now) q.shift().fn(); raf = requestAnimationFrame(frame); }
  return {
    start(b, d) { bpm = b; dots = d; on = true; Piano.ac(); next = Piano.now() + .08; n = 0; q = []; t = setInterval(tick, 25); tick(); raf = requestAnimationFrame(frame); },
    stop() { on = false; clearInterval(t); cancelAnimationFrame(raf); q = []; dots && dots(-1); },
    set bpm(v) { bpm = v; }, get on() { return on; }
  };
})();
