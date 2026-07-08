// Canvas-generated surfaces — every texture is drawn in JS at runtime, so the
// mascot stays 100% code.
//
// ATLAS LAYOUT (one canvas, one material, no extra draw calls):
//   rows 0 .. 70%          torso band — cylindrical wrap, u: 0 back → 0.5
//                          front → 1 back (lathe phiStart π, RepeatWrapping),
//                          v remapped to world-y JACKET_Y0..JACKET_Y1
//   rows 71.5% .. 85.5%    upper-sleeve zones (L | R)
//   rows 86.9% .. 100%     forearm zones (L | R)
// Texel density is anisotropic on the torso (~2122 px/u around vs ~2963 px/u
// vertical) — circles are drawn as 1.4:1 ellipses to render round.
//
// The emissive twin carries per-feature brightness: the back brain emblem is
// the loudest print, the front chip-radiating traces stay dim, panels/zipper
// don't glow at all (they're lit fabric on the boards, not neon).
import * as THREE from 'three';
import { mulberry32, rand } from './prng.js';
import { COLORS } from './palette.js';
import { makeGlowSprite } from '../particles.js';

// Jacket texture spans this world-y range (keep in sync with torso profiles).
export const JACKET_Y0 = 0.916; // knit hem band top
export const JACKET_Y1 = 1.40;  // collar base
export const TORSO_V0 = 0.30;   // torso band occupies v 0.30..1.0

// Sleeve UV zones (fractions of the atlas) — the limbs builder remaps its
// capsule UVs into these rects. Contract: u wraps the arm (0 = outer seam),
// v runs shoulder→elbow (upper) / elbow→wrist (fore), zone-local top = 0.
export const SLEEVE_ZONES = {
  upperL: { x: 0.004, y: 0.715, w: 0.488, h: 0.14 },
  upperR: { x: 0.508, y: 0.715, w: 0.488, h: 0.14 },
  foreL: { x: 0.004, y: 0.869, w: 0.488, h: 0.127 },
  foreR: { x: 0.508, y: 0.869, w: 0.488, h: 0.127 },
};

const css = (hex, a = 1) => {
  const c = new THREE.Color(hex);
  return `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${a})`;
};

// Canvas paint colors (screen-value targets; oranges drawn lighter than the
// sampled hexes because ACES pulls saturated orange toward brick red).
const INK = {
  panel: css(0xffa050),      // → reads ~#E8752A (ACES pulls orange to brick)
  panelDeep: css(0xf08038),  // → ~#C65A1D
  panelLite: css(0xffc080),  // → ~#FF9A4A
  zipTape: css(0xf87a30),    // → ~#E8641E
  circuitDim: css(0x8a5638),
  backPrint: css(0xffa14a),  // → ~#F59236
  nodeGold: css(0xffd88f),   // → ~#FFC978
  emblemFill: css(0x1a0f0a),
  slit: css(0x0a0a0c),
};

