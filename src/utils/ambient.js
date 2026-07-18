// ============================================================================
// ambient.js — procedural ambient soundscape (Web Audio API). A low, slow drone
// with a shimmer LFO, plus a filtered-noise swell on section changes. Fully
// synthesised: no audio assets, no network.
//
// OFF by default and only ever started by an explicit click on the shell's
// sound toggle — respects browser autoplay policy AND the visitor's choice
// (a pro site must never blast sound unprompted). All nodes are lazily built
// on first enable, so a visitor who never toggles pays zero audio cost.
// ============================================================================
export function initAmbient({ reduced } = {}) {
  const btn = document.getElementById('sound-toggle');
  if (!btn || reduced) return { swell() {} };

  let ctx = null, master = null, on = false;
  const MAX = 0.11; // master ceiling — ambient, felt more than heard

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Drone: three low partials through a gentle lowpass; each gain is nudged
    // by a slow LFO so the pad breathes instead of sitting static.
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 440; lp.Q.value = 0.6;
    lp.connect(master);
    [55, 82.41, 110].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sine';
      o.frequency.value = f; o.detune.value = (i - 1) * 6;
      const g = ctx.createGain(); g.gain.value = i === 2 ? 0.11 : 0.19;
      o.connect(g); g.connect(lp); o.start();
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + i * 0.031;
      const lg = ctx.createGain(); lg.gain.value = 0.05;
      lfo.connect(lg); lg.connect(g.gain); lfo.start();
    });
    return true;
  }

  function setOn(next) {
    if (next && !ctx && !build()) return; // no Web Audio → leave toggle off
    on = next;
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('on', on);
    const now = ctx.currentTime;
    ctx.resume?.();
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(on ? MAX : 0, now + (on ? 1.2 : 0.5));
  }

  btn.addEventListener('click', () => setOn(!on));

  // Section-change swell — a short band-passed noise whoosh that sweeps upward.
  // Silent until sound is enabled; cheap enough to fire on every section entry.
  function swell() {
    if (!on || !ctx) return;
    const dur = 1.1, now = ctx.currentTime;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(500, now);
    bp.frequency.linearRampToValueAtTime(1900, now + dur);
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.05, now + 0.2);
    g.gain.linearRampToValueAtTime(0, now + dur);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(now); src.stop(now + dur);
  }

  return { swell };
}
