// 3 · Expertise — six glassmorphic gem cards, bespoke facet icons, glow-bloom (§5.3, §7).
import { expertise } from '../data/content.js';
import { videoBlock, propIcon } from '../utils/helpers.js';

export function renderExpertise() {
  return `
  <section class="section video-section" id="expertise" data-video="${expertise.video}">
    ${videoBlock(expertise.video)}
    <div class="sec-content">
      <p class="section-label reveal">${expertise.label}</p>
      <h2 class="headline reveal">${expertise.headA}<span class="accent">${expertise.headAccent}</span></h2>
      <p class="subhead reveal">${expertise.sub}</p>
      <div class="grid-cards stagger">
        ${expertise.cards.map((c) => `
          <article class="gem-card">
            <div class="gem-icon">${propIcon(c.prop)}</div>
            <h3>${c.h}</h3>
            <p>${c.p}</p>
            <div class="tags">${c.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
          </article>`).join('')}
      </div>
    </div>
  </section>`;
}
