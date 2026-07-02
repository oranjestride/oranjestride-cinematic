// ============================================================================
// generate-posters.mjs — one-time asset-prep step (not run at runtime) (§3.6).
// Extracts a poster frame for each video in public/video/ into
// public/img/posters/<name>.jpg for lazy-load + prefers-reduced-motion fallback.
//
// Requires ffmpeg on PATH:  brew install ffmpeg   (or)   apt install ffmpeg
// Run with:  npm run posters
// ============================================================================
import { readdirSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, basename, extname } from 'node:path';

const VIDEO_DIR = 'public/video';
const POSTER_DIR = 'public/img/posters';

if (!existsSync(POSTER_DIR)) mkdirSync(POSTER_DIR, { recursive: true });

const videos = readdirSync(VIDEO_DIR).filter((f) => f.toLowerCase().endsWith('.mp4'));
if (!videos.length) { console.error('No .mp4 files found in', VIDEO_DIR); process.exit(1); }

for (const file of videos) {
  const name = basename(file, extname(file));
  const out = join(POSTER_DIR, `${name}.jpg`);
  try {
    execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-ss', '0.15', '-i', join(VIDEO_DIR, file),
      '-frames:v', '1',
      // slight cinematic dark grade + cap width at 1280 for weight
      '-vf', "eq=brightness=-0.06:saturation=1.05,scale='min(1280,iw)':-2",
      out,
    ], { stdio: 'inherit' });
    console.log('✓', out);
  } catch (err) {
    console.error('✗ failed for', file, '- is ffmpeg installed?');
    process.exitCode = 1;
  }
}
