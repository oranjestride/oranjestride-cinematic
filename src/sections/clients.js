// 7 · Clients — full-bleed monument, "Our Reach" copy + roster modal w/ hover captions (§5.7, §7).
import { clients } from '../data/content.js';
import { videoBlock, $, $$ } from '../utils/helpers.js';

const counts = () => {
  const a = clients.roster.filter((r) => r.c === 'academic').length;
  const c = clients.roster.filter((r) => r.c === 'corporate').length;
  return { all: clients.roster.length, academic: a, corporate: c };
};

export function renderClients() {
  return `
  <section class="section video-section" id="clients" data-video="${clients.video}">
    ${videoBlock(clients.video)}
    <div class="clients-fog" aria-hidden="true"></div>
    <div class="sec-content">
      <p class="section-label reveal">${clients.label}</p>
      <h2 class="headline reveal">${clients.headA}<span class="accent">${clients.headAccent}</span></h2>
      <p class="subhead reveal">${clients.sub}</p>
      <button class="btn btn-primary clients-cta-btn reveal" id="open-clients">${clients.cta} →</button>
      <p class="clients-hint reveal">${clients.hint}</p>
    </div>
  </section>`;
}

// Modal lives at the app root (rendered once by renderClientsModal).
export function renderClientsModal() {
  const n = counts();
  return `
  <div class="cg-overlay" id="clients-modal" role="dialog" aria-modal="true" aria-labelledby="cg-title">
    <div class="cg-modal">
      <button class="cg-close" id="close-clients" aria-label="Close">✕</button>
      <div class="cg-head">
        <h3 id="cg-title">Clients &amp; Partners</h3>
        <p>${n.all} organisations across academia, enterprise &amp; government. Hover a card for the relationship.</p>
      </div>
      <div class="cg-tabs" id="cg-tabs">
        <button class="cg-tab active" data-filter="all">All <span>${n.all}</span></button>
        <button class="cg-tab" data-filter="academic">Academic <span>${n.academic}</span></button>
        <button class="cg-tab" data-filter="corporate">Corporate <span>${n.corporate}</span></button>
      </div>
      <div class="cg-grid" id="cg-grid" data-filter="all">
        ${clients.roster.map((d) => `
          <div class="cg-card" data-cat="${d.c}">
            <div class="cg-name">${d.n}<br><span class="cg-type">${d.t}</span></div>
            <div class="cg-cap">${d.rel}</div>
          </div>`).join('')}
      </div>
      <div class="cg-foot">
        <span>Building capability where it matters most.</span>
        <a class="btn btn-primary" href="#contact" id="cg-contact">Partner With Us →</a>
      </div>
    </div>
  </div>`;
}

export function initClients({ lenis }) {
  const modal = $('#clients-modal');
  const grid = $('#cg-grid');
  const open = () => { modal.classList.add('open'); lenis?.stop(); document.body.style.overflow = 'hidden'; };
  const close = () => { modal.classList.remove('open'); lenis?.start(); document.body.style.overflow = ''; };

  $('#open-clients')?.addEventListener('click', open);
  $('#close-clients')?.addEventListener('click', close);
  $('#cg-contact')?.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  $$('#cg-tabs .cg-tab').forEach((tab) => tab.addEventListener('click', () => {
    $$('#cg-tabs .cg-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    grid.dataset.filter = tab.dataset.filter;
  }));

  return { close };
}
