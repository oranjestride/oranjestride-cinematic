// 2 · About — split layout, principles stagger. The media pane is an empty
// framed stage in the live tier — the showcase camera composes the procedural
// Marut into it (close-up waypoint); the flat pose still fills the frame only
// under prefers-reduced-motion / no-WebGL.
import { about } from '../data/content.js';
import { posePath } from '../utils/helpers.js';

export function renderAbout() {
  return `
  <section class="section" id="about">
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

        <!-- Media pane: empty framed stage the showcase camera fills with the
             live Marut; the flat still shows only on the reduced-motion tier. -->
        <div class="about-media about-stage reveal" id="about-mascot-mount">
          <span class="about-stage-glow" aria-hidden="true"></span>
          <img class="mascot-img about-mascot-img" src="${posePath('idle', 'webp')}"
               alt="The OranjeStride mascot" decoding="async" />
          <span class="about-stage-floor" aria-hidden="true"></span>
        </div>
      </div>
    </div>
  </section>`;
}
