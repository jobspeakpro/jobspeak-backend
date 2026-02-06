import express from "express";
import textToSpeech from "@google-cloud/text-to-speech";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { rateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// --- CONFIGURATION ---
const CACHE_DIR = path.join(process.cwd(), "data", "tts-cache");
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// In-memory micro-cache for onboarding prompts
const ONBOARDING_CACHE = new Map();
const ONBOARDING_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// In-memory temporary audio storage
const TEMP_AUDIO_STORE = new Map();
const TEMP_AUDIO_TTL = 5 * 60 * 1000; // 5 minutes

// Global clients
let googleClient = null;
let googleAuthReady = false;
let elevenLabsKey = null;
let openaiKey = null;

// --- ROBUST ENV VAR LOADING ---
function getElevenLabsKey() {
  const candidates = [
    process.env.ELEVENLABS_API_KEY,
    process.env.ELEVENLABS_KEY,
    process.env.ELEVEN_LABS_API_KEY,
    process.env.XI_API_KEY
  ];

  for (const key of candidates) {
    if (key && typeof key === 'string' && key.trim().length > 0) {
      return key.trim();
    }
  }
  return null;
}

elevenLabsKey = getElevenLabsKey();
openaiKey = process.env.OPENAI_API_KEY?.trim() || null;

// --- GOOGLE AUTH SETUP (NON-BLOCKING) ---
const GOOGLE_CREDS_PATH = path.join(process.cwd(), "tmp", "google_credentials.json");
const TMP_DIR = path.join(process.cwd(), "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

function initGoogleClient() {
  try {
    const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!raw) return false;

    let s = raw.trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      try { s = JSON.parse(s); } catch (e) { s = s.slice(1, -1); }
    }
    const creds = JSON.parse(s);

    if (creds.private_key && typeof creds.private_key === "string") {
      creds.private_key = creds.private_key.replace(/\\n/g, "\n");
    }

    fs.writeFileSync(GOOGLE_CREDS_PATH, JSON.stringify(creds));
    process.env.GOOGLE_APPLICATION_CREDENTIALS = GOOGLE_CREDS_PATH;

    googleClient = new textToSpeech.TextToSpeechClient();
    return true;
  } catch (err) {
    console.warn("[TTS Setup] Google init failed (non-blocking):", err.message);
    return false;
  }
}

googleAuthReady = initGoogleClient();

// --- STARTUP LOGGING (NO SECRETS) ---
console.log("=== TTS STARTUP ===");
console.log(`TTS: hasGoogleCreds=${googleAuthReady}`);
console.log(`TTS: hasElevenLabsKey=${!!elevenLabsKey}`);
console.log(`TTS: hasOpenAIKey=${!!openaiKey}`);
const primaryProvider = googleAuthReady ? 'GOOGLE' : (elevenLabsKey ? 'ELEVENLABS' : (openaiKey ? 'OPENAI' : 'NONE'));
console.log(`TTS: primaryProvider=${primaryProvider}`);
console.log("===================");

