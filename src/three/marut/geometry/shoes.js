// Shoes — low-profile slip-on sneaker-loafers: smooth orange vinyl upper with
// a sculpted height profile (toe dome → instep peak → low heel), a dark sole
// slab whose rim ledges out past the upper all around, a raised instep gusset
// panel over a dark underlay (the seam/notch every board view shows), a snug
// ankle collar with a dark sock plug, and the back view's heel-counter arch
// seam. Smooth-shaded on purpose — the shoes contrast the faceted hair/jacket.
// Foot-local: ankle at (0,0,0), world y 0.12; ground at local −0.12.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const GROUND = -0.12;

// Outline drawn in XY (+y = toe, origin = ankle): length 0.30, heel −0.105,
// toe +0.196, ball half-width 0.0575, rounded-square toe.
function footprint(sx = 1, sy = 1) {
  const s = new THREE.Shape();
  s.moveTo(-0.046 * sx, -0.096 * sy);
  s.quadraticCurveTo(-0.050 * sx, -0.105 * sy, 0, -0.105 * sy);
  s.quadraticCurveTo(0.050 * sx, -0.105 * sy, 0.046 * sx, -0.096 * sy);
  s.lineTo(0.052 * sx, -0.02 * sy);
  s.quadraticCurveTo(0.058 * sx, 0.06 * sy, 0.0575 * sx, 0.09 * sy);
  s.quadraticCurveTo(0.056 * sx, 0.15 * sy, 0.040 * sx, 0.183 * sy);
  s.quadraticCurveTo(0.022 * sx, 0.196 * sy, 0, 0.196 * sy);
  s.quadraticCurveTo(-0.022 * sx, 0.196 * sy, -0.040 * sx, 0.183 * sy);
  s.quadraticCurveTo(-0.056 * sx, 0.15 * sy, -0.0575 * sx, 0.09 * sy);
  s.quadraticCurveTo(-0.058 * sx, 0.06 * sy, -0.052 * sx, -0.02 * sy);
  s.closePath();
  return s;
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// shared toe spring — identical on sole and upper so no gap opens at the toe
const toeLift = (fz) => 1.2 * Math.max(0, fz - 0.12) ** 2;

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

export function buildShoes({ joints, mats, quality }) {
  const curveSeg = quality === 'low' ? 6 : 16;

  for (const s of ['L', 'R']) {
    const foot = joints[`foot${s}`];
    const shoeParts = [];
    const darkParts = [];

    // --- sole slab: flat bottom, heel wedge, toe spring, protruding rim ---
    let sole = new THREE.ExtrudeGeometry(footprint(1, 1), {
      depth: 0.014, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005,
      bevelSegments: 3, curveSegments: curveSeg,
    });
    sole.rotateX(-Math.PI / 2); // shape +y (toe) → +z; extrude → +y
    {
      const pos = sole.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i);
        const fz = pos.getZ(i);
        y = Math.max(y, -0.004); // flatten the bottom bevel
        if (y > 0.005) y += 0.012 * smooth(-0.03, -0.105, fz) * (fz < -0.03 ? 1 : 0) + 0.012 * smooth(0.105, 0.03, -fz) * 0; // heel wedge (top only)
        if (y > 0.005 && fz < -0.03) y += 0.012 * smooth(-0.03, -0.105, fz);
        y += toeLift(fz);
        pos.setY(i, y + GROUND + 0.004);
      }
      sole = mergeVertices(sole, 1e-4);
      sole.computeVertexNormals();
      darkParts.push(sole);
    }

    // --- upper: smaller footprint, tall bevel dome, sculpted height profile ---
    let upper = new THREE.ExtrudeGeometry(footprint(0.88, 0.95), {
      depth: 0.03, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.024,
      bevelSegments: quality === 'low' ? 3 : 5, curveSegments: curveSeg,
    });
    upper.rotateX(-Math.PI / 2);
    {
      const pos = upper.attributes.position;
      const base = 0.014; // sits just on the sole top
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i);
        const fz = pos.getZ(i);
        y = Math.max(y, -0.002);
        // height profile: toe 0.095 / instep 0.118 / heel 0.088 (above ground)
        const prof =
          fz > 0.10 ? 0.80 :
          fz > 0.02 ? 0.80 + 0.28 * smooth(0.10, 0.02, fz) :
          fz > -0.05 ? 1.08 - 0.16 * smooth(-0.02, -0.05, fz) :
          0.92 - 0.28 * smooth(-0.05, -0.098, fz);
        y = y * prof;
        y += toeLift(fz);
        pos.setY(i, y + GROUND + base);
      }
      upper = mergeVertices(upper, 1e-4);
      upper.computeVertexNormals();
      shoeParts.push(upper);
    }

    // --- ankle collar (snug, top sloping down toward the back) + lip ---
    {
      // collar tops out at world ~0.147 so the pant cuff (bottom 0.13)
      // overlaps it by a whisker instead of fighting it
      const collar = new THREE.CylinderGeometry(0.037, 0.0455, 0.058, quality === 'low' ? 18 : 24, 1, true);
      const pos = collar.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i), z = pos.getZ(i);
        if (y > 0.015 && z < 0) pos.setY(i, y - 0.015 * Math.min(1, -z / 0.04));
      }
      collar.computeVertexNormals();
      collar.translate(0, -0.004, 0.004);
      shoeParts.push(collar);
      const lip = new THREE.TorusGeometry(0.0365, 0.004, 8, 18);
      lip.rotateX(Math.PI / 2);
      lip.translate(0, 0.024, 0.004);
      shoeParts.push(lip);
    }

    // --- sock plug: the dark V at the collar back / gaps beside it ---
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.033, 0.085, 14), mats.pants);
    sock.position.set(0, 0.01, 0.002);
    foot.add(sock);

    // --- instep gusset panel over a dark underlay (the seam + notch) ---
    {
      const panel = new THREE.ExtrudeGeometry(roundedRect(0.054, 0.112, 0.009), {
        depth: 0.006, bevelEnabled: true, bevelThickness: 0.0025, bevelSize: 0.002, bevelSegments: 2,
      });
      const under = new THREE.ExtrudeGeometry(roundedRect(0.061, 0.119, 0.011), {
        depth: 0.0022, bevelEnabled: false,
      });
      const place = (geo, zOff) => {
        const mtx = new THREE.Matrix4()
          .makeRotationX(-0.95)
          .setPosition(0, -0.034, 0.080 + zOff);
        geo.applyMatrix4(mtx);
      };
      place(under, -0.004);
      place(panel, 0);
      darkParts.push(under);
      shoeParts.push(panel);
    }

    // --- heel counter arch seam (back view) ---
    {
      const arc = new THREE.TorusGeometry(0.030, 0.0022, 6, 20, Math.PI * 1.05);
      arc.rotateZ(-Math.PI * 0.02 - Math.PI * 0.0);
      arc.rotateZ(Math.PI + (Math.PI * 1.05 - Math.PI) / -2); // arc opening downward
      arc.rotateX(0.12);
      arc.translate(0, -0.066, -0.086);
      darkParts.push(arc);
    }

    // extrudes are non-indexed while cylinders/tori are indexed — normalize
    // to non-indexed so mergeGeometries accepts the mix
    const flat = (list) => list.map((g) => (g.index ? g.toNonIndexed() : g));
    const shoeMesh = new THREE.Mesh(mergeGeometries(flat(shoeParts)), mats.shoe);
    const darkMesh = new THREE.Mesh(mergeGeometries(flat(darkParts)), mats.sole);
    shoeParts.forEach((g) => g.dispose());
    darkParts.forEach((g) => g.dispose());
    foot.add(shoeMesh, darkMesh);
  }
}
