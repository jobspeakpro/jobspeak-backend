import express from "express";

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

export default router;