export function makeJacketMaps({ size = 2048 } = {}) {
  const base = document.createElement('canvas');
  base.width = base.height = size;
  const b = base.getContext('2d');
  const em = document.createElement('canvas');
  em.width = em.height = size;
  const e = em.getContext('2d');

  // shared mappers — everything is a fraction of `size` (low-q safe)
  const X = (u) => u * size;
  const ROW = (wy) => {
    const v = TORSO_V0 + (1 - TORSO_V0) * ((wy - JACKET_Y0) / (JACKET_Y1 - JACKET_Y0));
    return (1 - v) * size;
  };
  const px = (n) => (n * size) / 2048; // stroke widths authored at 2048
  const RY = 1.4; // ellipse correction for the torso band's texel aspect

  const poly = (ctx, pts, fill) => {
    ctx.beginPath();
    pts.forEach(([u, wy], i) => (i ? ctx.lineTo(X(u), ROW(wy)) : ctx.moveTo(X(u), ROW(wy))));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const dot = (ctx, u, wy, r, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(X(u), ROW(wy), px(r), px(r) * RY, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  const run = (ctx, pts, width, color, nodeR, nodeColor) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = px(width);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach(([u, wy], i) => (i ? ctx.lineTo(X(u), ROW(wy)) : ctx.moveTo(X(u), ROW(wy))));
    ctx.stroke();
    if (nodeR) dot(ctx, pts[pts.length - 1][0], pts[pts.length - 1][1], nodeR, nodeColor || color);
  };

  // ---------------------------------------------------------------- base coat
  b.fillStyle = css(COLORS.jacket);
  b.fillRect(0, 0, size, size);
  // faint front-panel lift so the chest reads under dark footage
  const grad = b.createLinearGradient(0.3 * size, 0, 0.7 * size, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.5, 'rgba(255,244,230,0.05)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  b.fillStyle = grad;
  b.fillRect(0, 0, size, size * 0.7);
  e.fillStyle = '#000';
  e.fillRect(0, 0, size, size);

  // ------------------------------------------------------------- panels (base)
  // Raglan shoulder caps — orange ONLY at the shoulders; chest center and
  // upper back stay black like the boards.
  for (const mirror of [false, true]) {
    const M = (u) => (mirror ? 1 - u : u);
    poly(b, [[M(0.17), 1.40], [M(0.33), 1.40], [M(0.345), 1.36], [M(0.30), 1.315], [M(0.21), 1.325], [M(0.17), 1.375]].map(([u, y]) => [u, y]), INK.panel);
    poly(b, [[M(0.17), 1.40], [M(0.30), 1.315], [M(0.21), 1.325], [M(0.17), 1.375]], INK.panelDeep);
    poly(b, [[M(0.33), 1.40], [M(0.345), 1.36], [M(0.305), 1.385]], INK.panelLite);
    // back blade descending from the shoulder toward mid-back (hugs the
    // shoulder side — the upper back center stays black for the emblem)
    poly(b, [[M(0.21), 1.40], [M(0.155), 1.385], [M(0.10), 1.28], [M(0.155), 1.32], [M(0.20), 1.37]], INK.panel);
    poly(b, [[M(0.155), 1.385], [M(0.10), 1.28], [M(0.14), 1.305]], INK.panelDeep);
    // hem side wedge — low and subtle, rising just past the pocket line
    poly(b, [[M(0.325), 0.916], [M(0.435), 0.916], [M(0.455), 0.968], [M(0.41), 1.01], [M(0.35), 0.975]], INK.panel);
    poly(b, [[M(0.435), 0.916], [M(0.455), 0.968], [M(0.42), 0.94]], INK.panelDeep);
    // welt pocket: orange trim stroke with a dark slit inside
    const p0 = [M(0.395), 1.02], p1 = [M(0.428), 0.965];
    run(b, [p0, p1], 12, INK.panel);
    run(b, [p0, p1], 5, INK.slit);
  }

  // ------------------------------------------------- front print (chip-radiating)
  // Manhattan traces exiting the chip's pins (chip at u 0.5, world y 1.24,
  // half-span ~0.054 in u), elbowing outward; dim, barely emissive.
  const FRONT_RUNS = [
    [[0.554, 1.252], [0.588, 1.252], [0.588, 1.288], [0.622, 1.288]],
    [[0.446, 1.252], [0.412, 1.252], [0.412, 1.292], [0.384, 1.292]],
    [[0.554, 1.228], [0.60, 1.228], [0.60, 1.17], [0.64, 1.17]],
    [[0.446, 1.228], [0.40, 1.228], [0.40, 1.162], [0.362, 1.162]],
    [[0.52, 1.19], [0.52, 1.10], [0.548, 1.10], [0.548, 1.028]],
    [[0.48, 1.19], [0.48, 1.082], [0.452, 1.082], [0.452, 1.012]],
    [[0.558, 1.24], [0.612, 1.24], [0.612, 1.205]],
    [[0.442, 1.24], [0.392, 1.24], [0.392, 1.21]],
    [[0.53, 1.295], [0.53, 1.322], [0.556, 1.322]],
    [[0.47, 1.295], [0.47, 1.318], [0.446, 1.318]],
  ];
  for (const ctx of [b, e]) {
    const dim = ctx === b ? INK.circuitDim : css(0x4a2c1c);
    const node = ctx === b ? INK.nodeGold : css(0x4a2c1c);
    for (const r of FRONT_RUNS) run(ctx, r, 4, dim, 6, node);
    // sparse dotted field
    const rng = mulberry32(777);
    ctx.save();
    ctx.setLineDash([px(6), px(10)]);
    ctx.globalAlpha = ctx === b ? 0.4 : 0.15;
    for (let i = 0; i < 24; i++) {
      const u = rand(rng, 0.36, 0.64);
      const wy = rand(rng, 0.94, 1.36);
      if (Math.abs(u - 0.5) < 0.035 && wy > 1.15 && wy < 1.33) continue; // keep the chip/tape clear
      const horiz = rng() < 0.5;
      run(ctx, [[u, wy], horiz ? [u + rand(rng, 0.02, 0.045), wy] : [u, wy + rand(rng, 0.02, 0.04)]], 3, dim);
    }
    ctx.restore();
  }

  // -------------------------------------------------------------- zipper tape
  {
    const w = px(42); // ~0.02 world units
    b.fillStyle = INK.zipTape;
    b.fillRect(X(0.5) - w / 2, ROW(JACKET_Y1), w, ROW(JACKET_Y0) - ROW(JACKET_Y1));
    b.strokeStyle = css(0x1f1108);
    b.lineWidth = px(3);
    b.beginPath();
    b.moveTo(X(0.5), ROW(JACKET_Y1));
    b.lineTo(X(0.5), ROW(JACKET_Y0));
    b.stroke();
    b.strokeStyle = 'rgba(0,0,0,0.3)';
    b.lineWidth = px(2);
    for (let y = ROW(JACKET_Y1) + px(14); y < ROW(JACKET_Y0); y += px(14)) {
      b.beginPath();
      b.moveTo(X(0.5) - w * 0.28, y);
      b.lineTo(X(0.5) + w * 0.28, y);
      b.stroke();
    }
  }

  // ------------------------------------------------- back emblem (brain-in-circuit)
  // Straddles the u=0|1 seam — drawn twice so RepeatWrapping stitches it.
  const emblem = (ctx, cx, emissive) => {
    const cy = ROW(1.22);
    const rx = px(144), ry = px(144) * RY;
    ctx.save();
    ctx.translate(cx, 0);
    // interior + ring
    ctx.fillStyle = INK.emblemFill;
    ctx.beginPath();
    ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK.backPrint;
    ctx.lineWidth = px(16);
    ctx.beginPath();
    ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    // brain: two columns of squiggle strokes with a central gap
    ctx.lineWidth = px(14);
    ctx.lineCap = 'round';
    for (const m of [1, -1]) {
      for (let i = 0; i < 4; i++) {
        const yy = cy - ry * 0.52 + i * ry * 0.36;
        ctx.beginPath();
        ctx.moveTo(m * rx * 0.14, yy);
        ctx.bezierCurveTo(m * rx * 0.62, yy - ry * 0.16, m * rx * 0.66, yy + ry * 0.18, m * rx * 0.20, yy + ry * 0.22);
        ctx.stroke();
      }
    }
    // 8 rays off the ring
    ctx.lineWidth = px(8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const len = px(60 + (i % 3) * 25);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * rx * 1.05, cy + Math.sin(a) * ry * 1.05);
      ctx.lineTo(Math.cos(a) * (rx * 1.05 + len), cy + Math.sin(a) * (ry * 1.05 + len * RY * 0.8));
      ctx.stroke();
      ctx.fillStyle = INK.nodeGold;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * (rx * 1.05 + len), cy + Math.sin(a) * (ry * 1.05 + len * RY * 0.8), px(9), px(9) * RY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = INK.backPrint;
    }
    ctx.restore();
    // Manhattan runs up toward the collar and down toward the hem (in u-space
    // around the seam: u<0 wraps — caller passes cx of 0 or size, so offsets
    // are painted relative via translate above; these go in plain atlas space)
    const uc = cx / size;
    const RUNS = [
      [[uc + 0.012, 1.30], [uc + 0.012, 1.355], [uc + 0.045, 1.355]],
      [[uc - 0.03, 1.295], [uc - 0.03, 1.345]],
      [[uc + 0.05, 1.17], [uc + 0.05, 1.06], [uc + 0.085, 1.06]],
      [[uc - 0.055, 1.16], [uc - 0.055, 1.045]],
      [[uc + 0.02, 1.145], [uc + 0.02, 0.99]],
      [[uc - 0.018, 1.15], [uc - 0.018, 1.02], [uc - 0.05, 1.02]],
    ];
    for (const r of RUNS) run(ctx, r, 6, INK.backPrint, 9, INK.nodeGold);
    const rng = mulberry32(888 + cx);
    for (let i = 0; i < 14; i++) {
      dot(ctx, uc + rand(rng, -0.11, 0.11), rand(rng, 0.98, 1.38), 4, INK.nodeGold);
    }
    void emissive;
  };
  emblem(b, 0);
  emblem(b, size);
  emblem(e, 0);
  emblem(e, size);

  // ------------------------------------------------------------- sleeve zones
  const sleeveZone = (zone, isUpper) => {
    const zx = zone.x * size, zy = zone.y * size, zw = zone.w * size, zh = zone.h * size;
    const bleed = px(8);
    // black fabric base with bleed
    b.fillStyle = css(COLORS.jacket);
    b.fillRect(zx - bleed, zy - bleed, zw + bleed * 2, zh + bleed * 2);
    e.fillStyle = '#000';
    e.fillRect(zx - bleed, zy - bleed, zw + bleed * 2, zh + bleed * 2);
    if (isUpper) {
      // raglan cap: shoulder-end 55% orange with a 3-facet zigzag lower edge
      const capH = zh * 0.55;
      b.fillStyle = INK.panel;
      b.beginPath();
      b.moveTo(zx - bleed, zy - bleed);
      b.lineTo(zx + zw + bleed, zy - bleed);
      b.lineTo(zx + zw + bleed, zy + capH * 0.75);
      b.lineTo(zx + zw * 0.66, zy + capH);
      b.lineTo(zx + zw * 0.38, zy + capH * 0.72);
      b.lineTo(zx + zw * 0.15, zy + capH);
      b.lineTo(zx - bleed, zy + capH * 0.8);
      b.closePath();
      b.fill();
      b.fillStyle = INK.panelDeep;
      b.beginPath();
      b.moveTo(zx + zw * 0.38, zy + capH * 0.72);
      b.lineTo(zx + zw * 0.66, zy + capH);
      b.lineTo(zx + zw * 0.52, zy + capH * 0.45);
      b.closePath();
      b.fill();
      b.fillStyle = INK.panelLite;
      b.beginPath();
      b.moveTo(zx + zw * 0.15, zy + capH);
      b.lineTo(zx - bleed, zy + capH * 0.8);
      b.lineTo(zx + zw * 0.1, zy + capH * 0.62);
      b.closePath();
      b.fill();
    }
    // constellation web on the black remainder
    const rng = mulberry32(isUpper ? 4242 : 5353);
    const webTop = isUpper ? zy + zh * 0.6 : zy + zh * 0.08;
    const nodes = [];
    for (let i = 0; i < 10; i++) {
      nodes.push([zx + zw * rand(rng, 0.08, 0.92), webTop + (zh - (webTop - zy)) * rand(rng, 0.05, 0.9)]);
    }
    for (const ctx of [b, e]) {
      ctx.save();
      ctx.strokeStyle = INK.circuitDim;
      ctx.globalAlpha = ctx === b ? 0.5 : 0.2;
      ctx.lineWidth = px(2);
      for (let i = 0; i < nodes.length - 1; i++) {
        if (rng() < 0.75) {
          ctx.beginPath();
          ctx.moveTo(nodes[i][0], nodes[i][1]);
          ctx.lineTo(nodes[i + 1][0], nodes[i + 1][1]);
          ctx.stroke();
        }
      }
      ctx.fillStyle = INK.circuitDim;
      for (const [nx, ny] of nodes) {
        ctx.beginPath();
        ctx.arc(nx, ny, px(5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (!isUpper) {
      // small deep-orange elbow wedge at the outer-back corner
      b.fillStyle = INK.panelDeep;
      b.beginPath();
      b.moveTo(zx + zw, zy);
      b.lineTo(zx + zw - zw * 0.16, zy);
      b.lineTo(zx + zw, zy + zh * 0.3);
      b.closePath();
      b.fill();
    }
  };
  sleeveZone(SLEEVE_ZONES.upperL, true);
  sleeveZone(SLEEVE_ZONES.upperR, true);
  sleeveZone(SLEEVE_ZONES.foreL, false);
  sleeveZone(SLEEVE_ZONES.foreR, false);

  const wrap = (cv) => {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8; // thin traces alias at hero distance below this
    t.wrapS = THREE.RepeatWrapping; // cylindrical seam at the back
    return t;
  };
  return { map: wrap(base), emissiveMap: wrap(em) };
}

// --- "ORANJE / STRIDE" chest decal — line 1 orange, line 2 white, clean edge --
export function makeTextDecal(lines = ['ORANJE', 'STRIDE']) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 256);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 88px "Arial Black", Arial, sans-serif';
  ctx.lineJoin = 'round';
  const fills = [css(0xf47320), css(0xf2ede6)];
  lines.forEach((line, i) => {
    const y = 128 + (i - (lines.length - 1) / 2) * 96;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 3;
    ctx.strokeText(line, 256, y);
    ctx.fillStyle = fills[i] || fills[fills.length - 1];
    ctx.fillText(line, 256, y);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// --- chest chip core: amber radial gradient + circular motif ------------------
export function makeChipCoreTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  g.addColorStop(0, '#ffd37a');
  g.addColorStop(1, '#f5820f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(255,235,190,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(64, 64, 30, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(64, 64, 8, 0, Math.PI * 2);
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// --- soft blob contact shadow (floor) ----------------------------------------
export function makeContactShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,0.85)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.4)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export function makeGlowTexture(hex) {
  return makeGlowSprite(new THREE.Color(hex));
}
