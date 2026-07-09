// Hair — the flame crown. Dense zone-placed pyramidal BLADES (4-sided cones
// flattened to ~42% thickness, flat-shaded, each a SOLID black or orange)
// erupting from a scalp-hugging base cap, raked up-and-back per the boards:
// fringe flicks up/forward, crown sweeps back, occiput blades go nearly
// horizontal, the hero cluster at top-center-back is the tallest point of
// the whole character (~world 1.80), and the nape row points back-and-down.
// From behind the hair reads almost entirely black (artichoke); orange lives
// in the front fringe + scattered crown/side singles. One merged mesh.
//
// Coordinates are spec-local (head pivot-1.63 convention) inside a frame at
// FRAME_Y — same anchoring as head.js, so these constants line up with the
// new skull: crown +0.032, hairline +0.014, ears at (±0.114, −0.075).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32, rand } from '../prng.js';
import { COLORS } from '../palette.js';
import { FRAME_Y } from './head.js';

// Scalp cap ellipsoid fitted to the new skull (lathe max r 0.111 at y −0.052,
// crown +0.032, z×0.95) — sits ~0.006 proud of the skin everywhere.
const C = new THREE.Vector3(0, -0.048, -0.008);
const R = 0.118;
const S = new THREE.Vector3(1.02, 0.72, 0.92);
const CAP_TOP = C.y + R * S.y; // 0.037
const WHORL = new THREE.Vector3(0, CAP_TOP, -0.038);

// Graphic hairline (spec-local y by azimuth; az 0 = +z front): widow's-peak
// dip at center, rising over the brows, diving down the temples, arcing over
// the ears, then down to the nape.
const HAIRLINE = [[0, 0.014], [30, 0.036], [75, -0.035], [90, -0.022], [130, -0.095], [180, -0.13]];
function hairlineY(azRad) {
  const a = Math.min(180, Math.abs(azRad) * (180 / Math.PI));
  for (let i = 1; i < HAIRLINE.length; i++) {
    if (a <= HAIRLINE[i][0]) {
      const [a0, y0] = HAIRLINE[i - 1], [a1, y1] = HAIRLINE[i];
      return y0 + ((a - a0) / (a1 - a0)) * (y1 - y0);
    }
  }
  return HAIRLINE[HAIRLINE.length - 1][1];
}

// Point on the cap surface at azimuth az (0 = front) and spec-local height y.
function capPoint(az, y) {
  const ry = Math.max(-0.95, Math.min(0.95, (y - C.y) / (R * S.y)));
  const s = Math.sqrt(1 - ry * ry);
  return new THREE.Vector3(
    C.x + s * Math.sin(az) * R * S.x,
    y,
    C.z + s * Math.cos(az) * R * S.z,
  );
}

