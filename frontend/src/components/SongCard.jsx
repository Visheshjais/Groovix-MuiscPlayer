/**
 * ============================================================
 *  GROOVIX — SongCard Component
 *  Author: Vishesh Jaiswal
 *  File:   src/components/SongCard.jsx
 *
 *  A grid card (used in carousels and search results).
 *  Shows thumbnail, title, channel.
 *  On hover: play button overlay + like FAB appear.
 *  If this song is currently playing: shows animated EQ badge.
 * ============================================================
 */

import { usePlayer, useLiked, useToast } from '../context';

export default function SongCard({ song, queue = [] }) {
  const { play, current, playing } = usePlayer();
  const { toggle, isLiked }        = useLiked();
  const { show }                   = useToast();

  /* Is this the currently loaded song? */
  const active = current?.videoId === song.videoId;

  return (
    <div
      className="song-card"
      onClick={() => play(song, queue.length > 0 ? queue : null)}
    >
      <div className="card-img-wrap">
        <img
          className="card-img"
          src={song.thumbnail}
          alt={song.title}
          loading="lazy"
        />

        {/* Hover overlay with play button */}
        <div className="card-ov">
          <button className="card-play">
            {active && playing ? '⏸' : '▶'}
          </button>
        </div>

        {/* EQ badge shown when this track is active */}
        {active && playing && (
          <div className="card-eq">
            <div className="eq"><span /><span /><span /></div>
          </div>
        )}

        {/* Like FAB — shown on hover */}
        <button
          className="card-like-fab"
          onClick={e => {
            e.stopPropagation();  // don't trigger song play
            toggle(song);
            show(isLiked(song.videoId) ? 'Removed from Liked Songs' : '♥ Added to Liked Songs');
          }}
        >
          {isLiked(song.videoId) ? '❤️' : '🤍'}
        </button>
      </div>

      <div className="card-title">{song.title}</div>
      <div className="card-ch">{song.channel}</div>
    </div>
  );
}
