// ============================================================================
// scene.js — persistent Three.js layer on #gl-canvas, composited OVER section
// videos and UNDER the UI (§3.3). Owns: ember field, the showcase floor, and
// the procedural Marut registered by main.js (src/three/marut/). The camera
// is driven per-frame by the scroll showcase (src/three/showcase.js).
// ============================================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { makeGlowSprite, createEmbers } from './particles.js';
import { makeContactShadow } from './marut/textures.js';

// No-op API so main.js can always call safely (reduced-motion / no-WebGL).
function stubAPI() {
  return { enabled: false, three: null, setActive() {}, setScrollVelocity() {}, setPointer() {}, pulse() {} };
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
  // Atmospheric depth: black linear fog starting well BEHIND the mascot. The
  // near-field figure (camera-to-Marut distance ≤ ~8) sits inside `near`, so
  // his materials are untouched and the canvas stays transparent over the
  // footage; only the far ember field dissolves toward black, which — with the
  // embers' additive blend — reads as haze receding into depth rather than a
  // grey wash. Gives the void a sense of volume without a visible ground.
  scene.fog = new THREE.Fog(0x05070c, 15, 34);
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
  // the jacket front. A warm brand-orange counter-rim from behind-right carves
  // the silhouette out of the dark footage (showcase-character convention).
  scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x3a3f4a, 0.65));
  const key = new THREE.DirectionalLight(0xffd9b0, 1.25); key.position.set(3, 7, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x5f8fd6, 1.1); rim.position.set(-4, 3, -6); scene.add(rim);
  const rimWarm = new THREE.DirectionalLight(0xff7a2a, 0.85); rimWarm.position.set(4, 2.5, -5); scene.add(rimWarm);
  // Front fill from the camera so the mascot's face/jacket read against dark footage.
  const fill = new THREE.DirectionalLight(0xfff4ea, 0.85); fill.position.set(0, 2, 12); scene.add(fill);

  // Bloom post-pass (desktop only — mobile keeps the direct render path).
  // Since r152 tone mapping only applies on the default framebuffer, so the
  // composer chain runs in linear HDR: emissives with intensity > threshold
  // bloom "selectively" for free, and OutputPass applies ACES + sRGB at the
  // end. samples:4 restores MSAA that the canvas loses under a composer.
  // Alpha matters here — this canvas composites over the section videos, so
  // the RenderPass clear keeps alpha 0 and bloom adds its halo additively.
  // Software rasterizers (QA's SwiftShader, VMs) collapse to <1fps under the
  // full-res bloom chain + MSAA — skip the composer there so frame-driven
  // logic (intro typing, tweens) still runs; real GPUs take the full path.
  let software = false;
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
    software = /swiftshader|llvmpipe|software|basic render/i.test(gpu);
  } catch (_) { /* keep full path if the probe fails */ }

  let composer = null;
  if (!mobile && !software) {
    const target = new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, {
      type: THREE.HalfFloatType,
      samples: renderer.capabilities.isWebGL2 ? 4 : 0,
    });
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    // threshold sits ABOVE anything lit diffuse can reach (~1.0 with this
    // rig) so only genuine emissives bloom — at 0.9 the orange shoes/hair
    // caught the key light and glowed like lamps
    const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.25, 0.35, 1.25);
    // The stock pass breaks transparent canvases: its blur mips hardcode
    // alpha 1 and the additive blend sums that into the framebuffer, turning
    // the whole background opaque black (hiding the section videos below).
    // Add color only, keep destination alpha — halo pixels stay alpha 0 and
    // the browser composites them additively over the page.
    bloom.blendMaterial.blending = THREE.CustomBlending;
    bloom.blendMaterial.blendEquation = THREE.AddEquation;
    bloom.blendMaterial.blendSrc = THREE.OneFactor;
    bloom.blendMaterial.blendDst = THREE.OneFactor;
    bloom.blendMaterial.blendSrcAlpha = THREE.ZeroFactor;
    bloom.blendMaterial.blendDstAlpha = THREE.OneFactor;
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

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
  let burst = 0; // section-change ember pulse (decays each frame)
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
    // Section-change beat: kick the ember field into a brief updraft.
    pulse() { burst = 1; },
  };

  // ---- adaptive quality (§perf) ------------------------------------------
  // The static mobile/desktop split guesses once at load; a mid-tier laptop or
  // throttled phone still gets the full stack and stutters. This controller
  // watches real frame time and steps quality DOWN when the device can't hold
  // ~50fps, so every device converges on a smooth tier instead of a fixed one.
  //   tier 3 (high)   — bloom composer + full DPR + embers   (desktop start)
  //   tier 2 (medium) — no bloom, full DPR, embers           (mobile start)
  //   tier 1 (low)    — no bloom, DPR≤1.25, embers
  //   tier 0 (min)    — no bloom, DPR 1, embers hidden
  // Degrade-only (no step-up) avoids oscillation at a threshold. A ?q= param
  // pins a tier for QA (?q=high|medium|low|min).
  const TIER = { high: 3, medium: 2, low: 1, min: 0 };
  const pinned = new URLSearchParams(location.search).get('q');
  let tier = composer ? TIER.high : TIER.medium;
  if (pinned && pinned in TIER) tier = TIER[pinned];
  let useComposer = !!composer && tier >= TIER.high;

  function applyTier() {
    useComposer = !!composer && tier >= TIER.high;
    const dpr = tier >= TIER.medium ? DPR : tier >= TIER.low ? Math.min(DPR, 1.25) : 1;
    if (renderer.getPixelRatio() !== dpr) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(innerWidth, innerHeight);
    }
    embers.points.visible = tier >= TIER.low;
    // High-tier-only effects (CSS reads this): background defocus / DOF cue.
    document.body.classList.toggle('fx-high', tier >= TIER.high);
    stats.tier = tier;
  }

  // Frame-time watchdog: sample avg fps each second; two consecutive weak
  // seconds drop a tier (a single GC/asset-decode spike shouldn't). Pinned = off.
  let winFrames = 0, winStart = performance.now(), weak = 0;
  function monitorFrame(now) {
    if (pinned) return;
    winFrames++;
    if (now - winStart < 1000) return;
    const fps = (winFrames * 1000) / (now - winStart);
    winFrames = 0; winStart = now;
    if (fps < 48 && tier > TIER.min) {
      if (++weak >= 2) { tier--; weak = 0; applyTier(); }
    } else weak = 0;
  }

  // With a composer each frame is several internal render() calls and
  // info auto-reset would leave stats reflecting only the last quad pass —
  // reset manually at frame start so tris/calls cover the whole frame.
  renderer.info.autoReset = false;

  // Pause the loop when the tab is backgrounded — a hidden tab still burns a
  // full render every frame otherwise (drains battery, steals the GPU from
  // whatever the user switched to). Resume cleanly, resetting the clock so the
  // first visible frame doesn't jump on the accumulated delta.
  let running = true;
  function tick() {
    const now = performance.now();
    renderer.info.reset();
    const dt = Math.min(clock.getDelta(), 0.05);
    pointerLerp.lerp(pointer, 0.05);

    burst *= 0.93; // ease the section-change pulse back down
    if (embers.points.visible) embers.update(scrollVel, pointerLerp, burst);

    // camera passed through for the head-look gate (eases off when orbiting behind)
    for (const m of mascots) if (m.active) m.update({ dt, pointer: pointerLerp, scrollVel, camera });

    for (const fn of tickCbs) fn({ pointer: pointerLerp, scrollVel });

    useComposer ? composer.render() : renderer.render(scene, camera);
    // QA hook (scripts/qa.mjs): live draw-call/triangle budget check (§3.7)
    stats.tris = renderer.info.render.triangles;
    stats.calls = renderer.info.render.calls;
    monitorFrame(now);
    if (running) requestAnimationFrame(tick);
  }
  const stats = (window.__marutStats = { tris: 0, calls: 0, tier });
  applyTier();
  requestAnimationFrame(tick);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; return; }
    if (!running) { running = true; clock.getDelta(); requestAnimationFrame(tick); }
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer?.setSize(innerWidth, innerHeight);
  }, { passive: true });

  return API;
}
