/**
 * ============================================================
 *  GROOVIX — Global State & Context
 *  Author: Vishesh Jaiswal
 *  File:   src/context/index.jsx
 *
 *  Contains ALL React contexts used across the app:
 *    1. ThemeProvider    – dark / light mode (localStorage — unchanged)
 *    2. AuthProvider     – real MongoDB login / logout / session restore
 *    3. LikedProvider    – liked songs (MongoDB for logged-in, localStorage for guest)
 *    4. PlaylistProvider – playlists (MongoDB for logged-in, localStorage for guest)
 *    5. PlayerProvider   – YouTube IFrame API engine (FIXED — stale closure bug)
 *    6. ToastProvider    – toast notifications (unchanged)
 *
 *  ── WHAT CHANGED FROM LOCALSTORAGE VERSION ─────────────────
 *
 *  AuthProvider:
 *    OLD: stored user in localStorage, no real password, no backend
 *    NEW: calls /api/auth/login and /api/auth/register on backend
 *         session stored in sessionStorage (clears on tab close)
 *         on app load, checks sessionStorage to restore session
 *         guest mode still works — guest user has isGuest: true flag
 *
 *  LikedProvider:
 *    OLD: stored liked songs array in localStorage
 *    NEW: logged-in users → synced with MongoDB via /api/liked
 *         guest users    → still uses localStorage as fallback
 *
 *  PlaylistProvider:
 *    OLD: stored playlists in localStorage
 *    NEW: logged-in users → synced with MongoDB via /api/playlists
 *         guest users    → still uses localStorage as fallback
 *         playlist _id is MongoDB ObjectId (not Date.now() string)
 *
 *  ── HOW AUDIO + VIDEO SYNC WORKS ──────────────────────────
 *
 *  We load the YouTube IFrame Player API via <script> in index.html.
 *  This gives us window.YT.Player — a real JS class with methods:
 *
 *    player.loadVideoById(id)   → load + autoplay a video
 *    player.playVideo()         → resume
 *    player.pauseVideo()        → pause
 *    player.seekTo(sec, true)   → jump to position
 *    player.setVolume(0-100)    → set volume
 *    player.getCurrentTime()    → current time in seconds
 *    player.getDuration()       → total duration in seconds
 *
 *  ONE player instance is created once (in #yt-player-slot div).
 *  The div lives permanently in the video panel in Player.jsx.
 *
 *  ── WHY AUDIO DOESN'T STOP WHEN YOU CLOSE VIDEO MODE ──────
 *
 *  The video panel is hidden with opacity:0 + position:absolute.
 *  This keeps the iframe visible to YouTube (not clipped),
 *  so audio keeps playing even when panel is "closed".
 *
 *  ── BUG FIX: STALE CLOSURE IN onStateChange ────────────────
 *
 *  PROBLEM (old code):
 *    The onStateChange callback was created once inside useEffect([]).
 *    It captured queue, shuffle, repeat from the initial render —
 *    all were empty/false at that point and NEVER updated inside
 *    the callback, because closures in JS freeze the values they
 *    see at creation time. So when a song ended:
 *      queue.length === 0  → nothing played next
 *
 *  FIX (new code):
 *    Three refs are added: queueRef, shuffleRef, repeatRef.
 *    Separate useEffects keep these refs in sync with state.
 *    onStateChange reads from the refs instead of the stale
 *    closure values — refs are always current.
 * ============================================================
 */

import {
  createContext, useContext, useState,
  useCallback, useEffect, useRef
} from 'react';


