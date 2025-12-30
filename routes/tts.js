import express from "express";
import textToSpeech from "@google-cloud/text-to-speech";

const router = express.Router();

// ADC is used automatically (from `gcloud auth application-default login`)
const client = new textToSpeech.TextToSpeechClient();

console.log("[TTS] /api/tts route loaded (Google ADC)");

/**
 * Maps voiceId to Google TTS voice configuration.
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

router.post("/tts", async (req, res) => {
  try {
    // Validate text: required, trim, 1-3000 chars
    const raw = req.body?.text;
    const text = typeof raw === "string" ? raw.trim() : "";

    if (!text || text.length < 1 || text.length > 3000) {
      return res.status(400).json({ error: "bad_request" });
    }

    // Get voiceId (optional, default "us_female_emma")
    const voiceId = req.body?.voiceId || "us_female_emma";
    const voice = getTtsVoice(voiceId);

    // Get speed (optional, default 1.0, clamp to [0.7, 1.3])
    let speed = typeof req.body?.speed === "number" ? req.body.speed : 1.0;
    speed = Math.max(0.7, Math.min(1.3, speed));

    const request = {
      input: { text },
      voice: { languageCode: voice.languageCode, name: voice.name },
      audioConfig: { audioEncoding: "MP3", speakingRate: speed },
    };

    const [response] = await client.synthesizeSpeech(request);

    if (!response || !response.audioContent) {
      console.error("[TTS] Missing audioContent");
      return res.status(502).json({ error: "tts_failed" });
    }

    const audioBuffer = Buffer.isBuffer(response.audioContent)
      ? response.audioContent
      : Buffer.from(response.audioContent, "binary");

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(audioBuffer);
  } catch (err) {
    console.error("[TTS] synthesizeSpeech failed:", err?.message || err);
    return res.status(502).json({ error: "tts_failed" });
  }
});

// PowerShell test example:
// $body = @{ text = "Hello, this is a test"; voiceId = "uk_male_oliver"; speed = 1.2 } | ConvertTo-Json
// Invoke-RestMethod -Uri "http://localhost:3000/api/tts" -Method POST -Body $body -ContentType "application/json" -OutFile "test.mp3"

export default router;
