// Limbs — sleeves with real garment volume mapped into the jacket atlas's
// sleeve zones (orange raglan caps + constellation web come from the texture),
// dark ribbed knit cuffs (wrist + ankle), big vinyl-toy hands with four
// separated fingers + thumb, faceted tapered jogger legs with a front crease
// ridge and angular knee break, waistband, and the cyan seam piping: a hip
// pocket arc + thigh/shin tubes that meet at the knee so the line bends there
// (azimuth ~10° behind lateral — hinted from the front, full glow from behind).
//
// Rig chain (rig.js): shoulder pivot (±0.22, 1.24) · elbow −0.235 · wrist
// −0.47 (world 0.77) · femur (±0.10, 0.90) · knee −0.38 · ankle −0.78.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SLEEVE_ZONES } from '../textures.js';

const SEAM_AZ = (10 * Math.PI) / 180; // piping sits just behind lateral

// Tapered sleeve tube along −Y from [radius, yLocal] rings, UV-remapped into
// one of the atlas sleeve zones (u wraps the arm, v runs top ring → bottom).
function sleeveTube(rings, radialSeg, zone) {
  const pts = rings.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(pts, radialSeg);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i); // lathe: v 0 at first ring (top)
    uv.setXY(i, zone.x + u * zone.w, 1 - (zone.y + (1 - v) * zone.h));
  }
  return geo;
}

// Constant-UV pin: sample a single texel region (used to paint whole meshes
// from one atlas color area, e.g. the orange raglan cap on the shoulder ball).
function pinUV(geo, u, v) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u, v);
  return geo;
}

// Corrugated knit band — alternate vertex columns pushed in/out; flat shading
// turns the columns into visible ribs.
function ribbedBand(rTop, rBot, h, ribs, amp = 0.0025) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, ribs * 2, 1, true);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const col = Math.round((a / (Math.PI * 2)) * ribs * 2);
    const s = col % 2 === 0 ? amp : -amp;
    const len = Math.hypot(x, z);
    if (len > 1e-6) pos.setXYZ(i, x + (x / len) * s, pos.getY(i), z + (z / len) * s);
  }
  geo.computeVertexNormals();
  return geo;
}

// One merged hand: rounded palm slab + knuckle bulge + 4 separated drooping
// fingers + splayed thumb. Sized to the boards' oversized vinyl mitts
// (wrist → middle fingertip ≈ 0.16, hand length DIMS.handLen 0.17).
function makeHandGeometry(m) {
  const parts = [];
  const palm = new THREE.BoxGeometry(0.095, 0.09, 0.04, 2, 2, 1);
  // round the slab a touch by pulling the corners in
  const pp = palm.attributes.position;
  for (let i = 0; i < pp.count; i++) {
    const x = pp.getX(i), y = pp.getY(i);
    if (Math.abs(x) > 0.04 && Math.abs(y) > 0.038) {
      pp.setX(i, x * 0.88);
      pp.setY(i, y * 0.9);
    }
  }
  palm.computeVertexNormals();
  palm.translate(0, -0.045, 0);
  parts.push(palm);

  const knuckle = new THREE.SphereGeometry(0.02, 8, 6);
  knuckle.scale(1.9, 0.7, 1.0);
  knuckle.translate(0, -0.088, 0.006);
  parts.push(knuckle);

  const fingers = [
    { x: -0.036, len: 0.040, droop: 0.28 },
    { x: -0.012, len: 0.048, droop: 0.28 },
    { x: 0.012, len: 0.043, droop: 0.30 },
    { x: 0.036, len: 0.030, droop: 0.35 },
  ];
  for (const f of fingers) {
    const g = new THREE.CapsuleGeometry(0.014, f.len, 3, 6);
    g.translate(0, -f.len / 2 - 0.014, 0);
    const mtx = new THREE.Matrix4()
      .makeRotationFromEuler(new THREE.Euler(-f.droop, 0, m * (f.x / 0.036) * -0.06))
      .setPosition(m * f.x, -0.09, 0.004);
    g.applyMatrix4(mtx);
    parts.push(g);
  }
  // thumb sweeps FORWARD off the palm's inner front corner (boards show
  // thumbs toward +z with arms down, not splayed sideways)
  const thumb = new THREE.CapsuleGeometry(0.016, 0.040, 3, 6);
  thumb.translate(0, -0.035, 0);
  const tm = new THREE.Matrix4()
    .makeRotationFromEuler(new THREE.Euler(0.5, 0, m * 0.55))
    .setPosition(m * 0.040, -0.025, 0.018);
  thumb.applyMatrix4(tm);
  parts.push(thumb);

  const merged = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return merged;
}

