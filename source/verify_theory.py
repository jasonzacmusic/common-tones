#!/usr/bin/env python3
"""Count common tones between the tonic chord and every diatonic chord, in all 12 keys,
major + natural/harmonic/melodic minor, triads + sevenths. Also: the inversion pairings
from the tonic (which shape of chord X is nearest each shape of I). Writes THEORY.md."""
import itertools, os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "research", "THEORY.md")
MAJ=[0,2,4,5,7,9,11]; NAT=[0,2,3,5,7,8,10]; HAR=[0,2,3,5,7,8,11]; MEL=[0,2,3,5,7,9,11]
def chords(scale,size):  # stacked thirds on each degree, as pitch classes
    return [[scale[(d+2*k)%7] for k in range(size)] for d in range(7)]
def q(ch):
    iv=[(x-ch[0])%12 for x in ch]
    t={(0,4,7):"",(0,3,7):"m",(0,3,6):"dim",(0,4,8):"aug"}.get(tuple(iv[:3]),"?")
    if len(ch)==3: return t
    s={(0,4,7,11):"maj7",(0,4,7,10):"7",(0,3,7,10):"m7",(0,3,6,10):"m7b5",(0,3,6,9):"dim7",(0,3,7,11):"m(maj7)",(0,4,8,11):"maj7#5"}
    return s.get(tuple(iv),"?")
ROM=["I","II","III","IV","V","VI","VII"]
def rn(i,qual):
    r=ROM[i]
    if qual in("m","dim","m7","m7b5","dim7","m(maj7)"): r=r.lower()
    return r+{"dim":"°","aug":"+","m":"","maj7":"maj7","7":"7","m7":"7","m7b5":"ø7","dim7":"°7","m(maj7)":"(maj7)","maj7#5":"+maj7","":""}.get(qual,qual)
lines=["# THEORY CHECK — computed, not remembered","",
"Common tones = notes shared with the tonic chord (pitch classes). Interval-only, so true in all 12 keys; spot-checked below.",""]
for name,sc in [("MAJOR",MAJ),("NATURAL MINOR",NAT),("HARMONIC MINOR",HAR),("MELODIC MINOR (ascending)",MEL)]:
    for size in (3,4):
        cs=chords(sc,size); T=set(cs[0])
        row=[f"{rn(i,q(c))}={len(T&set(c))}" for i,c in enumerate(cs)]
        lines.append(f"- {name} {'triads' if size==3 else 'sevenths'}: "+" · ".join(row))
    lines.append("")
# Spelling in G major
NAMES={"G":["G","A","B","C","D","E","F#"]}
g=NAMES["G"]
lines+=["## G major spelled","" ]
for size in (3,4):
    for d in range(7):
        ch=[g[(d+2*k)%7] for k in range(size)]
        com=[n for n in ch if n in [g[0],g[2],g[4]]+([g[6]] if size==4 else [])]
        lines.append(f"- {'triad' if size==3 else '7th'} on {d+1}: {' '.join(ch)}   shared with G{' maj7' if size==4 else ''}: {' '.join(com) or '—'}")
    lines.append("")
# A minor / E minor spelled (relative minor of G = E minor)
em=["E","F#","G","A","B","C","D"]
lines+=["## E minor (natural) spelled — G's relative minor",""]
for d in range(7):
    ch=[em[(d+2*k)%7] for k in range(3)]
    com=[n for n in ch if n in ["E","G","B"]]
    lines.append(f"- {' '.join(ch)}: shared with Em = {' '.join(com) or '—'}")
lines.append("- harmonic minor: V = B D# F#  shares B with Em; vii° = D# F# A shares nothing; III+ = G B D# shares G B")
lines.append("")
# Inversion pairings from tonic: for each tonic shape (root, 1st, 2nd) in a fixed register, find the nearest shape of each chord
def shapes(pcs, base=55):  # 3 inversions as MIDI, lowest note >= base region
    out=[]
    for inv in range(3):
        order=pcs[inv:]+pcs[:inv]; notes=[]; cur=base-1
        for p in order:
            n=cur+1
            while n%12!=p: n+=1
            notes.append(n); cur=n
        out.append(notes)
    return out
