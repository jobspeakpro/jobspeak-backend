// jobspeak-backend/routes/stt.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { rateLimiter } from "../middleware/rateLimiter.js";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Set ffmpeg path from ffmpeg-static (works on Railway without system ffmpeg)
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
  console.log("FFmpeg path set to:", ffmpegStatic);
} else {
  console.warn("⚠️ ffmpeg-static not found. WebM conversion may fail.");
}

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

// Supported audio mimetypes and their extensions
const SUPPORTED_MIMETYPES = {
  "audio/webm": ".webm",
  "video/webm": ".webm", // video/webm is treated as audio/webm for OpenAI
  "audio/ogg": ".ogg",
  "video/ogg": ".ogg", // video/ogg is treated as audio/ogg for OpenAI
  "audio/wav": ".wav",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".mp4",
};

// Helper function to normalize mimetype for OpenAI
const normalizeMimetypeForOpenAI = (mimetype) => {
  // Normalize video/webm to audio/webm
  if (mimetype === "video/webm") {
    return "audio/webm";
  }
  // Normalize video/ogg to audio/ogg
  if (mimetype === "video/ogg") {
    return "audio/ogg";
  }
  return mimetype;
};

// Helper function to get filename with extension based on mimetype
const getFilenameWithExtension = (mimetype) => {
  if (mimetype.includes("webm")) {
    return "audio.webm";
  }
  if (mimetype.includes("ogg")) {
    return "audio.ogg";
  }
  if (mimetype === "audio/wav") {
    return "audio.wav";
  }
  if (mimetype === "audio/mpeg") {
    return "audio.mp3";
  }
  if (mimetype === "audio/mp4") {
    return "audio.mp4";
  }
  // Fallback
  return "audio";
};

// Helper function to check if file is webm
const isWebmFile = (mimetype, originalname) => {
  return mimetype === "audio/webm" || 
         mimetype === "video/webm" ||
         (originalname && originalname.toLowerCase().endsWith(".webm"));
};

