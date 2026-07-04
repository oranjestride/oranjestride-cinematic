// ============================================================================
// Preloader — cinematic video loader (§5): Marut flies through golden clouds
// on a seamless loop while REAL load progress fills the bar; when everything
// is actually ready he dives into the portal (played once) and the footage's
// own vortex becomes the wipe into the page, holding briefly on 3D "MARUT"
// text (§7 — the only place his name appears as visible copy).
//
// Fallback chain (§5.4):
//   video loop (desktop + capable connections)
//   → canvas particle-emblem loader (no video / slow start / save-data)
//   → static branded flash under ~300ms (prefers-reduced-motion)
// ============================================================================
import gsap from 'gsap';
import { videoPath, posterPath, mascotGLBPath, wordmark } from '../utils/helpers.js';

const FONT_URL = `${import.meta.env.BASE_URL}fonts/space-grotesk-700.ttf`;

export function renderPreloader() {
  return `
  <div id="preloader">
    <video class="pre-video" id="pre-video" muted playsinline autoplay loop
           preload="auto" src="${videoPath('mascot-flight-loop')}"
           poster="${posterPath('mascot-flight-loop')}" aria-hidden="true"></video>
    <div class="pre-video-scrim" aria-hidden="true"></div>

    <!-- Static branded loader: canvas emblem (no-video fallback) -->
    <div class="pre-inner">
      <canvas id="pre-canvas" width="520" height="520"></canvas>
      <div class="pre-word">${wordmark()}</div>
    </div>

    <!-- HUD: shared by both loader modes -->
    <div class="pre-hud">
      <div class="pre-hud-word">${wordmark()}</div>
      <div class="pre-bar"><i id="pre-fill"></i></div>
      <span class="pre-pct" id="pre-pct">0</span>
    </div>

    <!-- DOM name reveal — fallback when the 3D text can't render (§7.3) -->
    <div class="marut-name" id="marut-name" aria-hidden="true">MARUT</div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Real progress (§5.2): weighted Promise fan-in over what the page genuinely
// waits on. Every entry races a timeout so a wedged asset can't hang the show.
// ---------------------------------------------------------------------------
const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

function realProgress(onStep) {
  const steps = [];
  const track = (weight, promise) => steps.push(
    withTimeout(promise, 8000).catch(() => {}).then(() => onStep(weight)));

  // fonts
  track(0.15, document.fonts?.ready || Promise.resolve());

  // hero poster decoded
  const poster = new Image();
  poster.src = posterPath('hero-opening');
  track(0.15, poster.decode ? poster.decode() : Promise.resolve());

  // hero video metadata (src is lazy-assigned by initVideos before we run)
  const heroV = document.querySelector('#hero .sec-video');
  track(0.2, !heroV ? Promise.resolve() : heroV.readyState >= 1
    ? Promise.resolve()
    : new Promise((res) => heroV.addEventListener('loadedmetadata', res, { once: true })));

  // mascot GLB reachable? (content-type sniff — an SPA-fallback HTML 200 is a miss)
  track(0.2, fetch(mascotGLBPath(), { method: 'HEAD' })
    .then((h) => { if (!h.ok || (h.headers.get('content-type') || '').includes('text/html')) throw 0; }));

  // full window load
  track(0.3, document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise((res) => addEventListener('load', res, { once: true })));

  return Promise.all(steps);
}

// ---------------------------------------------------------------------------
// 3D name reveal (§7): troika SDF text in the shared Three scene, riding the
// wipe timeline. Resolves null on any failure → caller uses the DOM fallback.
// ---------------------------------------------------------------------------
async function mountMarut3D() {
  const api = window.OS3D;
  if (!api?.enabled || !api.three) return null;
  try {
    const { Text } = await import('troika-three-text');
    const t = new Text();
    t.text = 'MARUT';
    t.font = FONT_URL;
    t.fontSize = 1.7;
    t.letterSpacing = 0.08;
    t.anchorX = 'center';
    t.anchorY = 'middle';
    t.color = 0xff6a00;
    t.outlineWidth = 0.045;            // dark rim reads as a bevel against the glow
    t.outlineColor = 0x1e2d3d;
    t.outlineOpacity = 0.9;
    t.fillOpacity = 0;
    t.position.set(0, 0.2, 2);
    t.renderOrder = 10;
    await new Promise((res) => { t.sync(res); });
    api.three.scene.add(t);
    return {
      obj: t,
      setOpacity(o) { t.fillOpacity = o; t.outlineOpacity = o * 0.9; },
      dispose() { api.three.scene.remove(t); t.dispose(); },
    };
  } catch (err) {
    console.warn('[preloader] 3D name reveal unavailable, using DOM fallback:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
export function initPreloader({ reduced, onDone }) {
  const pre = document.getElementById('preloader');
  const fill = document.getElementById('pre-fill');
  const pct = document.getElementById('pre-pct');
  const video = document.getElementById('pre-video');
  const cv = document.getElementById('pre-canvas');
  document.body.classList.add('locked');

  const finishSimple = (delay) => {
    setTimeout(() => {
      pre.classList.add('done');
      document.body.classList.remove('locked');
      onDone?.();
      setTimeout(() => pre.remove(), 1000);
    }, delay);
  };

  // --- Reduced motion: static branded flash, no video, no 3D text (§5.4/§9) ---
  if (reduced) {
    pre.classList.add('static-mode', 'flash');
    video.removeAttribute('src');
    finishSimple(260);
    return;
  }

  // --- Progress state (shared by both modes) ---
  let target = 0, shown = 0, done = false;
  const progressP = realProgress((w) => { target = Math.min(1, target + w); });
  const minHold = new Promise((r) => setTimeout(r, 1800));
  (function raf() {
    if (done) return;
    shown += (target * 100 - shown) * 0.08;
    if (fill) fill.style.width = `${shown}%`;
    if (pct) pct.textContent = `${Math.round(shown)}`;
    requestAnimationFrame(raf);
  })();

  // --- Mode pick: save-data / 2g / video failure → static canvas loader ---
  let mode = 'video';
  const conn = navigator.connection;
  if (conn && (conn.saveData || /(^|\b)2g/.test(conn.effectiveType || ''))) mode = 'static';

  const goStatic = () => {
    if (mode === 'static-live') return;
    mode = 'static-live';
    pre.classList.add('static-mode');
    video.pause();
    video.removeAttribute('src');
    if (cv) runEmblem(cv);
  };

  if (mode === 'static') goStatic();
  else {
    // slow-start gate (§5.4): if the loop can't begin within ~1.6s, drop to static
    const gate = setTimeout(() => { if (video.readyState < 2 && video.paused) goStatic(); }, 1600);
    video.addEventListener('error', () => { clearTimeout(gate); goStatic(); }, { once: true });
    video.play().catch(() => {});
    video.addEventListener('playing', () => clearTimeout(gate), { once: true });
  }

  // Pre-warm the portal segment once the loop is up (instant swap later).
  const portal = document.createElement('video');
  portal.muted = true; portal.playsInline = true; portal.preload = 'auto';
  setTimeout(() => { if (mode === 'video') portal.src = videoPath('mascot-flight-portal'); }, 900);

  // --- The beat (§5.3): progress done + hold elapsed → portal → vortex wipe ---
  Promise.all([progressP, minHold]).then(async () => {
    done = true;
    if (fill) fill.style.width = '100%';
    if (pct) pct.textContent = '100';

    if (mode !== 'video') { finishSimple(700); revealMarutDOM(); return; }

    // Swap the loop for the one-shot portal dive.
    if (!portal.src) portal.src = videoPath('mascot-flight-portal');
    portal.className = 'pre-video';
    portal.setAttribute('aria-hidden', 'true');
    pre.prepend(portal);
    try { await portal.play(); video.remove(); } catch (_) { portal.remove(); }

    const playing = portal.isConnected ? portal : null;
    const endP = playing
      ? Promise.race([
          new Promise((r) => playing.addEventListener('ended', r, { once: true })),
          new Promise((r) => setTimeout(r, 5600)), // portal is 4.8s — belt & braces
        ])
      : Promise.resolve();
    endP.then(() => vortexWipe());
  });

  // --- Vortex wipe (§5.3) + MARUT reveal (§7), one GSAP timeline ---
  async function vortexWipe() {
    document.body.classList.remove('locked');
    const marut3d = await mountMarut3D();
    const domName = document.getElementById('marut-name');

    const hole = { r: 0 };
    // Centered on the portal/landing spot in the footage (screen center, a
    // touch above middle) — the wipe grows out of the vortex position.
    const CX = 50, CY = 44;
    const apply = () => {
      const m = `radial-gradient(circle at ${CX}% ${CY}%, transparent ${hole.r}%, #000 ${hole.r + 0.5}%)`;
      pre.style.webkitMaskImage = m;
      pre.style.maskImage = m;
    };

    const tl = gsap.timeline({
      onComplete() {
        marut3d?.dispose();
        pre.remove();
        delete window.__loaderTL;
      },
    });
    window.__loaderTL = tl; // QA hook: scripts/qa.mjs seeks this to verify the beat
    // Hero copy cascades in only after the name clears — the wipe opens onto
    // the ambient scene, MARUT reads once, then the headline takes the stage.
    tl.add(() => onDone?.(), 1.9);
    tl.to(hole, { r: 142, duration: 1.25, ease: 'power3.inOut', onUpdate: apply }, 0);

    if (marut3d) {
      window.__marutShown = '3d'; // QA flag (scripts/qa.mjs)
      const s = { o: 0 };
      marut3d.obj.scale.setScalar(0.85);
      tl.to(s, { o: 1, duration: 0.5, ease: 'power2.out', onUpdate: () => marut3d.setOpacity(s.o) }, 0.35)
        .to(marut3d.obj.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'power3.out' }, 0.35)
        .to(s, { o: 0, duration: 0.55, ease: 'power2.in', onUpdate: () => marut3d.setOpacity(s.o) }, 1.75);
    } else {
      revealMarutDOM(0.35);
    }
  }

  // DOM name reveal (§7.3 fallback). Re-parented to <body> so neither the
  // preloader's wipe mask nor its removal can clip the beat mid-read.
  function revealMarutDOM(delay = 0) {
    const domName = document.getElementById('marut-name');
    if (!domName) return;
    window.__marutShown = 'dom'; // QA flag (scripts/qa.mjs)
    document.body.appendChild(domName);
    gsap.timeline({ onComplete: () => domName.remove() })
      .set(domName, { xPercent: -50, yPercent: -50, scale: 0.9 })
      .to(domName, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out', delay })
      .to(domName, { opacity: 0, duration: 0.5, ease: 'power2.in' }, '+=0.7');
  }
}

