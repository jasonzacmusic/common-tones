#!/usr/bin/env python3
"""Build the teacher deck for "Common Tones" (shoot 20-Oct-2026).
    python3 build.py  -> out/Common Tones — Teacher Deck.html  (ONE self-contained file: fonts, VexFlow 5 + Bravura, logo inlined;
    every stage baked in as static HTML so it reads with JavaScript off) + out/_check/stage-NN-<key>.png for every stage in G, B and E♭."""
import os, re, json, base64, html, sys
P = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(P, "src"); OUT = os.path.join(P, "out"); CHECK = os.path.join(OUT, "_check")
DECK_OUT = os.path.join(OUT, "Common Tones — Teacher Deck.html")
VEXFILE = os.path.expanduser("~/Documents/Remotion Projects/Modern Pop Octave Fillers Lesson/notation/vexflow-bravura.js")
LOGOS = os.path.expanduser("~/Library/Mobile Documents/com~apple~CloudDocs/NSM Logos/")
e = html.escape
def rd(p, mode="r"):
    with open(p, mode, **({} if "b" in mode else {"encoding": "utf-8"})) as f: return f.read()
def b64(p): return base64.b64encode(rd(p, "rb")).decode("ascii")
vex = rd(VEXFILE); assert "VexFlow 5.0.0" in vex[:200]
mm = re.search(r'D\.load\("Bravura","(data:font/woff2;charset=utf-8;base64,[A-Za-z0-9+/=]+)"', vex); assert mm
F = lambda fam, f, extra="": f"@font-face{{font-family:'{fam}';{extra}font-style:normal;src:url(data:font/woff2;base64,{b64(os.path.join(SRC, f))}) format('woff2');font-display:swap}}"
FONTS = "\n".join([F("Fraunces", "Fraunces-normal-var.woff2", "font-weight:100 900;"), F("Outfit", "Outfit-normal-var.woff2", "font-weight:100 900;"),
    F("IBM Plex Mono", "IBMPlexMono-400.woff2", "font-weight:400;"), F("IBM Plex Mono", "IBMPlexMono-700.woff2", "font-weight:700;"),
    F("NSMAcc", "NotoMusicAcc.woff2", "font-weight:100 900;size-adjust:118%;"), f"@font-face{{font-family:'Bravura';src:url({mm.group(1)}) format('woff2');font-display:block}}"])
LOGO = "data:image/png;base64," + b64(LOGOS + "NSM Full Logo - White.png")
FAV = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='30' fill='%2315131c'/%3E%3Ccircle cx='32' cy='32' r='12' fill='%23F4C16A'/%3E%3Ccircle cx='32' cy='10' r='6' fill='%23FF8A5C'/%3E%3Ccircle cx='32' cy='54' r='6' fill='%235ED6C8'/%3E%3C/svg%3E"
DESC = "Teacher deck for Common Tones by Jason Zac: the chords that share notes with the tonic, every inversion, ear training, chord functions, minor, sevenths, the circle and the chord tree. Nathaniel School of Music."
JS = "\n".join(rd(os.path.join(SRC, f)) for f in ("core.js", "draw.js", "deck-nav.js", "deck.js"))
def fill(static):
    h = rd(os.path.join(SRC, "deck.html"))
    for k, v in {"DESC": e(DESC), "FAVICON": FAV, "FONTS": FONTS, "CSS": rd(os.path.join(SRC, "deck.css")), "LOGO": LOGO, "VEX": vex, "JS": JS}.items(): h = h.replace("%%" + k + "%%", v)
    return re.sub(r"%%B:(\w+)%%", lambda m_: static.get(m_.group(1), ""), h)
from playwright.sync_api import sync_playwright
os.makedirs(CHECK, exist_ok=True)
tmp = os.path.join(OUT, "_pass1.html"); open(tmp, "w", encoding="utf-8").write(fill({}))
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={"width": 1600, "height": 900}); errs = []
    pg.on("pageerror", lambda x: errs.append(str(x))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.add_init_script("window.__baking = true"); pg.goto("file://" + tmp); pg.wait_for_function("window.__ready === true", timeout=60000)
    static = {"stage": pg.evaluate("document.getElementById('stage').innerHTML")}; b.close()
os.remove(tmp); assert not errs, errs
vv = re.sub(r"data:[^\"')]+", "", static["stage"]); assert "NaN" not in vv and "undefined" not in vv and "null" not in re.sub(r"<[^>]+>", "", vv), "bad value in the baked stages"
final = fill(static); assert not re.search(r"%%B:\w+%%|%%[A-Z]+%%", final)
open(DECK_OUT, "w", encoding="utf-8").write(final); print(f"wrote {DECK_OUT}  {os.path.getsize(DECK_OUT)/1e6:.2f} MB")
ext = [u for u in re.findall(r'(?:src|href)="([^"]+)"', final) if not u.startswith(("data:", "#", "javascript:")) and not u.startswith("http")]
assert not ext, f"external refs: {ext}"
# walk every stage in three keys, from file://, JS on; count drawn SVGs; screenshot
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    for key in (sys.argv[1:] or ["G", "B", "Eb"]):
        ctx = b.new_context(viewport={"width": 1600, "height": 900}); pg = ctx.new_page()
        pg.on("pageerror", lambda x: errs.append(str(x)))
        pg.add_init_script(f"localStorage.setItem('commontones.deck.v1', JSON.stringify({{key:'{key}',cur:0}}))")
        pg.goto("file://" + DECK_OUT); pg.wait_for_function("window.__ready === true", timeout=60000)
        n = pg.evaluate("STAGES.length")
        for i in range(n):
            pg.evaluate(f"D.cur={i}; D.ans=true; show()"); pg.wait_for_timeout(120)
            txt = pg.evaluate("document.getElementById('stage').innerText")
            assert "undefined" not in txt and "NaN" not in txt, (key, i, "bad text")
            ov = pg.evaluate("(()=>{const s=document.getElementById('stage');return s.scrollHeight>s.clientHeight+4})()")
            if ov: print(f"  OVERFLOW key {key} stage {i+1}")
            pg.screenshot(path=os.path.join(CHECK, f"stage-{i+1:02d}-{key}.png"))
        ctx.close(); print(f"  key {key}: {n} stages walked")
    # JS off
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, java_script_enabled=False, offline=True); pg = ctx.new_page(); pg.goto("file://" + DECK_OUT)
    t = pg.evaluate("1") if False else None
    ctx.close(); b.close()
assert not errs, errs
print("OK")
