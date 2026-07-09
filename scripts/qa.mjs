// ============================================================================
// qa.mjs — headless QA harness (puppeteer-core → local Chrome).
//
//   node scripts/qa.mjs [--url http://localhost:4318/] [--out qa-shots]
//                       [--widths 375,820,1440] [--reduced] [--no-shots]
//
// Per width: full scroll-through, per-section screenshots, console
// error/warning capture, and a mascot-asset assert (live tier loads the
// sculpted /models/mascot.glb; reduced tier must never touch /models/).
// At desktop width it also drives the interactive states (Mascot Lab chips +
// drag-rotate, Clients modal + hover captions, Programme tabs) and checks the
// live render budget via window.__marutStats + camera state via __camState.
// With --reduced it emulates prefers-reduced-motion and asserts no WebGL.
// Exits non-zero if any console error/warning or assertion failure occurred.
// ============================================================================
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
};
const has = (name) => process.argv.includes(`--${name}`);

const URL = arg('url', 'http://localhost:4318/');
const OUT = arg('out', 'qa-shots');
const WIDTHS = arg('widths', '375,820,1440').split(',').map(Number);
const REDUCED = has('reduced');
const SHOTS = !has('no-shots');
const CHROME = arg('chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe');

if (SHOTS) mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--window-size=1600,1000'],
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const fail = (msg) => { failures += 1; console.log(`  ✗ ${msg}`); };
const pass = (msg) => console.log(`  ✓ ${msg}`);