export function buildArms({ joints, mats, quality }) {
  const radial = quality === 'low' ? 8 : 10;
  const jacketMat = mats.jacketMapped || mats.jacket;

  for (const s of ['L', 'R']) {
    const m = s === 'L' ? 1 : -1;
    const up = joints[`arm${s}_up`];
    const lo = joints[`arm${s}_lo`];
    const hand = joints[`hand${s}`];
    const upperZone = SLEEVE_ZONES[`upper${s}`];
    const foreZone = SLEEVE_ZONES[`fore${s}`];

    // shoulder ball — spherical v mapped into the zone's upper half so the
    // dome top samples the raglan orange and the underside falls into the
    // black web (reads as one garment, not a stuck-on balloon)
    const cap = new THREE.SphereGeometry(0.074, radial, 8);
    {
      const uv = cap.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i,
          upperZone.x + uv.getX(i) * upperZone.w,
          1 - (upperZone.y + uv.getY(i) * upperZone.h * 0.55));
      }
    }
    cap.translate(m * 0.004, 0.018, 0);
    up.add(new THREE.Mesh(cap, jacketMat));

    // upper sleeve: shoulder → elbow
    const upper = sleeveTube([[0.075, 0], [0.069, -0.12], [0.061, -0.235]], radial, upperZone);
    up.add(new THREE.Mesh(upper, jacketMat));

    // forearm: elbow → cuff flare
    const fore = sleeveTube([[0.060, 0], [0.057, -0.10], [0.054, -0.175]], radial, foreZone);
    lo.add(new THREE.Mesh(fore, jacketMat));

    // dark ribbed knit cuff + skin wrist stub (cuff is NEVER orange)
    const cuff = new THREE.Mesh(ribbedBand(0.047, 0.044, 0.05, quality === 'low' ? 10 : 18), mats.cuffRib);
    cuff.position.y = -0.198;
    lo.add(cuff);
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.024, 8), mats.skin);
    stub.position.y = -0.228;
    lo.add(stub);

    // cyan strip on the outer upper arm (boards 34/37)
    const strip = new THREE.Mesh(new THREE.CapsuleGeometry(0.005, 0.055, 3, 6), mats.trimCyan);
    strip.position.set(m * 0.072, -0.055, 0.012);
    strip.rotation.z = m * 0.35;
    up.add(strip);

    // hand
    hand.add(new THREE.Mesh(makeHandGeometry(m), mats.skin));
  }
}

export function buildLegs({ joints, mats, quality }) {
  const radial = 8;
  const ribs = quality === 'low' ? 10 : 18;

  // waistband under the jacket hem band (world ~0.845) + fly tab
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.150, 0.146, 0.05, 16), mats.pants);
  band.scale.z = 0.62;
  band.position.y = -0.075;
  joints.hips.add(band);
  const fly = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.012, 0.004), mats.pantsFacet);
  fly.position.set(0, -0.075, 0.150 * 0.62 + 0.002);
  joints.hips.add(fly);

  // front-crease ridge: push the +z-most vertex column outward
  const crease = (geo, amount = 0.006) => {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const a = Math.atan2(x, z);
      if (Math.abs(a) < 0.28) pos.setZ(i, z + amount);
    }
    geo.computeVertexNormals();
    return geo;
  };

  for (const s of ['L', 'R']) {
    const m = s === 'L' ? 1 : -1;
    const upJ = joints[`leg${s}_up`];
    const loJ = joints[`leg${s}_lo`];

    // thigh: faceted taper with the crease ridge
    const thigh = crease(new THREE.CylinderGeometry(0.093, 0.078, 0.38, radial, 3));
    thigh.translate(0, -0.19, 0);
    upJ.add(new THREE.Mesh(thigh, mats.pantsFacet));

    // knee break + shin taper with calf push
    const parts = [];
    const knee = new THREE.SphereGeometry(0.074, radial, 6);
    knee.scale(1, 0.9, 1.05);
    knee.translate(0, 0.005, 0.006);
    parts.push(knee);
    const shin = crease(new THREE.CylinderGeometry(0.072, 0.048, 0.36, radial, 3));
    // calf: push the mid-ring's back vertices out
    {
      const pos = shin.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i), z = pos.getZ(i);
        if (z < -0.03 && y > -0.06 && y < 0.08) pos.setZ(i, z - 0.007);
      }
      shin.computeVertexNormals();
    }
    shin.translate(0, -0.175, 0);
    parts.push(shin);
    const lower = mergeGeometries(parts);
    parts.forEach((g) => g.dispose());
    loJ.add(new THREE.Mesh(lower, mats.pantsFacet));

    // ankle ribbed jogger cuff (world 0.13–0.18 — hangs OVER the shoe collar)
    const ankle = new THREE.Mesh(ribbedBand(0.048, 0.046, 0.05, ribs, 0.0015), mats.cuffRib);
    ankle.position.y = -0.365;
    loJ.add(ankle);

    // --- cyan piping: pocket arc (hips) + thigh tube + shin tube ---
    const pocket = new THREE.TubeGeometry(
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(m * 0.05, -0.06, 0.095),
        new THREE.Vector3(m * 0.12, -0.065, 0.075),
        new THREE.Vector3(m * 0.14, -0.11, 0.03),
      ),
      8, 0.0032, 6,
    );
    joints.hips.add(new THREE.Mesh(pocket, mats.trimCyan));

    const seamAt = (r, y) => new THREE.Vector3(
      m * (r + 0.004) * Math.cos(SEAM_AZ), y, -(r + 0.004) * Math.sin(SEAM_AZ),
    );
    const thighTube = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([seamAt(0.091, -0.05), seamAt(0.084, -0.21), seamAt(0.077, -0.385)]),
      10, 0.004, 6,
    );
    upJ.add(new THREE.Mesh(thighTube, mats.trimCyan));
    const shinTube = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([seamAt(0.073, 0.005), seamAt(0.066, -0.17), seamAt(0.05, -0.35)]),
      10, 0.004, 6,
    );
    loJ.add(new THREE.Mesh(shinTube, mats.trimCyan));
    // caps so the knee bend never opens a visible gap
    for (const [joint, y, r] of [[upJ, -0.385, 0.077], [loJ, 0.005, 0.073]]) {
      const capS = new THREE.Mesh(new THREE.SphereGeometry(0.004, 6, 5), mats.trimCyan);
      capS.position.copy(seamAt(r, y));
      joint.add(capS);
    }
  }
}
