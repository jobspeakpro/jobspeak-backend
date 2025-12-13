import express from "express";
import { askGPT } from "../services/openaiService.js";
import { rateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// --- ANALYZE RESUME (FREE PREVIEW) ---
// Rate limiting: 20 requests per minute per userKey (or IP if userKey not available)
router.post("/analyze", rateLimiter(20, 60000, null, "resume:"), async (req, res) => {
  const { text, userKey } = req.body || {};

  // Validate userKey
  if (!userKey || typeof userKey !== "string" || userKey.trim().length === 0) {
    return res.status(400).json({ error: "userKey is required and must be a non-empty string" });
  }

  if (!text) {
    return res.status(400).json({ error: "Missing 'text' in body." });
  }

  const prompt = `
You are a resume expert. Analyze the following resume text.
Return STRICT JSON ONLY using this EXACT structure:

{
  "topIssues": ["issue 1", "issue 2", "issue 3"],
  "improvedSummary": "A short, clear, US-style resume summary.",
  "roleTip": "A single sentence actionable tip."
}

Resume text:
${text}
`;

  try {
    const result = await askGPT({
      prompt,
      systemPrompt: "You are a resume expert helping job seekers improve their resumes."
    });

    // Parse and return in expected structure
    const parsed = JSON.parse(result);

    return res.json({
      topIssues: parsed.topIssues || [],
      improvedSummary: parsed.improvedSummary || "",
      roleTip: parsed.roleTip || "Keep your resume short, clear, and focused on achievements."
    });

  } catch (err) {
    console.error("Resume /analyze error:", err);
    return res.status(500).json({ error: "Resume analysis failed." });
  }
});

// --- FULL REWRITE (PRO FEATURE) ---
router.post("/rewrite", async (req, res) => {
  const { text } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: "Missing 'text' in body." });
  }

  const prompt = `
Rewrite this resume section in clean, professional US-style English.
Return STRICT JSON ONLY like this:

{
  "rewritten": "full rewritten version",
  "notes": ["note 1", "note 2"]
}

Resume:
${text}
`;

  try {
    const result = await askGPT({
      prompt,
      systemPrompt: "You are a resume expert helping job seekers rewrite their resume sections in clean, professional US-style English."
    });
    return res.json(JSON.parse(result));

  } catch (err) {
    console.error("Resume /rewrite error:", err);
    return res.status(500).json({ error: "Resume rewrite failed." });
  }
});

export default router;
