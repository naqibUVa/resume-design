import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

import documentStore from './vite-plugins/documentStore.js';

/**
 * Vite configuration.
 *
 * `base: './'` makes the production build portable: the `dist/` folder can be
 * opened from a file:// path, dropped on any static host, or published to a
 * GitHub Pages project subpath without rewriting asset URLs.
 *
 * `documentStore` adds two routes to the dev and preview servers so the app
 * can keep its document in `data/resume.json` instead of only in the browser.
 * It contributes nothing to the build; `dist/` is unchanged by its presence.
 */
export default defineConfig({
  base: './',
  plugins: [react(), documentStore()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5180,
    // The suite launcher sets NO_BROWSER because it opens the dashboard itself.
    // Without this, starting all six apps would fling six extra tabs open.
    open: !process.env.NO_BROWSER,
  },
  preview: {
    // Vite defaults `preview.open` to `server.open`, which would give the
    // built-mode path in start.sh two tabs — the script opens one itself.
    open: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
