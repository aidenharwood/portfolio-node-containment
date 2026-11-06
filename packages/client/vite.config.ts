import { defineConfig } from 'vite';

const GAME_SERVER_URL = process.env.GAME_SERVER_URL ?? 'http://localhost:7420';

export default defineConfig({
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
