#!/usr/bin/env python3
"""Build the public student app for "Common Tones" (Jason Zac, 20-Oct-2026).
    python3 build_app.py  -> out/Common Tones — Practice.html (ONE self-contained file: fonts, VexFlow 5 + Bravura, Salamander piano, logo inlined;
    the default set-up (G major, out and back) and the 12-key table are baked in as static HTML so the page reads with JavaScript off).
Gates: every key x scale x chord size builds and draws; every chain/out-and-back move is a step, one direction, shared notes held; the quiz is simulated."""
import os, re, json, base64, subprocess, html
P = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(P, "src"); OUT = os.path.join(P, "out")
APP_OUT = os.path.join(OUT, "Common Tones — Practice.html"); APPHOST = "common-tones.nathanielschool.com"
VEXFILE = os.path.expanduser("~/Documents/Remotion Projects/Modern Pop Octave Fillers Lesson/notation/vexflow-bravura.js")
SAMPLES = os.path.join(P, "build_cache", "samples_mp3.json"); LOGOS = os.path.expanduser("~/Library/Mobile Documents/com~apple~CloudDocs/NSM Logos/")
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
bank = json.load(open(SAMPLES)); samples = {k: v for k, v in bank.items() if 36 <= int(k) <= 90}
LOGO = "data:image/png;base64," + b64(LOGOS + "NSM Full Logo - White.png")
FAV = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%2315131c'/%3E%3Ccircle cx='32' cy='32' r='12' fill='%23F4C16A'/%3E%3Ccircle cx='32' cy='10' r='6' fill='%23FF8A5C'/%3E%3Ccircle cx='32' cy='54' r='6' fill='%235ED6C8'/%3E%3C/svg%3E"
DESC = ("Common Tones by Jason Zac: from the home chord, every chord in the key is one, two or three fingers away. All 12 keys, major and minor, triads and "
        "seventh chords, four chains through every chord in the key, out-and-back drills from every inversion, real piano from 40 bpm, a metronome, and a which-note-moved ear quiz. Nathaniel School of Music.")
LINKS = [("patreon.com/jasonzac", "https://www.patreon.com/jasonzac"), ("nathanielschool.com", "https://www.nathanielschool.com/"),
         ("Free lessons library", "https://free-music-lessons.nathanielschool.com/"), ("Chord Trees app", "https://chord-trees.nathanielschool.com/"),
         ("YouTube", "https://www.youtube.com/@nathanielmusicschool")]
def live(url):
    r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-L", "--max-time", "20", "-w", "%{http_code}", "-A", "Mozilla/5.0 (Macintosh) Chrome/126 Safari/537.36", url], capture_output=True, text=True)
    return r.stdout.strip() == "200"
ok_links = [(t, u) for t, u in LINKS if live(u)]
for t, u in LINKS: print(("  link 200  " if (t, u) in ok_links else "  link DOWN — left out  ") + u)
links_html = " ".join(f'<a href="{u}" target="_blank" rel="noopener">{e(t)}</a>' for t, u in ok_links)
JS = "\n".join(rd(os.path.join(SRC, f)) for f in ("core.js", "draw.js", "audio.js", "app.js"))
def fill(static):
    h = rd(os.path.join(SRC, "app.html"))
    for k, v in {"DESC": e(DESC), "FAVICON": FAV, "FONTS": FONTS, "CSS": rd(os.path.join(SRC, "app.css")), "LOGO": LOGO, "LINKS": links_html,
                 "VEX": vex, "SAMPLES": json.dumps(samples), "JS": JS}.items(): h = h.replace("%%" + k + "%%", v)
    return re.sub(r"%%B:(\w+)%%", lambda m_: static.get(m_.group(1), ""), h)
