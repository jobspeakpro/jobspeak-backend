import express from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { rateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// --- CONFIGURATION ---
const CACHE_DIR = path.join(process.cwd(), "data", "tts-cache");
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.log("[TTS] Created cache directory:", CACHE_DIR);
}

// Map of internal voice IDs to ElevenLabs Voice IDs
// Sources from voiceRoute.js and common ElevenLabs defaults
const VOICE_MAP = {
  // US Voices
  "us_female_emma": "JBFqnCBsd6RMkjVDRZzb", // Default female (actually "Rachel" or similar on 11Labs usually, but using ID from voiceRoute)
  "us_female_ava": "Xb7hH8MSUJpSbSDYk0k2",
  "us_male_jake": "pNInz6obpgDQGcFmaJgB",
  "us_male_noah": "M3m6rJZy5B3ItN0Fcuxy",

  // UK Voices
  "uk_female_amelia": "LcfcDJNUP1GQjkzn1xUU", // Mapping Sophie ID as standby or finding similar
  "uk_female_sophie": "LcfcDJNUP1GQjkzn1xUU",
  "uk_male_oliver": "jsCqWAovK2LkecY7zXl4",
  "uk_male_harry": "SOYHLrjzK2X1ezoPC6cr",

  // Generic Fallbacks
  "female": "JBFqnCBsd6RMkjVDRZzb",
  "male": "pNInz6obpgDQGcFmaJgB",
  "default": "JBFqnCBsd6RMkjVDRZzb"
};

/**
 * Resolves to an ElevenLabs Voice ID based on input params
 */
function resolveVoiceId(voiceId, locale, voiceName) {
  // 1. Direct match in map
  if (voiceId && VOICE_MAP[voiceId]) return VOICE_MAP[voiceId];

  // 2. Locale + Name composite (e.g. "en-US_male")
  if (locale && voiceName) {
    const key = `${locale}_${voiceName}`.toLowerCase(); // e.g. en-us_male (not in map currently, but could be added)
    // Simplify to just gender if possible or use defaults
  }

  // 3. Gender based fallback
  if (voiceName) {
    const gender = voiceName.toLowerCase();
    if (gender.includes("female")) return VOICE_MAP.female;
    if (gender.includes("male")) return VOICE_MAP.male;
  }

  // 4. Locale based fallback (Simple mapping)
  if (locale && locale.toLowerCase().includes("gb")) {
    return VOICE_MAP.uk_female_sophie;
  }

  // 5. Default
  return VOICE_MAP.default;
}

/**
 * Generate cache key
 */
function getCacheKey(text, voiceId, speed) {
  const data = `${text}|${voiceId}|${speed}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

router.get("/health", (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  return res.json({
    ok: true,
    provider: "elevenlabs",
    hasKey: !!apiKey
  });
});

router.post("/tts", rateLimiter(60, 600000, (req) => req.ip || "unknown", "tts:"), async (req, res) => {
  try {
    const { text, voiceId, locale, voiceName, speed = 1.0 } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Missing required field: text" });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error("[TTS] Critical: Missing ELEVENLABS_API_KEY");
      return res.status(500).json({ error: "Service configuration error (missing credentials)" });
    }

    const targetVoiceId = resolveVoiceId(voiceId, locale, voiceName);
    const cacheKey = getCacheKey(text.trim(), targetVoiceId, speed);
    console.log(`[TTS] Request: "${text.substring(0, 20)}..." -> Voice: ${targetVoiceId}`);

    // 1. Check Cache
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.mp3`);
    if (fs.existsSync(cachePath)) {
      console.log(`[TTS] Cache Hit: ${cacheKey}`);
      res.setHeader("X-Cache-Hit", "true");
      const audioBuffer = fs.readFileSync(cachePath);
      const audioUrl = `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`;
      return res.json({ ok: true, audioUrl, cached: true });
    }

    // 2. Call ElevenLabs
    console.log(`[TTS] Cache Miss. Calling ElevenLabs...`);

    // NOTE: ElevenLabs API does not natively support "speed" parameter in the same way as Google.
    // We ignore it for now or could use "stability" to approximate intent, but standard API is text -> audio.

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: "eleven_turbo_v2", // Low latency model
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
        // Add timeout signal via AbortController if supported, or node-fetch options
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[TTS] ElevenLabs Error (${response.status}): ${errText}`);
      return res.status(502).json({ error: "TTS Provider failed", details: errText });
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // 3. Save to Cache
    try {
      fs.writeFileSync(cachePath, audioBuffer);
    } catch (e) {
      console.error("[TTS] Cache Write Error:", e);
    }

    // 4. Return valid format
    console.log(`[TTS] Success. Returning ${audioBuffer.length} bytes.`);
    const audioUrl = `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`;

    return res.json({
      ok: true,
      audioUrl,
      cached: false
    });

  } catch (err) {
    console.error("[TTS] Unhandled Exception:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

