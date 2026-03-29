/**
 * ============================================================
 *  GROOVIX — Backend Server Entry Point
 *  Author: Vishesh Jaiswal
 *  File:   backend/index.js
 *
 *  Hosted on: Vercel (serverless)
 *
 *  Optimizations:
 *    1. COMPRESSION    — gzip all responses
 *    2. CACHING        — two-layer cache system:
 *                        • In-memory (per instance, per-entry TTL)
 *                        • MongoDB (shared across all instances, 8h TTL)
 *
 *  ── Added for MongoDB update ────────────────────────────────
 *    3. MONGOOSE       — MongoDB Atlas connection via MONGO_URI
 *    4. COOKIE-PARSER  — reads HTTP-only JWT cookie (gvx_token)
 *    5. /api/auth      — register, login, logout, me
 *    6. /api/liked     — get liked songs, toggle liked
 *    7. /api/playlists — full CRUD for playlists + songs
 *
 *  ── CHANGES FROM PREVIOUS VERSION ──────────────────────────
 *
 *  getCache / setCache now support per-entry TTL:
 *    • setCache(key, data)           → uses default 8h TTL
 *    • setCache(key, data, ttlMs)    → uses custom TTL
 *
 *  This lets each route set its own expiry:
 *    trending.js → 8 hours  (MongoDB-backed, rarely stale)
 *    search.js   → 30 mins  (user-driven, changes often)
 *    video.js    → 24 hours (metadata barely ever changes)
 *
 *  Without per-entry TTL, every cache entry expired at the
 *  same 8h interval regardless of how fresh it needed to be.
 * ============================================================
 */

import express      from 'express';
import cors         from 'cors';
import dotenv       from 'dotenv';
import compression  from 'compression';
import cookieParser from 'cookie-parser'; /* reads gvx_token cookie */
import mongoose     from 'mongoose';      /* MongoDB connection */

/* ── Original music route handlers ── */
import searchRouter   from './routes/search.js';
import trendingRouter from './routes/trending.js';
import videoRouter    from './routes/video.js';

/* ── MongoDB-backed auth + user data routes ── */
import authRouter     from './routes/auth.js';
import likedRouter    from './routes/liked.js';
import playlistRouter from './routes/playlists.js';

/* ── Load .env variables (YOUTUBE_API_KEY, MONGO_URI, SECRET_KEY, etc.) ── */
dotenv.config();

const app = express();

/* ── PORT: Vercel injects its own PORT in production,
         falls back to 3001 for local development ── */
const PORT = process.env.PORT || 3001;


/* ════════════════════════════════════════════
   MONGODB CONNECTION
   ─────────────────────────────────────────────
   Connects to MongoDB Atlas using MONGO_URI from .env.
   Uses an isConnected flag so Vercel serverless instances
   reuse the existing connection instead of opening a new
   one on every request (connection pooling).

   Wrapped in an if-check so the server still starts even
   if MONGO_URI is missing — music features still work,
   only auth/liked/playlists/shared-cache will be unavailable.
════════════════════════════════════════════ */
let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  if (!process.env.MONGO_URI) {
    console.warn('⚠️  MONGO_URI not set — auth, liked, playlists and shared cache unavailable');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS:          45000,
      connectTimeoutMS:         30000,
    });
    isConnected = true;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB error:', err.message);
  }
}

/* ── Run connectDB before every request ──
   Safe to call repeatedly — the isConnected guard makes it a no-op
   once the connection is established. */
app.use(async (req, res, next) => {
  await connectDB();
  next();
});


/* ════════════════════════════════════════════
   COMPRESSION
   ─────────────────────────────────────────────
   Compresses all API responses with gzip.
   Reduces payload size — especially helpful for
   the trending route which returns 8×14 song objects.
════════════════════════════════════════════ */
app.use(compression());

/* ── Parse incoming JSON request bodies ── */
app.use(express.json());

/* ── Parse URL-encoded form data ── */
app.use(express.urlencoded({ extended: true }));


/* ════════════════════════════════════════════
   COOKIE PARSER
   ─────────────────────────────────────────────
   Parses the Cookie header and populates req.cookies.
   Required so auth/liked/playlist routes can read
   the 'gvx_token' JWT cookie sent by the browser.
════════════════════════════════════════════ */
app.use(cookieParser());


/* ════════════════════════════════════════════
   CORS — Cross Origin Resource Sharing
   ─────────────────────────────────────────────
   Allowed origins:
     - localhost:5173  → Vite dev server
     - localhost:4173  → Vite preview server
     - *.vercel.app    → All Vercel deployments (prod + previews)
     - *.netlify.app   → Netlify (legacy support)

   credentials: true is required because the browser
   needs to send the gvx_token cookie cross-origin for
   auth routes to work.
════════════════════════════════════════════ */
const ALLOWED_ORIGINS = [
  'http://localhost:5173', /* Vite dev */
  'http://localhost:4173', /* Vite preview */
];

app.use(cors({
  origin: (origin, callback) => {
    /* Allow server-to-server requests (no Origin header) */
    if (!origin) return callback(null, true);

    /* Allow exact localhost matches */
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);

    /* Allow all Vercel deployments */
    if (origin.endsWith('.vercel.app')) return callback(null, true);

    /* Allow Netlify deployments */
    if (origin.endsWith('.netlify.app')) return callback(null, true);

    /* Block everything else */
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true, /* required for cookie-based auth cross-origin */
}));


