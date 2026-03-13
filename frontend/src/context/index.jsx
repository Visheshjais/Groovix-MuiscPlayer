/**
 * ============================================================
 *  GROOVIX — Global State & Context
 *  Author: Vishesh Jaiswal
 *  File:   src/context/index.jsx
 *
 *  Contains ALL React contexts used across the app:
 *    1. ThemeProvider    – dark / light mode toggle
 *    2. AuthProvider     – login / logout / guest session
 *    3. LikedProvider    – liked songs (localStorage)
 *    4. PlaylistProvider – playlists (localStorage)
 *    5. PlayerProvider   – THE CORE: YouTube IFrame API engine
 *    6. ToastProvider    – toast notification system
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
 *  OLD BUG: We were hiding the video panel with height:0 + overflow:hidden.
 *  YouTube detects the iframe is clipped/invisible and PAUSES the video.
 *
 *  FIX: The video panel is now hidden with:
 *    opacity: 0
 *    pointerEvents: none
 *    position: absolute (taken out of layout flow)
 *  This keeps the iframe visible to YouTube (not clipped),
 *  so audio keeps playing. The panel is just visually transparent.
 *
 *  When Video Mode opens → opacity:1, position in layout.
 *  When Video Mode closes → opacity:0, out of layout — audio continues.
 * ============================================================
 */

import {
  createContext, useContext, useState,
  useCallback, useEffect, useRef
} from 'react';


/* ══════════════════════════════════════════════
   1.  THEME CONTEXT
   Persists choice in localStorage.
   Sets data-theme attribute on <html> element,
   which CSS variables read to apply the theme.
   ══════════════════════════════════════════════ */
const ThemeCtx = createContext(null);

export function ThemeProvider({ children }) {

  /* Read saved theme from localStorage, default to dark */
  const [theme, setTheme] = useState(
    () => localStorage.getItem('gvx-theme') || 'dark'
  );

  /* Apply theme to <html> and save whenever it changes */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gvx-theme', theme);
  }, [theme]);

  /* Toggle between dark and light */
  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}
export const useTheme = () => useContext(ThemeCtx);


/* ══════════════════════════════════════════════
   2.  AUTH CONTEXT  (client-side only, no backend)
   Stores user object in localStorage.
   User shape: { name, email, initials }
   ══════════════════════════════════════════════ */
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {

  /* Load saved user on first render */
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gvx-user')); }
    catch { return null; }
  });

  /* Save user to state + localStorage */
  const login = (name, email) => {
    const u = { name, email, initials: name.slice(0, 2).toUpperCase() };
    setUser(u);
    localStorage.setItem('gvx-user', JSON.stringify(u));
  };

  /* Clear user from state + localStorage */
  const logout = () => {
    setUser(null);
    localStorage.removeItem('gvx-user');
  };

  return (
    <AuthCtx.Provider value={{ user, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
export const useAuth = () => useContext(AuthCtx);


/* ══════════════════════════════════════════════
   3.  LIKED SONGS CONTEXT
   Stores liked songs array in localStorage.
   toggle(song) adds if not liked, removes if liked.
   isLiked(videoId) returns true/false.
   ══════════════════════════════════════════════ */
const LikedCtx = createContext(null);

export function LikedProvider({ children }) {

  /* Load liked songs from localStorage on first render */
  const [liked, setLiked] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gvx-liked')) || []; }
    catch { return []; }
  });

  /* Add song if not liked, remove if already liked */
  const toggle = useCallback((song) => {
    setLiked(prev => {
      const exists = prev.find(s => s.videoId === song.videoId);
      const next   = exists
        ? prev.filter(s => s.videoId !== song.videoId)  /* remove */
        : [song, ...prev];                               /* add at front */
      localStorage.setItem('gvx-liked', JSON.stringify(next));
      return next;
    });
  }, []);

  /* Check if a videoId is in liked list */
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
   Playlists stored in localStorage as array.
   Each playlist: { id, name, songs[], emoji }
   ══════════════════════════════════════════════ */
const PlaylistCtx = createContext(null);

export function PlaylistProvider({ children }) {

  /* Load playlists from localStorage */
  const [playlists, setPlaylists] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gvx-pl')) || []; }
    catch { return []; }
  });

  /* Helper: save updated array to localStorage and return it */
  const save = (p) => {
    localStorage.setItem('gvx-pl', JSON.stringify(p));
    return p;
  };

  /* Create a new empty playlist with random emoji */
  const create = (name) => {
    const emojis = ['🎵','🎶','🎸','🎹','🥁','🎺','🎻','🎤'];
    const p = {
      id:    Date.now().toString(),
      name,
      songs: [],
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    };
    setPlaylists(prev => save([p, ...prev]));
    return p;
  };

  /* Add a song to a playlist (no duplicates) */
  const addSong = (pid, song) =>
    setPlaylists(prev => save(prev.map(p =>
      p.id === pid && !p.songs.find(s => s.videoId === song.videoId)
        ? { ...p, songs: [...p.songs, song] }
        : p
    )));

  /* Remove a song from a playlist by videoId */
  const removeSong = (pid, vid) =>
    setPlaylists(prev => save(prev.map(p =>
      p.id === pid ? { ...p, songs: p.songs.filter(s => s.videoId !== vid) } : p
    )));

  /* Delete an entire playlist */
  const remove = (id) =>
    setPlaylists(prev => save(prev.filter(p => p.id !== id)));

  return (
    <PlaylistCtx.Provider value={{ playlists, create, addSong, removeSong, remove }}>
      {children}
    </PlaylistCtx.Provider>
  );
}
export const usePlaylists = () => useContext(PlaylistCtx);


