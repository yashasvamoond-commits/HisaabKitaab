import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  // The app is served behind HTTPS preview/proxy hosts as well as localhost.
  server: { host: true, allowedHosts: true },
  preview: { host: true, allowedHosts: true },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
});
