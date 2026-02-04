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
console.log(`TTS: selectedProvider=${googleAuthReady ? 'GOOGLE' : (elevenLabsKey ? 'ELEVENLABS' : 'NONE')}`);
console.log("===================");

// --- VOICE MAPPING ---
const VOICE_DEFS = {
  "us_female_emma": { google: "en-US-Neural2-F", eleven: "JBFqnCBsd6RMkjVDRZzb", locale: "en-US" },
  "us_female_ava": { google: "en-US-Neural2-C", eleven: "Xb7hH8MSUJpSbSDYk0k2", locale: "en-US" },
  "us_male_jake": { google: "en-US-Neural2-D", eleven: "pNInz6obpgDQGcFmaJgB", locale: "en-US" },
  "us_male_noah": { google: "en-US-Neural2-I", eleven: "M3m6rJZy5B3ItN0Fcuxy", locale: "en-US" },
  "uk_female_emma": { google: "en-GB-Neural2-A", eleven: "EXAVITQu4vr4xnSDxMaL", locale: "en-GB" },
  "uk_male_oliver": { google: "en-GB-Neural2-D", eleven: "jsCqWAovK2LkecY7zXl4", locale: "en-GB" },
  "uk_female_sophie": { google: "en-GB-Neural2-C", eleven: "LcfcDJNUP1GQjkzn1xUU", locale: "en-GB" },
  "uk_male_harry": { google: "en-GB-Neural2-B", eleven: "SOYHLrjzK2X1ezoPC6cr", locale: "en-GB" },
  "default_female": { google: "en-US-Neural2-F", eleven: "JBFqnCBsd6RMkjVDRZzb", locale: "en-US" },
  "default_male": { google: "en-US-Neural2-D", eleven: "pNInz6obpgDQGcFmaJgB", locale: "en-US" }
};

function resolveVoice(voiceId, locale, gender) {
  if (voiceId && VOICE_DEFS[voiceId]) return VOICE_DEFS[voiceId];

  const isMale = gender?.toLowerCase().includes("male");
  const isUK = locale?.toLowerCase().includes("gb") || locale?.toLowerCase().includes("uk");

  if (isUK) {
    if (voiceId === "uk_female_emma") return VOICE_DEFS.uk_female_emma;
    if (voiceId === "uk_male_harry") return VOICE_DEFS.uk_male_harry;
    return isMale ? VOICE_DEFS.uk_male_oliver : VOICE_DEFS.uk_female_sophie;
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
    const err = await response.text();
    throw new Error(`ElevenLabs API Error: ${response.status} ${err}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function getCacheKey(text, voiceId, speed) {
  return crypto.createHash("sha256").update(`${text}|${voiceId}|${speed}`).digest("hex");
}

// --- ROUTE ---
router.post("/tts", rateLimiter(60, 600000, (req) => req.ip || "unknown", "tts:"), async (req, res) => {
  try {
    const { text, voiceId, locale, voiceName, speed = 1.0 } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    const voiceDef = resolveVoice(voiceId, locale, voiceName);
    const cacheKey = getCacheKey(text, voiceDef.google + "|" + voiceDef.eleven, speed);
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.mp3`);

    // 1. CACHE CHECK
    if (fs.existsSync(cachePath)) {
      console.log(`[TTS] Cache Hit: ${cacheKey.substring(0, 8)}`);
      const audio = fs.readFileSync(cachePath);
      return res.json({
        ok: true,
        audioUrl: `data:audio/mpeg;base64,${audio.toString('base64')}`,
        cached: true,
        voice: voiceId || 'default'
      });
    }

    // 2. ATTEMPT PROVIDERS
    let audioBuffer = null;
    let usedProvider = "NONE";
    let googleError = null;
    let elevenError = null;

    // TRY GOOGLE (if available)
    if (googleAuthReady) {
      try {
        console.log(`[TTS] Attempting Google...`);
        audioBuffer = await generateGoogle(text, voiceDef, speed);
        usedProvider = "GOOGLE";
        console.log(`[TTS] Provider selected: GOOGLE`);
      } catch (err) {
        googleError = err.message;
        console.warn(`[TTS] Google failed: ${err.message}`);
      }
    } else {
      googleError = "Google credentials not configured";
    }

    // FALLBACK TO ELEVENLABS (if Google failed or unavailable)
    if (!audioBuffer && elevenLabsKey) {
      try {
        console.log(`[TTS] Attempting ElevenLabs...`);
        audioBuffer = await generateElevenLabs(text, voiceDef);
        usedProvider = "ELEVENLABS";
        console.log(`[TTS] Provider selected: ELEVENLABS (fallback)`);
      } catch (err) {
        elevenError = err.message;
        console.error(`[TTS] ElevenLabs failed: ${err.message}`);
      }
    }

    // 3. HANDLE FAILURE
    if (!audioBuffer) {
      console.error(`[TTS] All providers failed. Google: ${googleError}, ElevenLabs: ${elevenError}`);
      return res.status(502).json({
        ok: false,
        error: "All TTS providers failed",
        details: {
          google: googleError || "Not attempted",
          elevenlabs: elevenError || "Not attempted"
        }
      });
    }

    // 4. SUCCESS & CACHE
    try {
      fs.writeFileSync(cachePath, audioBuffer);
    } catch (e) {
      console.warn("[TTS] Cache write failed:", e.message);
    }

    return res.json({
      ok: true,
      audioUrl: `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`,
      provider: usedProvider,
      voice: voiceId || 'default'
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
    elevenlabs: !!elevenLabsKey
  });
});

export default router;
