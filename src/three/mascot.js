// ============================================================================
// mascot.js — OranjeStride character mascot (§6 Phase B).
//
// "One 3D asset, many flat renders" — the same pattern breachbunny uses.
// Most sections show a pre-rendered pose still (public/img/mascot/poses/*.webp)
// with a floating bob, drop-shadow, and cursor parallax. The Hero optionally
// upgrades to the live rigged mesh (public/models/mascot.glb) when that Phase A
// asset exists; until then the Hero shows the idle cutout like everywhere else.
//
// Phase A (produce mascot.glb + pose renders in Meshy/Tripo + Mixamo) happens
// OUTSIDE the build — see README §(e). This module never hard-depends on it.
// ============================================================================
import * as THREE from 'three';
import { $, $$, posePath, mascotGLBPath } from '../utils/helpers.js';

// pose file → fallback chain (a missing pose degrades to the idle cutout).
function poseSources(pose) {
  return [posePath(pose, 'webp'), posePath('idle', 'webp'), posePath('idle', 'png')];
}

// Assign each mascot <img> its pose with a graceful fallback chain.
function wireImages() {
  $$('.mascot-img').forEach((img) => {
    const pose = img.closest('.mascot')?.dataset.pose || 'idle';
    const srcs = poseSources(pose);
    let i = 0;
    img.onerror = () => {
      i += 1;
      if (i < srcs.length) img.src = srcs[i];
      else img.onerror = null;
    };
    img.src = srcs[0];
  });
}

