import express from "express";
import { askGPT } from "../services/openaiService.js";

const router = express.Router();

// Micro-demo: quick rewrite + encouragement
router.post("/micro-demo", async (req, res) => {
  const { text } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: "Missing 'text' in body." });
  }

  const prompt = `
Rewrite this for a job interview in clear, simple English.
One sentence. No extra details.

User: "${text}"

Return JSON:
{
  "original": "...",
  "improved": "...",
  "message": "short encouragement"
}
`;

  try {
    const result = await askGPT(prompt, true);
    return res.json(JSON.parse(result));
  } catch (err) {
    console.error("AI /micro-demo error:", err);
    return res.status(500).json({ error: "AI micro-demo failed." });
  }
});

// Score endpoint: clarity / confidence / strength
router.post("/score", async (req, res) => {
  const { text } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: "Missing 'text' in body." });
  }

  const prompt = `
Score this interview answer.

Return JSON:
{
  "clarity": 0-100,
  "confidence": 0-100,
  "interviewStrength": 0-100,
  "summary": "simple advice"
}

Answer: "${text}"
`;

  try {
    const result = await askGPT(prompt, true);
    return res.json(JSON.parse(result));
  } catch (err) {
    console.error("AI /score error:", err);
    return res.status(500).json({ error: "AI scoring failed." });
  }
});

export default router;
