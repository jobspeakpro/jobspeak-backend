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
  console.log("[STT] Using ffmpeg path:", ffmpegStatic);
  console.log("[STT] FFmpeg path verified:", fs.existsSync(ffmpegStatic) ? "EXISTS" : "NOT FOUND");
} else {
  console.error("[STT] ERROR: ffmpeg-static not found. WebM conversion will fail.");
  console.error("[STT] Check package.json - ffmpeg-static must be in dependencies (not devDependencies)");
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

// Helper function to check if file needs transcoding (webm/ogg only)
const needsTranscoding = (mimetype) => {
  return mimetype === "audio/webm" || 
         mimetype === "video/webm" ||
         mimetype === "audio/ogg" || 
         mimetype === "video/ogg";
};

// Helper function to transcode webm/ogg to WAV using ffmpeg (16kHz mono)
async function transcodeToWav(inputPath, mimetype) {
  const outputPath = inputPath + '.wav';
  
  // Check if ffmpeg is available
  if (!ffmpegStatic) {
    throw new Error("FFmpeg not available - cannot transcode " + mimetype);
  }
  
  console.log(`[STT] Starting transcoding: ${mimetype} -> WAV`);
  console.log(`[STT] Input file: ${inputPath}`);
  console.log(`[STT] Output file: ${outputPath}`);
  
  // Verify input file exists and get size
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }
  const inputStats = fs.statSync(inputPath);
  console.log(`[STT] Input file size: ${inputStats.size} bytes`);
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioChannels(1)        // Mono
      .audioFrequency(16000)    // 16kHz
      .audioCodec('pcm_s16le')  // PCM 16-bit little-endian (standard WAV)
      .format('wav')
      .outputOptions([
        '-ar', '16000',          // Explicit sample rate
        '-ac', '1',              // Explicit mono channel
        '-sample_fmt', 's16',    // Explicit 16-bit sample format
      ])
      .on("start", (commandLine) => {
        console.log(`[STT] FFmpeg command: ${commandLine}`);
      })
      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(`[STT] Transcoding progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on("end", () => {
        // Verify output file was created
        if (!fs.existsSync(outputPath)) {
          console.error(`[STT] ERROR: Output file not found after transcoding: ${outputPath}`);
          reject(new Error("Transcoding completed but output file not found"));
          return;
        }
        
        const outputStats = fs.statSync(outputPath);
        console.log(`[STT] Transcoding completed successfully`);
        console.log(`[STT] Output file size: ${outputStats.size} bytes`);
        console.log(`[STT] Output file path: ${outputPath}`);
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error(`[STT] FFmpeg transcoding error: ${err.message}`);
        console.error(`[STT] FFmpeg error details:`, err);
        if (err.stderr) {
          console.error(`[STT] FFmpeg stderr: ${err.stderr}`);
        }
        reject(new Error(`Transcoding failed: ${err.message}`));
      })
      .save(outputPath);
  });
}

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

    // Log original file metadata
    const mimetype = req.file.mimetype || "unknown";
    const originalname = req.file.originalname || "(not provided)";
    const fileSize = req.file.size || 0;
    console.log("[STT] ========================================");
    console.log("[STT] Request received");
    console.log("[STT] mimetype:", mimetype);
    console.log("[STT] originalname:", originalname);
    console.log("[STT] size:", fileSize, "bytes");
    console.log("[STT] temp path:", req.file.path);

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

    // Check file size - if 0 or < 1000 bytes, return 400 immediately
    if (!fileSize || fileSize < 1000) {
      console.error("STT ERROR: File too small - size:", fileSize);
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(400).json({ 
        error: "empty_audio_upload", 
        size: fileSize 
      });
    }

    // Determine if transcoding is needed (webm/ogg only)
    const requiresTranscoding = needsTranscoding(mimetype);
    let audioFilePath = req.file.path;
    let wavPath = null;
    let shouldDeleteWav = false;
    
    if (requiresTranscoding) {
      console.log(`[STT] Transcoding required for ${mimetype}`);
      // Transcode webm/ogg to WAV (16kHz mono)
      if (!ffmpegStatic) {
        console.error("[STT] ERROR: FFmpeg not available - cannot transcode", mimetype);
        if (req.file) {
          fs.unlink(req.file.path, () => {});
        }
        return res.status(400).json({ 
          error: "unsupported_format", 
          details: `Cannot transcode ${mimetype}. FFmpeg not available. Supported formats: audio/wav, audio/mpeg, audio/mp4`,
          mimetype: mimetype
        });
      }
      
      try {
        console.log(`[STT] Starting transcoding ${mimetype} to WAV (16kHz mono)...`);
        wavPath = await transcodeToWav(req.file.path, mimetype);
        shouldDeleteWav = true;
        req.wavFilePath = wavPath; // Store for error handler cleanup
        audioFilePath = wavPath;
        
        // Verify WAV file was created
        if (!fs.existsSync(wavPath)) {
          console.error("[STT] ERROR: WAV transcoding failed - output file not found");
          if (req.file && req.file.path) {
            fs.unlink(req.file.path, () => {});
          }
          return res.status(500).json({ 
            error: "stt_failed", 
            details: "Failed to transcode to WAV - output file not found"
          });
        }
        
        const wavStats = fs.statSync(wavPath);
        console.log(`[STT] Transcoding complete, WAV file size: ${wavStats.size} bytes`);
        console.log(`[STT] Using transcoded WAV file: ${wavPath}`);
      } catch (transcodeErr) {
        console.error("[STT] ERROR: Transcoding failed:", transcodeErr.message);
        console.error("[STT] Transcoding error stack:", transcodeErr.stack);
        // Clean up original file
        if (req.file && req.file.path) {
          fs.unlink(req.file.path, () => {});
        }
        return res.status(400).json({ 
          error: "transcoding_failed", 
          details: transcodeErr.message || "Failed to transcode to WAV",
          mimetype: mimetype
        });
      }
    } else {
      console.log(`[STT] File format ${mimetype} does not require transcoding, using directly`);
    }

    // Read audio file and create OpenAI File using toFile helper
    // CRITICAL: When transcoding, we MUST use the WAV file, not the original
    console.log(`[STT] Reading audio file: ${audioFilePath}`);
    console.log(`[STT] File exists: ${fs.existsSync(audioFilePath) ? "YES" : "NO"}`);
    
    const fileBuffer = fs.readFileSync(audioFilePath);
    
    // FORCE filename and type when transcoding - OpenAI requires .wav extension and audio/wav type
    let filename, fileType;
    if (requiresTranscoding) {
      filename = "audio.wav";
      fileType = "audio/wav";
      console.log(`[STT] FORCED: Using transcoded WAV file`);
    } else {
      filename = getFilenameWithExtension(mimetype);
      fileType = mimetype;
      console.log(`[STT] Using original file (no transcoding needed)`);
    }
    
    console.log(`[STT] Final file sent to OpenAI: path=${audioFilePath}, name=${filename}, type=${fileType}, size=${fileBuffer.length} bytes`);
    
    const openaiFile = await toFile(fileBuffer, filename, {
      type: fileType,
    });

    // Call OpenAI transcription API
    let transcript;
    try {
      console.log(`[STT] Calling OpenAI transcription API`);
      console.log(`[STT]   model: whisper-1`);
      console.log(`[STT]   file type: ${fileType}`);
      transcript = await openai.audio.transcriptions.create({
        file: openaiFile,
        model: "whisper-1",  // Use correct OpenAI Whisper model
      });
      console.log(`[STT] OpenAI transcription successful`);
      console.log(`[STT]   transcript length: ${transcript.text?.length || 0} characters`);
      if (transcript.text) {
        const preview = transcript.text.substring(0, 100);
        console.log(`[STT]   transcript preview: ${preview}${transcript.text.length > 100 ? '...' : ''}`);
      }
    } catch (openaiErr) {
      console.error("[STT] OpenAI transcription error occurred");
      console.error("[STT]   error message:", openaiErr.message);
      console.error("[STT]   error status:", openaiErr.status);
      console.error("[STT]   error code:", openaiErr.code);
      console.error("[STT]   original mimetype:", mimetype);
      console.error("[STT]   file type sent to OpenAI:", fileType);
      if (openaiErr.response) {
        console.error("[STT]   OpenAI response:", openaiErr.response);
      }
      
      // Clean up temp files before returning error
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, () => {});
      }
      if (wavPath && fs.existsSync(wavPath)) {
        fs.unlink(wavPath, () => {});
      }
      
      // If OpenAI returns 400, return 400 status with clear error
      if (openaiErr.status === 400 || openaiErr.code === 400 || (openaiErr.message && openaiErr.message.includes("400"))) {
        console.error("[STT] OpenAI rejected file with 400 error - unsupported format");
        return res.status(400).json({ 
          error: "stt_failed", 
          details: openaiErr.message || "OpenAI transcription failed - unsupported file format",
          mimetype: mimetype,
          fileType: fileType
        });
      }
      
      // Otherwise return 500
      return res.status(500).json({ 
        error: "stt_failed", 
        details: openaiErr.message || "OpenAI transcription failed"
      });
    }

    // Clean up temp files on success
    console.log(`[STT] Cleaning up temporary files`);
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error(`[STT] Error deleting original file: ${err.message}`);
        else console.log(`[STT] Deleted original file: ${req.file.path}`);
      });
    }
    if (shouldDeleteWav && wavPath && fs.existsSync(wavPath)) {
      fs.unlink(wavPath, (err) => {
        if (err) console.error(`[STT] Error deleting WAV file: ${err.message}`);
        else console.log(`[STT] Deleted WAV file: ${wavPath}`);
      });
    }

    console.log(`[STT] ========================================`);
    console.log(`[STT] Request completed successfully`);
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
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    
    // Clean up WAV file if transcoding was attempted
    if (req.wavFilePath && fs.existsSync(req.wavFilePath)) {
      fs.unlink(req.wavFilePath, () => {});
      console.log("Cleaned up WAV file in error handler");
    }
    
    // If OpenAI throws 400, return that 400 with proper error format
    if (err.status === 400 || err.code === 400 || (err.message && err.message.includes("400"))) {
      return res.status(400).json({ 
        error: "stt_failed", 
        details: err.message || "Unknown error occurred"
      });
    }
    
    // Return JSON error with details for other errors
    return res.status(500).json({ 
      error: "stt_failed", 
      details: err.message || "Unknown error occurred"
    });
  }
});

export default router;
