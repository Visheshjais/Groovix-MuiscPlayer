/**
 * ============================================================
 *  GROOVIX — Player Component
 *  Author: Vishesh Jaiswal
 *  File:   src/components/Player.jsx
 *
 *  Renders two things:
 *
 *  1. VIDEO PANEL (slides in above the player bar)
 *  ─────────────────────────────────────────────────
 *  Contains the YouTube iframe in #yt-player-slot.
 *  The iframe NEVER gets unmounted or moved in the DOM.
 *
 *  ── KEY FIX: Why audio now keeps playing when video closes ──
 *  Previous bug: hiding with height:0 + overflow:hidden clipped
 *  the iframe. YouTube detected it was invisible and paused it.
 *
 *  Current fix: we use transform + opacity to hide the panel.
 *    Video Mode OFF → translateY(100%) + opacity:0 + pointer-events:none
 *    Video Mode ON  → translateY(0) + opacity:1
 *  The iframe stays at full size and is visible to the browser
 *  (just off-screen / transparent), so YouTube never pauses it.
 *  Audio plays continuously regardless of video mode state.
 *
 *  2. BOTTOM PLAYER BAR (always visible)
 *  ─────────────────────────────────────────────────
 *  Transport controls + progress bar + volume.
 *  All buttons call context functions which call the real
 *  YT.Player API — both bar and video panel are always in sync
 *  because they share the same single player instance.
 * ============================================================
 */

import { usePlayer, useLiked, useToast } from '../context';

