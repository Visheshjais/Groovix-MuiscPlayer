/**
 * ============================================================
 *  GROOVIX — Auth Page (Login / Signup / Guest)
 *  Author: Vishesh Jaiswal
 *  File:   src/pages/Auth.jsx
 *
 *  Three modes:
 *    login  → email + password → POST /api/auth/login
 *    signup → name + email + password → POST /api/auth/register
 *    guest  → no server call, sets a local guest user object
 *
 *  On success:
 *    Backend sets 'gvx_token' HTTP-only cookie automatically.
 *    AuthProvider receives user object and stores it in state.
 *
 *  Errors:
 *    Displayed inline below the form fields.
 * ============================================================
 */

import { useState } from 'react';
import { useAuth }  from '../context';

export default function Auth() {

  /* ── Form mode: 'login' or 'signup' ── */
  const [mode,    setMode]    = useState('login');

  /* ── Form field values ── */
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');

  /* ── UI state ── */
  const [err,     setErr]     = useState('');
  const [loading, setLoading] = useState(false);

  /* ── Auth context: login() handles both register and login ── */
  const { login, loginAsGuest } = useAuth();


  /* ════════════════════════════════════════════
     FORM SUBMIT HANDLER
     ─────────────────────────────────────────────
     signup: sends JSON with name, email, password
             to POST /api/auth/register
     login:  calls login(email, password) which calls
             apiLogin() from the API service.

     Errors thrown by login() are caught and shown inline.
  ════════════════════════════════════════════ */
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);

    try {
      if (mode === 'signup') {

        /* ── Build JSON payload for register ── */
        await login(null, null, 'register', {
          name:     name.trim(),
          email:    email.trim(),
          password: pass,
        });

      } else {
        /* ── Login mode: email + password only ── */
        await login(email.trim(), pass);
      }

    } catch (e) {
      /* Show error message returned from backend */
      setErr(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="auth-wrap" data-theme="dark">

      {/* Decorative background orbs */}
      <div className="orb orb1" />
      <div className="orb orb2" />
      <div className="orb orb3" />

      <div className="auth-card">

        {/* ── Brand logo ── */}
        <div className="auth-brand">
          <div className="auth-brand-icon">🎵</div>
          <div className="auth-brand-name">Groo<em>vix</em></div>
        </div>

        {/* ── Title and subtitle change based on mode ── */}
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

          {/* Name field — signup mode only */}
          {mode === 'signup' && (
            <div className="field">
              <label>Your Name</label>
              <input
                type="text"
                placeholder="Vishesh Jaiswal"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          )}

          {/* Email field */}
          <div className="field">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password field */}
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={pass}
              onChange={e => setPass(e.target.value)}
              required
            />
          </div>

          {/* Inline error message from backend */}
          {err && <div className="auth-err">⚠ {err}</div>}

          {/* Submit button — shows loading state while waiting */}
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : mode === 'login' ? 'Sign In' : 'Create Account'
            }
          </button>

        </form>

        {/* ── Toggle between login and signup ── */}
        <div className="auth-switch">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => { setMode('signup'); setErr(''); }}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => { setMode('login'); setErr(''); }}>
                Sign in
              </button>
            </>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="auth-divider">
          <span>or</span>
        </div>

        {/* ── Guest mode — skips backend, uses localStorage ── */}
        <button
          className="btn-ghost"
          onClick={loginAsGuest}
        >
          Continue as Guest
        </button>

      </div>
    </div>
  );
}