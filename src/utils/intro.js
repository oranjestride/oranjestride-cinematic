// ============================================================================
// intro.js — Marut's post-loader introduction.
//
// The loader footage ends with the character landing centre-frame; the vortex
// wipe opens onto the LIVE GLB parked in exactly that spot. He then glides to
// his hero-side mount, waves, and types his name into a speech bubble —
// "Hi, I'm Marut." — beside him. Fallback tiers (mobile / no GLB / reduced
// motion) skip the glide and simply show the bubble beside the flat pose.
// ============================================================================
import gsap from 'gsap';
import { intro } from '../data/content.js';
import { $ } from './helpers.js';

/**
 * Park the hero mascot mount centre-stage BEFORE the loader finishes, so the
 * wipe reveals the character where the footage landed him. Inline px values
 * let the glide tween back to the responsive CSS layout (cleared on arrival).
 * Call right before mounting the hero GLB; desktop non-reduced only.
 */
export function prepareIntroStage() {
  const mount = document.getElementById('hero-mascot-mount');
  const hero = document.getElementById('hero');
  if (!mount || !hero) return null;

  const f = mount.getBoundingClientRect();     // final (CSS) rect, page at top
  const heroR = hero.getBoundingClientRect();
  const final = { left: f.left - heroR.left, top: f.top - heroR.top, width: f.width, height: f.height };

  const w = Math.min(innerWidth * 0.4, 480);
  const h = innerHeight * 0.72;
  gsap.set(mount, {
    right: 'auto', bottom: 'auto',
    left: (innerWidth - w) / 2 - heroR.left,
    top: innerHeight * 0.95 - h - heroR.top,   // feet near the footage's floor line
    width: w, height: h,
  });
  return { mount, final };
}

/**
 * Run the introduction once the loader hands over (mode: video|static|reduced).
 * @param stage  return value of prepareIntroStage(), or null (flat fallback)
 * @param inst   live hero mascot instance, or null
 */
export function runMarutIntro({ stage, inst, mode, reduced }) {
  const bubble = $('#marut-bubble');
  const textEl = $('#marut-bubble-text');
  if (!bubble || !textEl) return;
  window.__marutIntro = inst ? 'glide' : 'flat'; // QA hook (scripts/qa.mjs)

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

  // Flat tiers: no glide — the bubble appears beside the flat pose still.
  if (!stage || !inst) {
    if (stage) gsap.set(stage.mount, { clearProps: 'left,top,right,bottom,width,height' });
    document.body.classList.add('intro-flat');
    gsap.delayedCall(reduced ? 0.1 : 0.9, showBubble);
    return;
  }

  // Live glide: let the wipe open (it runs ~1.25s from onDone), then slide
  // him from centre-stage to his hero mount; wave + introduce on arrival.
  const delay = mode === 'video' ? 1.05 : 0.4;
  gsap.timeline({ delay })
    .to(stage.mount, {
      left: stage.final.left, top: stage.final.top,
      width: stage.final.width, height: stage.final.height,
      duration: 1.35, ease: 'power3.inOut',
      onComplete() {
        gsap.set(stage.mount, { clearProps: 'left,top,right,bottom,width,height' });
        inst.play('wave');
        showBubble();
      },
    });
}
