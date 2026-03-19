/**
 * ============================================================
 *  GROOVIX — Liked Songs Model
 *  Author: Vishesh Jaiswal
 *  File:   backend/models/Liked.js
 *
 *  MongoDB schema for storing a user's liked songs.
 *
 *  Design:
 *    One document per user (userId is unique).
 *    All liked songs stored as an embedded array inside
 *    that single document — fast reads, simple structure.
 *
 *  Song shape (embedded):
 *    videoId   → YouTube video ID (used as unique key)
 *    title     → song title (HTML entities already cleaned)
 *    channel   → YouTube channel name
 *    thumbnail → high-res thumbnail URL from YouTube
 * ============================================================
 */

import mongoose from 'mongoose';

/* ── Embedded song schema ── */
const songSchema = new mongoose.Schema({
  videoId:   { type: String, required: true },
  title:     { type: String, default: '' },
  channel:   { type: String, default: '' },
  thumbnail: { type: String, default: '' },
}, { _id: false });

/* ── Liked songs document — one per user ── */
const likedSchema = new mongoose.Schema({

  /* Reference to the user who owns this liked list */
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    unique:   true,
  },

  /* Array of liked song objects — newest first */
  songs: {
    type:    [songSchema],
    default: [],
  },

}, { timestamps: true });


export const Liked = mongoose.model('Liked', likedSchema);