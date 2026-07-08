// ============================================================================
// MarutAnimator — boneless, channel-composed procedural animation.
//
// GSAP never touches joint.rotation directly: it tweens plain numbers in the
// `base` and `overlay` channel sets, while `breath` and `loco` are written
// procedurally every frame. update() composes all four once per joint:
//
//   joint.rotation = base + breath + loco + overlay   (+ look, head/neck only)
//
// so tweens and per-frame motion can never fight (the old GLB pipeline's
// mixer-vs-code conflict is structurally impossible here).
// ============================================================================
import gsap from 'gsap';
import { composePose } from './poses.js';

const RIG_JOINTS = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'clavL', 'armL_up', 'armL_lo', 'handL',
  'clavR', 'armR_up', 'armR_lo', 'handR',
  'legL_up', 'legL_lo', 'footL',
  'legR_up', 'legR_lo', 'footR',
  'tailRoot',
];

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

const zeroSet = () => Object.fromEntries(RIG_JOINTS.map((j) => [j, { x: 0, y: 0, z: 0 }]));

export class MarutAnimator {
  constructor({ joints, mats, tail, runner }) {
    this.joints = joints;
    this.mats = mats;
    this.tail = tail;
    this.runner = runner;

    this.base = zeroSet();
    this.breath = zeroSet();
    this.loco = zeroSet();
    this.overlay = zeroSet();

    this.t = 0;
    this.phase = 0;
    this.w = 0;                 // locomotion weight 0..1
    this.locoOverride = null;   // forced run weight (showcase sections)
    this.locoPulse = { v: 0 };  // play('run') impulse
    this.rootBob = 0;
    this.hop = { v: 0 };        // cheer jump impulse (world units)

    this.look = { headY: 0, headX: 0, neckY: 0, neckX: 0 };
    this.lookEnabled = true;

    this.yawBase = { v: 0 };
    this.dragYaw = 0;
    this.dragVel = 0;
    this.dragging = false;

    this.blinkAt = 2 + Math.random() * 3;
    this.overlayTL = null;

    this.setBasePose('idle', 0);
  }

  // ---- base pose ------------------------------------------------------------
  setBasePose(name, dur = 0.8) {
    const target = composePose(name);
    for (const j of RIG_JOINTS) {
      const to = target[j] || { x: 0, y: 0, z: 0 };
      gsap.to(this.base[j], { ...to, duration: dur, ease: 'power2.inOut', overwrite: 'auto' });
    }
  }

  // ---- locomotion -----------------------------------------------------------
  setLocomotion(v) { this.locoOverride = v; } // null → scrollVel-driven

  // ---- yaw / drag-rotate ------------------------------------------------------
  setYaw(rad, dur = 0.8) {
    gsap.to(this.yawBase, { v: rad, duration: dur, ease: 'power2.inOut', overwrite: 'auto' });
  }
  addDragYaw(d) { this.dragYaw += d; this.dragVel = d; }
  setDragging(on) { this.dragging = on; if (on) this.dragVel = 0; }

  // ---- one-shots --------------------------------------------------------------
  play(name) {
    if (name === 'run') {
      gsap.timeline()
        .to(this.locoPulse, { v: 1, duration: 0.35, ease: 'power2.out' })
        .to(this.locoPulse, { v: 0, duration: 0.6, ease: 'power2.inOut' }, 1.1);
      return;
    }
    const factory = { wave: this.#wave, cheer: this.#cheer, point: this.#point }[name];
    if (!factory) return;
    this.overlayTL?.kill();
    // settle any previous overlay pose quickly, then run the new one
    for (const j of RIG_JOINTS) gsap.to(this.overlay[j], { x: 0, y: 0, z: 0, duration: 0.15, overwrite: 'auto' });
    this.overlayTL = factory.call(this);
  }

  #wave() {
    const ov = this.overlay;
    return gsap.timeline({ delay: 0.16 })
      .to(ov.armR_up, { z: -2.05, x: -0.25, duration: 0.38, ease: 'power2.out' })
      .to(ov.armR_lo, { z: -0.55, duration: 0.2, ease: 'sine.inOut' }, 0.30)
      .to(ov.armR_lo, { z: 0.25, duration: 0.24, ease: 'sine.inOut', repeat: 3, yoyo: true }, 0.50)
      .to(ov.head, { z: 0.12, duration: 0.3, ease: 'sine.inOut' }, 0.35)
      .to(ov.armR_up, { z: 0, x: 0, duration: 0.5, ease: 'power2.inOut' }, 1.75)
      .to(ov.armR_lo, { z: 0, duration: 0.4, ease: 'power2.inOut' }, 1.75)
      .to(ov.head, { z: 0, duration: 0.4, ease: 'power2.inOut' }, 1.75);
  }

