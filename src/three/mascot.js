// ============================================================================
// mascot.js — Tier 1 primitive-geometry runner built from logo02.png's parts
// (faceted torso/chip, brain head, bent limbs, momentum arrow, orbit nodes) (§6).
// Rigged without bones: nested Object3D groups, animated procedurally.
//
// Tier 2 (SVGLoader + ExtrudeGeometry from a traced logo) would replace the
// primitives 1:1 inside this same rig — see README §(e). GLB swap: load with
// GLTFLoader and return { group, update } with the same shape.
// ============================================================================
import * as THREE from 'three';
import { makeGlowSprite } from './particles.js';

const ORANGE = new THREE.Color('#ff6a00');
const ORANGE2 = new THREE.Color('#f47c20');
const NAVY = new THREE.Color('#17314a');

const flat = (c, emissive = 0) => new THREE.MeshStandardMaterial({
  color: c, flatShading: true, roughness: 0.35, metalness: 0.3,
  emissive: new THREE.Color(c), emissiveIntensity: emissive,
});

export function createMascot() {
  const group = new THREE.Group();

  // torso (chip body) — low-detail for facets
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), flat(NAVY, 0.15));
  group.add(torso);
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.08), flat(ORANGE, 0.55));
  chip.position.z = 0.28;
  torso.add(chip);

  // head / brain
  const head = new THREE.Group();
  head.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), flat(ORANGE, 0.4)));
  head.position.set(0.15, 0.95, 0);
  torso.add(head);

  // momentum arrow rising from shoulder
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 4), flat(ORANGE2, 0.5));
  arrow.position.set(0.8, 0.9, 0);
  arrow.rotation.z = -Math.PI / 4;
  torso.add(arrow);

  // orbit nodes (small octahedra) drifting around the torso
  const nodes = [];
  for (let i = 0; i < 4; i++) {
    const n = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), flat(ORANGE, 0.6));
    torso.add(n);
    nodes.push(n);
  }

  // limbs: upper→lower nested groups so run swings read
  const limb = (x, y, color) => {
    const upper = new THREE.Group();
    const uMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.22), flat(color, 0.1));
    uMesh.position.y = -0.3; upper.add(uMesh);
    const lower = new THREE.Group();
    const lMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), flat(ORANGE, 0.2));
    lMesh.position.y = -0.28; lower.add(lMesh);
    lower.position.y = -0.6; upper.add(lower);
    upper.position.set(x, y, 0);
    return { upper, lower };
  };
  const armL = limb(-0.5, 0.45, ORANGE2);
  const armR = limb(0.5, 0.45, NAVY);
  const legL = limb(-0.22, -0.55, ORANGE2);
  const legR = limb(0.22, -0.55, NAVY);
  torso.add(armL.upper, armR.upper, legL.upper, legR.upper);

  // arrow-tip particle trail (reuses hero sprite) (§6.2)
  const TRAIL = 60;
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
  const trail = new THREE.Points(tGeo, new THREE.PointsMaterial({
    size: 0.14, map: makeGlowSprite(ORANGE), color: ORANGE,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.7,
  }));
  group.add(trail);

  group.scale.setScalar(0.9);
  group.visible = false;

  let runPhase = 0;

  // state: { pointerLerp:{x,y}, scrollVel, running, target:{p,s}|null }
  function update(dt, t, state) {
    const { pointerLerp, scrollVel, running, target } = state;

    if (target) {
      group.position.lerp(target.p, 0.06);
      const s = THREE.MathUtils.lerp(group.scale.x, target.s, 0.06);
      group.scale.setScalar(s);
      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, 0.35 + pointerLerp.x * 0.4, 0.05);
    } else {
      const s = THREE.MathUtils.lerp(group.scale.x, 0.01, 0.08);
      group.scale.setScalar(s);
    }
    group.visible = group.scale.x > 0.02;

    torso.position.y = Math.sin(t * 1.6) * 0.06;                          // idle bob
    head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, pointerLerp.x * 0.6, 0.08); // look at cursor
    head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -pointerLerp.y * 0.4, 0.08);
    torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, THREE.MathUtils.clamp(scrollVel * 6, -0.4, 0.4), 0.08); // scroll lean

    const speed = running ? 8 : 2.2;
    runPhase += dt * speed;
    const sw = Math.sin(runPhase) * (running ? 0.9 : 0.15);
    armL.upper.rotation.x = sw; armR.upper.rotation.x = -sw;
    legL.upper.rotation.x = -sw; legR.upper.rotation.x = sw;
    armL.lower.rotation.x = Math.max(0, -sw) * 0.6;
    armR.lower.rotation.x = Math.max(0, sw) * 0.6;

    // orbit nodes
    nodes.forEach((n, i) => {
      const a = t * 0.8 + (i / nodes.length) * Math.PI * 2;
      n.position.set(Math.cos(a) * 0.8, 0.1 + Math.sin(a * 1.3) * 0.5, Math.sin(a) * 0.4);
    });

    // trail follows arrow tip
    const tp = tGeo.attributes.position.array;
    for (let i = TRAIL - 1; i > 0; i--) {
      tp[i * 3] = tp[(i - 1) * 3]; tp[i * 3 + 1] = tp[(i - 1) * 3 + 1]; tp[i * 3 + 2] = tp[(i - 1) * 3 + 2];
    }
    tp[0] = 0.8 + Math.sin(t * 3) * 0.05; tp[1] = 1.2; tp[2] = 0;
    tGeo.attributes.position.needsUpdate = true;
  }

  return { group, update };
}

// Tiny 2D breathing emblem beside the nav wordmark (§6 · nav).
export function initNavMascot(reduced) {
  const cv = document.getElementById('nav-mascot');
  if (!cv || reduced) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
  (function draw(t) {
    const s = 1 + Math.sin(t / 500) * 0.06;
    ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.rotate(Math.sin(t / 1400) * 0.15);
    ctx.beginPath();
    ctx.moveTo(0, -22); ctx.lineTo(15, 0); ctx.lineTo(0, 22); ctx.lineTo(-15, 0); ctx.closePath();
    ctx.fillStyle = '#ff6a00'; ctx.shadowBlur = 12; ctx.shadowColor = '#ff6a00'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fillStyle = '#17314a'; ctx.shadowBlur = 0; ctx.fill();
    ctx.restore();
    requestAnimationFrame(draw);
  })(0);
}
