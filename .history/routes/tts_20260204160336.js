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
  "us_female_emma": { google: "en-US-Neural2-F", eleven: "JBFqnCBsd6RMkjVDRZzb", openai: "shimmer", locale: "en-US" },  // CLEARLY FEMALE for onboarding
  "us_female_ava": { google: "en-US-Neural2-C", eleven: "Xb7hH8MSUJpSbSDYk0k2", openai: "nova", locale: "en-US" },     // Female warm
  "us_male_jake": { google: "en-US-Neural2-D", eleven: "pNInz6obpgDQGcFmaJgB", openai: "onyx", locale: "en-US" },     // Male deep
  "us_male_noah": { google: "en-US-Neural2-I", eleven: "M3m6rJZy5B3ItN0Fcuxy", openai: "echo", locale: "en-US" },     // Male resonant

  // UK Voices - DISTINCT OpenAI mappings
  "uk_female_emma": { google: "en-GB-Neural2-A", eleven: "EXAVITQu4vr4xnSDxMaL", openai: "alloy", locale: "en-GB" },   // Balanced neutral
  "uk_male_oliver": { google: "en-GB-Neural2-D", eleven: "jsCqWAovK2LkecY7zXl4", openai: "fable", locale: "en-GB" },   // Expressive
  "uk_female_sophie": { google: "en-GB-Neural2-C", eleven: "LcfcDJNUP1GQjkzn1xUU", openai: "nova", locale: "en-GB" },    // Warm female (reused but different region)
  "uk_male_harry": { google: "en-GB-Neural2-B", eleven: "SOYHLrjzK2X1ezoPC6cr", openai: "echo", locale: "en-GB" },    // Resonant (reused but different region)

  // Fallbacks
  "default_female": { google: "en-US-Neural2-F", eleven: "JBFqnCBsd6RMkjVDRZzb", openai: "shimmer", locale: "en-US" },  // CLEARLY FEMALE
  "default_male": { google: "en-US-Neural2-D", eleven: "pNInz6obpgDQGcFmaJgB", openai: "onyx", locale: "en-US" }
};

// ONBOARDING VOICE - FORCE FEMALE
const ONBOARDING_VOICE = "us_female_emma"; // shimmer - clearly female

function resolveVoice(voiceId, locale, gender) {
  // Force female voice for onboarding
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
        voice: voiceDef.openai || "shimmer"
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI TTS Error: ${response.status} ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function getCacheKey(text, voiceId, speed) {
  return crypto.createHash("sha256").update(`${text}|${voiceId}|${speed}`).digest("hex");
}

function generateRequestId() {
  return crypto.randomUUID();
}

// --- ROUTE ---
router.post("/tts", rateLimiter(60, 600000, (req) => req.ip || "unknown", "tts:"), async (req, res) => {
  try {
    const { text, voiceId, locale, voiceName, speed = 1.0 } = req.body;
    const requestId = generateRequestId();

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    // Resolve voice (with onboarding female fallback)
    const requestedVoiceName = voiceId || voiceName || "default";
    const voiceDef = resolveVoice(voiceId, locale, voiceName);

    // NO CACHE - always generate fresh
    console.log(`[TTS] requestId=${requestId}, requestedVoiceName=${requestedVoiceName}, resolvedVoice=${voiceDef.openai || voiceDef.eleven || voiceDef.google}`);

    // Set no-cache headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // ATTEMPT PROVIDERS IN PRIORITY ORDER
    let audioBuffer = null;
    let usedProvider = "NONE";
    const errors = {};

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
        console.log(`[TTS] Attempting OpenAI (emergency fallback)...`);
        audioBuffer = await generateOpenAI(text, voiceDef);
        usedProvider = "OPENAI";
        console.log(`[TTS] Provider selected: OPENAI, voice=${voiceDef.openai}`);
      } catch (err) {
        errors.openai = err.message;
        console.error(`[TTS] OpenAI failed: ${err.message}`);
      }
    }

    // HANDLE FAILURE
    if (!audioBuffer) {
      console.error(`[TTS] All providers failed:`, errors);
      return res.status(502).json({
        ok: false,
        error: "All TTS providers failed",
        details: errors,
        requestId
      });
    }

    // SUCCESS - NO CACHING
    return res.json({
      ok: true,
      audioUrl: `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`,
      provider: usedProvider,
      requestedVoiceName: requestedVoiceName,
      resolvedVoice: voiceDef.openai || voiceDef.eleven || voiceDef.google,
      requestId: requestId,
      cached: false
    });

  } catch (err) {
    console.error("[TTS] Critical Error:", err);
    res.status(500).json({
      ok: false,
      error: "Internal Server Error",
      detail: err.message
    });
  }
});

// Health check
router.get("/health", (req, res) => {
  res.json({
    ok: true,
    google: googleAuthReady,
    elevenlabs: !!elevenLabsKey,
    openai: !!openaiKey
  });
});

export default router;
