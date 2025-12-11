// jobspeak-backend/voiceRoute.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// Public fallback MP3 – always safe to use
const FALLBACK_AUDIO =
  "https://file-examples.com/storage/fe5c4a58bb470bf4c3e39a54/2017/11/file_example_MP3_700KB.mp3";

/**
 * POST /voice/generate
 * Body: { text: string }
 *
 * Logic:
 * 1. If ELEVENLABS_API_KEY is missing or ElevenLabs fails:
 *    → return FALLBACK_AUDIO (never 500).
 * 2. If ElevenLabs works:
 *    → return a data:audio/mpeg;base64,... URL.
 */
router.post("/generate", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;

    // Missing credentials → always return fallback MP3
    if (!apiKey || !voiceId) {
      console.warn(
        "ELEVENLABS env vars missing. Returning fallback sample audio."
      );
      return res.json({ audioUrl: FALLBACK_AUDIO });
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
        }),
      });
    } catch (networkErr) {
      console.error("ElevenLabs network error:", networkErr);
      return res.json({ audioUrl: FALLBACK_AUDIO });
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("ElevenLabs error:", errorText || response.statusText);
      return res.json({ audioUrl: FALLBACK_AUDIO });
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:audio/mpeg;base64,${base64}`;

    return res.json({ audioUrl: dataUrl });
  } catch (err) {
    console.error("Voice generate route error:", err);
    return res.json({ audioUrl: FALLBACK_AUDIO });
  }
});

export default router;
