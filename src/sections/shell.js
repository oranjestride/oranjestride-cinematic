// Global shell — fixed WebGL canvas, grain, vignette, cursor, ribbon, footer (§2, §3).
import { ribbon, nav as navData, brand, contact } from '../data/content.js';
import { logoPath } from '../utils/helpers.js';

// Fixed layers that sit above section videos / below content or UI.
export function renderGlobalLayers() {
  return `
    <canvas id="gl-canvas" aria-hidden="true"></canvas>
    <div class="grade" aria-hidden="true"></div>
    <div class="grain" aria-hidden="true"></div>
    <div class="vignette" aria-hidden="true"></div>
    <div class="cursor-dot" aria-hidden="true"></div>
    <div class="cursor-ring" aria-hidden="true"></div>
    <button class="perf-toggle" id="perf-toggle" type="button" aria-pressed="false" aria-label="Toggle lite performance mode" title="Lite mode — calmer motion & effects">
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
        <path d="M13 2 4 13h6l-1 9 9-12h-6l2-8z" fill="currentColor"/>
      </svg>
    </button>
    <button class="sound-toggle" id="sound-toggle" type="button" aria-pressed="false" aria-label="Toggle ambient sound">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path class="snd-spk" d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/>
        <path class="snd-wave" d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <line class="snd-slash" x1="3" y1="21" x2="21" y2="3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </button>
    <div class="ribbon" role="status">
      <button class="ribbon-text" id="ribbon-open" type="button">${ribbon.text}</button>
      <button class="ribbon-close" aria-label="Dismiss" id="ribbon-close">✕</button>
    </div>`;
}

export function renderFooter() {
  const [email, phone, place] = contact.tokens.map((t) => t.strong);
  return `
  <footer>
    <div class="footer-brand">
      <img src="${logoPath()}" alt="OranjeStride" />
      <div><strong>${brand.legal}</strong><span>${brand.tagline}</span></div>
    </div>
    <nav class="footer-links" aria-label="Footer">
      ${navData.links.map((l) => `<a href="#${l.id}">${l.label}</a>`).join('')}
    </nav>
    <div class="footer-contact">
      <a href="mailto:${email}">${email}</a>
      <a href="tel:${phone.replace(/\s/g, '')}">${phone}</a>
      <span>${place}, India</span>
      <a href="${brand.linkedin}" target="_blank" rel="noopener">LinkedIn ↗</a>
    </div>
    <div class="footer-legal">
      <span>© ${new Date().getFullYear()} ${brand.legal}</span>
      <a href="/privacy.html">Privacy Policy</a>
    </div>
  </footer>`;
}

export function initRibbon() {
  document.getElementById('ribbon-close')?.addEventListener('click', () =>
    document.body.classList.remove('ribbon-on'));
}
