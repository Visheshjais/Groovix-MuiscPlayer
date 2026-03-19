/**
 * ============================================================
 *  GROOVIX — SongCard Component
 *  Author: Vishesh Jaiswal
 *  File:   src/components/SongCard.jsx
 *
 *  A grid card used in carousels and search results.
 *  Shows thumbnail, title, channel name.
 *
 *  On hover:
 *    - Play button overlay appears
 *    - Like FAB (heart) appears top-right of thumbnail
 *    - Add to Playlist FAB (plus) appears bottom-right of thumbnail
 *
 *  If this song is currently playing:
 *    - Shows animated EQ badge on the thumbnail
 *
 *  ── ADD TO PLAYLIST FEATURE ────────────────────────────────
 *  The + FAB opens a dropdown that:
 *    1. Lists all existing playlists with emoji + name + song count
 *    2. Clicking a playlist → adds song immediately + shows toast
 *    3. "+ New playlist" → inline input appears
 *       Type name + Enter → creates playlist AND adds song in one step
 *    4. Clicking outside → dropdown closes cleanly
 *
 *  Works for both:
 *    - Logged-in users  → synced with MongoDB via context
 *    - Guest users      → saved to localStorage via context
 * ============================================================
 */

import { useState, useRef, useEffect } from 'react';
import { usePlayer, useLiked, useToast, usePlaylists } from '../context';

export default function SongCard({ song, queue = [] }) {

  /* ── Pull required context values ── */
  const { play, current, playing }     = usePlayer();    // playback controls
  const { toggle, isLiked }            = useLiked();     // liked songs state
  const { show }                       = useToast();     // toast notifications
  const { playlists, addSong, create } = usePlaylists(); // playlist CRUD

  /* ── Local state for the Add to Playlist dropdown ── */
  const [dropOpen, setDropOpen] = useState(false); // is the dropdown visible?
  const [creating, setCreating] = useState(false); // is the "new playlist" input shown?
  const [newName,  setNewName]  = useState('');    // value of the new playlist name input

  /* Ref on the dropdown wrapper — used for click-outside detection */
  const dropRef = useRef(null);

  /* Is this card the currently loaded track? */
  const active = current?.videoId === song.videoId;


  /* ════════════════════════════════════════════
     CLICK OUTSIDE — close dropdown
     ─────────────────────────────────────────────
     When dropdown is open, attach a mousedown listener to
     the document. If the click lands outside dropRef, close
     and reset all dropdown state.
     Cleanup removes the listener when dropdown closes.
  ════════════════════════════════════════════ */
  useEffect(() => {
    if (!dropOpen) return;

    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
        setCreating(false);
        setNewName('');
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropOpen]);


  /* ════════════════════════════════════════════
     handleAddToPlaylist(e, pid)
     ─────────────────────────────────────────────
     Called when user clicks an existing playlist row.
     pid = playlist._id (MongoDB) or playlist.id (guest)
     stopPropagation stops the card click (song play) from firing.
  ════════════════════════════════════════════ */
  const handleAddToPlaylist = async (e, pid) => {
    e.stopPropagation();
    await addSong(pid, song);   // add this song to the chosen playlist
    show('Added to playlist!'); // success toast
    setDropOpen(false);         // close dropdown
  };


  /* ════════════════════════════════════════════
     handleCreate(e)
     ─────────────────────────────────────────────
     Called when user presses Enter or clicks the checkmark.
     1. Creates a new playlist with the typed name
     2. Immediately adds this song to it
     3. Shows a toast, resets input, closes dropdown
  ════════════════════════════════════════════ */
  const handleCreate = async (e) => {
    e.stopPropagation();
    if (!newName.trim()) return;

    const p = await create(newName.trim());  // create playlist → returns new playlist object
    if (p) {
      await addSong(p._id || p.id, song);    // works with both MongoDB _id and guest id
      show(`Added to "${newName.trim()}"!`);
    }

    /* Reset all state */
    setNewName('');
    setCreating(false);
    setDropOpen(false);
  };


  return (
    <div
      className="song-card"
      onClick={() => play(song, queue.length > 0 ? queue : null)}
    >
      <div className="card-img-wrap">

        {/* ── Song thumbnail image ── */}
        <img
          className="card-img"
          src={song.thumbnail}
          alt={song.title}
          loading="lazy"
        />

        {/* ── Hover overlay: play/pause icon ── */}
        <div className="card-ov">
          <button className="card-play">
            {active && playing ? '⏸' : '▶'}
          </button>
        </div>

        {/* ── EQ badge: shown only when this song is actively playing ── */}
        {active && playing && (
          <div className="card-eq">
            <div className="eq"><span /><span /><span /></div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            LIKE FAB
            stopPropagation() prevents triggering the card
            click which would start playing the song.
        ════════════════════════════════════════════ */}
        <button
          className="card-like-fab"
          onClick={e => {
            e.stopPropagation();
            toggle(song);
            show(isLiked(song.videoId)
              ? 'Removed from Liked Songs'
              : '♥ Added to Liked Songs'
            );
          }}
        >
          {isLiked(song.videoId) ? '❤️' : '🤍'}
        </button>

        {/* ════════════════════════════════════════════
            ADD TO PLAYLIST FAB + DROPDOWN
            ─────────────────────────────────────────────
            Wrapper div holds both the + button and dropdown.
            ref={dropRef} for outside-click detection.
            stopPropagation so card click doesn't fire.
        ════════════════════════════════════════════ */}
        <div
          className="card-pl-wrap"
          ref={dropRef}
          onClick={e => e.stopPropagation()}
        >

          {/* + FAB button — appears on hover, toggles dropdown */}
          <button
            className="card-pl-fab"
            title="Add to playlist"
            onClick={e => { e.stopPropagation(); setDropOpen(o => !o); }}
          >
            ＋
          </button>

          {/* Dropdown panel */}
          {dropOpen && (
            <div className="pl-dropdown">

              <div className="pl-drop-title">Add to playlist</div>

              {/* Empty state */}
              {playlists.length === 0 && !creating && (
                <div className="pl-drop-empty">No playlists yet</div>
              )}

              {/* Existing playlists */}
              {playlists.map(p => (
                <button
                  key={p._id || p.id}
                  className="pl-drop-item"
                  onClick={e => handleAddToPlaylist(e, p._id || p.id)}
                >
                  <span>{p.emoji || '🎵'}</span>
                  <span className="pl-drop-name">{p.name}</span>
                  <span className="pl-drop-count">{p.songs?.length || 0}</span>
                </button>
              ))}

              {/* New playlist — inline input or button */}
              {creating ? (
                <div className="pl-drop-new">
                  <input
                    autoFocus
                    className="pl-drop-input"
                    placeholder="Playlist name..."
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter')  handleCreate(e);
                      if (e.key === 'Escape') { setCreating(false); setNewName(''); }
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                  <button className="pl-drop-save" onClick={handleCreate}>✓</button>
                </div>
              ) : (
                <button
                  className="pl-drop-create"
                  onClick={e => { e.stopPropagation(); setCreating(true); }}
                >
                  ＋ New playlist
                </button>
              )}

            </div>
          )}
        </div>

      </div>

      <div className="card-title">{song.title}</div>
      <div className="card-ch">{song.channel}</div>

    </div>
  );
}