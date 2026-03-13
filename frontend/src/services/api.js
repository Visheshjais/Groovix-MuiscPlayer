/**
 * ============================================================
 *  GROOVIX — API Service
 *  Author: Vishesh Jaiswal
 *  File:   src/services/api.js
 *
 *  All backend API calls go through this file.
 *
 *  BASE URL logic:
 *    Development  → '/api'  (Vite proxy forwards to localhost:3001)
 *    Production   → 'https://groovix-backend.onrender.com/api'
 *
 *  VITE_API_BASE is set as an environment variable on Netlify.
 *  Locally it is not set, so it falls back to '/api'.
 * ============================================================
 */

/* ── Pick the right backend URL based on environment ── */
const BASE = import.meta.env.VITE_API_BASE || '/api';

/**
 * getTrending()
 * ─────────────
 * Fetches all 8 music categories from the backend.
 * Returns: { trending, hiphop, pop, indie, electronic, rnb, punjabi, hindi }
 */
export async function getTrending() {
  const res = await fetch(`${BASE}/trending`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — Make sure the backend server is running.`);
  return res.json();
}

/**
 * searchSongs(query)
 * ──────────────────
 * Searches YouTube for the given query string.
 * Returns: array of song objects
 */
export async function searchSongs(query) {
  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * getVideoDetails(videoId)
 * ────────────────────────
 * Fetches details for a single YouTube video.
 * Returns: single song object
 */
export async function getVideoDetails(videoId) {
  const res = await fetch(`${BASE}/video/${videoId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
