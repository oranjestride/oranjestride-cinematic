// marut-shot.mjs — dev-only screenshot harness for the procedural mascot.
// Opens a page in headless Chrome (SwiftShader WebGL), optionally runs an
// expression first (camera moves, poses), waits for frames, saves a PNG.
//
//   node scripts/marut-shot.mjs --url http://localhost:5173/marut-dev.html \
//        --out shots/front.png [--eval "__dev.view(0,1.1,3.4)"] [--wait 800] \
//        [--w 900] [--h 1100] [--fullpage]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i > -1 ? (process.argv[i + 1]?.startsWith('--') || !process.argv[i + 1] ? true : process.argv[i + 1]) : d;
};

const URL = arg('url', 'http://localhost:5173/marut-dev.html');
const OUT = resolve(arg('out', 'scripts/shots/marut.png'));
const EXPR = arg('eval', null);
const WAIT = Number(arg('wait', 700));
const W = Number(arg('w', 900));
const H = Number(arg('h', 1100));
const CHROME = arg('chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe');

mkdirSync(dirname(OUT), { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--enable-unsafe-swiftshader', `--window-size=${W},${H}`],
  defaultViewport: { width: W, height: H },
});

try {
  const page = await browser.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.log(`[page:${m.type()}]`, m.text());
  });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  // This machine's OS disables animations, which flips prefers-reduced-motion
  // on for every local browser — emulate no-preference so the live tier runs
  // (pass --reduced to test the accessibility tier instead).
  await page.emulateMediaFeatures([
    { name: 'prefers-reduced-motion', value: arg('reduced', false) ? 'reduce' : 'no-preference' },
  ]);

  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  if (EXPR && EXPR !== true) await page.evaluate(EXPR);
  await new Promise((r) => setTimeout(r, WAIT));
  const AFTER = arg('evalAfter', null);
  if (AFTER && AFTER !== true) console.log('[after]', JSON.stringify(await page.evaluate(AFTER)));
  const stats = await page.evaluate('window.__marutStats || null');
  await page.screenshot({ path: OUT, fullPage: !!arg('fullpage', false) });
  console.log('saved', OUT, 'stats', JSON.stringify(stats));
} finally {
  await browser.close();
}
