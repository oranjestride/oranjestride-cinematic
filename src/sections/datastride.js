// DataStride promo — floating badge triggers a dark glass popup (not on load) (§5.8).
import { datastride as ds } from '../data/content.js';
import { $ } from '../utils/helpers.js';

export function renderDataStride() {
  return `
  <button class="ds-badge" id="ds-badge" aria-label="Discover DataStride">${ds.badge}</button>
  <div class="ds-overlay" id="ds-popup" role="dialog" aria-modal="true" aria-labelledby="ds-title">
    <div class="ds-card">
      <button class="ds-close" id="ds-close" aria-label="Close">✕</button>
      <div class="ds-top">
        <div class="ds-pill">${ds.pill}</div>
        <div class="ds-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#180a00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg></div>
        <div><h3 id="ds-title"><span>Data</span>Stride</h3><p>${ds.subtitle}</p></div>
      </div>
      <div class="ds-body">
        <p class="ds-desc">${ds.desc}</p>
        <div class="ds-features">
          ${ds.features.map((f) => `
            <div class="ds-feature">
              <div class="ds-feature-ico">${f.ico}</div>
              <div><h4>${f.h}</h4><p>${f.p}</p></div>
            </div>`).join('')}
        </div>
        <div class="ds-actions">
          <a href="${ds.url}" target="_blank" rel="noopener" class="btn btn-primary">Explore DataStride →</a>
          <button class="ds-dismiss" id="ds-later" type="button">Maybe Later</button>
        </div>
      </div>
    </div>
  </div>`;
}

export function initDataStride({ lenis }) {
  const pop = $('#ds-popup');
  const open = () => { pop.classList.add('open'); lenis?.stop(); document.body.style.overflow = 'hidden'; };
  const close = () => { pop.classList.remove('open'); lenis?.start(); document.body.style.overflow = ''; };
  $('#ds-badge')?.addEventListener('click', open);
  $('#ds-close')?.addEventListener('click', close);
  $('#ds-later')?.addEventListener('click', close);
  pop.addEventListener('click', (e) => { if (e.target === pop) close(); });
  return { close };
}
