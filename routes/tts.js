import express from "express";

const router = express.Router();

/**
 * TEMPORARY STUB:
 * We will wire this to ElevenLabs later.
 * For now, it just returns a placeholder JSON response.
 */

router.post("/", async (req, res) => {
  const { text } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: "Missing 'text' in body." });
  }

  // Placeholder response so backend can run without ElevenLabs
  return res.json({
    ok: true,
    message: "TTS not yet configured. Backend is running fine.",
    textReceived: text
  });
});

export default router;