BAKE = ["keyChips", "modeChips", "sizeChips", "ladderKey", "ladder", "now", "live", "bars", "staff", "exChips", "exNote", "targetChips", "shapeChips", "hitChips", "handChips", "keyTable"]
from playwright.sync_api import sync_playwright
os.makedirs(OUT, exist_ok=True); tmp = os.path.join(OUT, "_pass1-app.html"); open(tmp, "w", encoding="utf-8").write(fill({}))
GATE = """(()=>{const bad=[];let n=0;
 for(const k of KEYS)for(const mode of ["major","natural","harmonic"])for(const size of [3,4])for(const ex of ["chain","up3","circle","up5","out"])for(let sh=0;sh<size;sh++){
  Object.assign(S,{key:k,mode,size,ex,target:"all",shape:sh});try{refresh();}catch(e){bad.push(k+mode+size+ex+sh+': '+e.message);continue}
  if(document.getElementById('staff').textContent.includes('could not draw'))bad.push('staff '+k+mode+size);
  const cnt=document.getElementById('staff').querySelectorAll('svg').length; if(!cnt)bad.push('no staff svg '+k+mode+size);
  SEQ.forEach((x,i)=>{ if(x.v.notes.some(m=>m.midi<36||m.midi>90))bad.push('range '+k+mode+size+ex+i);
    if(Math.abs(x.v.notes[0].acc)>1&&!(mode==='harmonic'))bad.push('double acc '+k+mode+x.c.sym);
    if(mode!=='harmonic'){ /* out-and-back: shared notes held, movers one way by step; chain: exactly one mover */
      const mv=x.mv; if(ex!=='out'&&i>0){const want=(ex==='chain'||ex==='up3')?1:2; if(mv.length!==want)bad.push(ex+' '+k+mode+size+sh+' '+x.c.sym+' moved '+mv.length);
        if(new Set(mv.map(m=>Math.sign(m.st))).size!==1)bad.push(ex+' dir '+k+mode+size+sh+x.c.sym); if(mv.some(m=>Math.abs(m.st)>2))bad.push(ex+' leap '+k+mode+size+sh+x.c.sym);}
      if(ex==='out'&&x.d){const r=M.to[sh][x.d],sh2=x.c.tones.filter(t=>M.ch[0].tones.some(y=>y.pc===t.pc)).length;
        if(r.n!==size-sh2)bad.push('count '+k+mode+size+sh+x.c.sym); if(new Set(r.mv.map(m=>Math.sign(m.st))).size!==1)bad.push('dir '+k+mode+size+sh+x.c.sym);
        if(r.mv.some(m=>Math.abs(m.st)>2))bad.push('leap '+k+mode+size+sh+x.c.sym);} }
    n++;});}
 return {bad:bad.slice(0,20),n};})()"""
QUIZ = """(()=>{quick=()=>{};const bad=[];Object.assign(S,{key:'Eb',mode:'major',size:3,earShape:'any',earSet:'all'});refresh();setTab('ear');
 for(let i=0;i<40;i++){earNew();const c=Q.cur;answer(1,c.n===1?2:1);answer(1,c.n);answer(2,c.side);answer(3,c.d);if(!document.getElementById('earNext'))bad.push('no reveal '+i);}
 const s=document.getElementById('score').textContent; return {bad,s,right:Q.right,done:Q.done};})()"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={"width": 1280, "height": 900}); errs = []
    pg.on("pageerror", lambda x: errs.append(str(x))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.add_init_script("window.__baking = true"); pg.goto("file://" + tmp); pg.wait_for_function("window.__ready === true", timeout=60000)
    static = {i: pg.evaluate(f"document.getElementById('{i}').innerHTML") for i in BAKE}
    static["targetHidden"] = ""; static["shapeHidden"] = ""
    g = pg.evaluate(GATE); q = pg.evaluate(QUIZ); b.close()
os.remove(tmp); assert not errs, errs
print(f"  gate: {g['n']} chords checked across 12 keys x 3 scales x 2 sizes x 5 drills x every shape; problems: {len(g['bad'])}")
assert not g["bad"], g["bad"]
print(f"  quiz: 40 simulated questions, score shows '{q['s']}' (one wrong count on purpose each time) ; problems: {q['bad']}")
assert not q["bad"] and q["done"] == 40 and q["right"] == 0, q
for k, v in static.items(): vv = re.sub(r"data:[^\"')]+", "", v); assert "NaN" not in vv and "undefined" not in vv, f"bad value in {k}"
final = fill(static); assert not re.search(r"%%B:\w+%%|%%[A-Z]+%%", final)
ext = [u for u in re.findall(r'(?:src|href)="([^"]+)"', final) if not u.startswith(("data:", "#", "http"))]; assert not ext, ext
open(APP_OUT, "w", encoding="utf-8").write(final); print(f"wrote {APP_OUT}  {os.path.getsize(APP_OUT)/1e6:.2f} MB"); assert os.path.getsize(APP_OUT) < 12_000_000
