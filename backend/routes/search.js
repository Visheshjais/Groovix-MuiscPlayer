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
 * ============================================================
 */

import express from 'express';
const router = express.Router();

/* ── Get all configured API keys from environment ── */
function getKeys() {
  const keys = [];
  if (process.env.YOUTUBE_API_KEY) keys.push(process.env.YOUTUBE_API_KEY);
  for (let i = 1; i <= 50; i++) {
    const k = process.env[`YOUTUBE_API_KEY_${i}`];
    if (k && k !== 'YOUR_KEY_HERE' && !keys.includes(k)) keys.push(k);
  }
  return keys;
}

router.get('/', async (req, res) => {
  const q          = req.query.q || 'music';
  const maxResults = req.query.maxResults || 20;
  const keys       = getKeys();
  let lastError    = null;

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

      if (data.error) {
        const code = data.error.code;
        if (code === 403 || code === 400 || code === 401) {
          console.warn(`[Search Key ${i + 1}] quota/invalid — trying next...`);
          lastError = data.error.message;
          continue;
        }
        throw new Error(data.error.message);
      }

      /* Clean HTML entities */
      const clean = s => s
        .replace(/&amp;/g, '&').replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

      return res.json((data.items || []).map(item => ({
        videoId:   item.id.videoId,
        title:     clean(item.snippet.title),
        channel:   item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
      })));

    } catch (err) {
      lastError = err.message;
    }
  }

  res.status(500).json({ error: `All keys exhausted. Last error: ${lastError}` });
});

export default router;
