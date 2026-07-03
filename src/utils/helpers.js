// ============================================================================
// helpers.js — asset-path builders, inline SVG icons, small DOM utilities.
// Public assets (video/posters/logo) live in /public and are referenced via
// Vite's BASE_URL so the build stays portable (vite.config base: './').
// ============================================================================

const BASE = import.meta.env.BASE_URL; // './' in this project

export const videoPath = (name) => `${BASE}video/${name}.mp4`;
export const posterPath = (name) => `${BASE}img/posters/${name}.jpg`;
export const logoPath = () => `${BASE}img/logo02.png`;

// Mascot pose stills (§6 Phase B). Real renders drop into public/img/mascot/poses/.
export const posePath = (pose, ext = 'webp') => `${BASE}img/mascot/poses/${pose}.${ext}`;
export const mascotGLBPath = () => `${BASE}models/mascot.glb`;

/**
 * Floating character-mascot placement (§6). The <img> src is assigned by
 * initMascots() with a fallback chain (pose.webp → idle.webp → idle.png), so a
 * not-yet-rendered pose degrades gracefully to the idle cutout.
 */
export function mascotMarkup(pose, variant, opts = {}) {
  const cls = `mascot mascot--${variant}${opts.faint ? ' mascot--faint' : ''}`;
  const a11y = opts.label ? `role="img" aria-label="${opts.label}"` : 'aria-hidden="true"';
  return `<div class="${cls}" data-pose="${pose}" ${a11y}>
    <span class="mascot-shadow"></span>
    <img class="mascot-img" alt="" decoding="async" />
  </div>`;
}

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * Full-bleed background video block for a section (§3.3 depth layering):
 * video (dark-graded) → scrim → poster fallback.
 * data-src is lazy-loaded by src/utils/video.js.
 */
export function videoBlock(name, { scrub = false } = {}) {
  return `
    <video class="sec-video" data-src="${videoPath(name)}" poster="${posterPath(name)}"
           muted loop playsinline preload="metadata" ${scrub ? 'data-scrub="true"' : ''}></video>
    <img class="sec-poster" src="${posterPath(name)}" alt="" aria-hidden="true" />
    <div class="sec-video-scrim"></div>
    <div class="facet-bg" aria-hidden="true"></div>`;
}

// Bespoke faceted icons pulled from the mascot's own parts (§7 mapping).
const PROPS = {
  brain: '<path d="M24 6c-4 0-7 3-7 6 0 1-2 1-2 4s2 3 2 5c0 4 3 7 7 7s7-3 7-7c0-2 2-2 2-5s-2-3-2-4c0-3-3-6-7-6z"/>',
  chip: '<rect x="14" y="14" width="20" height="20" rx="2"/><path d="M24 8v6M24 34v6M8 24h6M34 24h6"/>',
  gem: '<path d="M24 6 40 20 24 42 8 20z"/><path d="M8 20h32M24 6v36"/>',
  chart: '<path d="M8 40V22M18 40V12M28 40V26M38 40V16"/>',
  arrow: '<path d="M8 34 20 22l8 6L40 12"/><path d="M40 22V12H30"/>',
  node: '<circle cx="24" cy="24" r="6"/><circle cx="10" cy="12" r="3"/><circle cx="38" cy="12" r="3"/><circle cx="12" cy="38" r="3"/><path d="M13 14l8 7M35 14l-8 7M15 36l6-8"/>',
};
export const propIcon = (name) =>
  `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${PROPS[name] || PROPS.gem}</svg>`;

const TOKENS = {
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  cap: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',
  star: '<path d="M12 2 15 9l7 .5-5.5 4.5L18 21l-6-4-6 4 1.5-7L2 9.5 9 9z"/>',
};
export const tokenIcon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TOKENS[name] || ''}</svg>`;

export const wordmark = (size) =>
  `<span class="wordmark"${size ? ` style="font-size:${size}"` : ''}><span class="w-oranje">Oranje</span><span class="w-stride">Stride</span></span>`;
