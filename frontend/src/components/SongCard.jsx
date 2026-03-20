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
 *    - Like FAB (heart) appears top-left of thumbnail
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
 *    Uses fixed positioning so it scrolls with the page correctly.
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

  /* ── Position of the dropdown (calculated from FAB bounding rect) ── */
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });

  /* Refs */
  const dropRef = useRef(null); /* dropdown panel — for outside-click detection */
  const fabRef  = useRef(null); /* + FAB button  — for position calculation     */

  /* Is this card the currently loaded track? */
  const active = current?.videoId === song.videoId;


  /* ════════════════════════════════════════════
     CLICK OUTSIDE — close dropdown
     ─────────────────────────────────────────────
     Attaches a mousedown listener to document when
     dropdown is open. Closes if click is outside
     both the dropdown panel and the + FAB button.
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
     Gets the bounding rect of the + FAB button.
     Positions dropdown ABOVE and to the LEFT of FAB
     using viewport-relative fixed coordinates.
     Works even inside overflow:hidden carousel containers.
  ════════════════════════════════════════════ */
  const openDrop = (e) => {
    e.stopPropagation();
    if (dropOpen) { setDropOpen(false); return; }

    const rect = fabRef.current.getBoundingClientRect();
    setDropPos({
      top:  rect.top,   /* viewport-relative — used with fixed positioning */
      left: rect.right, /* align right edge of dropdown to right edge of FAB */
    });
    setDropOpen(true);
  };


  /* ════════════════════════════════════════════
     handleAddToPlaylist(e, pid)
     ─────────────────────────────────────────────
     Adds this song to the chosen playlist.
     pid = playlist._id (MongoDB) or playlist.id (guest)
  ════════════════════════════════════════════ */
  const handleAddToPlaylist = async (e, pid) => {
    e.stopPropagation();
    await addSong(pid, song);
    show('Added to playlist!');
    setDropOpen(false);
  };


  /* ════════════════════════════════════════════
     handleCreate(e)
     ─────────────────────────────────────────────
     Creates a new playlist and adds this song to it.
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
     Rendered into document.body via createPortal.
     Escapes all overflow:hidden parent containers.
     Positioned using fixed coords from FAB rect.
     Uses inline styles with hardcoded dark theme
     colors so CSS variables work without a theme wrapper.
  ════════════════════════════════════════════ */
  const dropdownPortal = dropOpen && createPortal(
    <div
      ref={dropRef}
      onClick={e => e.stopPropagation()}
      style={{
        position:     'fixed',
        top:          `${dropPos.top - 230}px`,
        left:         `${dropPos.left - 210}px`,
        zIndex:       9999,
        minWidth:     '210px',
        maxWidth:     '250px',
        background:   '#0c0f1a',
        border:       '1px solid #1e2a42',
        borderRadius: '10px',
        boxShadow:    '0 8px 32px rgba(0,0,0,0.6)',
        overflow:     'hidden',
        color:        '#e8eaf6',
        fontFamily:   'Outfit, sans-serif',
        fontSize:     '13px',
      }}
    >
      {/* Header */}
      <div style={{
        padding:       '10px 14px 8px',
        fontSize:      '11px',
        fontWeight:    600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color:         '#3d4f6e',
        borderBottom:  '1px solid #1e2a42',
      }}>
        Add to playlist
      </div>

      {/* Empty state */}
      {playlists.length === 0 && !creating && (
        <div style={{ padding: '12px 14px', color: '#3d4f6e' }}>
          No playlists yet
        </div>
      )}

      {/* Existing playlists */}
      {playlists.map(p => (
        <button
          key={p._id || p.id}
          onClick={e => handleAddToPlaylist(e, p._id || p.id)}
          style={{
            display:     'flex',
            alignItems:  'center',
            gap:         '8px',
            width:       '100%',
            padding:     '9px 14px',
            border:      'none',
            background:  'transparent',
            color:       '#e8eaf6',
            fontSize:    '13px',
            fontFamily:  'Outfit, sans-serif',
            textAlign:   'left',
            cursor:      'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1a2035'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span>{p.emoji || '🎵'}</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.name}
          </span>
          <span style={{ fontSize: '11px', color: '#3d4f6e' }}>
            {p.songs?.length || 0}
          </span>
        </button>
      ))}

      {/* New playlist — inline input or button */}
      {creating ? (
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '6px',
          padding:      '8px 10px',
          borderTop:    '1px solid #1e2a42',
        }}>
          <input
            autoFocus
            placeholder="Playlist name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  handleCreate(e);
              if (e.key === 'Escape') { setCreating(false); setNewName(''); }
            }}
            onClick={e => e.stopPropagation()}
            style={{
              flex:         1,
              background:   '#111520',
              border:       '1px solid #1e2a42',
              borderRadius: '6px',
              padding:      '5px 8px',
              color:        '#e8eaf6',
              fontSize:     '13px',
              fontFamily:   'Outfit, sans-serif',
              outline:      'none',
            }}
          />
          <button
            onClick={handleCreate}
            style={{
              background:   '#6c63ff',
              color:        '#fff',
              border:       'none',
              borderRadius: '6px',
              padding:      '5px 10px',
              fontSize:     '14px',
              cursor:       'pointer',
            }}
          >
            ✓
          </button>
        </div>
      ) : (
        <button
          onClick={e => { e.stopPropagation(); setCreating(true); }}
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '6px',
            width:      '100%',
            padding:    '9px 14px',
            border:     'none',
            borderTop:  '1px solid #1e2a42',
            background: 'transparent',
            color:      '#6c63ff',
            fontSize:   '13px',
            fontFamily: 'Outfit, sans-serif',
            cursor:     'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1a2035'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
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
            fabRef used for dropdown position calculation.
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