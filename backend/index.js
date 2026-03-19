/**
 * ============================================================
 *  GROOVIX — Backend Server Entry Point
 *  Author: Vishesh Jaiswal
 *  File:   backend/index.js
 *
 *  Hosted on: Vercel (serverless)
 *  Optimizations:
 *    1. COMPRESSION  — gzip all responses
 *    2. CACHING      — trending results cached 10 mins (per instance)
 * ============================================================
 */

import express     from 'express';
import cors        from 'cors';
import dotenv      from 'dotenv';
import compression from 'compression';

/* ── Route handlers ── */
import searchRouter   from './routes/search.js';
import trendingRouter from './routes/trending.js';
import videoRouter    from './routes/video.js';

/* ── Load .env variables (YOUTUBE_API_KEY, PORT, etc.) ── */
dotenv.config();

const app  = express();

/* ── PORT: Vercel injects its own PORT in production,
         falls back to 3001 for local development ── */
const PORT = process.env.PORT || 3001;

/* ════════════════════════════════════════════
   COMPRESSION
   ─────────────────────────────────────────────
   Compresses all API responses using gzip.
   Reduces payload size, speeds up responses.
════════════════════════════════════════════ */
app.use(compression());

/* ════════════════════════════════════════════
   CORS — Cross Origin Resource Sharing
   ─────────────────────────────────────────────
   Controls which frontend URLs can talk to this backend.

   Allowed:
     - localhost:5173  → Vite dev server
     - localhost:4173  → Vite preview server
     - *.vercel.app    → All Vercel deployments (prod + previews)

   Blocked:
     - Everything else (old Netlify URLs, unknown origins)
════════════════════════════════════════════ */
const ALLOWED_ORIGINS = [
  'http://localhost:5173', /* Vite dev */
  'http://localhost:4173', /* Vite preview */
];

app.use(cors({
  origin: (origin, callback) => {
    /* Allow server-to-server requests with no origin header */
    if (!origin) return callback(null, true);

    /* Allow exact matches (localhost) */
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);

    /* Allow all Vercel deployments — covers prod URL + preview URLs */
    if (origin.endsWith('.vercel.app')) return callback(null, true);

    /* Block everything else */
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));

/* ── Parse incoming JSON request bodies ── */
app.use(express.json());

/* ════════════════════════════════════════════
   IN-MEMORY CACHE
   ─────────────────────────────────────────────
   Stores trending API results for 10 minutes.
   Avoids hitting YouTube API quota on every request.

   ⚠️ Vercel Note: Each serverless function instance
   has its own memory. Cache is not shared globally,
   but still helps reduce quota usage per instance.

   For shared cache across instances → use Upstash Redis.
════════════════════════════════════════════ */
const cache     = new Map();
const CACHE_TTL = 10 * 60 * 1000; /* 10 minutes in milliseconds */

/* Returns cached data if it exists and hasn't expired, else null */
export function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  /* Expired — delete and return null so fresh data is fetched */
  if (Date.now() - item.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

/* Stores data in cache with current timestamp */
export function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

/* ════════════════════════════════════════════
   ROUTES
   ─────────────────────────────────────────────
   /api/search   → YouTube search results
   /api/trending → 8 music category carousels
   /api/video    → Single video details by ID
════════════════════════════════════════════ */
app.use('/api/search',   searchRouter);
app.use('/api/trending', trendingRouter);
app.use('/api/video',    videoRouter);

/* ── Health check — used to verify server is alive ── */
app.get('/api/health', (_, res) => res.json({ ok: true }));

/* ── Cache status — inspect what's currently cached ── */
app.get('/api/cache-status', (_, res) => {
  const status = {};
  cache.forEach((val, key) => {
    const age = Math.floor((Date.now() - val.timestamp) / 1000);
    status[key] = `cached ${age}s ago (expires in ${600 - age}s)`;
  });
  res.json({ cached_keys: cache.size, items: status });
});

/* ── API Key Diagnostic — test if YouTube API key is valid ── */
app.get('/api/test-key', async (req, res) => {
  try {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) return res.json({ ok: false, problem: 'No API key found in environment' });

    const url  = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=music&maxResults=1&type=video&key=${key}`;
    const r    = await fetch(url);
    const data = await r.json();

    /* YouTube returns an error object if the key is bad or quota is hit */
    if (data.error) return res.json({
      ok: false,
      code: data.error.code,
      reason: data.error.errors?.[0]?.reason,
    });

    res.json({ ok: true, message: 'API key works!', sample: data.items?.[0]?.snippet?.title });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

/* ════════════════════════════════════════════
   SERVER START — Local Dev Only
   ─────────────────────────────────────────────
   On Vercel, the app is exported as a serverless
   function — Vercel handles listening internally.
   app.listen() is only called during local development.
════════════════════════════════════════════ */
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🎵 Groovix Backend → http://localhost:${PORT}`));
}

/* ── Export app for Vercel serverless runtime ── */
export default app;