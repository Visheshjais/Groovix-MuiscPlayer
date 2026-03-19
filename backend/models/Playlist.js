/**
 * ============================================================
 *  GROOVIX — Playlist Model
 *  Author: Vishesh Jaiswal
 *  File:   backend/models/Playlist.js
 *
 *  MongoDB schema for user-created playlists.
 *
 *  Design:
 *    One document per playlist (unlike Liked which is one per user).
 *    Each user can have many playlists.
 *    Songs are embedded inside the playlist document.
 *
 *  Playlist shape:
 *    userId → owner of the playlist
 *    name   → display name (e.g. "Chill Vibes")
 *    emoji  → random emoji chosen at creation (e.g. "🎸")
 *    songs  → embedded array of song objects
 * ============================================================
 */

import mongoose from 'mongoose';

/* ── Embedded song schema — same shape as in Liked model ── */
const songSchema = new mongoose.Schema({
  videoId:   { type: String, required: true },
  title:     { type: String, default: '' },
  channel:   { type: String, default: '' },
  thumbnail: { type: String, default: '' },
}, { _id: false });

/* ── Playlist schema ── */
const playlistSchema = new mongoose.Schema({

  /* Reference to the user who created this playlist */
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },

  /* Playlist display name */
  name: {
    type:     String,
    required: true,
    trim:     true,
  },

  /* Random emoji chosen at creation */
  emoji: {
    type:    String,
    default: '🎵',
  },

  /* Songs in this playlist — ordered by insertion */
  songs: {
    type:    [songSchema],
    default: [],
  },

}, { timestamps: true });


export const Playlist = mongoose.model('Playlist', playlistSchema);