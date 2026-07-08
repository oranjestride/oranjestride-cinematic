// Torso — the track jacket. Two lathe segments (lower→spine, upper→chest) so
// the torso bends at one joint without skinning; UV seam at back center
// (phiStart π) so the front print never crosses a seam. Plus the stand-up
// collar (front-arc piping only — the boards show no orange at the nape),
// ribbed knit hem band, metal zipper pull, and the silver-framed chest chip.
// Profiles are authored in WORLD y then shifted into joint-local space.
//
// Proportions from the boards: chest half-width 0.195 (y 1.24), waist 0.17
// (y 1.006), hem 0.19 at the band top 0.916, shoulder line 1.335 tapering to
// the collar base 1.40; collar top 1.44 (the chin at 1.439 overlaps it).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { JACKET_Y0, JACKET_Y1, TORSO_V0, makeChipCoreTexture } from '../textures.js';

const Z_SQUASH = 0.59; // elliptical cross-section (depth 0.23 / width 0.39)
const SPLIT_Y = 1.14;  // lower/upper lathe boundary (between spine and chest)

// (radius, worldY) — jacket silhouette
const LOWER_PROFILE = [
  [0.190, 0.916], // hem (knit band below)
  [0.178, 0.965],
  [0.170, 1.006], // waist — narrowest
  [0.174, 1.08],
  [0.179, SPLIT_Y],
];
const UPPER_PROFILE = [
  [0.179, SPLIT_Y],
  [0.185, 1.161], // armpit
  [0.195, 1.24],  // chest
  [0.197, 1.30],
  [0.185, 1.335], // shoulder line
  [0.130, 1.385],
  [0.088, 1.40],  // collar base
];

function lathe(profile, worldToLocal, segments) {
  const pts = profile.map(([r, wy]) => new THREE.Vector2(r, wy + worldToLocal));
  const geo = new THREE.LatheGeometry(pts, segments, Math.PI); // seam at back
  geo.scale(1, 1, Z_SQUASH);
  // Remap v into the atlas' TORSO BAND (v TORSO_V0..1 — the rows below the
  // band belong to the sleeve zones) in shared world-y space, so both lathe
  // halves sample one continuous print with no seam at SPLIT_Y.
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const worldY = pos.getY(i) - worldToLocal;
    uv.setY(i, TORSO_V0 + (1 - TORSO_V0) * ((worldY - JACKET_Y0) / (JACKET_Y1 - JACKET_Y0)));
  }
  return geo;
}

// Radius of the jacket at a given world y (linear interp over both profiles).
export function jacketRadiusAt(worldY) {
  const all = [...LOWER_PROFILE, ...UPPER_PROFILE];
  for (let i = 0; i < all.length - 1; i++) {
    const [r0, y0] = all[i], [r1, y1] = all[i + 1];
    if (worldY >= y0 && worldY <= y1) return r0 + ((worldY - y0) / (y1 - y0)) * (r1 - r0);
  }
  return all[all.length - 1][0];
}

