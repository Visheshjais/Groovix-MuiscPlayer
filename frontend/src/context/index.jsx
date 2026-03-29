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
 *    5. PlayerProvider   – YouTube IFrame API engine (TWO BUGS FIXED)
 *    6. ToastProvider    – toast notifications
 *
 *  ── PLAYER BUG FIXES ────────────────────────────────────────
 *
 *  BUG 1 — #yt-player-slot not in DOM when initPlayer() runs
 *    PROBLEM:
 *      PlayerProvider mounts before Player.jsx renders.
 *      So new YT.Player('yt-player-slot') targeted a div
 *      that didn't exist yet → player silently failed →
 *      iframe was never created → no audio ever played.
 *      Proof: document.querySelector('#yt-player-slot iframe')
 *      returned null on the live site.
 *    FIX:
 *      waitForSlot() polls every 100ms until the div appears
 *      in the DOM, then safely creates the player.
 *      Also passes the DOM element directly to YT.Player()
 *      instead of the string ID, to avoid any lookup race.
 *
 *  BUG 2 — Stale closure in onStateChange
 *    PROBLEM:
 *      onStateChange was created once inside useEffect([]).
 *      It captured queue, shuffle, repeat from the initial
 *      render — all empty/false — and never saw updates.
 *      So when a song ended, queue.length === 0 and the
 *      next-song logic always failed silently.
 *    FIX:
 *      Three refs (queueRef, shuffleRef, repeatRef) mirror
 *      live state. Separate useEffects keep them in sync.
 *      onStateChange reads from refs — always current.
 *
 *  ── HOW AUDIO + VIDEO SYNC WORKS ───────────────────────────
 *
 *  YouTube IFrame API is loaded via <script> in index.html.
 *  ONE YT.Player instance lives in #yt-player-slot (Player.jsx).
 *  The video panel is hidden with opacity:0 + position:absolute
 *  so the iframe stays "visible" to YouTube — audio keeps
 *  playing even when the video panel is closed.
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
    if (!saved) {
      setLoading(false);
      return;
    }
    try {
      setUser(JSON.parse(saved));
    } catch {
      sessionStorage.removeItem('gvx-user');
    }
    setLoading(false);
  }, []);

  /* ── login(email, password, mode, formData) ──
     mode = 'login'    → calls apiLogin
     mode = 'register' → calls apiRegister
     On success: saves user to sessionStorage.
     On failure: throws so Auth.jsx can show the error. */
  const login = async (email, password, mode = 'login', formData = null) => {
    const { apiLogin, apiRegister } = await import('../services/api.js');

    const res = mode === 'register'
      ? await apiRegister(formData)
      : await apiLogin(email, password);

    if (!res.success) throw new Error(res.message);

    sessionStorage.setItem('gvx-user', JSON.stringify(res.user));
    setUser(res.user);
  };

  /* ── loginAsGuest() ──
     No backend call. isGuest: true tells providers
     to use localStorage instead of MongoDB. */
  const loginAsGuest = () => {
    setUser({
      name:    'Guest',
      email:   'guest@groovix.app',
      avatar:  '',
      isGuest: true,
    });
  };

  /* ── logout() ──
     Clears JWT cookie on server + sessionStorage locally. */
  const logout = async () => {
    const { apiLogout } = await import('../services/api.js');
    await apiLogout();
    sessionStorage.removeItem('gvx-user');
    setUser(null);
  };

  /* Render nothing while checking session to avoid flash */
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

  /* Load liked songs whenever user changes */
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
        .catch(err => console.error('[LikedProvider] fetch error:', err));
    });
  }, [user]);

  /* toggle(song) — add or remove a liked song */
  const toggle = useCallback(async (song) => {
    if (!user) return;

    if (user.isGuest) {
      setLiked(prev => {
        const exists = prev.find(s => s.videoId === song.videoId);
        const next   = exists
          ? prev.filter(s => s.videoId !== song.videoId)
          : [song, ...prev];
        localStorage.setItem('gvx-liked', JSON.stringify(next));
        return next;
      });
      return;
    }

    const { apiToggleLiked } = await import('../services/api.js');
    const res = await apiToggleLiked(song);
    if (res.success) setLiked(res.songs);
  }, [user]);

  /* isLiked — fast local check, no API call needed */
  const isLiked = useCallback(
    (id) => liked.some(s => s.videoId === id),
    [liked]
  );

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

   ID compatibility:
     Logged-in → playlist._id = MongoDB ObjectId string
     Guest     → playlist.id  = Date.now() string (legacy)
   Code checks p._id || p.id everywhere for compatibility.
   ══════════════════════════════════════════════ */
const PlaylistCtx = createContext(null);

