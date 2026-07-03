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
import { $, $$, posePath, mascotGLBPath, mascotAnimsPath } from '../utils/helpers.js';

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

// Does a URL resolve to a real binary asset (not the SPA index.html fallback,
// which many static hosts / Vite dev return as HTML 200 for missing files)?
async function assetExists(url) {
  try {
    const head = await fetch(url, { method: 'HEAD' });
    const type = head.headers.get('content-type') || '';
    return head.ok && !type.includes('text/html');
  } catch (_) {
    return false;
  }
}

// Retarget clip track names to the model's actual bone names. Bridges the common
// Mixamo mismatch where FBX uses "mixamorig:Hips" but the glTF model has
// "mixamorigHips" (or "Hips"), which would otherwise silently fail to bind.
function remapClipsToSkeleton(clips, model) {
  const norm = (n) => n.replace(/^mixamorig[:_]?/i, '').replace(/[:_\s]/g, '').toLowerCase();
  const byNorm = new Map();
  model.traverse((o) => { if (o.isBone) byNorm.set(norm(o.name), o.name); });
  if (!byNorm.size) return clips;
  return clips.map((clip) => {
    const c = clip.clone();
    c.tracks = c.tracks.map((tr) => {
      const dot = tr.name.lastIndexOf('.');
      const node = tr.name.slice(0, dot);
      const prop = tr.name.slice(dot);
      const target = byNorm.get(norm(node));
      if (!target || target === node) return tr;
      const t = tr.clone(); t.name = target + prop; return t;
    });
    return c;
  });
}

// Load animation clips from a SEPARATE file (Mixamo). Tries .glb then .fbx.
async function loadSeparateAnims() {
  const glb = mascotAnimsPath('glb');
  if (await assetExists(glb)) {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const g = await new GLTFLoader().loadAsync(glb);
    if (g.animations?.length) return g.animations;
  }
  const fbx = mascotAnimsPath('fbx');
  if (await assetExists(fbx)) {
    const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
    const f = await new FBXLoader().loadAsync(fbx);
    if (f.animations?.length) return f.animations;
  }
  return [];
}

let sharedGLBPromise = null; // single fetch/parse for the whole page

