```javascript
import express from "express";
// import textToSpeech from "@google-cloud/text-to-speech"; // Converted to dynamic import for memory optimization
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { rateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// --- GOOGLE CLOUD CREDENTIALS HANDLING (RAILWAY FIX) ---
// Write service account JSON to temp file if provided in env var
const CREDENTIALS_PATH = "/tmp/google_credentials.json";

/**
 * Robust credential loader that handles Railway's various paste formats
 * @returns {{ ok: boolean, creds?: object, error?: string }}
 */
function loadServiceAccountFromEnv() {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!raw) {
    return { ok: false, error: "missing_creds" };
  }

  try {
    let s = raw.trim();

    // If wrapped in quotes, unquote once
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      try {
        s = JSON.parse(s);
      } catch (e) {
        // If parse fails, just strip quotes manually
        s = s.slice(1, -1);
      }
    }

    // DO NOT replace \\n before JSON.parse - it corrupts the JSON
    const creds = JSON.parse(s);

    // Validate required fields
    if (!creds.client_email || !creds.private_key || !creds.project_id) {
      return { ok: false, error: "bad_creds_shape" };
    }

    // Normalize private_key AFTER parse only
    if (typeof creds.private_key === "string") {
      // If it contains literal backslash-n sequences, convert to real newlines for Google client
      creds.private_key = creds.private_key.replace(/\\n/g, "\n");
    }

    return { ok: true, creds };
  } catch (e) {
    console.error("[TTS] Credential parse error:", e.message);
    return { ok: false, error: "creds_parse_failed", detail: e.message };
  }
}

const credResult = loadServiceAccountFromEnv();
const authReady = credResult.ok;

// Initialize Client (ADC will pick up the env var we just set)
let client;
if (authReady) {
  try {
    // Write credentials to file
    fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(credResult.creds));
    process.env.GOOGLE_APPLICATION_CREDENTIALS = CREDENTIALS_PATH;
    console.log(`[TTS] Auth success: Credentials written to ${ CREDENTIALS_PATH } `);
    console.log(`[TTS] Project ID: ${ credResult.creds.project_id } `);

    client = new textToSpeech.TextToSpeechClient();
    console.log("[TTS] TTS client initialized OK");
  } catch (err) {
    console.error("[TTS] Failed to initialize Google TTS Client:", err.message);
  }
} else {
  console.error(`[TTS] Auth Error: ${ credResult.error } `);
}

// --- HEALTH CHECK ---
router.get("/health", (req, res) => {
  const r = loadServiceAccountFromEnv();

  if (!r.ok) {
    return res.status(500).json({
      ok: false,
      ttsReady: false,
      authMode: "service_account_json",
      projectId: null,
      error: r.error
    });
  }

  return res.json({
    ok: true,
    ttsReady: true,
    authMode: "service_account_json",
    projectId: r.creds.project_id,
    hasCreds: true,
    error: null
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
  const data = `${ text }| ${ languageCode }| ${ voiceName }| ${ speakingRate } `;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Get cached audio file if exists.
 * @param {string} cacheKey - Cache key
 * @returns {Buffer|null} Audio buffer or null if not cached
 */
function getCachedAudio(cacheKey) {
  const cachePath = path.join(cacheDir, `${ cacheKey }.mp3`);
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
  const cachePath = path.join(cacheDir, `${ cacheKey }.mp3`);
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
      console.log(`[TTS] locale = ${ locale || 'default' } voiceName = ${ voiceName || 'default' } variant = ${ voiceVariant || 'none' } -> voiceId=${ voice.name } `);
    }

    // Get speaking rate (support both 'speed' and 'speakingRate')
    let speakingRate = req.body?.speakingRate || req.body?.speed || 1.0;
    if (typeof speakingRate !== "number") {
      speakingRate = 1.0;
    }
    speakingRate = Math.max(0.7, Math.min(1.3, speakingRate));

    // Generate cache key
    const cacheKey = getCacheKey(text, voice.languageCode, voice.name, speakingRate);

    // 1. EARLY AUTH CHECK
    // If we don't have credentials, fail FAST.
    if (!client || !authReady) {
      console.error("[TTS] Critical: No credentials available. Returning missing_creds.");
      return res.status(200).json({
        ok: false,
        reason: "provider_failed",
        error: "missing_creds",
        detail: "TTS Service has no credentials configured."
      });
    }

    // Check cache
    const cachedAudio = getCachedAudio(cacheKey);
    if (cachedAudio) {
      console.log(`[TTS] Cache hit: ${ cacheKey.substring(0, 8) }...`);
      res.setHeader("X-Cache-Hit", "true");

      // Return Data URI in JSON
      const base64Audio = cachedAudio.toString('base64');
      const audioUrl = `data: audio / mpeg; base64, ${ base64Audio } `;

      return res.status(200).json({
        ok: true,
        audioUrl,
        // Optional: raw metadata if needed
        cached: true
      });
    }

    // Cache miss - call Google TTS API
    console.log(`[TTS] Cache miss: ${ cacheKey.substring(0, 8) }... - calling Google TTS`);
    const request = {
      input: { text },
      voice: { languageCode: voice.languageCode, name: voice.name },
      audioConfig: { audioEncoding: "MP3", speakingRate },
    };

    // WRAP GOOGLE CALL IN 12s TIMEOUT
    const TIMEOUT_MS = 12000;
    const ttsPromise = client.synthesizeSpeech(request);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TTS_PROVIDER_TIMEOUT')), TIMEOUT_MS)
    );

    let response;
    const startTime = Date.now();
    console.log("[TTS] start request to Google...");

    try {
      const [apiResponse] = await Promise.race([ttsPromise, timeoutPromise]);
      response = apiResponse;

      const duration = Date.now() - startTime;
      console.log(`[TTS] response received in ${ duration } ms`);

    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`[TTS] Google API Failed after ${ duration } ms.Error: ${ err.message } `);

      // Return JSON 200 with error
      return res.status(200).json({
        ok: false,
        reason: "provider_failed",
        error: err.message === 'TTS_PROVIDER_TIMEOUT' ? "tts_timeout" : "tts_failed",
        detail: err.message
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
    const audioUrl = `data: audio / mpeg; base64, ${ base64Audio } `;

    console.log(`[TTS] Returning status = 200 JSON with audioUrl(cache miss)`);
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

