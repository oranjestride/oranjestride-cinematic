// Scroll-into-view reveals + one-shot hooks (count-up, progress bars) (§3.2).
import { $$ } from './helpers.js';
import { runCounts } from '../sections/stats.js';
import { runBars } from '../sections/consulting.js';

export function initReveals() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      if (en.target.id === 'stats') runCounts();
      if (en.target.id === 'consulting') runBars();
      io.unobserve(en.target);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

  $$('.reveal, .stagger, #stats, #consulting').forEach((el) => io.observe(el));

  // Hero reveals fire immediately after preloader (it's above the fold).
  return {
    revealHero() {
      $$('#hero .reveal').forEach((el, i) => setTimeout(() => el.classList.add('in'), i * 110));
    },
  };
}
