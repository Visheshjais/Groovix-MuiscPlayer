/**
 * ============================================================
 *  GROOVIX — Root App Component
 *  Author: Vishesh Jaiswal
 *  File:   src/App.jsx
 *
 *  LAYOUT (CSS Grid):
 *  ──────────────────
 *    Columns: [--sidebar-w]  [1fr]
 *    Rows:    [1fr]  [auto]  [--player-h]
 *
 *    .sidebar    → col 1, rows 1-3  (full height, never scrolls)
 *    .main-area  → col 2, row 1     (pages render here, scroll inside)
 *    .video-row  → col 2, row 2     (video panel, animated height)
 *    .player-col → col 2, row 3     (player bar, fixed 88px)
 *
 *  Provider order (outer → inner):
 *    Theme > Auth > Liked > Playlist > Player > Toast
 *  Inner providers can access outer ones via useContext.
 * ============================================================
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  ThemeProvider, AuthProvider, LikedProvider,
  PlaylistProvider, PlayerProvider, ToastProvider,
  useAuth,
} from './context';

import Sidebar        from './components/Sidebar';
import Player         from './components/Player';
import Home           from './pages/Home';
import Search         from './pages/Search';
import LikedSongs     from './pages/LikedSongs';
import Playlists      from './pages/Playlists';
import PlaylistDetail from './pages/PlaylistDetail';
import Auth           from './pages/Auth';
import './index.css';


/* ── Shell: the main app layout after login ── */
function Shell() {
  const { user } = useAuth();

  /* Show Auth page if user is not logged in */
  if (!user) return <Auth />;

  return (
    <div className="shell">
      {/* Sidebar spans all 3 rows (full height) */}
      <Sidebar />

      {/*
        Main content area — col 2, row 1.
        overflow: hidden here because each page manages its own scroll.
        Home.jsx uses <div id="main-scroll"> with overflowY: auto.
        Other pages use .page class with padding.
      */}
      <main className="main-area">
        <Routes>
          <Route path="/"             element={<Home />}           />
          <Route path="/search"       element={<Search />}         />
          <Route path="/liked"        element={<LikedSongs />}     />
          <Route path="/playlists"    element={<Playlists />}      />
          <Route path="/playlist/:id" element={<PlaylistDetail />} />
          <Route path="*"             element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/*
        Player renders BOTH the video panel (row 2) and
        the player bar (row 3) as siblings in the grid.
        The video panel uses transform/opacity to show/hide
        without clipping the iframe — this keeps audio playing.
      */}
      <Player />
    </div>
  );
}


/* ── Root: wraps everything in providers ── */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LikedProvider>
          <PlaylistProvider>
            <PlayerProvider>
              <ToastProvider>
                <BrowserRouter>
                  <Shell />
                </BrowserRouter>
              </ToastProvider>
            </PlayerProvider>
          </PlaylistProvider>
        </LikedProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
