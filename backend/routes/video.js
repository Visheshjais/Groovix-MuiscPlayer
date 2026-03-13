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
 * ============================================================
 */

import express from 'express';
const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,contentDetails,statistics');
    url.searchParams.set('id',   req.params.id);
    url.searchParams.set('key',  process.env.YOUTUBE_API_KEY);

    const r    = await fetch(url.toString());
    const data = await r.json();

    if (data.error) return res.status(500).json({ error: data.error.message });

    const item = data.items?.[0];
    if (!item)   return res.status(404).json({ error: 'Video not found' });

    res.json({
      videoId:  item.id,
      title:    item.snippet.title,
      channel:  item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url,
      views:    item.statistics.viewCount,
      likes:    item.statistics.likeCount,
      duration: item.contentDetails.duration,  // ISO 8601 e.g. "PT3M42S"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
