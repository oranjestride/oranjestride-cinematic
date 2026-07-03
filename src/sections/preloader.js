// Preloader — orange particles converge into the diamond emblem, ignite, wipe (§3.1).
import { wordmark, mascotMarkup } from '../utils/helpers.js';

export function renderPreloader() {
  return `
  <div id="preloader">
    <div class="pre-inner">
      <canvas id="pre-canvas" width="520" height="520"></canvas>
      ${mascotMarkup('idle', 'pre')}
      <div class="pre-word">${wordmark()}</div>
      <div class="pre-bar"><i id="pre-fill"></i></div>
    </div>
  </div>`;
}

export function initPreloader({ reduced, onDone }) {
  const pre = document.getElementById('preloader');
  const fill = document.getElementById('pre-fill');
  const cv = document.getElementById('pre-canvas');
  document.body.classList.add('locked');

  if (!reduced && cv) runEmblem(cv);

  // progress bar
  let p = 0;
  const iv = setInterval(() => {
    p = Math.min(100, p + Math.random() * 14 + 6);
    if (fill) fill.style.width = p + '%';
    if (p >= 100) clearInterval(iv);
  }, 130);

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    setTimeout(() => {
      pre.classList.add('done');
      document.body.classList.remove('locked');
      onDone?.();
    }, reduced ? 200 : 1700);
  };
  addEventListener('load', finish);
  setTimeout(finish, 3500); // safety cap on slow metadata
}

function runEmblem(cv) {
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
  const outline = [[0, -120], [70, 0], [0, 120], [-70, 0]];
  const targets = [];
  for (let e = 0; e < 4; e++) {
    const a = outline[e], b = outline[(e + 1) % 4];
    for (let i = 0; i < 30; i++) {
      const t = i / 30;
      targets.push([cx + a[0] + (b[0] - a[0]) * t, cy + a[1] + (b[1] - a[1]) * t]);
    }
  }
  const parts = targets.map((t) => ({
    x: cx + (Math.random() - 0.5) * W, y: cy + (Math.random() - 0.5) * H, tx: t[0], ty: t[1],
  }));
  const start = performance.now();
  (function draw(now) {
    const el = (now - start) / 1000;
    const conv = Math.min(1, el / 1.4);
    const ignite = Math.max(0, (el - 1.4) / 0.8);
    ctx.clearRect(0, 0, W, H);
    parts.forEach((p) => {
      p.x += (p.tx - p.x) * 0.06;
      p.y += (p.ty - p.y) * 0.06;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6 + ignite * 1.5, 0, 7);
      ctx.fillStyle = `rgba(255,${(106 + ignite * 80) | 0},0,${0.5 + conv * 0.5})`;
      ctx.shadowBlur = 8 + ignite * 24;
      ctx.shadowColor = '#ff6a00';
      ctx.fill();
    });
    if (ignite > 0) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 120); ctx.lineTo(cx + 70, cy);
      ctx.lineTo(cx, cy + 120); ctx.lineTo(cx - 70, cy); ctx.closePath();
      ctx.strokeStyle = `rgba(255,140,40,${Math.min(1, ignite)})`;
      ctx.lineWidth = 2; ctx.shadowBlur = 30; ctx.stroke();
    }
    if (el < 2.6) requestAnimationFrame(draw);
  })(start);
}
