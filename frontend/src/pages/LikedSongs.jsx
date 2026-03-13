/**
 * ============================================================
 *  GROOVIX — Liked Songs Page
 *  Author: Vishesh Jaiswal
 *  File:   src/pages/LikedSongs.jsx
 *
 *  Shows all songs the user has liked (stored in localStorage).
 *  "Play All" loads the entire liked list into the queue.
 * ============================================================
 */

import Topbar   from '../components/Topbar';
import TrackRow from '../components/TrackRow';
import { useLiked, usePlayer } from '../context';

export default function LikedSongs() {
  const { liked }  = useLiked();
  const { play }   = usePlayer();

  return (
    <>
      <Topbar bc="Liked Songs" />
      <div className="page">

        {/* Page hero banner */}
        <div className="page-hero anim d1">
          <div className="page-hero-icon">❤️</div>
          <div>
            <div className="page-hero-title">Liked Songs</div>
            <div className="page-hero-sub">{liked.length} songs you love</div>
            {liked.length > 0 && (
              <button
                className="btn-play-lg"
                style={{ marginTop: 16 }}
                onClick={() => play(liked[0], liked)}
              >
                ▶ Play All
              </button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {liked.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">🤍</div>
            <h3>No liked songs yet</h3>
            <p>Heart any song to save it here</p>
          </div>
        ) : (
          <div className="track-list anim d2">
            {liked.map((s, i) => (
              <TrackRow key={s.videoId} song={s} index={i} queue={liked} />
            ))}
          </div>
        )}

      </div>
    </>
  );
}
