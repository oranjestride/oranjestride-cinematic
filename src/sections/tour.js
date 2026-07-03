// 6 · India AI Learning Tour — globe layer + pulsing feature callouts (§5.6).
import { tour } from '../data/content.js';
import { videoBlock, mascotMarkup } from '../utils/helpers.js';

export function renderTour() {
  return `
  <section class="section video-section" id="tour" data-video="${tour.video}">
    ${videoBlock(tour.video)}
    <div class="sec-content">
      <div class="tour-layout">
        <div>
          <p class="section-label reveal">${tour.label}</p>
          <h2 class="headline reveal">${tour.headA}<span class="accent">${tour.headAccent}</span></h2>
          <p class="lead reveal">${tour.sub}</p>
        </div>
        <div class="tour-features stagger">
          ${tour.features.map((f) => `
            <div class="tour-feat">
              <span class="dot"></span>
              <div><h4>${f.h}</h4><p>${f.p}</p></div>
            </div>`).join('')}
        </div>
      </div>
    </div>
    ${mascotMarkup('point', 'tour')}
  </section>`;
}
