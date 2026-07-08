// ============================================================================
// createMarut — the OranjeStride mascot, 100% authored in code.
// No GLB, no external assets: geometry from Three.js builders, surfaces from
// canvas-generated textures, motion from the boneless channel-compose animator.
//
// Instance API is contract-compatible with the old GLB mount so section wiring
// (mascot-lab chips, showcase, scene.js registerMascot) needs no special cases.
// ============================================================================
import * as THREE from 'three';
import { makeMaterials, COLORS } from './palette.js';
import { makeJacketMaps, makeTextDecal, makeGlowTexture } from './textures.js';
import { buildRig } from './rig.js';
import { buildHead } from './geometry/head.js';
import { buildHair } from './geometry/hair.js';
import { buildTorso } from './geometry/torso.js';
import { buildArms, buildLegs } from './geometry/limbs.js';
import { buildShoes } from './geometry/shoes.js';
import { buildTail } from './geometry/tail.js';
import { MarutAnimator } from './animation.js';

export function createMarut({ quality = 'high' } = {}) {
  const mats = makeMaterials();

  // Printed jacket: canvas-drawn base + emissive maps on a clone of the plain
  // jacket material (collar/hem/arms keep the plain one).
  if (!mats.jacketMapped) {
    const maps = makeJacketMaps({ size: quality === 'low' ? 1024 : 2048 });
    mats.jacketMapped = mats.jacket.clone();
    mats.jacketMapped.color.setHex(0xffffff); // map already carries the color — a dark tint would multiply it away
    mats.jacketMapped.map = maps.map;
    mats.jacketMapped.emissive = new THREE.Color(0xffffff);
    // per-feature brightness lives in the emissive canvas (back print loud,
    // front traces dim) — this is just the master gain
    mats.jacketMapped.emissiveIntensity = 0.85;
    mats.jacketMapped.emissiveMap = maps.emissiveMap;
  }

  const { root, joints } = buildRig();
  const ctx = { joints, mats, quality };

  buildHead(ctx);
  buildHair(ctx);
  buildTorso(ctx);
  buildArms(ctx);
  buildLegs(ctx);
  buildShoes(ctx);
  const tail = buildTail(ctx);

  // --- "ORANJE / STRIDE" chest decals (crisp planes — seam/mirror-proof) ---
  const decalTex = makeTextDecal();
  for (const m of [1, -1]) {
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(0.105, 0.052),
      new THREE.MeshStandardMaterial({
        map: decalTex, transparent: true, roughness: 0.6,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      }),
    );
    decal.position.set(m * 0.100, 0.058, 0.112); // world y ~1.30, on each pec
    decal.rotation.y = m * 0.42; // hug the chest curve
    joints.chest.add(decal);
  }

  // --- additive glow: a single subtle halo behind the chest chip. The tail
  //     carries NO sprites — on the boards it's solid lit vinyl, not neon. ---
  const glowTex = makeGlowTexture(COLORS.chipGlow);
  const chipHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, opacity: 0.35,
  }));
  chipHalo.scale.setScalar(0.14);
  chipHalo.position.z = 0.03;
  joints.chip.add(chipHalo);

  // rest A-pose lives in poses.js REST — the animator owns all joint writes
  const anim = new MarutAnimator({ joints, mats, tail, runner: null });

  const inst = {
    sectionId: '*', // showcase mode: single always-active mascot
    root,
    joints,
    tail,
    anim,
    active: true,

    setActive(on) {
      this.active = on;
      root.visible = on;
    },

    // wave | cheer | point | run — mascot-lab chips call this directly
    play(name) { anim.play(name); },
    setBasePose(name, dur) { anim.setBasePose(name, dur); },
    setLocomotion(v) { anim.setLocomotion(v); },
    setYaw(rad, dur) { anim.setYaw(rad, dur); },
    addDragYaw(d) { anim.addDragYaw(d); },
    setDragging(on) { anim.setDragging(on); },
    setLookEnabled(on) { anim.lookEnabled = on; },

    update(frame) { anim.update(frame); },

    dispose() {
      root.parent?.remove(root);
      root.traverse((o) => o.geometry?.dispose());
    },
  };

  return inst;
}
