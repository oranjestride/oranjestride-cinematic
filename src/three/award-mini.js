// ============================================================================
// award-mini.js — the award corner's Marut, rendered live like the hero one:
// a second mascot.glb instance on its own small canvas with scene.js's light
// rig + ACES grade, wave pose frozen with the trophy in hand, and a hop that
// is real physics — gravity on the body, a spring-damped knee bend for the
// crouch / take-off / landing (no 2D squash-and-stretch).
// ============================================================================
import * as THREE from 'three';
import { mountMarutGLB } from './marut-glb.js';
import { makeContactShadow } from './marut/textures.js';

const G = 9.8;            // m/s² — Marut is 1.8 world units ≈ 1.8 m tall
const V = 2.2;            // take-off m/s → apex V²/2G ≈ 0.25 m, airtime ≈ 0.45 s
const K = 170, C = 20;    // knee spring stiffness / damping (ζ ≈ 0.77)
const HIP_DROP = 0.18;    // m the hips sink at full bend: 0.45 m thigh/shin at 0.7 / 0.6 rad → feet stay planted
const HOLD_T = 148 / 60;  // wave clip time where the raised hand peaks
const YAW = 0.3;

async function loadTrophy() {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const gltf = await new GLTFLoader().loadAsync('/models/trophy.glb');
  // the export ships vertex colours only — give it real surfaces
  const gold = new THREE.MeshStandardMaterial({ color: 0xf7cf5a, metalness: 1, roughness: 0.2, envMapIntensity: 1.5, emissive: 0x3a2a00, emissiveIntensity: 0.35 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, metalness: 0.25, roughness: 0.12, envMapIntensity: 1.2 });
  const crystal = new THREE.MeshPhysicalMaterial({ color: 0xf2f8ff, roughness: 0.02, clearcoat: 1, envMapIntensity: 3, transparent: true, opacity: 0.7, flatShading: true });
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const glass = /crystal_teardrop/.test(o.name);
    if (!glass) o.geometry.computeVertexNormals();
    o.material = /plinth|pedestal/.test(o.name) ? black : glass ? crystal : gold;
    if (/six_point_gold_star/.test(o.name)) o.visible = false; // exported as a broken flat half-fan
  });
  // upright six-point star in its place (model space is Z-up, 4.02 units tall)
  const R = 0.42, sh = new THREE.Shape();
  for (let i = 0; i < 12; i++) {
    const r = i % 2 ? R * 0.42 : R, a = (i / 12) * Math.PI * 2 + Math.PI / 2;
    i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const sg = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.05, bevelSegments: 2 });
  sg.translate(0, 0, -0.04).rotateX(Math.PI / 2);
  const starMat = gold.clone(); starMat.roughness = 0.34;
  const star = new THREE.Mesh(sg, starMat);
  star.position.z = 3.98;
  star.rotation.z = 0.55;
  gltf.scene.add(star);

  gltf.scene.rotation.x = -Math.PI / 2;
  gltf.scene.scale.setScalar(0.62 / 4.02); // ~0.62 m — oversized vs life for legibility at corner size
  const t = new THREE.Group(); t.add(gltf.scene);
  return t;
}

