// 5 · Consulting — full-bleed breather, HUD engagement panel, radial-grid overlay (§5.5).
import { consulting } from '../data/content.js';
import { videoBlock, propIcon, $$ } from '../utils/helpers.js';

export function renderConsulting() {
  return `
  <section class="section video-section" id="consulting" data-video="${consulting.video}">
    ${videoBlock(consulting.video)}
    <div class="sec-content">
      <p class="section-label reveal">${consulting.label}</p>
      <h2 class="headline reveal">${consulting.headA}<span class="accent">${consulting.headAccent}</span></h2>
      <p class="subhead reveal" style="margin-bottom:2rem;">${consulting.sub}</p>
      <div class="consult-layout">
        <div class="consult-items stagger">
          ${consulting.items.map((it) => `
            <div class="consult-item">
              <div class="consult-icon">${propIcon(it.prop)}</div>
              <div><h4>${it.h}</h4><p>${it.p}</p></div>
            </div>`).join('')}
        </div>
        <div class="hud reveal">
          <h4>${consulting.hudTitle}</h4>
          ${consulting.metrics.map((m) => `<div class="data-row"><span>${m.label}</span><strong>${m.value}</strong></div>`).join('')}
          ${consulting.bars.map((b) => `
            <div class="bar">
              <div class="data-row" style="border:none;"><span>${b.label}</span><strong>${b.value}%</strong></div>
              <div class="bar-line"><div class="bar-fill" data-w="${b.value}"></div></div>
            </div>`).join('')}
        </div>
      </div>
    </div>
  </section>`;
}

export function runBars() {
  $$('#consulting .bar-fill').forEach((b) => { b.style.width = (b.dataset.w || 0) + '%'; });
}
