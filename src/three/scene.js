// ============================================================================
// scene.js — persistent Three.js layer on #gl-canvas, composited OVER section
// videos and UNDER the UI (§3.3). Owns: ember field, globe (Tour), radial grid
// (Consulting). The character mascot lives in the DOM (src/three/mascot.js);
// its optional live Hero mesh mounts here via the exposed `three` hook.
// ============================================================================
import * as THREE from 'three';
import { makeGlowSprite, createEmbers } from './particles.js';
import { createGlobe, createRadialGrid } from './globe.js';

// No-op API so main.js can always call safely (reduced-motion / no-WebGL).
function stubAPI() {
  return { enabled: false, three: null, setActive() {}, setScrollVelocity() {}, setPointer() {} };
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
  // Filmic grade — without tone mapping the single-texture mascot reads as
  // flat dark plastic; ACES matches the footage's warm cinematic register.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 12);

  // Image-based lighting: PBR materials need an environment to have body.
  import('three/examples/jsm/environments/RoomEnvironment.js').then(({ RoomEnvironment }) => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }).catch(() => {});

  scene.add(new THREE.AmbientLight(0xfff1e0, 0.5));
  const key = new THREE.DirectionalLight(0xffa45c, 1.5); key.position.set(4, 6, 8); scene.add(key);
  // Cool rim kept faint — at 0.9 it used to drown the jacket in teal.
  const rim = new THREE.DirectionalLight(0x35507a, 0.45); rim.position.set(-6, -2, 4); scene.add(rim);
  // Front fill from the camera so the mascot's face/jacket read against dark footage.
  const fill = new THREE.DirectionalLight(0xfff2e6, 1.05); fill.position.set(0, 2, 12); scene.add(fill);

  const sprite = makeGlowSprite(new THREE.Color('#ff6a00'));

  // ~70% fewer particles on mobile (§3.7)
  const count = mobile ? Math.round(1400 * 0.3) : 1400;
  const embers = createEmbers({ count, sprite, mobile });
  scene.add(embers.points);

  const globe = createGlobe(); scene.add(globe.group);
  const radial = createRadialGrid(); scene.add(radial.group);

  // ---- state driven by main.js ----
  let activeId = 'hero';
  let scrollVel = 0;
  const pointer = new THREE.Vector2(0, 0);
  const pointerLerp = new THREE.Vector2(0, 0);

  // per-frame callbacks + live mascot instances (mounted async via mountMascotGLB)
  const tickCbs = [];
  const mascots = [];
  const clock = new THREE.Clock();

  const API = {
    enabled: true,
    three: {
      scene,
      camera,
      addTick: (fn) => tickCbs.push(fn),
      registerMascot: (m) => { mascots.push(m); m.setActive(m.sectionId === activeId); },
    },
    setActive(id) {
      activeId = id;
      // Globe/radial stay hidden: with the canvas raised above content they'd
      // render in front of the section text, and the section videos already
      // carry the globe/tunnel motifs. Kept in-scene for a future 2-canvas pass.
      globe.group.visible = false;
      radial.group.visible = false;
      // Same visibility pattern, generalized per live mascot instance (§2).
      for (const m of mascots) m.setActive(m.sectionId === id);
    },
    setScrollVelocity(v) { scrollVel = v; },
    setPointer(x, y) { pointer.set(x, y); },
  };

  const lerpScale = (obj, target, a) => obj.scale.setScalar(THREE.MathUtils.lerp(obj.scale.x, target, a));

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    pointerLerp.lerp(pointer, 0.05);

    embers.update(scrollVel, pointerLerp);

    if (globe.group.visible || globe.group.scale.x > 0.02) globe.update();
    lerpScale(globe.group, globe.group.visible ? 1 : 0.01, 0.08);

    if (radial.group.visible) radial.update();

    // Only the active section's mascot ticks its mixer — offscreen ones idle (§5).
    for (const m of mascots) if (m.active) m.update({ dt, pointer: pointerLerp, scrollVel });

    for (const fn of tickCbs) fn({ pointer: pointerLerp, scrollVel });

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
