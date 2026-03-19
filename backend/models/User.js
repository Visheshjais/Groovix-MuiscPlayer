/**
 * ============================================================
 *  GROOVIX — User Model
 *  Author: Vishesh Jaiswal
 *  File:   backend/models/User.js
 *
 *  MongoDB schema for registered users.
 *
 *  Fields:
 *    name     → display name shown in sidebar
 *    email    → unique login identifier
 *    password → bcrypt-hashed, never stored as plain text
 *    avatar   → Cloudinary URL for profile photo (optional)
 *
 *  Hooks:
 *    pre('save') → auto-hashes password before storing
 *
 *  Methods:
 *    matchPassword(entered) → compares entered vs stored hash
 * ============================================================
 */

import mongoose from 'mongoose';
import bcrypt   from 'bcryptjs';

/* ── User schema definition ── */
const userSchema = new mongoose.Schema({

  /* Display name — shown in sidebar and greeting */
  name: {
    type:     String,
    required: true,
    trim:     true,
  },

  /* Email — used as unique login identifier */
  email: {
    type:      String,
    required:  true,
    unique:    true,
    lowercase: true,
    trim:      true,
  },

  /* Password — stored as bcrypt hash, NEVER plain text */
  password: {
    type:     String,
    required: true,
  },

  /* Profile photo — Cloudinary URL, empty string if not uploaded */
  avatar: {
    type:    String,
    default: '',
  },

}, { timestamps: true });


/* ════════════════════════════════════════════
   PRE-SAVE HOOK — Auto-hash password
   ─────────────────────────────────────────────
   Runs before every .save() call.
   Only hashes if password field was modified —
   prevents double-hashing on profile updates.
════════════════════════════════════════════ */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});


/* ════════════════════════════════════════════
   INSTANCE METHOD — matchPassword
   ─────────────────────────────────────────────
   Compares a plain-text entered password against
   the stored bcrypt hash using bcrypt.compare().
   Returns true if they match, false otherwise.
════════════════════════════════════════════ */
userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};


export const User = mongoose.model('User', userSchema);