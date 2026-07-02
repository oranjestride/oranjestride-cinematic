# Build Prompt — OranjeStride Cinematic 3D Website

Paste everything below into Claude Code along with the 8 video files and `logo02.png` listed in the Asset Manifest (§4) — place them exactly as described in the Project Structure (§1) before starting, or tell Claude Code where they are so it can move them itself. Real copy is pulled from the existing `index.html` (content source only — its light/paper theme, layout, and image references are NOT to be reused; only the text content, data points, and interactive behaviors below). Work through §8's Build Order in sequence and self-check against §9 before considering it done.

---

## 1. Project Brief

Build a single-page, scroll-driven, cinematic 3D website for **OranjeStride** — India's premier Generative AI & Data Science training consultancy, turning complex algorithms into competitive advantage for professionals, executives, and institutions. Brand motto: *"From data to decisions. From decisions to outcomes."* Logo mark: a running humanoid figure fused with a circuit chip, orbit nodes, and a glowing brain — momentum + intelligence.

The site must feel like a high-end film title sequence: dark, moody, luxurious, amber light cutting through navy darkness — Apple product page meets a title sequence. Full-bleed cinema-grade video, parallax depth, WebGL particle/3D accents layered on top of (not replacing) the footage.

**Interaction reference:** [breachbunny.com](https://www.breachbunny.com/) — borrow its *structural/interaction* confidence, not its visual identity (that site is a bright pink/neon Gen-Z insurance brand; ours stays navy/amber and premium). Specifically borrow: (1) a recurring **mascot character** that appears throughout the page in different poses/expressions rather than a static logo; (2) each service/product gets its own **bespoke 3D hero prop**, not a generic stock icon; (3) a full-bleed **autoplay video break** dropped mid-scroll as a palette-cleanser between content-heavy sections; (4) a subtle **repeating decorative glyph texture** scattered across section backgrounds (their "crosses" pattern → our faceted-diamond pattern, see §2); (5) partner/client logos revealed with a hover caption, not just a static grid; (6) a confident, oversized-numerals treatment for stats/trust markers; (7) a bold closing CTA band with trust badges. Full section-by-section mapping is in §7.

**Tech stack — locked, do not re-litigate:**
- **Vite + vanilla JavaScript (ES modules)** — no React/Vue/framework. A framework adds no value here and only adds build risk; this is a single scroll narrative, not an app with routes/state.
- **Three.js** (npm, latest stable) for WebGL layers: floating particles, the glowing diamond emblem, the wireframe globe, ambient fog, and the 3D mascot (§6).
- **GSAP + ScrollTrigger** (npm) for scroll choreography, pinning, and video-scrubbing.
- **Lenis** (npm) for smooth inertia scrolling.
- Plain **HTML5 `<video>`** (muted, loop, `playsinline`, lazy-loaded) for the cinematic footage — composite WebGL effects *over* video via a `position:absolute` canvas, don't try to recreate the footage itself in WebGL.
- Vanilla CSS with custom properties for the tokens below — no Tailwind, no CSS-in-JS, to keep the codebase inspectable in one pass.
- Fonts: **"Space Grotesk"** for display/headlines, **"Inter"** for body (both via Google Fonts `<link>`, matches the existing site's Inter usage). Don't substitute other fonts.

**Project structure (fixed):**
```
/
├── index.html
├── src/
│   ├── main.js              # entry: Lenis + GSAP + section init
│   ├── style.css
│   ├── sections/             # one module per section (hero.js, about.js, expertise.js, ...)
│   ├── three/                # scene.js, particles.js, mascot.js, globe.js
│   └── data/                 # content.js — all copy from §5 as exported constants, not hardcoded in markup
├── public/
│   ├── video/                # the 8 .mp4 files, exact filenames from §4
│   └── img/
│       ├── logo02.png
│       └── posters/          # generated poster jpgs, see §3.6
├── package.json
└── README.md
```
Keep all section copy in `src/data/content.js` rather than scattered inline strings — makes future copy edits a one-file change.

---

## 2. Design System

Carry the brand's real palette forward (from the existing site) into a dark cinematic register:

| Token | Value | Notes |
|---|---|---|
| `--bg-void` | `#060a12` | Base background, near-black navy |
| `--bg-navy` | `#1e2d3d` | Section background / video letterbox (brand navy) |
| `--bg-navy-2` | `#17314a` | Secondary navy / card backgrounds |
| `--accent-orange` | `#ff6a00` | Primary brand orange (exact brand token) |
| `--accent-orange-2` | `#f47c20` | Secondary orange / gradients |
| `--accent-orange-soft` | `rgba(255,106,0,0.18)` | Glow/wash |
| `--text-primary` | `#f5efe6` | Warm off-white |
| `--text-muted` | `#9aa0ae` | Secondary copy |
| Typography | Display: **Space Grotesk** (700/500), large + tracked out (`clamp(2.5rem, 6vw, 6.5rem)` for hero-scale headlines). Body: **Inter** (400/600), matches existing site. Fixed choice — see §1 stack. | Wordmark treatment: "**Oranje**" in `--accent-orange`, "**Stride**" in off-white (mirrors existing `.w-oranje` / `.w-stride` split). |
| Motion | Slow, deliberate ease-outs (`power3.out`/`expo.out`), never linear or snappy. | |
| Cursor | Custom glowing dot-and-ring cursor in orange, magnetized toward buttons | |
| Grain | Subtle film-grain/noise overlay (~4% opacity) unifying video + WebGL layers | |
| Decorative texture | A low-opacity (~6%) repeating pattern of the logo's small diamond/rhombus facet, scattered across section backgrounds — our answer to breachbunny's repeating "crosses" motif. Denser near section edges, sparse in the center so it never competes with copy. | |

---

## 3. Global Mechanics

1. **Preloader**: black screen, orange particles converge into the diamond emblem (reuse hero footage's opening beat, or rebuild in Three.js `Points`), ignites, wipes to reveal hero.
2. **Scroll choreography**: each primary section is 100dvh, pinned via ScrollTrigger while its video scrubs in sync with scroll progress (`video.currentTime = progress * video.duration`) for the hero and closing sections; other sections autoplay-loop with scroll-triggered text/3D reveals layered on top.
3. **Depth layering** (back→front) per section: `video (cover, dark-graded via CSS filter/gradient) → WebGL particle/geometry layer → vignette → text/UI`.
4. **Transitions**: cross-fade + slight scale/parallax (1.05→1.0); never a hard cut.
5. **Sticky nav**: logo mark left ("Oranje" orange / "Stride" off-white wordmark), thin progress line or 8 section dots right, appears after hero. Nav links: About, Expertise, Programmes, Consulting, India Tour, Clients, Contact.
6. **Asset note**: only the 8 `.mp4` files and `logo02.png` currently exist — no poster stills. As an asset-prep step (once, not at runtime), generate a poster frame per video with `ffmpeg -ss 0.1 -i public/video/<name>.mp4 -frames:v 1 public/img/posters/<name>.jpg` and commit the output into `public/img/posters/` for lazy-load and `prefers-reduced-motion` fallback.
7. **Responsive**: on mobile, reduce WebGL particle density ~70%, switch pinned/scrubbed sections to simple autoplay loops, stack vertically.
8. **Performance**: `preload="metadata"` + poster until section nears viewport; cap devicePixelRatio at 2 for Three.js; pause offscreen video/canvas via IntersectionObserver.
9. **Accessibility**: respect `prefers-reduced-motion` (kill parallax/particles, show static poster frames); videos are decorative/muted; form fields fully labeled.

---

## 4. Asset Manifest

| # | Section | Video file | Dimensions | Duration | Loop? |
|---|---|---|---|---|---|
| 1 | Hero | `hero-opening.mp4` | 1920×1080 @30fps | 7.8s | scroll-scrubbed once, then loop |
| 2 | About | `about-portrait.mp4` | 1280×720 @24fps | 9.5s | loop |
| 3 | Expertise | `expertise-array.mp4` | 1280×720 @24fps | 9.3s | loop |
| 4 | Programmes | `programmes-ascent.mp4` | 1908×1080 @24fps | 9.8s | loop |
| 5 | Consulting | `consulting-vault.mp4` | 1920×1080 @24fps | 7.7s | loop |
| 6 | India AI Learning Tour | `india-tour-globe.mp4` | 1920×1080 @24fps | 7.8s | loop |
| 7 | Clients | `clients-monument.mp4` | 1908×1080 @24fps | 9.8s | loop |
| 8 | Contact / Closing CTA | `closing-emblem.mp4` | 1280×720 @24fps | 8.0s | scroll-scrubbed |

Logo: `logo02.png` (transparent, orange/navy running-figure-chip-brain mark) — use in nav, favicon, and reconstruct as a low-poly/particle Three.js emblem in the preloader and closing section.

Two content blocks (**Stats** and **Testimonials**) have no dedicated footage — treat them as short interstitial "bands" between video sections (dark navy background, ambient drifting particles carried over from the neighboring section, no new video).

---

## 5. Section-by-Section Direction (with real copy)

### 1 — Hero (`hero-opening.mp4`)
Footage: thin vertical light strands rising out of navy darkness, resolving into the glowing diamond emblem surrounded by orbiting orange particles.
- Scroll-scrub the video for the first ~30% of scroll so the emblem "assembles" as the user scrolls in.
- Eyebrow: *"Generative AI · Machine Learning · Analytics"*
- Wordmark: **OranjeStride** (split-colored per design system)
- Headline: *"Stride into Decision Intelligence"* (with "Decision Intelligence" in orange)
- Subhead: *"India's premier Gen AI & Data Science training consultancy — turning complex algorithms into competitive advantage for professionals, executives, and institutions."*
- Motto line (small, left-border accent): *"From data to decisions. From decisions to outcomes."*
- Two CTAs: primary "Explore Programmes" (scrolls to Programmes), secondary "Talk to Us" (scrolls to Contact).
- Add a Three.js `Points` field of soft orange particles drifting behind/around the video edges, parallaxing on mouse move.

### Interstitial — Stats band (no video; ambient navy + drifting embers)
Four-up metric strip, large orange numerals: **1000+** Professionals & Students Trained · **4.8/5** Average Feedback Score · **90%+** Post-Training Skill Adoption · **15+** Premier Institutional Clients. Count-up animation on scroll-into-view.

### 2 — About (`about-portrait.mp4`)
Footage: a silhouetted figure in a suit walking through clouds toward a bright horizon light, closing on shoes stepping onto a reflective wet floor.
- Section label: *"About OranjeStride"* — Headline: *"Nothing Is Unattainable"*
- Split layout: video one side (or full-bleed with dark scrim), four principles revealing on scroll (stagger), each numbered 01–04:
  1. **Relevance With Industry** — Curriculum crafted by practitioners mapped to real job roles in AI, Data Engineering, and Analytics.
  2. **Expert Experienced Faculty** — Dedicated data scientists and educators with hundreds of hours of live training delivery across elite institutions.
  3. **Analytics For All** — Case-study methodology ensuring participants from finance, ops, and HR grasp practical applications immediately.
  4. **Certified Analytics Professional** — Our OAP certification helps professionals stand apart in a crowded talent market.
- As copy reveals, tighten a depth-of-field vignette toward center, echoing "walking toward the light."

### 3 — Expertise (`expertise-array.mp4`)
Footage: clusters of faceted orange/glass icosahedron gems floating and reflecting on a glossy dark floor.
- Section label: *"What We Do"* — Headline: *"Areas of Deep Expertise"*
- Subcopy: *"End-to-end capability across the modern AI stack — from foundational statistics to cutting-edge agentic systems."*
- Six-card grid, one gem = one card, glow-bloom on hover:
  1. **Generative AI & Agentic AI** — LLMs, prompt engineering, RAG architectures, AI agents, autonomous workflows. Tags: LLMs, RAG, Agents, Prompt Eng.
  2. **Machine Learning & Statistical Modeling** — Supervised & unsupervised learning, regression, classification, ensemble methods, interpretability. Tags: Scikit-learn, XGBoost, Python/R, Stats.
  3. **Data Science & Advanced Analytics** — End-to-end pipelines, EDA, feature engineering, fraud detection, risk scoring, forecasting. Tags: Pandas, SQL, Forecasting, A/B Testing.
  4. **Business Intelligence & Visualization** — Tableau, Power BI, Python viz labs, executive dashboards. Tags: Tableau, Power BI, Plotly, Dashboards.
  5. **Corporate & Executive AI Strategy** — Workshops for C-suite on AI adoption, ROI mapping, transformation roadmaps. Tags: Strategy, AI Roadmap, Change Mgmt.
  6. **Deep Learning & Neural Networks** — CNNs, RNNs, Transformers, computer vision. Tags: TensorFlow, PyTorch, Transformers, CV.
- Glassmorphic cards (blur + 1px orange-tinted border) so they feel cut from the same material as the gems.

### Interstitial — Clients band (feeds into Clients section, #7, below)
Section label: *"Our Reach"* — Headline: *"Trusted By Elite Institutions"* — *"From India's premier management schools to Fortune 500 leadership teams and government ministries — OranjeStride's programmes build capability where it matters most."* CTA button "View Our Clients & Partners" opens a full-screen modal gallery (dark-themed): tabbed filter (All / Academic / Corporate), grid of 16 logos with hover lift + orange border glow. Hint text: *"16 organisations across academia, enterprise & government — explore the full roster."*

### Interstitial — Testimonials band (no video; ambient navy)
Section label: *"What Learners Say"* — Headline: *"Results That Speak"* — 3-card grid, 5-star rating, quote, avatar initial, name + org:
- *"When theoretical concepts go hand in hand with practical implementation, the mind forces itself to explore beyond the vanilla concepts."* — Dilpreet, Sopra Steria
- *"One of the best teachers I have ever had... you make difficult things easy to understand."* — Ashish Aggarwal, Shri Vishwakarma Skill University
- *"A great hands-on introduction to ML... The R & Python coverage is exceptional and immediately actionable."* — Lakshay Guglani, Maharaja Agrasen College of Engg.

### 4 — Programmes (`programmes-ascent.mp4`)
Footage: a glowing staircase ascending through darkness into a burst of light.
- Section label: *"Programmes"* — Headline: *"Our Training Streams"*
- Subcopy: *"Three streams, one goal — turning knowledge into real capability. Each is built for a specific audience, delivered by people who've done the work, not just taught it."*
- Vertical scroll-scrubbed video: `currentTime` advances with scroll so the staircase visibly "climbs."
- Two-tab switcher (Corporate & Leadership Training / University & College Programmes), each tab's content mapped to ascending "steps":
  - **Corporate — Sector Tracks**: Banking & Financial Services (Credit Risk, Fraud ML, Forecasting, Gen AI), Healthcare & Pharma, Insurance (Claims AI, Churn, Risk Pricing), FMCG & Retail (Demand Forecast, CLV, Supply Chain AI), Government & Public Sector, Media/Tech/Telecom.
  - **Corporate — Leadership Tracks**: AI for Leaders — Strategic Fluency (flagship); AI Adoption Roadmap Workshop; Executive Analytics for Decision-Makers; Strategic Innovation with AI.
  - **University — Undergraduate Track**: Data Analytics for Undergraduates (Excel → MySQL → Tableau/Power BI → Python → Business Stats → capstone).
  - **University — Postgraduate/MBA Track**: Business Analytics & ML for Managers (Python, regression, ML, credit/churn/revenue modelling, capstone). Both carry: *"Certificate jointly signed by OranjeStride & a university of repute in India."*
  - Flagship UG/PG bootcamp: **Generative AI & Agentic AI Bootcamp** (LLMs, RAG, Prompt Eng., MCP, Deployment).
- Programme tiers/steps listed down the side, each highlighting in orange as its staircase step comes into view.

### 5 — Consulting (`consulting-vault.mp4`)
Footage: closeup on binary digits, pulling back into a circular tunnel of radiating orange data-bars/light.
- Section label: *"Consulting Practice"* — Headline: *"Data & Analytics Consulting"*
- Subcopy: *"Beyond training, OranjeStride brings deep domain expertise to complex analytical problems — working with quant firms, sovereign funds, and government research bodies on high-stakes data challenges."*
- Three items: **Quant Research & Risk Analytics** (statistical modeling, factor analysis, risk scoring, backtesting → portfolio analytics); **Financial Forecasting & Fraud Detection** (ML fraud detection, credit risk models, forecasting pipelines); **Government & Policy Research Analytics** (analytics roadmaps, data governance, policy impact modeling).
- Side data panel ("Engagement Metrics"), styled as a HUD overlay matching the tunnel's radial-grid motif: Post-training technique adoption 90%+, Within-30-day application rate 90%+, Post-session community engagement 90%+, Average cohort completion 85%+, Sustained feedback 4.8/5, plus animated progress bars for Learner Satisfaction 96%, Completion Rate 85%, Skill Adoption 90%.
- Add a thin Three.js radial grid/ring overlay rotating slowly opposite the tunnel's implied motion.

### 6 — India AI Learning Tour (`india-tour-globe.mp4`)
Footage: rotating orange wireframe globe centered on India/South Asia with orbiting rings.
- Section label: *"International Programme"* — Headline: *"India AI Learning Tour"*
- Subcopy: *"Experience AI & Data Science education at its source. An immersive learning journey in India — combining world-class curriculum, hands-on labs, and the academic credibility of a co-signed certificate from a university of repute in India."*
- Pair with a lightweight interactive Three.js globe layer (or screen-space hotspots synced to the video) with pulsing markers for four feature callouts, revealed on scroll:
  1. **Come to India. Learn at the Source.** — Structured, immersive programme on a partner university campus or executive training facility.
  2. **Practitioner-Led Curriculum** — OranjeStride faculty with live corporate experience (Accenture, EXL Services, global financial institutions). No pre-recorded content.
  3. **Hands-On Labs & Real Projects** — Real datasets from participants' own sectors (banking, insurance, government, FMCG); leave with deployable code/dashboards.
  4. **Cultural Immersion + Networking** — Campus visits, industry interfaces, peer cohorts from across the globe.
  5. **University-Backed Certificate** — Jointly signed by OranjeStride & a university of repute in India.

### 7 — Clients (`clients-monument.mp4`)
Footage: a dark angular monument/pyramid structure with glowing light beams and mist, reflected in still water.
- Pulls in the "Our Reach" copy + CTA from the interstitial above; the monument footage is this section's full-bleed backdrop.
- Client gallery modal (triggered by "View Our Clients & Partners"): dark card, orange radial glow accent top-right, tabs (All/Academic/Corporate) with counts, responsive logo grid, footer CTA linking to Contact.
- Slow volumetric fog drift (CSS blurred blob or Three.js fog shader) at the base to match the mist in the footage.

### 8 — Contact / Closing CTA (`closing-emblem.mp4`)
Footage: particles exploding outward from a point, coalescing into a glowing ring/portal against a starfield — mirrors the hero's emblem energy.
- Scroll-scrub tied to final scroll position so the "portal" fully forms as the user reaches the bottom.
- Section label: *"Get In Touch"* — Headline: *"Let's Build Outcomes Together"*
- Subcopy: *"Whether you're an institution designing a curriculum, a company upskilling teams, or a fund needing analytics depth — we'd love to hear from you."*
- Contact card: Email `contactus@oranjestride.com` · Phone `+91 93117 90400` · Location "Safdarjung Enclave, New Delhi, India" — each with an icon token matching the design system.
- Contact form (Full Name, Organisation, Email, Enquiry Type dropdown, Message, Submit) — keep the same field set/options as the source site; style inputs dark (navy fill, orange focus ring) to sit inside the portal glow. Retain the Formspree submission pattern (`action="https://formspree.io/f/mjgaovpl"`).
- The formed ring/portal centers the CTA button and logo mark glowing beneath it; footer nav + social links below, minimal.
- **Optional "DataStride" promo popup**: a secondary modal (triggered by a small floating badge, not on load) announcing *"DataStride — Interactive SQL Learning Platform by OranjeStride."* Copy: *"Master SQL from the ground up through a fully browser-based, hands-on learning environment... Live SQL Editor: write and run real SQL queries directly in your browser with instant feedback."* Style it as a dark glass card consistent with the rest of the site, not the light theme from the source file.

---

## 6. 3D Mascot / Avatar System (built from `logo02.png`)

Turn the logo's running figure — chip torso, brain, orbit nodes, arrow, all built from flat angular facets — into a real, posable 3D character that recurs across the site the way breachbunny's rabbit does. The logo is already low-poly/geometric, which makes it unusually well-suited to a **code-only 3D build** (no external modeling software required):

Build this in **two tiers**. Tier 1 is the guaranteed deliverable — build and ship it first. Tier 2 is a stretch upgrade attempted only after Tier 1 is working end-to-end; if it doesn't come together cleanly, Tier 1 stays as the shipped version. (Auto-tracing a raster PNG into clean multi-part SVG paths is unreliable to do blind in one pass — don't let the mascot block the rest of the site.)

**Tier 1 — Primitive-geometry runner (build this first, always ships):**
1. Look at `logo02.png` directly (it's in `public/img/`) and note its proportions/pose: angular torso, faceted head with brain motif, bent running arms and legs, an arrow diagonal through the figure, small orbit-node dots.
2. Construct the figure from **primitive Three.js geometries** — `IcosahedronGeometry`/`ConeGeometry`/`BoxGeometry` (low `detail`/segment counts for a faceted, low-poly look) for torso, head, and four limb segments; a thin elongated shape (stretched `ConeGeometry` or a custom `BufferGeometry` triangle strip) for the arrow; small `OctahedronGeometry` for the orbit nodes.
3. Flat-shaded `MeshStandardMaterial`/`MeshPhysicalMaterial` in `--accent-orange` with emissive glow, `--bg-navy` for shadow facets — same material language as the Expertise section's crystal footage, so the mascot reads as "made of the same stuff."
4. Group into a transform hierarchy (root → torso → head, torso → each limb) and animate exactly as described below (idle/run-cycle/reactivity). This alone reads as a cohesive, on-brand low-poly 3D character without ever touching the PNG's raster data.

**Tier 2 — True vectorized facet extrusion (stretch, attempt after Tier 1 works):**
1. If image-tracing tooling is available in the build environment (e.g. a Python step with `potrace`/`opencv` run once during asset prep, not at runtime), vectorize `logo02.png` into SVG paths split into the same parts as Tier 1.
2. Load with `SVGLoader`, extrude with `ExtrudeGeometry` (shallow depth + small bevel), replacing the Tier 1 primitives 1:1 in the same rig — the animation code doesn't change, only the geometry source.
3. If this path introduces messy/unusable paths (raster logos rarely trace cleanly), abandon it and keep Tier 1 — do not spend the whole session on tracing.

**Rig & animation (applies to either tier):**
1. **Rig without bones**: nested `Object3D` groups (root → torso → head, torso → each limb segment), animated with GSAP timelines — no skeletal/bone animation needed.
2. **Idle state**: slow float/bob + gentle Y-axis rotation, with a thin trail of particles (reuse the hero's particle system) drifting off the arrow tip.
3. **Run cycle**: a procedural GSAP timeline swinging the leg/arm groups in a loop — doesn't need to be anatomically perfect, just readable motion.
4. **Scroll & cursor reactivity**: mascot subtly looks toward the cursor (head-group rotation) and reacts to scroll velocity (leans forward on fast scroll, settles when idle).

**Where the mascot appears (mirroring breachbunny's rabbit-in-every-context pattern):**
- **Nav**: small idle/breathing version beside the wordmark.
- **Hero**: full-size, mid-run, positioned as if striding toward the headline as the emblem assembles behind it.
- **Programmes** (staircase section): mascot climbs alongside the scroll-scrubbed staircase, one "step" of the run-cycle per staircase step.
- **India Tour** (globe section): mascot plants a foot on the globe near the India marker, arm raised/pointing.
- **Closing CTA** (portal section): mascot runs *through* the forming ring/portal as it completes, arms up, particles trailing — the site's final beat.
- **Empty/loading states**: use an idle-pose version in the preloader instead of (or alongside) the particle-assembly emblem.

**Fallback path:** if the team can produce a proper rigged GLB (Blender/Spline/Mixamo-style) of the mascot, swap it in via `GLTFLoader` and keep the same trigger/behavior spec above — the interaction design doesn't change, only the asset source.

---

## 7. Interaction Patterns Borrowed From breachbunny.com

Structural/interaction ideas adapted from the reference site, mapped onto the existing sections (see §5) — keep OranjeStride's navy/amber palette and professional tone throughout; only the *mechanics* are borrowed, not the reference site's colors, mascot, or copy voice:

| breachbunny pattern | OranjeStride adaptation |
|---|---|
| Rabbit mascot recurs in different poses/expressions across the page | The logo's 3D avatar (§6) recurs across nav, hero, Programmes, India Tour, and Closing |
| Each insurance product gets a bespoke 3D hero prop (ears, plug, eyeballs) | Each Expertise card (§5.3) and each Consulting item (§5.5) gets a small extruded-facet icon pulled from the mascot's own parts (brain icon for Gen AI, chip icon for ML, arrow icon for Strategy, etc.) instead of generic line icons |
| Full-bleed autoplay video dropped mid-scroll as a break between content blocks | Already structurally present via the 8 section videos — reinforce by keeping Consulting (`consulting-vault.mp4`) and Clients (`clients-monument.mp4`) as full-bleed "breather" moments with minimal text overlay |
| Repeating decorative "crosses" texture in section backgrounds | Repeating diamond-facet texture, see §2 Design System |
| Partner/client logo grid with hover reveal of a one-line description | Clients modal (§5.7): on hover, each logo card reveals a one-line caption (sector + relationship, e.g. "Postgraduate analytics cohort partner") instead of just enlarging |
| Oversized, confident numerals for trust markers | Stats band (§5, interstitial) already uses large orange numerals — keep them large enough to anchor the section, not just supporting text |
| Bold closing support/contact band with trust badges | Add a thin trust-badge row above the Contact form: "Practitioner-Led," "University-Backed Certificate," "1000+ Trained," "4.8/5 Rated" — small icon + label chips in the same visual language as the contact tokens |
| Sticky top promo ribbon (10% discount banner) | Optional: a slim marquee ribbon above the nav for time-bound announcements (e.g. "New cohort enrolling — limited seats"), dismissible, off by default until there's a real campaign to run in it |

---

## 8. Build Order (work in this sequence, don't jump ahead)

1. **Scaffold**: Vite project per the structure in §1, install Three.js/GSAP/Lenis, drop the 8 videos into `public/video/` and `logo02.png` into `public/img/`, generate poster frames (§3.6).
2. **Skeleton**: all 8 sections + 2 interstitials in plain HTML/CSS with real copy from §5, correct order, no video/3D yet — confirms structure and content are right before adding complexity.
3. **Video layer**: wire each section's background video (autoplay-loop first; hero/closing scroll-scrub last, since scrubbing is the most fragile part).
4. **Scroll engine**: Lenis + ScrollTrigger for section transitions, pinning, and text reveals.
5. **WebGL accents**: hero/closing particles, Expertise card glow, Consulting radial grid, India globe — in that order of complexity.
6. **Mascot**: Tier 1 primitive build (§6), placed in nav + hero first, then extend to Programmes/India Tour/Closing once the base rig animates correctly.
7. **Interactive pieces**: clients modal, programme tabs, contact form, DataStride popup.
8. **Polish pass**: cursor, grain, decorative facet texture, trust-badge row, responsive/mobile pass, `prefers-reduced-motion` fallback.

## 9. Acceptance Checklist (self-verify before calling it done)

- [ ] All 8 sections present, in order, with the exact copy from §5 (no placeholder/lorem ipsum left anywhere).
- [ ] Every video autoplays muted+looped without user interaction on both Chrome and Safari (requires `muted` + `playsinline` attributes).
- [ ] Hero and Closing videos visibly scrub with scroll position, not just autoplay.
- [ ] Mascot (§6) renders, idles, and animates in at least nav + hero; no console errors from Three.js.
- [ ] Clients modal opens/closes, tab filter works, hover captions show.
- [ ] Programme tabs switch between Corporate/University content correctly.
- [ ] Contact form fields match §5.8's field list; submit doesn't throw even if Formspree endpoint isn't live in dev.
- [ ] Page is usable (not broken) at 375px mobile width — sections stack, video still plays or falls back to poster.
- [ ] `prefers-reduced-motion: reduce` disables parallax/particle motion and shows static poster frames instead of scrub-driven video.
- [ ] No layout shift/flash of unstyled content on load; preloader covers the initial asset load.
- [ ] `npm run build` completes without errors and `npm run preview` serves a working production build.

## 10. Deliverable

A working Vite project per the structure in §1, componentized by section, with comments marking where GSAP triggers and Three.js scenes are wired in. Include a README covering: (a) `npm install && npm run dev` to preview, (b) how poster frames were generated, (c) how to swap/replace video assets, (d) how to adjust particle density for performance tuning, and (e) how to swap the Tier 1 mascot for a Tier 2 vectorized version or an externally-produced rigged GLB.
