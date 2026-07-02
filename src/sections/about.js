// 2 · About — split layout, principles stagger, "walking toward the light" (§5.2).
import { about } from '../data/content.js';
import { posterPath, videoPath } from '../utils/helpers.js';

export function renderAbout() {
  return `
  <section class="section" id="about" data-video="${about.video}">
    <div class="facet-bg" aria-hidden="true"></div>
    <div class="sec-content">
      <div class="about-grid">
        <div>
          <p class="section-label reveal">${about.label}</p>
          <h2 class="headline reveal">${about.headA}<span class="accent">${about.headAccent}</span></h2>
          <div class="principles stagger" style="margin-top:1.8rem;">
            ${about.principles.map((pr) => `
              <div class="principle">
                <span class="num">${pr.n}</span>
                <div><h3>${pr.h}</h3><p>${pr.p}</p></div>
              </div>`).join('')}
          </div>
        </div>
        <div class="about-media reveal">
          <video data-src="${videoPath(about.video)}" poster="${posterPath(about.video)}" muted loop playsinline preload="none"></video>
          <img class="sec-poster" src="${posterPath(about.video)}" alt="" aria-hidden="true" />
        </div>
      </div>
    </div>
  </section>`;
}
