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
  three/                   # scene.js, particles.js, globe.js, mascot.js
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

## (e) Regenerate / replace the character mascot

The mascot (§6) is the illustrated OranjeStride character — source art at
`public/img/mascot/mascot-character.png`. It follows the "one 3D asset, many flat renders"
pattern: most sections show a pre-rendered **pose still**; the hero can optionally upgrade to a
live rigged mesh. Code lives in `src/three/mascot.js`; placement/CSS in `src/style.css`
(`.mascot*`). Poses are injected per section via `mascotMarkup(pose, variant)` (`src/utils/helpers.js`).

**Pose stills** — `public/img/mascot/poses/{idle,wave,point,run,cheer}.webp`
Only `idle.webp` currently ships (a transparent cutout of the source art; `idle.png` is the
non-webp fallback). Each mascot `<img>` uses a fallback chain **`<pose>.webp → idle.webp → idle.png`**,
so any pose that isn't rendered yet degrades to idle automatically. To add the real poses:

1. **(Phase A — outside this repo)** Feed `mascot-character.png` into an image-to-3D tool
   (Meshy.ai / Tripo3D / Luma), auto-rig (Meshy or Mixamo), apply Idle / Wave / Point / Run /
   Cheer clips.
2. Render each pose as a transparent PNG/WebP from a straight-on 3/4 angle and drop them into
   `public/img/mascot/poses/` with the exact names above. They're picked up on next load — no
   code change. (The shipped `idle.webp` was produced in-repo by white-background flood-fill of
   the source art with Pillow; re-run that if you replace the character art.)

**Live hero mesh** — `public/models/mascot.glb`
Export the rigged model (with Idle/Wave/Run clips embedded) as GLB to `public/models/mascot.glb`.
On next load, `initHeroMascotGLB()` HEAD-checks that path; if present it dynamically imports
`GLTFLoader`, mounts the mesh into the Three.js scene at the hero anchor, plays Idle→Wave, and
makes it cursor/scroll-reactive — then adds `body.has-hero-glb` so the flat hero pose hides.
If the GLB is absent or fails to load, the hero keeps the flat idle/wave cutout (no breakage).

Where each pose appears: nav `idle` · hero `wave`(→GLB) · about `point` · programmes `run` ·
India Tour `point` · clients faint `idle` · closing `cheer` · preloader `idle`.

---

## Accessibility & performance notes

- `prefers-reduced-motion: reduce` disables parallax/particles/scrub and shows static posters.
- Videos are muted + `playsinline` + lazy-loaded; offscreen videos pause via IntersectionObserver.
- The promo ribbon is **off by default** — enable by adding class `ribbon-on` to `<body>`.
- Contact form posts to Formspree (`https://formspree.io/f/mjgaovpl`); submit is guarded so it
  never throws even if the endpoint is unreachable in dev.
