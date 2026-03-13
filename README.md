<div align="center">

# 🎵 Groovix
### A Modern Music Streaming Web App

![Groovix](https://img.shields.io/badge/Groovix-Music%20Streaming-6c63ff?style=for-the-badge&logo=music&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![YouTube API](https://img.shields.io/badge/YouTube-Data%20API%20v3-FF0000?style=for-the-badge&logo=youtube&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Netlify](https://img.shields.io/badge/Hosted-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)
![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)

**Stream millions of songs powered by YouTube · Built with React + Node.js**

[🌐 Live Demo](https://groovix-musicpalyer.netlify.app) · [🐛 Report Bug](https://github.com/Visheshjais/Groovix-MuiscPlayer/issues) · [💡 Request Feature](https://github.com/Visheshjais/Groovix-MuiscPlayer/issues)

</div>

---

## 📖 What is Groovix?

Groovix is a **full-stack music streaming web app** built by Vishesh Jaiswal — a student who knows HTML, CSS, JavaScript, React, Node.js, and Express.

It looks and feels like Spotify, but under the hood it uses the **YouTube Data API v3** to fetch real songs and the **YouTube IFrame Player API** to play them — with YouTube's own controls completely hidden. You get a clean, custom music player UI with no YouTube branding visible.

The app has a **Node.js + Express backend** hosted on Render that handles all YouTube API calls (keeping the API key safe on the server), and a **React frontend** hosted on Netlify that talks to it.

---

## ✨ Features

- 🎵 **Real Music Playback** — Powered by YouTube IFrame Player API with no YouTube UI
- 📺 **Video Mode** — Switch between audio and video without any interruption or pause
- 🔁 **Full Player Controls** — Play, Pause, Next, Prev, Shuffle, Repeat, Seek, Volume
- 🔥 **8 Music Categories** — Trending, Hip-Hop, Pop, Indie, Electronic, R&B, Punjabi, Hindi
- 🎚️ **Horizontal Carousels** — Smooth sliding sections with arrow navigation
- 🔍 **YouTube Search** — Search any song, artist or album instantly
- ❤️ **Liked Songs** — Save your favourite tracks across sessions
- 📋 **Playlists** — Create playlists and add any song from anywhere
- 🎨 **Dark / Light Mode** — Theme toggle, preference saved in localStorage
- 📊 **Scroll Progress Bar** — Accent bar at the top tracks your scroll position
- 🔼 **Scroll to Top** — Click the Groovix logo to jump back to the top
- 🔐 **Auth System** — Login, Signup, or continue as Guest

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Vite 5 |
| Styling | Pure CSS with CSS Variables |
| Backend | Node.js, Express.js |
| API | YouTube Data API v3 + IFrame Player API |
| Storage | localStorage (auth, liked songs, playlists) |
| Hosting | Netlify (frontend) + Render (backend) |

---

## 📁 Project Structure

```
groovix/
├── frontend/                       ← React + Vite app (hosted on Netlify)
│   ├── public/
│   │   └── _redirects              ← Netlify routing fix for React Router
│   ├── index.html                  ← Loads YouTube IFrame API script
│   ├── vite.config.js              ← Proxies /api → localhost:3001 in dev
│   └── src/
│       ├── App.jsx                 ← Root layout (CSS Grid shell)
│       ├── index.css               ← Full design system & CSS variables
│       ├── context/index.jsx       ← ALL global state (Theme, Auth, Player...)
│       ├── components/
│       │   ├── Player.jsx          ← Bottom bar + Video Mode panel
│       │   ├── Sidebar.jsx         ← Nav + Queue + User info
│       │   ├── Topbar.jsx          ← Search bar + theme toggle
│       │   ├── SongCard.jsx        ← Grid card for carousels
│       │   └── TrackRow.jsx        ← List row for track lists
│       ├── pages/
│       │   ├── Home.jsx            ← Hero + 8 carousels + Top Tracks
│       │   ├── Search.jsx          ← YouTube search results
│       │   ├── LikedSongs.jsx      ← Liked songs collection
│       │   ├── Playlists.jsx       ← Create & manage playlists
│       │   ├── PlaylistDetail.jsx  ← Songs inside a playlist
│       │   └── Auth.jsx            ← Login / Signup / Guest
│       └── services/api.js         ← All backend API calls
│
└── backend/                        ← Node.js + Express (hosted on Render)
    ├── index.js                    ← Server entry + CORS + auto port
    ├── .env                        ← API key (never committed to GitHub)
    ├── .env.example                ← Template for others to follow
    └── routes/
        ├── trending.js             ← GET /api/trending (8 categories)
        ├── search.js               ← GET /api/search?q=...
        └── video.js                ← GET /api/video/:id
```

---

## 🚀 Run Locally

### 1. Clone the repo
```bash
git clone https://github.com/Visheshjais/Groovix-MuiscPlayer.git
cd Groovix-MuiscPlayer
```

### 2. Add your YouTube API Key
Create `backend/.env`:
```env
YOUTUBE_API_KEY=your_api_key_here
PORT=3001
```
Get a free key at [console.cloud.google.com](https://console.cloud.google.com) → enable **YouTube Data API v3**.

### 3. Install & run
```bash
npm run install:all
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3001 |
| API Check | http://localhost:3001/api/test-key |

---

## 🌐 Deployment

| Part | Platform | URL |
|------|----------|-----|
| Frontend | Netlify | [groovix-musicpalyer.netlify.app](https://groovix-musicpalyer.netlify.app) |
| Backend | Render | [groovix-backend.onrender.com](https://groovix-backend.onrender.com) |

> ⚠️ Render free tier **spins down after inactivity** — first load may take 10-15 seconds to wake up.

---

## 🔑 YouTube API Quota

| Action | Units used |
|--------|-----------|
| Load homepage (8 categories) | ~800 units |
| One search | ~100 units |
| Video details | ~1 unit |

Free quota: **10,000 units/day**. Resets at midnight Pacific Time.

---

## 🎵 How the Player Works

```
YouTube IFrame API loads via <script> in index.html
              ↓
ONE YT.Player instance created in #yt-player-slot div
              ↓
Audio Mode → panel hidden with opacity:0 + transform
             iframe stays alive → audio keeps playing
Video Mode → panel visible → same iframe shown full size
              ↓
Bottom bar controls  ─┐
Video panel controls ─┼→ Same context functions → Same YT.Player
                       └→ Always perfectly in sync
```

---

## 📜 License

MIT License © 2025 Vishesh Jaiswal

---

## 👨‍💻 Author

**Vishesh Jaiswal**
- GitHub: [@Visheshjais](https://github.com/Visheshjais)

---

<div align="center">

Made with ❤️ and lots of music by **Vishesh Jaiswal**

⭐ Star this repo if you liked it!

</div>
