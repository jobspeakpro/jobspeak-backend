import express from "express";
import { askGPT } from "../services/openaiService.js";

const router = express.Router();

// Simple resume analysis
router.post("/analyze", async (req, res) => {
  const { text } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: "Missing 'text' in body." });
  }

  const prompt = `
Analyze resume. Return JSON:
{
  "issues": ["...", "..."],
  "summaryRewrite": "improved summary section",
  "tip": "one sentence tip"
}

Resume:
${text}
`;

  try {
    const result = await askGPT(prompt, true);
    return res.json(JSON.parse(result));
  } catch (err) {
    console.error("Resume /analyze error:", err);
    return res.status(500).json({ error: "Resume analysis failed." });
  }
});

// Simple resume rewrite
router.post("/rewrite", async (req, res) => {
  const { text } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: "Missing 'text' in body." });
  }

  const prompt = `
Rewrite this resume in clean, simple English.
Return JSON:
{
  "rewritten": "...",
  "notes": ["...", "..."]
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
