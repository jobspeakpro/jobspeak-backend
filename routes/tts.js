import express from "express";
import textToSpeech from "@google-cloud/text-to-speech";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { rateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// --- GOOGLE CLOUD CREDENTIALS HANDLING (RAILWAY FIX) ---
// Write service account JSON to temp file if provided in env var
const CREDENTIALS_PATH = "/tmp/google_credentials.json";

function setupGoogleCredentials() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(`[TTS] Auth mode: Existing env var found (${process.env.GOOGLE_APPLICATION_CREDENTIALS})`);
    return true;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      console.log("[TTS] Auth mode: GOOGLE_APPLICATION_CREDENTIALS_JSON found. Writing to file...");
      const jsonContent = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON.trim();

      // Basic validation
      if (!jsonContent.startsWith('{')) {
        console.error("[TTS] Auth Error: GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON");
        return false;
      }

      fs.writeFileSync(CREDENTIALS_PATH, jsonContent);
      process.env.GOOGLE_APPLICATION_CREDENTIALS = CREDENTIALS_PATH;
      console.log(`[TTS] Auth success: Credentials written to ${CREDENTIALS_PATH}`);
      return true;
    } catch (err) {
      console.error("[TTS] Auth Error: Failed to write credentials file:", err.message);
      return false;
    }
  }

  console.warn("[TTS] Auth Warning: No Google credentials found. TTS may fail if not in ADC environment.");
  return false;
}

const authReady = setupGoogleCredentials();

// Initialize Client (ADC will pick up the env var we just set)
let client;
try {
  client = new textToSpeech.TextToSpeechClient();
  console.log("[TTS] TTS client initialized OK");
} catch (err) {
  console.error("[TTS] Failed to initialize Google TTS Client:", err.message);
}

// --- HEALTH CHECK ---
router.get("/health", (req, res) => {
  return res.json({
    ok: true,
    ttsReady: !!client && authReady,
    authMode: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? "service_account_json" : "default/env",
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || "none"
  });
});

// Create cache directory
const cacheDir = path.join(process.cwd(), "data", "tts-cache");
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
  console.log("[TTS] Created cache directory:", cacheDir);
}

/**
 * Maps voiceId to Google TTS voice configuration (LEGACY - for backward compatibility).
 * @param {string} voiceId - Voice identifier (e.g., "us_female_emma")
 * @returns {{ languageCode: string, name: string }} Google voice config
 */
function getTtsVoice(voiceId) {
  const voiceMap = {
    us_female_emma: { languageCode: "en-US", name: "en-US-Neural2-F" },
    us_female_ava: { languageCode: "en-US", name: "en-US-Neural2-C" },
    us_male_jake: { languageCode: "en-US", name: "en-US-Neural2-D" },
    us_male_noah: { languageCode: "en-US", name: "en-US-Neural2-I" },
    uk_female_amelia: { languageCode: "en-GB", name: "en-GB-Neural2-A" },
    uk_female_sophie: { languageCode: "en-GB", name: "en-GB-Neural2-C" },
    uk_male_oliver: { languageCode: "en-GB", name: "en-GB-Neural2-D" },
    uk_male_harry: { languageCode: "en-GB", name: "en-GB-Neural2-B" },
  };

  // Default to us_female_emma if voiceId is missing or invalid
  const normalizedVoiceId = voiceId?.trim() || "us_female_emma";
  return voiceMap[normalizedVoiceId] || voiceMap.us_female_emma;
}

/**
 * Resolves Google TTS voice configuration based on locale, gender, and variant.
 * @param {string} locale - 'en-US' or 'en-GB'
 * @param {string} voiceName - 'male' or 'female'
 * @param {string} variant - 'emma', 'ava', 'jake', 'noah', 'amelia', 'sophie', 'oliver', 'harry'
 * @returns {{ languageCode: string, name: string }} Google voice config
 */
function resolveVoice(locale, voiceName, variant) {
  const normLocale = locale?.trim() || "en-US";
  const normGender = voiceName?.trim()?.toLowerCase() || "female";
  const normVariant = variant?.trim()?.toLowerCase() || "";

  // Distinct voice mapping
  // Fallback priority: Variant Match -> Locale+Gender Default

  const map = {
    "en-US": {
      female: {
        _default: "en-US-Neural2-F", // Default US Female
        emma: "en-US-Neural2-F",
        ava: "en-US-Neural2-C",   // Distinct from Emma
      },
      male: {
        _default: "en-US-Neural2-D", // Default US Male
        jake: "en-US-Neural2-D",
        noah: "en-US-Neural2-I",     // Distinct from Jake
      }
    },
    "en-GB": {
      female: {
        _default: "en-GB-Neural2-A", // Default GB Female
        amelia: "en-GB-Neural2-A",
        sophie: "en-GB-Neural2-C",   // Distinct from Amelia
      },
      male: {
        _default: "en-GB-Neural2-D", // Default GB Male
        oliver: "en-GB-Neural2-D",
        harry: "en-GB-Neural2-B",    // Distinct from Oliver
      }
    }
  };

  const localeData = map[normLocale] || map["en-US"];
  const genderData = localeData[normGender] || localeData["female"];

  // Try to match variant, otherwise fallback to default
  const voiceId = genderData[normVariant] || genderData._default;

  return {
    languageCode: normLocale,
    name: voiceId
  };
}


/**
 * Generate cache key from TTS parameters.
 * @param {string} text - Text to synthesize
 * @param {string} languageCode - Language code (e.g., 'en-US')
 * @param {string} voiceName - Voice name (e.g., 'en-US-Neural2-F')
 * @param {number} speakingRate - Speaking rate
 * @returns {string} SHA256 hash as cache key
 */
