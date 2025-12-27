// jobspeak-backend/voiceRoute.js
import express from "express";
import fetch from "node-fetch";
import { resolveUserKey } from "./middleware/resolveUserKey.js";
import { getSubscription, getTodayTTSCount, incrementTodayTTSCount } from "./services/db.js";
import { captureException } from "./services/sentry.js";
import { trackTTS, trackLimitHit } from "./services/analytics.js";

const router = express.Router();

const FREE_DAILY_TTS_LIMIT = 3;

// Voice generation route - userKey is optional
router.post("/generate", async (req, res) => {
  try {
    // Extract text from multiple sources (compat with JSON, form-data, query)
    const textFromBody = req.body?.text;
    const textFromFields = req.body?.fields?.text;
    const textFromQuery = req.query?.text;
    
    const content = textFromBody || textFromFields || textFromQuery || "";
    
    if (!content.trim()) {
      // Debug logging for 400 errors
      console.log("[TTS] 400 - Missing text. Debug info:");
      console.log("  content-type:", req.get("content-type") || "not set");
      console.log("  req.body keys:", Object.keys(req.body || {}));
      if (req.body?.fields) {
        console.log("  req.body.fields keys:", Object.keys(req.body.fields));
      }
      console.log("  req.query keys:", Object.keys(req.query || {}));
      
      return res.status(400).json({ error: "Missing text" });
    }

    // userKey is optional - only check subscription/limits if present
    const userKey = resolveUserKey(req);
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

      // Track usage for free users (no blocking - TTS is available to all users)
      // Note: Usage tracking is kept for analytics, but free users are not blocked
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
      
      // Track TTS failure
      trackTTS("fail", userKey, "elevenlabs_error");
      
      // Capture to Sentry
      const error = new Error(`ElevenLabs request failed: ${response.status}`);
      captureException(error, {
        userKey,
        route: "/voice/generate",
        requestId: req.requestId,
        errorType: "elevenlabs_error",
        extra: {
          status: response.status,
          responseText: errText.substring(0, 200), // Limit response text
        },
      });
      
      return res.status(500).json({ error: "ElevenLabs request failed" });
    }

    // Convert MP3 buffer into browser-playable blob
    const audioBuffer = await response.arrayBuffer();
    
    // Calculate remaining count before incrementing (for accurate response)
    // Only track usage if userKey is present
    let remaining = -1; // -1 means unlimited (Pro users or no userKey)
    if (userKey && !isPro) {
      const currentCount = getTodayTTSCount(userKey);
      // Only increment count after successful audio generation
      incrementTodayTTSCount(userKey);
      remaining = Math.max(0, FREE_DAILY_TTS_LIMIT - currentCount - 1);
    }
    
    // Set headers with remaining count information
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("X-TTS-Remaining", remaining.toString());
    res.setHeader("X-TTS-Limit", FREE_DAILY_TTS_LIMIT.toString());
    
    // Log success
    console.log(`[TTS] ok len=${content.length}`);
    
    // Track TTS success
    trackTTS("success", userKey);
    
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    console.error("Voice generation error:", err);
    
    // Track TTS failure
    trackTTS("fail", userKey, err.name || "unknown_error");
    
    // Capture to Sentry
    captureException(err, {
      userKey,
      route: "/voice/generate",
      requestId: req.requestId,
      errorType: err.name || "unknown",
    });
    
    res.status(500).json({ error: "Voice generation failed" });
  }
});

export default router;
