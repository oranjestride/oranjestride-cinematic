// Declarative base poses — Euler targets per joint, composed over REST.
// The animator tweens the `base` channel toward these; procedural layers
// (breath, locomotion, one-shots) stack on top.
//
// Sign conventions (character faces +Z):
//   arm/leg rotation.x > 0 → limb swings backward (−Z)
//   armL rotation.z > 0 / armR rotation.z < 0 → arm lifts outward/up
//   spine rotation.x > 0 → forward lean

export const REST = {
  armL_up: { z: 0.14 },
  armR_up: { z: -0.14 },
};

export const BASE_POSES = {
  idle: {},

  // hero stance: chest open, chin up a touch, arms a little wider
  confident: {
    chest: { x: -0.05 },
    head: { x: -0.04 },
    armL_up: { z: 0.22, x: 0.06 },
    armR_up: { z: -0.22, x: 0.06 },
    armL_lo: { x: -0.12 },
    armR_lo: { x: -0.12 },
  },

  // right arm raised toward the globe (India Tour)
  point: {
    armR_up: { z: -1.15, x: -0.85 },
    armR_lo: { x: -0.18 },
    armL_up: { z: 0.18 },
    head: { y: -0.22, x: -0.08 },
    chest: { y: -0.12 },
  },

  // welcoming, palms out (Contact)
  openArms: {
    armL_up: { z: 0.85, x: -0.28 },
    armR_up: { z: -0.85, x: -0.28 },
    armL_lo: { z: 0.35, x: -0.25 },
    armR_lo: { z: -0.35, x: -0.25 },
    chest: { x: -0.06 },
    head: { x: -0.05 },
  },

  // coiled sprinter (used with a locomotion override)
  runReady: {
    spine: { x: 0.18 },
    chest: { x: 0.08 },
    armL_lo: { x: -0.9 },
    armR_lo: { x: -0.9 },
  },
};

// Merge REST + named pose into a complete {joint: {x,y,z}} target map.
export function composePose(name) {
  const pose = BASE_POSES[name] || BASE_POSES.idle;
  const out = {};
  for (const src of [REST, pose]) {
    for (const [j, e] of Object.entries(src)) {
      out[j] = { x: 0, y: 0, z: 0, ...out[j], ...e };
    }
  }
  return out;
}
