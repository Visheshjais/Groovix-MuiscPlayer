/**
 * ============================================================
 *  GROOVIX — Auth Page (Login / Signup / Guest)
 *  Author: Vishesh Jaiswal
 *  File:   src/pages/Auth.jsx
 *
 *  Client-side only auth — no real server authentication.
 *  Stores user object in localStorage via AuthProvider.
 *
 *  Three modes toggled by the "Sign In / Sign Up" link:
 *    login  — email + password
 *    signup — name + email + password
 *  Guest mode — one click, logs in as "Guest"
 * ============================================================
 */

import { useState } from 'react';
import { useAuth }  from '../context';

export default function Auth() {
  const [mode,  setMode]  = useState('login');
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');
  const [err,   setErr]   = useState('');

  const { login } = useAuth();

  const submit = e => {
    e.preventDefault();
    setErr('');

    /* Basic validation */
    if (mode === 'signup' && !name.trim())
      return setErr('Please enter your name.');
    if (!email.includes('@'))
      return setErr('Enter a valid email address.');
    if (pass.length < 6)
      return setErr('Password must be at least 6 characters.');

    /* Login — derive display name from email if signup not used */
    login(mode === 'signup' ? name : email.split('@')[0], email);
  };

  return (
    /* Force dark theme on auth page for consistent look */
    <div className="auth-wrap" data-theme="dark">
      <div className="orb orb1" />
      <div className="orb orb2" />
      <div className="orb orb3" />

      <div className="auth-card">
        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand-icon">🎵</div>
          <div className="auth-brand-name">Groo<em>vix</em></div>
        </div>

        <h2 className="auth-title">
          {mode === 'login' ? 'Welcome back' : 'Join Groovix'}
        </h2>
        <p className="auth-sub">
          {mode === 'login'
            ? 'Sign in to continue your music journey'
            : 'Create your free account and start listening'
          }
        </p>

        <form onSubmit={submit}>
          {/* Name field (signup only) */}
          {mode === 'signup' && (
            <div className="field">
              <label>Your Name</label>
              <input
                type="text"
                placeholder="Vishesh Jaiswal"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          )}

          <div className="field">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={pass}
              onChange={e => setPass(e.target.value)}
            />
          </div>

          {/* Validation error */}
          {err && <div className="auth-err">⚠ {err}</div>}

          <button type="submit" className="btn-primary">
            {mode === 'login' ? '→ Sign In' : '✦ Create Account'}
          </button>

          <div className="auth-or"><span>or</span></div>

          {/* Guest login */}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => login('Guest', 'guest@groovix.app')}
          >
            👤 Continue as Guest
          </button>
        </form>

        {/* Toggle mode */}
        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setErr(''); }}>
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>

        <p className="auth-footer">
          Created by <strong>Vishesh Jaiswal</strong> · © 2025 Groovix
        </p>
      </div>
    </div>
  );
}
