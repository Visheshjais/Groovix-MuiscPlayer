/**
 * ============================================================
 *  GROOVIX — API Service
 *  Author: Vishesh Jaiswal
 *  File:   src/services/api.js
 *
 *  All backend API calls go through this file.
 *  Organised into 4 sections:
 *    1. MUSIC     — trending, search, video details (unchanged)
 *    2. AUTH      — register, login, logout, get current user
 *    3. LIKED     — fetch liked songs, toggle liked
 *    4. PLAYLISTS — full CRUD for playlists + songs
 *
 *  BASE URL logic:
 *    Development  → '/api'  (Vite proxy forwards to localhost:3001)
 *    Production   → 'https://groovix-backend.vercel.app/api'
 *
 *  VITE_API_URL is set as an environment variable on Vercel.
 *  Locally it is not set, so it falls back to '/api' which
 *  gets proxied to localhost:3001 via vite.config.js.
 *
 *  credentials: 'include' is set on all auth/data requests
 *  so the browser sends the gvx_token HTTP-only cookie
 *  along with every request to the backend.
 * ============================================================
 */

/* ── Pick the right backend URL based on environment ──
   Dev:  VITE_API_URL is not set → falls back to '/api' → Vite proxy handles it
   Prod: VITE_API_URL = 'https://groovix-backend.vercel.app/api' → set in Vercel ── */
const BASE = import.meta.env.VITE_API_URL || '/api';


/* ══════════════════════════════════════════════
   1.  MUSIC FUNCTIONS  (unchanged)
   ══════════════════════════════════════════════ */

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


/* ══════════════════════════════════════════════
   2.  AUTH FUNCTIONS  (new)
   ══════════════════════════════════════════════ */

/**
 * apiRegister(formData)
 * ─────────────────────
 * Registers a new Groovix account.
 * Accepts FormData so profile photo can be included.
 *
 * FormData fields: name, email, password, avatar (optional file)
 * Returns: { success, message, user, token }
 */
export async function apiRegister(formData) {
  const res = await fetch(`${BASE}/auth/register`, {
    method:      'POST',
    body:        formData,   /* browser sets Content-Type automatically for FormData */
    credentials: 'include', /* send/receive gvx_token cookie */
  });
  return res.json();
}

/**
 * apiLogin(email, password)
 * ─────────────────────────
 * Logs in with email + password.
 * On success, backend sets the 'gvx_token' HTTP-only cookie.
 *
 * Returns: { success, message, user, token }
 */
export async function apiLogin(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method:      'POST',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify({ email, password }),
    credentials: 'include',
  });
  return res.json();
}

/**
 * apiLogout()
 * ───────────
 * Clears the 'gvx_token' cookie on the backend.
 * Frontend should also clear user state after calling this.
 *
 * Returns: { success, message }
 */
export async function apiLogout() {
  const res = await fetch(`${BASE}/auth/logout`, {
    credentials: 'include',
  });
  return res.json();
}

/**
 * apiGetMe()
 * ──────────
 * Checks if the user is currently logged in by reading the JWT cookie.
 * Called on app load to restore session without re-login.
 *
 * Returns: { success, user } or { success: false } if not logged in
 */
export async function apiGetMe() {
  const res = await fetch(`${BASE}/auth/me`, {
    credentials: 'include',
  });
  return res.json();
}


/* ══════════════════════════════════════════════
   3.  LIKED SONGS FUNCTIONS  (new)
   ══════════════════════════════════════════════ */

/**
 * apiGetLiked()
 * ─────────────
 * Fetches all liked songs for the current logged-in user.
 *
 * Returns: { success, songs: [ ...songObjects ] }
 */
export async function apiGetLiked() {
  const res = await fetch(`${BASE}/liked`, {
    credentials: 'include',
  });
  return res.json();
}

/**
 * apiToggleLiked(song)
 * ────────────────────
 * Toggles a song's liked status for the current user.
 * If not liked → adds it. If already liked → removes it.
 *
 * song: { videoId, title, channel, thumbnail }
 * Returns: { success, liked: bool, songs: [ ...updatedArray ] }
 */
export async function apiToggleLiked(song) {
  const res = await fetch(`${BASE}/liked/toggle`, {
    method:      'POST',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify(song),
    credentials: 'include',
  });
  return res.json();
}


/* ══════════════════════════════════════════════
   4.  PLAYLIST FUNCTIONS  (new)
   ══════════════════════════════════════════════ */

/**
 * apiGetPlaylists()
 * ─────────────────
 * Fetches all playlists for the current logged-in user.
 * Sorted newest first.
 *
 * Returns: { success, playlists: [ ...playlistObjects ] }
 */
export async function apiGetPlaylists() {
  const res = await fetch(`${BASE}/playlists`, {
    credentials: 'include',
  });
  return res.json();
}

/**
 * apiCreatePlaylist(name, emoji)
 * ──────────────────────────────
 * Creates a new empty playlist for the current user.
 *
 * name:  playlist display name e.g. "Chill Vibes"
 * emoji: icon emoji e.g. "🎸"
 * Returns: { success, playlist: { ...newPlaylist } }
 */
export async function apiCreatePlaylist(name, emoji) {
  const res = await fetch(`${BASE}/playlists`, {
    method:      'POST',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify({ name, emoji }),
    credentials: 'include',
  });
  return res.json();
}

/**
 * apiAddSongToPlaylist(playlistId, song)
 * ──────────────────────────────────────
 * Adds a song to the specified playlist.
 * Duplicates (same videoId) are ignored by the backend.
 *
 * playlistId: MongoDB _id of the playlist
 * song: { videoId, title, channel, thumbnail }
 * Returns: { success, playlist: { ...updatedPlaylist } }
 */
export async function apiAddSongToPlaylist(playlistId, song) {
  const res = await fetch(`${BASE}/playlists/${playlistId}/songs`, {
    method:      'POST',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify(song),
    credentials: 'include',
  });
  return res.json();
}

/**
 * apiRemoveSongFromPlaylist(playlistId, videoId)
 * ──────────────────────────────────────────────
 * Removes a specific song from a playlist by its videoId.
 *
 * playlistId: MongoDB _id of the playlist
 * videoId:    YouTube video ID of the song to remove
 * Returns: { success, playlist: { ...updatedPlaylist } }
 */
export async function apiRemoveSongFromPlaylist(playlistId, videoId) {
  const res = await fetch(`${BASE}/playlists/${playlistId}/songs/${videoId}`, {
    method:      'DELETE',
    credentials: 'include',
  });
  return res.json();
}

/**
 * apiDeletePlaylist(playlistId)
 * ─────────────────────────────
 * Deletes an entire playlist including all its songs.
 *
 * playlistId: MongoDB _id of the playlist to delete
 * Returns: { success, message }
 */
export async function apiDeletePlaylist(playlistId) {
  const res = await fetch(`${BASE}/playlists/${playlistId}`, {
    method:      'DELETE',
    credentials: 'include',
  });
  return res.json();
}