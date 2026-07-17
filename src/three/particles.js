// Ember particle field — the visual through-line composited over the footage (§5.1).
import * as THREE from 'three';

// Soft radial glow sprite shared by embers + mascot trail.
export function makeGlowSprite(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  const r = (color.r * 255) | 0, gg = (color.g * 255) | 0, b = (color.b * 255) | 0;
  g.addColorStop(0, `rgba(${r},${gg},${b},1)`);
  g.addColorStop(0.4, `rgba(${r},${gg},${b},0.5)`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createEmbers({ count, sprite, mobile }) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const spd = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3 + 0] = (Math.random() - 0.5) * 34;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 28;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 4;
    spd[i] = 0.004 + Math.random() * 0.012;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    size: mobile ? 0.14 : 0.17,
    map: sprite,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    // Faint: the canvas now sits above content, so embers read as atmosphere, not clutter.
    opacity: 0.4,
  });
  const points = new THREE.Points(geo, mat);

  function update(scrollVel, pointerLerp, burst = 0) {
    const arr = geo.attributes.position.array;
    // `burst` (0→1, decaying) briefly accelerates the rise so a section change
    // reads as a soft updraft of embers — a cinematic beat, not a fixed drift.
    const rise = 1 + Math.abs(scrollVel) * 4 + burst * 3.5;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += spd[i] * rise;
      if (arr[i * 3 + 1] > 14) arr[i * 3 + 1] = -14;
    }
    geo.attributes.position.needsUpdate = true;
    // and a brief brightness lift on the burst so the updraft catches the eye
    mat.opacity = 0.4 + burst * 0.4;
    points.rotation.y = pointerLerp.x * 0.15;
    points.rotation.x = -pointerLerp.y * 0.1;
    points.position.x = pointerLerp.x * 1.2;
  }

  return { points, update };
}