async function runWidth(width) {
  const label = REDUCED ? `${width}-reduced` : `${width}`;
  console.log(`\n=== ${label}px ===`);
  const page = await browser.newPage();
  await page.setViewport({ width, height: Math.round(width < 500 ? 812 : width < 1000 ? 1180 : 900) });
  // Motion is on by default (main.js ignores the OS flag); the flat tier is
  // param-gated now, so the reduced pass drives it via ?motion=reduce. Media
  // emulation kept for the CSS side of the gate.
  await page.emulateMediaFeatures([
    { name: 'prefers-reduced-motion', value: REDUCED ? 'reduce' : 'no-preference' },
  ]);

  const consoleMsgs = [];
  page.on('pageerror', (e) => consoleMsgs.push({ type: 'pageerror', text: e.message }));
  page.on('console', (m) => {
    const t = m.type();
    if (t === 'error' || t === 'warning') consoleMsgs.push({ type: t, text: m.text() });
  });
  const modelFetches = [];
  page.on('request', (r) => { if (r.url().includes('/models/')) modelFetches.push(r.url()); });

  const target = REDUCED ? URL + (URL.includes('?') ? '&' : '?') + 'motion=reduce' : URL;
  await page.goto(target, { waitUntil: 'networkidle2', timeout: 60000 });
  // The video loader holds until real progress + the portal beat complete
  // (~9s); body stays scroll-locked until the vortex wipe. Wait it out.
  const loaderMode = await page.evaluate(() => {
    const pre = document.getElementById('preloader');
    return pre?.classList.contains('static-mode') ? 'static' : pre ? 'video' : 'gone';
  });
  await page.waitForFunction(() => !document.getElementById('preloader'), { timeout: 30000 })
    .catch(() => fail('preloader did not clear within 30s'));
  await sleep(1500); // hero cascade + intro glide settle
  if (!REDUCED) {
    pass(`loader ran in ${loaderMode} mode`);
    // Marut's typed self-introduction beside the character (glide or flat tier)
    const introOk = await page
      .waitForFunction(() => document.getElementById('marut-bubble-text')?.textContent === "Hi, I'm Marut.", { timeout: 12000 })
      .then(() => true).catch(() => false);
    const tier = await page.evaluate(() => window.__marutIntro || null);
    introOk ? pass(`Marut intro bubble typed (${tier} tier)`) : fail(`Marut intro bubble missing (tier: ${tier})`);
  }

  // Brand-moment band (§6.2): first-class section with the soaring footage.
  const bandOk = await page.evaluate(() => {
    const s = document.getElementById('brand');
    const v = s?.querySelector('.sec-video');
    return !!(s && v && (v.src || v.dataset.src).includes('mascot-soaring-banner'));
  });
  bandOk ? pass('brand-moment band wired with soaring footage') : fail('brand band missing/miswired');

  // Full scroll-through, screenshotting each section.
  const sections = await page.evaluate(() =>
    [...document.querySelectorAll('main .section, main .band')].map((s) => s.id));
  for (const id of sections) {
    await page.evaluate((sid) => document.getElementById(sid)?.scrollIntoView({ block: 'start' }), id);
    await sleep(REDUCED ? 350 : 1100);
    if (SHOTS) await page.screenshot({ path: `${OUT}/${label}-${id}.png` });
  }
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await sleep(600);

  // Live tier: the sculpted mascot.glb must load (procedural is fallback-
  // only). Reduced tier: no WebGL → nothing under /models/ may be touched.
  if (REDUCED) {
    modelFetches.length ? fail(`/models/ fetched under reduced motion: ${modelFetches.join(', ')}`) : pass('zero /models/ fetches (reduced)');
  } else {
    modelFetches.some((u) => u.includes('mascot.glb')) ? pass('sculpted mascot.glb fetched') : fail('mascot.glb was never requested (GLB tier inactive)');
  }

  if (REDUCED) {
    // No live WebGL / drag / parallax under reduced motion — flat stills only.
    const state = await page.evaluate(() => ({
      glEnabled: !!window.OS3D?.enabled,
      hasMarut: document.body.classList.contains('has-marut'),
      dragTargets: document.querySelectorAll('.mascot-drag').length,
      flatPoses: [...document.querySelectorAll('.mascot-img')].filter((i) => i.complete && i.naturalWidth > 0).length,
    }));
    state.glEnabled ? fail(`reduced-motion: WebGL still enabled`) : pass('reduced-motion: WebGL layer off');
    state.hasMarut ? fail('reduced-motion: live Marut mounted') : pass('reduced-motion: no live Marut');
    state.dragTargets ? fail(`reduced-motion: drag-rotate active`) : pass('reduced-motion: no drag targets');
    state.flatPoses > 0 ? pass(`reduced-motion: ${state.flatPoses} flat pose stills rendered`) : fail('reduced-motion: flat poses missing');
    const reducedLoader = await page.evaluate(() => ({
      preVideoShown: [...document.querySelectorAll('.pre-video')].some((v) => getComputedStyle(v).display !== 'none'),
      bubbleText: document.getElementById('marut-bubble-text')?.textContent || '',
    }));
    reducedLoader.preVideoShown ? fail('reduced-motion: loader video visible') : pass('reduced-motion: loader video hidden');
    reducedLoader.bubbleText === "Hi, I'm Marut." ? pass('reduced-motion: intro bubble static, full text') : fail(`reduced-motion: bubble text "${reducedLoader.bubbleText}"`);
  } else {
    // Live tier: procedural Marut in the scene, showcase camera driving,
    // render budget within §3.7 (scene total incl. embers/floor/videos).
    const live = await page.evaluate(() => ({
      hasMarut: document.body.classList.contains('has-marut'),
      showcase: document.body.classList.contains('showcase'),
      inScene: !!(window.__marutRoot && window.__marutRoot.parent),
      stats: window.__marutStats || null,
      // pluck numbers only — GSAP stamps a circular `_gsap` cache onto its
      // tween target, which silently nukes evaluate() serialization
      cam: window.__camState ? { fov: window.__camState.fov, pz: window.__camState.pz } : null,
    }));
    live.hasMarut && live.inScene ? pass('live procedural Marut in scene') : fail(`live Marut missing (has-marut ${live.hasMarut}, inScene ${live.inScene})`);
    live.showcase ? pass('showcase mode active') : fail('showcase mode not active');
    // Scene TOTAL (character + embers + floor + glow sprites) per frame.
    // M8 full-definition pass roughly doubled character density and the bloom
    // composer adds its quad passes to `calls` (info accumulates the whole
    // frame now) — thresholds sized to that with modest headroom.
    if (!live.stats) fail('__marutStats missing');
    else if (live.stats.tris > 60000 || live.stats.calls > 120) fail(`render budget blown: ${live.stats.tris} tris / ${live.stats.calls} calls`);
    else pass(`render budget ok (${live.stats.tris} tris / ${live.stats.calls} calls)`);
    if (!live.cam) fail('__camState missing');
    else if (live.cam.fov >= 40 && live.cam.fov <= 60 && Math.abs(live.cam.pz) <= 12) pass(`camera state sane (fov ${live.cam.fov.toFixed(1)}, pz ${live.cam.pz.toFixed(2)})`);
    else fail(`camera state out of range: ${JSON.stringify(live.cam)}`);
  }

  // Interactive states — exercise at the widest, non-reduced pass.
  if (!REDUCED && width >= 1200) {
    // Programme tabs
    const tabOk = await page.evaluate(async () => {
      const tabs = [...document.querySelectorAll('#programmes [role="tab"], #programmes .prog-tab')];
      if (tabs.length < 2) return 'no-tabs';
      tabs[1].click();
      await new Promise((r) => setTimeout(r, 400));
      return tabs[1].classList.contains('active') || tabs[1].getAttribute('aria-selected') === 'true';
    });
    tabOk === true ? pass('programme tab switch') : fail(`programme tabs: ${tabOk}`);

    // Clients modal + hover caption
    await page.evaluate(() => document.getElementById('clients')?.scrollIntoView({ block: 'center' }));
    await sleep(900);
    const modalOk = await page.evaluate(async () => {
      const open = document.querySelector('#clients [data-open-clients], #clients .clients-cta, #clients button');
      if (!open) return 'no-opener';
      open.click();
      await new Promise((r) => setTimeout(r, 500));
      const modal = document.getElementById('clients-modal');
      if (!modal?.classList.contains('open')) return 'did-not-open';
      const close = modal.querySelector('[data-close], .modal-close, button');
      close?.click();
      await new Promise((r) => setTimeout(r, 400));
      return !modal.classList.contains('open') ? true : 'did-not-close';
    });
    modalOk === true ? pass('clients modal open/close') : fail(`clients modal: ${modalOk}`);

    // Clients hover caption (breachbunny parity: logo card reveals a one-liner)
    const capOk = await page.evaluate(async () => {
      const open = document.querySelector('#clients [data-open-clients], #clients .clients-cta, #clients button');
      open?.click();
      await new Promise((r) => setTimeout(r, 500));
      const card = document.querySelector('.cg-card');
      const cap = card?.querySelector('.cg-cap');
      if (!card || !cap) return 'no-card-or-cap';
      if (!cap.textContent.trim()) return 'empty-caption';
      card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      const shown = matchMedia('(hover: hover)').matches ? true : 'no-hover-device';
      const modal = document.getElementById('clients-modal');
      modal?.querySelector('[data-close], .modal-close, button')?.click();
      return shown;
    });
    capOk === true ? pass('clients hover caption present') : fail(`clients caption: ${capOk}`);

    // Promo ribbon (off by default; dismissible when enabled)
    const ribbonOk = await page.evaluate(async () => {
      if (document.body.classList.contains('ribbon-on')) return 'on-by-default';
      document.body.classList.add('ribbon-on');
      const close = document.getElementById('ribbon-close');
      if (!close) return 'no-close-btn';
      close.click();
      await new Promise((r) => setTimeout(r, 100));
      return !document.body.classList.contains('ribbon-on') ? true : 'did-not-dismiss';
    });
    ribbonOk === true ? pass('ribbon off by default + dismissible') : fail(`ribbon: ${ribbonOk}`);

    // About media pane: the flat still stands down while the showcase camera
    // composes the live Marut into the framed stage.
    const aboutOk = await page.evaluate(() => {
      const img = document.querySelector('#about .about-mascot-img');
      if (!img) return 'no-still';
      return getComputedStyle(img).display === 'none' || 'flat still visible in showcase mode';
    });
    aboutOk === true ? pass('about pane: flat still stands down in showcase') : fail(`about pane: ${aboutOk}`);

    // The animator's breath channel never sleeps — a frozen rig means the
    // channel-compose update loop died somewhere. Wait in FRAMES, not wall
    // time: SwiftShader frame rates collapse late in a run, and a 600ms wall
    // clock can span zero rendered frames (false "static").
    const breathOk = await page.evaluate(async () => {
      const root = window.__marutRoot;
      if (!root) return 'no-root';
      const snap = () => {
        const a = [];
        root.traverse((o) => a.push(o.rotation.x, o.rotation.y, o.rotation.z));
        return a.join(',');
      };
      const s0 = snap();
      let frames = 0;
      // frame-based with a LONG wall cap: the skinned 48k GLB renders <1fps
      // under SwiftShader, so 8 frames can take >10s — that's a QA-renderer
      // artifact, not a page bug
      await new Promise((res) => {
        const t0 = performance.now();
        const step = () => {
          frames += 1;
          if (frames >= 8 || performance.now() - t0 > 15000) res();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      if (frames < 8) return `only ${frames} frames rendered in 15s`;
      return snap() !== s0 ? true : 'rig static (breath channel dead)';
    });
    breathOk === true ? pass('animator alive (breath channel moving)') : fail(`animator: ${breathOk}`);

    // Mascot Lab: chips + drag-rotate on the live procedural instance.
    // Scroll in STEPS: an instant jump leaves the overlay choreography's
    // scrubbed entrance behind (sec-content stays visibility:hidden and eats
    // the pointer events) — stepped scrolling matches real input and lets the
    // scrub catch up.
    const hasLab = await page.evaluate(() => document.body.classList.contains('has-marut'));
    if (hasLab) {
      for (let step = 1; step <= 4; step++) {
        await page.evaluate((k) => {
          const el = document.getElementById('mascot-lab');
          const target = el.offsetTop - (innerHeight - el.offsetHeight) / 2;
          scrollTo(0, scrollY + (target - scrollY) * k);
        }, step / 4);
        await sleep(350);
      }
      await sleep(1200);
      await page.evaluate(() => document.querySelector('#mascot-lab .lab-chip')?.click());
      await sleep(400);
      pass('mascot-lab chip clicked (no throw)');
      // Drag yaw lands on the rig root (animation.js composes yawBase + dragYaw).
      const yawOf = () => page.evaluate(() => window.__marutRoot?.rotation.y ?? null);
      const y0 = await yawOf();
      const r = await page.evaluate(() => {
        const b = document.getElementById('mascotlab-mount').getBoundingClientRect();
        return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      });
      await page.mouse.move(r.x, r.y); await page.mouse.down();
      // pointermove is rAF-coalesced in Chrome — under SwiftShader (<1fps)
      // moves fired on a wall-clock cadence vanish before dispatch. Pump one
      // rendered frame per step so every move actually lands.
      for (let i = 1; i <= 5; i++) {
        await page.mouse.move(r.x + i * 45, r.y);
        await page.evaluate(() => new Promise((res) => requestAnimationFrame(res)));
      }
      await page.mouse.up();
      await sleep(400);
      const y1 = await yawOf();
      Math.abs((y1 ?? 0) - (y0 ?? 0)) > 0.15 ? pass(`drag-rotate spins (Δyaw ${(y1 - y0).toFixed(2)})`) : fail('drag-rotate did not rotate');
      // CSS opacity transitions need rendered frames to progress — poll with
      // rAF pumps instead of a single read (SwiftShader frame scarcity)
      const hint = await page.evaluate(() => new Promise((res) => {
        const t0 = performance.now();
        const check = () => {
          const o = Number(getComputedStyle(document.querySelector('.drag-hint')).opacity);
          if (o <= 0.05 || performance.now() - t0 > 8000) res(o);
          else requestAnimationFrame(check);
        };
        check();
      }));
      Number(hint) <= 0.05 ? pass('drag hint faded after first drag') : fail(`drag hint opacity ${hint} after drag`);
      if (SHOTS) await page.screenshot({ path: `${OUT}/${label}-mascotlab-after-drag.png` });
    } else {
      fail('mascot-lab: live Marut missing at desktop width');
    }
  }

  // Console report.
  const errs = consoleMsgs.filter((m) => m.type !== 'warning');
  const warns = consoleMsgs.filter((m) => m.type === 'warning');
  if (errs.length) fail(`console errors (${errs.length}): ${errs.map((e) => e.text).join(' | ').slice(0, 400)}`);
  else pass('zero console errors');
  if (warns.length) fail(`console warnings (${warns.length}): ${warns.map((e) => e.text).join(' | ').slice(0, 400)}`);
  else pass('zero console warnings');

  await page.close();
}

for (const w of WIDTHS) await runWidth(w);
await browser.close();
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
