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
 *  Portal fix:
 *    Dropdown is rendered via ReactDOM.createPortal into document.body
 *    so it is never clipped by carousel overflow.
 *    Position is calculated from the + FAB button's bounding rect.
 * ============================================================
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal }                from 'react-dom';
import { usePlayer, useLiked, useToast, usePlaylists } from '../context';

export default function SongCard({ song, queue = [] }) {

  /* ── Pull required context values ── */
  const { play, current, playing }     = usePlayer();
  const { toggle, isLiked }            = useLiked();
  const { show }                       = useToast();
  const { playlists, addSong, create } = usePlaylists();

  /* ── Local state for the Add to Playlist dropdown ── */
  const [dropOpen, setDropOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName,  setNewName]  = useState('');

  /* ── Position of the dropdown (calculated from FAB position) ── */
  const [dropPos,  setDropPos]  = useState({ top: 0, left: 0 });

  /* Refs */
  const dropRef = useRef(null);  // dropdown panel ref (for outside click)
  const fabRef  = useRef(null);  // + FAB button ref (for position calculation)

  /* Is this card the currently loaded track? */
  const active = current?.videoId === song.videoId;


  /* ════════════════════════════════════════════
     CLICK OUTSIDE — close dropdown
  ════════════════════════════════════════════ */
  useEffect(() => {
    if (!dropOpen) return;

    const handler = (e) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target) &&
        fabRef.current  && !fabRef.current.contains(e.target)
      ) {
        setDropOpen(false);
        setCreating(false);
        setNewName('');
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropOpen]);


  /* ════════════════════════════════════════════
     OPEN DROPDOWN — calculate position from FAB
     ─────────────────────────────────────────────
     Gets the bounding rect of the + FAB button and
     positions the dropdown above it using fixed coords.
     This works even inside overflow:hidden containers.
  ════════════════════════════════════════════ */
  const openDrop = (e) => {
    e.stopPropagation();
    if (dropOpen) { setDropOpen(false); return; }

    const rect = fabRef.current.getBoundingClientRect();
    console.log('FAB rect:', rect); // ← temporary debug log
    setDropPos({
      top:  rect.top + window.scrollY,
      left: rect.left + window.scrollX,
    });
    setDropOpen(true);
  };


  /* ════════════════════════════════════════════
     handleAddToPlaylist(e, pid)
  ════════════════════════════════════════════ */
  const handleAddToPlaylist = async (e, pid) => {
    e.stopPropagation();
    await addSong(pid, song);
    show('Added to playlist!');
    setDropOpen(false);
  };


  /* ════════════════════════════════════════════
     handleCreate(e)
  ════════════════════════════════════════════ */
  const handleCreate = async (e) => {
    e.stopPropagation();
    if (!newName.trim()) return;

    const p = await create(newName.trim());
    if (p) {
      await addSong(p._id || p.id, song);
      show(`Added to "${newName.trim()}"!`);
    }

    setNewName('');
    setCreating(false);
    setDropOpen(false);
  };


  /* ════════════════════════════════════════════
     PORTAL DROPDOWN
     ─────────────────────────────────────────────
     Rendered into document.body so it escapes
     any overflow:hidden parent containers.
     Uses fixed positioning based on FAB coords.
  ════════════════════════════════════════════ */
  const dropdownPortal = dropOpen && createPortal(
    <div
      ref={dropRef}
      className="pl-dropdown"
      style={{
        position: 'fixed',
        top:      dropPos.top - 8,
        left:     dropPos.left - 160,
        zIndex:   9999,
        minWidth: '200px',
}}
      onClick={e => e.stopPropagation()}
    >
      <div className="pl-drop-title">Add to playlist</div>

      {playlists.length === 0 && !creating && (
        <div className="pl-drop-empty">No playlists yet</div>
      )}

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
    </div>,
    document.body
  );


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
            LIKE FAB — top-left of thumbnail
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
            ADD TO PLAYLIST FAB — bottom-right of thumbnail
            + FAB button ref'd for position calculation.
            Dropdown rendered via portal into document.body.
        ════════════════════════════════════════════ */}
        <div
          className="card-pl-wrap"
          onClick={e => e.stopPropagation()}
        >
          <button
            ref={fabRef}
            className="card-pl-fab"
            title="Add to playlist"
            onClick={openDrop}
          >
            ＋
          </button>
        </div>

        {/* Portal dropdown — rendered outside carousel DOM */}
        {dropdownPortal}

      </div>

      <div className="card-title">{song.title}</div>
      <div className="card-ch">{song.channel}</div>

    </div>
  );
}