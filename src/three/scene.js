// ============================================================================
// scene.js — persistent Three.js layer on #gl-canvas, composited OVER section
// videos and UNDER the UI (§3.3). Owns: ember field, the showcase floor, and
// the procedural Marut registered by main.js (src/three/marut/). The camera
// is driven per-frame by the scroll showcase (src/three/showcase.js).
// ============================================================================
import * as THREE from 'three';
import { makeGlowSprite, createEmbers } from './particles.js';
import { makeContactShadow } from './marut/textures.js';

// No-op API so main.js can always call safely (reduced-motion / no-WebGL).
function stubAPI() {
  return { enabled: false, three: null, setActive() {}, setScrollVelocity() {}, setPointer() {} };
}

export function initScene({ reduced }) {
  const canvas = document.getElementById('gl-canvas');
  if (reduced || !canvas || !window.WebGLRenderingContext) return stubAPI();

  const mobile = matchMedia('(max-width: 900px)').matches;
  const DPR = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2); // cap DPR (§3.8)

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

  // Vinyl-toy studio rig matched to the reference boards: hemisphere bounce
  // lifts the charcoal blacks with a top-down gradient (a flat warm ambient
  // let them crush), the key is desaturated + top-dominant, and the cool rim
  // comes from BEHIND-left/above so it edges sleeves/legs instead of washing
  // the jacket front.
  scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x3a3f4a, 0.65));
  const key = new THREE.DirectionalLight(0xffd9b0, 1.25); key.position.set(3, 7, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x5f8fd6, 0.6); rim.position.set(-4, 3, -6); scene.add(rim);
  // Front fill from the camera so the mascot's face/jacket read against dark footage.
  const fill = new THREE.DirectionalLight(0xfff4ea, 0.85); fill.position.set(0, 2, 12); scene.add(fill);

  const sprite = makeGlowSprite(new THREE.Color('#ff6a00'));

  // ~70% fewer particles on mobile (§3.7)
  const count = mobile ? Math.round(1400 * 0.3) : 1400;
  const embers = createEmbers({ count, sprite, mobile });
  scene.add(embers.points);

  // Showcase floor: blob contact shadow + faint brand ring ground the mascot
  // as the camera orbits (there's no real ground plane in the footage).
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 48),
    new THREE.MeshBasicMaterial({ map: makeContactShadow(), transparent: true, depthWrite: false, opacity: 0.55 }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.001;
  scene.add(blob);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 1.14, 64),
    new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.002;
  scene.add(ring);

  // ---- state driven by main.js ----
  let activeId = 'hero';
  let scrollVel = 0;
  const pointer = new THREE.Vector2(0, 0);
  const pointerLerp = new THREE.Vector2(0, 0);

  // per-frame callbacks + the live procedural mascot (registered by main.js)
  const tickCbs = [];
  const mascots = [];
  const clock = new THREE.Clock();

  const API = {
    enabled: true,
    three: {
      scene,
      camera,
      addTick: (fn) => tickCbs.push(fn),
      registerMascot: (m) => {
        mascots.push(m);
        m.setActive(m.sectionId === '*' || m.sectionId === activeId);
        if (m.root && !m.root.parent) scene.add(m.root);
      },
    },
    setActive(id) {
      activeId = id;
      // '*' = the showcase mascot: always active, every section.
      for (const m of mascots) m.setActive(m.sectionId === '*' || m.sectionId === id);
    },
    setScrollVelocity(v) { scrollVel = v; },
    setPointer(x, y) { pointer.set(x, y); },
  };

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    pointerLerp.lerp(pointer, 0.05);

    embers.update(scrollVel, pointerLerp);

    // camera passed through for the head-look gate (eases off when orbiting behind)
    for (const m of mascots) if (m.active) m.update({ dt, pointer: pointerLerp, scrollVel, camera });

    for (const fn of tickCbs) fn({ pointer: pointerLerp, scrollVel });

    renderer.render(scene, camera);
    // QA hook (scripts/qa.mjs): live draw-call/triangle budget check (§3.7)
    stats.tris = renderer.info.render.triangles;
    stats.calls = renderer.info.render.calls;
    requestAnimationFrame(tick);
  }
  const stats = (window.__marutStats = { tris: 0, calls: 0 });
  requestAnimationFrame(tick);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }, { passive: true });

  return API;
}