/* ══════════════════════════════════════════════
   5.  PLAYER CONTEXT  ← THE CORE ENGINE
   ══════════════════════════════════════════════

   Internal refs (not state — don't cause re-renders):
     ytPlayer  → the live window.YT.Player JS object
     readyRef  → becomes true after onReady fires
     pollRef   → setInterval id for time/duration polling
     pendingId → videoId to load once player becomes ready
   ══════════════════════════════════════════════ */
const PlayerCtx = createContext(null);

export function PlayerProvider({ children }) {

  /* ── Playback queue state ── */
  const [queue,     setQueue]     = useState([]);   /* all songs loaded */
  const [idx,       setIdx]       = useState(0);    /* current song index */
  const [playing,   setPlaying]   = useState(false);
  const [volume,    setVolRaw]    = useState(80);
  const [shuffle,   setShuffle]   = useState(false);
  const [repeat,    setRepeat]    = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  /* ── Progress state — polled from YT player every 500ms ── */
  const [time, setTime] = useState(0);  /* current position in seconds */
  const [dur,  setDur]  = useState(0);  /* total duration in seconds */

  /* ── Refs for YT player management ── */
  const ytPlayer  = useRef(null);   /* YT.Player instance */
  const readyRef  = useRef(false);  /* true after onReady fires */
  const pollRef   = useRef(null);   /* setInterval handle */
  const pendingId = useRef(null);   /* videoId queued before player ready */

  /* Derived: the song at current index */
  const current = queue[idx] || null;

  /* ════════════════════════════════════════════
     Initialize YouTube IFrame Player API
     ─────────────────────────────────────────────
     Called once on component mount.
     Waits for window.YT to be defined (from index.html script tag).
     Creates ONE YT.Player in the #yt-player-slot div.
  ════════════════════════════════════════════ */
  useEffect(() => {
    const initPlayer = () => {
      if (ytPlayer.current) return; /* guard: don't create twice */

      ytPlayer.current = new window.YT.Player('yt-player-slot', {
        height: '100%',
        width:  '100%',
        playerVars: {
          autoplay:        1,   /* start playing when video loads */
          controls:        0,   /* HIDE YouTube's own control bar */
          disablekb:       1,   /* disable YouTube keyboard shortcuts */
          fs:              0,   /* hide YouTube fullscreen button */
          iv_load_policy:  3,   /* hide video annotations */
          modestbranding:  1,   /* minimal YouTube logo */
          rel:             0,   /* don't show related videos */
          showinfo:        0,   /* hide title overlay */
          playsinline:     1,   /* prevent fullscreen on mobile — important for HTTPS */
          cc_load_policy:  0,   /* hide captions */
          enablejsapi:     1,   /* enable JS API control — required for HTTPS/Netlify */
          origin:          window.location.origin, /* tell YouTube our domain — prevents CORS block */
        },

        events: {

          /* ── onReady: YT.Player is fully initialized ── */
          onReady: (e) => {
            readyRef.current = true;
            e.target.setVolume(volume); /* apply initial volume */

            /* If a song was queued before player was ready, load it now */
            if (pendingId.current) {
              e.target.loadVideoById(pendingId.current);
              pendingId.current = null;
            }
          },

          /* ── onStateChange: YT fires this on play/pause/end ── */
          onStateChange: (e) => {
            const S = window.YT.PlayerState;

            /* ── Song started playing ── */
            if (e.data === S.PLAYING) {
              setPlaying(true);
              /* Poll time and duration every 500ms to update progress bar */
              clearInterval(pollRef.current);
              pollRef.current = setInterval(() => {
                if (!ytPlayer.current?.getCurrentTime) return;
                setTime(Math.floor(ytPlayer.current.getCurrentTime()));
                setDur(Math.floor(ytPlayer.current.getDuration()));
              }, 500);
            }

            /* ── Song was paused ── */
            if (e.data === S.PAUSED) {
              setPlaying(false);
              clearInterval(pollRef.current); /* stop polling when paused */
            }

            /* ── Song ended — auto advance to next track ── */
            if (e.data === S.ENDED) {
              clearInterval(pollRef.current);
              setPlaying(false);
              setTime(0);
              /* Advance index based on shuffle/repeat setting */
              setIdx(i => {
                if (queue.length === 0) return i;
                if (shuffle) return Math.floor(Math.random() * queue.length);
                if (repeat)  return (i + 1) % queue.length;
                return Math.min(i + 1, queue.length - 1);
              });
              setTimeout(() => setPlaying(true), 80); /* tiny delay for state to settle */
            }
          },
        },
      });
    };

    /* YT API script may already be loaded (e.g. Vite hot-reload in dev) */
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      /* Otherwise wait for YouTube's own ready callback */
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    /* Cleanup: stop polling interval when app unmounts */
    return () => clearInterval(pollRef.current);
  }, []); /* run only once on mount */


  /* ════════════════════════════════════════════
     Load new song when current song changes
     (i.e. when idx or queue changes)
  ════════════════════════════════════════════ */
  useEffect(() => {
    if (!current) return;

    /* Reset progress display right away */
    setTime(0);
    setDur(0);

    if (readyRef.current && ytPlayer.current) {
      /* Player is ready — load video immediately */
      ytPlayer.current.loadVideoById(current.videoId);
      ytPlayer.current.setVolume(volume);
    } else {
      /* Player not ready yet — save videoId to load once ready */
      pendingId.current = current.videoId;
    }
  }, [current?.videoId]); /* only re-run when the actual video changes */


  /* ════════════════════════════════════════════
     Volume control
     Pushes volume change to the YT player instance
  ════════════════════════════════════════════ */
  const setVolume = useCallback((v) => {
    setVolRaw(v);
    if (ytPlayer.current && readyRef.current) {
      ytPlayer.current.setVolume(v);
      /* Also mute/unmute so 0% actually silences it */
      if (v === 0) ytPlayer.current.mute?.();
      else         ytPlayer.current.unMute?.();
    }
  }, []);


  /* ════════════════════════════════════════════
     play(song, newQueue?)
     ─────────────────────────────────────────────
     Loads a song into the player.
     If newQueue is provided, replaces the entire queue.
     If not, adds song to existing queue (or seeks to it if already there).
  ════════════════════════════════════════════ */
  const play = useCallback((song, newQueue = null) => {
    if (newQueue && newQueue.length > 0) {
      /* Replace queue with new list, find the song's position */
      const i = newQueue.findIndex(s => s.videoId === song.videoId);
      setQueue(newQueue);
      setIdx(i >= 0 ? i : 0);
    } else {
      /* Add to existing queue (or seek if already present) */
      const existing = queue.findIndex(s => s.videoId === song.videoId);
      if (existing >= 0) {
        setIdx(existing); /* already in queue — just switch to it */
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


  /* ── Next track (respects shuffle + repeat) ── */
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


  /* ── Previous track ── */
  const prev = useCallback(() => {
    if (idx > 0) {
      setIdx(i => i - 1);
      setPlaying(true);
      setTime(0);
    }
  }, [idx]);


  /* ── Toggle play / pause — calls real YT API ── */
  const togglePlay = useCallback(() => {
    if (!ytPlayer.current || !readyRef.current) return;
    if (playing) {
      ytPlayer.current.pauseVideo(); /* pause the YT player */
      setPlaying(false);
    } else {
      ytPlayer.current.playVideo();  /* resume the YT player */
      setPlaying(true);
    }
  }, [playing]);


  /* ── Seek to a specific second — calls real YT API ── */
  const seekTo = useCallback((sec) => {
    if (ytPlayer.current && readyRef.current) {
      ytPlayer.current.seekTo(sec, true); /* true = allow seek ahead of buffer */
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
   6.  TOAST CONTEXT  — short notification popups
   show("message") displays a toast for 2.6 seconds.
   ══════════════════════════════════════════════ */
const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  /* Show a message then auto-dismiss after 2600ms */
  const show = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {/* Render the toast notification if one is active */}
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