/* ── Format seconds → "m:ss" string ── */
function fmt(s) {
  if (!s || isNaN(s) || s <= 0) return '0:00';
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function Player() {

  /* ── Pull everything from the player context ── */
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

  /* ── Like / Unlike the current song ── */
  const handleLike = () => {
    if (!current) return;
    toggle(current);
    show(isLiked(current.videoId) ? 'Removed from Liked Songs' : '♥ Added to Liked Songs');
  };

  /* ── Click on progress bar to seek to that position ── */
  const handleSeek = (e) => {
    if (!dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    /* Calculate what fraction (0.0 to 1.0) of the bar was clicked */
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(Math.floor(frac * dur));
  };

  /* ── Progress bar fill percentage ── */
  const pct = dur > 0 ? Math.min((time / dur) * 100, 100) : 0;

  return (
    <>
      {/* ══════════════════════════════════════════════════════
          VIDEO PANEL
          ──────────────────────────────────────────────────────
          Uses transform + opacity to show/hide (NOT height clipping).
          This keeps the iframe alive and playing even when "hidden".

          position: absolute  → out of layout flow when hidden
          position: relative  → takes up layout space when visible
      ══════════════════════════════════════════════════════ */}
      <div
        className="video-row"
        style={{
          /* When open: normal layout, full height */
          height:     340,
          overflow:   'hidden',
          /* Slide up/down with transform instead of height animation */
          transform:  videoOpen && current ? 'translateY(0)' : 'translateY(100%)',
          opacity:    videoOpen && current ? 1 : 0,
          /* When hidden: take no space in layout */
          maxHeight:  videoOpen && current ? 340 : 0,
          transition: 'transform 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease, max-height 0.38s ease',
          background: 'var(--bg2)',
          borderTop:  '1px solid var(--border)',
          pointerEvents: videoOpen && current ? 'auto' : 'none',
        }}
      >
        <div style={{ display: 'flex', height: 340 }}>

          {/* ── LEFT 58%: The YouTube iframe lives here PERMANENTLY ──
              #yt-player-slot is the div where YT.Player injects its iframe.
              We NEVER move this div — moving it would kill the JS connection.
              The player stays here always; we just show/hide the whole panel. */}
          <div style={{
            flex:       '0 0 58%',
            background: '#000',
            position:   'relative',
            overflow:   'hidden',
          }}>
            <div id="yt-player-slot" style={{ width: '100%', height: '100%' }} />
          </div>

          {/* ── RIGHT 42%: Song info + custom controls ── */}
          <div style={{
            flex:           1,
            display:        'flex',
            flexDirection:  'column',
            justifyContent: 'center',
            padding:        '28px 32px',
            gap:            16,
            background:     'linear-gradient(135deg, var(--bg2), var(--bg3))',
            borderLeft:     '1px solid var(--border)',
            position:       'relative',
            minWidth:       0,
          }}>
            {current && (
              <>
                {/* "Video Mode" badge with animated dot */}
                <div className="vid-badge">
                  <span className="vid-live-dot" />
                  Video Mode
                </div>

                {/* Song title */}
                <div className="vid-title">{current.title}</div>

                {/* Channel / artist name */}
                <div className="vid-channel">{current.channel}</div>

                {/* ── Video panel controls ──
                    These call the SAME context functions as the bottom bar.
                    Both sets of controls hit the same YT.Player instance. */}
                <div className="vid-actions">
                  {/* Like button */}
                  <button
                    className={`vid-btn ${isLiked(current.videoId) ? 'liked' : ''}`}
                    onClick={handleLike}
                  >
                    {isLiked(current.videoId) ? '❤️ Liked' : '🤍 Like'}
                  </button>

                  {/* Previous song */}
                  <button className="vid-btn" onClick={prev}>⏮ Prev</button>

                  {/* Play / Pause — same togglePlay() as bottom bar */}
                  <button className="vid-btn" onClick={togglePlay}>
                    {playing ? '⏸ Pause' : '▶ Play'}
                  </button>

                  {/* Next song */}
                  <button className="vid-btn" onClick={next}>Next ⏭</button>
                </div>

                {/* Animated EQ bars shown while playing */}
                {playing && (
                  <div className="vid-eq">
                    {[1,2,3,4,5,6,7,8].map(i => (
                      <span key={i} style={{ animationDelay: `${i * 0.07}s` }} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Close / hide video panel button */}
            <button className="vid-close" onClick={() => setVideoOpen(false)}>✕</button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          BOTTOM PLAYER BAR  — always visible at the bottom
          Three columns: [NOW PLAYING] [CONTROLS] [VOLUME]
      ══════════════════════════════════════════════════════ */}
      <div className="player-bar player-col">

        {/* ── LEFT COLUMN: Current song info ── */}
        <div className="np">
          {current ? (
            <>
              {/* Song thumbnail — click to toggle video mode */}
              <img
                className={`np-thumb ${videoOpen ? 'video-on' : ''}`}
                src={current.thumbnail}
                alt={current.title}
                onClick={() => setVideoOpen(v => !v)}
                title={videoOpen ? 'Hide Video' : 'Video Mode'}
              />

              {/* Song title + channel */}
              <div className="np-info">
                <div className="np-title">{current.title}</div>
                <div className="np-ch">{current.channel}</div>
              </div>

              {/* Like + Video Mode toggle buttons */}
              <div className="np-acts">
                <button
                  className={`np-btn ${isLiked(current.videoId) ? 'liked' : ''}`}
                  onClick={handleLike}
                  title="Like this song"
                >
                  {isLiked(current.videoId) ? '❤️' : '🤍'}
                </button>
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
            /* Empty state — nothing is playing */
            <>
              <div className="np-ph">🎵</div>
              <div className="np-info">
                <div className="np-title" style={{ color: 'var(--text3)' }}>Nothing playing</div>
                <div className="np-ch">Pick a song to start</div>
              </div>
            </>
          )}
        </div>

        {/* ── CENTER COLUMN: Transport controls + Progress bar ── */}
        <div className="ctrl-center">

          {/* Transport buttons row */}
          <div className="ctrl-btns">
            {/* Shuffle — randomizes next track selection */}
            <button
              className={`ctrl-btn sm ${shuffle ? 'on' : ''}`}
              onClick={() => setShuffle(s => !s)}
              title="Shuffle"
            >🔀</button>

            {/* Previous track — calls prev() → decrements queue index */}
            <button className="ctrl-btn" onClick={prev} title="Previous">⏮</button>

            {/* Play / Pause — calls togglePlay() → YT player.playVideo() or pauseVideo() */}
            <button className="play-pause" onClick={togglePlay}>
              {playing ? '⏸' : '▶'}
            </button>

            {/* Next track — calls next() → increments queue index */}
            <button className="ctrl-btn" onClick={next} title="Next">⏭</button>

            {/* Repeat — loops the queue */}
            <button
              className={`ctrl-btn sm ${repeat ? 'on' : ''}`}
              onClick={() => setRepeat(r => !r)}
              title="Repeat"
            >🔁</button>
          </div>

          {/* Progress bar row */}
          <div className="prog-row">
            {/* Current time — updated by 500ms poll from YT player */}
            <span className="prog-time">{fmt(time)}</span>

            {/* Clickable progress track — click to seek */}
            <div
              className="prog-track"
              onClick={handleSeek}
              title="Click to seek"
            >
              <div className="prog-fill" style={{ width: `${pct}%` }} />
            </div>

            {/* Total duration — from YT player getDuration() */}
            <span className="prog-time r">{fmt(dur)}</span>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Volume control ── */}
        <div className="ctrl-right">
          <div className="vol-row">
            {/* Mute / Unmute icon — click to toggle mute */}
            <span
              className="vol-ico"
              onClick={() => setVolume(volume === 0 ? 80 : 0)}
              title={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
            </span>

            {/* Volume slider — onChange calls setVolume() → YT player.setVolume() */}
            <input
              type="range"
              className="vol-slider"
              min={0} max={100}
              value={volume}
              onChange={e => setVolume(Number(e.target.value))}
            />

            {/* Numeric volume percentage */}
            <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 28 }}>
              {volume}%
            </span>
          </div>
        </div>

      </div>
    </>
  );
}
