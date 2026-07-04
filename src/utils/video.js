// Video layer — lazy-load near viewport, IO play/pause offscreen,
// and scroll-scrub hero/closing currentTime to scroll progress (§3.2, §3.8, §5.1/5.4/5.8).
import { $$, clamp } from './helpers.js';

export function initVideos({ reduced }) {
  const vids = $$('.sec-video, .about-media video');

  // Lazy attach src when the section approaches the viewport.
  const loadIO = new IntersectionObserver((ens) => {
    ens.forEach((en) => {
      const v = en.target;
      if (en.isIntersecting && v.dataset.src && !v.src) { v.src = v.dataset.src; v.load(); }
    });
  }, { rootMargin: '200% 0px' });
  vids.forEach((v) => loadIO.observe(v));

  if (reduced) return; // posters only; no playback/scrub under reduced-motion

  // Autoplay/pause non-scrubbed videos based on visibility. A video the live
  // GLB has superseded (.glb-superseded, e.g. About's turnaround once the 3D
  // instance cross-fades in) stays paused — no decode work behind the mesh.
  const playIO = new IntersectionObserver((ens) => {
    ens.forEach((en) => {
      const v = en.target;
      if (v.dataset.scrub) return;
      if (en.isIntersecting && !v.classList.contains('glb-superseded')) v.play?.().catch(() => {});
      else v.pause?.();
    });
  }, { threshold: 0.1 });
  vids.forEach((v) => { if (!v.dataset.scrub) playIO.observe(v); });

  // Scroll-scrub: map section pass-through progress → video.currentTime.
  // Both the section and its video carry data-scrub, so dedupe to unique sections.
  const scrubSecs = [...new Set($$('[data-scrub="true"]').map((el) => el.closest('.section')).filter(Boolean))];
  if (!scrubSecs.length) return;

  let vh = innerHeight;
  addEventListener('resize', () => { vh = innerHeight; }, { passive: true });

  const update = () => {
    const y = scrollY;
    scrubSecs.forEach((sec) => {
      const v = sec.querySelector('.sec-video');
      if (!v || v.readyState < 1 || !v.duration) return;
      const rect = sec.getBoundingClientRect();
      const top = rect.top + y;
      const prog = clamp((y + vh - top) / (rect.height + vh), 0, 1);
      if (!v.paused) v.pause();
      const target = prog * (v.duration - 0.05);
      if (Math.abs(v.currentTime - target) > 0.03) {
        try { v.currentTime = target; } catch (_) { /* seeking not ready */ }
      }
    });
  };
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }, { passive: true });
}
