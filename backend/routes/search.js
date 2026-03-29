/**
 * ============================================================
 *  GROOVIX — Search Route
 *  Author: Vishesh Jaiswal
 *  File:   backend/routes/search.js
 *
 *  GET /api/search?q=query&maxResults=20
 *
 *  Searches YouTube for the given query.
 *  Uses the same key rotation system as trending.js —
 *  if one key is quota-exceeded, automatically tries the next.
 *
 *  ── CHANGES FROM ORIGINAL ─────────────────────────────────
 *
 *  1. IN-MEMORY CACHING (new):
 *     Each unique search query is cached for 30 minutes.
 *     If a user searches "trending hindi songs" and another
 *     user on the same Vercel instance does the same search
 *     within 30 mins, it's served from cache — 0 quota units.
 *
 *     Cache key format: "search:<query>:<maxResults>"
 *     TTL: 30 minutes (configurable via SEARCH_CACHE_TTL_MS)
 *
 *     ⚠️  Note: This is in-memory only (not MongoDB), because
 *     search results are user-driven and highly varied — storing
 *     every possible query string in MongoDB would grow unbounded.
 *     Trending data is worth persisting; search results are not.
 *
 *  ── QUOTA COST ────────────────────────────────────────────
 *    search.list costs ~100 units per call.
 *    After caching: 100 units on first search, 0 on repeats
 *    within the same instance for 30 minutes.
 *
 *  ── KEY ROTATION (unchanged from original) ────────────────
 *    Automatically tries YOUTUBE_API_KEY_1 through _50 if the
 *    current key is quota-exceeded or invalid.
 * ============================================================
 */

import express               from 'express';
import { getCache, setCache } from '../index.js'; /* ← NEW: in-memory cache helpers */

const router = express.Router();

/* ── How long to cache search results ── */
const SEARCH_CACHE_TTL_MS = 30 * 60 * 1000; /* 30 minutes */


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

  /* Check the base key first */
  if (process.env.YOUTUBE_API_KEY) keys.push(process.env.YOUTUBE_API_KEY);

  /* Check numbered keys: YOUTUBE_API_KEY_1 through YOUTUBE_API_KEY_50 */
  for (let i = 1; i <= 50; i++) {
    const k = process.env[`YOUTUBE_API_KEY_${i}`];
    if (k && k !== 'YOUR_KEY_HERE' && !keys.includes(k)) keys.push(k);
  }

  return keys;
}


/* ════════════════════════════════════════════
   ROUTE HANDLER
   GET /api/search?q=query&maxResults=20
   ─────────────────────────────────────────────
   1. Builds a cache key from the query + maxResults.
   2. Checks in-memory cache first (0 quota units).
   3. If miss, tries each API key in turn.
   4. On success, caches the result for 30 minutes.
════════════════════════════════════════════ */
router.get('/', async (req, res) => {
  const q          = req.query.q || 'music';
  const maxResults = req.query.maxResults || 20;

  /* ── Cache key encodes both query and result count ──
     "search:punjabi songs:20" and "search:punjabi songs:5"
     are treated as different cached entries. */
  const CACHE_KEY = `search:${q}:${maxResults}`;

  /* ── Check in-memory cache first ──
     If the exact same query was made recently on this instance,
     return it instantly at 0 quota cost. */
  const cached = getCache(CACHE_KEY);
  if (cached) {
    console.log(`[Search] Cache hit for "${q}" ⚡`);
    return res.json(cached);
  }

  /* ── Cache miss — try each API key in order ── */
  const keys    = getKeys();
  let lastError = null;

  /* Try each key until one works */
  for (let i = 0; i < keys.length; i++) {
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/search');
      url.searchParams.set('part',       'snippet');
      url.searchParams.set('q',          q);
      url.searchParams.set('type',       'video');
      url.searchParams.set('maxResults', maxResults);
      url.searchParams.set('key',        keys[i]);

      const r    = await fetch(url.toString());
      const data = await r.json();

      /* If YouTube returned an error, decide whether to try next key */
      if (data.error) {
        const code   = data.error.code;
        const reason = data.error.errors?.[0]?.reason || '';

        /* 403 = quota exceeded, 400/401 = bad/invalid key — try next */
        if (code === 403 || code === 400 || code === 401) {
          console.warn(`[Search Key ${i + 1}/${keys.length}] ${reason} — trying next key...`);
          lastError = data.error.message;
          continue;
        }

        /* Other YouTube errors — fail immediately */
        throw new Error(data.error.message);
      }

      /* ── Success — clean and shape the results ── */

      /* Clean HTML entities (YouTube sends &amp; &#39; etc.) */
      const clean = s => s
        .replace(/&amp;/g,  '&')
        .replace(/&#39;/g,  "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g,   '<')
        .replace(/&gt;/g,   '>');

      const results = (data.items || []).map(item => ({
        videoId:   item.id.videoId,
        title:     clean(item.snippet.title),
        channel:   item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
      }));

      /* ── Save to memory cache for 30 minutes ──
         Repeated searches for the same query on this instance
         will be served instantly at 0 quota cost. */
      setCache(CACHE_KEY, results, SEARCH_CACHE_TTL_MS);
      console.log(`[Search] Fetched and cached "${q}" ✅`);

      return res.json(results);

    } catch (err) {
      /* Network or unexpected error — store and try next key */
      lastError = err.message;
    }
  }

  /* All keys exhausted without a successful response */
  res.status(500).json({
    error: `All ${keys.length} API keys exhausted. Last error: ${lastError}`,
    hint:  'Add more keys to .env as YOUTUBE_API_KEY_2, YOUTUBE_API_KEY_3 etc.',
  });
});

export default router;