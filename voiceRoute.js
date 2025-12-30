// jobspeak-backend/voiceRoute.js
import express from "express";
// import fetch from "node-fetch"; // Use native fetch
import { resolveUserKey } from "./middleware/resolveUserKey.js";
import { getSubscription, getTodayTTSCount, incrementTodayTTSCount } from "./services/db.js";
const captureException = (err, context) => console.error("[SENTRY_FALLBACK]", err, context);
import { trackTTS, trackLimitHit } from "./services/analytics.js";

const router = express.Router();

const FREE_DAILY_TTS_LIMIT = 3;

// Voice generation route - userKey is optional
router.post("/generate", async (req, res) => {
  console.log("CT:", req.headers["content-type"], "BODY:", JSON.stringify(req.body).substring(0, 100) + "...");
  let userKey = null;

  try {
    // Extract text from multiple sources (compat with JSON, form-data, query)
    const textFromBody = req.body?.text;
    const textFromFields = req.body?.fields?.text;
    const textFromQuery = req.query?.text;

    const content = textFromBody || textFromFields || textFromQuery || "";

    if (!content.trim()) {
      console.log("[TTS] 400 - Missing text");
      return res.status(400).json({ error: "Missing text" });
    }

    // Extract voiceId from request body, fallback to environment variable
    const voiceIdFromBody = req.body?.voiceId;
    const voiceIdFromFields = req.body?.fields?.voiceId;
    const voiceIdFromQuery = req.query?.voiceId;
    let voiceId = voiceIdFromBody || voiceIdFromFields || voiceIdFromQuery || process.env.ELEVENLABS_VOICE_ID; // "JBFqnCBsd6RMkjVDRZzb";

    // Fallback if voiceId is missing/invalid
    if (!voiceId || typeof voiceId !== 'string' || voiceId.trim().length === 0) {
      voiceId = "JBFqnCBsd6RMkjVDRZzb"; // Default voice ID
    } else {
      voiceId = voiceId.trim();
    }

    // Map legacy/frontend voiceIds to ElevenLabs IDs
    const voiceMap = {
      "us_female_emma": "JBFqnCBsd6RMkjVDRZzb",
      "us_male_jake": "pNInz6obpgDQGcFmaJgB",
      "uk_female_emma": "EXAVITQu4vr4xnSDxMaL", // Actually Sarah
      "uk_male_oliver": "jsCqWAovK2LkecY7zXl4",
      "us_female_ava": "Xb7hH8MSUJpSbSDYk0k2",
      "us_male_noah": "M3m6rJZy5B3ItN0Fcuxy",
      "uk_female_sophie": "LcfcDJNUP1GQjkzn1xUU",
      "uk_male_harry": "SOYHLrjzK2X1ezoPC6cr"
    };

    if (voiceMap[voiceId]) {
      voiceId = voiceMap[voiceId];
    }

    // userKey is optional - only check subscription/limits if present
    userKey = resolveUserKey(req);
    let isPro = false;

    if (userKey) {
      // Check subscription status
      const subscription = getSubscription(userKey);
      if (subscription) {
        isPro = subscription.isPro;

        // Check if subscription is expired
        if (subscription.currentPeriodEnd) {
          const periodEnd = new Date(subscription.currentPeriodEnd);
          const now = new Date();
          if (periodEnd < now) {
            isPro = false;
          }
        }

        // Ensure isPro matches status
        if (subscription.status && subscription.status !== "active" && subscription.status !== "trialing") {
          isPro = false;
        }
      }
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      console.error("[TTS] Missing ELEVENLABS_API_KEY");
      return res.status(500).json({
        error: "Missing ElevenLabs API key",
      });
    }

    console.log("[TTS] generating", { voiceId, textPreview: content.slice(0, 40) });

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
        signal: AbortSignal.timeout(15000) // 15s timeout
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs failure:", response.status, errText);

      // Track TTS failure
      trackTTS("fail", userKey, "elevenlabs_error");

      return res.status(502).json({ error: "ElevenLabs request failed", details: errText });
    }

    // Convert MP3 buffer into browser-playable blob
    const audioBuffer = await response.arrayBuffer();

    // Calculate remaining count before incrementing (for accurate response)
    // Only track usage if userKey is present
    let remaining = -1; // -1 means unlimited (Pro users or no userKey)
    if (userKey && !isPro) {
      const currentCount = getTodayTTSCount(userKey);
      incrementTodayTTSCount(userKey);
      remaining = Math.max(0, FREE_DAILY_TTS_LIMIT - currentCount - 1);
    }

    // Set headers with remaining count information
    res.set("Content-Type", "audio/mpeg");
    res.set("X-TTS-Remaining", remaining.toString());
    res.set("X-TTS-Limit", FREE_DAILY_TTS_LIMIT.toString());
    res.set("Cache-Control", "no-cache");

    console.log(`[TTS] ok len=${audioBuffer.byteLength}`);

    // Track TTS success
    trackTTS("success", userKey);

    // Send binary audio
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    console.error("Voice generation error:", err);

    // Track TTS failure
    trackTTS("fail", userKey, err.name || "unknown_error");

    res.status(500).json({ error: "Voice generation failed", details: err.message });
  }
});

export default router;
