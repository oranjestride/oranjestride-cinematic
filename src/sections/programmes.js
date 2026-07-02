// 4 · Programmes — scrubbed staircase, two-tab switcher, step highlight on scroll (§5.4).
import { programmes } from '../data/content.js';
import { videoBlock, $, $$ } from '../utils/helpers.js';

const step = (s) => `
  <div class="step">
    <h4>${s.h}${s.flagship ? ' <span class="accent">· Flagship</span>' : ''}</h4>
    <p>${s.p}</p>
    ${s.cert ? `<p class="cert">${programmes.cert}</p>` : ''}
  </div>`;

export function renderProgrammes() {
  return `
  <section class="section video-section" id="programmes" data-video="${programmes.video}" data-scrub="true">
    ${videoBlock(programmes.video, { scrub: true })}
    <div class="sec-content">
      <div class="prog-layout">
        <div>
          <p class="section-label reveal">${programmes.label}</p>
          <h2 class="headline reveal">${programmes.headA}<span class="accent">${programmes.headAccent}</span></h2>
          <p class="lead reveal">${programmes.sub}</p>
          <div class="tabs reveal" role="tablist" style="margin-top:1.8rem;">
            ${programmes.tabs.map((t, i) => `<button class="tab${i === 0 ? ' active' : ''}" data-tab="${t.id}" role="tab">${t.label}</button>`).join('')}
          </div>
        </div>
        <div>
          ${programmes.tabs.map((t, i) => `
            <div class="tab-panel${i === 0 ? ' active' : ''}" data-panel="${t.id}">
              ${t.steps.map(step).join('')}
            </div>`).join('')}
        </div>
      </div>
    </div>
  </section>`;
}

export function initProgrammes() {
  const tabs = $$('#programmes .tab');
  const panels = $$('#programmes .tab-panel');
  tabs.forEach((t) => t.addEventListener('click', () => {
    tabs.forEach((x) => x.classList.remove('active'));
    panels.forEach((p) => p.classList.remove('active'));
    t.classList.add('active');
    $(`#programmes .tab-panel[data-panel="${t.dataset.tab}"]`)?.classList.add('active');
  }));

  // highlight the step nearest viewport centre — the "staircase climb" (§5.4)
  const highlight = () => {
    const active = $('#programmes .tab-panel.active');
    if (!active) return;
    const steps = $$('.step', active);
    const mid = innerHeight / 2;
    let best = null, bestD = Infinity;
    steps.forEach((s) => {
      const r = s.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestD) { bestD = d; best = s; }
    });
    steps.forEach((s) => s.classList.toggle('active-step', s === best));
  };
  addEventListener('scroll', () => requestAnimationFrame(highlight), { passive: true });
  highlight();
}
