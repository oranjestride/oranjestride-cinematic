// ============================================================================
// showcase.js — the scroll-driven camera showcase (§rework).
//
// One persistent Marut stands at world origin in the fixed #gl-canvas scene.
// A master GSAP timeline, scrubbed by page scroll, tweens a camera-state proxy
// between per-section waypoints; a per-frame tick applies it (plus pointer
// parallax) to the real camera. Poses/one-shots are NOT scrubbed — the active-
// section IntersectionObserver in main.js calls applySection(id), which
// cross-fades the base pose, turns him, and fires enter one-shots.
// ============================================================================
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $$ } from '../utils/helpers.js';

// Per-section camera waypoints + Marut direction. `pos` = camera, `look` =
// target (offsets Marut into the copy-free half of the frame), yaw in rad.
// loco: forced run weight (null → scroll-velocity driven). enter: one-shot
// fired on first activation. drag: drag-to-rotate enabled while active.
// Framing is declared as `frameX` — the screen fraction (0 left … 1 right)
// where Marut should stand. The camera AIM (tx) that achieves it is solved
// numerically at build time against the live aspect ratio, so waypoints never
// encode projection math and reframe themselves on resize.
const WAYPOINTS = {
  hero:         { pos: [1.6, 1.45, 4.2],  frameX: 0.74, ty: 1.02, fov: 50, pose: 'confident', yaw: -0.3,  look2D: true },
  brand:        { pos: [0.5, 0.4, 2.4],   frameX: 0.72, ty: 1.15, fov: 58, pose: 'idle',      yaw: 0.15,  loco: 0.4 },
  stats:        { pos: [-2.8, 1.9, 5.6],  frameX: 0.50, ty: 1.0,  fov: 50, pose: 'idle',      yaw: 0.6 },
  about:        { pos: [1.7, 1.4, 2.6],   frameX: 0.72, ty: 1.28, fov: 46, pose: 'idle',      yaw: -0.5,  enter: 'wave', look2D: true },
  // card grid fills the frame → he shrinks into the empty top-right corner
  // beside the header (far camera, aim low so he rides high in frame)
  expertise:    { pos: [0.2, 1.6, 7.0],   frameX: 0.80, ty: 0.5,  fov: 44, pose: 'idle',      yaw: 0 },
  // three cards fill the width → small figure top-right, above the card row
  testimonials: { pos: [-1.8, 1.5, 6.0],  frameX: 0.76, ty: 0.42, fov: 48, pose: 'idle',      yaw: 0.55 },
  'mascot-lab': { pos: [0, 1.35, 2.9],    frameX: 0.70, ty: 1.05, fov: 48, pose: 'idle',      yaw: 0,     drag: true, look2D: true },
  // copy left + cards right → he runs small and low, in the seam between them
  programmes:   { pos: [2.6, 1.3, 7.2],   frameX: 0.48, ty: 1.3,  fov: 48, pose: 'runReady',  yaw: -1.35, loco: 0.65 },
  // copy + cards left, metrics panel right → small figure top-right above the panel
  consulting:   { pos: [-1.5, 1.8, 7.5],  frameX: 0.75, ty: 0.35, fov: 44, pose: 'confident', yaw: 0.8 },
  tour:         { pos: [1.9, 1.35, 3.6],  frameX: 0.46, ty: 1.2,  fov: 48, pose: 'point',     yaw: -0.4 },
  clients:      { pos: [0, 1.8, 6.8],     frameX: 0.74, ty: 1.15, fov: 46, pose: 'idle',      yaw: 0 },
  // form right, contact info bottom-left, centred headline → he celebrates
  // in the empty top-left strip, above the info column and left of the copy
  contact:      { pos: [-0.4, 1.3, 5.4],  frameX: 0.11, ty: 0.55, fov: 50, pose: 'openArms',  yaw: 0.15,  enter: 'cheer', look2D: true },
};

// ≤900px the layout stacks full-width (style.css breakpoint), leaving only the
// strip between the nav and each section's label copy-free. Vertical FOV being
// aspect-independent, desktop ty values land Marut mid-frame on the headlines —
// these overrides pull the camera back and aim well below the floor (negative
// ty) so he rides small and high, inside that strip. Merged over WAYPOINTS.
const MOBILE_WAYPOINTS = {
  hero:         { pos: [1.6, 1.0, 8.5],   frameX: 0.78, ty: -0.35, fov: 44 }, // right, between badge + copy
  stats:        { pos: [-2.8, 1.5, 7.0],  frameX: 0.50, ty: -0.55, fov: 44 }, // top-centre above the 2×2 grid
  expertise:    { pos: [0.2, 1.4, 8.0],   frameX: 0.82, ty: -0.1,  fov: 44 }, // right of the headline block
  testimonials: { pos: [-1.8, 1.4, 8.0],  frameX: 0.80, ty: -0.72, fov: 44 },
  'mascot-lab': { pos: [0, 1.3, 7.3],     frameX: 0.50, ty: -0.78, fov: 48 }, // above the stacked lab card
  programmes:   { pos: [2.6, 1.2, 8.5],   frameX: 0.78, ty: -1.05, fov: 44 },
  consulting:   { pos: [-1.5, 1.5, 8.5],  frameX: 0.78, ty: -0.95, fov: 44 },
  tour:         { pos: [1.9, 1.2, 8.5],   frameX: 0.78, ty: -1.05, fov: 44 },
  clients:      { pos: [0, 1.6, 7.0],     frameX: 0.78, ty: 0.05,  fov: 44 }, // tall free column above headline
  contact:      { pos: [-0.4, 1.5, 8.5],  frameX: 0.22, ty: -0.95, fov: 44 }, // top-left, arms clear the edge
};
const isMobile = () => innerWidth <= 900;
const wpFor = (id) =>
  isMobile() && MOBILE_WAYPOINTS[id] ? { ...WAYPOINTS[id], ...MOBILE_WAYPOINTS[id] } : WAYPOINTS[id];