export function PlaylistProvider({ children }) {

  const [playlists, setPlaylists] = useState([]);
  const { user }                  = useAuth();

  /* Load playlists when user changes */
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
        .catch(err => console.error('[PlaylistProvider] fetch error:', err));
    });
  }, [user]);

  /* create(name) — new empty playlist */
  const create = async (name) => {
    const emojis = ['🎵', '🎶', '🎸', '🎹', '🥁', '🎺', '🎻', '🎤'];
    const emoji  = emojis[Math.floor(Math.random() * emojis.length)];

    if (!user || user.isGuest) {
      const p = { id: Date.now().toString(), name, songs: [], emoji };
      setPlaylists(prev => {
        const next = [p, ...prev];
        localStorage.setItem('gvx-pl', JSON.stringify(next));
        return next;
      });
      return p;
    }

    const { apiCreatePlaylist } = await import('../services/api.js');
    const res = await apiCreatePlaylist(name, emoji);
    if (res.success) {
      setPlaylists(prev => [res.playlist, ...prev]);
      return res.playlist;
    }
  };

  /* addSong(pid, song) — add song to playlist */
  const addSong = async (pid, song) => {
    if (!user || user.isGuest) {
      setPlaylists(prev => {
        const next = prev.map(p =>
          (p.id === pid || p._id === pid) && !p.songs.find(s => s.videoId === song.videoId)
            ? { ...p, songs: [...p.songs, song] }
            : p
        );
        localStorage.setItem('gvx-pl', JSON.stringify(next));
        return next;
      });
      return;
    }

    const { apiAddSongToPlaylist } = await import('../services/api.js');
    const res = await apiAddSongToPlaylist(pid, song);
    if (res.success) {
      setPlaylists(prev => prev.map(p => p._id === pid ? res.playlist : p));
    }
  };

  /* removeSong(pid, videoId) — remove song from playlist */
  const removeSong = async (pid, vid) => {
    if (!user || user.isGuest) {
      setPlaylists(prev => {
        const next = prev.map(p =>
          (p.id === pid || p._id === pid)
            ? { ...p, songs: p.songs.filter(s => s.videoId !== vid) }
            : p
        );
        localStorage.setItem('gvx-pl', JSON.stringify(next));
        return next;
      });
      return;
    }

    const { apiRemoveSongFromPlaylist } = await import('../services/api.js');
    const res = await apiRemoveSongFromPlaylist(pid, vid);
    if (res.success) {
      setPlaylists(prev => prev.map(p => p._id === pid ? res.playlist : p));
    }
  };

  /* remove(id) — delete entire playlist */
  const remove = async (id) => {
    if (!user || user.isGuest) {
      setPlaylists(prev => {
        const next = prev.filter(p => p.id !== id && p._id !== id);
        localStorage.setItem('gvx-pl', JSON.stringify(next));
        return next;
      });
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
   TWO BUGS FIXED (see file header for full details):

   Bug 1 FIX — waitForSlot():
     Polls every 100ms until #yt-player-slot exists in DOM.
     Then passes the element directly to new YT.Player().
     Without this, the player silently failed because
     PlayerProvider mounts before Player.jsx renders the div.

   Bug 2 FIX — queueRef / shuffleRef / repeatRef:
     Mirrors live state into refs so onStateChange (which is
     created once and has a stale closure) always reads the
     current values when deciding what to play next.
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

  /* ── BUG 2 FIX: live-state mirrors for onStateChange ──
     onStateChange is created once on mount. Any state it
     closes over (queue, shuffle, repeat) is frozen at that
     point. These refs are kept in sync by useEffects below,
     so onStateChange always reads the current values. */
  const queueRef   = useRef(queue);
  const shuffleRef = useRef(shuffle);
  const repeatRef  = useRef(repeat);

  useEffect(() => { queueRef.current   = queue;   }, [queue]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { repeatRef.current  = repeat;  }, [repeat]);

  const current = queue[idx] || null;


  /* ════════════════════════════════════════════
     INIT PLAYER — runs once on mount
     ─────────────────────────────────────────────
     Creates the YT.Player instance attached to
     the #yt-player-slot div in Player.jsx.

     BUG 1 FIX: waitForSlot() polls until the div
     exists before calling initPlayer(). This solves
     the timing issue where PlayerProvider mounts
     before Player.jsx renders the slot div.
  ════════════════════════════════════════════ */
  useEffect(() => {

    const initPlayer = () => {
      /* Guard: only ever create one instance */
      if (ytPlayer.current) return;

      /* BUG 1 FIX: get the element directly — at this point
         waitForSlot() has confirmed the div is in the DOM */
      const slot = document.getElementById('yt-player-slot');
      if (!slot) return; /* safety guard */

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
            e.target.setVolume(volume);

            /* If a song was clicked before the player was ready,
               play it now that the player has initialised */
            if (pendingId.current) {
              e.target.loadVideoById(pendingId.current);
              pendingId.current = null;
            }
          },

          /* ── onStateChange: handle play / pause / end ── */
          onStateChange: (e) => {
            const S = window.YT.PlayerState;

            if (e.data === S.PLAYING) {
              /* Song playing — start polling for progress bar */
              setPlaying(true);
              clearInterval(pollRef.current);
              pollRef.current = setInterval(() => {
                if (!ytPlayer.current?.getCurrentTime) return;
                setTime(Math.floor(ytPlayer.current.getCurrentTime()));
                setDur(Math.floor(ytPlayer.current.getDuration()));
              }, 500);
            }

            if (e.data === S.PAUSED) {
              /* Paused — stop polling */
              setPlaying(false);
              clearInterval(pollRef.current);
            }

            if (e.data === S.ENDED) {
              /* Song ended — advance to next track.
                 BUG 2 FIX: read refs not state.
                 State is frozen at creation time here.
                 Refs are always up-to-date. */
              clearInterval(pollRef.current);
              setPlaying(false);
              setTime(0);

              setIdx(i => {
                const q = queueRef.current; /* live queue */
                if (q.length === 0) return i;

                if (shuffleRef.current) {
                  /* Shuffle: random track, avoid same index */
                  let next = Math.floor(Math.random() * q.length);
                  if (q.length > 1 && next === i) next = (next + 1) % q.length;
                  return next;
                }

                if (repeatRef.current) {
                  /* Repeat all: loop back after last track */
                  return (i + 1) % q.length;
                }

                /* Normal: advance one, stop at last track */
                return Math.min(i + 1, q.length - 1);
              });
            }
          },
        },
      });
    };

    /* ── BUG 1 FIX: waitForSlot ──────────────────────────
       PlayerProvider mounts BEFORE Player.jsx renders the
       #yt-player-slot div. Without this wait, initPlayer()
       runs against a non-existent element and silently fails.

       We poll every 100ms. As soon as the slot div appears,
       we proceed to init (or wait for the YT API if needed). */
    const waitForSlot = () => {
      const slot = document.getElementById('yt-player-slot');
      if (!slot) {
        /* Div not in DOM yet — check again in 100ms */
        setTimeout(waitForSlot, 100);
        return;
      }
      /* Slot exists — safe to create the player now */
      if (window.YT && window.YT.Player) {
        /* YouTube API already loaded — init immediately */
        initPlayer();
      } else {
        /* YouTube API not ready — register the global callback.
           YouTube calls window.onYouTubeIframeAPIReady once
           the iframe_api script finishes loading. */
        window.onYouTubeIframeAPIReady = initPlayer;
      }
    };

    waitForSlot();

    /* Cleanup: stop progress polling on unmount */
    return () => clearInterval(pollRef.current);

  }, []); /* runs once on mount — intentional */


  /* ════════════════════════════════════════════
     LOAD VIDEO — runs whenever current song changes
     ─────────────────────────────────────────────
     Triggered by: user clicking a song, next/prev,
     or song ending and idx incrementing.

     1. Reset progress bar to zero.
     2. If player ready  → loadVideoById immediately.
     3. If player not ready → store in pendingId.
        onReady picks it up when player initialises.
     4. If loadVideoById throws (rare race) → retry 300ms.
  ════════════════════════════════════════════ */
  useEffect(() => {
    if (!current) return;

    setTime(0);
    setDur(0);

    const tryLoad = () => {
      if (readyRef.current && ytPlayer.current) {
        try {
          ytPlayer.current.loadVideoById(current.videoId);
          ytPlayer.current.setVolume(volume);
        } catch (err) {
          /* Rare race: iframe not fully attached yet — retry */
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


  /* ════════════════════════════════════════════
     setVolume — syncs React state + live player
  ════════════════════════════════════════════ */
  const setVolume = useCallback((v) => {
    setVolRaw(v);
    if (ytPlayer.current && readyRef.current) {
      ytPlayer.current.setVolume(v);
      if (v === 0) ytPlayer.current.mute?.();
      else         ytPlayer.current.unMute?.();
    }
  }, []);


  /* ════════════════════════════════════════════
     play(song, newQueue?)
     ─────────────────────────────────────────────
     newQueue provided → replace entire queue, jump to song.
     No newQueue:
       Song in queue already → jump to it.
       New song → append to queue, jump to new end.
     Changing idx triggers the LOAD VIDEO effect above.
  ════════════════════════════════════════════ */
  const play = useCallback((song, newQueue = null) => {
    if (newQueue && newQueue.length > 0) {
      const i = newQueue.findIndex(s => s.videoId === song.videoId);
      setQueue(newQueue);
      setIdx(i >= 0 ? i : 0);
    } else {
      const existing = queue.findIndex(s => s.videoId === song.videoId);
      if (existing >= 0) {
        /* Already in queue — just jump to it */
        setIdx(existing);
      } else {
        /* New song — append and jump */
        setQueue(q => {
          const n = [...q, song];
          setTimeout(() => setIdx(n.length - 1), 0);
          return n;
        });
      }
    }
    setPlaying(true);
  }, [queue]);


  /* ════════════════════════════════════════════
     next / prev — manual track navigation
  ════════════════════════════════════════════ */
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


  /* ════════════════════════════════════════════
     togglePlay — pause / resume current song
  ════════════════════════════════════════════ */
  const togglePlay = useCallback(() => {
    if (!ytPlayer.current || !readyRef.current) return;
    if (playing) { ytPlayer.current.pauseVideo(); setPlaying(false); }
    else         { ytPlayer.current.playVideo();  setPlaying(true);  }
  }, [playing]);


  /* ════════════════════════════════════════════
     seekTo(sec) — jump to position in current song
  ════════════════════════════════════════════ */
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