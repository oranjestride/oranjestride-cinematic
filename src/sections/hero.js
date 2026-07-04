// 1 · Hero — scroll-scrubbed opening, emblem assembles, particle field over video (§5.1).
import { hero, brand } from '../data/content.js';
import { videoBlock, wordmark, mascotMarkup } from '../utils/helpers.js';

export function renderHero() {
  return `
  <section class="section video-section" id="hero" data-video="${hero.video}" data-scrub="true">
    ${videoBlock(hero.video, { scrub: true })}
    <div class="sec-content">
      <p class="eyebrow reveal">${hero.eyebrow}</p>
      <p class="reveal" style="margin-bottom:0.6rem;">${wordmark('clamp(1.4rem,3vw,2rem)')}</p>
      <h1 class="display reveal">${hero.headlineA}<span class="accent">${hero.headlineAccent}</span></h1>
      <p class="subhead reveal">${hero.subhead}</p>
      <p class="motto reveal">${brand.motto}</p>
      <div class="cta-row reveal">
        <a class="btn btn-primary" href="${hero.ctaPrimary.target}">${hero.ctaPrimary.label}</a>
        <a class="btn btn-ghost" href="${hero.ctaSecondary.target}">${hero.ctaSecondary.label}</a>
      </div>
    </div>
    ${mascotMarkup('wave', 'hero', { label: 'OranjeStride mascot' })}
    <div class="mascot-mount" id="hero-mascot-mount" aria-hidden="true"></div>
    <!-- Marut's self-intro: typed beside the character after the loader -->
    <div class="marut-bubble" id="marut-bubble" role="status">
      <span id="marut-bubble-text"></span><i class="mb-caret" aria-hidden="true"></i>
    </div>
    <div class="hero-scroll-hint" aria-hidden="true">Scroll</div>
  </section>`;
}
