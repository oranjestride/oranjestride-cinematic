// Global shell — fixed WebGL canvas, grain, vignette, cursor, ribbon, footer (§2, §3).
import { ribbon, nav as navData, brand } from '../data/content.js';
import { logoPath } from '../utils/helpers.js';

// Fixed layers that sit above section videos / below content or UI.
export function renderGlobalLayers() {
  return `
    <canvas id="gl-canvas" aria-hidden="true"></canvas>
    <div class="grain" aria-hidden="true"></div>
    <div class="vignette" aria-hidden="true"></div>
    <div class="cursor-dot" aria-hidden="true"></div>
    <div class="cursor-ring" aria-hidden="true"></div>
    <div class="ribbon" role="status">
      <span class="ribbon-text">${ribbon.text}</span>
      <button class="ribbon-close" aria-label="Dismiss" id="ribbon-close">✕</button>
    </div>`;
}

export function renderFooter() {
  return `
  <footer>
    <div class="footer-brand">
      <img src="${logoPath()}" alt="OranjeStride" />
      <div><strong>${brand.legal}</strong><span>${brand.tagline}</span></div>
    </div>
    <nav class="footer-links" aria-label="Footer">
      ${navData.links.map((l) => `<a href="#${l.id}">${l.label}</a>`).join('')}
    </nav>
  </footer>`;
}

export function initRibbon() {
  document.getElementById('ribbon-close')?.addEventListener('click', () =>
    document.body.classList.remove('ribbon-on'));
}
