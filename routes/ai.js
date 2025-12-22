// jobspeak-backend/routes/ai.js
import express from "express";
import dotenv from "dotenv";
import crypto from "crypto";
import { askGPT } from "../services/openaiService.js";
import { rateLimiter } from "../middleware/rateLimiter.js";
import { saveSessionWithIdempotency } from "../services/db.js";

dotenv.config();

const router = express.Router();

/**
 * Very simple local "improvement" if OpenAI fails.
 * - Trim spaces
 * - Collapse multiple spaces
 * - Capitalize first letter
 * - Add a period at the end if missing
 */
function simpleImprove(text) {
  if (!text) return "";
  let cleaned = text.trim().replace(/\s+/g, " ");
  if (cleaned.length === 0) return "";
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (!/[.!?]$/.test(cleaned)) {
    cleaned += ".";
  }
  return cleaned;
}

/**
 * POST /ai/micro-demo
 * Body: { text: string, userKey: string }
 *
 * Returns:
 * {
 *   original: string,
 *   improved: string,
 *   message: string
 * }
 * 
 * CRITICAL: This endpoint does NOT consume daily speaking attempts.
 * Only successful STT transcriptions (/api/stt) consume daily attempts.
 * This endpoint has its own separate rate limit (30/min) but NO usage limit.
 */
// Rate limiting: 30 requests per minute per userKey (or IP if userKey not available)
router.post("/micro-demo", rateLimiter(30, 60000, null, "ai:"), async (req, res) => {
  const { text, userKey } = req.body;
  
  // Log that this route does NOT check or consume STT attempts
  if (userKey) {
    console.log(`[AI/micro-demo] Request received - userKey: ${userKey}, route: /ai/micro-demo (NO STT attempt check/consumption)`);
  }

  // Validate text input size (max 5000 characters)
  if (!text || !text.trim()) {
    return res
      .status(400)
      .json({ error: "Please provide your answer text." });
  }

  if (text.length > 5000) {
    return res
      .status(400)
      .json({ error: "Text input is too long. Maximum 5000 characters allowed." });
  }

  const baseResponse = {
    original: text,
    message:
      "Great! Now read this answer out loud 2–3 times to build speaking confidence.",
  };

  const hasKey = !!process.env.OPENAI_API_KEY;
  let improved = "";

  // If no key at all → use local simple improvement
  if (!hasKey) {
    console.warn(
      "No OPENAI_API_KEY found. Using simpleImprove fallback for /ai/micro-demo."
    );
    improved = simpleImprove(text);
  } else {
    // Try OpenAI first, but if it fails, fall back to simpleImprove
    try {
      const systemPrompt =
        "You are an AI English interview coach for ESL job seekers. Your job is to take their answer and rewrite it into natural, clear, confident English that is easy to say out loud in a real job interview. Keep the meaning the same, but improve grammar, structure, and tone. Do NOT make the answer too long or too complex. Make it sound like something a real person can remember and speak.";

      const userPrompt = `
Original answer from ESL job seeker:

"${text}"

Task:
1. Rewrite this answer into natural, clear, confident English.
2. Keep the meaning the same.
3. Make it easy to say out loud.
4. Avoid very long or complicated sentences.
5. Return ONLY the improved answer text, no explanation.
`;

      improved = await askGPT({
        prompt: userPrompt,
        systemPrompt,
      });
    } catch (err) {
      console.error("/ai/micro-demo error, falling back to simpleImprove:", err);
      improved = simpleImprove(text);
    }
  }

  const response = { ...baseResponse, improved };

  // Auto-save session server-side after interview submission
  // Uses idempotency key to avoid duplicates (e.g., from retries or double-clicks)
  if (userKey && text && text.trim()) {
    try {
      // Generate idempotency key: hash of userKey + normalized text
      // Normalize text by trimming and lowercasing to catch near-duplicates
      const normalizedText = text.trim().toLowerCase().replace(/\s+/g, ' ');
      const idempotencyData = `${userKey.trim()}:${normalizedText}`;
      const idempotencyKey = crypto
        .createHash('sha256')
        .update(idempotencyData)
        .digest('hex')
        .substring(0, 32); // Use first 32 chars as key

      const aiResponseJson = JSON.stringify(response);
      
      // Save session with idempotency (returns existing session if key exists, prevents duplicates)
      saveSessionWithIdempotency(
        userKey.trim(),
        text.trim(),
        aiResponseJson,
        null, // score
        idempotencyKey
      );
    } catch (saveError) {
      // Log but don't fail the request - session saving is non-critical
      console.error("Failed to auto-save session server-side:", saveError);
    }
  }

  return res.json(response);
});

export default router;
