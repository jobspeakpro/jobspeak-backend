// jobspeak-backend/routes/stt.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { rateLimiter } from "../middleware/rateLimiter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Ensure tmp directory exists
const tmpDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max file size
});

// Middleware: validate userKey (required for STT)
const validateUserKey = (req, res, next) => {
  // userKey is available in req.body after multer processes form-data
  // If body is not parsed (empty request), req.body might be undefined
  const userKey = req.body?.userKey;
  
  // Validate userKey is present
  if (!userKey || typeof userKey !== "string" || userKey.trim().length === 0) {
    // Clean up uploaded file if present
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    return res.status(400).json({ error: "userKey is required and must be a non-empty string" });
  }

  // Attach to request for use in route handlers
  req.userKey = userKey.trim();
  next();
};

// Rate limiting: 20 requests per minute per userKey (or IP if userKey not available)
// Note: userKey comes from form-data, so rate limiting happens after multer
// Order: multer -> validateUserKey -> rateLimiter -> handler
router.post("/stt", upload.single("audio"), validateUserKey, rateLimiter(20, 60000, null, "stt:"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    const transcript = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "gpt-4o-mini-transcribe",
    });

    fs.unlink(req.file.path, () => {});

    return res.json({
      text: transcript.text || "",
    });
  } catch (error) {
    console.error("STT ERROR:", error);
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    return res.status(500).json({ error: "Speech-to-text failed" });
  }
});

export default router;

