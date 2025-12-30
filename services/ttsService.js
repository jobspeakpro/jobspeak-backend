// jobspeak-backend/services/ttsService.js
// Shared TTS service used by both /api/tts and /voice/generate
import textToSpeech from "@google-cloud/text-to-speech";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const client = new textToSpeech.TextToSpeechClient();

// Cache directory
const cacheDir = path.join(process.cwd(), "data", "tts-cache");
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
}

/**
 * Maps locale to Google TTS voice configuration.
 */
function getVoiceFromLocale(locale, voiceName = "female") {
    const normalizedLocale = locale?.trim() || "en-US";
    const normalizedVoiceName = voiceName?.trim()?.toLowerCase() || "female";

    const localeVoiceMap = {
        "en-US": {
            female: { languageCode: "en-US", name: "en-US-Neural2-F" },
            male: { languageCode: "en-US", name: "en-US-Neural2-D" },
        },
        "en-GB": {
            female: { languageCode: "en-GB", name: "en-GB-Neural2-A" },
            male: { languageCode: "en-GB", name: "en-GB-Neural2-D" },
        },
    };

    const localeMap = localeVoiceMap[normalizedLocale] || localeVoiceMap["en-US"];
    return localeMap[normalizedVoiceName] || localeMap.female;
}

/**
 * Generate cache key from TTS parameters.
 */
function getCacheKey(text, languageCode, voiceName, speakingRate) {
    const data = `${text}|${languageCode}|${voiceName}|${speakingRate}`;
    return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Get cached audio file if exists.
 */
function getCachedAudio(cacheKey) {
    try {
        const cachePath = path.join(cacheDir, `${cacheKey}.mp3`);
        if (fs.existsSync(cachePath)) {
            return fs.readFileSync(cachePath);
        }
    } catch (err) {
        console.error("[TTS Service] Cache read error:", err.message);
    }
    return null;
}

/**
 * Save audio to cache.
 */
function saveCachedAudio(cacheKey, audioBuffer) {
    try {
        const cachePath = path.join(cacheDir, `${cacheKey}.mp3`);
        fs.writeFileSync(cachePath, audioBuffer);
    } catch (error) {
        console.error("[TTS Service] Failed to save cache:", error.message);
    }
}

/**
 * Generate TTS audio (main function).
 * @param {Object} params - TTS parameters
 * @param {string} params.text - Text to synthesize
 * @param {string} params.locale - Locale (en-US or en-GB)
 * @param {string} params.voiceName - Voice name (male or female)
 * @param {number} params.speakingRate - Speaking rate (0.7-1.3)
 * @returns {Promise<{audioBuffer: Buffer, cacheHit: boolean}>}
 */
export async function generateTTS({ text, locale = "en-US", voiceName = "female", speakingRate = 1.0 }) {
    try {
        // Validate text
        if (!text || typeof text !== "string" || text.trim().length === 0) {
            throw new Error("Text is required");
        }

        if (text.length > 3000) {
            throw new Error("Text too long (max 3000 characters)");
        }

        // Normalize parameters
        const normalizedText = text.trim();
        const normalizedRate = Math.max(0.7, Math.min(1.3, speakingRate));

        // Get voice configuration
        const voice = getVoiceFromLocale(locale, voiceName);

        // Generate cache key
        const cacheKey = getCacheKey(normalizedText, voice.languageCode, voice.name, normalizedRate);

        // Check cache
        const cachedAudio = getCachedAudio(cacheKey);
        if (cachedAudio) {
            console.log(`[TTS Service] Cache hit: ${cacheKey.substring(0, 8)}...`);
            return { audioBuffer: cachedAudio, cacheHit: true };
        }

        // Cache miss - call Google TTS API
        console.log(`[TTS Service] Cache miss: ${cacheKey.substring(0, 8)}... - calling Google TTS`);
        const request = {
            input: { text: normalizedText },
            voice: { languageCode: voice.languageCode, name: voice.name },
            audioConfig: { audioEncoding: "MP3", speakingRate: normalizedRate },
        };

        // Add 5s timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Google TTS timed out after 5s")), 5000)
        );

        const [response] = await Promise.race([
            client.synthesizeSpeech(request),
            timeoutPromise
        ]);

        if (!response || !response.audioContent) {
            throw new Error("Missing audioContent from Google TTS");
        }

        const audioBuffer = Buffer.isBuffer(response.audioContent)
            ? response.audioContent
            : Buffer.from(response.audioContent, "binary");

        // Save to cache
        saveCachedAudio(cacheKey, audioBuffer);

        return { audioBuffer, cacheHit: false };
    } catch (err) {
        console.error("[TTS Service] Error:", err.message);
        throw err;
    }
}
