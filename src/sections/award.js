// Award — mini trophy Marut in the bottom-right corner, rendered live in 3D
// (src/three/award-mini.js); the pre-rendered sprite is the poster while it
// loads and the fallback in lite / reduced mode. Click (or the ribbon) opens
// the award card.
import { award, datastride } from '../data/content.js';
import { $ } from '../utils/helpers.js';
import { mountAwardMini } from '../three/award-mini.js';

const HIDE_KEY = 'os-award-hidden';

export function renderAward() {
  return `
  <div class="award-pop" id="award-pop">
    <button class="award-btn" id="award-open" type="button" aria-label="See our award: ${award.category}, ${award.event}">
      <span class="award-bubble" aria-hidden="true">${award.bubble}</span>
      <img class="award-sprite" src="${award.sprite}" alt="" width="239" height="500" decoding="async" />
      <canvas class="award-3d" aria-hidden="true"></canvas>
    </button>
    <button class="award-dismiss" id="award-dismiss" type="button" aria-label="Hide award mascot">✕</button>
  </div>
  <div class="ds-overlay" id="award-modal" role="dialog" aria-modal="true" aria-labelledby="award-title">
    <div class="ds-card award-card">
      <button class="ds-close" id="award-close" aria-label="Close">✕</button>
      <img class="award-photo" src="${award.photo}" alt="${award.photoAlt}" width="800" height="600" loading="lazy" decoding="async" />
      <div class="award-body">
        <p class="award-label">🏆 ${award.label}</p>
        <h3 id="award-title">${award.category}</h3>
        <p class="award-meta">${award.event} · ${award.where}</p>
        <blockquote class="award-quote">“${award.quote}”<cite>— ${award.quoteBy}</cite></blockquote>
        <p class="ds-desc">${award.desc}</p>
        <div class="ds-actions">
          <a href="#contact" class="btn btn-primary" id="award-contact">Talk to Us →</a>
          <a href="${datastride.url}" target="_blank" rel="noopener" class="btn btn-ghost">See DataStride ↗</a>
        </div>
      </div>
    </div>
  </div>`;
}

export function initAward({ lenis }) {
  const pop = $('#award-pop');
  const btn = $('#award-open');
  const modal = $('#award-modal');
  let mini = null;

  const still = () => document.body.classList.contains('perf-lite') || !document.body.classList.contains('motion-full');
  const hop = (n) => { if (mini && !still() && pop.classList.contains('show')) mini.hop(n); };
  const open = () => { modal.classList.add('open'); lenis?.stop(); document.body.style.overflow = 'hidden'; mini?.setActive(false); };
  const close = () => { modal.classList.remove('open'); lenis?.start(); document.body.style.overflow = ''; mini?.setActive(pop.classList.contains('show')); };

  btn.addEventListener('pointerenter', () => hop(1));
  btn.addEventListener('click', open);
  $('#ribbon-open')?.addEventListener('click', open);
  ['#award-close', '#award-contact'].forEach((s) => $(s).addEventListener('click', close));
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  $('#award-dismiss').addEventListener('click', () => {
    pop.classList.remove('show');
    mini?.setActive(false);
    try { localStorage.setItem(HIDE_KEY, '1'); } catch (_) { /* private mode */ }
  });

  document.body.classList.add('ribbon-on');

  // called once the preloader wipe opens: load the live mascot, pop in, hop, say the line
  const show = () => {
    let hidden = false;
    try { hidden = localStorage.getItem(HIDE_KEY) === '1'; } catch (_) { /* private mode */ }
    if (hidden) return;
    const ready = still() ? Promise.resolve(null) : mountAwardMini($('#award-open .award-3d')).catch(() => null);
    ready.then((m) => {
      if (!m) return;
      mini = m;
      btn.classList.add('live');
      mini.setActive(pop.classList.contains('show') && !modal.classList.contains('open'));
      if (pop.classList.contains('show')) setTimeout(() => hop(3), 300); // loaded after the pop-in
    });
    setTimeout(() => {
      pop.classList.add('show', 'talk');
      mini?.setActive(!modal.classList.contains('open'));
      setTimeout(() => hop(3), 400);
      setTimeout(() => pop.classList.remove('talk'), 6500);
      // an occasional celebratory hop, only while the tab is visible
      setInterval(() => { if (!document.hidden) hop(Math.random() < 0.35 ? 2 : 1); }, 7000);
    }, 2500);
  };
  return { show, close };
}
