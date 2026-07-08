// ============================================================================
// intro.js — Marut's post-loader introduction (showcase edition).
//
// The loader footage ends with the character landing centre-frame; the vortex
// wipe opens onto the LIVE procedural Marut framed in a matching close-up
// (showcase.prepareIntro). The camera then pulls back to the hero waypoint,
// he waves, and types his name into a speech bubble — "Hi, I'm Marut."
// Fallback tiers (reduced motion / no WebGL) skip the camera move and simply
// show the bubble beside the flat pose still.
// ============================================================================
import gsap from 'gsap';
import { intro } from '../data/content.js';
import { $ } from './helpers.js';

/**
 * Run the introduction once the loader hands over (mode: video|static|reduced).
 * @param showcase  initShowcase() handle, or null (flat fallback)
 * @param marut     live procedural mascot instance, or null
 */
export function runMarutIntro({ showcase, marut, mode, reduced }) {
  const bubble = $('#marut-bubble');
  const textEl = $('#marut-bubble-text');
  if (!bubble || !textEl) return;
  window.__marutIntro = showcase && marut ? 'glide' : 'flat'; // QA hook (scripts/qa.mjs)

  const typeLine = (done) => {
    const line = intro.bubble;
    if (reduced) { textEl.textContent = line; bubble.classList.add('typed'); done?.(); return; }
    let i = 0;
    bubble.classList.add('typing');
    const iv = setInterval(() => {
      textEl.textContent = line.slice(0, ++i);
      if (i >= line.length) {
        clearInterval(iv);
        bubble.classList.remove('typing');
        bubble.classList.add('typed');
        done?.();
      }
    }, 46);
  };
  const showBubble = () => {
    bubble.classList.add('show');
    typeLine(() => gsap.delayedCall(3.4, () => bubble.classList.add('hide')));
  };

  // Flat tiers: no camera move — the bubble appears beside the flat pose still.
  if (!showcase || !marut) {
    document.body.classList.add('intro-flat');
    gsap.delayedCall(reduced ? 0.1 : 0.9, showBubble);
    return;
  }

  // Deep load (reload mid-page / anchor link): the scrub owns the camera and
  // the bubble is staged for the hero frame — skip the whole introduction.
  if (scrollY > innerHeight * 0.5) return;

  // Live: let the wipe open (~1.25s from onDone), pull the camera back from
  // the landing close-up to the hero frame; wave + introduce on arrival.
  showcase.introToHero(mode).then(() => showBubble());
}
