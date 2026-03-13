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
 *  Scroll-to-top:
 *    Clicking the "Groovix" logo in the sidebar scrolls this
 *    main area back to the top. We expose a scrollToTop() method
 *    via a ref on the <main> element in App.jsx... but the simpler
 *    approach used here is: the main-area div has id="main-scroll"
 *    and the Sidebar calls window.scrollMainToTop() which we define
 *    here as a global helper.
 *
 *  Carousels:
 *    Each section uses a horizontally scrollable div with
 *    scroll-snap. Arrow buttons appear on hover to scroll left/right.
 *    This replaces the old "See all →" text link.
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
  { id: 'punjabi',    label: '🎺 Punjabi Beats',       color: '#e67e22' }, /* ← NEW */
  { id: 'hindi',      label: '🎵 Hindi Bollywood',    color: '#c0392b' }, /* ← NEW */
];

/* ── CarouselSection: one horizontal slider with arrow buttons ── */
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
          /* Show skeleton placeholders while loading */
          ? Array(7).fill(0).map((_, i) => (
              <div key={i} className="skel" style={{ width: 164, height: 220, flexShrink: 0, borderRadius: 14 }} />
            ))
          /* Render actual song cards */
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

  /* Ref to the scrollable main area — used for scroll-to-top */
  const mainRef = useRef(null);

  /* ── Fetch all trending categories on page load ── */
  useEffect(() => {
    getTrending()
      .then(setData)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  /* ── Expose scrollToTop globally so Sidebar logo can call it ── */
  useEffect(() => {
    /* When the Groovix logo is clicked, scroll the main area to top */
    window.__groovixScrollTop = () => {
      const mainEl = document.getElementById('main-scroll');
      if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    };
    /* Cleanup on unmount */
    return () => { delete window.__groovixScrollTop; };
  }, []);

  /* Hero = first trending song */
  const hero     = data.trending?.[0];
  const heroList = data.trending || [];

  return (
    /* main-scroll id is used by the scroll-to-top function above */
    <div
      id="main-scroll"
      style={{ height: '100%', overflowY: 'auto' }}
      onScroll={(e) => {
        /* ── Scroll progress bar ──
           Update the width of #scroll-bar based on scroll position.
           scrollTop = how far scrolled, scrollHeight - clientHeight = max scrollable distance. */
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
            {hero
              ? <img className="hero-art" src={hero.thumbnail} alt={hero.title} />
              : <div className="hero-art-ph">🎧</div>
            }
            <div className="hero-info">
              <div className="hero-tag">✦ Featured Mix</div>
              <h1 className="hero-title">
                {loading
                  ? 'Loading...'
                  : hero?.title?.split(' ').slice(0, 5).join(' ') || 'Midnight Reverie'
                }
              </h1>
              <p className="hero-meta">
                Welcome back, <span>{user?.name || 'Guest'}</span>
                {' '}· {heroList.length} songs ready
              </p>
              <div className="hero-acts">
                {/* Play All — loads entire trending list as queue */}
                <button
                  className="btn-play-lg"
                  onClick={() => hero && play(hero, heroList)}
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
            <strong>2. Invalid key</strong> — Check <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 4 }}>backend/.env</code><br />
            <strong>3. Backend not running</strong> — Check terminal for [0] errors.<br />
            <span style={{ marginTop: 4, display: 'inline-block' }}>
              → Diagnose:{' '}
              <a href="http://localhost:3001/api/test-key" target="_blank" rel="noreferrer"
                style={{ color: '#93c5fd', textDecoration: 'underline' }}>
                http://localhost:3001/api/test-key
              </a>
            </span>
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
