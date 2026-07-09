// Arrow tail — Marut's signature. On the boards this is a THICK glossy
// solid-vinyl tube (a fully lit orange surface with a specular running its
// length — not a neon glow-blob): it exits the pants seat, sweeps down and
// out to his right, then hooks up into a big faceted chevron arrowhead.
// The only emissive parts are the etched circuit glyphs along the outer face
// of the curve and the vinyl's faint inner warmth. No halos, no haze.
//
// Exposes { curve, mesh, arrowhead } — the animator's sway hook rotates
// tailRoot; nothing else needs per-frame work.
import * as THREE from 'three';
import { COLORS } from '../palette.js';

// tailRoot-local (tailRoot at the pants seat, world (0, 0.80, −0.11)).
// Character faces +Z, so −X is his right (screen-left in a frontal shot).
const CURVE_POINTS = [
  [0, 0, 0],
  [-0.06, -0.20, -0.13],
  [-0.24, -0.42, -0.10],
  [-0.40, -0.34, 0.00],
  [-0.48, -0.12, 0.04],
  [-0.52, 0.02, 0.02],
];
const GLYPH_TS = [0.30, 0.42, 0.55, 0.68, 0.80];

export function buildTail({ joints, mats, quality }) {
  const tailRoot = joints.tailRoot;
  // glossy vinyl — dense rings so the strong rim/env highlights sweep along
  // the tube without polygon kinks (48×10 kinked visibly on the S-bend)
  const tubular = quality === 'low' ? 28 : 80;
  const radial = quality === 'low' ? 8 : 14;

  const curve = new THREE.CatmullRomCurve3(CURVE_POINTS.map((p) => new THREE.Vector3(...p)));

  // --- tapered tube: scale each vertex ring toward the curve centerline ---
  const tube = new THREE.TubeGeometry(curve, tubular, 0.034, radial, false);
  const pos = tube.attributes.position;
  const ringSize = radial + 1;
  const center = new THREE.Vector3(), v = new THREE.Vector3();
  for (let ring = 0; ring <= tubular; ring++) {
    const t = ring / tubular;
    const s = THREE.MathUtils.lerp(1.1, 0.55, t); // thick at the seat → slim at the head
    curve.getPointAt(t, center);
    for (let k = 0; k < ringSize; k++) {
      const i = ring * ringSize + k;
      v.fromBufferAttribute(pos, i).sub(center).multiplyScalar(s).add(center);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
  }
  tube.computeVertexNormals();
  const mesh = new THREE.Mesh(tube, mats.tail);
  tailRoot.add(mesh);

  // --- etched circuit glyphs: thin emissive dashes hugging the outer face ---
  const frames = curve.computeFrenetFrames(tubular, false);
  for (let gi = 0; gi < GLYPH_TS.length; gi++) {
    const t = GLYPH_TS[gi];
    const ring = Math.round(t * tubular);
    const radius = 0.034 * THREE.MathUtils.lerp(1.1, 0.55, t);
    const p = curve.getPointAt(t);
    const n = frames.normals[ring].clone().negate(); // outer face of the hook
    const tan = frames.tangents[ring];
    const g = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, gi % 2 ? 0.028 : 0.042, 0.0035),
      mats.tailGlyph,
    );
    g.position.copy(p).addScaledVector(n, radius);
    g.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(n.clone().cross(tan).normalize(), tan, n),
    );
    tailRoot.add(g);
    // little side tick off every other dash (circuit-elbow read)
    if (gi % 2 === 0) {
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.004, 0.0035), mats.tailGlyph);
      tick.position.copy(g.position).addScaledVector(tan, 0.016);
      tick.quaternion.copy(g.quaternion);
      tailRoot.add(tick);
    }
  }

  // --- big faceted chevron arrowhead, aligned to the exit tangent ---
  const headShape = new THREE.Shape();
  headShape.moveTo(0, 0.150);        // tip
  headShape.lineTo(0.095, -0.030);   // right barb
  headShape.lineTo(0.034, 0.004);    // inner notch
  headShape.lineTo(0.026, -0.078);   // shaft right
  headShape.lineTo(-0.026, -0.078);  // shaft left
  headShape.lineTo(-0.034, 0.004);
  headShape.lineTo(-0.095, -0.030);  // left barb
  headShape.closePath();
  const headGeo = new THREE.ExtrudeGeometry(headShape, {
    depth: 0.022, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.007, bevelSegments: 1,
  });
  headGeo.translate(0, 0.03, -0.011);
  // faceted like the boards — local flat-shaded variant of the tail vinyl.
  // The arrowhead is the tail's DELIBERATE glow (design brief: "glowing
  // arrow tail"): emissive sits well past the bloom threshold so the halo
  // is guaranteed at every camera angle, not an env-reflection accident.
  const headMat = new THREE.MeshStandardMaterial({
    color: COLORS.tail, roughness: 0.3, envMapIntensity: 1.3,
    emissive: 0xffb45f, emissiveIntensity: 2.0, flatShading: true,
  });
  const arrowhead = new THREE.Mesh(headGeo, headMat);
  const tipPos = curve.getPointAt(1);
  const tangent = curve.getTangentAt(1);
  arrowhead.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
  arrowhead.position.copy(tipPos);
  tailRoot.add(arrowhead);

  return { curve, mesh, arrowhead };
}
