/**
 * ============================================================
 *  GROOVIX — Sidebar Component
 *  Author: Vishesh Jaiswal
 *  File:   src/components/Sidebar.jsx
 *
 *  Left navigation panel. Contains:
 *    • Logo — click scrolls page back to top (uses window.__groovixScrollTop)
 *    • Main nav links (Home, Search, Liked Songs, Playlists)
 *    • User's playlists shortcuts (up to 5)
 *    • Live queue with EQ animation on active song
 *    • User info + Sign Out button
 * ============================================================
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, usePlayer, usePlaylists } from '../context';

/* ── Navigation items with icons and routes ── */
const NAV = [
  { icon: '⊞', label: 'Home',        path: '/'          },
  { icon: '⌕', label: 'Search',      path: '/search'    },
  { icon: '♡', label: 'Liked Songs', path: '/liked'     },
  { icon: '≡', label: 'Playlists',   path: '/playlists' },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const nav          = useNavigate();

  /* Context hooks for user, player queue, and playlists */
  const { user, logout }                       = useAuth();
  const { current, queue, idx, playing, play } = usePlayer();
  const { playlists }                          = usePlaylists();

  /* ── Handle logo click — scroll main area to top ── */
  const handleLogoClick = () => {
    if (pathname !== '/') {
      /* If not on home page, navigate there first */
      nav('/');
    } else {
      /* Already on home — scroll to top smoothly */
      /* window.__groovixScrollTop is set by Home.jsx on mount */
      window.__groovixScrollTop?.();
    }
  };

  return (
    <div className="sidebar">

      {/* ── Logo — click to scroll to top ── */}
      <div className="sb-logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }} title="Back to top">
        <div className="sb-logo-icon">🎵</div>
        <div className="sb-logo-name">Groo<em>vix</em></div>
      </div>

      {/* ── Main navigation links ── */}
      <div className="sb-nav">
        <span className="sb-lbl">Menu</span>
        {NAV.map(item => (
          <button
            key={item.path}
            className={`nav-btn ${pathname === item.path ? 'on' : ''}`}
            onClick={() => nav(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* ── Playlist shortcuts (shows first 5) ── */}
      {playlists.length > 0 && (
        <div className="sb-playlists">
          <span className="sb-lbl">Playlists</span>
          {playlists.slice(0, 5).map(pl => (
            <button
              key={pl.id}
              className={`pl-chip ${pathname === `/playlist/${pl.id}` ? 'on' : ''}`}
              onClick={() => nav(`/playlist/${pl.id}`)}
            >
              <span>{pl.emoji}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pl.name}
              </span>
              {pl.songs.length > 0 && (
                <span className="nav-badge">{pl.songs.length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Live Queue — shows all songs in current queue ── */}
      <div className="sb-queue">
        <div className="sb-queue-hdr">Queue ({queue.length})</div>
        <div className="q-list">
          {queue.length === 0 && (
            <div className="q-empty">Queue is empty</div>
          )}
          {queue.map((song, i) => (
            <div
              key={song.videoId + i}
              className={`q-item ${i === idx ? 'active' : ''}`}
              onClick={() => play(song)} /* click queue item to play it */
            >
              <img src={song.thumbnail} alt={song.title} />
              <div className="q-info">
                <div className="q-title">{song.title}</div>
                <div className="q-ch">{song.channel}</div>
              </div>
              {/* Show animated EQ bars on the currently active song */}
              {i === idx && playing && (
                <div className="eq">
                  <span /><span /><span /><span />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── User info + Sign Out ── */}
      <div className="sb-user">
        {/* User avatar — initials in a colored circle */}
        <div className="u-avatar">{user?.initials || 'G'}</div>
        <div className="u-info">
          <div className="u-name">{user?.name || 'Guest'}</div>
          <div className="u-plan">✦ Free Plan</div>
        </div>
        {/* Sign Out — calls logout() which clears localStorage + state */}
        <button className="u-logout" onClick={logout} title="Sign out">
          ⎋ <span>Sign Out</span>
        </button>
      </div>

    </div>
  );
}
