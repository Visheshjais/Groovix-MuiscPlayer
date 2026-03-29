/**
 * ============================================================
 *  GROOVIX — Trending Route
 *  Author: Vishesh Jaiswal
 *  File:   backend/routes/trending.js
 *
 *  GET /api/trending
 *
 *  Fetches 8 music categories in parallel using Promise.all.
 *
 *  ── CACHING (TWO LAYERS) ──────────────────────────────────
 *
 *  Layer 1 — In-memory (per Vercel instance, from index.js):
 *    Fast but lost on every cold start. Warms up from
 *    MongoDB so repeat requests within the same instance
 *    never touch the DB or YouTube.
 *
 *  Layer 2 — MongoDB (shared across ALL Vercel instances):
 *    Persists for 8 hours. Survives cold starts and scales
 *    across every serverless instance. This is the fix for
 *    burning through API keys — only ONE real YouTube fetch
 *    happens every 8 hours no matter how many instances spin up.
 *
 *  Flow:
 *    Request → check memory → check MongoDB → fetch YouTube
 *    → write MongoDB (8h) → write memory → respond
 *
 *  Quota cost:
 *    Before fix: 800 units × N cold starts per day
 *    After fix:  800 units × 1 per 8 hours (3 fetches/day max)
 *
 *  ── API KEY ROTATION ──────────────────────────────────────
 *  Multiple YouTube API keys are stored in .env as:
 *    YOUTUBE_API_KEY_1, YOUTUBE_API_KEY_2, ... YOUTUBE_API_KEY_50
 *
 *  If one key hits quota (403) or is invalid (400/401),
 *  the rotator automatically tries the next key.
 * ============================================================
 */

import express               from 'express';
import { getCache, setCache } from '../index.js';
import ApiCache              from '../models/ApiCache.js'; /* ← NEW: shared MongoDB cache model */

const router = express.Router();

/* ── 8 music categories to fetch ── */
const CATEGORIES = [
  { id: 'trending',   query: 'trending music 2025'            },
  { id: 'hiphop',     query: 'hip hop hits 2025'              },
  { id: 'pop',        query: 'top pop songs 2025'             },
  { id: 'indie',      query: 'indie music 2025'               },
  { id: 'electronic', query: 'electronic music 2025'          },
  { id: 'rnb',        query: 'r&b soul music 2025'            },
  { id: 'punjabi',    query: 'new punjabi songs 2025'         },
  { id: 'hindi',      query: 'new hindi bollywood songs 2025' },
];

/* ── Shared cache key used in both memory and MongoDB ── */
const CACHE_KEY = 'trending:all';

/* ── How long to keep trending data in MongoDB ── */
const MONGO_TTL_MS = 8 * 60 * 60 * 1000; /* 8 hours in milliseconds */


/* ════════════════════════════════════════════
   getMongoCache(key)
   ─────────────────────────────────────────────
   Reads trending data from MongoDB.
   Returns the cached data object, or null if:
     • No document found for this key
     • Document exists but expiresAt has passed
   Errors are swallowed — if MongoDB is down,
   we just fall through to fetch from YouTube.
════════════════════════════════════════════ */
async function getMongoCache(key) {
  try {
    const doc = await ApiCache.findOne({ key });

    /* No cached document found */
    if (!doc) return null;

    /* Document found but TTL has expired — clean it up and treat as miss */
    if (doc.expiresAt < new Date()) {
      await ApiCache.deleteOne({ key });
      return null;
    }

    /* Fresh cache hit — return the stored data */
    return doc.data;

  } catch (err) {
    /* MongoDB unavailable — fail silently and fall through to YouTube */
    console.warn('[MongoDB Cache] Read failed:', err.message);
    return null;
  }
}


/* ════════════════════════════════════════════
   setMongoCache(key, data, ttlMs)
   ─────────────────────────────────────────────
   Writes trending data into MongoDB with a TTL.
   Uses upsert so it works whether the document
   exists already or not.
   Errors are swallowed — a failed write just
   means the next request will re-fetch YouTube,
   which is acceptable.
════════════════════════════════════════════ */
async function setMongoCache(key, data, ttlMs) {
  try {
    await ApiCache.findOneAndUpdate(
      { key },
      { data, expiresAt: new Date(Date.now() + ttlMs) },
      { upsert: true }
    );
  } catch (err) {
    /* MongoDB unavailable — fail silently */
    console.warn('[MongoDB Cache] Write failed:', err.message);
  }
}


/* ════════════════════════════════════════════
   getKeys()
   ─────────────────────────────────────────────
   Reads all API keys from environment variables.
   Supports YOUTUBE_API_KEY, YOUTUBE_API_KEY_1
   through YOUTUBE_API_KEY_50.
   Returns array of valid (non-empty) keys.
════════════════════════════════════════════ */
function getKeys() {
  const keys = [];

  /* Check the default key name first */
  if (process.env.YOUTUBE_API_KEY) keys.push(process.env.YOUTUBE_API_KEY);

  /* Check numbered keys: YOUTUBE_API_KEY_1 through YOUTUBE_API_KEY_50 */
  for (let i = 1; i <= 50; i++) {
    const k = process.env[`YOUTUBE_API_KEY_${i}`];
    if (k && k !== 'YOUR_KEY_HERE' && !keys.includes(k)) keys.push(k);
  }

  return keys;
}


