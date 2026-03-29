/**
 * ============================================================
 *  GROOVIX — Global State & Context
 *  Author: Vishesh Jaiswal
 *  File:   src/context/index.jsx
 *
 *  Contains ALL React contexts used across the app:
 *    1. ThemeProvider    – dark / light mode (localStorage)
 *    2. AuthProvider     – real MongoDB login / logout / session restore
 *    3. LikedProvider    – liked songs (MongoDB for logged-in, localStorage for guest)
 *    4. PlaylistProvider – playlists (MongoDB for logged-in, localStorage for guest)
 *    5. PlayerProvider   – YouTube IFrame API engine (FIXED)
 *    6. ToastProvider    – toast notifications
 *
 *  ── PLAYER BUG FIX ──────────────────────────────────────────
 *
 *  ROOT CAUSE — timing:
 *    PlayerProvider mounts before Player.jsx renders.
 *    Any code that calls new YT.Player('yt-player-slot') inside
 *    PlayerProvider's useEffect runs before #yt-player-slot
 *    exists in the DOM → player silently fails → no audio.
 *
 *  FIX — initYTPlayer() is now exposed via context:
 *    PlayerProvider defines initYTPlayer() but does NOT call it.
 *    Player.jsx receives initYTPlayer from context and calls it
 *    inside its own useEffect — which runs AFTER React has
 *    painted the DOM, guaranteeing #yt-player-slot exists.
 *
 *  ── STALE CLOSURE FIX ───────────────────────────────────────
 *
 *  onStateChange is created once and freezes the values of
 *  queue/shuffle/repeat at creation time (always empty/false).
 *  Fix: queueRef/shuffleRef/repeatRef mirror live state and
 *  are read inside onStateChange instead of stale closure vars.
 *
 *  ── HOW AUDIO + VIDEO SYNC WORKS ───────────────────────────
 *
 *  ONE YT.Player instance lives in #yt-player-slot (Player.jsx).
 *  The video panel is hidden with opacity:0 + position:absolute
 *  so the iframe stays "visible" to YouTube — audio continues
 *  even when the video panel is closed.
 * ============================================================
 */

import {
  createContext, useContext, useState,
  useCallback, useEffect, useRef
} from 'react';


/* ══════════════════════════════════════════════
   1.  THEME CONTEXT
   Persists dark/light choice in localStorage.
   Sets data-theme on <html> for CSS variables.
   ══════════════════════════════════════════════ */
const ThemeCtx = createContext(null);

