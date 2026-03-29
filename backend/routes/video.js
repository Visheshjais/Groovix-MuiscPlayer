/**
 * ============================================================
 *  GROOVIX — Video Details Route
 *  Author: Vishesh Jaiswal
 *  File:   backend/routes/video.js
 *
 *  GET /api/video/:id
 *
 *  Fetches full details for a single YouTube video.
 *  Includes snippet, contentDetails, and statistics.
 *  Used for showing view counts, likes, and ISO 8601 duration.
 *
 *  ── CHANGES FROM ORIGINAL ─────────────────────────────────
 *
 *  1. KEY ROTATION (was missing entirely in original):
 *     The original used only process.env.YOUTUBE_API_KEY with
 *     zero fallback. If that one key was quota-exceeded, every
 *     video detail request silently failed.
 *     Now uses the same getKeys() + rotation loop as trending.js
 *     and search.js — tries all configured keys before giving up.
 *
 *  2. IN-MEMORY CACHING (new):
 *     Video metadata (title, duration, views) rarely changes.
 *     Caching each video for 24 hours saves 1 quota unit per
 *     repeated play. On a music player that replays songs, this
 *     adds up fast.
 *     Cache key format: "video:<videoId>"
 *     TTL: 24 hours (configurable via VIDEO_CACHE_TTL_MS below)
 *
 *  ── QUOTA COST ────────────────────────────────────────────
 *    videos.list costs 1 unit per call.
 *    After caching: 1 unit on first play, 0 units on replays.
 * ============================================================
 */

import express               from 'express';
import { getCache, setCache } from '../index.js'; /* ← NEW: in-memory cache helpers */

const router = express.Router();

/* ── How long to cache individual video details ── */
const VIDEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000; /* 24 hours */


/* ════════════════════════════════════════════
   getKeys()
   ─────────────────────────────────────────────
   Reads all API keys from environment variables.
   Supports YOUTUBE_API_KEY, YOUTUBE_API_KEY_1
   through YOUTUBE_API_KEY_50.
   Returns array of valid (non-empty) keys.

   NOTE: This was MISSING in the original video.js —
   it only used the single YOUTUBE_API_KEY with no
   fallback. That meant one exhausted key = all video
   detail requests failing silently.
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
   GET /api/video/:id
   ─────────────────────────────────────────────
   1. Checks in-memory cache first (0 quota units).
   2. If miss, tries each API key in turn.
   3. On success, caches the result for 24 hours.
════════════════════════════════════════════ */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  /* ── Cache key is unique per video ID ── */
  const CACHE_KEY = `video:${id}`;

  /* ── Check in-memory cache first ──
     Video metadata (title, duration, views) barely changes.
     Serving from cache costs 0 quota units and responds instantly. */
  const cached = getCache(CACHE_KEY);
  if (cached) {
    console.log(`[Video] Cache hit for ${id} ⚡`);
    return res.json(cached);
  }

  /* ── Cache miss — try each API key in order ── */
  const keys     = getKeys();
  let lastError  = null;

  if (keys.length === 0) {
    return res.status(500).json({ error: 'No API keys configured in .env' });
  }

  for (let i = 0; i < keys.length; i++) {
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/videos');
      url.searchParams.set('part', 'snippet,contentDetails,statistics');
      url.searchParams.set('id',   id);
      url.searchParams.set('key',  keys[i]);

      const r    = await fetch(url.toString());
      const data = await r.json();

      /* If YouTube returned an error, decide whether to try next key */
      if (data.error) {
        const code   = data.error.code;
        const reason = data.error.errors?.[0]?.reason || '';

        /* 403 = quota exceeded, 400/401 = bad/invalid key — try next */
        if (code === 403 || code === 400 || code === 401) {
          console.warn(`[Video Key ${i + 1}/${keys.length}] ${reason} — trying next key...`);
          lastError = `Key ${i + 1}: ${reason}`;
          continue;
        }

        /* Other YouTube errors (malformed ID etc.) — fail immediately */
        return res.status(500).json({ error: data.error.message });
      }

      /* Video ID not found in YouTube's response */
      const item = data.items?.[0];
      if (!item) return res.status(404).json({ error: 'Video not found' });

      /* ── Build the response object ── */
      const result = {
        videoId:   item.id,
        title:     item.snippet.title,
        channel:   item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url,
        views:     item.statistics.viewCount,
        likes:     item.statistics.likeCount,
        duration:  item.contentDetails.duration, /* ISO 8601 e.g. "PT3M42S" */
      };

      /* ── Save to memory cache for 24 hours ──
         Next time this video is requested by any user on this
         instance, it's served instantly at 0 quota cost. */
      setCache(CACHE_KEY, result, VIDEO_CACHE_TTL_MS);
      console.log(`[Video] Fetched and cached ${id} ✅`);

      return res.json(result);

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