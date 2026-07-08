// Head — sculpted lathe skull with a painted vinyl-toy face.
//
// Construction follows the reference boards (reference/marut-boards/):
// the skull is a low-segment lathe with five vertex-sculpt ops (face flatten,
// jaw taper, chin boss, brow ridge, socket recess) and SMOOTH normals — the
// facet look of the face is painted shading, not flat shading. All facial
// detail (almond eyes with lash band + iris gradient + catchlight, brows,
// smirk) lives in a canvas texture on a conformal decal cloned from the
// skull's front triangles — primitives can't hit that detail at budget, and
// blinking becomes a cheap canvas redraw (joints.head.userData.setBlink).
// Nose and ears stay geometry: they break the silhouette.
//
// Coordinates: the spec measures head-local against a pivot at world 1.63;
// the rig pivot sits at 1.46 (atlas height, just above the chin at 1.439).
// A `frame` group at +0.17 re-anchors spec-local → world, so every number
// below matches the boards' measured landmarks verbatim (chin −0.191 →
// world 1.439, crown +0.032 → 1.662).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COLORS } from '../palette.js';

export const FRAME_Y = 0.17; // spec-local (pivot-1.63) → rig-local (pivot 1.46)

// Skull silhouette profile (radius, specLocalY), chin → crown.
const SKULL_PROFILE = [
  [0.001, -0.191],
  [0.052, -0.186], // chin — wide, rounded-square
  [0.078, -0.162], // jaw
  [0.095, -0.118], // lower cheek
  [0.108, -0.075], // cheekbone
  [0.111, -0.052],
  [0.110, -0.020],
  [0.105, 0.005],  // temple
  [0.088, 0.020],
  [0.050, 0.030],
  [0.001, 0.032],  // crown
];

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------------------
// Face texture — all drawing in spec-local units via the X/Y mappers, so the
// painter and the decal's planar UVs share one coordinate system.
// ---------------------------------------------------------------------------
function makeFacePainter(quality) {
  const W = quality === 'low' ? 512 : 1024;
  const H = quality === 'low' ? 448 : 896;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const X = (x) => ((x + 0.115) / 0.230) * W;
  const Y = (y) => ((0.015 - y) / 0.200) * H;
  const S = (len) => (len / 0.230) * W;
  const skinHex = '#' + COLORS.skin.toString(16).padStart(6, '0');

  const almond = (m) => {
    // through-points: outer, upper peak, inner, lower valley (spec table)
    ctx.beginPath();
    ctx.moveTo(X(m * 0.073), Y(-0.060));
    ctx.quadraticCurveTo(X(m * 0.045), Y(-0.035), X(m * 0.017), Y(-0.066));
    ctx.quadraticCurveTo(X(m * 0.045), Y(-0.087), X(m * 0.073), Y(-0.060));
    ctx.closePath();
  };

  function draw(blink = 0) {
    ctx.clearRect(0, 0, W, H);

    // --- painted facet shading (the "sculpted" read) ---
    for (const m of [1, -1]) {
      // cheek saturation blush
      let g = ctx.createRadialGradient(X(m * 0.060), Y(-0.105), 0, X(m * 0.060), Y(-0.105), S(0.05));
      g.addColorStop(0, 'rgba(242,149,63,0.18)');
      g.addColorStop(1, 'rgba(242,149,63,0)');
      ctx.fillStyle = g;
      ctx.fillRect(X(m * 0.060) - S(0.05), Y(-0.105) - S(0.05), S(0.1), S(0.1));
      // under-brow shadow band
      ctx.fillStyle = 'rgba(176,95,40,0.25)';
      ctx.beginPath();
      ctx.ellipse(X(m * 0.055), Y(-0.053), S(0.040), S(0.010), 0, 0, Math.PI * 2);
      ctx.fill();
      // bright cheek facet triangle
      ctx.fillStyle = 'rgba(255,179,92,0.10)';
      ctx.beginPath();
      ctx.moveTo(X(m * 0.075), Y(-0.062));
      ctx.lineTo(X(m * 0.098), Y(-0.075));
      ctx.lineTo(X(m * 0.062), Y(-0.095));
      ctx.closePath();
      ctx.fill();
      // darker lower-cheek facet
      ctx.fillStyle = 'rgba(192,99,34,0.12)';
      ctx.beginPath();
      ctx.moveTo(X(m * 0.060), Y(-0.100));
      ctx.lineTo(X(m * 0.095), Y(-0.085));
      ctx.lineTo(X(m * 0.075), Y(-0.135));
      ctx.lineTo(X(m * 0.045), Y(-0.130));
      ctx.closePath();
      ctx.fill();
    }
    // forehead highlight
    let fg = ctx.createRadialGradient(X(0), Y(-0.010), 0, X(0), Y(-0.010), S(0.06));
    fg.addColorStop(0, 'rgba(255,196,104,0.10)');
    fg.addColorStop(1, 'rgba(255,196,104,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(X(0) - S(0.06), Y(-0.010) - S(0.06), S(0.12), S(0.12));
    // under-nose shadow
    ctx.fillStyle = 'rgba(164,74,18,0.35)';
    ctx.beginPath();
    ctx.ellipse(X(0), Y(-0.121), S(0.016), S(0.005), 0, 0, Math.PI * 2);
    ctx.fill();

    // --- brows: long tapered polygons wrapping toward the temples ---
    ctx.fillStyle = '#17100b';
    for (const m of [1, -1]) {
      const P = [[0.013, -0.050], [0.013, -0.040], [0.055, -0.029], [0.108, -0.040], [0.055, -0.045]];
      ctx.beginPath();
      ctx.moveTo(X(m * P[0][0]), Y(P[0][1]));
      for (let i = 1; i < P.length; i++) ctx.lineTo(X(m * P[i][0]), Y(P[i][1]));
      ctx.closePath();
      ctx.fill();
    }

    // --- eyes ---
    for (const m of [1, -1]) {
      ctx.save();
      almond(m);
      ctx.clip();
      // sclera
      ctx.fillStyle = '#ede6da';
      ctx.fillRect(X(m * 0.073) - S(0.08), Y(-0.045), S(0.16), S(0.05));
      // iris — radial gradient, big (64% of the opening)
      const cx = X(m * 0.045), cy = Y(-0.063);
      const ig = ctx.createRadialGradient(cx, cy, 0, cx, cy, S(0.018));
      ig.addColorStop(0, '#8a5638');
      ig.addColorStop(0.6, '#6f4430');
      ig.addColorStop(1, '#3a1b0c');
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.arc(cx, cy, S(0.018), 0, Math.PI * 2);
      ctx.fill();
      // pupil
      ctx.fillStyle = '#140a05';
      ctx.beginPath();
      ctx.arc(cx, cy, S(0.0065), 0, Math.PI * 2);
      ctx.fill();
      // catchlight — same screen side on both eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(X(m * 0.045 - 0.006), Y(-0.056), S(0.003), 0, Math.PI * 2);
      ctx.fill();
      // blink: skin-colored lid descends over the opening
      if (blink > 0.01) {
        const top = -0.047, bottom = -0.077;
        const lidY = top + blink * (bottom - top);
        ctx.fillStyle = skinHex;
        ctx.fillRect(X(m * 0.073) - S(0.08), Y(top) - 2, S(0.16), Y(lidY) - Y(top) + 2);
      }
      ctx.restore();

      // upper lash band with outer wing
      ctx.strokeStyle = '#241108';
      ctx.lineWidth = S(0.007);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X(m * 0.017), Y(-0.066));
      ctx.quadraticCurveTo(X(m * 0.045), Y(-0.035), X(m * 0.073), Y(-0.060));
      ctx.lineTo(X(m * 0.081), Y(-0.057));
      ctx.stroke();
      // subtle lower-lid line
      ctx.strokeStyle = '#b4622a';
      ctx.lineWidth = S(0.002);
      ctx.beginPath();
      ctx.moveTo(X(m * 0.020), Y(-0.068));
      ctx.quadraticCurveTo(X(m * 0.045), Y(-0.085), X(m * 0.070), Y(-0.063));
      ctx.stroke();
      // closed-lash curve at full blink
      if (blink >= 0.95) {
        ctx.strokeStyle = '#241108';
        ctx.lineWidth = S(0.004);
        ctx.beginPath();
        ctx.moveTo(X(m * 0.017), Y(-0.066));
        ctx.quadraticCurveTo(X(m * 0.045), Y(-0.080), X(m * 0.073), Y(-0.060));
        ctx.stroke();
      }
    }

    // --- mouth: confident smirk (+x corner rides higher) ---
    ctx.strokeStyle = '#5e2610';
    ctx.lineWidth = S(0.0045);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(X(-0.038), Y(-0.146));
    ctx.bezierCurveTo(X(-0.014), Y(-0.156), X(0.014), Y(-0.156), X(0.038), Y(-0.144));
    ctx.lineTo(X(0.046), Y(-0.138));
    ctx.moveTo(X(-0.038), Y(-0.146));
    ctx.lineTo(X(-0.046), Y(-0.140));
    ctx.stroke();
    // lower-lip shade
    ctx.fillStyle = 'rgba(164,78,19,0.40)';
    ctx.beginPath();
    ctx.ellipse(X(0), Y(-0.162), S(0.020), S(0.006), 0, 0, Math.PI * 2);
    ctx.fill();
    // faint philtrum
    ctx.strokeStyle = 'rgba(200,111,46,0.30)';
    ctx.lineWidth = S(0.002);
    ctx.beginPath();
    ctx.moveTo(X(0), Y(-0.123));
    ctx.lineTo(X(0), Y(-0.142));
    ctx.stroke();
  }

  return { canvas, draw };
}