export function buildTorso({ joints, mats, quality }) {
  const seg = quality === 'low' ? 12 : 18;
  const spine = joints.spine;   // world y 1.04
  const chest = joints.chest;   // world y 1.24

  // --- jacket halves (printed material when textures are on) ---
  const jacketMat = mats.jacketMapped || mats.jacket;
  spine.add(new THREE.Mesh(lathe(LOWER_PROFILE, -1.04, seg), jacketMat));
  chest.add(new THREE.Mesh(lathe(UPPER_PROFILE, -1.24, seg), jacketMat));

  // --- ribbed knit hem band (0.856–0.916): elliptical cylinder + rib boxes
  //     merged into ONE mesh — the most matte surface on the figure ---
  {
    const parts = [];
    const band = new THREE.CylinderGeometry(0.185, 0.172, 0.06, seg, 1, true);
    band.scale(1, 1, Z_SQUASH);
    parts.push(band);
    const ribs = quality === 'low' ? 18 : 30;
    for (let i = 0; i < ribs; i++) {
      const a = (i / ribs) * Math.PI * 2;
      const rx = Math.cos(a) * 0.179, rz = Math.sin(a) * 0.179 * Z_SQUASH;
      const rib = new THREE.BoxGeometry(0.007, 0.048, 0.005);
      const mtx = new THREE.Matrix4()
        .makeRotationY(-a + Math.PI / 2)
        .setPosition(rx, 0, rz);
      rib.applyMatrix4(mtx);
      parts.push(rib);
    }
    const knit = mergeGeometries(parts);
    parts.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(knit, mats.ribbing);
    mesh.position.y = 0.886 - 1.04; // world 0.886, spine-local
    spine.add(mesh);
  }

  // --- pelvis / seat filler under the band (pants-dark) ---
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 8), mats.pants);
  pelvis.scale.set(1.22, 0.6, 0.82);
  pelvis.position.y = -0.1; // world ~0.82, tucked behind the waistband
  joints.hips.add(pelvis);

  // --- stand-up collar 1.40→1.44, chest-local (0.16→0.20) ---
  const collarPts = [
    new THREE.Vector2(0.088, 0.16),
    new THREE.Vector2(0.092, 0.18),
    new THREE.Vector2(0.096, 0.20),
  ];
  const collar = new THREE.Mesh(new THREE.LatheGeometry(collarPts, seg, Math.PI), mats.jacket);
  collar.scale.z = 0.78; // the neck opening is rounder than the torso
  chest.add(collar);

  // piping: front arc only + two short capsules down the collar's front edges
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.094, 0.005, 6, seg, 3.5),
    mats.jacketTrim,
  );
  rim.rotation.x = Math.PI / 2;
  rim.rotation.z = Math.PI / 2 - 3.5 / 2; // center the arc on the FRONT
  rim.scale.y = 0.78;
  rim.position.y = 0.20;
  chest.add(rim);
  for (const m of [1, -1]) {
    const edge = new THREE.Mesh(new THREE.CapsuleGeometry(0.0045, 0.034, 3, 6), mats.jacketTrim);
    edge.position.set(m * 0.021, 0.178, 0.092 * 0.78);
    chest.add(edge);
  }

  // --- zipper pull: warm-silver metal tab + slider loop at the collar base ---
  const pull = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.032, 0.006), mats.chipFrame);
  pull.position.set(0, 0.135, 0.088 * 0.78 + 0.01);
  pull.rotation.x = 0.12;
  chest.add(pull);
  const slider = new THREE.Mesh(new THREE.TorusGeometry(0.010, 0.003, 5, 10), mats.chipFrame);
  slider.position.set(0, 0.158, 0.088 * 0.78 + 0.012);
  chest.add(slider);

  // --- chest chip emblem: silver rounded-square frame + amber gradient core,
  //     centered ON the zipper line at world y 1.24 (chest-local 0) ---
  const chipZ = jacketRadiusAt(1.24) * Z_SQUASH; // sit on the jacket surface
  const chip = new THREE.Group();
  chip.name = 'chip';
  chip.position.set(0, 0, chipZ - 0.004);

  const frameShape = roundedRect(0.105, 0.105, 0.024);
  const frame = new THREE.Mesh(
    new THREE.ExtrudeGeometry(frameShape, {
      depth: 0.012, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 2,
    }),
    mats.chipFrame,
  );
  chip.add(frame);

  if (!mats.chipCoreMapped) {
    const coreTex = makeChipCoreTexture();
    mats.chipCoreMapped = mats.chipCore.clone();
    mats.chipCoreMapped.color.setHex(0xffffff);
    mats.chipCoreMapped.map = coreTex;
    mats.chipCoreMapped.emissive = new THREE.Color(0xffffff);
    mats.chipCoreMapped.emissiveIntensity = 0.6; // no bloom pass — higher blows white

    mats.chipCoreMapped.emissiveMap = coreTex;
  }
  const core = new THREE.Mesh(new THREE.PlaneGeometry(0.062, 0.062), mats.chipCoreMapped);
  core.position.z = 0.019;
  chip.add(core);

  // connector pins — the painted traces continue off these
  for (const [x, y] of [[-0.062, 0], [0.062, 0], [0, -0.062], [0, 0.062]]) {
    const pin = new THREE.Mesh(
      new THREE.BoxGeometry(x === 0 ? 0.008 : 0.022, x === 0 ? 0.022 : 0.008, 0.006),
      mats.chipFrame,
    );
    pin.position.set(x, y, 0.004);
    chip.add(pin);
  }
  chest.add(chip);
  joints.chip = chip;
}

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
