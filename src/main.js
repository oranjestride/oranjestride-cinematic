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

// Live GLB mascots (§2) — dormant & fallback-safe until public/models/mascot.glb
// lands. One shared fetch; Hero + About + Programmes clone it. Each resolves to
// null (flat pose stays) when the GLB is absent. body.has-*-glb hides the flat
// pose only once its live instance actually mounts.
// Two live instances this round (§5): Hero + About, each anchored to its DOM
// mount so it lands in the right pane at any viewport. body.has-*-glb hides the
// flat pose only once its live instance actually mounts (no empty pane if the
// GLB is missing). Programmes/Closing stay on flat poses for now.
if (!REDUCED) {
  mountMascotGLB(window.OS3D, { sectionId: 'hero', mountId: 'hero-mascot-mount', zPlane: 2, loop: 'idle', onEnterClip: 'wave', react: true, runBlend: true, faceFlip: true })
    .then((m) => m && document.body.classList.add('has-hero-glb'));
  mountMascotGLB(window.OS3D, { sectionId: 'about', mountId: 'about-mascot-mount', zPlane: 2, loop: 'idle', onEnterClip: 'wave', react: true, faceFlip: true })
    .then((m) => m && document.body.classList.add('has-about-glb'));
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
