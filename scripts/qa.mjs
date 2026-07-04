// ============================================================================
// qa.mjs — headless QA harness (puppeteer-core → local Chrome).
//
//   node scripts/qa.mjs [--url http://localhost:4318/] [--out qa-shots]
//                       [--widths 375,820,1440] [--reduced] [--no-shots]
//
// Per width: full scroll-through, per-section screenshots, console
// error/warning capture, and a network count of mascot.glb fetches.
// At desktop width it also drives the interactive states (Mascot Lab chips +
// drag-rotate, Clients modal + hover captions, Programme tabs).
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
const NO_GLB = has('expect-no-glb'); // run with mascot.glb removed: assert flat fallback
const SHOTS = !has('no-shots');
const CHROME = arg('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');

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
  if (REDUCED) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

  const consoleMsgs = [];
  page.on('pageerror', (e) => consoleMsgs.push({ type: 'pageerror', text: e.message }));
  page.on('console', (m) => {
    const t = m.type();
    if (t === 'error' || t === 'warning') consoleMsgs.push({ type: t, text: m.text() });
  });
  const glbFetches = [];
  page.on('request', (r) => { if (r.url().includes('mascot.glb')) glbFetches.push(r.method()); });

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(4500); // preloader + GLB mount settle

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

  if (REDUCED) {
    // No live WebGL / drag / parallax under reduced motion.
    const state = await page.evaluate(() => ({
      glEnabled: !!window.OS3D?.enabled,
      liveMascots: [...document.body.classList].filter((c) => c.endsWith('-glb')).length,
      dragTargets: document.querySelectorAll('.mascot-drag').length,
    }));
    state.glEnabled ? fail(`reduced-motion: WebGL still enabled`) : pass('reduced-motion: WebGL layer off');
    state.liveMascots ? fail(`reduced-motion: ${state.liveMascots} live mascots mounted`) : pass('reduced-motion: no live mascots');
    state.dragTargets ? fail(`reduced-motion: drag-rotate active`) : pass('reduced-motion: no drag targets');
    if (glbFetches.filter((m) => m === 'GET').length > 0) fail('reduced-motion: mascot.glb was fetched');
    else pass('reduced-motion: no mascot.glb fetch');
  } else if (NO_GLB) {
    const state = await page.evaluate(() => ({
      liveMascots: [...document.body.classList].filter((c) => c.endsWith('-glb')).length,
      flatPoses: [...document.querySelectorAll('.mascot-img')].filter((i) => i.complete && i.naturalWidth > 0).length,
    }));
    state.liveMascots ? fail(`no-GLB: ${state.liveMascots} live mascots mounted anyway`) : pass('no-GLB: zero live mounts');
    state.flatPoses > 0 ? pass(`no-GLB: ${state.flatPoses} flat pose stills rendered`) : fail('no-GLB: flat poses missing');
  } else {
    const gets = glbFetches.filter((m) => m === 'GET').length;
    if (gets > 1) fail(`mascot.glb GET fetched ${gets} times (want ≤1)`);
    else pass(`mascot.glb GET fetches: ${gets}`);
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

    // Offscreen instances provably stop: with one section active, exactly one
    // skinned rig is visible, and an inactive rig's bones do not move over time.
    const mixerOk = NO_GLB ? 'skipped (no GLB)' : await page.evaluate(async () => {
      const rigs = [];
      window.OS3D.three.scene.traverse((o) => {
        if (o.type === 'Group' && o.parent === window.OS3D.three.scene) {
          let sk = false; o.traverse((c) => { if (c.isSkinnedMesh) sk = true; });
          if (sk) rigs.push(o);
        }
      });
      if (rigs.length < 2) return `only ${rigs.length} rig(s)`;
      const visible = rigs.filter((r) => r.visible);
      if (visible.length > 1) return `${visible.length} rigs visible at once`;
      const idle = rigs.find((r) => !r.visible);
      let bone = null; idle.traverse((o) => { if (!bone && o.isBone) bone = o; });
      const q0 = bone.quaternion.toArray().join(',');
      await new Promise((r) => setTimeout(r, 600));
      const q1 = bone.quaternion.toArray().join(',');
      return q0 === q1 ? true : 'inactive rig still animating';
    });
    if (mixerOk !== 'skipped (no GLB)') {
      mixerOk === true ? pass('offscreen mascots frozen (1 visible rig, inactive bones static)') : fail(`offscreen mixers: ${mixerOk}`);
    }

    // Hero drag-rotate (grab the hero rig while the hero section is active)
    const hasHero = await page.evaluate(() => document.body.classList.contains('has-hero-glb'));
    if (hasHero) {
      await page.evaluate(() => scrollTo(0, 0));
      await sleep(1200);
      const hr = await page.evaluate(() => {
        const b = document.getElementById('hero-mascot-mount').getBoundingClientRect();
        return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      });
      const heroYaw = () => page.evaluate(() => {
        let y = null;
        window.OS3D.three.scene.traverse((o) => {
          if (y === null && o.type === 'Group' && o.visible && o.parent === window.OS3D.three.scene) {
            let sk = false; o.traverse((c) => { if (c.isSkinnedMesh) sk = true; });
            if (sk) y = o.rotation.y;
          }
        });
        return y;
      });
      const hy0 = await heroYaw();
      await page.mouse.move(hr.x, hr.y); await page.mouse.down();
      for (let i = 1; i <= 8; i++) { await page.mouse.move(hr.x - i * 20, hr.y); await sleep(30); }
      await page.mouse.up();
      await sleep(700);
      const hy1 = await heroYaw();
      Math.abs((hy1 ?? 0) - (hy0 ?? 0)) > 0.15 ? pass(`hero drag-rotate spins (Δyaw ${(hy1 - hy0).toFixed(2)})`) : fail('hero drag-rotate did not rotate');
    }

    // Mascot Lab: chips + drag-rotate (only when the live GLB actually mounted)
    const hasLab = await page.evaluate(() => document.body.classList.contains('has-mascotlab-glb'));
    if (hasLab) {
      await page.evaluate(() => document.getElementById('mascot-lab')?.scrollIntoView({ block: 'center' }));
      await sleep(1200);
      await page.evaluate(() => document.querySelector('#mascot-lab .lab-chip')?.click());
      await sleep(400);
      pass('mascot-lab chip clicked (no throw)');
      const yawOf = () => page.evaluate(() => {
        let y = null;
        window.OS3D.three.scene.traverse((o) => {
          if (y === null && o.type === 'Group' && o.visible && o.parent === window.OS3D.three.scene) {
            let sk = false; o.traverse((c) => { if (c.isSkinnedMesh) sk = true; });
            if (sk) y = o.rotation.y;
          }
        });
        return y;
      });
      const y0 = await yawOf();
      const r = await page.evaluate(() => {
        const b = document.getElementById('mascotlab-mount').getBoundingClientRect();
        return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      });
      await page.mouse.move(r.x, r.y); await page.mouse.down();
      for (let i = 1; i <= 10; i++) { await page.mouse.move(r.x + i * 22, r.y); await sleep(30); }
      await page.mouse.up();
      await sleep(800);
      const y1 = await yawOf();
      Math.abs((y1 ?? 0) - (y0 ?? 0)) > 0.15 ? pass(`drag-rotate spins (Δyaw ${(y1 - y0).toFixed(2)})`) : fail('drag-rotate did not rotate');
      const hint = await page.evaluate(() =>
        getComputedStyle(document.querySelector('.drag-hint')).opacity);
      Number(hint) === 0 ? pass('drag hint faded after first drag') : fail(`drag hint opacity ${hint} after drag`);
      if (SHOTS) await page.screenshot({ path: `${OUT}/${label}-mascotlab-after-drag.png` });
    } else {
      console.log('  · mascot-lab live GLB not mounted (flat fallback) — skipping drag test');
    }
  }

  // Console report. With mascot.glb deliberately removed, the availability
  // probe's HEAD 404 is logged by the browser itself — expected, not a defect.
  const expected = (m) => NO_GLB && /mascot(-anims)?\.(glb|fbx)|Failed to load resource.*404/i.test(m.text);
  const errs = consoleMsgs.filter((m) => m.type !== 'warning' && !expected(m));
  const warns = consoleMsgs.filter((m) => m.type === 'warning' && !expected(m));
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
