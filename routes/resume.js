import express from "express";
import { askGPT } from "../services/openaiService.js";

const router = express.Router();

// --- ANALYZE RESUME (FREE PREVIEW) ---
router.post("/analyze", async (req, res) => {
  const { text } = req.body || {};

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
    const result = await askGPT(prompt, true);

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
    return res.status400().json({ error: "Missing 'text' in body." });
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
    const result = await askGPT(prompt, true);
    return res.json(JSON.parse(result));

  } catch (err) {
    console.error("Resume /rewrite error:", err);
    return res.status(500).json({ error: "Resume rewrite failed." });
  }
});

export default router;
