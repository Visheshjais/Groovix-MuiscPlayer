/**
 * ============================================================
 *  GROOVIX — Topbar Component
 *  Author: Vishesh Jaiswal
 *  File:   src/components/Topbar.jsx
 *
 *  Sticky top bar shown on every page.
 *  Contains:
 *    • Optional breadcrumb (e.g. "Home / Search")
 *    • Search input — on submit navigates to /search?q=...
 *    • Theme toggle (dark ↔ light)
 *    • Notification bell icon
 * ============================================================
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context';

export default function Topbar({ bc }) {
  const [q, setQ]     = useState('');
  const nav           = useNavigate();
  const { theme, toggle } = useTheme();

  /* Navigate to search page on form submit */
  const submit = e => {
    e.preventDefault();
    if (q.trim()) {
      nav(`/search?q=${encodeURIComponent(q.trim())}`);
      setQ('');
    }
  };

  return (
    <div className="topbar">
      {/* Breadcrumb */}
      {bc && <div className="bc">Home <span>/ {bc}</span></div>}

      {/* Search form */}
      <form className="search-wrap" onSubmit={submit}>
        <span className="sico">⌕</span>
        <input
          className="search-input"
          placeholder="What do you want to play?"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </form>

      <div className="topbar-right">
        {/* Theme toggle */}
        <button className="ico-btn" onClick={toggle} title="Toggle theme">
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
        {/* Notifications (decorative) */}
        <button className="ico-btn" title="Notifications">🔔</button>
      </div>
    </div>
  );
}
