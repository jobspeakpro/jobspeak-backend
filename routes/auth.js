import express from "express";
import {
  upsertProfile,
  getProfile,
  adminCreateUser,
  adminGenerateLink,
  verifyInviteCode,
  signInUser
} from "../services/supabase.js";
import { rateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

/**
 * POST /api/auth/signup
 * Backend-controlled signup using Supabase Admin API
 * Returns actionLink in response for QA (no email sent)
 */
router.post("/signup", rateLimiter(5, 60 * 60 * 1000, (req) => `signup:${req.ip}`), async (req, res) => {
  res.setHeader('X-Origin', 'railway-auth');
  res.setHeader('Cache-Control', 'no-store');

  const { email, password, firstName, inviteCode } = req.body || {};

  console.log(`[AUTH-SIGNUP] Attempt for email: ${email}`);

  // 1. Validation
  if (!email || !password || !firstName) {
    return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', message: "Email, password, and firstName are required" });
  }

  // 2. Invite Code Check
  if (!verifyInviteCode(inviteCode)) {
    console.log(`[AUTH-SIGNUP] Invalid invite code: ${inviteCode}`);
    return res.status(403).json({ ok: false, code: 'INVITE_REQUIRED', message: "Invalid or missing invite code" });
  }

  try {
    // 3. Create User via Admin API
    const { user } = await adminCreateUser({
      email,
      password,
      user_metadata: { full_name: firstName }
    });

    console.log(`[AUTH-SIGNUP] created user: ${user.id}`);

    // 4. Generate Link via Admin API
    const { action_link: actionLink } = await adminGenerateLink(email);
    console.log(`[AUTH-SIGNUP] generated actionLink`);

    // 5. Success Response
    // Headers already set at start
    return res.json({
      ok: true,
      email,
      actionLink
    });

  } catch (err) {
    console.error(`[AUTH-SIGNUP] Error:`, err);

    // Ensure headers present on error too (already set at top, but just in case of weird flow)
    res.setHeader('X-Origin', 'railway-auth');

    const errorMessage = err.message || "Signup failed";

    // Handle Config Error
    if (err.code === 'CONFIG_ERROR') {
      return res.status(500).json({ ok: false, code: 'CONFIG_ERROR', message: "Server not configured." });
    }

    // Handle Supabase errors
    if (errorMessage.includes('usage limit') || err.status === 429) {
      return res.status(429).json({ ok: false, code: 'RATE_LIMIT', message: "Too many signups" });
    }
    if (errorMessage.includes('already registered')) {
      return res.status(409).json({ ok: false, code: 'EMAIL_EXISTS', message: "Email already registered" });
    }

    return res.status(500).json({
      ok: false,
      code: 'UNKNOWN',
      message: errorMessage
    });
  }
});

/**
 * POST /api/auth/login
 * Real Supabase Login (signInWithPassword)
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  res.setHeader('X-Origin', 'railway-auth');

  if (!email || !password) {
    return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', message: "Email and password required" });
  }

  try {
    const { session, user } = await signInUser({ email, password });
    console.log(`[AUTH-LOGIN] success: ${user.id}`);

    return res.json({
      ok: true,
      session,
      user
    });
  } catch (err) {
    console.error(`[AUTH-LOGIN] fail:`, err.message);
    return res.status(401).json({
      ok: false,
      code: 'INVALID_CREDENTIALS',
      message: err.message || "Login failed"
    });
  }
});

// GET /auth/profile?userKey=...
router.get("/profile", (req, res) => {
  const { userKey } = req.query;
  if (!userKey) return res.status(400).json({ error: "userKey required" });

  const profile = getProfile(userKey);
  // Return empty profile if not found so frontend can init
  return res.json(profile || {});
});

// POST /auth/profile
router.post("/profile", (req, res) => {
  const { userKey, ...data } = req.body;
  if (!userKey) return res.status(400).json({ error: "userKey required" });

  try {
    const updated = upsertProfile(userKey, data);
    return res.json(updated);
  } catch (err) {
    console.error("Profile update error:", err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
