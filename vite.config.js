import { defineConfig } from 'vite';

// Single-page cinematic site. Nothing exotic — default Vite root, public/ for
// the 8 videos + logo + poster frames. base:'./' keeps the production build
// portable (works from any sub-path / static host).
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0, // keep posters/videos as real files, never inline
  },
});
