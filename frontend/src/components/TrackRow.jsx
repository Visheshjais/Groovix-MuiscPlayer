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
 *    • The + button opens a dropdown to add to a playlist
 * ============================================================
 */

import { useState } from 'react';
import { usePlayer, useLiked, usePlaylists, useToast } from '../context';

export default function TrackRow({ song, index, queue = [], showAddPlaylist = false }) {
  const { play, togglePlay, current, playing } = usePlayer();
  const { toggle, isLiked }                    = useLiked();
  const { playlists, addSong }                 = usePlaylists();
  const { show }                               = useToast();
  const [showPl, setShowPl]                    = useState(false);

  /* Is this the currently loaded song? */
  const active = current?.videoId === song.videoId;

  /* ── Row / play button click handler ── */
  const handlePlay = () => {
    if (active) {
      /* Same song → toggle play/pause on the YT player */
      togglePlay();
    } else {
      /* Different song → load it (queue = all songs in this list) */
      play(song, queue.length > 0 ? queue : null);
    }
  };

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

      {/* Inline Play/Pause button (visible on hover + when active) */}
      <button
        className="track-play-btn"
        onClick={e => { e.stopPropagation(); handlePlay(); }}
        title={active && playing ? 'Pause' : 'Play'}
      >
        {active && playing ? '⏸' : '▶'}
      </button>

      {/* Add to playlist dropdown */}
      {showAddPlaylist && (
        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <button
            className="track-like-btn"
            style={{ fontSize: 16 }}
            onClick={() => setShowPl(p => !p)}
            title="Add to playlist"
          >
            ＋
          </button>
          {showPl && playlists.length > 0 && (
            <div style={{
              position:   'absolute', right: 0, bottom: '110%',
              background: 'var(--surface)', border: '1px solid var(--border2)',
              borderRadius: 'var(--r2)', padding: 8,
              minWidth: 190, zIndex: 60,
              boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', padding: '4px 10px 8px', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                Add to Playlist
              </div>
              {playlists.map(pl => (
                <div
                  key={pl.id}
                  style={{ padding: '9px 12px', cursor: 'pointer', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                  onClick={() => { addSong(pl.id, song); show(`Added to ${pl.name}`); setShowPl(false); }}
                >
                  {pl.emoji} {pl.name}
                </div>
              ))}
            </div>
          )}
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

      {/* Duration placeholder (YT API would give real duration) */}
      <div className="track-dur">—</div>
    </div>
  );
}
