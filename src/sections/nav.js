// Sticky nav — appears after hero, wordmark + nav-mascot + section dots (§3.5).
import { nav as navData, band } from '../data/content.js';
import { $, $$, wordmark, logoPath } from '../utils/helpers.js';

export function renderNav() {
  return `
  <nav class="nav" aria-label="Primary">
    <a class="nav-brand" href="#hero" aria-label="OranjeStride home">
      <img class="nav-logo" src="${logoPath()}" alt="" width="34" height="34" decoding="async" />
      ${wordmark()}
    </a>
    <div class="nav-links" id="nav-links">
      ${navData.links.map((l) => `<a href="#${l.id}">${l.label}</a>`).join('')}
    </div>
    <div class="nav-dots" id="nav-dots" aria-hidden="true"></div>
    <button class="nav-burger" id="nav-burger" aria-label="Toggle menu"><span></span><span></span><span></span></button>
  </nav>`;
}

export function initNav({ lenis, sections }) {
  const navEl = $('.nav');
  const dotsWrap = $('#nav-dots');

  sections.forEach((s) => {
    const b = document.createElement('button');
    b.dataset.id = s.id;
    const label = navData.dots[s.id] || band.dots[s.id] || s.id;
    b.title = label;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', () => {
      const el = document.getElementById(s.id);
      lenis ? lenis.scrollTo(el) : el.scrollIntoView({ behavior: 'smooth' });
    });
    dotsWrap.appendChild(b);
  });

  const heroH = () => (document.getElementById('hero')?.offsetHeight || innerHeight) * 0.5;
  const onScroll = () => {
    const past = scrollY > heroH();
    navEl.classList.toggle('visible', past);
    navEl.classList.toggle('solid', past);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('#nav-burger');
  const links = $('#nav-links');
  burger?.addEventListener('click', () => links.classList.toggle('mobile-open'));
}

export function setActiveDot(id) {
  $$('#nav-dots button').forEach((d) => d.classList.toggle('active', d.dataset.id === id));
}
export const closeMobileMenu = () => $('#nav-links')?.classList.remove('mobile-open');
