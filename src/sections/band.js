// 1b · Brand-moment band (§6.2) — full-bleed soaring footage directly under
// the Hero, so the loader's "he just flew you in" beat carries straight into
// the scroll. First-class section: nav dot + IntersectionObserver like the rest.
import { band } from '../data/content.js';
import { videoBlock } from '../utils/helpers.js';

export function renderBand() {
  return `
  <section class="section video-section band-moment" id="brand" data-video="${band.video}">
    ${videoBlock(band.video)}
    <div class="sec-content">
      <p class="eyebrow reveal">${band.eyebrow}</p>
      <h2 class="headline reveal">${band.headA}<span class="accent">${band.headAccent}</span></h2>
    </div>
  </section>`;
}