function loadSharedGLB() {
  if (sharedGLBPromise) return sharedGLBPromise;
  sharedGLBPromise = (async () => {
    const url = mascotGLBPath();
    if (!(await assetExists(url))) return null; // no model → flat fallback everywhere

    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync(url);

    // Prefer the model's embedded clips; if it's a static model, pull clips from
    // a separate Mixamo file. Retarget either way so track names bind to bones.
    let animations = gltf.animations?.length ? gltf.animations : await loadSeparateAnims();
    if (animations.length) animations = remapClipsToSkeleton(animations, gltf.scene);

    return { scene: gltf.scene, animations };
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

// World-space AABB of the POSED skeleton. Box3.setFromObject is degenerate for
// skinned meshes, and SkinnedMesh.computeBoundingBox needs bone matrices that are
// only valid during render — so we measure the bones directly (reliable Object3D
// world positions after updateWorldMatrix), which bound the character well enough
// for framing. A small margin accounts for flesh beyond the bone tips.
const _c = new THREE.Vector3();
function worldSkinnedBox(root) {
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3(); box.makeEmpty();
  let bones = 0;
  root.traverse((o) => { if (o.isBone) { o.getWorldPosition(_c); box.expandByPoint(_c); bones++; } });
  if (!bones) { // no skeleton (static mesh) → fall back to object bounds
    return new THREE.Box3().setFromObject(root);
  }
  box.expandByScalar((box.max.y - box.min.y) * 0.08); // margin for hands/feet/head
  return box;
}

export async function mountMascotGLB(sceneAPI, opts = {}) {
  if (!sceneAPI?.enabled || !sceneAPI.three) return null;
  const shared = await loadSharedGLB();
  if (!shared) return null;

  const { clone } = await import('three/examples/jsm/utils/SkeletonUtils.js');
  const { scene, camera, registerMascot } = sceneAPI.three;
  const { mountId = null, anchor = { x: 0, y: 0, z: 2 }, sectionId,
    loop = 'idle', onEnterClip = null, react = false, runBlend = false, faceFlip = false,
    dragRotate = false } = opts;
  const zPlane = opts.zPlane ?? anchor.z ?? 2;

  const model = clone(shared.scene);
  model.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) o.frustumCulled = false; });

  // rig (position/scale/facing) → inner (stand-up orientation) → model.
  // Keeping facing (rig.rotation.y) separate from stand-up (inner.rotation.x)
  // avoids gimbal tumble when the character turns toward the cursor.
  const inner = new THREE.Group(); inner.add(model);
  const rig = new THREE.Group(); rig.add(inner);
  rig.visible = false;
  scene.add(rig);

  const clips = shared.animations;
  const mixer = clips.length ? new THREE.AnimationMixer(model) : null;
  const findClip = (name) => clips.find((c) => (CLIP_RE[name] || new RegExp(name, 'i')).test(c.name));
  const action = (name) => { const c = findClip(name); return c && mixer ? mixer.clipAction(c) : null; };

  const loopAction = action(loop);
  if (loopAction) loopAction.play();
  const runAction = runBlend ? action('run') : null;
  if (mixer) mixer.update(0.15); // settle into the posed skeleton before measuring

  // Stand the character up if authored Z-up (lies flat → depth ≫ height).
  let wb = worldSkinnedBox(rig);
  let sz = wb.getSize(new THREE.Vector3());
  if (sz.z > sz.y * 1.3) { inner.rotation.x = -Math.PI / 2; wb = worldSkinnedBox(rig); sz = wb.getSize(new THREE.Vector3()); }

  // Validity gate: a usable posed humanoid has real extent and is upright-ish.
  // Some rigs (bad skin weights / bind data from an image-to-3D → Mixamo → Blender
  // chain) COLLAPSE to a point when skinned — that can't render, so bail out and
  // let the caller keep the flat pose fallback (no empty pane).
  const maxDim = Math.max(sz.x, sz.y, sz.z);
  if (!isFinite(maxDim) || maxDim < 1e-5 || sz.y < maxDim * 0.4) {
    console.warn('[mascot] GLB rig collapses when posed — using flat pose fallback.');
    if (mixer) mixer.stopAllAction();
    scene.remove(rig);
    return null;
  }

  // Upright bounds at unit rig scale → drives auto-fit + grounding.
  let modelH = sz.y;
  if (!isFinite(modelH) || modelH < 1e-4) modelH = 1;
  const footY = wb.min.y;
  const centerX = (wb.max.x + wb.min.x) / 2;
  const baseYaw = faceFlip ? Math.PI : 0;
  rig.rotation.y = baseYaw;

  let t = 0, runW = 0;

  // ---- Drag-to-rotate (pointer + touch) on the mount element (§drag) ----
  // touch-action: pan-y keeps vertical page scroll working on mobile while a
  // horizontal drag spins the character. Inertia decays after release.
  let dragYaw = 0, dragVel = 0, dragging = false;
  if (dragRotate && mountId) {
    const el = document.getElementById(mountId);
    if (el) {
      el.style.pointerEvents = 'auto';
      el.style.touchAction = 'pan-y';
      // Above .sec-content (z4) so pointer events reach an overlay mount; the
      // in-flow lab stage is unaffected (nothing stacks over it either way).
      el.style.zIndex = '5';
      el.classList.add('mascot-drag');
      let lastX = 0, lastMoveT = 0;
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        dragging = true; lastX = e.clientX; dragVel = 0; lastMoveT = e.timeStamp;
        el.setPointerCapture?.(e.pointerId);
        el.classList.add('dragging');
        document.body.classList.add('mascot-dragged'); // fades the drag hint
      });
      el.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastX; lastX = e.clientX; lastMoveT = e.timeStamp;
        dragVel = dx * 0.008;
        dragYaw += dragVel;
      });
      // No inertia if the pointer was held still before release (stale velocity).
      const end = (e) => {
        dragging = false; el.classList.remove('dragging');
        if (e.timeStamp - lastMoveT > 120) dragVel = 0;
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('lostpointercapture', end);
    }
  }

  const inst = {
    sectionId,
    group: rig,
    active: false,
    entered: false,
    setActive(on) {
      this.active = on;
      rig.visible = on;
      if (on && !this.entered) {
        this.entered = true;
        this.play(onEnterClip);
      }
    },
    // Play a named clip once on top of the idle loop (chips, section-enter).
    // LoopOnce without clamp auto-stops at the end → the idle loop resumes.
    play(name) {
      const a = name && action(name);
      if (!a) return;
      a.reset();
      a.setLoop(THREE.LoopOnce);
      a.clampWhenFinished = false;
      a.setEffectiveWeight(1);
      a.fadeIn(0.2);
      a.play();
    },
    // Called by scene.js tick ONLY while this section is active (mixer paused otherwise).
    update({ dt, pointer, scrollVel }) {
      t += dt;
      if (mixer) mixer.update(dt);

      // Track the DOM mount: auto-fit height + ground feet at the box bottom.
      const el = mountId && document.getElementById(mountId);
      if (el) {
        const r = el.getBoundingClientRect();
        const bottom = screenToWorld(camera, r.left + r.width / 2, r.bottom, zPlane);
        const top = screenToWorld(camera, r.left + r.width / 2, r.top, zPlane);
        const s = ((top.y - bottom.y) * 0.86) / modelH;
        rig.scale.setScalar(s);
        rig.position.set(bottom.x - centerX * s, bottom.y - footY * s, zPlane);
      } else {
        rig.position.set(anchor.x, anchor.y, zPlane);
        rig.scale.setScalar(anchor.s || 2.4);
      }

      // Face the camera; drag spins (with inertia), cursor adds a subtle turn.
      if (!dragging && Math.abs(dragVel) > 0.0001) { dragYaw += dragVel; dragVel *= 0.94; }
      const targetYaw = baseYaw + dragYaw + (react && !dragging ? pointer.x * 0.4 : 0);
      rig.rotation.y += (targetYaw - rig.rotation.y) * (dragging ? 0.5 : 0.08);

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