def dist(a,b): return sum(abs(x-y) for x,y in zip(sorted(a),sorted(b)))
NN=["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"]
G=7; cs=[[ (G+x)%12 for x in c] for c in chords(MAJ,3)]
lines+=["## Nearest shape from each G-chord shape (G at or above the G below middle C, MIDI 55), total semitones moved",""]
tonic_sh=shapes(cs[0])
INV=["root","1st inv","2nd inv"]
for ti,ts in enumerate(tonic_sh):
    lines.append(f"### G {INV[ti]} = {' '.join(NN[n%12] for n in ts)}")
    for d in range(1,7):
        best=None
        for oct in (-12,0,12):
            for ii,s in enumerate(shapes(cs[d], 55)):
                s2=[n+oct for n in s]
                dd=dist(ts,s2)
                if best is None or dd<best[0]: best=(dd,ii,s2)
        dd,ii,s2=best
        moved=[ (NN[a%12],NN[b%12]) for a,b in zip(sorted(ts),sorted(s2)) if a!=b]
        lines.append(f"- to {rn(d,q(chords(MAJ,3)[d]))}: {INV[ii]} {' '.join(NN[n%12] for n in s2)} — moves {dd} semitones; changes: {', '.join(f'{a}→{b}' for a,b in moved) or 'none'}")
    lines.append("")
open(OUT,"w").write("\n".join(lines)); print("\n".join(lines))

# ---- step-motion map: from the tonic chord (pitch classes), which notes move, by how much, which direction
def stepmap(tonic, target):
    T=list(tonic); S=set(target); moves=[]
    keep=[t for t in T if t in S]; rest_t=[t for t in T if t not in S]; rest_s=[s for s in target if s not in set(T)]
    best=None
    for perm in itertools.permutations(rest_s):
        m=[(((b-a+6)%12)-6) for a,b in zip(rest_t,perm)]
        cost=sum(abs(x) for x in m)
        if best is None or cost<best[0]: best=(cost,list(zip(rest_t,perm,m)))
    return keep, best[1] if best else []
SP={0:"C",1:"C#",2:"D",3:"Eb",4:"E",5:"F",6:"F#",7:"G",8:"Ab",9:"A",10:"Bb",11:"B"}
SP_E={**SP,3:"D#"}
out2=["","## Step map — which notes move from the tonic, and which way (+ up / − down, semitones)",""]
for label,sc,root,sp,size in [("G major triads",MAJ,7,SP,3),("E minor natural triads",NAT,4,SP,3),("E minor harmonic triads",HAR,4,SP_E,3),
                              ("G major sevenths",MAJ,7,SP,4),("E minor natural sevenths",NAT,4,SP,4)]:
    cs=[[ (root+x)%12 for x in c] for c in chords(sc,size)]
    out2.append(f"### {label}")
    for d in range(1,7):
        keep,mv=stepmap(cs[0],cs[d])
        out2.append(f"- {rn(d,q(chords(sc,size)[d]))} ({' '.join(sp[n] for n in cs[d])}): keeps {' '.join(sp[k] for k in keep) or '—'}; moves "+
                    (", ".join(f"{sp[a]}→{sp[b]} ({'+' if m>0 else ''}{m})" for a,b,m in mv) or "nothing"))
    out2.append("")
# 12-key control: the triad step-map directions are identical in every major key
sig=None
for r in range(12):
    cs=[[ (r+x)%12 for x in c] for c in chords(MAJ,3)]
    s=tuple(tuple(m for _,_,m in stepmap(cs[0],cs[d])[1]) for d in range(1,7))
    assert sig is None or s==sig; sig=s
out2.append(f"Control: major-key triad step map identical in all 12 keys: {sig}")
open(OUT,"a").write("\n".join(out2)); print("\n".join(out2))
