/**
 * ============================================================
 *  GROOVIX — Backend Server Entry Point
 *  Author: Vishesh Jaiswal
 *  File:   backend/index.js
 *
 *  Node.js + Express REST API server.
 *  Proxies YouTube Data API v3 so the API key stays server-side.
 *
 *  Routes:
 *    GET /api/health      — health check
 *    GET /api/test-key    — diagnose YouTube API key issues
 *    GET /api/trending    — 8 music categories
 *    GET /api/search?q=   — YouTube search
 *    GET /api/video/:id   — single video details
 *
 *  CORS:
 *    Allows requests from localhost (dev) and Netlify (production).
 * ============================================================
 */

import express from 'express';
import cors    from 'cors';
import dotenv  from 'dotenv';
import { createServer } from 'net';

import searchRouter   from './routes/search.js';
import trendingRouter from './routes/trending.js';
import videoRouter    from './routes/video.js';

dotenv.config();

/* ── Auto port detection ──
   Tries the desired port, increments if busy */
function getFreePort(start) {
  return new Promise(resolve => {
    const s = createServer();
    s.listen(start, '0.0.0.0', () => { s.close(() => resolve(start)); });
    s.on('error', () => resolve(getFreePort(start + 1)));
  });
}

const app     = express();
const DESIRED = Number(process.env.PORT) || 3001;
const PORT    = await getFreePort(DESIRED);

/* ── CORS — allow both local dev and Netlify production ── */
const ALLOWED_ORIGINS = [
  'http://localhost:5173',               /* Vite dev server */
  'http://localhost:4173',               /* Vite preview */
  'https://groovix-musicpalyer.netlify.app', /* Netlify production */
];

app.use(cors({
  origin: (origin, callback) => {
    /* Allow requests with no origin (mobile apps, curl, Postman) */
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    /* Also allow any netlify.app subdomain */
    if (origin.endsWith('.netlify.app')) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods:     ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));

app.use(express.json());

/* ── Routes ── */
app.use('/api/search',   searchRouter);
app.use('/api/trending', trendingRouter);
app.use('/api/video',    videoRouter);

/* ── Health check ── */
app.get('/api/health', (_, res) => res.json({ ok: true, port: PORT }));

/* ── API Key Diagnostic ──
   Visit /api/test-key to see if the YouTube key is working */
app.get('/api/test-key', async (req, res) => {
  try {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key || key === 'YOUR_KEY_HERE') {
      return res.json({ ok: false, problem: 'No API key found in backend/.env' });
    }
    const url  = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=music&maxResults=1&type=video&key=${key}`;
    const r    = await fetch(url);
    const data = await r.json();

    if (data.error) {
      const code = data.error.code;
      const msg  = data.error.errors?.[0]?.reason || data.error.message;
      return res.json({
        ok:      false,
        code,
        reason:  msg,
        problem: code === 403
          ? 'Quota exceeded or key restricted.'
          : 'Invalid or expired API key.',
        fix: 'Go to https://console.cloud.google.com → create a new key with YouTube Data API v3 enabled.',
      });
    }
    res.json({ ok: true, message: '✅ API key works!', sample: data.items?.[0]?.snippet?.title });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

/* ── Start server ── */
app.listen(PORT, () => {
  console.log(`\n🎵 Groovix Backend → http://localhost:${PORT}`);
  console.log(`   Diagnose API key: http://localhost:${PORT}/api/test-key`);
  if (PORT !== DESIRED) {
    console.log(`\n⚠️  Port ${DESIRED} was busy — now using: ${PORT}`);
    console.log(`   → Update frontend/vite.config.js proxy target to: http://localhost:${PORT}`);
  }
});
