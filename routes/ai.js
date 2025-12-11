// jobspeak-backend/routes/ai.js
import express from "express";
import dotenv from "dotenv";
import { askGPT } from "../services/openaiService.js";

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
 * Body: { text: string }
 *
 * Returns:
 * {
 *   original: string,
 *   improved: string,
 *   message: string
 * }
 */
router.post("/micro-demo", async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res
      .status(400)
      .json({ error: "Please provide your answer text." });
  }

  const baseResponse = {
    original: text,
    message:
      "Great! Now read this answer out loud 2–3 times to build speaking confidence.",
  };

  const hasKey = !!process.env.OPENAI_API_KEY;

  // If no key at all → use local simple improvement
  if (!hasKey) {
    console.warn(
      "No OPENAI_API_KEY found. Using simpleImprove fallback for /ai/micro-demo."
    );
    const improved = simpleImprove(text);
    return res.json({ ...baseResponse, improved });
  }

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

    const improved = await askGPT({
      prompt: userPrompt,
      systemPrompt,
    });

    return res.json({ ...baseResponse, improved });
  } catch (err) {
    console.error("/ai/micro-demo error, falling back to simpleImprove:", err);
    const improved = simpleImprove(text);
    return res.json({ ...baseResponse, improved });
  }
});

export default router;