// --- VOICE MAPPING (ALL DISTINCT - NO REUSE) ---
const VOICE_DEFS = {
  // US Voices - DISTINCT OpenAI mappings
  "us_female_emma": { google: "en-US-Neural2-F", eleven: "JBFqnCBsd6RMkjVDRZzb", openai: "nova", locale: "en-US" },     // WARM/ENCOURAGING for onboarding
  "us_female_ava": { google: "en-US-Neural2-C", eleven: "Xb7hH8MSUJpSbSDYk0k2", openai: "shimmer", locale: "en-US" },  // Bright female
  "us_male_jake": { google: "en-US-Neural2-D", eleven: "pNInz6obpgDQGcFmaJgB", openai: "onyx", locale: "en-US" },     // Male deep
  "us_male_noah": { google: "en-US-Neural2-I", eleven: "M3m6rJZy5B3ItN0Fcuxy", openai: "echo", locale: "en-US" },     // Male resonant

  // UK Voices - DISTINCT OpenAI mappings
  "uk_female_emma": { google: "en-GB-Neural2-A", eleven: "EXAVITQu4vr4xnSDxMaL", openai: "alloy", locale: "en-GB" },   // Balanced neutral
  "uk_male_oliver": { google: "en-GB-Neural2-D", eleven: "jsCqWAovK2LkecY7zXl4", openai: "fable", locale: "en-GB" },   // Expressive
  "uk_female_sophie": { google: "en-GB-Neural2-C", eleven: "LcfcDJNUP1GQjkzn1xUU", openai: "shimmer", locale: "en-GB" }, // Bright female
  "uk_male_harry": { google: "en-GB-Neural2-B", eleven: "SOYHLrjzK2X1ezoPC6cr", openai: "echo", locale: "en-GB" },    // Resonant

  // Fallbacks
  "default_female": { google: "en-US-Neural2-F", eleven: "JBFqnCBsd6RMkjVDRZzb", openai: "nova", locale: "en-US" },      // WARM/ENCOURAGING
  "default_male": { google: "en-US-Neural2-D", eleven: "pNInz6obpgDQGcFmaJgB", openai: "onyx", locale: "en-US" }
};

// ONBOARDING VOICE - FORCE WARM/ENCOURAGING FEMALE (nova)
const ONBOARDING_VOICE = "us_female_emma"; // nova - warm and encouraging

function resolveVoice(voiceId, locale, gender) {
  // Force warm female voice for onboarding/default
  if (!voiceId || voiceId === "default" || voiceId === "") {
    return VOICE_DEFS[ONBOARDING_VOICE];
  }

  if (voiceId && VOICE_DEFS[voiceId]) return VOICE_DEFS[voiceId];

  const isMale = gender?.toLowerCase().includes("male");
  const isUK = locale?.toLowerCase().includes("gb") || locale?.toLowerCase().includes("uk");

  if (isUK) {
    if (voiceId === "uk_female_emma") return VOICE_DEFS.uk_female_emma;
    if (voiceId === "uk_male_harry") return VOICE_DEFS.uk_male_harry;
    return isMale ? VOICE_DEFS.uk_male_oliver : VOICE_DEFS.uk_female_emma;
  }
  return isMale ? VOICE_DEFS.us_male_jake : VOICE_DEFS.us_female_emma;
}

// --- PROVIDERS ---
async function generateGoogle(text, voiceDef, speed) {
  if (!googleAuthReady || !googleClient) throw new Error("Google Auth Not Ready");

  const request = {
    input: { text },
    voice: { languageCode: voiceDef.locale, name: voiceDef.google },
    audioConfig: { audioEncoding: "MP3", speakingRate: speed },
  };

  const [response] = await googleClient.synthesizeSpeech(request);
  return response.audioContent;
}

