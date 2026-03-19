/**
 * ============================================================
 *  GROOVIX — Home Page
 *  Author: Vishesh Jaiswal
 *  File:   src/pages/Home.jsx
 *
 *  Main landing page after login. Sections:
 *    1. Hero banner    — featured song + play all + explore
 *    2. 8 carousels    — horizontal draggable sliders
 *       (Trending, Hip-Hop, Pop, Indie, Electronic, R&B, Punjabi, Hindi)
 *    3. Top Tracks     — list view of trending songs
 *
 *  ── SKELETON LOADING ──────────────────────────────────────
 *  While data is loading, each carousel shows 7 shimmer
 *  placeholder cards with a left-to-right shine animation.
 *  This gives instant visual feedback instead of blank screen.
 *
 *  ── SCROLL TO TOP ─────────────────────────────────────────
 *  Clicking the Groovix logo scrolls main area to top.
 *  We expose window.__groovixScrollTop() as a global helper.
 * ============================================================
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate }                  from 'react-router-dom';
import Topbar                           from '../components/Topbar';
import SongCard                         from '../components/SongCard';
import TrackRow                         from '../components/TrackRow';
import { getTrending }                  from '../services/api';
import { usePlayer, useAuth }           from '../context';

/* ── Section definitions — id maps to backend response key ── */
const SECTIONS = [
  { id: 'trending',   label: '🔥 Trending Now',      color: '#ff6b35' },
  { id: 'hiphop',     label: '🎤 Hip-Hop Hits',       color: '#9b59b6' },
  { id: 'pop',        label: '⭐ Pop Charts',          color: '#f39c12' },
  { id: 'indie',      label: '🌿 Indie Picks',         color: '#27ae60' },
  { id: 'electronic', label: '⚡ Electronic',           color: '#2980b9' },
  { id: 'rnb',        label: '🎙 R&B & Soul',          color: '#e74c3c' },
  { id: 'punjabi',    label: '🎺 Punjabi Beats',       color: '#e67e22' },
  { id: 'hindi',      label: '🎵 Hindi Bollywood',    color: '#c0392b' },
];

