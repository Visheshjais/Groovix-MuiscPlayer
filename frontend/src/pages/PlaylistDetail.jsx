/**
 * ============================================================
 *  GROOVIX — Playlist Detail Page
 *  Author: Vishesh Jaiswal
 *  File:   src/pages/PlaylistDetail.jsx
 *
 *  Shows the songs inside a single playlist.
 *  "Play All" loads all songs into the player queue.
 * ============================================================
 */

import { useParams, useNavigate } from 'react-router-dom';
import Topbar   from '../components/Topbar';
import TrackRow from '../components/TrackRow';
import { usePlaylists, usePlayer } from '../context';

export default function PlaylistDetail() {
  const { id }         = useParams();
  const { playlists }  = usePlaylists();
  const { play }       = usePlayer();
  const nav            = useNavigate();

  /* Find the playlist by id from the URL */
  const pl = playlists.find(p => p.id === id);

  /* Not found */
  if (!pl) return (
    <>
      <Topbar />
      <div className="page">
        <div className="empty">
          <div className="empty-ico">🎵</div>
          <h3>Playlist not found</h3>
          <button className="btn-play-lg" style={{ marginTop: 16 }} onClick={() => nav('/playlists')}>
            Back to Playlists
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Topbar bc={pl.name} />
      <div className="page">

        <div className="page-hero anim d1">
          <div className="page-hero-icon">{pl.emoji}</div>
          <div>
            <div className="page-hero-title">{pl.name}</div>
            <div className="page-hero-sub">{pl.songs.length} songs</div>
            {pl.songs.length > 0 && (
              <button
                className="btn-play-lg"
                style={{ marginTop: 16 }}
                onClick={() => play(pl.songs[0], pl.songs)}
              >
                ▶ Play All
              </button>
            )}
          </div>
        </div>

        {pl.songs.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">🎵</div>
            <h3>This playlist is empty</h3>
            <p>Search for songs and use the + button to add them here</p>
          </div>
        ) : (
          <div className="track-list anim d2">
            {pl.songs.map((s, i) => (
              <TrackRow key={s.videoId} song={s} index={i} queue={pl.songs} />
            ))}
          </div>
        )}

      </div>
    </>
  );
}
