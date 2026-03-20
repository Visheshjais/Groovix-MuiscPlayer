/**
 * ============================================================
 *  GROOVIX — Auth Routes
 *  Author: Vishesh Jaiswal
 *  File:   backend/routes/auth.js
 *
 *  Routes:
 *    POST /api/auth/register → create new account
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

import express  from 'express';
import jwt      from 'jsonwebtoken';
import dotenv   from 'dotenv';
import { User } from '../models/User.js';

dotenv.config();

const router = express.Router();


/* ════════════════════════════════════════════
   JWT COOKIE HELPER — sendToken(res, user)
   ─────────────────────────────────────────────
   httpOnly: true   → JS cannot read (XSS safe)
   sameSite: 'none' → required for cross-origin on Vercel
   secure: true     → only sent over HTTPS
   maxAge           → 7 days in milliseconds
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
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    /* Validate required fields */
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });

    /* Check if email already registered */
    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    /* Create user — password auto-hashed by pre-save hook in User model */
    const user  = await User.create({ name, email, password });
    const token = sendToken(res, user);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      user:    { _id: user._id, name: user.name, email: user.email },
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

    /* Validate required fields */
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    /* Find user by email */
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ success: false, message: 'Invalid email or password' });

    /* Compare entered password with stored hash */
    const match = await user.matchPassword(password);
    if (!match)
      return res.status(400).json({ success: false, message: 'Invalid email or password' });

    const token = sendToken(res, user);

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}! 🎵`,
      user:    { _id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (err) {
    console.error('[Auth Login Error]', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


/* ── GET /api/auth/logout ── */
router.get('/logout', (_, res) => {
  /* Clear the JWT cookie by setting maxAge to 0 */
  res.cookie('gvx_token', '', { maxAge: 0 });
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
});


/* ── GET /api/auth/me ── */
router.get('/me', async (req, res) => {
  try {
    /* Read JWT from HTTP-only cookie */
    const token = req.cookies?.gvx_token;
    if (!token)
      return res.status(401).json({ success: false, message: 'Not authenticated' });

    /* Verify token and extract user ID */
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    /* Fetch user from DB — exclude password field */
    const user = await User.findById(decoded.id).select('-password');
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    return res.status(200).json({ success: true, user });
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});


export default router;