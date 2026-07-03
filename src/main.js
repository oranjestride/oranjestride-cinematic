// ============================================================================
// main.js — entry point. Composes section modules into #app, wires the scroll
// engine (Lenis + GSAP/ScrollTrigger), the Three.js layer, and interactions.
// Build order mirrors §8: skeleton → video → scroll → WebGL → mascot → UI.
// ============================================================================
import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';

import { $, $$ } from './utils/helpers.js';
import { initScene } from './three/scene.js';
import { initMascots, mountMascotGLB } from './three/mascot.js';
import { initCursor } from './utils/cursor.js';
import { initReveals } from './utils/reveal.js';
import { initVideos } from './utils/video.js';

import { renderGlobalLayers, renderFooter, initRibbon } from './sections/shell.js';
import { renderPreloader, initPreloader } from './sections/preloader.js';
import { renderNav, initNav, setActiveDot, closeMobileMenu } from './sections/nav.js';
import { renderHero } from './sections/hero.js';
import { renderStats } from './sections/stats.js';
import { renderAbout } from './sections/about.js';
import { renderExpertise } from './sections/expertise.js';
import { renderTestimonials } from './sections/testimonials.js';
import { renderMascotLab, initMascotLab } from './sections/mascotlab.js';
import { renderProgrammes, initProgrammes } from './sections/programmes.js';
import { renderConsulting } from './sections/consulting.js';
import { renderTour } from './sections/tour.js';
import { renderClients, renderClientsModal, initClients } from './sections/clients.js';
import { renderContact, initContact } from './sections/contact.js';
import { renderDataStride, initDataStride } from './sections/datastride.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
// 1 · Compose the DOM (skeleton, §8.2)
// ---------------------------------------------------------------------------
const app = document.getElementById('app');
app.innerHTML = `
  ${renderGlobalLayers()}
  ${renderPreloader()}
  ${renderNav()}
  <main>
    ${renderHero()}
    ${renderStats()}
    ${renderAbout()}
    ${renderExpertise()}
    ${renderTestimonials()}
    ${renderMascotLab()}
    ${renderProgrammes()}
    ${renderConsulting()}
    ${renderTour()}
    ${renderClients()}
    ${renderContact()}
  </main>
  ${renderFooter()}
  ${renderClientsModal()}
  ${renderDataStride()}
`;

// ---------------------------------------------------------------------------
// 2 · Scroll engine — Lenis + GSAP/ScrollTrigger (§8.4)
// ---------------------------------------------------------------------------
gsap.registerPlugin(ScrollTrigger);
let lenis = null;
if (!REDUCED) {
  lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

// Smooth-scroll for in-page anchors (nav, CTAs, footer).
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  const el = $(id);
  if (!el) return;
  e.preventDefault();
  closeMobileMenu();
  lenis ? lenis.scrollTo(el, { duration: 1.3 }) : el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
}));

// ---------------------------------------------------------------------------
// 3 · Three.js layer + character mascot (§8.5, §8.6)
// ---------------------------------------------------------------------------
window.OS3D = initScene({ reduced: REDUCED });
initMascots({ reduced: REDUCED });          // DOM pose-swap mascots (nav/hero/about/…)

// Live GLB mascots (§2) — one shared mascot.glb fetch, SkeletonUtils clone per
// section, each anchored to a DOM mount box. All four embedded clips are used:
// Idle (default loop) · Wave (hero/about enter) · Run (programmes loop, hero
// scroll-blend) · Clap (contact enter — the closing "cheer" beat). Each mount
// resolves to null when the GLB is absent/broken → flat pose stays (no empty
// pane). Only the active section's mixer ticks; mobile keeps flat poses (perf).
const MOBILE = matchMedia('(max-width: 900px)').matches;
if (!REDUCED) {
  // Overlay mounts (float over section content) — desktop only, they'd crowd
  // small screens where the flat poses read better.
  if (!MOBILE) {
    mountMascotGLB(window.OS3D, { sectionId: 'hero', mountId: 'hero-mascot-mount', zPlane: 2, loop: 'idle', onEnterClip: 'wave', react: true, runBlend: true, dragRotate: true })
      .then((m) => m && document.body.classList.add('has-hero-glb'));
    mountMascotGLB(window.OS3D, { sectionId: 'programmes', mountId: 'programmes-mascot-mount', zPlane: 2, loop: 'run' })
      .then((m) => m && document.body.classList.add('has-programmes-glb'));
  }
  // In-flow stages (own layout space) — live on mobile too; the GLB is webp-
  // compressed (~2.4 MB) and only the active section's mixer ever ticks.
  mountMascotGLB(window.OS3D, { sectionId: 'about', mountId: 'about-mascot-mount', zPlane: 2, loop: 'idle', onEnterClip: 'wave', react: true })
    .then((m) => m && document.body.classList.add('has-about-glb'));
  // Mascot Lab spotlight card: drag to rotate; chips fire Wave/Run/Clap.
  mountMascotGLB(window.OS3D, { sectionId: 'mascot-lab', mountId: 'mascotlab-mount', zPlane: 2, loop: 'idle', onEnterClip: 'wave', react: true, dragRotate: true })
    .then((m) => initMascotLab(m));
  mountMascotGLB(window.OS3D, { sectionId: 'contact', mountId: 'contact-mascot-mount', zPlane: 2, loop: 'idle', onEnterClip: 'cheer', react: true })
    .then((m) => m && document.body.classList.add('has-contact-glb'));
}

// ---------------------------------------------------------------------------
// 4 · Video layer (§8.3) + reveals + interactions (§8.7)
// ---------------------------------------------------------------------------
initVideos({ reduced: REDUCED });
const { revealHero } = initReveals();

const sections = $$('main .section, main .band');
initNav({ lenis, sections });
initProgrammes();
initClients({ lenis });
initContact();
initDataStride({ lenis });
initRibbon();
initCursor({ reduced: REDUCED });

// Active-section tracking → nav dots + 3D layer (§3.5, §6).
const activeIO = new IntersectionObserver((ens) => {
  ens.forEach((en) => {
    if (en.intersectionRatio < 0.5) return;
    setActiveDot(en.target.id);
    window.OS3D?.setActive(en.target.id);
  });
}, { threshold: [0.5] });
sections.forEach((s) => activeIO.observe(s));

// Scroll velocity → mascot lean + ember speed (§6.6).
(function scrollVelocity() {
  let last = scrollY, vel = 0;
  (function loop() {
    const y = scrollY;
    vel = vel * 0.85 + (y - last) * 0.0006;
    last = y;
    window.OS3D?.setScrollVelocity(vel);
    requestAnimationFrame(loop);
  })();
})();

// Global ESC → close any open modal / mobile menu.
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  ['#clients-modal', '#ds-popup'].forEach((sel) => {
    const m = $(sel);
    if (m?.classList.contains('open')) { m.classList.remove('open'); lenis?.start(); document.body.style.overflow = ''; }
  });
  closeMobileMenu();
});

// ---------------------------------------------------------------------------
// 5 · Preloader last — it covers the initial asset load (§3.1, §8.8)
// ---------------------------------------------------------------------------
initPreloader({ reduced: REDUCED, onDone: revealHero });