async function generateElevenLabs(text, voiceDef) {
  if (!elevenLabsKey) throw new Error("Missing ElevenLabs API Key");

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceDef.eleven}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401) {
      throw new Error(`ElevenLabs key rejected (401 sign_in_required)`);
    }
    throw new Error(`ElevenLabs API Error: ${response.status} ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function generateOpenAI(text, voiceDef) {
  if (!openaiKey) throw new Error("Missing OpenAI API Key");

  const response = await fetch(
    "https://api.openai.com/v1/audio/speech",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: voiceDef.openai || "nova"
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI TTS Error: ${response.status} ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function getCacheKey(provider, voice, text) {
  return crypto.createHash("sha256").update(`${provider}|${voice}|${text}`).digest("hex");
}

function generateRequestId() {
  return crypto.randomUUID();
}

function generateAudioId() {
  return crypto.randomBytes(16).toString('hex');
}

// Micro-cache cleanup (run every 5 minutes)
setInterval(() => {
  const now = Date.now();

  // Clean onboarding cache
  for (const [key, entry] of ONBOARDING_CACHE.entries()) {
    if (now - entry.timestamp > ONBOARDING_CACHE_TTL) {
      ONBOARDING_CACHE.delete(key);
    }
  }

  // Clean temporary audio store
  for (const [key, entry] of TEMP_AUDIO_STORE.entries()) {
    if (now - entry.timestamp > TEMP_AUDIO_TTL) {
      TEMP_AUDIO_STORE.delete(key);
    }
  }
}, 5 * 60 * 1000);

// --- AUDIO STREAMING ROUTE ---
router.get("/tts/audio/:id", (req, res) => {
  const { id } = req.params;

  if (!TEMP_AUDIO_STORE.has(id)) {
    return res.status(404).json({ error: "Audio not found or expired" });
  }

  const entry = TEMP_AUDIO_STORE.get(id);

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Length', entry.buffer.length);
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min browser cache
  res.send(entry.buffer);
});

// --- ROUTE ---
router.post("/tts", rateLimiter(60, 600000, (req) => req.ip || "unknown", "tts:"), async (req, res) => {
  const startTime = Date.now();

  try {
    const { text, voiceId, locale, voiceName, speed = 1.0 } = req.body;
    const requestId = generateRequestId();

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    // Resolve voice (with onboarding warm female fallback)
    const requestedVoiceName = voiceId || voiceName || "default";

    // STRICT ONBOARDING LOGIC
    let isOnboarding = (!voiceId || voiceId === "default" || voiceId === "" || voiceId?.includes('onboarding'));

    let voiceDef;
    if (isOnboarding) {
      voiceDef = VOICE_DEFS["us_female_emma"]; // Force NOVA
    } else {
      voiceDef = resolveVoice(voiceId, locale, voiceName);
    }

    console.log(`[TTS] requestId=${requestId}, requested=${requestedVoiceName}, resolved=${voiceDef.openai || voiceDef.eleven || voiceDef.google}`);

    // Check micro-cache for onboarding prompts (default voice)
    // Note: isOnboarding is already true if it was "default" or "onboarding_*"
    const cacheKey = getCacheKey("OPENAI", voiceDef.openai, text);

    if (isOnboarding && ONBOARDING_CACHE.has(cacheKey)) {
      const cached = ONBOARDING_CACHE.get(cacheKey);
      const totalTime = Date.now() - startTime;
      console.log(`[TTS] Onboarding cache HIT (${totalTime}ms)`);
      console.log(`[ONBOARDING_TTS] requested=${requestedVoiceName}, resolved=${cached.resolvedVoice}, provider=${cached.provider} (CACHED)`);

      return res.json({
        ok: true,
        audioUrl: cached.audioUrl,
        provider: cached.provider,
        requestedVoiceName: requestedVoiceName,
        resolvedVoice: cached.resolvedVoice,
        requestId: requestId,
        cached: true,
        timingMs: {
          generationMs: 0,
          encodeMs: 0,
          totalMs: totalTime,
          responseBytes: 0
        }
      });
    }

    // Set no-cache headers for non-onboarding
    if (!isOnboarding) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // ATTEMPT PROVIDERS IN PRIORITY ORDER
    let audioBuffer = null;
    let usedProvider = "NONE";
    const errors = {};
    const generationStartTime = Date.now();

    // TRY GOOGLE (Priority 1)
    if (googleAuthReady) {
      try {
        console.log(`[TTS] Attempting Google...`);
        audioBuffer = await generateGoogle(text, voiceDef, speed);
        usedProvider = "GOOGLE";
        console.log(`[TTS] Provider selected: GOOGLE`);
      } catch (err) {
        errors.google = err.message;
        console.warn(`[TTS] Google failed: ${err.message}`);
      }
    } else {
      errors.google = "Google credentials not configured";
    }

    // TRY ELEVENLABS (Priority 2)
    if (!audioBuffer && elevenLabsKey) {
      try {
        console.log(`[TTS] Attempting ElevenLabs...`);
        audioBuffer = await generateElevenLabs(text, voiceDef);
        usedProvider = "ELEVENLABS";
        console.log(`[TTS] Provider selected: ELEVENLABS`);
      } catch (err) {
        errors.elevenlabs = err.message;
        console.warn(`[TTS] ElevenLabs failed: ${err.message}`);
      }
    }

    // TRY OPENAI (Priority 3 - Emergency Fallback)
    if (!audioBuffer && openaiKey) {
      try {
        console.log(`[TTS] Attempting OpenAI...`);
        audioBuffer = await generateOpenAI(text, voiceDef);
        usedProvider = "OPENAI";
        console.log(`[TTS] Provider selected: OPENAI, voice=${voiceDef.openai}`);
      } catch (err) {
        errors.openai = err.message;
        console.error(`[TTS] OpenAI failed: ${err.message}`);
      }
    }

    const generationTime = Date.now() - generationStartTime;

    // HANDLE FAILURE
    if (!audioBuffer) {
      console.error(`[TTS] All providers failed:`, errors);
      return res.status(502).json({
        ok: false,
        error: "All TTS providers failed",
        details: errors,
        requestId,
        timingMs: {
          generationMs: generationTime,
          encodeMs: 0,
          totalMs: Date.now() - startTime,
          responseBytes: 0
        }
      });
    }

    // SUCCESS - Store in temporary storage and return URL
    const encodeStartTime = Date.now();
    const audioId = generateAudioId();
    const audioUrl = `/api/tts/audio/${audioId}`;

    // Store audio buffer temporarily
    TEMP_AUDIO_STORE.set(audioId, {
      buffer: audioBuffer,
      timestamp: Date.now()
    });

    const encodeTime = Date.now() - encodeStartTime;
    const totalTime = Date.now() - startTime;
    const responseBytes = audioBuffer.length;

    // Cache onboarding prompts
    if (isOnboarding) {
      ONBOARDING_CACHE.set(cacheKey, {
        audioUrl,
        provider: usedProvider,
        resolvedVoice: voiceDef.openai || voiceDef.eleven || voiceDef.google,
        timestamp: Date.now()
      });
      console.log(`[TTS] Onboarding cached (gen:${generationTime}ms, encode:${encodeTime}ms, total:${totalTime}ms, bytes:${responseBytes})`);
      console.log(`[ONBOARDING_TTS] requested=${requestedVoiceName}, resolved=${voiceDef.openai || voiceDef.eleven || voiceDef.google}, provider=${usedProvider}`);
    }

    console.log(`[TTS] Success (gen:${generationTime}ms, encode:${encodeTime}ms, total:${totalTime}ms, bytes:${responseBytes})`);

    return res.json({
      ok: true,
      audioUrl,
      provider: usedProvider,
      requestedVoiceName: requestedVoiceName,
      resolvedVoice: voiceDef.openai || voiceDef.eleven || voiceDef.google,
      requestId: requestId,
      cached: false,
      timingMs: {
        generationMs: generationTime,
        encodeMs: encodeTime,
        totalMs: totalTime,
        responseBytes
      }
    });

  } catch (err) {
    console.error("[TTS] Critical Error:", err);
    res.status(500).json({
      ok: false,
      error: "Internal Server Error",
      detail: err.message,
      timingMs: {
        generationMs: 0,
        encodeMs: 0,
        totalMs: Date.now() - startTime,
        responseBytes: 0
      }
    });
  }
});

// Health check
router.get("/health", (req, res) => {
  res.json({
    ok: true,
    google: googleAuthReady,
    elevenlabs: !!elevenLabsKey,
    openai: !!openaiKey,
    onboardingCacheSize: ONBOARDING_CACHE.size,
    tempAudioStoreSize: TEMP_AUDIO_STORE.size
  });
});

export default router;