export function buildHead({ joints, mats, quality }) {
  const head = joints.head;
  const frame = new THREE.Group();
  frame.name = 'skullFrame';
  frame.position.y = FRAME_Y;
  head.add(frame);

  const skinShadow = new THREE.MeshStandardMaterial({ color: 0xc05a18, roughness: 0.55, envMapIntensity: 0.6 });
  const radial = quality === 'low' ? 10 : 14;

  // --- skull: lathe + five sculpt ops, smooth normals ---
  const pts = SKULL_PROFILE.map(([r, y]) => new THREE.Vector2(r, y));
  const skull = new THREE.LatheGeometry(pts, radial);
  skull.scale(1, 1, 0.95);
  const pos = skull.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // face flatten — full strength at the centerline, fading out by |x|=0.09
    if (z > 0.055 && y > -0.19 && y < 0.01) {
      const w = 1 - smoothstep(0, 0.09, Math.abs(x));
      z += w * ((0.055 + (z - 0.055) * 0.55) - z);
    }
    // jaw taper toward the chin
    if (y < -0.10 && z > 0) {
      const t = Math.min(1, (-0.10 - y) / 0.09);
      x *= 1 - 0.22 * t;
    }
    // chin boss
    if (y < -0.15 && z > 0.03) z += Math.min(0.014, (-0.15 - y) * 0.35);
    // brow ridge
    if (y > -0.045 && y < -0.022 && z > 0.06) z += 0.006;
    // eye-socket recess
    if (y > -0.075 && y < -0.048 && z > 0.07) z -= 0.004;
    pos.setXYZ(i, x, y, z);
  }
  skull.computeVertexNormals();

  // --- ears: shell (skin) merges with the skull; darker concha bowl reads
  //     as the inner ear without real cavity geometry ---
  const earGeos = [];
  for (const m of [1, -1]) {
    const shell = new THREE.SphereGeometry(0.032, 8, 6);
    shell.scale(0.45, 1.02, 0.75);
    const mtx = new THREE.Matrix4()
      .makeRotationY(-m * 0.25)
      .setPosition(m * 0.114, -0.075, -0.042);
    shell.applyMatrix4(mtx);
    earGeos.push(shell);

    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), skinShadow);
    bowl.scale.set(0.3, 0.8, 0.6);
    bowl.position.set(m * 0.120, -0.075, -0.042);
    bowl.rotation.y = -m * 0.25;
    frame.add(bowl);
  }
  const skinMerged = mergeGeometries([skull, ...earGeos]);
  frame.add(new THREE.Mesh(skinMerged, mats.skin));

  // --- face decal: clone the skull's front triangles, offset along normals,
  //     planar-project UVs, paint with the canvas ---
  const painter = makeFacePainter(quality);
  painter.draw(0);
  const faceTex = new THREE.CanvasTexture(painter.canvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  faceTex.anisotropy = 4;

  const src = skull.toNonIndexed();
  const sp = src.attributes.position, sn = src.attributes.normal;
  const keptPos = [], keptNorm = [], keptUV = [];
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), fn = new THREE.Vector3();
  for (let i = 0; i < sp.count; i += 3) {
    for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(sp, i + k);
    if (v[0].z <= 0.015 || v[1].z <= 0.015 || v[2].z <= 0.015) continue;
    fn.crossVectors(e1.subVectors(v[1], v[0]), e2.subVectors(v[2], v[0])).normalize();
    if (fn.z <= 0.2) continue;
    for (let k = 0; k < 3; k++) {
      const nx = sn.getX(i + k), ny = sn.getY(i + k), nz = sn.getZ(i + k);
      keptPos.push(v[k].x + nx * 0.0015, v[k].y + ny * 0.0015, v[k].z + nz * 0.0015);
      keptNorm.push(nx, ny, nz);
      keptUV.push((v[k].x + 0.115) / 0.230, (v[k].y + 0.185) / 0.200);
    }
  }
  const decalGeo = new THREE.BufferGeometry();
  decalGeo.setAttribute('position', new THREE.Float32BufferAttribute(keptPos, 3));
  decalGeo.setAttribute('normal', new THREE.Float32BufferAttribute(keptNorm, 3));
  decalGeo.setAttribute('uv', new THREE.Float32BufferAttribute(keptUV, 2));
  const decal = new THREE.Mesh(decalGeo, new THREE.MeshStandardMaterial({
    map: faceTex, transparent: true, roughness: 0.5, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    depthWrite: false,
  }));
  decal.renderOrder = 1;
  frame.add(decal);

  // blink hook — animation.js drives this instead of scaling eye groups
  let lastBlink = 0;
  joints.head.userData.setBlink = (t) => {
    if (Math.abs(t - lastBlink) < 0.05 && t !== 0 && t !== 1) return;
    lastBlink = t;
    painter.draw(t);
    faceTex.needsUpdate = true;
  };

  // legacy blink targets — kept as empty groups so older animator code
  // scaling eyeL/eyeR cannot crash (it just no-ops)
  for (const m of [1, -1]) {
    const eye = new THREE.Group();
    eye.name = m === 1 ? 'eyeL' : 'eyeR';
    eye.position.set(m * 0.045, -0.062, 0.09);
    frame.add(eye);
    joints[eye.name] = eye;
  }

  // --- nose: 7-vertex faceted wedge (small straight bridge, diamond tip) ---
  const N = {
    root: [0, -0.064, 0.096],
    bL: [-0.008, -0.085, 0.102], bR: [0.008, -0.085, 0.102],
    tip: [0, -0.103, 0.116],
    aL: [-0.019, -0.112, 0.098], aR: [0.019, -0.112, 0.098],
    under: [0, -0.119, 0.100],
  };
  const noseTris = [
    N.root, N.bL, N.bR,
    N.bL, N.tip, N.bR,
    N.bL, N.aL, N.tip,
    N.bR, N.tip, N.aR,
    N.aL, N.under, N.tip,
    N.aR, N.tip, N.under,
  ];
  const noseGeo = new THREE.BufferGeometry();
  noseGeo.setAttribute('position', new THREE.Float32BufferAttribute(noseTris.flat(), 3));
  noseGeo.computeVertexNormals();
  frame.add(new THREE.Mesh(noseGeo, mats.skinFlat));

  // --- neck: short + thick, tucks under the jaw and inside the collar.
  //     Parented to the neck joint so head yaw doesn't shear it.
  //     (neck joint world 1.38; cylinder spans world 1.36–1.49) ---
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.052, 0.13, 10), mats.skin);
  neckMesh.position.y = 0.045;
  joints.neck.add(neckMesh);
}