// Helper function to convert webm to wav using ffmpeg
const convertWebmToWav = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    console.log("Converting WebM to WAV:", inputPath, "->", outputPath);
    ffmpeg(inputPath)
      .toFormat("wav")
      .audioCodec("pcm_s16le")
      .audioFrequency(16000)
      .on("start", (commandLine) => {
        console.log("FFmpeg command:", commandLine);
      })
      .on("progress", (progress) => {
        console.log("FFmpeg progress:", JSON.stringify(progress));
      })
      .on("end", () => {
        console.log("FFmpeg conversion completed successfully");
        resolve();
      })
      .on("error", (err) => {
        console.error("FFmpeg conversion error:", err);
        reject(err);
      })
      .save(outputPath);
  });
};

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
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    // Log file metadata ONCE per request
    console.log("STT Request - mimetype:", req.file.mimetype, "originalname:", req.file.originalname || "(not provided)", "size:", req.file.size, "bytes");

    // Validate mimetype before proceeding
    if (!req.file.mimetype || !SUPPORTED_MIMETYPES[req.file.mimetype]) {
      console.error("STT ERROR: Unsupported mimetype:", req.file.mimetype);
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(400).json({ 
        error: "unsupported_audio_type", 
        mimetype: req.file.mimetype,
        supported: Object.keys(SUPPORTED_MIMETYPES)
      });
    }

    // Check file size - if 0 or < 1000 bytes, return 400 immediately
    if (!req.file.size || req.file.size < 1000) {
      console.error("STT ERROR: File too small - size:", req.file.size);
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(400).json({ 
        error: "empty_audio_upload", 
        size: req.file.size 
      });
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

    // Check if file is webm and needs conversion
    const needsConversion = isWebmFile(req.file.mimetype, req.file.originalname);
    let fileToTranscribe = req.file.path;
    let wavFilePath = null;
    let shouldDeleteWav = false;

    if (needsConversion) {
      console.log("WebM file detected, converting to WAV before transcription");
      // Generate WAV output path
      wavFilePath = path.join(tmpDir, `${path.basename(req.file.path)}.wav`);
      shouldDeleteWav = true;
      // Store on request for error handler cleanup
      req.wavFilePath = wavFilePath;
      
      // Convert webm to wav
      await convertWebmToWav(req.file.path, wavFilePath);
      
      // Verify WAV file was created
      if (!fs.existsSync(wavFilePath)) {
        console.error("STT ERROR: WAV conversion failed - output file not found");
        fs.unlink(req.file.path, () => {});
        return res.status(500).json({ 
          error: "conversion_failed", 
          details: "Failed to convert WebM to WAV" 
        });
      }
      
      const wavStats = fs.statSync(wavFilePath);
      console.log("WAV file created, size:", wavStats.size, "bytes");
      
      // Use WAV file for transcription
      fileToTranscribe = wavFilePath;
    }

    // Normalize mimetype for OpenAI (use audio/wav if converted)
    const normalizedMimetype = needsConversion ? "audio/wav" : normalizeMimetypeForOpenAI(req.file.mimetype);
    
    // Determine filename with extension based on normalized mimetype
    const filename = needsConversion ? "audio.wav" : getFilenameWithExtension(normalizedMimetype);

    // Forensic logging right before calling OpenAI
    console.log("=== STT FORENSICS ===");
    console.log("req.file.size:", req.file.size);
    console.log("req.file.mimetype:", req.file.mimetype);
    console.log("req.file.originalname:", req.file.originalname);
    console.log("req.file.path:", req.file.path);
    if (needsConversion) {
      console.log("Converted WAV path:", wavFilePath);
      console.log("Converted WAV size:", fs.statSync(wavFilePath).size);
    }
    
    // Read first 32 bytes and log as hex (magic bytes)
    const head = fs.readFileSync(fileToTranscribe).subarray(0, 32);
    console.log("HEAD_HEX", Buffer.from(head).toString("hex"));
    console.log("====================");

    // Read file and create OpenAI File using toFile helper
    const fileBuffer = fs.readFileSync(fileToTranscribe);
    const openaiFile = await toFile(fileBuffer, filename, {
      type: normalizedMimetype,
    });

    console.log("Calling OpenAI transcription API with filename:", filename, "type:", normalizedMimetype);
    const transcript = await openai.audio.transcriptions.create({
      file: openaiFile,
      model: "gpt-4o-mini-transcribe",
    });

    console.log("Transcription successful, length:", transcript.text?.length || 0);
    
    // Clean up temp files
    fs.unlink(req.file.path, () => {});
    if (shouldDeleteWav && wavFilePath && fs.existsSync(wavFilePath)) {
      fs.unlink(wavFilePath, () => {});
      console.log("Cleaned up converted WAV file");
    }

    return res.json({
      transcript: transcript.text || "",
    });
  } catch (err) {
    // Log full error stack
    console.error("=== STT ERROR (FULL STACK) ===");
    console.error(err.stack || err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error code:", err.code);
    console.error("Error status:", err.status);
    console.error("==============================");
    
    // Clean up uploaded file if present
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    
    // Clean up WAV file if conversion was attempted
    if (req.wavFilePath && fs.existsSync(req.wavFilePath)) {
      fs.unlink(req.wavFilePath, () => {});
      console.log("Cleaned up WAV file in error handler");
    }
    
    // If OpenAI throws 400, return that 400 with proper error format
    if (err.status === 400 || err.code === 400 || (err.message && err.message.includes("400"))) {
      return res.status(400).json({ 
        error: "openai_stt_failed", 
        message: err.message || "Unknown error occurred",
        code: err.code || "400"
      });
    }
    
    // Return JSON error with details for other errors
    return res.status(500).json({ 
      error: "stt_failed", 
      details: err.message || "Unknown error occurred",
      name: err.name || "Error"
    });
  }
});

export default router;
