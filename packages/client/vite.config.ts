import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { layoutSavePlugin } from './editorSave.ts';

const GAME_SERVER_URL = process.env.GAME_SERVER_URL ?? 'http://localhost:7420';

const LAYOUTS = fileURLToPath(new URL('../shared/src/content/districts/layouts', import.meta.url));

export default defineConfig({
  plugins: [layoutSavePlugin(LAYOUTS)],
  server: {
    port: 5173,
    proxy: {
      '/ws': { target: GAME_SERVER_URL, ws: true },
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
});
