/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The demo talks directly to the PingIt server (open CORS), so no proxy is
// needed. Override the target with VITE_PINGIT_ENDPOINT / VITE_PINGIT_APP_ID.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