/* ════════════════════════════════════════════
   IN-MEMORY CACHE  (Layer 1 of 2)
   ─────────────────────────────────────────────
   A simple Map-based cache local to each Vercel
   serverless instance. Fast (no network hop) but
   not shared — each cold start begins empty.

   Layer 2 (MongoDB) in trending.js fills this cache
   on every cold start so the in-memory layer warms up
   from MongoDB instead of hitting YouTube.

   ── Per-entry TTL (NEW) ────────────────────────
   The original used a single global CACHE_TTL for
   every entry. This caused problems when routes
   needed different expiry times:
     trending → 8 hours  (data is fresh enough for hours)
     search   → 30 mins  (users expect newer results sooner)
     video    → 24 hours (title/duration never change)

   Now each entry stores its own ttl value alongside
   timestamp and data. setCache accepts an optional
   third argument — if omitted, falls back to DEFAULT_TTL.

   ── Vercel note ───────────────────────────────
   Each serverless function instance has its own memory.
   Cache is NOT shared between instances. That's why
   trending.js also writes to MongoDB (shared Layer 2).
   Search and video use in-memory only — those are
   per-user queries that don't benefit from global sharing.
════════════════════════════════════════════ */
const cache       = new Map();
const DEFAULT_TTL = 8 * 60 * 60 * 1000; /* 8 hours — fallback when no TTL is passed */


/* ── getCache(key) ──────────────────────────────────────────
   Returns the cached data for the given key, or null if:
     • Key doesn't exist in the Map
     • Entry has exceeded its own TTL

   On expiry: the stale entry is deleted so memory doesn't
   grow indefinitely across long-lived instances.
────────────────────────────────────────────────────────── */
export function getCache(key) {
  const item = cache.get(key);

  /* Key not found */
  if (!item) return null;

  /* Use the per-entry TTL if set, otherwise fall back to DEFAULT_TTL */
  const ttl = item.ttl ?? DEFAULT_TTL;

  /* Entry has expired — remove it and signal a cache miss */
  if (Date.now() - item.timestamp > ttl) {
    cache.delete(key);
    return null;
  }

  return item.data;
}


/* ── setCache(key, data, ttlMs?) ────────────────────────────
   Stores data in the cache with the current timestamp.

   ttlMs is optional:
     setCache('trending:all', out)                  → 8h default
     setCache('search:hindi:20', results, 30*60000) → 30 minutes
     setCache('video:dQw4w9WgXcQ', info, 24*60*60000) → 24 hours
────────────────────────────────────────────────────────── */
export function setCache(key, data, ttlMs) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs ?? DEFAULT_TTL, /* store the TTL so getCache can use it */
  });
}


/* ════════════════════════════════════════════
   ROUTES
   ─────────────────────────────────────────────
   Music routes (YouTube-backed):
     /api/search   → YouTube search results
     /api/trending → 8 music category carousels
     /api/video    → Single video details by ID

   User routes (MongoDB-backed):
     /api/auth      → register, login, logout, me
     /api/liked     → get liked songs, toggle liked
     /api/playlists → full CRUD for playlists + songs
════════════════════════════════════════════ */

/* ── Music routes ── */
app.use('/api/search',   searchRouter);
app.use('/api/trending', trendingRouter);
app.use('/api/video',    videoRouter);

/* ── Auth + user data routes ── */
app.use('/api/auth',      authRouter);
app.use('/api/liked',     likedRouter);
app.use('/api/playlists', playlistRouter);

/* ── Health check — used to verify server is alive ── */
app.get('/api/health', (_, res) => res.json({ ok: true }));


/* ── Cache status — inspect everything currently in memory ──
   Useful for debugging quota issues.
   Hit /api/cache-status to see what's cached, how old it is,
   and how long until each entry expires.
   Shows the per-entry TTL so you can confirm each route's
   custom expiry is working correctly. */
app.get('/api/cache-status', (_, res) => {
  const status = {};

  cache.forEach((val, key) => {
    const ageMs     = Date.now() - val.timestamp;
    const ageS      = Math.floor(ageMs / 1000);
    const ttl       = val.ttl ?? DEFAULT_TTL;
    const expiresIn = Math.max(0, Math.floor((ttl - ageMs) / 1000));
    const ttlLabel  = ttl === DEFAULT_TTL ? '8h default' : `${Math.round(ttl / 60000)}min custom`;

    status[key] = `cached ${ageS}s ago — expires in ${expiresIn}s (TTL: ${ttlLabel})`;
  });

  res.json({ cached_keys: cache.size, items: status });
});


/* ── API Key Diagnostic — test if the primary YouTube key is valid ──
   Hit /api/test-key to quickly check if YOUTUBE_API_KEY is working.
   Returns quota status, key validity, and a sample result title. */
app.get('/api/test-key', async (req, res) => {
  try {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) return res.json({ ok: false, problem: 'No API key found in environment' });

    const url  = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=music&maxResults=1&type=video&key=${key}`;
    const r    = await fetch(url);
    const data = await r.json();

    /* YouTube returns an error object if the key is bad or quota is hit */
    if (data.error) return res.json({
      ok:     false,
      code:   data.error.code,
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
   app.listen() is only called during local dev.
════════════════════════════════════════════ */
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🎵 Groovix Backend → http://localhost:${PORT}`));
}

/* ── Export app for Vercel serverless runtime ── */
export default app;