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
import { createMarut } from './three/marut/index.js';
import { initShowcase } from './three/showcase.js';
import { initMascotFallback } from './three/mascot-fallback.js';
import { initCursor } from './utils/cursor.js';
import { initReveals } from './utils/reveal.js';
import { initOverlayChoreo } from './utils/overlay.js';
import { initVideos } from './utils/video.js';
import { runMarutIntro } from './utils/intro.js';

import { renderGlobalLayers, renderFooter, initRibbon } from './sections/shell.js';
import { renderPreloader, initPreloader } from './sections/preloader.js';
import { renderNav, initNav, setActiveDot, closeMobileMenu } from './sections/nav.js';
import { renderHero } from './sections/hero.js';
import { renderBand } from './sections/band.js';
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
    ${renderBand()}
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
// 3 · Three.js layer + procedural mascot + scroll showcase (§8.5, §8.6)
// ---------------------------------------------------------------------------
window.OS3D = initScene({ reduced: REDUCED });

// The mascot is 100% code (src/three/marut/) — geometry, textures, and
// animation all authored in JS. One instance, center stage, active in every
// section; the camera does the traveling (src/three/showcase.js).
const MOBILE = matchMedia('(max-width: 900px)').matches;
let marut = null;
let showcase = null;
if (!REDUCED && window.OS3D.enabled) {
  marut = createMarut({ quality: MOBILE ? 'low' : 'high' });
  window.OS3D.three.registerMascot(marut);
  document.body.classList.add('has-marut');
  showcase = initShowcase({ sceneAPI: window.OS3D, marut, reduced: REDUCED });
  showcase?.prepareIntro(); // park the camera on the loader's landing close-up
  initMascotLab(marut);     // clip chips (Wave / Run / Cheer) drive the animator
} else {
  initMascotFallback();     // reduced-motion tier: flat pose stills
}
// Preloader progress hook: the procedural build is synchronous, so just
// signal readiness on the next frame.
window.__marutReady = new Promise((r) => requestAnimationFrame(() => r(!!marut)));

// ---------------------------------------------------------------------------
// 4 · Video layer (§8.3) + reveals + overlay choreography + interactions (§8.7)
// ---------------------------------------------------------------------------
initVideos({ reduced: REDUCED });
const { revealHero } = initReveals();
if (showcase) initOverlayChoreo({ reduced: REDUCED });

const sections = $$('main .section, main .band');
initNav({ lenis, sections });
initProgrammes();
initClients({ lenis });
initContact();
initDataStride({ lenis });
initRibbon();
initCursor({ reduced: REDUCED });

// Active-section tracking → nav dots + 3D layer + showcase poses (§3.5, §6).
const activeIO = new IntersectionObserver((ens) => {
  ens.forEach((en) => {
    if (en.intersectionRatio < 0.5) return;
    setActiveDot(en.target.id);
    window.OS3D?.setActive(en.target.id);
    showcase?.applySection(en.target.id);
  });
}, { threshold: [0.5] });
sections.forEach((s) => activeIO.observe(s));

// Layout shifts (programme tab switches, clients modal) move section offsets —
// refresh so the camera timeline re-anchors to the new scroll positions.
// Delegated: the clients-modal tabs are injected after init.
addEventListener('click', (e) => {
  if (e.target.closest?.('#programmes .tab, #cg-tabs button')) {
    setTimeout(() => showcase?.refresh(), 350);
  }
});

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
// 5 · Preloader last — it covers the initial asset load (§3.1, §8.8).
// The wipe opens on a centre-stage close-up of the live procedural Marut;
// the camera then pulls back to the hero frame while he waves and types his
// introduction (intro.js).
// ---------------------------------------------------------------------------
initPreloader({
  reduced: REDUCED,
  onDone(mode) {
    revealHero();
    runMarutIntro({ showcase, marut, mode, reduced: REDUCED });
  },
});
