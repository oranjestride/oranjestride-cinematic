// ============================================================================
// scene.js — persistent Three.js layer on #gl-canvas, composited OVER section
// videos and UNDER the UI (§3.3). Owns: ember field, globe (Tour), radial grid
// (Consulting), and the recurring mascot. Driven by main.js via the returned API.
// ============================================================================
import * as THREE from 'three';
import { makeGlowSprite, createEmbers } from './particles.js';
import { createGlobe, createRadialGrid } from './globe.js';
import { createMascot } from './mascot.js';

// Per-section mascot anchors (world space) — null → hidden for that section (§6).
const ANCHORS = {
  hero:       { p: new THREE.Vector3(4.4, -0.6, 2), s: 1.15, run: true },
  programmes: { p: new THREE.Vector3(-4.6, -1.2, 2), s: 0.95, run: true },
  tour:       { p: new THREE.Vector3(0, -2.6, 3.4), s: 0.7, run: false },
  contact:    { p: new THREE.Vector3(0, -0.3, 3), s: 1.1, run: true },
};

// No-op API so main.js can always call safely (reduced-motion / no-WebGL).
function stubAPI() {
  return { enabled: false, setActive() {}, setScrollVelocity() {}, setPointer() {} };
}

export function initScene({ reduced }) {
  const canvas = document.getElementById('gl-canvas');
  if (reduced || !canvas || !window.WebGLRenderingContext) return stubAPI();

  const mobile = matchMedia('(max-width: 900px)').matches;
  const DPR = Math.min(devicePixelRatio || 1, 2); // cap DPR (§3.8)

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !mobile });
  } catch (_) {
    return stubAPI(); // WebGL unavailable → gracefully skip
  }
  renderer.setPixelRatio(DPR);
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 12);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xff8a3a, 1.4); key.position.set(4, 6, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0x2a4a6a, 0.9); rim.position.set(-6, -2, 4); scene.add(rim);

  const sprite = makeGlowSprite(new THREE.Color('#ff6a00'));

  // ~70% fewer particles on mobile (§3.7)
  const count = mobile ? Math.round(1400 * 0.3) : 1400;
  const embers = createEmbers({ count, sprite, mobile });
  scene.add(embers.points);

  const globe = createGlobe(); scene.add(globe.group);
  const radial = createRadialGrid(); scene.add(radial.group);
  const mascot = createMascot(); scene.add(mascot.group);

  // ---- state driven by main.js ----
  let activeId = 'hero';
  let scrollVel = 0;
  const pointer = new THREE.Vector2(0, 0);
  const pointerLerp = new THREE.Vector2(0, 0);
  let mascotTarget = ANCHORS.hero;
  let running = true;

  const API = {
    enabled: true,
    setActive(id) {
      activeId = id;
      globe.group.visible = id === 'tour';
      radial.group.visible = id === 'consulting';
      mascotTarget = ANCHORS[id] || null;
      running = !!(mascotTarget && mascotTarget.run);
    },
    setScrollVelocity(v) { scrollVel = v; },
    setPointer(x, y) { pointer.set(x, y); },
  };

  const lerpScale = (obj, target, a) => obj.scale.setScalar(THREE.MathUtils.lerp(obj.scale.x, target, a));
  const clock = new THREE.Clock();

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    pointerLerp.lerp(pointer, 0.05);

    embers.update(scrollVel, pointerLerp);

    if (globe.group.visible || globe.group.scale.x > 0.02) globe.update();
    lerpScale(globe.group, globe.group.visible ? 1 : 0.01, 0.08);

    if (radial.group.visible) radial.update();

    mascot.update(dt, t, { pointerLerp, scrollVel, running, target: mascotTarget });

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }, { passive: true });

  return API;
}
