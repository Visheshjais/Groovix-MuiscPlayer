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
 *  ── API KEY ROTATION ──────────────────────────────────────
 *  Multiple YouTube API keys are stored in .env as:
 *    YOUTUBE_API_KEY_1, YOUTUBE_API_KEY_2, ... YOUTUBE_API_KEY_5
 *
 *  If one key hits quota (403) or is invalid (400/401),
 *  the rotator automatically tries the next key.
 *  This keeps the site working even when one key is exhausted.
 * ============================================================
 */

import express from 'express';
const router = express.Router();

/* ── 8 music categories to fetch ── */
const CATEGORIES = [
  { id: 'trending',   query: 'trending music 2025'             },
  { id: 'hiphop',     query: 'hip hop hits 2025'               },
  { id: 'pop',        query: 'top pop songs 2025'              },
  { id: 'indie',      query: 'indie music 2025'                },
  { id: 'electronic', query: 'electronic music 2025'           },
  { id: 'rnb',        query: 'r&b soul music 2025'             },
  { id: 'punjabi',    query: 'new punjabi songs 2025'          },
  { id: 'hindi',      query: 'new hindi bollywood songs 2025'  },
];

/* ════════════════════════════════════════════
   getKeys()
   ─────────────────────────────────────────────
   Reads all API keys from environment variables.
   Supports YOUTUBE_API_KEY, YOUTUBE_API_KEY_1
   through YOUTUBE_API_KEY_10.
   Returns array of valid (non-empty) keys.
════════════════════════════════════════════ */
function getKeys() {
  const keys = [];

  /* Check the default key name first */
  if (process.env.YOUTUBE_API_KEY) keys.push(process.env.YOUTUBE_API_KEY);

  /* Check numbered keys: YOUTUBE_API_KEY_1 through YOUTUBE_API_KEY_10 */
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
      url.searchParams.set('videoCategoryId', '10');   /* Music only */
      url.searchParams.set('maxResults',      '14');
      url.searchParams.set('key',             key);

      const r    = await fetch(url.toString());
      const data = await r.json();

      /* If YouTube returned an error, check if we should try next key */
      if (data.error) {
        const code   = data.error.code;
        const reason = data.error.errors?.[0]?.reason || '';

        /* 403 = quota exceeded, 400/401 = bad key — try next key */
        if (code === 403 || code === 400 || code === 401) {
          console.warn(`[Key ${i + 1}/${keys.length}] ${reason} — trying next key...`);
          lastError = `Key ${i + 1}: ${reason}`;
          continue; /* move to next key */
        }

        /* Other errors — throw immediately */
        throw new Error(`YouTube API: ${data.error.message} (${code})`);
      }

      /* ── Success! Log which key worked ── */
      if (i > 0) console.log(`[Key Rotation] Key ${i + 1} worked for query: ${query}`);

      /* Clean HTML entities in titles */
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
      /* Network error or thrown error — store and continue */
      lastError = err.message;
      if (!err.message.includes('Key')) throw err; /* re-throw non-key errors */
    }
  }

  /* All keys exhausted */
  throw new Error(`All ${keys.length} API keys are quota-exceeded or invalid. Last error: ${lastError}`);
}

/* ── Route handler ── */
router.get('/', async (req, res) => {
  try {
    /* Fetch all 8 categories in parallel */
    const results = await Promise.all(
      CATEGORIES.map(async cat => ({
        id:    cat.id,
        items: await fetchWithRotation(cat.query),
      }))
    );

    /* Build response object */
    const out = {};
    results.forEach(r => { out[r.id] = r.items; });

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
