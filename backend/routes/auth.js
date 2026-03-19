/**
 * ============================================================
 *  GROOVIX — Auth Routes
 *  Author: Vishesh Jaiswal
 *  File:   backend/routes/auth.js
 *
 *  Routes:
 *    POST /api/auth/register → create new account + optional avatar
 *    POST /api/auth/login    → login with email + password
 *    GET  /api/auth/logout   → clear JWT cookie
 *    GET  /api/auth/me       → get current user from JWT cookie
 *
 *  Auth strategy:
 *    JWT stored in HTTP-only cookie 'gvx_token'.
 *    sameSite: 'none' + secure: true = required for Vercel cross-origin cookies.
 *    Expires in 7 days.
 * ============================================================
 */

import express       from 'express';
import jwt           from 'jsonwebtoken';
import dotenv        from 'dotenv';
import multer        from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import DatauriParser from 'datauri/parser.js';
import path          from 'path';
import { User }      from '../models/User.js';

dotenv.config();

const router = express.Router();

/* ── Cloudinary config ── */
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key:    process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

/* ── Multer: memory storage (no temp files on disk) ── */
const upload = multer({ storage: multer.memoryStorage() });
const parser = new DatauriParser();

/* ── Convert multer file buffer → base64 data URI ── */
const getDataUri = (file) => {
  const ext = path.extname(file.originalname).toString();
  return parser.format(ext, file.buffer);
};

/* ════════════════════════════════════════════
   JWT COOKIE HELPER — sendToken(res, user)
   ─────────────────────────────────────────────
   httpOnly: true  → JS cannot read (XSS safe)
   sameSite: 'none' → required for cross-origin on Vercel
   secure: true    → only sent over HTTPS
   maxAge          → 7 days in milliseconds
════════════════════════════════════════════ */
const sendToken = (res, user) => {
  const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: '7d' });
  res.cookie('gvx_token', token, {
    httpOnly: true,
    sameSite: 'none',
    secure:   true,
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
  return token;
};

/* ── POST /api/auth/register ── */
router.post('/register', upload.single('avatar'), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    let avatarUrl = '';
    if (req.file) {
      const dataUri  = getDataUri(req.file);
      const uploaded = await cloudinary.uploader.upload(dataUri.content);
      avatarUrl = uploaded.secure_url;
    }

    const user  = await User.create({ name, email, password, avatar: avatarUrl });
    const token = sendToken(res, user);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      user:    { _id: user._id, name: user.name, email: user.email, avatar: user.avatar },
      token,
    });
  } catch (err) {
    console.error('[Auth Register Error]', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ── POST /api/auth/login ── */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ success: false, message: 'Invalid email or password' });

    const match = await user.matchPassword(password);
    if (!match)
      return res.status(400).json({ success: false, message: 'Invalid email or password' });

    const token = sendToken(res, user);

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}! 🎵`,
      user:    { _id: user._id, name: user.name, email: user.email, avatar: user.avatar },
      token,
    });
  } catch (err) {
    console.error('[Auth Login Error]', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ── GET /api/auth/logout ── */
router.get('/logout', (_, res) => {
  res.cookie('gvx_token', '', { maxAge: 0 });
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
});

/* ── GET /api/auth/me ── */
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.gvx_token;
    if (!token)
      return res.status(401).json({ success: false, message: 'Not authenticated' });

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user    = await User.findById(decoded.id).select('-password');
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    return res.status(200).json({ success: true, user });
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

export default router;