// Custom glowing dot-and-ring cursor, magnetized to interactive elements (§2).
// Also feeds normalized pointer coords to the Three.js layer (window.OS3D).
import { $ } from './helpers.js';

export function initCursor({ reduced }) {
  const isTouch = matchMedia('(hover: none)').matches;

  // Always forward pointer to 3D layer (parallax) even without a visible cursor.
  addEventListener('mousemove', (e) => {
    const nx = (e.clientX / innerWidth) * 2 - 1;
    const ny = (e.clientY / innerHeight) * 2 - 1;
    window.OS3D?.setPointer(nx, ny);
  }, { passive: true });

  if (isTouch || reduced) return;

  document.body.classList.add('custom-cursor');
  const dot = $('.cursor-dot');
  const ring = $('.cursor-ring');
  let dx = 0, dy = 0, rx = 0, ry = 0;

  addEventListener('mousemove', (e) => { dx = e.clientX; dy = e.clientY; }, { passive: true });
  (function loop() {
    dot.style.transform = `translate(${dx}px,${dy}px) translate(-50%,-50%)`;
    rx += (dx - rx) * 0.18; ry += (dy - ry) * 0.18;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();

  const magnets = 'a, button, .gem-card, .cg-card, .tab, input, select, textarea';
  document.addEventListener('mouseover', (e) => { if (e.target.closest(magnets)) ring.classList.add('hover'); });
  document.addEventListener('mouseout', (e) => { if (e.target.closest(magnets)) ring.classList.remove('hover'); });
}
