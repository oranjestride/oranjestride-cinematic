// Interstitial · Testimonials band — 5-star quotes, ambient navy (§5 interstitial).
import { testimonials } from '../data/content.js';

export function renderTestimonials() {
  return `
  <section class="band" id="testimonials">
    <div class="facet-bg" aria-hidden="true"></div>
    <div class="sec-content">
      <p class="section-label reveal">${testimonials.label}</p>
      <h2 class="headline reveal">${testimonials.headA}<span class="accent">${testimonials.headAccent}</span></h2>
      <div class="testi-grid stagger">
        ${testimonials.items.map((t) => `
          <div class="testi">
            <div class="stars" aria-label="5 out of 5 stars">★★★★★</div>
            <blockquote>"${t.quote}"</blockquote>
            <div class="testi-who">
              <div class="avatar">${t.initial}</div>
              <div><strong>${t.name}</strong><span>${t.org}</span></div>
            </div>
          </div>`).join('')}
      </div>
    </div>
  </section>`;
}
