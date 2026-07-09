// Dev-only inspection stage (served via /marut-dev.html, never built).
// Mirrors scene.js rendering settings (ACES, RoomEnvironment IBL, same lights)
// so what you see here is what the site shows, plus OrbitControls and a grid.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createMarut } from './index.js';

export function startDevStage() {
  const canvas = document.getElementById('dev-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1020); // navy register like the site
  const url = new URLSearchParams(location.search);
  // ?bg=board → the reference boards' studio grey, for 1:1 comparison shots
  const boardMode = url.get('bg') === 'board';
  if (boardMode) scene.background = new THREE.Color(0x8e939b);

  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(1.6, 1.5, 3.2);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // same light rig as scene.js — keep these literals in lockstep
  scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x3a3f4a, 0.65));
  const key = new THREE.DirectionalLight(0xffd9b0, 1.25); key.position.set(3, 7, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x5f8fd6, 1.1); rim.position.set(-4, 3, -6); scene.add(rim);
  const rimWarm = new THREE.DirectionalLight(0xff7a2a, 0.85); rimWarm.position.set(4, 2.5, -5); scene.add(rimWarm);
  const fill = new THREE.DirectionalLight(0xfff4ea, 0.85); fill.position.set(0, 2, 12); scene.add(fill);

  // same bloom chain as scene.js; ?bloom=0 disables it for pure-geometry
  // board-comparison shots (halos read as silhouette error next to a board)
  let composer = null;
  if (url.get('bloom') !== '0') {
    const target = new THREE.WebGLRenderTarget(innerWidth, innerHeight, {
      type: THREE.HalfFloatType,
      samples: renderer.capabilities.isWebGL2 ? 4 : 0,
    });
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.35, 1.25);
    // same alpha-preserving blend fix as scene.js (opaque bg here, but the
    // two rigs must stay in lockstep so shots match the site)
    bloom.blendMaterial.blending = THREE.CustomBlending;
    bloom.blendMaterial.blendEquation = THREE.AddEquation;
    bloom.blendMaterial.blendSrc = THREE.OneFactor;
    bloom.blendMaterial.blendDst = THREE.OneFactor;
    bloom.blendMaterial.blendSrcAlpha = THREE.ZeroFactor;
    bloom.blendMaterial.blendDstAlpha = THREE.OneFactor;
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  const grid = new THREE.GridHelper(4, 16, 0x2a3550, 0x1a2338);
  grid.visible = !boardMode;
  scene.add(grid);

  const marut = createMarut({ quality: url.get('q') === 'low' ? 'low' : 'high' });
  scene.add(marut.root);
  window.__marut = marut;

  // shot-harness hooks (scripts/marut-shot.mjs)
  window.__dev = {
    renderer, scene, camera, marut,
    view(px, py, pz, tx = 0, ty = 1.0, tz = 0) {
      camera.position.set(px, py, pz);
      controls.target.set(tx, ty, tz);
      controls.update();
    },
  };

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.0, 0);
  controls.enableDamping = true;

  const clock = new THREE.Clock();
  const pointer = new THREE.Vector2();
  addEventListener('mousemove', (e) => {
    pointer.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
  }, { passive: true });

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    marut.update({ dt, pointer, scrollVel: 0 });
    controls.update();
    renderer.info.reset();
    composer ? composer.render() : renderer.render(scene, camera);
    window.__marutStats = {
      tris: renderer.info.render.triangles,
      calls: renderer.info.render.calls,
    };
    requestAnimationFrame(tick);
  }
  renderer.info.autoReset = false;
  requestAnimationFrame(tick);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer?.setSize(innerWidth, innerHeight);
  }, { passive: true });
}