/* ══════════════════════════════════════════════
   1.  THEME CONTEXT  (unchanged)
   Persists choice in localStorage.
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
   2.  AUTH CONTEXT  (updated — sessionStorage session)
   ──────────────────────────────────────────────
   Session stored in sessionStorage (clears on tab close).
   On app load: checks sessionStorage to restore session.
   login() handles both register and login modes.
   loginAsGuest() creates a local guest object (no backend call).
   logout() clears sessionStorage + cookie via /api/auth/logout.
   ══════════════════════════════════════════════ */
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {

  /* Current logged-in user — null if not authenticated */
  const [user,    setUser]    = useState(null);

  /* Loading while checking existing session on app startup */
  const [loading, setLoading] = useState(true);


  /* ════════════════════════════════════════════
     SESSION RESTORE — runs once on app load
     ─────────────────────────────────────────────
     Checks sessionStorage for saved user.
     sessionStorage clears automatically when tab is closed.
     If found → restores user session silently.
     If not found → user stays null (auth page shows).
     Either way → sets loading false so app renders.
  ════════════════════════════════════════════ */
  useEffect(() => {
    /* Check sessionStorage — empty if tab was closed */
    const saved = sessionStorage.getItem('gvx-user');
    if (!saved) {
      setLoading(false);
      return;
    }

    /* Session exists — restore user from sessionStorage */
    try {
      setUser(JSON.parse(saved));
    } catch {
      /* Invalid data — ignore and show auth page */
      sessionStorage.removeItem('gvx-user');
    }

    setLoading(false);
  }, []);


  /* ════════════════════════════════════════════
     login(email, password, mode, formData)
     ─────────────────────────────────────────────
     Unified function for register and login.
     mode = 'login'    → calls apiLogin(email, password)
     mode = 'register' → calls apiRegister(formData)

     On success: saves user to sessionStorage + sets state.
     On failure: throws error so Auth.jsx shows it inline.
  ════════════════════════════════════════════ */
  const login = async (email, password, mode = 'login', formData = null) => {
    const { apiLogin, apiRegister } = await import('../services/api.js');

    const res = mode === 'register'
      ? await apiRegister(formData)
      : await apiLogin(email, password);

    if (!res.success) throw new Error(res.message);

    /* Store user in sessionStorage — clears on tab close */
    sessionStorage.setItem('gvx-user', JSON.stringify(res.user));
    setUser(res.user);
  };


  /* ════════════════════════════════════════════
     loginAsGuest()
     ─────────────────────────────────────────────
     No backend call — sets a local guest user object.
     isGuest: true signals providers to use localStorage.
  ════════════════════════════════════════════ */
  const loginAsGuest = () => {
    setUser({
      name:    'Guest',
      email:   'guest@groovix.app',
      avatar:  '',
      isGuest: true,
    });
  };


  /* ════════════════════════════════════════════
     logout()
     ─────────────────────────────────────────────
     Calls /api/auth/logout to clear JWT cookie on server.
     Clears sessionStorage and user state locally.
  ════════════════════════════════════════════ */
  const logout = async () => {
    const { apiLogout } = await import('../services/api.js');
    await apiLogout();
    sessionStorage.removeItem('gvx-user'); /* clear session on logout */
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
   3.  LIKED SONGS CONTEXT  (updated)
   ──────────────────────────────────────────────
   Logged-in: liked songs fetched from / saved to MongoDB.
   Guest:     localStorage fallback (original behaviour).
   ══════════════════════════════════════════════ */
const LikedCtx = createContext(null);

export function LikedProvider({ children }) {

  const [liked, setLiked] = useState([]);
  const { user }          = useAuth();


  /* ════════════════════════════════════════════
     Load liked songs whenever user changes
     (login, logout, switch account)
  ════════════════════════════════════════════ */
  useEffect(() => {

    /* Logged out — clear state */
    if (!user) { setLiked([]); return; }

    if (user.isGuest) {
      /* Guest → localStorage fallback */
      try { setLiked(JSON.parse(localStorage.getItem('gvx-liked')) || []); }
      catch { setLiked([]); }
      return;
    }

    /* Logged-in → fetch from MongoDB */
    import('../services/api.js').then(({ apiGetLiked }) => {
      apiGetLiked()
        .then(res => { if (res.success) setLiked(res.songs); })
        .catch(err => console.error('[LikedProvider] fetch error:', err));
    });

  }, [user]);


  /* ════════════════════════════════════════════
     toggle(song) — add or remove a liked song
  ════════════════════════════════════════════ */
  const toggle = useCallback(async (song) => {

    if (!user) return;

    if (user.isGuest) {
      /* Guest: localStorage */
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

    /* Logged-in: sync with MongoDB */
    const { apiToggleLiked } = await import('../services/api.js');
    const res = await apiToggleLiked(song);
    if (res.success) setLiked(res.songs);

  }, [user]);


  /* isLiked — fast local state check, no API call needed */
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
   4.  PLAYLISTS CONTEXT  (updated)
   ──────────────────────────────────────────────
   Logged-in: playlists fetched from / saved to MongoDB.
   Guest:     localStorage fallback (original behaviour).

   Note on IDs:
     Logged-in → playlist._id is MongoDB ObjectId string
     Guest     → playlist.id  is Date.now() string (legacy)
   Both work — code checks p._id || p.id for compatibility.
   ══════════════════════════════════════════════ */
const PlaylistCtx = createContext(null);

export function PlaylistProvider({ children }) {

  const [playlists, setPlaylists] = useState([]);
  const { user }                  = useAuth();


  /* ── Load playlists when user changes ── */
  useEffect(() => {

    if (!user) { setPlaylists([]); return; }

    if (user.isGuest) {
      try { setPlaylists(JSON.parse(localStorage.getItem('gvx-pl')) || []); }
      catch { setPlaylists([]); }
      return;
    }

    /* Logged-in → fetch from MongoDB */
    import('../services/api.js').then(({ apiGetPlaylists }) => {
      apiGetPlaylists()
        .then(res => { if (res.success) setPlaylists(res.playlists); })
        .catch(err => console.error('[PlaylistProvider] fetch error:', err));
    });

  }, [user]);


  /* ════════════════════════════════════════════
     create(name) — create a new empty playlist
  ════════════════════════════════════════════ */
  const create = async (name) => {
    const emojis = ['🎵', '🎶', '🎸', '🎹', '🥁', '🎺', '🎻', '🎤'];
    const emoji  = emojis[Math.floor(Math.random() * emojis.length)];

    if (!user || user.isGuest) {
      /* Guest: localStorage */
      const p = { id: Date.now().toString(), name, songs: [], emoji };
      setPlaylists(prev => {
        const next = [p, ...prev];
        localStorage.setItem('gvx-pl', JSON.stringify(next));
        return next;
      });
      return p;
    }

    /* Logged-in: sync with MongoDB */
    const { apiCreatePlaylist } = await import('../services/api.js');
    const res = await apiCreatePlaylist(name, emoji);
    if (res.success) {
      setPlaylists(prev => [res.playlist, ...prev]);
      return res.playlist;
    }
  };


  /* ════════════════════════════════════════════
     addSong(pid, song) — add song to playlist
  ════════════════════════════════════════════ */
  const addSong = async (pid, song) => {

    if (!user || user.isGuest) {
      /* Guest: localStorage */
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

    /* Logged-in: sync with MongoDB */
    const { apiAddSongToPlaylist } = await import('../services/api.js');
    const res = await apiAddSongToPlaylist(pid, song);
    if (res.success) {
      setPlaylists(prev => prev.map(p => p._id === pid ? res.playlist : p));
    }
  };


  /* ════════════════════════════════════════════
     removeSong(pid, videoId) — remove song from playlist
  ════════════════════════════════════════════ */
  const removeSong = async (pid, vid) => {

    if (!user || user.isGuest) {
      /* Guest: localStorage */
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

    /* Logged-in: sync with MongoDB */
    const { apiRemoveSongFromPlaylist } = await import('../services/api.js');
    const res = await apiRemoveSongFromPlaylist(pid, vid);
    if (res.success) {
      setPlaylists(prev => prev.map(p => p._id === pid ? res.playlist : p));
    }
  };


  /* ════════════════════════════════════════════
     remove(id) — delete entire playlist
  ════════════════════════════════════════════ */
  const remove = async (id) => {

    if (!user || user.isGuest) {
      /* Guest: localStorage */
      setPlaylists(prev => {
        const next = prev.filter(p => p.id !== id && p._id !== id);
        localStorage.setItem('gvx-pl', JSON.stringify(next));
        return next;
      });
      return;
    }

    /* Logged-in: sync with MongoDB */
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
   FIXED: Stale closure bug in onStateChange.

   The YouTube IFrame API fires onStateChange from inside
   a native JS callback — it has NO access to React state.
   Any state variable read inside onStateChange is frozen
   at the value it had when the callback was first created
   (i.e. the initial render — all empty / false).

   Solution: mirror queue, shuffle, repeat into refs.
   Refs are mutable objects — their .current always points
   to the latest value. Three useEffects below keep the
   refs perfectly in sync whenever state changes.

   onStateChange now reads queueRef.current etc. instead
   of the stale closure values, so next-song logic always
   uses the real live queue.
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

  /* ── YouTube player instance + control flags ── */
  const ytPlayer  = useRef(null);   /* YT.Player instance */
  const readyRef  = useRef(false);  /* true after onReady fires */
  const pollRef   = useRef(null);   /* setInterval id for time updates */
  const pendingId = useRef(null);   /* videoId waiting for player to be ready */

  /* ── STALE CLOSURE FIX: refs that mirror live state ──
     onStateChange is created once and can't see state updates.
     These refs are always current — update them via useEffect. */
  const queueRef   = useRef(queue);
  const shuffleRef = useRef(shuffle);
  const repeatRef  = useRef(repeat);

  /* Keep refs in sync with state on every change */
  useEffect(() => { queueRef.current   = queue;   }, [queue]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { repeatRef.current  = repeat;  }, [repeat]);

  const current = queue[idx] || null;


  /* ════════════════════════════════════════════
     INIT PLAYER — runs once on mount
     ─────────────────────────────────────────────
     Creates the YT.Player instance attached to #yt-player-slot.
     If the API script has already loaded (window.YT exists),
     we create immediately. Otherwise we set onYouTubeIframeAPIReady
     so the API calls us when it's done loading.

     onReady:
       Marks readyRef true, sets volume, plays any pending video
       that was clicked before the player finished initialising.

     onStateChange:
       Tracks PLAYING / PAUSED / ENDED states.
       PLAYING  → starts the 500ms poll for currentTime / duration.
       PAUSED   → stops the poll.
       ENDED    → advances to the next track using refs (not stale state).

     NOTE: reads queueRef / shuffleRef / repeatRef — never raw state —
     because this callback is created once and state would be stale.
  ════════════════════════════════════════════ */
  useEffect(() => {
    const initPlayer = () => {
      /* Guard: only create one instance */
      if (ytPlayer.current) return;

      ytPlayer.current = new window.YT.Player('yt-player-slot', {
        height: '100%',
        width:  '100%',
        playerVars: {
          autoplay:       1,   /* start playing as soon as video loads */
          controls:       0,   /* hide YouTube's native controls */
          disablekb:      1,   /* disable keyboard shortcuts inside iframe */
          fs:             0,   /* disable fullscreen button */
          iv_load_policy: 3,   /* hide video annotations */
          modestbranding: 1,   /* minimal YouTube branding */
          rel:            0,   /* don't show related videos on end */
          showinfo:       0,   /* hide video title bar */
          playsinline:    1,   /* prevent fullscreen on iOS */
          cc_load_policy: 0,   /* hide closed captions by default */
          enablejsapi:    1,   /* required for JS API control */
          origin:         window.location.origin, /* avoids cross-origin playback blocks */
        },
        events: {

          /* ── onReady: player DOM is fully initialised ── */
          onReady: (e) => {
            readyRef.current = true;
            e.target.setVolume(volume);

            /* Play any song that was clicked before player was ready */
            if (pendingId.current) {
              e.target.loadVideoById(pendingId.current);
              pendingId.current = null;
            }
          },

          /* ── onStateChange: react to play / pause / end ── */
          onStateChange: (e) => {
            const S = window.YT.PlayerState;

            if (e.data === S.PLAYING) {
              /* Song started — begin polling for progress bar */
              setPlaying(true);
              clearInterval(pollRef.current);
              pollRef.current = setInterval(() => {
                if (!ytPlayer.current?.getCurrentTime) return;
                setTime(Math.floor(ytPlayer.current.getCurrentTime()));
                setDur(Math.floor(ytPlayer.current.getDuration()));
              }, 500);
            }

            if (e.data === S.PAUSED) {
              /* Song paused — stop polling */
              setPlaying(false);
              clearInterval(pollRef.current);
            }

            if (e.data === S.ENDED) {
              /* Song finished — advance to next track.
                 IMPORTANT: Read from refs, NOT state.
                 State values here are frozen at initial render
                 (stale closure). Refs are always up-to-date. */
              clearInterval(pollRef.current);
              setPlaying(false);
              setTime(0);

              setIdx(i => {
                const q = queueRef.current;   /* live queue via ref */
                if (q.length === 0) return i;

                if (shuffleRef.current) {
                  /* Shuffle: pick a random track (avoid same index) */
                  let next = Math.floor(Math.random() * q.length);
                  if (q.length > 1 && next === i) next = (next + 1) % q.length;
                  return next;
                }

                if (repeatRef.current) {
                  /* Repeat all: loop back to start after last track */
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

    /* API already loaded → init immediately */
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      /* API not ready yet → set the global callback YouTube will call */
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    /* Cleanup: stop progress polling on unmount */
    return () => clearInterval(pollRef.current);
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps — intentionally runs once */


  /* ════════════════════════════════════════════
     LOAD VIDEO — runs whenever the current song changes
     ─────────────────────────────────────────────
     When current.videoId changes (user clicks a song,
     next/prev is pressed, or song ends and idx advances):

     1. Reset progress bar to 0.
     2. If player is ready → call loadVideoById immediately.
     3. If player is not ready yet → store in pendingId.
        onReady will pick it up and play when ready.
     4. If loadVideoById throws (race condition) → retry after 300ms.
  ════════════════════════════════════════════ */
  useEffect(() => {
    if (!current) return;

    /* Reset progress display */
    setTime(0);
    setDur(0);

    const tryLoad = () => {
      if (readyRef.current && ytPlayer.current) {
        try {
          ytPlayer.current.loadVideoById(current.videoId);
          ytPlayer.current.setVolume(volume);
        } catch (err) {
          /* Player iframe not fully attached yet — retry shortly */
          console.warn('[Player] loadVideoById failed, retrying...', err);
          setTimeout(tryLoad, 300);
        }
      } else {
        /* Player not ready — queue the video id for onReady */
        pendingId.current = current.videoId;
      }
    };

    tryLoad();
  }, [current?.videoId]); /* eslint-disable-line react-hooks/exhaustive-deps */


  /* ════════════════════════════════════════════
     setVolume — updates both React state and the live player
  ════════════════════════════════════════════ */
  const setVolume = useCallback((v) => {
    setVolRaw(v);
    if (ytPlayer.current && readyRef.current) {
      ytPlayer.current.setVolume(v);
      /* Mute/unmute based on volume level */
      if (v === 0) ytPlayer.current.mute?.();
      else         ytPlayer.current.unMute?.();
    }
  }, []);


  /* ════════════════════════════════════════════
     play(song, newQueue?)
     ─────────────────────────────────────────────
     Starts playing a song.

     If newQueue is provided (e.g. user clicks from a playlist):
       Replace the entire queue and set idx to the clicked song.

     If no newQueue:
       If song is already in queue → jump to it.
       If not → append to queue and jump to the new end.

     Setting idx triggers the useEffect above which calls loadVideoById.
  ════════════════════════════════════════════ */
  const play = useCallback((song, newQueue = null) => {
    if (newQueue && newQueue.length > 0) {
      const i = newQueue.findIndex(s => s.videoId === song.videoId);
      setQueue(newQueue);
      setIdx(i >= 0 ? i : 0);
    } else {
      const existing = queue.findIndex(s => s.videoId === song.videoId);
      if (existing >= 0) {
        /* Song already in queue — just jump to it */
        setIdx(existing);
      } else {
        /* New song — append and jump to it */
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
     togglePlay — pause / resume the current song
  ════════════════════════════════════════════ */
  const togglePlay = useCallback(() => {
    if (!ytPlayer.current || !readyRef.current) return;
    if (playing) { ytPlayer.current.pauseVideo(); setPlaying(false); }
    else         { ytPlayer.current.playVideo();  setPlaying(true);  }
  }, [playing]);


  /* ════════════════════════════════════════════
     seekTo(sec) — jump to a position in the song
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
   6.  TOAST CONTEXT  (unchanged)
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