/* ════════════════════════════════════════════
   SkeletonCard
   ─────────────────────────────────────────────
   Single shimmer placeholder shown while songs load.
   Uses a CSS keyframe animation (shimmer) defined in
   index.css to create a left-to-right shine effect.
   Width/height matches real SongCard dimensions.
════════════════════════════════════════════ */
function SkeletonCard() {
  return (
    <div style={{
      width:        164,
      height:       220,
      flexShrink:   0,
      borderRadius: 14,
      background:   'var(--surface)',
      overflow:     'hidden',
      position:     'relative',
    }}>
      {/* Shimmer overlay — animates left to right */}
      <div style={{
        position:   'absolute',
        inset:      0,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
        animation:  'shimmer 1.4s infinite',
        backgroundSize: '200% 100%',
      }} />
      {/* Fake thumbnail area */}
      <div style={{ height: 160, background: 'rgba(255,255,255,0.04)' }} />
      {/* Fake title lines */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.07)', width: '80%' }} />
        <div style={{ height: 8,  borderRadius: 6, background: 'rgba(255,255,255,0.04)', width: '55%' }} />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   CarouselSection
   ─────────────────────────────────────────────
   One horizontal slider with arrow buttons.
   Shows SkeletonCards while loading, real
   SongCards once data arrives.
════════════════════════════════════════════ */
function CarouselSection({ label, color, songs, loading, onSeeAll }) {
  /* Ref to the scrollable carousel div — used by arrow buttons */
  const trackRef = useRef(null);

  /* Scroll left or right by one "page" (80% of visible width) */
  const scroll = (dir) => {
    if (!trackRef.current) return;
    const amount = trackRef.current.clientWidth * 0.8;
    trackRef.current.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  return (
    <div className="section anim d2">
      {/* Section header: title + arrow buttons */}
      <div className="sec-hdr">
        <h2 className="sec-title" style={{ borderLeft: `3px solid ${color}`, paddingLeft: 12 }}>
          {label}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Left scroll arrow */}
          <button className="carousel-arrow" onClick={() => scroll(-1)} title="Scroll left">‹</button>
          {/* Right scroll arrow */}
          <button className="carousel-arrow" onClick={() => scroll(1)}  title="Scroll right">›</button>
        </div>
      </div>

      {/* Horizontally scrollable song cards */}
      <div className="carousel" ref={trackRef}>
        {loading
          /* Show shimmer skeleton cards while data is loading */
          ? Array(7).fill(0).map((_, i) => <SkeletonCard key={i} />)
          /* Render actual song cards once data arrives */
          : songs.map(s => <SongCard key={s.videoId} song={s} queue={songs} />)
        }
      </div>
    </div>
  );
}

/* ── Main Home component ── */
export default function Home() {
  const [data,    setData]    = useState({});
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState('');

  const { play } = usePlayer();
  const { user } = useAuth();
  const nav      = useNavigate();

  /* Ref to the scrollable main area */
  const mainRef = useRef(null);

  /* ════════════════════════════════════════════
     FETCH TRENDING DATA
     ─────────────────────────────────────────────
     Called once on page load.
     Shows skeletons immediately, replaces with
     real data once the API responds.
  ════════════════════════════════════════════ */
  useEffect(() => {
    getTrending()
      .then(setData)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  /* ── Expose scrollToTop globally so Sidebar logo can call it ── */
  useEffect(() => {
    window.__groovixScrollTop = () => {
      const mainEl = document.getElementById('main-scroll');
      if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    };
    return () => { delete window.__groovixScrollTop; };
  }, []);

  /* Hero = first trending song */
  const hero     = data.trending?.[0];
  const heroList = data.trending || [];

  return (
    <div
      id="main-scroll"
      style={{ height: '100%', overflowY: 'auto' }}
      onScroll={(e) => {
        /* Update scroll progress bar at top of page */
        const el       = e.currentTarget;
        const scrolled = el.scrollTop / (el.scrollHeight - el.clientHeight);
        const bar      = document.getElementById('scroll-bar');
        if (bar) bar.style.width = (scrolled * 100) + '%';
      }}
    >
      <Topbar />

      {/* ── HERO BANNER ── */}
      <div className="hero anim d1">
        <div className="hero-card">
          {/* Blurred background from hero song thumbnail */}
          {hero && (
            <div
              className="hero-blur"
              style={{ backgroundImage: `url(${hero.thumbnail})` }}
            />
          )}
          <div className="hero-grad" />

          <div className="hero-body">
            {/* ── Hero thumbnail or skeleton placeholder ── */}
            {loading
              ? <div style={{
                  width: 180, height: 180, borderRadius: 16,
                  background: 'var(--surface)', flexShrink: 0,
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
                    animation: 'shimmer 1.4s infinite',
                    backgroundSize: '200% 100%',
                  }} />
                </div>
              : hero
                ? <img className="hero-art" src={hero.thumbnail} alt={hero.title} />
                : <div className="hero-art-ph">🎧</div>
            }

            <div className="hero-info">
              <div className="hero-tag">✦ Featured Mix</div>

              {/* ── Hero title or skeleton line ── */}
              {loading
                ? <div style={{
                    height: 32, width: '60%', borderRadius: 8,
                    background: 'rgba(255,255,255,0.07)',
                    animation: 'shimmer 1.4s infinite',
                    backgroundSize: '200% 100%',
                    backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
                  }} />
                : <h1 className="hero-title">
                    {hero?.title?.split(' ').slice(0, 5).join(' ') || 'Midnight Reverie'}
                  </h1>
              }

              <p className="hero-meta">
                Welcome back, <span>{user?.name || 'Guest'}</span>
                {' '}· {loading ? '...' : `${heroList.length} songs ready`}
              </p>

              <div className="hero-acts">
                {/* Play All — loads entire trending list as queue */}
                <button
                  className="btn-play-lg"
                  onClick={() => hero && play(hero, heroList)}
                  disabled={loading}
                  style={{ opacity: loading ? 0.5 : 1 }}
                >
                  ▶ Play All
                </button>
                {/* Explore — goes to Search page */}
                <button
                  className="btn-ghost-lg"
                  onClick={() => nav('/search')}
                >
                  ⊞ Explore
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ERROR MESSAGE ── */}
      {err && (
        <div style={{
          margin: '0 28px 20px', padding: '16px 20px',
          background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
          borderRadius: 'var(--r)', fontSize: 14, color: '#f87171', lineHeight: 1.7,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠ Backend error: {err}</div>
          <div style={{ color: '#fca5a5', fontSize: 13 }}>
            Possible causes:<br />
            <strong>1. Quota exceeded</strong> — YouTube API allows 10,000 units/day.<br />
            <strong>2. Invalid key</strong> — Check your Vercel environment variables.<br />
            <strong>3. Backend not running</strong> — Check Vercel deployment logs.
          </div>
        </div>
      )}

      {/* ── CAROUSEL SECTIONS (8 categories) ── */}
      {SECTIONS.map(sec => (
        <CarouselSection
          key={sec.id}
          label={sec.label}
          color={sec.color}
          songs={data[sec.id] || []}
          loading={loading}
          onSeeAll={() => nav(`/search?q=${sec.id}+music`)}
        />
      ))}

      {/* ── TOP TRACKS LIST ── */}
      {!loading && heroList.length > 0 && (
        <div className="section anim d5" style={{ paddingBottom: 32 }}>
          <div className="sec-hdr">
            <h2 className="sec-title" style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 12 }}>
              📋 Top Tracks
            </h2>
          </div>
          <div className="track-list">
            {heroList.map((s, i) => (
              <TrackRow
                key={s.videoId}
                song={s}
                index={i}
                queue={heroList}
                showAddPlaylist
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}