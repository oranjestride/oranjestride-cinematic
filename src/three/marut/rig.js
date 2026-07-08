// Boneless rig — nested Object3D groups with pivots at anatomical joints.
// The animator writes composed Euler rotations to these groups every frame;
// geometry builders parent meshes into them in joint-local coordinates.
//
// World-space landmarks measured from the reference turnaround boards
// (reference/marut-boards/, front T-pose cross-checked with both 3/4 views):
//   feet y=0 · 1.80 total INCLUDING hair · crown 1.68 (6.7 anatomical heads,
//   ~6 visual heads — the hair owns 1.68→1.80)
//   hips 0.92 · spine 1.04 · chest 1.24 · neck 1.38 · head pivot 1.46
//   shoulder pivot (±0.22, 1.24) · elbow 1.005 · wrist 0.77 relaxed
//   (T-pose wrist |x| 0.693, fingertips 0.88 — hand length 0.17)
//   femur (±0.10, 0.90) · knee 0.52 · ankle 0.12 · jacket hem 0.856
//   tail exits the pants seat at (0, 0.80, −0.11)
// Rig neutral is ARMS-DOWN (geometry authored hanging); the boards' T-pose is
// a pose (±90° clav+shoulder z-rotation), not the rig placement.
import * as THREE from 'three';

export const DIMS = {
  hipsY: 0.92,
  spineDY: 0.12,   // spine 1.04
  chestDY: 0.20,   // chest 1.24
  neckDY: 0.14,    // neck 1.38
  headDY: 0.08,    // head pivot 1.46
  clavDX: 0.055,   // clav near the sternum so shrug/breath arcs read
  clavDY: 0.065,   // clav at (±0.055, 1.305)
  shoulderDX: 0.165,
  shoulderDY: -0.065, // shoulder pivot lands at (±0.22, 1.24) — sloped line
  armUpLen: 0.235,
  armLoLen: 0.235,
  handLen: 0.17,   // chunky vinyl mitts — 68% of head height
  hipDX: 0.10,
  hipDY: -0.02,    // femur pivot (±0.10, 0.90)
  thighLen: 0.38,  // knee 0.52
  shinLen: 0.40,   // ankle 0.12 (tall shoe: collar tops out at 0.15)
  tailDY: -0.12,   // tail root (0, 0.80, −0.11) — the pants seat
  tailDZ: -0.11,
};

export function buildRig() {
  const joints = {};
  const grp = (name, parent, x, y, z) => {
    const o = new THREE.Group();
    o.name = name;
    o.position.set(x, y, z);
    parent.add(o);
    joints[name] = o;
    return o;
  };

  const root = new THREE.Group();
  root.name = 'marut';
  joints.root = root;

  const hips = grp('hips', root, 0, DIMS.hipsY, 0);
  const spine = grp('spine', hips, 0, DIMS.spineDY, 0);
  const chest = grp('chest', spine, 0, DIMS.chestDY, 0);
  const neck = grp('neck', chest, 0, DIMS.neckDY, 0);
  grp('head', neck, 0, DIMS.headDY, 0);

  for (const s of ['L', 'R']) {
    const m = s === 'L' ? 1 : -1;
    const clav = grp(`clav${s}`, chest, m * DIMS.clavDX, DIMS.clavDY, 0);
    const up = grp(`arm${s}_up`, clav, m * DIMS.shoulderDX, DIMS.shoulderDY, 0);
    const lo = grp(`arm${s}_lo`, up, 0, -DIMS.armUpLen, 0);
    grp(`hand${s}`, lo, 0, -DIMS.armLoLen, 0);

    const leg = grp(`leg${s}_up`, hips, m * DIMS.hipDX, DIMS.hipDY, 0);
    const shin = grp(`leg${s}_lo`, leg, 0, -DIMS.thighLen, 0);
    grp(`foot${s}`, shin, 0, -DIMS.shinLen, 0);
  }

  grp('tailRoot', hips, 0, DIMS.tailDY, DIMS.tailDZ);

  return { root, joints };
}