  #cheer() {
    const ov = this.overlay;
    return gsap.timeline()
      .to(ov.armL_up, { z: 2.45, x: -0.2, duration: 0.34, ease: 'back.out(1.6)' }, 0)
      .to(ov.armR_up, { z: -2.45, x: -0.2, duration: 0.34, ease: 'back.out(1.6)' }, 0)
      .to(ov.armL_lo, { z: 0.3, duration: 0.3 }, 0.1)
      .to(ov.armR_lo, { z: -0.3, duration: 0.3 }, 0.1)
      .to(ov.head, { x: -0.22, duration: 0.3, ease: 'sine.out' }, 0.05)
      .to(this.hop, { v: 0.085, duration: 0.22, ease: 'power2.out', repeat: 3, yoyo: true }, 0.15)
      .to([ov.armL_up, ov.armR_up, ov.armL_lo, ov.armR_lo, ov.head],
        { x: 0, y: 0, z: 0, duration: 0.55, ease: 'power2.inOut' }, 1.7);
  }

  #point() {
    const ov = this.overlay;
    return gsap.timeline()
      .to(ov.armR_up, { z: -1.15, x: -0.85, duration: 0.4, ease: 'power2.out' })
      .to(ov.armR_lo, { x: -0.15, duration: 0.3 }, 0.15)
      .to(ov.head, { y: -0.25, duration: 0.35, ease: 'sine.inOut' }, 0.1)
      .to([ov.armR_up, ov.armR_lo, ov.head], { x: 0, y: 0, z: 0, duration: 0.6, ease: 'power2.inOut' }, 2.0);
  }

  // ---- per-frame --------------------------------------------------------------
  update({ dt, pointer, scrollVel, camera = null }) {
    const { joints } = this;
    this.t += dt;

    // breathing — chest scale + shoulder sway + head micro-nod
    const br = Math.sin(this.t * 1.7);
    joints.chest.scale.setScalar(1 + 0.014 * br);
    this.breath.clavL.z = 0.014 * br;
    this.breath.clavR.z = -0.014 * br;
    this.breath.head.x = 0.012 * Math.sin(this.t * 1.7 + 0.6);
    // tail sway rides the breath layer
    this.breath.tailRoot.y = 0.09 * Math.sin(this.t * 1.3);
    this.breath.tailRoot.x = -0.55 * this.w; // streams up/back at speed, clear of the legs

    // blink — the face is a painted decal, so blinking is a canvas redraw
    // (head.js exposes setBlink on the head joint; 0 open → 1 closed)
    if (this.t > this.blinkAt) {
      const s = clamp((this.t - this.blinkAt) / 0.09, 0, 1);
      const k = s < 0.5 ? s * 2 : 1 - (s - 0.5) * 2;
      joints.head.userData.setBlink?.(k);
      if (s >= 1) { this.blinkAt = this.t + 2.5 + Math.random() * 2.5; joints.head.userData.setBlink?.(0); }
    }

    // locomotion — idle↔run blend driven by scroll velocity (or override/pulse)
    const forced = this.locoOverride ?? 0;
    const wTarget = clamp(Math.max(Math.abs(scrollVel) * 30, forced, this.locoPulse.v), 0, 1);
    this.w += (wTarget - this.w) * 0.07;
    const w = this.w;
    this.phase += dt * TAU * lerp(1.4, 2.4, w);
    const ph = this.phase;
    const sw = lerp(0.45, 1.0, w) * w; // amplitude → 0 at rest (no foot-slide)

    const L = this.loco;
    L.legL_up.x = sw * Math.sin(ph);
    L.legR_up.x = sw * Math.sin(ph + Math.PI);
    L.legL_lo.x = Math.max(0, 1.15 * Math.sin(ph + 0.55 * Math.PI)) * lerp(0.5, 1, w) * w;
    L.legR_lo.x = Math.max(0, 1.15 * Math.sin(ph + Math.PI + 0.55 * Math.PI)) * lerp(0.5, 1, w) * w;
    L.footL.x = -0.35 * Math.sin(ph + 1.1) * w;
    L.footR.x = -0.35 * Math.sin(ph + Math.PI + 1.1) * w;
    L.armL_up.x = -0.85 * sw * Math.sin(ph);
    L.armR_up.x = -0.85 * sw * Math.sin(ph + Math.PI);
    L.armL_lo.x = -lerp(0.15, 1.1, w) * w;
    L.armR_lo.x = -lerp(0.15, 1.1, w) * w;
    L.hips.y = 0.12 * w * Math.sin(ph);
    L.chest.y = -0.15 * w * Math.sin(ph);
    L.spine.x = 0.28 * w + clamp(scrollVel * 6, -0.1, 0.15);
    this.rootBob = 0.035 * w * Math.abs(Math.cos(ph));

    // head look-at-cursor — eased off when the camera is behind him
    let lookGate = this.lookEnabled ? 1 : 0;
    if (lookGate && camera) {
      const camDir = camera.getWorldDirection(_v1);
      const fwd = _v2.set(0, 0, 1).applyQuaternion(this.joints.root.quaternion);
      lookGate = camDir.dot(fwd) < -0.35 ? 1 : 0;
    }
    const ly = clamp(pointer.x * 0.6, -0.55, 0.55) * lookGate;
    const lx = clamp(pointer.y * 0.35, -0.3, 0.3) * lookGate;
    this.look.headY += (ly * 0.7 - this.look.headY) * 0.08;
    this.look.headX += (lx * 0.7 - this.look.headX) * 0.08;
    this.look.neckY += (ly * 0.3 - this.look.neckY) * 0.08;
    this.look.neckX += (lx * 0.3 - this.look.neckX) * 0.08;

    // drag-rotate inertia
    if (!this.dragging && Math.abs(this.dragVel) > 0.0001) {
      this.dragYaw += this.dragVel;
      this.dragVel *= 0.94;
    }

    // ---- compose ----
    const B = this.base, R = this.breath, O = this.overlay;
    for (const j of RIG_JOINTS) {
      const jt = joints[j];
      if (!jt) continue;
      jt.rotation.set(
        B[j].x + R[j].x + L[j].x + O[j].x,
        B[j].y + R[j].y + L[j].y + O[j].y,
        B[j].z + R[j].z + L[j].z + O[j].z,
      );
    }
    joints.head.rotation.y += this.look.headY;
    joints.head.rotation.x += this.look.headX;
    joints.neck.rotation.y += this.look.neckY;
    joints.neck.rotation.x += this.look.neckX;

    joints.root.rotation.y = this.yawBase.v + this.dragYaw;
    joints.root.position.y = this.rootBob + this.hop.v;

    // tail life: the vinyl's inner warmth breathes gently (0.35 baseline —
    // it's lit plastic on the boards, not neon; the glyphs carry the glow)
    if (this.runner) this.runner.position.copy(this.tail.curve.getPointAt((this.t * 0.22) % 1));
    this.mats.tail.emissiveIntensity = 0.35 + 0.1 * Math.sin(this.t * 2.1);
  }
}

// scratch vectors for the camera gate
import * as THREE from 'three';
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
