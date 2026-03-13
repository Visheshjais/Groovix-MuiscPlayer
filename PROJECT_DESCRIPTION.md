# Groovix — Project Description

## One Line
A Spotify-inspired music streaming web app built with React and Node.js, powered by the YouTube API.

---

## Short Description (for GitHub / portfolio / resume)
Groovix is a full-stack music streaming web app where users can search, stream, and organise music. It uses the YouTube Data API to fetch songs and the YouTube IFrame Player API for seamless playback — with a fully custom player UI that hides all YouTube controls. Features include video mode, playlists, liked songs, dark/light theme, and 8 music categories including Punjabi and Hindi Bollywood. Frontend hosted on Netlify, backend on Render.

---

Groovix is like Spotify — but built from scratch as a personal project.

You open the app, log in, and you see music categories like Trending, Hip-Hop, Punjabi, Hindi Bollywood and more. Click any song and it starts playing instantly in a clean player bar at the bottom — no ads, no YouTube interface, just the music.

If you want to watch the video too, hit "Video Mode" and a panel slides up showing the video — and the audio never skips or restarts. Close the video, audio keeps going. It's all one player running behind the scenes.

You can search for any song, like tracks to save them, build your own playlists, and switch between dark and light mode. Everything is saved so when you come back, your playlists and liked songs are still there.

The app has two parts — a React frontend that users see and interact with, and a Node.js backend that talks to YouTube's API to fetch songs. The frontend is hosted on Netlify and the backend runs on Render.

---

## Tech Used (for interviews / college projects)
- **React 18** — UI components, routing, state management via Context API
- **Node.js + Express** — REST API server, proxies YouTube API calls
- **YouTube Data API v3** — fetches song results and categories
- **YouTube IFrame Player API** — real JS control over playback (no YouTube UI)
- **Vite** — frontend build tool and dev server
- **Pure CSS** — custom design system with CSS variables for theming
- **Netlify** — frontend hosting with `_redirects` for React Router support
- **Render** — backend hosting with environment variable for API key security
- **localStorage** — persists user auth, liked songs, and playlists client-side