/** Resolves { hop(n), setActive(on) } or null (no WebGL / GLB failed → keep the sprite). */
export async function mountAwardMini(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (_) { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  // scene.js's studio rig, so both Maruts are lit identically
  scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x3a3f4a, 0.65));
  for (const [c, i, x, y, z] of [[0xffd9b0, 1.25, 3, 7, 6], [0x5f8fd6, 1.1, -4, 3, -6], [0xff7a2a, 0.85, 4, 2.5, -5], [0xfff4ea, 0.85, 0, 2, 12]]) {
    const l = new THREE.DirectionalLight(c, i); l.position.set(x, y, z); scene.add(l);
  }

  const [marut, trophy] = await Promise.all([mountMarutGLB(), loadTrophy().catch(() => null)]);
  if (!marut) { renderer.dispose(); return null; }
  scene.add(marut.root);
  marut.setYaw(YAW);
  marut.root.rotation.y = YAW;
  marut.hold('wave', HOLD_T);
  marut.update({ dt: 0, pointer: null, scrollVel: 0 });
  marut.root.updateWorldMatrix(true, true);

  const bones = {};
  marut.root.traverse((o) => { if (o.isBone) bones[o.name.replace(/^mixamorig[:_]?/i, '').toLowerCase()] = o; });
  if (trophy && bones.righthand) {
    trophy.position.copy(bones.righthand.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0.04, -0.06, 0.02));
    trophy.rotation.y = YAW;
    scene.add(trophy);
    bones.righthand.attach(trophy); // rides the hand from here on
  }
  const legs = ['left', 'right'].map((s) => [bones[s + 'upleg'], bones[s + 'leg'], bones[s + 'foot']]).filter((l) => l.every(Boolean));

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.7),
    new THREE.MeshBasicMaterial({ map: makeContactShadow(), transparent: true, depthWrite: false, opacity: 0.6 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.002;
  scene.add(shadow);

  // frame the held pose + trophy, with headroom for the hop
  const box = new THREE.Box3().makeEmpty();
  const p = new THREE.Vector3();
  marut.root.traverse((o) => { if (o.isBone) box.expandByPoint(o.getWorldPosition(p)); });
  box.expandByScalar(0.14);
  if (trophy) { trophy.updateWorldMatrix(true, true); box.union(new THREE.Box3().setFromObject(trophy)); }
  box.max.y += V * V / (2 * G) + 0.04;
  box.min.y = -0.05;
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    const fit = Math.max(s.y / 2, s.x / 2 / cam.aspect) / Math.tan(THREE.MathUtils.degToRad(13));
    cam.position.set(c.x, c.y, c.z + fit * 1.15); // margin: the trophy sits nearer the lens than the box centre
    cam.lookAt(c);
    cam.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);

  // --- physics state ---
  let y = 0, vy = 0, k = 0, vk = 0, air = false, pending = 0, crouchUntil = 0, t = 0;
  let raf = 0, lastDraw = performance.now();

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const busy = air || pending || Math.abs(k) > 0.003 || Math.abs(vk) > 0.02;
    if (!busy && now - lastDraw < 33) return; // standing still: ~30fps is plenty
    const dt = Math.min((now - lastDraw) / 1000, 1 / 30);
    lastDraw = now;
    t += dt;

    if (!air && pending && now >= crouchUntil) { air = true; vy = V; pending--; crouchUntil = 0; }
    if (air) {
      vy -= G * dt;
      y += vy * dt;
      if (y <= 0) {
        vk += Math.abs(vy) * 1.1; // landing impact loads the knees
        y = 0; vy = 0; air = false;
        if (pending) crouchUntil = now + 220;
      }
    }
    const target = crouchUntil ? 1 : air ? 0.3 : 0; // crouch → slight tuck in the air → stand
    vk += (K * (target - k) - C * vk) * dt;
    k = Math.min(Math.max(k + vk * dt, -0.05), 1.3);

    marut.update({ dt, pointer: null, scrollVel: 0 });
    // knee bend over the clip pose (mixer rewrites these bones every update)
    for (const [up, knee, foot] of legs) {
      up.rotation.x -= 0.7 * k;
      knee.rotation.x -= 1.3 * k;
      foot.rotation.x += 0.55 * k;
    }
    if (bones.spine) bones.spine.rotation.x += 0.15 * k + Math.sin(t * 2.1) * 0.012; // lean into the crouch + breathing
    marut.root.position.y = y - HIP_DROP * k;
    shadow.scale.setScalar(1 - Math.min(y, 0.4) * 1.2);
    shadow.material.opacity = 0.6 - Math.min(y, 0.4);
    renderer.render(scene, cam);
  };

  return {
    hop(n = 1) {
      if (air || pending) return;
      pending = n;
      crouchUntil = performance.now() + 170;
    },
    setActive(on) {
      if (on && !raf) { lastDraw = performance.now(); raf = requestAnimationFrame(frame); }
      if (!on && raf) { cancelAnimationFrame(raf); raf = 0; }
    },
  };
}
