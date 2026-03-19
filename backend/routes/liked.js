/**
 * ============================================================
 *  GROOVIX — Liked Songs Routes
 *  Author: Vishesh Jaiswal
 *  File:   backend/routes/liked.js
 *
 *  Routes:
 *    GET  /api/liked        → fetch all liked songs for current user
 *    POST /api/liked/toggle → add song if not liked, remove if liked
 *
 *  Auth:
 *    Both routes protected by inline auth middleware.
 *    JWT read from 'gvx_token' HTTP-only cookie.
 *
 *  Design:
 *    One Liked document per user.
 *    Songs embedded as array — newest songs added at front (unshift).
 * ============================================================
 */

import express   from 'express';
import jwt       from 'jsonwebtoken';
import { Liked } from '../models/Liked.js';

const router = express.Router();

/* ════════════════════════════════════════════
   AUTH MIDDLEWARE
   Reads JWT from gvx_token cookie.
   Attaches req.userId for route handlers.
════════════════════════════════════════════ */
const auth = (req, res, next) => {
  try {
    const token = req.cookies?.gvx_token;
    if (!token)
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/* ── GET /api/liked ── */
router.get('/', auth, async (req, res) => {
  try {
    const doc = await Liked.findOne({ userId: req.userId });
    return res.status(200).json({ success: true, songs: doc?.songs || [] });
  } catch (err) {
    console.error('[Liked GET Error]', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ════════════════════════════════════════════
   POST /api/liked/toggle
   ─────────────────────────────────────────────
   Body: { videoId, title, channel, thumbnail }
   Returns: { success, liked: bool, songs: [] }
════════════════════════════════════════════ */
router.post('/toggle', auth, async (req, res) => {
  try {
    const song = req.body;
    if (!song?.videoId)
      return res.status(400).json({ success: false, message: 'Song with videoId required' });

    /* Find or create liked document for this user */
    let doc = await Liked.findOne({ userId: req.userId });
    if (!doc) doc = await Liked.create({ userId: req.userId, songs: [] });

    const exists = doc.songs.find(s => s.videoId === song.videoId);

    if (exists) {
      /* Already liked → remove it */
      doc.songs = doc.songs.filter(s => s.videoId !== song.videoId);
    } else {
      /* Not liked → add at front (newest first) */
      doc.songs.unshift(song);
    }

    await doc.save();

    return res.status(200).json({ success: true, liked: !exists, songs: doc.songs });
  } catch (err) {
    console.error('[Liked Toggle Error]', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;