// Solve the camera aim-x so Marut's anchor (0, 1, 0) lands at wp.frameX of the
// screen. The projection flips sign once the aim swings the anchor behind the
// view plane (close cameras hit this well inside ±6), so blind bisection can
// chase the wrap — coarse-scan for a valid bracket first, then bisect in it.
const _solveCam = new THREE.PerspectiveCamera();
const _anchor = new THREE.Vector3();
function solveTx(wp, aspect) {
  _solveCam.fov = wp.fov;
  _solveCam.aspect = aspect;
  _solveCam.updateProjectionMatrix();
  const ndcTarget = wp.frameX * 2 - 1;
  const ndcAt = (tx) => {
    _solveCam.position.set(...wp.pos);
    _solveCam.lookAt(tx, wp.ty, 0);
    _solveCam.updateMatrixWorld();
    _anchor.set(0, 1, 0).applyMatrix4(_solveCam.matrixWorldInverse);
    if (_anchor.z > -0.01) return null; // anchor at/behind camera plane
    return _anchor.applyMatrix4(_solveCam.projectionMatrix).x;
  };
  let bestTx = 0, bestD = Infinity, lo = null, hi = null;
  let prevTx = null, prevV = null;
  for (let i = 0; i <= 48; i++) {
    const tx = -6 + (12 * i) / 48;
    const v = ndcAt(tx);
    if (v === null) { prevTx = null; prevV = null; continue; }
    const d = Math.abs(v - ndcTarget);
    if (d < bestD) { bestD = d; bestTx = tx; }
    if (prevV !== null && (prevV - ndcTarget) * (v - ndcTarget) <= 0) {
      // target crossed between two valid samples — ndc descends as tx grows
      lo = prevTx; hi = tx;
      break;
    }
    prevTx = tx; prevV = v;
  }
  if (lo === null) return bestTx; // no crossing in range — nearest achievable
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const v = ndcAt(mid);
    if (v === null) break; // degenerate sliver — keep current bracket midpoint
    if (v > ndcTarget) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Where the loader wipe opens: a centre-stage close-up, matching the footage's
// landing frame; introToHero() then pulls back to the hero waypoint.
const INTRO_WP = { pos: [0, 1.35, 2.4], frameX: 0.5, ty: 1.15, fov: 48 };

const flat = (wp) => ({
  px: wp.pos[0], py: wp.pos[1], pz: wp.pos[2],
  tx: solveTx(wp, innerWidth / innerHeight), ty: wp.ty, tz: 0,
  fov: wp.fov,
});

export function initShowcase({ sceneAPI, marut, reduced }) {
  if (reduced || !sceneAPI?.enabled || !marut) return null;
  const { camera, addTick } = sceneAPI.three;

  document.body.classList.add('showcase');

  const camState = { ...flat(wpFor('hero')) };
  let tl = null;
  // Enter-gesture bookkeeping: gestures replay on every section RE-entry
  // (a once-per-load Set left revisits feeling dead), with a per-section
  // cooldown so threshold jitter at a boundary can't machine-gun a clip.
  const lastEnterAt = new Map();
  let lastSectionId = null;
  window.__camState = camState; // QA/diag hooks (scripts/qa.mjs)
  window.__cam = camera;
  window.__marutRoot = marut.root;

  // ---- per-frame camera apply (parallax rides on top of the scrub) ----
  addTick(({ pointer }) => {
    camera.position.set(
      camState.px + pointer.x * 0.22,
      camState.py + pointer.y * 0.1,
      camState.pz,
    );
    camera.lookAt(camState.tx, camState.ty, camState.tz);
    if (Math.abs(camera.fov - camState.fov) > 0.01) {
      camera.fov = camState.fov;
      camera.updateProjectionMatrix();
    }
  });

  // ---- master scrub timeline: one segment per section, positioned by the
  //      section's real offset so DOM scroll and camera stay in lockstep ----
  function build() {
    tl?.scrollTrigger?.kill();
    tl?.kill();
    const total = document.documentElement.scrollHeight - innerHeight;
    if (total <= 0) return;
    tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: document.body,
        start: 0,
        end: () => document.documentElement.scrollHeight - innerHeight,
        scrub: 0.9,
        invalidateOnRefresh: true,
      },
    });
    const vh = innerHeight;
    const secs = $$('main .section, main .band').filter((s) => WAYPOINTS[s.id]);
    // Settle as the section top nears the fold (offsetTop − 0.25vh) and HOLD
    // until the next section's transit — short (~1vh) sections otherwise get
    // zero hold and the camera is already leaving while the user reads. Each
    // transit starts no earlier than the previous arrival so segment tweens
    // never overlap (overlapping scrubbed tweens on one proxy glitch on jumps).
    let prevArrive = 0;
    for (const sec of secs) {
      const wp = wpFor(sec.id);
      const anchor = Math.max(0, Math.min(total, sec.offsetTop - vh * 0.25));
      const arrive = anchor / total;
      const start = Math.max(prevArrive, (anchor - vh * 0.55) / total);
      tl.to(camState, { ...flat(wp), duration: Math.max(0.015, arrive - start) }, start);
      prevArrive = Math.max(prevArrive, arrive);
    }
    // Segment times above are scroll FRACTIONS — pin the timeline duration to
    // exactly 1 so ScrollTrigger's progress→time mapping is 1:1 (otherwise
    // every waypoint fires early by the duration skew).
    tl.set({}, {}, 1);
    window.__showTL = tl; // QA/diag hook
  }
  build();

  // rebuild whenever layout shifts (tab switches, modal open, resize)
  ScrollTrigger.addEventListener('refreshInit', build);
  addEventListener('resize', () => ScrollTrigger.refresh(), { passive: true });

  // ---- drag-to-rotate (mascot-lab): proven touch-action pattern from the
  //      old GLB mount, feeding the animator's yaw channels ----
  let dragEnabled = false;
  const lab = document.getElementById('mascotlab-mount');
  if (lab) {
    lab.style.touchAction = 'pan-y';
    lab.classList.add('mascot-drag');
    let lastX = 0, lastMoveT = 0, down = false;
    lab.addEventListener('pointerdown', (e) => {
      if (!dragEnabled || (e.button !== 0 && e.pointerType === 'mouse')) return;
      down = true; lastX = e.clientX; lastMoveT = e.timeStamp;
      marut.setDragging(true);
      lab.setPointerCapture?.(e.pointerId);
      lab.classList.add('dragging');
      document.body.classList.add('mascot-dragged');
    });
    lab.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - lastX; lastX = e.clientX; lastMoveT = e.timeStamp;
      marut.addDragYaw(dx * 0.008);
      lab.style.setProperty('--spin', Math.min(1, Math.abs(dx * 0.008) * 5).toFixed(2));
    });
    const end = (e) => {
      if (!down) return;
      down = false;
      lab.classList.remove('dragging');
      marut.setDragging(false);
      // procedural animator only — the GLB adapter has no inertia channel
      if (e.timeStamp - lastMoveT > 120 && marut.anim) marut.anim.dragVel = 0;
    };
    lab.addEventListener('pointerup', end);
    lab.addEventListener('pointercancel', end);
    lab.addEventListener('lostpointercapture', end);
  }

  return {
    // Pose/turn/one-shot per section — called from main.js's active-section IO.
    applySection(id) {
      const wp = wpFor(id);
      if (!wp) return;
      marut.setBasePose(wp.pose, 0.8);
      marut.setYaw(wp.yaw, 1.0);
      marut.setLocomotion(wp.loco ?? null);
      marut.setLookEnabled(!!wp.look2D);
      dragEnabled = !!wp.drag;
      if (lab) lab.style.pointerEvents = dragEnabled ? 'auto' : 'none';
      if (wp.enter && id !== lastSectionId) {
        const now = performance.now();
        if ((lastEnterAt.get(id) ?? -1e9) + 4000 < now) {
          lastEnterAt.set(id, now);
          gsap.delayedCall(0.45, () => marut.play(wp.enter));
        }
      }
      lastSectionId = id;
    },

    // Loader hand-over: wipe opens on the close-up, camera pulls back to the
    // hero frame, Marut waves. Returns the tween so intro.js can chain.
    // Deep loads (reload mid-page, anchor links) skip the glide — this tween
    // is created AFTER the scrub timeline's, so it would win the camState
    // fight and strand the camera on the hero frame until the next scroll.
    introToHero(mode) {
      if (scrollY > innerHeight * 0.5) return gsap.to({}, { duration: 0.01 });
      const delay = mode === 'video' ? 1.05 : 0.4;
      return gsap.to(camState, {
        ...flat(wpFor('hero')),
        duration: 1.5,
        ease: 'power3.inOut',
        delay,
        onComplete: () => marut.play('wave'),
      });
    },

    prepareIntro() {
      if (scrollY > innerHeight * 0.5) return;
      Object.assign(camState, flat(INTRO_WP));
    },
    refresh() { ScrollTrigger.refresh(); },
  };
}