// Canvas particle emblem — the pre-video-era loader, kept as the static
// fallback tier (§5.4): orange particles converge into the diamond and ignite.
function runEmblem(cv) {
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
  const outline = [[0, -120], [70, 0], [0, 120], [-70, 0]];
  const targets = [];
  for (let e = 0; e < 4; e++) {
    const a = outline[e], b = outline[(e + 1) % 4];
    for (let i = 0; i < 30; i++) {
      const t = i / 30;
      targets.push([cx + a[0] + (b[0] - a[0]) * t, cy + a[1] + (b[1] - a[1]) * t]);
    }
  }
  const parts = targets.map((t) => ({
    x: cx + (Math.random() - 0.5) * W, y: cy + (Math.random() - 0.5) * H, tx: t[0], ty: t[1],
  }));
  const start = performance.now();
  (function draw(now) {
    const el = (now - start) / 1000;
    const conv = Math.min(1, el / 1.4);
    const ignite = Math.max(0, (el - 1.4) / 0.8);
    ctx.clearRect(0, 0, W, H);
    parts.forEach((p) => {
      p.x += (p.tx - p.x) * 0.06;
      p.y += (p.ty - p.y) * 0.06;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6 + ignite * 1.5, 0, 7);
      ctx.fillStyle = `rgba(255,${(106 + ignite * 80) | 0},0,${0.5 + conv * 0.5})`;
      ctx.shadowBlur = 8 + ignite * 24;
      ctx.shadowColor = '#ff6a00';
      ctx.fill();
    });
    if (ignite > 0) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 120); ctx.lineTo(cx + 70, cy);
      ctx.lineTo(cx, cy + 120); ctx.lineTo(cx - 70, cy); ctx.closePath();
      ctx.strokeStyle = `rgba(255,140,40,${Math.min(1, ignite)})`;
      ctx.lineWidth = 2; ctx.shadowBlur = 30; ctx.stroke();
    }
    if (el < 2.6) requestAnimationFrame(draw);
  })(start);
}
