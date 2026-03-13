/**
 * ============================================================
 *  GROOVIX — Search Page
 *  Author: Vishesh Jaiswal
 *  File:   src/pages/Search.jsx
 *
 *  Reads ?q= from the URL, calls the backend /api/search,
 *  displays results in grid or list view.
 *  Re-fetches whenever the query changes.
 * ============================================================
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Topbar   from '../components/Topbar';
import SongCard from '../components/SongCard';
import TrackRow from '../components/TrackRow';
import { searchSongs } from '../services/api';

export default function Search() {
  const [params]            = useSearchParams();
  const q                   = params.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view,    setView]    = useState('grid');  // 'grid' or 'list'

  /* Fetch search results when query changes */
  useEffect(() => {
    if (!q) return;
    setLoading(true);
    setResults([]);
    searchSongs(q)
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <>
      <Topbar bc="Search" />
      <div className="page">

        {/* ── Empty state when no query ── */}
        {!q ? (
          <div className="empty">
            <div className="empty-ico">⌕</div>
            <h3>Search for music</h3>
            <p>Find songs, artists, albums and more</p>
          </div>
        ) : (
          <>
            {/* Result count + view toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div className="search-q">
                Results for <em>"{q}"</em>
                {!loading && (
                  <span style={{ fontSize: 15, color: 'var(--text3)', fontFamily: 'var(--font-b)', fontWeight: 400 }}>
                    {' '}· {results.length} found
                  </span>
                )}
              </div>
              {/* Grid / List toggle */}
              <div className="view-tog">
                <button className={`vbtn ${view === 'grid' ? 'on' : ''}`} onClick={() => setView('grid')}>⊞ Grid</button>
                <button className={`vbtn ${view === 'list' ? 'on' : ''}`} onClick={() => setView('list')}>≡ List</button>
              </div>
            </div>

            {/* Loading skeletons */}
            {loading && (
              <div className="result-grid">
                {Array(12).fill(0).map((_, i) => (
                  <div key={i} className="skel" style={{ height: 164 }} />
                ))}
              </div>
            )}

            {/* No results */}
            {!loading && results.length === 0 && (
              <div className="empty">
                <div className="empty-ico">🎵</div>
                <h3>No results found</h3>
                <p>Try a different search term</p>
              </div>
            )}

            {/* Grid view */}
            {!loading && results.length > 0 && view === 'grid' && (
              <div className="result-grid anim d1">
                {results.map(s => <SongCard key={s.videoId} song={s} queue={results} />)}
              </div>
            )}

            {/* List view */}
            {!loading && results.length > 0 && view === 'list' && (
              <div className="track-list anim d1">
                {results.map((s, i) => (
                  <TrackRow key={s.videoId} song={s} index={i} queue={results} showAddPlaylist />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
