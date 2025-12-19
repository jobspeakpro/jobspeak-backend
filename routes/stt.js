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

// Initialize OpenAI - handle missing env var gracefully (don't crash on boot)
if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️ OPENAI_API_KEY is not set. STT endpoint will return errors if called.");
}

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Ensure tmp directory exists
const tmpDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max file size
});

// Multer error handler middleware - must be before route handlers
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Clean up any partial uploads
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: "File too large", 
        details: "Maximum file size is 25MB" 
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: "Too many files", 
        details: "Only one file is allowed" 
      });
    }
    
    // Generic multer error
    return res.status(400).json({ 
      error: "File upload error", 
      details: err.message 
    });
  }
  
  // Pass non-multer errors to next handler
  next(err);
};

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

// Custom multer middleware that supports both "audio" and "file" field names
// Uses multer.fields() to accept either field, then normalizes to req.file
const uploadAudio = (req, res, next) => {
  // Accept both "audio" and "file" fields (max 1 file total)
  const uploadFields = upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'file', maxCount: 1 }
  ]);
  
  uploadFields(req, res, (err) => {
    if (err) {
      return next(err);
    }
    
    // Normalize req.files to req.file for compatibility
    // Check "audio" first, then "file"
    if (req.files) {
      if (req.files['audio'] && req.files['audio'][0]) {
        req.file = req.files['audio'][0];
      } else if (req.files['file'] && req.files['file'][0]) {
        req.file = req.files['file'][0];
      }
    }
    
    next();
  });
};

// Rate limiting: 20 requests per minute per userKey (or IP if userKey not available)
// Note: userKey comes from form-data, so rate limiting happens after multer
// Order: multer -> validateUserKey -> rateLimiter -> handler
router.post("/stt", uploadAudio, handleMulterError, validateUserKey, rateLimiter(20, 60000, null, "stt:"), async (req, res) => {
  // ========== DEBUG LOGGING ==========
  console.log("=== STT REQUEST DEBUG ===");
  console.log("Content-Type:", req.headers['content-type']);
  console.log("Body keys:", Object.keys(req.body || {}));
  console.log("File present:", !!req.file);
  if (req.file) {
    console.log("File metadata:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      fieldname: req.file.fieldname,
    });
  }
  console.log("userKey present:", !!req.body?.userKey);
  console.log("userKey value:", req.body?.userKey ? `${req.body.userKey.substring(0, 10)}...` : "missing");
  console.log("=========================");
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    // Check for missing environment keys
    const missingKeys = [];
    if (!process.env.OPENAI_API_KEY) {
      missingKeys.push("OPENAI_API_KEY");
    }
    
    if (missingKeys.length > 0) {
      console.error("STT ERROR: Missing required environment keys:", missingKeys);
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(500).json({ 
        error: "STT misconfigured", 
        missing: missingKeys
      });
    }

    if (!openai) {
      console.error("STT ERROR: OpenAI client not initialized - missing OPENAI_API_KEY");
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(500).json({ 
        error: "STT misconfigured", 
        missing: ["OPENAI_API_KEY"]
      });
    }

    console.log("Calling OpenAI transcription API...");
    const transcript = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "gpt-4o-mini-transcribe",
    });

    console.log("Transcription successful, length:", transcript.text?.length || 0);
    fs.unlink(req.file.path, () => {});

    return res.json({
      transcript: transcript.text || "",
    });
  } catch (error) {
    // Robust server-side logging with full error details
    console.error("=== STT ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error name:", error.name);
    console.error("Error code:", error.code);
    console.error("Error status:", error.status);
    console.error("Full stack:", error.stack);
    console.error("Request context:", {
      userKey: req.userKey,
      filePath: req.file?.path,
      fileField: req.file?.fieldname,
      contentType: req.headers['content-type'],
    });
    console.error("=================");
    
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    
    // Return descriptive JSON error
    // Check if it's an OpenAI API error
    if (error.status || error.code) {
      return res.status(error.status || 500).json({ 
        error: "Speech-to-text failed", 
        details: error.message || "Unknown error occurred"
      });
    }
    
    return res.status(500).json({ 
      error: "Speech-to-text failed", 
      details: error.message || "Unknown error occurred"
    });
  }
});

export default router;
