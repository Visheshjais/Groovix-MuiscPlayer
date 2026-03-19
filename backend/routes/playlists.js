/**
 * ============================================================
 *  GROOVIX — Playlist Routes
 *  Author: Vishesh Jaiswal
 *  File:   backend/routes/playlists.js
 *
 *  Routes:
 *    GET    /api/playlists                    → get all playlists
 *    POST   /api/playlists                    → create playlist
 *    POST   /api/playlists/:id/songs          → add song
 *    DELETE /api/playlists/:id/songs/:videoId → remove song
 *    DELETE /api/playlists/:id                → delete playlist
 *
 *  All routes protected by inline auth middleware.
 *  All queries include userId for ownership check.
 * ============================================================
 */

import express      from 'express';
import jwt          from 'jsonwebtoken';
import { Playlist } from '../models/Playlist.js';

const router = express.Router();

/* ── Auth middleware ── */
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

/* ── GET /api/playlists ── */
router.get('/', auth, async (req, res) => {
  try {
    const playlists = await Playlist.find({ userId: req.userId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, playlists });
  } catch (err) {
    console.error('[Playlists GET Error]', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ── POST /api/playlists ── */
router.post('/', auth, async (req, res) => {
  try {
    const { name, emoji } = req.body;
    if (!name?.trim())
      return res.status(400).json({ success: false, message: 'Playlist name required' });

    const playlist = await Playlist.create({
      userId: req.userId,
      name:   name.trim(),
      emoji:  emoji || '🎵',
      songs:  [],
    });
    return res.status(201).json({ success: true, playlist });
  } catch (err) {
    console.error('[Playlists CREATE Error]', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ── POST /api/playlists/:id/songs ── */
router.post('/:id/songs', auth, async (req, res) => {
  try {
    const song     = req.body;
    const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.userId });
    if (!playlist)
      return res.status(404).json({ success: false, message: 'Playlist not found' });

    /* Ignore duplicates */
    if (!playlist.songs.find(s => s.videoId === song.videoId)) {
      playlist.songs.push(song);
      await playlist.save();
    }
    return res.status(200).json({ success: true, playlist });
  } catch (err) {
    console.error('[Playlists ADD SONG Error]', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ── DELETE /api/playlists/:id/songs/:videoId ── */
router.delete('/:id/songs/:videoId', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.userId });
    if (!playlist)
      return res.status(404).json({ success: false, message: 'Playlist not found' });

    playlist.songs = playlist.songs.filter(s => s.videoId !== req.params.videoId);
    await playlist.save();
    return res.status(200).json({ success: true, playlist });
  } catch (err) {
    console.error('[Playlists REMOVE SONG Error]', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ── DELETE /api/playlists/:id ── */
router.delete('/:id', auth, async (req, res) => {
  try {
    await Playlist.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    return res.status(200).json({ success: true, message: 'Playlist deleted' });
  } catch (err) {
    console.error('[Playlists DELETE Error]', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;