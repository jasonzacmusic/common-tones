// ─── One navigation ecosystem for every NSM teacher deck ──────────────────
// Jason presents from these on camera, often with one hand on the piano, so
// every sensible key must move the deck — not just the pair I happened to pick.
//
//   → ↓  space  PageDown   next stage
//   ← ↑  ⇧space PageUp     previous stage
//   Home / End               first / last
//   1–9, 0                   jump straight to a stage (0 = the tenth)
//   [ ]                      transpose down / up a semitone
//
// Ends CLAMP rather than wrap: on camera, running off the end and reappearing
// at the start looks like a mistake.

function installDeckNav({ total, current, go, transpose }){
  const clamp = i => Math.max(0, Math.min(total() - 1, i));

  document.addEventListener("keydown", e => {
    if(e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if(t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if(t && t.isContentEditable) return;

    const k = e.key;
    let handled = true;

    if(k === " " || k === "Spacebar")            go(clamp(current() + (e.shiftKey ? -1 : 1)));
    else if(k === "ArrowRight" || k === "ArrowDown"  || k === "PageDown") go(clamp(current() + 1));
    else if(k === "ArrowLeft"  || k === "ArrowUp"    || k === "PageUp")   go(clamp(current() - 1));
    else if(k === "Home")                        go(0);
    else if(k === "End")                         go(total() - 1);
    else if(k === "[" && transpose)              transpose(-1);
    else if(k === "]" && transpose)              transpose(1);
    else if(/^[0-9]$/.test(k)){
      const i = k === "0" ? 9 : Number(k) - 1;
      if(i < total()) go(i); else handled = false;
    }
    else handled = false;

    if(handled) e.preventDefault();
  });
}

// The hint line every deck shows, so the keys are discoverable on set.
const NAV_HINT =
  "← → ↑ ↓ or space · 1–9 jump · [ ] change key";
