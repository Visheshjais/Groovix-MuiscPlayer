<div align="center">

# 🎵 Groovix
### A Modern Music Streaming Web App

![Groovix](https://img.shields.io/badge/Groovix-Music%20Streaming-6c63ff?style=for-the-badge&logo=music&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![YouTube API](https://img.shields.io/badge/YouTube-Data%20API%20v3-FF0000?style=for-the-badge&logo=youtube&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Vercel](https://img.shields.io/badge/Hosted-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

**Stream millions of songs powered by YouTube · Built with React + Node.js + MongoDB**

[🌐 Live Demo](https://groovix-frontend.vercel.app) · [🐛 Report Bug](https://github.com/Visheshjais/Groovix-MuiscPlayer/issues) · [💡 Request Feature](https://github.com/Visheshjais/Groovix-MuiscPlayer/issues)

</div>

---

## 📖 What is Groovix?

Groovix is a full-stack music streaming web app that delivers a Spotify-like experience powered by the YouTube Data API v3 to fetch real songs and the YouTube IFrame Player API to play them — with YouTube's own controls completely hidden. You get a clean, custom music player UI with no YouTube branding visible.
The app has a Node.js + Express backend hosted on Vercel that handles all YouTube API calls (keeping the API key safe on the server), a MongoDB Atlas database for storing users, liked songs, and playlists, and a React frontend hosted on Vercel that talks to it.
---

## ✨ Features

- 🎵 **Real Music Playback** — Powered by YouTube IFrame Player API with no YouTube UI
- 📺 **Video Mode** — Switch between audio and video without any interruption or pause
- 🔁 **Full Player Controls** — Play, Pause, Next, Prev, Shuffle, Repeat, Seek, Volume
- 🔥 **8 Music Categories** — Trending, Hip-Hop, Pop, Indie, Electronic, R&B, Punjabi, Hindi
- 🎚️ **Horizontal Carousels** — Smooth sliding sections with arrow navigation
- 🔍 **YouTube Search** — Search any song, artist or album instantly
- ❤️ **Liked Songs** — Save your favourite tracks (synced to MongoDB for logged-in users)
- 📋 **Playlists** — Create playlists and add any song from anywhere
- 🎨 **Dark / Light Mode** — Theme toggle, preference saved in localStorage
- 📊 **Scroll Progress Bar** — Accent bar at the top tracks your scroll position
- 🔼 **Scroll to Top** — Click the Groovix logo to jump back to the top
- 🔐 **Auth System** — Login, Signup (JWT cookie), or continue as Guest
- 🔒 **Session Security** — Session expires automatically when tab is closed

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Vite 5 |
| Styling | Pure CSS with CSS Variables |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT (HTTP-only cookie) + sessionStorage |
| API | YouTube Data API v3 + IFrame Player API |
| Storage | MongoDB (logged-in) · localStorage (guest) |
| Hosting | Vercel (frontend + backend) |

---

## 📁 Project Structure
```
groovix/
├── frontend/                       ← React + Vite app (hosted on Vercel)
│   ├── public/
│   │   └── _redirects              ← Routing fix for React Router
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
│       │   ├── SongCard.jsx        ← Grid card for carousels (portal dropdown)
│       │   └── TrackRow.jsx        ← List row for track lists (portal dropdown)
│       ├── pages/
│       │   ├── Home.jsx            ← Hero + 8 carousels + Top Tracks
│       │   ├── Search.jsx          ← YouTube search results
│       │   ├── LikedSongs.jsx      ← Liked songs collection
│       │   ├── Playlists.jsx       ← Create & manage playlists
│       │   ├── PlaylistDetail.jsx  ← Songs inside a playlist
│       │   └── Auth.jsx            ← Login / Signup / Guest
│       └── services/api.js         ← All backend API calls
│
└── backend/                        ← Node.js + Express (hosted on Vercel)
    ├── index.js                    ← Server entry + CORS + MongoDB connection
    ├── vercel.json                 ← Vercel routing config
    ├── .env                        ← API keys (never committed to GitHub)
    ├── .env.example                ← Template for others to follow
    ├── models/
    │   ├── User.js                 ← MongoDB user schema (bcrypt password)
    │   ├── Liked.js                ← Liked songs schema
    │   └── Playlist.js             ← Playlist schema with embedded songs
    └── routes/
        ├── auth.js                 ← Register, Login, Logout, Me
        ├── liked.js                ← Get liked, Toggle liked
        ├── playlists.js            ← Full CRUD for playlists + songs
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

### 2. Set up backend environment
Create `backend/.env`:
```env
YOUTUBE_API_KEY=your_youtube_api_key
MONGO_URI=mongodb://localhost:27017/groovix
SECRET_KEY=your_jwt_secret
PORT=3001
```

Get a free YouTube key at [console.cloud.google.com](https://console.cloud.google.com) → enable **YouTube Data API v3**.

### 3. Set up frontend environment
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001/api
```

### 4. Install & run
```bash
# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install

# Start MongoDB (Windows)
net start MongoDB

# Run backend
cd backend && npm start

# Run frontend
cd frontend && npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3001 |
| API Check | http://localhost:3001/api/test-key |
| Health | http://localhost:3001/api/health |

---

## 🌐 Deployment

| Part | Platform | URL |
|------|----------|-----|
| Frontend | Vercel | [groovix-frontend.vercel.app](https://groovix-frontend.vercel.app) |
| Backend | Vercel | [groovix-backend.vercel.app](https://groovix-backend.vercel.app) |
| Database | MongoDB Atlas | Cluster0 |

---

## 🔑 YouTube API Quota

| Action | Units used |
|--------|-----------|
| Load homepage (8 categories) | ~800 units |
| One search | ~100 units |
| Video details | ~1 unit |

> 💡 **Quota Optimization Strategy** — During development, hitting the YouTube API's daily quota limit was a key challenge. Rather than relying on workarounds, I focused on building a scalable, production-ready solution:
>
> - **Two-Layer Caching** — An **in-memory cache** (short TTL) handles repeated requests within the same server instance for near-instant responses. A **MongoDB-based cache** (longer TTL) persists data across server restarts and instances, significantly reducing redundant API calls.
> - **Response Compression** — Enabled **gzip compression** on the backend to reduce payload sizes and improve overall response performance.
>
> These optimizations reduced API usage drastically, improved app performance, and made the system scalable without dependence on external API quota limits.

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

## 🔐 How Auth Works
```
User logs in → backend validates → sets JWT in HTTP-only cookie
              ↓
Frontend saves user to sessionStorage
              ↓
Tab closed → sessionStorage cleared → session expires
              ↓
Next visit → no session → Login page shown
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
