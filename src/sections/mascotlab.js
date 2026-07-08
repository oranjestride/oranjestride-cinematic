// Interstitial · Mascot Lab — vanilla port of the shadcn/aceternity
// "SplineSceneBasic" spotlight card: dark card, animated spotlight sweep,
// gradient headline left, interactive 3D right. The 3D slot is the live
// procedural Marut (src/three/marut/), framed here by the showcase camera
// with drag-to-rotate on; the clip chips drive his animator one-shots.
import { mascotLab } from '../data/content.js';
import { posePath, $, $$ } from '../utils/helpers.js';

// Aceternity spotlight SVG (blurred ellipse), warm-white fill to match our key light.
const spotlightSVG = `
  <svg class="spot-sweep" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3787 2842" fill="none">
    <g filter="url(#spot-blur)">
      <ellipse cx="1924.71" cy="273.501" rx="1924.71" ry="273.501"
        transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
        fill="#fff2e6" fill-opacity="0.21"></ellipse>
    </g>
    <defs>
      <filter id="spot-blur" x="0.860352" y="0.838989" width="3785.16" height="2840.26"
        filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
        <feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood>
        <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"></feBlend>
        <feGaussianBlur stdDeviation="151"></feGaussianBlur>
      </filter>
    </defs>
  </svg>`;

export function renderMascotLab() {
  return `
  <section class="band" id="mascot-lab">
    <div class="facet-bg" aria-hidden="true"></div>
    <div class="sec-content">
      <div class="lab-card reveal">
        ${spotlightSVG}
        <div class="lab-split">
          <div class="lab-copy">
            <p class="section-label">${mascotLab.label}</p>
            <h2 class="headline lab-grad">${mascotLab.headA}<span class="accent">${mascotLab.headAccent}</span></h2>
            <p class="lead">${mascotLab.sub}</p>
            <div class="lab-chips" aria-label="Play a mascot animation">
              <span class="lab-hint">${mascotLab.hint}</span>
              ${mascotLab.clips.map((c) => `
                <button class="lab-chip" type="button" data-clip="${c.clip}"
                        aria-label="Play ${c.label} animation">${c.label}</button>`).join('')}
            </div>
          </div>
          <div class="lab-stage" id="mascotlab-mount">
            <img class="lab-fallback-img" src="${posePath('idle', 'webp')}"
                 alt="The OranjeStride mascot" decoding="async" loading="lazy" />
            <span class="drag-hint" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>
              Drag to rotate
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

// Wire the clip chips once the live instance exists (called from main.js).
// Without one (reduced-motion / no-WebGL) the chips + drag hint stay hidden —
// CSS gates them on body.has-marut, added alongside the instance in main.js.
export function initMascotLab(instance) {
  if (!instance) return;
  $$('#mascot-lab .lab-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      instance.play?.(btn.dataset.clip);
      // brief pressed feedback (scale handled in CSS :active)
      btn.classList.add('played');
      setTimeout(() => btn.classList.remove('played'), 350);
    });
  });
}
