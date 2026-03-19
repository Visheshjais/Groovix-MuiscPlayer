/**
 * ============================================================
 *  GROOVIX — Vite Configuration
 *  File: frontend/vite.config.js
 *
 *  Dev proxy: forwards /api calls to local backend (port 3001)
 *  Production: this file is ignored on Vercel.
 *              frontend uses VITE_API_URL env variable instead.
 * ============================================================
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,

    /* ════════════════════════════════════════════
       DEV PROXY — Local Development Only
       ─────────────────────────────────────────────
       In dev, frontend runs on :5173 and backend on :3001.
       Any request to /api/... gets forwarded to localhost:3001
       so you don't get CORS errors during local development.

       In production (Vercel), this proxy is NOT active.
       The frontend uses VITE_API_URL env variable instead,
       which points directly to the Vercel backend URL.
    ════════════════════════════════════════════ */
    proxy: {
      '/api': {
        target: 'http://localhost:3001', /* Local backend */
        changeOrigin: true,
      },
    },
  },
});
```

---

### ✅ One thing to do after deploying backend on Vercel

In your **frontend Vercel project → Settings → Environment Variables**, add:
```
VITE_API_URL = https://your-backend.vercel.app/api