// Cursor parallax (subtle rotate/translate) on every on-screen mascot (§6 B.2).
function initParallax(reduced) {
  if (reduced || matchMedia('(hover: none)').matches) return;
  let tx = 0, ty = 0, cx = 0, cy = 0;
  addEventListener('mousemove', (e) => {
    tx = (e.clientX / innerWidth) * 2 - 1;
    ty = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
  (function loop() {
    cx += (tx - cx) * 0.06;
    cy += (ty - cy) * 0.06;
    const rx = (-cy * 5).toFixed(2);
    const ry = (cx * 7).toFixed(2);
    const px = (cx * 10).toFixed(1);
    document.documentElement.style.setProperty('--mascot-rx', `${rx}deg`);
    document.documentElement.style.setProperty('--mascot-ry', `${ry}deg`);
    document.documentElement.style.setProperty('--mascot-px', `${px}px`);
    requestAnimationFrame(loop);
  })();
}

// Reveal section mascots as they scroll into view (cross-fade in).
function initReveal() {
  const io = new IntersectionObserver((ens) => {
    ens.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('mascot-in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.15 });
  $$('.mascot:not(.mascot--nav):not(.mascot--pre)').forEach((m) => io.observe(m));
  // nav + preloader mascots are visible immediately
  $$('.mascot--nav, .mascot--pre').forEach((m) => m.classList.add('mascot-in'));
}

/**
 * Boot the DOM pose-swap mascots. Call after the section markup is in the DOM.
 */
export function initMascots({ reduced }) {
  wireImages();
  initReveal();
  initParallax(reduced);
}

// ---------------------------------------------------------------------------
// Live-3D mascot (§6 Phase B.1 / update §2). The rigged, decimated
// public/models/mascot.glb is loaded ONCE and cached at module scope; each
// section that wants a live instance clones the skinned mesh via SkeletonUtils
// (no re-fetch/re-parse) and gets its own AnimationMixer. Clip names are matched
// by regex so a Mixamo export named Idle/Wave/Run just works. A GLB with no clips
// (e.g. a static mesh) still mounts and gets a procedural idle bob + cursor turn.
//
// Fallback-safe: if the GLB is absent (404), oversized/malformed, or WebGL is
// off, mountMascotGLB resolves to null and the caller keeps the flat pose still.
// ---------------------------------------------------------------------------

const CLIP_RE = {
  idle: /idle|breath/i,
  wave: /wave|greet/i,
  run: /run|stride|walk/i,
  cheer: /clap|cheer/i,
};

let sharedGLBPromise = null; // single fetch/parse for the whole page

function loadSharedGLB() {
  if (sharedGLBPromise) return sharedGLBPromise;
  sharedGLBPromise = (async () => {
    const url = mascotGLBPath();
    try {
      const head = await fetch(url, { method: 'HEAD' });
      const type = head.headers.get('content-type') || '';
      // A missing GLB often 200s as the SPA index.html fallback (Vite dev / some
      // static hosts). Treat an HTML response as "no GLB" so we never try to
      // parse markup as a model — keep the flat pose fallback instead.
      if (!head.ok || type.includes('text/html')) return null;
    } catch (_) {
      return null;
    }
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync(url);
    return { scene: gltf.scene, animations: gltf.animations || [] };
  })().catch((err) => {
    console.warn('[mascot] shared GLB load failed, using flat fallbacks:', err);
    return null;
  });
  return sharedGLBPromise;
}

/**
 * Mount one live mascot instance into the shared Three.js scene.
 * @param sceneAPI  window.OS3D (must be .enabled with a .three hook)
 * @param opts.anchor      {x,y,z} world position
 * @param opts.scale       uniform scale
 * @param opts.sectionId   section id whose active state drives visibility + mixer
 * @param opts.loop        default looping clip name ('idle')
 * @param opts.onEnterClip one-shot clip on first activation ('wave')
 * @param opts.react       look toward the cursor (hero/about)
 * @param opts.runBlend    blend the run clip in by scroll velocity (hero/programmes)
 * @returns instance handle, or null if no usable GLB (caller keeps flat pose)
 */
const _v = new THREE.Vector3();
// Project a screen point onto the world plane at z=zPlane for the given camera.
function screenToWorld(camera, x, y, zPlane) {
  _v.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1, 0.5).unproject(camera);
  _v.sub(camera.position).normalize();
  const dist = (zPlane - camera.position.z) / _v.z;
  return camera.position.clone().add(_v.multiplyScalar(dist));
}

export async function mountMascotGLB(sceneAPI, opts = {}) {
  if (!sceneAPI?.enabled || !sceneAPI.three) return null;
  const shared = await loadSharedGLB();
  if (!shared) return null;

  const { clone } = await import('three/examples/jsm/utils/SkeletonUtils.js');
  const { scene, camera, registerMascot } = sceneAPI.three;
  const { mountId = null, anchor = { x: 0, y: 0, z: 2 }, scale = 2.4, sectionId,
    loop = 'idle', onEnterClip = null, react = false, runBlend = false, faceFlip = false } = opts;
  const zPlane = opts.zPlane ?? anchor.z ?? 2;

  const model = clone(shared.scene);
  model.visible = false;
  model.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) o.frustumCulled = false; });
  scene.add(model);

  // Measure bind-pose bounds (world matrices must be current) to auto-fit + ground
  // the model to a DOM box regardless of its origin/native units.
  model.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(model);
  let modelH = box.max.y - box.min.y;
  if (!isFinite(modelH) || modelH < 0.05) modelH = 1.8; // degenerate → sane default
  const footY = box.min.y;                       // lowest point (feet)
  const centerX = (box.max.x + box.min.x) / 2;    // horizontal centre
  const baseYaw = faceFlip ? Math.PI : 0;

  const clips = shared.animations;
  const mixer = clips.length ? new THREE.AnimationMixer(model) : null;
  const findClip = (name) => clips.find((c) => (CLIP_RE[name] || new RegExp(name, 'i')).test(c.name));
  const action = (name) => { const c = findClip(name); return c && mixer ? mixer.clipAction(c) : null; };

  const loopAction = action(loop);
  if (loopAction) loopAction.play();
  const runAction = runBlend ? action('run') : null;

  let t = 0, runW = 0;

  // Fixed-anchor fallback when no DOM mount is given.
  if (!mountId) { model.position.set(anchor.x, anchor.y, zPlane); model.scale.setScalar(scale); }

  const inst = {
    sectionId,
    group: model,
    active: false,
    entered: false,
    setActive(on) {
      this.active = on;
      model.visible = on;
      if (on && !this.entered) {
        this.entered = true;
        const a = onEnterClip && action(onEnterClip);
        if (a) { a.reset(); a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; a.play(); }
      }
    },
    // Called by scene.js tick ONLY while this section is active (mixer paused otherwise).
    update({ dt, pointer, scrollVel }) {
      t += dt;
      if (mixer) mixer.update(dt);

      // Track the DOM mount: place feet at the box bottom, auto-fit height to it.
      const el = mountId && document.getElementById(mountId);
      if (el) {
        const r = el.getBoundingClientRect();
        const bottom = screenToWorld(camera, r.left + r.width / 2, r.bottom, zPlane);
        const top = screenToWorld(camera, r.left + r.width / 2, r.top, zPlane);
        const s = ((top.y - bottom.y) * 0.86) / modelH;
        model.scale.setScalar(s);
        // ground feet at box bottom, centre horizontally (independent of origin)
        model.position.set(bottom.x - centerX * s, bottom.y - footY * s, zPlane);
      } else if (!mixer) {
        model.position.y = anchor.y + Math.sin(t * 1.5) * 0.12; // static GLB → procedural bob
      }

      if (react) {
        model.rotation.y += ((baseYaw + pointer.x * 0.5) - model.rotation.y) * 0.06;
        model.rotation.x += ((-pointer.y * 0.12) - model.rotation.x) * 0.06;
      } else {
        model.rotation.y = baseYaw;
      }
      if (runAction) {
        const target = Math.min(1, Math.abs(scrollVel) * 40);
        runW += (target - runW) * 0.08;
        runAction.setEffectiveWeight(runW).play();
      }
    },
  };

  registerMascot(inst);
  return inst;
}
