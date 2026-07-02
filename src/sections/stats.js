// Interstitial · Stats band — oversized count-up numerals (§5 interstitial, §7).
import { stats } from '../data/content.js';
import { $$ } from '../utils/helpers.js';

export function renderStats() {
  return `
  <section class="band" id="stats">
    <div class="facet-bg" aria-hidden="true"></div>
    <div class="sec-content">
      <div class="stats-grid stagger">
        ${stats.map((s) => `
          <div class="stat">
            <strong data-count="${s.value}" data-decimals="${s.decimals}" data-suffix="${s.suffix}">0</strong>
            <span>${s.label}</span>
          </div>`).join('')}
      </div>
    </div>
  </section>`;
}

// Count-up, triggered once when the band scrolls into view.
export function runCounts() {
  $$('#stats [data-count]').forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';
    const dur = 1600, t0 = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = (target * e).toFixed(dec) + (k === 1 ? suffix : '');
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  });
}
