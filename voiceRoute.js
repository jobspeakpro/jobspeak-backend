// jobspeak-backend/voiceRoute.js
import express from "express";
import fetch from "node-fetch";
import { requireUsageAllowance } from "./middleware/usageLimit.js";

const router = express.Router();

// Voice generation is a billable action - apply usage allowance middleware
// This also validates userKey (returns 400 if missing)
router.post("/generate", requireUsageAllowance, async (req, res) => {
  try {
    const { text, improvedAnswer } = req.body;

    const content = improvedAnswer || text || "";
    if (!content.trim()) {
      return res.status(400).json({ error: "Missing text to convert to speech." });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;

    if (!apiKey || !voiceId) {
      return res.status(500).json({
        error: "Missing ElevenLabs API key or Voice ID",
      });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: content,
          model_id: "eleven_turbo_v2",
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs failure:", errText);
      return res.status(500).json({ error: "ElevenLabs request failed" });
    }

    // Convert MP3 buffer into browser-playable blob
    const audioBuffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    console.error("Voice generation error:", err);
    res.status(500).json({ error: "Voice generation failed" });
  }
});

export default router;
