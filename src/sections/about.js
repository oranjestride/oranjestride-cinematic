// 2 · About — split layout, principles stagger. Media pane is a three-tier
// stack (§6.4): the looped turnaround footage plays the moment the section
// nears the viewport (instant, no WebGL wait) and cross-fades to the live GLB
// once it mounts; the flat pose still is the reduced-motion / no-video floor.
import { about } from '../data/content.js';
import { posePath, videoPath, posterPath } from '../utils/helpers.js';

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

        <!-- Media pane (three tiers): turnaround loop (instant) → live GLB
             (cross-fades in over the shared canvas) → flat pose still (floor). -->
        <div class="about-media about-stage reveal" id="about-mascot-mount">
          <span class="about-stage-glow" aria-hidden="true"></span>
          <img class="mascot-img about-mascot-img" src="${posePath('idle', 'webp')}"
               alt="The OranjeStride mascot" decoding="async" />
          <video class="about-turn" data-src="${videoPath('mascot-turnaround')}"
                 poster="${posterPath('mascot-turnaround')}"
                 muted loop playsinline preload="metadata" aria-hidden="true"></video>
          <span class="about-stage-floor" aria-hidden="true"></span>
        </div>
      </div>
    </div>
  </section>`;
}
