/**
 * ============================================================
 *  GROOVIX — TrackRow Component
 *  Author: Vishesh Jaiswal
 *  File:   src/components/TrackRow.jsx
 *
 *  A single row in a track list (used in Home, Search,
 *  Liked Songs, Playlist pages).
 *
 *  Columns:  [#]  [thumbnail]  [title/channel]  [play-btn]  [+playlist]  [like]  [duration]
 *
 *  Behavior:
 *    • Click anywhere on the row → play this song (or toggle play/pause if active)
 *    • The ▶/⏸ inline button does the same thing
 *    • Volume, prev, next are in the bottom bar — not in this row
 *    • The + button opens a portal dropdown to add to a playlist
 *      Portal renders into document.body so it is never clipped
 *      by any overflow:hidden parent container.
 * ============================================================
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal }                from 'react-dom';
import { usePlayer, useLiked, usePlaylists, useToast } from '../context';

export default function TrackRow({ song, index, queue = [], showAddPlaylist = false }) {
  const { play, togglePlay, current, playing } = usePlayer();
  const { toggle, isLiked }                    = useLiked();
  const { playlists, addSong, create }         = usePlaylists();
  const { show }                               = useToast();

  /* ── Dropdown state ── */
  const [dropOpen, setDropOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName,  setNewName]  = useState('');
  const [dropPos,  setDropPos]  = useState({ top: 0, left: 0 });

  /* Refs */
  const fabRef  = useRef(null); /* + button ref — for position calculation */
  const dropRef = useRef(null); /* dropdown panel ref — for outside-click  */

  /* Is this the currently loaded song? */
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
     REPOSITION ON SCROLL — keeps dropdown
     aligned to + button while page scrolls
  ════════════════════════════════════════════ */
  useEffect(() => {
    if (!dropOpen) return;

    const handleScroll = () => {
      if (!fabRef.current) return;
      const rect = fabRef.current.getBoundingClientRect();
      setDropPos({ top: rect.top, left: rect.right });
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [dropOpen]);


  /* ════════════════════════════════════════════
     OPEN DROPDOWN — calculate position from FAB
  ════════════════════════════════════════════ */
  const openDrop = (e) => {
    e.stopPropagation();
    if (dropOpen) { setDropOpen(false); return; }

    const rect = fabRef.current.getBoundingClientRect();
    setDropPos({ top: rect.top, left: rect.right });
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


  /* ── Row / play button click handler ── */
  const handlePlay = () => {
    if (active) togglePlay();
    else play(song, queue.length > 0 ? queue : null);
  };


  /* ════════════════════════════════════════════
     PORTAL DROPDOWN
     Rendered into document.body — escapes all
     overflow:hidden containers. Uses fixed coords.
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
            display:    'flex',
            alignItems: 'center',
            gap:        '8px',
            width:      '100%',
            padding:    '9px 14px',
            border:     'none',
            background: 'transparent',
            color:      '#e8eaf6',
            fontSize:   '13px',
            fontFamily: 'Outfit, sans-serif',
            textAlign:  'left',
            cursor:     'pointer',
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
          display:   'flex',
          alignItems:'center',
          gap:       '6px',
          padding:   '8px 10px',
          borderTop: '1px solid #1e2a42',
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
      className={`track-row ${active ? 'on' : ''}`}
      onClick={handlePlay}
    >
      {/* Track number / EQ bars if active */}
      <div className="track-num">
        {active && playing
          ? <div className="eq"><span /><span /><span /></div>
          : index + 1
        }
      </div>

      {/* Thumbnail */}
      <img className="track-thumb" src={song.thumbnail} alt={song.title} loading="lazy" />

      {/* Title + channel */}
      <div className="track-meta">
        <div className="track-name">{song.title}</div>
        <div className="track-artist">{song.channel}</div>
      </div>

      {/* Inline Play/Pause button */}
      <button
        className="track-play-btn"
        onClick={e => { e.stopPropagation(); handlePlay(); }}
        title={active && playing ? 'Pause' : 'Play'}
      >
        {active && playing ? '⏸' : '▶'}
      </button>

      {/* ── Add to Playlist button + portal dropdown ── */}
      {showAddPlaylist && (
        <div onClick={e => e.stopPropagation()}>
          <button
            ref={fabRef}
            className="track-like-btn"
            style={{ fontSize: 16 }}
            onClick={openDrop}
            title="Add to playlist"
          >
            ＋
          </button>
          {dropdownPortal}
        </div>
      )}

      {/* Like button */}
      <button
        className={`track-like-btn ${isLiked(song.videoId) ? 'on' : ''}`}
        onClick={e => {
          e.stopPropagation();
          toggle(song);
          show(isLiked(song.videoId) ? 'Removed from Liked Songs' : '♥ Added to Liked Songs');
        }}
      >
        {isLiked(song.videoId) ? '❤️' : '🤍'}
      </button>

      {/* Duration placeholder */}
      <div className="track-dur">—</div>
    </div>
  );
}