export function ThemeProvider({ children }) {

  const [theme, setTheme] = useState(
    () => localStorage.getItem('gvx-theme') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gvx-theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}
export const useTheme = () => useContext(ThemeCtx);


/* ══════════════════════════════════════════════
   2.  AUTH CONTEXT
   ──────────────────────────────────────────────
   Session stored in sessionStorage (clears on tab close).
   On app load: checks sessionStorage to restore session.
   login() handles both register and login modes.
   loginAsGuest() creates a local guest object (no backend).
   logout() clears sessionStorage + cookie via backend.
   ══════════════════════════════════════════════ */
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {

  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  /* ── SESSION RESTORE: runs once on app load ── */
  useEffect(() => {
    const saved = sessionStorage.getItem('gvx-user');
    if (!saved) { setLoading(false); return; }
    try { setUser(JSON.parse(saved)); }
    catch { sessionStorage.removeItem('gvx-user'); }
    setLoading(false);
  }, []);

  /* ── login(email, password, mode, formData) ──
     mode='login'    → apiLogin(email, password)
     mode='register' → apiRegister(formData)
     Throws on failure so Auth.jsx can show the error. */
  const login = async (email, password, mode = 'login', formData = null) => {
    const { apiLogin, apiRegister } = await import('../services/api.js');
    const res = mode === 'register'
      ? await apiRegister(formData)
      : await apiLogin(email, password);
    if (!res.success) throw new Error(res.message);
    sessionStorage.setItem('gvx-user', JSON.stringify(res.user));
    setUser(res.user);
  };

  /* ── loginAsGuest() — no backend call ── */
  const loginAsGuest = () => {
    setUser({ name: 'Guest', email: 'guest@groovix.app', avatar: '', isGuest: true });
  };

  /* ── logout() — clear cookie + session ── */
  const logout = async () => {
    const { apiLogout } = await import('../services/api.js');
    await apiLogout();
    sessionStorage.removeItem('gvx-user');
    setUser(null);
  };

  if (loading) return null;

  return (
    <AuthCtx.Provider value={{ user, login, loginAsGuest, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
export const useAuth = () => useContext(AuthCtx);


/* ══════════════════════════════════════════════
   3.  LIKED SONGS CONTEXT
   ──────────────────────────────────────────────
   Logged-in: synced with MongoDB via /api/liked
   Guest:     localStorage fallback
   ══════════════════════════════════════════════ */
const LikedCtx = createContext(null);

export function LikedProvider({ children }) {

  const [liked, setLiked] = useState([]);
  const { user }          = useAuth();

  useEffect(() => {
    if (!user) { setLiked([]); return; }
    if (user.isGuest) {
      try { setLiked(JSON.parse(localStorage.getItem('gvx-liked')) || []); }
      catch { setLiked([]); }
      return;
    }
    import('../services/api.js').then(({ apiGetLiked }) => {
      apiGetLiked()
        .then(res => { if (res.success) setLiked(res.songs); })
        .catch(err => console.error('[LikedProvider]', err));
    });
  }, [user]);

  const toggle = useCallback(async (song) => {
    if (!user) return;
    if (user.isGuest) {
      setLiked(prev => {
        const exists = prev.find(s => s.videoId === song.videoId);
        const next   = exists ? prev.filter(s => s.videoId !== song.videoId) : [song, ...prev];
        localStorage.setItem('gvx-liked', JSON.stringify(next));
        return next;
      });
      return;
    }
    const { apiToggleLiked } = await import('../services/api.js');
    const res = await apiToggleLiked(song);
    if (res.success) setLiked(res.songs);
  }, [user]);

  const isLiked = useCallback((id) => liked.some(s => s.videoId === id), [liked]);

  return (
    <LikedCtx.Provider value={{ liked, toggle, isLiked }}>
      {children}
    </LikedCtx.Provider>
  );
}
export const useLiked = () => useContext(LikedCtx);


/* ══════════════════════════════════════════════
   4.  PLAYLISTS CONTEXT
   ──────────────────────────────────────────────
   Logged-in: synced with MongoDB via /api/playlists
   Guest:     localStorage fallback
   ══════════════════════════════════════════════ */
const PlaylistCtx = createContext(null);

export function PlaylistProvider({ children }) {

  const [playlists, setPlaylists] = useState([]);
  const { user }                  = useAuth();

  useEffect(() => {
    if (!user) { setPlaylists([]); return; }
    if (user.isGuest) {
      try { setPlaylists(JSON.parse(localStorage.getItem('gvx-pl')) || []); }
      catch { setPlaylists([]); }
      return;
    }
    import('../services/api.js').then(({ apiGetPlaylists }) => {
      apiGetPlaylists()
        .then(res => { if (res.success) setPlaylists(res.playlists); })
        .catch(err => console.error('[PlaylistProvider]', err));
    });
  }, [user]);

  const create = async (name) => {
    const emojis = ['🎵', '🎶', '🎸', '🎹', '🥁', '🎺', '🎻', '🎤'];
    const emoji  = emojis[Math.floor(Math.random() * emojis.length)];
    if (!user || user.isGuest) {
      const p = { id: Date.now().toString(), name, songs: [], emoji };
      setPlaylists(prev => { const next = [p, ...prev]; localStorage.setItem('gvx-pl', JSON.stringify(next)); return next; });
      return p;
    }
    const { apiCreatePlaylist } = await import('../services/api.js');
    const res = await apiCreatePlaylist(name, emoji);
    if (res.success) { setPlaylists(prev => [res.playlist, ...prev]); return res.playlist; }
  };

  const addSong = async (pid, song) => {
    if (!user || user.isGuest) {
      setPlaylists(prev => {
        const next = prev.map(p =>
          (p.id === pid || p._id === pid) && !p.songs.find(s => s.videoId === song.videoId)
            ? { ...p, songs: [...p.songs, song] } : p
        );
        localStorage.setItem('gvx-pl', JSON.stringify(next));
        return next;
      });
      return;
    }
    const { apiAddSongToPlaylist } = await import('../services/api.js');
    const res = await apiAddSongToPlaylist(pid, song);
    if (res.success) setPlaylists(prev => prev.map(p => p._id === pid ? res.playlist : p));
  };

  const removeSong = async (pid, vid) => {
    if (!user || user.isGuest) {
      setPlaylists(prev => {
        const next = prev.map(p =>
          (p.id === pid || p._id === pid)
            ? { ...p, songs: p.songs.filter(s => s.videoId !== vid) } : p
        );
        localStorage.setItem('gvx-pl', JSON.stringify(next));
        return next;
      });
      return;
    }
    const { apiRemoveSongFromPlaylist } = await import('../services/api.js');
    const res = await apiRemoveSongFromPlaylist(pid, vid);
    if (res.success) setPlaylists(prev => prev.map(p => p._id === pid ? res.playlist : p));
  };

  const remove = async (id) => {
    if (!user || user.isGuest) {
      setPlaylists(prev => { const next = prev.filter(p => p.id !== id && p._id !== id); localStorage.setItem('gvx-pl', JSON.stringify(next)); return next; });
      return;
    }
    const { apiDeletePlaylist } = await import('../services/api.js');
    await apiDeletePlaylist(id);
    setPlaylists(prev => prev.filter(p => p._id !== id));
  };

  return (
    <PlaylistCtx.Provider value={{ playlists, create, addSong, removeSong, remove }}>
      {children}
    </PlaylistCtx.Provider>
  );
}
export const usePlaylists = () => useContext(PlaylistCtx);


/* ══════════════════════════════════════════════
   5.  PLAYER CONTEXT  ← THE CORE ENGINE
   ──────────────────────────────────────────────
   KEY CHANGE: initYTPlayer() is defined here but
   NOT called here. It is exposed via context so
   Player.jsx can call it inside its own useEffect,
   AFTER the #yt-player-slot div is painted.

   This permanently fixes the race condition where
   PlayerProvider mounted too early and the slot
   div didn't exist when the player tried to init.
   ══════════════════════════════════════════════ */
const PlayerCtx = createContext(null);

export function PlayerProvider({ children }) {

  const [queue,     setQueue]     = useState([]);
  const [idx,       setIdx]       = useState(0);
  const [playing,   setPlaying]   = useState(false);
  const [volume,    setVolRaw]    = useState(80);
  const [shuffle,   setShuffle]   = useState(false);
  const [repeat,    setRepeat]    = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [time,      setTime]      = useState(0);
  const [dur,       setDur]       = useState(0);

  /* ── Core player refs ── */
  const ytPlayer  = useRef(null);  /* YT.Player instance */
  const readyRef  = useRef(false); /* true after onReady fires */
  const pollRef   = useRef(null);  /* setInterval id for progress polling */
  const pendingId = useRef(null);  /* videoId queued before player was ready */
  const volumeRef = useRef(80);    /* volume ref so initYTPlayer closure sees latest value */

  /* ── Stale closure fix: refs that mirror live state ──
     onStateChange is created once — it cannot see state
     updates via closure. These refs are always current. */
  const queueRef   = useRef(queue);
  const shuffleRef = useRef(shuffle);
  const repeatRef  = useRef(repeat);

  useEffect(() => { queueRef.current   = queue;   }, [queue]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { repeatRef.current  = repeat;  }, [repeat]);
  useEffect(() => { volumeRef.current  = volume;  }, [volume]);

  const current = queue[idx] || null;


  /* ════════════════════════════════════════════
     initYTPlayer — exposed via context
     ─────────────────────────────────────────────
     Called by Player.jsx inside its useEffect,
     AFTER the DOM is painted and #yt-player-slot
     is guaranteed to exist.

     Do NOT call this anywhere inside PlayerProvider —
     only Player.jsx should call it.

     If the YouTube API script hasn't loaded yet when
     this is called, we set window.onYouTubeIframeAPIReady
     so YouTube calls us back when it's ready.
  ════════════════════════════════════════════ */
  const initYTPlayer = useCallback(() => {

    const createPlayer = () => {
      /* Guard: only ever create one instance */
      if (ytPlayer.current) return;

      /* At this point Player.jsx has mounted, so the slot div exists */
      const slot = document.getElementById('yt-player-slot');
      if (!slot) {
        /* Should never happen — but safety fallback */
        console.error('[Player] #yt-player-slot not found in DOM');
        return;
      }

      ytPlayer.current = new window.YT.Player(slot, {
        height: '100%',
        width:  '100%',
        playerVars: {
          autoplay:       1,  /* autoplay when video loads */
          controls:       0,  /* hide native YouTube controls */
          disablekb:      1,  /* disable keyboard shortcuts in iframe */
          fs:             0,  /* disable fullscreen button */
          iv_load_policy: 3,  /* hide annotations */
          modestbranding: 1,  /* minimal YouTube branding */
          rel:            0,  /* no related videos on end */
          showinfo:       0,  /* hide video title bar */
          playsinline:    1,  /* no auto-fullscreen on iOS */
          cc_load_policy: 0,  /* hide captions by default */
          enablejsapi:    1,  /* required for JS API control */
          origin:         window.location.origin, /* prevents postMessage CORS errors */
        },
        events: {

          /* ── onReady: iframe fully initialised ── */
          onReady: (e) => {
            readyRef.current = true;
            e.target.setVolume(volumeRef.current);

            /* If a song was clicked before player was ready, play it now */
            if (pendingId.current) {
              e.target.loadVideoById(pendingId.current);
              pendingId.current = null;
            }
          },

          /* ── onStateChange: handle play / pause / end ── */
          onStateChange: (e) => {
            const S = window.YT.PlayerState;

            if (e.data === S.PLAYING) {
              /* Started — begin 500ms progress polling */
              setPlaying(true);
              clearInterval(pollRef.current);
              pollRef.current = setInterval(() => {
                if (!ytPlayer.current?.getCurrentTime) return;
                setTime(Math.floor(ytPlayer.current.getCurrentTime()));
                setDur(Math.floor(ytPlayer.current.getDuration()));
              }, 500);
            }

            if (e.data === S.PAUSED) {
              setPlaying(false);
              clearInterval(pollRef.current);
            }

            if (e.data === S.ENDED) {
              /* Song ended — use refs (not stale state) to find next track */
              clearInterval(pollRef.current);
              setPlaying(false);
              setTime(0);

              setIdx(i => {
                const q = queueRef.current;
                if (q.length === 0) return i;
                if (shuffleRef.current) {
                  let next = Math.floor(Math.random() * q.length);
                  if (q.length > 1 && next === i) next = (next + 1) % q.length;
                  return next;
                }
                if (repeatRef.current) return (i + 1) % q.length;
                return Math.min(i + 1, q.length - 1);
              });
            }
          },
        },
      });
    };

    /* YouTube API already loaded → create player now */
    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      /* API not ready yet → YouTube will call this when ready */
      window.onYouTubeIframeAPIReady = createPlayer;
    }

  }, []); /* stable — never recreated */


  /* ════════════════════════════════════════════
     LOAD VIDEO — runs whenever current song changes
     ─────────────────────────────────────────────
     Triggered by: clicking a song, next/prev, song ending.
     If player ready  → loadVideoById immediately.
     If not ready yet → store in pendingId for onReady.
  ════════════════════════════════════════════ */
  useEffect(() => {
    if (!current) return;
    setTime(0);
    setDur(0);

    const tryLoad = () => {
      if (readyRef.current && ytPlayer.current) {
        try {
          ytPlayer.current.loadVideoById(current.videoId);
          ytPlayer.current.setVolume(volumeRef.current);
        } catch (err) {
          console.warn('[Player] loadVideoById failed, retrying...', err);
          setTimeout(tryLoad, 300);
        }
      } else {
        /* Player not initialised yet — onReady will play this */
        pendingId.current = current.videoId;
      }
    };

    tryLoad();
  }, [current?.videoId]); /* eslint-disable-line react-hooks/exhaustive-deps */

  /* Cleanup: stop polling on unmount */
  useEffect(() => () => clearInterval(pollRef.current), []);


  /* ════════════════════════════════════════════
     setVolume — syncs React state + live player
  ════════════════════════════════════════════ */
  const setVolume = useCallback((v) => {
    setVolRaw(v);
    volumeRef.current = v;
    if (ytPlayer.current && readyRef.current) {
      ytPlayer.current.setVolume(v);
      if (v === 0) ytPlayer.current.mute?.();
      else         ytPlayer.current.unMute?.();
    }
  }, []);


  /* ════════════════════════════════════════════
     play(song, newQueue?)
  ════════════════════════════════════════════ */
  const play = useCallback((song, newQueue = null) => {
    if (newQueue && newQueue.length > 0) {
      const i = newQueue.findIndex(s => s.videoId === song.videoId);
      setQueue(newQueue);
      setIdx(i >= 0 ? i : 0);
    } else {
      const existing = queue.findIndex(s => s.videoId === song.videoId);
      if (existing >= 0) {
        setIdx(existing);
      } else {
        setQueue(q => {
          const n = [...q, song];
          setTimeout(() => setIdx(n.length - 1), 0);
          return n;
        });
      }
    }
    setPlaying(true);
  }, [queue]);


  /* ── next / prev ── */
  const next = useCallback(() => {
    if (queue.length === 0) return;
    setIdx(i => {
      if (shuffle) return Math.floor(Math.random() * queue.length);
      if (repeat)  return (i + 1) % queue.length;
      return Math.min(i + 1, queue.length - 1);
    });
    setPlaying(true);
    setTime(0);
  }, [queue.length, shuffle, repeat]);

  const prev = useCallback(() => {
    if (idx > 0) { setIdx(i => i - 1); setPlaying(true); setTime(0); }
  }, [idx]);


  /* ── togglePlay ── */
  const togglePlay = useCallback(() => {
    if (!ytPlayer.current || !readyRef.current) return;
    if (playing) { ytPlayer.current.pauseVideo(); setPlaying(false); }
    else         { ytPlayer.current.playVideo();  setPlaying(true);  }
  }, [playing]);


  /* ── seekTo ── */
  const seekTo = useCallback((sec) => {
    if (ytPlayer.current && readyRef.current) {
      ytPlayer.current.seekTo(sec, true);
      setTime(sec);
    }
  }, []);


  return (
    <PlayerCtx.Provider value={{
      current, queue, idx, playing, volume, shuffle, repeat,
      videoOpen, time, dur,
      setVolume, setVideoOpen, play, next, prev,
      togglePlay, seekTo, setShuffle, setRepeat, setPlaying,
      initYTPlayer, /* ← Player.jsx calls this after it mounts */
    }}>
      {children}
    </PlayerCtx.Provider>
  );
}
export const usePlayer = () => useContext(PlayerCtx);


/* ══════════════════════════════════════════════
   6.  TOAST CONTEXT
   show("message") displays a toast for 2.6 seconds.
   ══════════════════════════════════════════════ */
const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const show = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {toast && (
        <div className="toast">
          <span className="ti">✦</span>
          {toast}
        </div>
      )}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);