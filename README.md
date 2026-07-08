# OranjeStride — Cinematic 3D Website

A single-page, scroll-driven, cinematic site for **OranjeStride** — India's premier
Generative AI & Data Science training consultancy. Dark navy / amber register, full-bleed
cinema-grade video with WebGL particle/3D accents composited on top, a recurring low-poly
mascot, and GSAP + Lenis scroll choreography.

Built with **Vite + vanilla ES modules + Three.js + GSAP/ScrollTrigger + Lenis** — no framework.

---

## (a) Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build:

```bash
npm run build      # → dist/
npm run preview    # serve the production build
```

---

## Project structure

```
index.html                 # Vite entry — mounts #app, loads src/main.js
src/
  main.js                  # entry: composes sections, wires Lenis+GSAP+Three, interactions
  style.css                # design tokens + all layout
  data/content.js          # ALL copy as exported constants (edit copy here)
  sections/                # one module per section (render + init)
  three/                   # scene.js, particles.js, showcase.js, marut/ (procedural mascot)
  utils/                   # helpers, cursor, reveal, video
public/
  video/                   # the 8 .mp4 files (exact names below)
  img/logo02.png
  img/posters/             # generated poster frames
scripts/generate-posters.mjs
reference/                 # legacy source site (content reference only, not built)
```

Section modules follow a `renderX()` (returns an HTML string built from `content.js`) +
optional `initX()` (wires behavior) shape. `src/main.js` composes them into `#app`, then
initializes the scroll engine, the Three.js layer, and each section's interactions. Comments
in `main.js` / `scene.js` mark where GSAP triggers and Three.js scenes are wired in.

---

## (b) How poster frames were generated

Only the 8 `.mp4` files and `logo02.png` shipped — no poster stills. Posters in
`public/img/posters/` are a first-frame grab per video with a slight cinematic dark grade,
used for lazy-load and the `prefers-reduced-motion` fallback. Regenerate with:

```bash
npm run posters          # needs ffmpeg on PATH (brew install ffmpeg)
```

Equivalent manual command per file (§3.6):

```bash
ffmpeg -ss 0.1 -i public/video/hero-opening.mp4 -frames:v 1 public/img/posters/hero-opening.jpg
```

---

## (c) Swap / replace video assets

1. Drop the new file into `public/video/` using **the same filename**, or add a new name.
2. Filenames are referenced by the `video:` field of each section in `src/data/content.js`
   (e.g. `hero.video = 'hero-opening'` → `public/video/hero-opening.mp4`). Change that string
   to point at a new file — no other edits needed.
3. Regenerate the poster: `npm run posters`.

Current names: `hero-opening`, `about-portrait`, `expertise-array`, `programmes-ascent`,
`consulting-vault`, `india-tour-globe`, `clients-monument`, `closing-emblem`.

Hero and Closing are **scroll-scrubbed** (`data-scrub="true"` via `videoBlock(name,{scrub:true})`);
the rest autoplay-loop. Scrub mapping lives in `src/utils/video.js`.

---

## (d) Adjust particle density (performance tuning)

`src/three/scene.js`:

```js
const count = mobile ? Math.round(1400 * 0.3) : 1400;   // ← ember count
```

Lower the base `1400` for weaker GPUs; the mobile branch already drops ~70% (§3.7).
`devicePixelRatio` is capped at 2 in the same file. All WebGL is skipped entirely under
`prefers-reduced-motion` (posters show instead).

---

## (e) Procedural mascot — `src/three/marut/`

Marut, the OranjeStride character, is **100% code** — no model files, no imports. Every
edge, surface, and the glowing arrow tail is authored as Three.js geometry with
canvas-generated textures at runtime (reference art: `public/img/mascot/poses/idle.png`).

```
src/three/marut/
  index.js      createMarut({quality}) — assembles the character, returns the instance API
  palette.js    colors + shared MeshStandardMaterial singleton
  textures.js   CanvasTexture makers (circuit-print jacket, text decals, contact shadow)
  rig.js        boneless rig — nested Object3D joints (root→hips→spine→chest→…)
  poses.js      declarative Euler pose targets (idle, confident, point, openArms, runReady)
  animation.js  MarutAnimator — channel-compose: base+breath+loco+overlay summed per frame
  geometry/     head, hair, torso, limbs, shoes, tail builders
```

One instance stands at world origin for the whole page; the scroll showcase
(`src/three/showcase.js`) scrubs a master GSAP timeline that flies the camera between
per-section waypoints (`frameX` declares where he lands on screen; the aim is solved
numerically per aspect ratio, with mobile waypoint overrides ≤900px). Poses and one-shots
are driven by the active-section observer in `src/main.js`, and the Mascot Lab chips call
`marut.play('wave'|'run'|'cheer')` directly.

Iterate on him in isolation at **`/marut-dev.html`** (orbit controls, pose/clip buttons,
`window.__marutStats` budget readout). Render budget: ~21k tris, ≤38 draw calls for the
character; `scripts/qa.mjs` asserts the live scene total each run.

**Flat pose stills** — `public/img/mascot/poses/{idle,wave,point,run,cheer}.webp` — are the
`prefers-reduced-motion` / no-WebGL tier only (`src/three/mascot-fallback.js`). Each mascot
`<img>` uses the fallback chain **`<pose>.webp → idle.webp → idle.png`**, so a missing pose
degrades to idle automatically.

Where each flat pose appears (reduced tier): nav `idle` · hero `wave` · about `idle` ·
programmes `run` · India Tour `point` · clients faint `idle` · closing `cheer` · preloader `idle`.

---

## Accessibility & performance notes

- `prefers-reduced-motion: reduce` disables parallax/particles/scrub and shows static posters.
- Videos are muted + `playsinline` + lazy-loaded; offscreen videos pause via IntersectionObserver.
- The promo ribbon is **off by default** — enable by adding class `ribbon-on` to `<body>`.
- Contact form posts to Formspree (`https://formspree.io/f/mjgaovpl`); submit is guarded so it
  never throws even if the endpoint is unreachable in dev.