/* ════════════════════════════════════════════
   fetchWithRotation(query)
   ─────────────────────────────────────────────
   Tries each API key in order.
   If a key returns quota exceeded (403) or
   invalid (400/401), it moves to the next key.
   Throws only if ALL keys are exhausted.
════════════════════════════════════════════ */
async function fetchWithRotation(query) {
  const keys = getKeys();

  if (keys.length === 0) {
    throw new Error('No API keys configured in .env');
  }

  let lastError = null;

  /* Try each key one by one until one works */
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/search');
      url.searchParams.set('part',            'snippet');
      url.searchParams.set('q',               query);
      url.searchParams.set('type',            'video');
      url.searchParams.set('videoCategoryId', '10');  /* Music category only */
      url.searchParams.set('maxResults',      '14');
      url.searchParams.set('key',             key);

      const r    = await fetch(url.toString());
      const data = await r.json();

      /* If YouTube returned an error, decide whether to try the next key */
      if (data.error) {
        const code   = data.error.code;
        const reason = data.error.errors?.[0]?.reason || '';

        /* 403 = quota exceeded, 400/401 = bad/invalid key — try next key */
        if (code === 403 || code === 400 || code === 401) {
          console.warn(`[Key ${i + 1}/${keys.length}] ${reason} — trying next key...`);
          lastError = `Key ${i + 1}: ${reason}`;
          continue; /* move to next key */
        }

        /* Other YouTube errors (e.g. bad parameters) — throw immediately */
        throw new Error(`YouTube API: ${data.error.message} (${code})`);
      }

      /* ── Success ── */
      if (i > 0) console.log(`[Key Rotation] Key ${i + 1} worked for query: ${query}`);

      /* Clean HTML entities in titles (YouTube sends &amp; etc.) */
      const clean = s => s
        .replace(/&amp;/g,  '&')
        .replace(/&#39;/g,  "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g,   '<')
        .replace(/&gt;/g,   '>');

      /* Return clean song objects */
      return (data.items || []).map(item => ({
        videoId:     item.id.videoId,
        title:       clean(item.snippet.title),
        channel:     item.snippet.channelTitle,
        thumbnail:   item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
        publishedAt: item.snippet.publishedAt,
      }));

    } catch (err) {
      /* Network error or re-thrown error — store and try next key */
      lastError = err.message;
      if (!err.message.includes('Key')) throw err; /* re-throw non-key-rotation errors */
    }
  }

  /* Every key failed */
  throw new Error(`All ${keys.length} API keys are quota-exceeded or invalid. Last error: ${lastError}`);
}


/* ════════════════════════════════════════════
   ROUTE HANDLER
   GET /api/trending
   ─────────────────────────────────────────────
   Two-layer cache check before hitting YouTube.
   On a cache hit (either layer): ~0 quota units.
   On a real fetch: ~800 quota units.
   With 8h MongoDB TTL: max 3 real fetches/day.
════════════════════════════════════════════ */
router.get('/', async (req, res) => {
  try {

    /* ── Layer 1: In-memory cache (fastest, per-instance) ──
       If this specific Vercel instance has fetched recently,
       serve it instantly without touching MongoDB or YouTube. */
    const inMem = getCache(CACHE_KEY);
    if (inMem) {
      console.log('[Trending] Serving from memory cache ⚡');
      return res.json(inMem);
    }

    /* ── Layer 2: MongoDB cache (shared across ALL instances) ──
       This is the key fix. Even if memory is cold (new instance,
       cold start, restart), we check MongoDB first.
       If another instance already fetched and saved to MongoDB,
       we serve it from there — no YouTube API call needed. */
    console.log('[Trending] Memory miss — checking MongoDB cache...');
    const mongoCached = await getMongoCache(CACHE_KEY);

    if (mongoCached) {
      console.log('[Trending] Serving from MongoDB cache ⚡');

      /* Also warm the in-memory cache so this instance doesn't
         hit MongoDB again on the next request within 8 hours. */
      setCache(CACHE_KEY, mongoCached);

      return res.json(mongoCached);
    }

    /* ── Layer 3: Fetch from YouTube (costs ~800 quota units) ──
       Only reaches here if BOTH caches are cold.
       Thanks to MongoDB TTL of 8h, this happens at most
       3 times per day regardless of how many instances run. */
    console.log('[Trending] MongoDB miss — fetching fresh from YouTube API...');

    /* Fire all 8 category requests in parallel for speed */
    const results = await Promise.all(
      CATEGORIES.map(async cat => ({
        id:    cat.id,
        items: await fetchWithRotation(cat.query),
      }))
    );

    /* Build response: { trending: [...], hiphop: [...], ... } */
    const out = {};
    results.forEach(r => { out[r.id] = r.items; });

    /* ── Save to both caches ──
       MongoDB: shared, persists 8 hours across all instances.
       Memory:  fast, local to this instance only. */
    setCache(CACHE_KEY, out);
    await setMongoCache(CACHE_KEY, out, MONGO_TTL_MS);

    console.log('[Trending] Fetched fresh from YouTube and saved to MongoDB + memory ✅');

    res.json(out);

  } catch (err) {
    console.error('[Trending Error]', err.message);
    res.status(500).json({
      error: err.message,
      hint:  'All API keys may be quota-exceeded. Add more keys to .env as YOUTUBE_API_KEY_2, YOUTUBE_API_KEY_3 etc.',
    });
  }
});

export default router;