// ============================================================================
// mascot-fallback.js — flat pose-still mascots, the prefers-reduced-motion /
// no-WebGL tier. The live mascot is fully procedural (src/three/marut/); these
// pre-rendered cutouts (public/img/mascot/poses/*.webp) are only shown when
// the WebGL showcase is off, so the page still has its character.
// ============================================================================
import { $$, posePath } from '../utils/helpers.js';

// pose file → fallback chain (a missing pose degrades to the idle cutout).
function poseSources(pose) {
  return [posePath(pose, 'webp'), posePath('idle', 'webp'), posePath('idle', 'png')];
}

// Assign each mascot <img> its pose with a graceful fallback chain.
function wireImages() {
  $$('.mascot-img').forEach((img) => {
    const pose = img.closest('.mascot')?.dataset.pose || 'idle';
    const srcs = poseSources(pose);
    let i = 0;
    img.onerror = () => {
      i += 1;
      if (i < srcs.length) img.src = srcs[i];
      else img.onerror = null;
    };
    img.src = srcs[0];
  });
}

// Reveal section mascots as they scroll into view (cross-fade in).
function initReveal() {
  const io = new IntersectionObserver((ens) => {
    ens.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('mascot-in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.15 });
  $$('.mascot:not(.mascot--nav):not(.mascot--pre)').forEach((m) => io.observe(m));
  // nav + preloader mascots are visible immediately
  $$('.mascot--nav, .mascot--pre').forEach((m) => m.classList.add('mascot-in'));
}

/** Boot the flat pose-still tier. Call after the section markup is in the DOM. */
export function initMascotFallback() {
  wireImages();
  initReveal();
}