export function buildHair({ joints, mats, quality }) {
  const rng = mulberry32(20261); // fixed seed — same hair every load
  const lowQ = quality === 'low';
  const n = (c) => (lowQ ? Math.ceil(c * 0.6) : c);
  const geos = [];

  const black = new THREE.Color(COLORS.hair);
  const orangeMain = new THREE.Color(COLORS.hairOrange);
  const orangeDeep = new THREE.Color(COLORS.hairOrangeDeep);
  const tmp = new THREE.Color();

  const paint = (geo, color) => {
    const count = geo.attributes.position.count;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = color.r; arr[i * 3 + 1] = color.g; arr[i * 3 + 2] = color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  };
  const pickColor = (orangeP) => {
    if (rng() < orangeP) {
      tmp.copy(rng() < 0.3 ? orangeDeep : orangeMain);
      tmp.offsetHSL(rand(rng, -0.008, 0.008), 0, rand(rng, -0.02, 0.02));
    } else {
      tmp.copy(black);
      tmp.offsetHSL(0, 0, rand(rng, -0.012, 0.018));
    }
    return tmp;
  };

  // --- blade: flattened 4-sided pyramid, wide axis in the sweep plane ---
  const Yv = new THREE.Vector3(), Zv = new THREE.Vector3(), Xv = new THREE.Vector3();
  function blade(base, grow, h, r, color) {
    const geo = new THREE.ConeGeometry(r, h, 4, 1, true);
    geo.translate(0, h / 2, 0);
    geo.scale(1, 1, 0.42); // thin transverse axis
    paint(geo, color);
    // basis: Y = grow, Z(thin) ⟂ sweep plane (radial × grow), X = wide
    Yv.copy(grow).normalize();
    const radial = base.clone().sub(C).normalize();
    Zv.crossVectors(radial, Yv);
    if (Zv.lengthSq() < 1e-6) Zv.set(1, 0, 0).cross(Yv);
    Zv.normalize();
    Xv.crossVectors(Yv, Zv).normalize();
    const m = new THREE.Matrix4().makeBasis(Xv, Yv, Zv);
    const sunk = base.clone().addScaledVector(radial, -0.012); // root inside the cap
    m.setPosition(sunk);
    geo.applyMatrix4(m);
    geos.push(geo);
  }
  // M9: boards show ~15 BIG sculpted pyramids, not a thicket of thin flicks —
  // every zone runs fewer, fatter, taller blades with tighter jitter
  const jitter = (v) => v + rand(rng, -0.08, 0.08);

  // --- base cap: kills scalp show-through; vertex-clamped to the hairline
  //     so the edge reads as a hard graphic rim under flat shading ---
  const cap = new THREE.SphereGeometry(R, lowQ ? 16 : 32, lowQ ? 8 : 16, 0, Math.PI * 2, 0, Math.PI * 0.8);
  cap.scale(S.x, S.y, S.z);
  cap.translate(C.x, C.y, C.z);
  {
    const p = cap.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const az = Math.atan2(p.getX(i) - C.x, p.getZ(i) - C.z);
      const hl = hairlineY(az);
      if (p.getY(i) < hl) {
        // clamp to the hairline AND tuck the rim slightly toward the skull so
        // the squashed edge triangles hide instead of catching the key light
        p.setY(i, hl);
        p.setX(i, C.x + (p.getX(i) - C.x) * 0.94);
        p.setZ(i, C.z + (p.getZ(i) - C.z) * 0.94);
      }
    }
    cap.computeVertexNormals();
  }
  paint(cap, black);
  geos.push(cap);

  // --- FRINGE: above the forehead hairline, flicking up + slightly forward,
  //     outer blades splay sideways; the orange heart of the hairdo ---
  {
    const count = n(8);
    for (let i = 0; i < count; i++) {
      const az = jitter(((i + 0.5) / count - 0.5) * 2 * (50 * Math.PI / 180));
      const base = capPoint(az, hairlineY(az) + rand(rng, 0.008, 0.03));
      const radial = base.clone().sub(C).normalize();
      const grow = radial.multiplyScalar(0.25)
        .add(new THREE.Vector3(0.5 * Math.sin(az), 1.0, 0.2));
      const forced = Math.abs(az) < 0.30; // front-center cluster always orange
      blade(base, grow, rand(rng, 0.11, 0.17), rand(rng, 0.045, 0.065),
        forced ? orangeMain : pickColor(0.85));
    }
  }

  // --- CROWN: two rings radiating away from the rear-of-center whorl ---
  for (const [ringY, count] of [[0.030, n(6)], [0.012, n(6)]]) {
    for (let i = 0; i < count; i++) {
      const az = jitter((i / count) * Math.PI * 2);
      const base = capPoint(az, ringY + rand(rng, -0.006, 0.006));
      const hw = base.clone().sub(WHORL).setY(0);
      if (hw.lengthSq() < 1e-6) hw.set(0, 0, 0.1);
      hw.normalize();
      const radial = base.clone().sub(C).normalize();
      const grow = radial.multiplyScalar(0.35)
        .addScaledVector(hw, 0.35)
        .add(new THREE.Vector3(0, 0.85, -0.55));
      blade(base, grow, rand(rng, 0.15, 0.22), rand(rng, 0.05, 0.075), pickColor(0.4));
    }
  }

  // --- SIDES: temple-to-behind-ear band, swept hard back ---
  for (const m of [1, -1]) {
    const count = n(5);
    for (let i = 0; i < count; i++) {
      const az = m * jitter((50 + (i / (count - 1)) * 75) * Math.PI / 180);
      const base = capPoint(az, rand(rng, -0.03, 0.01));
      const radial = base.clone().sub(C).normalize();
      const grow = radial.multiplyScalar(0.4)
        .add(new THREE.Vector3(m * 0.25, 0.45, -0.9));
      blade(base, grow, rand(rng, 0.08, 0.13), rand(rng, 0.038, 0.055), pickColor(0.25));
    }
  }

  // --- BACK UPPER (occiput): big, nearly horizontal — the rear overhang ---
  {
    const count = n(7);
    for (let i = 0; i < count; i++) {
      const az = Math.PI + jitter(((i + 0.5) / count - 0.5) * 2 * (55 * Math.PI / 180));
      const base = capPoint(az, rand(rng, -0.02, 0.02));
      const radial = base.clone().sub(C).normalize();
      const grow = radial.multiplyScalar(0.3)
        .add(new THREE.Vector3(0, 0.45, -1.0));
      blade(base, grow, rand(rng, 0.15, 0.22), rand(rng, 0.055, 0.078), pickColor(0.08));
    }
  }

  // --- HERO CLUSTER: top-center-back, tallest points of the character
  //     (tips ≈ spec-local 0.18 → world ~1.80) — always black ---
  {
    const count = n(3);
    for (let i = 0; i < count; i++) {
      const az = Math.PI + rand(rng, -0.35, 0.35);
      const base = capPoint(az, rand(rng, 0.026, 0.036));
      const grow = new THREE.Vector3(rand(rng, -0.12, 0.12), 0.75, -0.65);
      tmp.copy(black).offsetHSL(0, 0, rand(rng, -0.012, 0.018));
      blade(base, grow, rand(rng, 0.18, 0.23), rand(rng, 0.06, 0.082), tmp);
    }
  }

  // --- NAPE: small, pointing back and slightly DOWN — always black ---
  {
    const count = n(6);
    for (let i = 0; i < count; i++) {
      const az = Math.PI + jitter(((i + 0.5) / count - 0.5) * 2 * (40 * Math.PI / 180));
      const base = capPoint(az, rand(rng, -0.115, -0.075));
      const radial = base.clone().sub(C).normalize();
      const grow = radial.multiplyScalar(0.2)
        .add(new THREE.Vector3(0, -0.1, -0.95));
      tmp.copy(black).offsetHSL(0, 0, rand(rng, -0.012, 0.018));
      blade(base, grow, rand(rng, 0.05, 0.08), rand(rng, 0.02, 0.03), tmp);
    }
  }

  // --- SIDEBURNS: flattened wedges in front of the ears, tapering to a
  //     point around ear-lobe level, slight backward slant ---
  for (const m of [1, -1]) {
    const geo = new THREE.ConeGeometry(0.016, 0.075, 4, 1, true);
    geo.translate(0, 0.075 / 2, 0);
    geo.scale(0.55, 1, 1);
    paint(geo, black);
    const mtx = new THREE.Matrix4()
      .makeRotationFromEuler(new THREE.Euler(-0.13, 0, Math.PI)) // point down, tip back
      .setPosition(m * 0.104, -0.030, 0.030);
    geo.applyMatrix4(mtx);
    geos.push(geo);
  }

  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  const frame = new THREE.Group();
  frame.position.y = FRAME_Y;
  const mesh = new THREE.Mesh(merged, mats.hair);
  mesh.name = 'hair';
  frame.add(mesh);
  joints.head.add(frame);
}
