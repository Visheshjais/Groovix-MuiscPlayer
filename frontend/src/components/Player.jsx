/**
 * ============================================================
 *  GROOVIX — Player Component
 *  Author: Vishesh Jaiswal
 *  File:   src/components/Player.jsx
 *
 *  Renders two things:
 *
 *  1. VIDEO PANEL (slides in above the player bar)
 *     Contains the YouTube iframe in #yt-player-slot.
 *     The iframe NEVER gets unmounted or moved in the DOM.
 *     Hidden with transform + opacity so audio keeps playing.
 *
 *  2. BOTTOM PLAYER BAR (always visible)
 *     Transport controls + progress bar + volume.
 *
 *  ── ADD TO PLAYLIST FEATURE ────────────────────────────────
 *  PlaylistDropdown is a reusable component used in two places:
 *    - Video panel action buttons (next to Like/Prev/Play/Next)
 *    - Bottom player bar now-playing section (next to ❤️)
 * ============================================================
 */

import { useState, useRef, useEffect } from 'react';
import { usePlayer, useLiked, useToast, usePlaylists } from '../context';


/* ── Format seconds → "m:ss" string ── */
function fmt(s) {
  if (!s || isNaN(s) || s <= 0) return '0:00';
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}


/* ════════════════════════════════════════════
   PlaylistDropdown — reusable dropdown component
   ─────────────────────────────────────────────
   Props:
     song  — the song object to add
     align — 'left' | 'right' — which side the dropdown anchors to
   Used in video panel and bottom player bar.
════════════════════════════════════════════ */
function PlaylistDropdown({ song, align = 'left' }) {

  const { playlists, addSong, create } = usePlaylists();
  const { show } = useToast();

  const [open,     setOpen]     = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName,  setNewName]  = useState('');

  const ref = useRef(null);

  /* Close when clicking outside */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false); setCreating(false); setNewName('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* Add current song to existing playlist */
  const handleAdd = async (pid) => {
    await addSong(pid, song);
    show('Added to playlist!');
    setOpen(false);
  };

  /* Create new playlist and add song to it */
  const handleCreate = async (e) => {
    e.stopPropagation();
    if (!newName.trim()) return;
    const p = await create(newName.trim());
    if (p) {
      await addSong(p._id || p.id, song);
      show(`Added to "${newName.trim()}"!`);
    }
    setNewName(''); setCreating(false); setOpen(false);
  };

  if (!song) return null;

  return (
    <div className="pl-drop-wrap" ref={ref} style={{ position: 'relative' }}>

      {/* + button styled same as np-btn (like button) */}
      <button
        className="np-btn"
        title="Add to playlist"
        onClick={() => setOpen(o => !o)}
        style={{ fontSize: 14 }}
      >
        ＋
      </button>

      {/* Dropdown panel — opens upward */}
      {open && (
        <div
          className="pl-dropdown"
          style={{
            [align === 'right' ? 'right' : 'left']: 0,
            bottom: '110%',
            top: 'auto',
          }}
        >
          <div className="pl-drop-title">Add to playlist</div>

          {playlists.length === 0 && !creating && (
            <div className="pl-drop-empty">No playlists yet</div>
          )}

          {playlists.map(p => (
            <button
              key={p._id || p.id}
              className="pl-drop-item"
              onClick={() => handleAdd(p._id || p.id)}
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
              />
              <button className="pl-drop-save" onClick={handleCreate}>✓</button>
            </div>
          ) : (
            <button className="pl-drop-create" onClick={() => setCreating(true)}>
              ＋ New playlist
            </button>
          )}

        </div>
      )}

    </div>
  );
}


/* ════════════════════════════════════════════
   Player — main export
════════════════════════════════════════════ */
export default function Player() {

  const {
    current,
    playing,   togglePlay,
    next,      prev,
    volume,    setVolume,
    shuffle,   setShuffle,
    repeat,    setRepeat,
    videoOpen, setVideoOpen,
    time,      dur,  seekTo,
  } = usePlayer();

  const { toggle, isLiked } = useLiked();
  const { show }            = useToast();

  const handleLike = () => {
    if (!current) return;
    toggle(current);
    show(isLiked(current.videoId) ? 'Removed from Liked Songs' : '♥ Added to Liked Songs');
  };

  const handleSeek = (e) => {
    if (!dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(Math.floor(frac * dur));
  };

  const pct = dur > 0 ? Math.min((time / dur) * 100, 100) : 0;

  return (
    <>
      {/* ══════════════════════════════════════════════════════
          VIDEO PANEL
          Hidden with transform + opacity so iframe stays alive
          and audio keeps playing when video mode is closed.
      ══════════════════════════════════════════════════════ */}
      <div
        className="video-row"
        style={{
          height:        340,
          overflow:      'hidden',
          transform:     videoOpen && current ? 'translateY(0)' : 'translateY(100%)',
          opacity:       videoOpen && current ? 1 : 0,
          maxHeight:     videoOpen && current ? 340 : 0,
          transition:    'transform 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease, max-height 0.38s ease',
          background:    'var(--bg2)',
          borderTop:     '1px solid var(--border)',
          pointerEvents: videoOpen && current ? 'auto' : 'none',
        }}
      >
        <div style={{ display: 'flex', height: 340 }}>

          {/* LEFT 58%: YouTube iframe — NEVER unmount or move this div */}
          <div style={{ flex: '0 0 58%', background: '#000', position: 'relative', overflow: 'hidden' }}>
            <div id="yt-player-slot" style={{ width: '100%', height: '100%' }} />
          </div>

          {/* RIGHT 42%: Song info + controls */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            justifyContent: 'center', padding: '28px 32px', gap: 16,
            background: 'linear-gradient(135deg, var(--bg2), var(--bg3))',
            borderLeft: '1px solid var(--border)', position: 'relative', minWidth: 0,
          }}>
            {current && (
              <>
                <div className="vid-badge"><span className="vid-live-dot" />Video Mode</div>
                <div className="vid-title">{current.title}</div>
                <div className="vid-channel">{current.channel}</div>

                {/* Video panel action buttons */}
                <div className="vid-actions">

                  {/* Like */}
                  <button
                    className={`vid-btn ${isLiked(current.videoId) ? 'liked' : ''}`}
                    onClick={handleLike}
                  >
                    {isLiked(current.videoId) ? '❤️ Liked' : '🤍 Like'}
                  </button>

                  {/* ── Add to Playlist (video panel) ── */}
                  <PlaylistDropdown song={current} align="left" />

                  <button className="vid-btn" onClick={prev}>⏮ Prev</button>
                  <button className="vid-btn" onClick={togglePlay}>{playing ? '⏸ Pause' : '▶ Play'}</button>
                  <button className="vid-btn" onClick={next}>Next ⏭</button>

                </div>

                {/* Animated EQ bars while playing */}
                {playing && (
                  <div className="vid-eq">
                    {[1,2,3,4,5,6,7,8].map(i => (
                      <span key={i} style={{ animationDelay: `${i * 0.07}s` }} />
                    ))}
                  </div>
                )}
              </>
            )}
            <button className="vid-close" onClick={() => setVideoOpen(false)}>✕</button>
          </div>
        </div>
      </div>


      {/* ══════════════════════════════════════════════════════
          BOTTOM PLAYER BAR — always visible
          Three columns: [NOW PLAYING] [CONTROLS] [VOLUME]
      ══════════════════════════════════════════════════════ */}
      <div className="player-bar player-col">

        {/* ── LEFT: Now Playing ── */}
        <div className="np">
          {current ? (
            <>
              {/* Thumbnail — click to toggle video mode */}
              <img
                className={`np-thumb ${videoOpen ? 'video-on' : ''}`}
                src={current.thumbnail}
                alt={current.title}
                onClick={() => setVideoOpen(v => !v)}
                title={videoOpen ? 'Hide Video' : 'Video Mode'}
              />

              <div className="np-info">
                <div className="np-title">{current.title}</div>
                <div className="np-ch">{current.channel}</div>
              </div>

              {/* Action buttons: Like + Add to Playlist + Video Mode */}
              <div className="np-acts">

                {/* Like */}
                <button
                  className={`np-btn ${isLiked(current.videoId) ? 'liked' : ''}`}
                  onClick={handleLike}
                  title="Like this song"
                >
                  {isLiked(current.videoId) ? '❤️' : '🤍'}
                </button>

                {/* ── Add to Playlist (player bar) ── */}
                <PlaylistDropdown song={current} align="left" />

                {/* Video Mode toggle */}
                <button
                  className={`np-btn-label ${videoOpen ? 'vid-active' : ''}`}
                  onClick={() => setVideoOpen(v => !v)}
                  title="Toggle video mode"
                >
                  📺 {videoOpen ? 'Hide Video' : 'Video Mode'}
                </button>

              </div>
            </>
          ) : (
            <>
              <div className="np-ph">🎵</div>
              <div className="np-info">
                <div className="np-title" style={{ color: 'var(--text3)' }}>Nothing playing</div>
                <div className="np-ch">Pick a song to start</div>
              </div>
            </>
          )}
        </div>


        {/* ── CENTER: Transport + Progress ── */}
        <div className="ctrl-center">
          <div className="ctrl-btns">
            <button className={`ctrl-btn sm ${shuffle ? 'on' : ''}`} onClick={() => setShuffle(s => !s)} title="Shuffle">🔀</button>
            <button className="ctrl-btn" onClick={prev} title="Previous">⏮</button>
            <button className="play-pause" onClick={togglePlay}>{playing ? '⏸' : '▶'}</button>
            <button className="ctrl-btn" onClick={next} title="Next">⏭</button>
            <button className={`ctrl-btn sm ${repeat ? 'on' : ''}`} onClick={() => setRepeat(r => !r)} title="Repeat">🔁</button>
          </div>
          <div className="prog-row">
            <span className="prog-time">{fmt(time)}</span>
            <div className="prog-track" onClick={handleSeek} title="Click to seek">
              <div className="prog-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="prog-time r">{fmt(dur)}</span>
          </div>
        </div>


        {/* ── RIGHT: Volume ── */}
        <div className="ctrl-right">
          <div className="vol-row">
            <span className="vol-ico" onClick={() => setVolume(volume === 0 ? 80 : 0)} title={volume === 0 ? 'Unmute' : 'Mute'}>
              {volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
            </span>
            <input
              type="range" className="vol-slider"
              min={0} max={100} value={volume}
              onChange={e => setVolume(Number(e.target.value))}
            />
            <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 28 }}>{volume}%</span>
          </div>
        </div>

      </div>
    </>
  );
}