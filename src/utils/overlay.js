// Overlay panel choreography (showcase mode): each section's .sec-content
// rises in as the section enters, holds, and lifts away as it leaves —
// scrubbed to scroll so the copy and the camera move as one. reveal.js still
// handles the inner element staggers; this drives the panel as a whole.
//
// ONE timeline per panel owns enter+hold+exit. Two separate scrubbed tweens
// writing the same autoAlpha (the previous shape) deadlock after a
// ScrollTrigger.refresh() mid-page (e.g. the programme tab switch) — the
// later tween wins the property and a jump-scroll can strand the panel at
// visibility:hidden with no scroll position able to recover it.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $$ } from './helpers.js';

export function initOverlayChoreo({ reduced }) {
  if (reduced) return;
  const secs = $$('main .section, main .band');
  for (const sec of secs) {
    const panel = sec.querySelector('.sec-content');
    if (!panel) continue;

    const isHero = sec.id === 'hero';
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: sec,
        start: isHero ? 'top top' : 'top 78%',
        end: 'bottom 22%',
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
    if (isHero) {
      tl.set(panel, { y: 0, autoAlpha: 1 })
        .to(panel, { y: 0, autoAlpha: 1, duration: 0.8 });
    } else {
      tl.fromTo(panel, { y: 70, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.22 })
        .to(panel, { y: 0, autoAlpha: 1, duration: 0.58 }); // hold plateau
    }
    tl.to(panel, { y: -50, autoAlpha: 0, duration: 0.2 });
  }
  void ScrollTrigger;
}