function getCacheKey(text, languageCode, voiceName, speakingRate) {
  const data = `${text}|${languageCode}|${voiceName}|${speakingRate}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Get cached audio file if exists.
 * @param {string} cacheKey - Cache key
 * @returns {Buffer|null} Audio buffer or null if not cached
 */
function getCachedAudio(cacheKey) {
  const cachePath = path.join(cacheDir, `${cacheKey}.mp3`);
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath);
  }
  return null;
}

/**
 * Save audio to cache.
 * @param {string} cacheKey - Cache key
 * @param {Buffer} audioBuffer - Audio data
 */
function saveCachedAudio(cacheKey, audioBuffer) {
  const cachePath = path.join(cacheDir, `${cacheKey}.mp3`);
  try {
    fs.writeFileSync(cachePath, audioBuffer);
  } catch (error) {
    console.error("[TTS] Failed to save cache:", error.message);
  }
}

router.post("/tts", rateLimiter(60, 600000, (req) => req.ip || req.connection?.remoteAddress || 'unknown', "tts:"), async (req, res) => {
  try {
    // Validate text: required, trim, 1-3000 chars
    const raw = req.body?.text;
    const text = typeof raw === "string" ? raw.trim() : "";

    if (!text || text.length < 1 || text.length > 3000) {
      return res.status(400).json({ error: "Missing required field: text" });
    }

    // Determine voice configuration
    let voice;
    const isLegacy = !!req.body?.voiceId;

    if (isLegacy) {
      // LEGACY API: Use voiceId directly
      voice = getTtsVoice(req.body.voiceId);
    } else {
      // NEW API: Support locale + voiceName + voiceVariant
      const locale = req.body?.locale;
      const voiceName = req.body?.voiceName;
      const voiceVariant = req.body?.voiceVariant;

      voice = resolveVoice(locale, voiceName, voiceVariant);

      // Log resolution (dev-only/debug)
      console.log(`[TTS] locale=${locale || 'default'} voiceName=${voiceName || 'default'} variant=${voiceVariant || 'none'} -> voiceId=${voice.name}`);
    }

    // Get speaking rate (support both 'speed' and 'speakingRate')
    let speakingRate = req.body?.speakingRate || req.body?.speed || 1.0;
    if (typeof speakingRate !== "number") {
      speakingRate = 1.0;
    }
    speakingRate = Math.max(0.7, Math.min(1.3, speakingRate));

    // Generate cache key
    const cacheKey = getCacheKey(text, voice.languageCode, voice.name, speakingRate);

    // Check cache
    // Check cache
    const cachedAudio = getCachedAudio(cacheKey);
    if (cachedAudio) {
      console.log(`[TTS] Cache hit: ${cacheKey.substring(0, 8)}...`);
      res.setHeader("X-Cache-Hit", "true");

      // Return Data URI in JSON
      const base64Audio = cachedAudio.toString('base64');
      const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

      return res.status(200).json({
        ok: true,
        audioUrl,
        // Optional: raw metadata if needed
        cached: true
      });
    }

    // Cache miss - call Google TTS API
    console.log(`[TTS] Cache miss: ${cacheKey.substring(0, 8)}... - calling Google TTS`);
    const request = {
      input: { text },
      voice: { languageCode: voice.languageCode, name: voice.name },
      audioConfig: { audioEncoding: "MP3", speakingRate },
    };

    // WRAP GOOGLE CALL IN 3s TIMEOUT
    const ttsPromise = client.synthesizeSpeech(request);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TTS_PROVIDER_TIMEOUT')), 3000)
    );

    let response;
    try {
      const [apiResponse] = await Promise.race([ttsPromise, timeoutPromise]);
      response = apiResponse;
    } catch (err) {
      console.error("[TTS] Google API Error/Timeout:", err.message);
      // Return JSON 200 with error
      return res.status(200).json({
        ok: false,
        reason: "provider_failed",
        error: "tts_timeout",
        detail: "Provider took too long or failed"
      });
    }

    if (!response || !response.audioContent) {
      console.error("[TTS] Missing audioContent in provider response");
      return res.status(200).json({
        ok: false,
        reason: "provider_failed",
        error: "tts_failed",
        detail: "No audio content returned"
      });
    }

    const audioBuffer = Buffer.isBuffer(response.audioContent)
      ? response.audioContent
      : Buffer.from(response.audioContent, "binary");

    // Save to cache
    saveCachedAudio(cacheKey, audioBuffer);

    // Return Data URI in JSON
    const base64Audio = audioBuffer.toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    console.log(`[TTS] Returning status=200 JSON with audioUrl (cache miss)`);
    return res.status(200).json({
      ok: true,
      audioUrl,
      cached: false
    });
    return res.status(200).send(audioBuffer);
  } catch (err) {
    console.error("[TTS] synthesizeSpeech failed:", err?.message || err);
    // Return 502 only for real errors, but valid JSON
    return res.status(502).json({ error: "tts_failed", message: err.message });
  }
});

// PowerShell test examples:
// NEW API (locale-based):
// $body = @{ text = "Hello, this is a test"; locale = "en-GB"; voiceName = "male"; speakingRate = 1.2 } | ConvertTo-Json
// Invoke-RestMethod -Uri "http://localhost:3000/api/tts" -Method POST -Body $body -ContentType "application/json" -OutFile "test-uk.mp3"
//
// LEGACY API (voiceId):
// $body = @{ text = "Hello, this is a test"; voiceId = "uk_male_oliver"; speed = 1.2 } | ConvertTo-Json
// Invoke-RestMethod -Uri "http://localhost:3000/api/tts" -Method POST -Body $body -ContentType "application/json" -OutFile "test.mp3"

export default router;

