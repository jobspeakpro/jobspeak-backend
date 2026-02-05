import express from "express";
import { upsertProfile, getProfile } from "../services/supabase.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: "Email required." });
  }

  // MVP: fake token, no database yet
  return res.json({
    token: "demo-token-" + email
  });
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
