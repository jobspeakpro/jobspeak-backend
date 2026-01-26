// jobspeak-backend/routes/stt.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { rateLimiter } from "../middleware/rateLimiter.js";
import { getSubscription } from "../services/db.js";
import { getUsage, recordAttempt, isBlocked } from "../services/sttUsageStore.js";
import { resolveUserKey } from "../middleware/resolveUserKey.js";
// import ffmpegStatic from "ffmpeg-static"; // Converted to dynamic
import crypto from "crypto";
// Sentry removed
const captureException = (err, context) => console.error("[SENTRY_FALLBACK]", err, context);
import { trackSTT, trackLimitHit } from "../services/analytics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execFileAsync = promisify(execFile);

const router = express.Router();

// STT is now unlimited (tracked as 'stt' type)
// Practice limit (3/day) is enforced in /ai/micro-demo handling


/**
 * Helper function to test ffmpeg binary using spawn
 * @param {string} binaryPath - Path to ffmpeg binary
 * @returns {Promise<{success: boolean, version?: string, reason?: string}>}
 */
function testFfmpegWithSpawn(binaryPath) {
  return new Promise((resolve) => {
    const proc = spawn(binaryPath, ['-version'], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let timeout;

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0 && (stdout || stderr)) {
        const versionOutput = stdout || stderr;
        const firstLine = versionOutput.split('\n')[0] || versionOutput.substring(0, 100);
        resolve({ success: true, version: firstLine.trim() });
      } else {
        resolve({ success: false, reason: `exit code ${code}` });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ success: false, reason: err.message });
    });

    // 5 second timeout
    timeout = setTimeout(() => {
      proc.kill();
      resolve({ success: false, reason: 'timeout' });
    }, 5000);
  });
}

/**
 * Helper function to resolve ffmpeg path with fallback strategy:
 * 1. Check FFMPEG_PATH environment variable (must exist; spawn it with -version)
 * 2. Try "ffmpeg" from PATH (spawn("ffmpeg", ["-version"]))
 * 3. Fall back to ffmpeg-static only if spawn works
 * 
 * @returns {Promise<{path: string|null, version: string|null, reason: string|null}>}
 */
async function getFfmpegPath(staticPath = null) {
  // Option 1: Check FFMPEG_PATH environment variable (must exist; spawn it with -version)
  if (process.env.FFMPEG_PATH) {
    const envPath = process.env.FFMPEG_PATH.trim();
    const test = await testFfmpegWithSpawn(envPath);
    if (test.success) {
      return { path: envPath, version: test.version || null, reason: null };
    }
    // Not runnable, continue to next option
  }

  // Option 2: Try "ffmpeg" from PATH
  const pathTest = await testFfmpegWithSpawn('ffmpeg');
  if (pathTest.success) {
    return { path: 'ffmpeg', version: pathTest.version || null, reason: null };
  }

  // Option 3: Fall back to ffmpeg-static only if spawn works
  if (staticPath) {
    const staticTest = await testFfmpegWithSpawn(staticPath);
    if (staticTest.success) {
      return { path: staticPath, version: staticTest.version || null, reason: null };
    }
  }

  // Build reason string
  let reason = 'No valid ffmpeg found';
  if (process.env.FFMPEG_PATH) {
    reason = `FFMPEG_PATH=${process.env.FFMPEG_PATH} is not runnable`;
  } else {
    reason = 'ffmpeg not in PATH and ffmpeg-static not available';
  }

  return { path: null, version: null, reason };
}

// Resolve ffmpeg path at startup (async, non-blocking)
let ffmpegPath = null;
let ffmpegVersion = null;
let ffmpegPathResolved = false;

// Initialize ffmpeg path asynchronously
(async () => {
  try {
    // Dynamic import to prevent startup crash if module is missing/broken
    let staticPath = null;
    try {
      const ffmpegModule = await import("ffmpeg-static");
      staticPath = ffmpegModule.default;
    } catch (e) {
      console.warn("[STT] ffmpeg-static module not found or failed to load:", e.message);
    }

    const result = await getFfmpegPath(staticPath);
    ffmpegPathResolved = true;

    if (result.path) {
      ffmpegPath = result.path;
      ffmpegVersion = result.version;
      console.log("[STT] ✅ FFmpeg path resolved:", ffmpegPath);
      if (ffmpegVersion) {
        console.log("[STT] ✅ FFmpeg version:", ffmpegVersion);
      }
    } else {
      console.error("[STT] ❌ FFMPEG_NOT_AVAILABLE:", result.reason || "No valid ffmpeg found");
    }
  } catch (err) {
    console.error("[STT] ❌ FFMPEG_NOT_AVAILABLE:", err.message);
    ffmpegPathResolved = true;
  }
})();

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
// Uses execFile from node:child_process for Windows compatibility
async function transcodeToWav(inputPath, mimetype) {
  const outputPath = inputPath + '.wav';

  // Wait for ffmpeg path resolution if still in progress
  if (!ffmpegPathResolved) {
    // Wait up to 2 seconds for initialization
    let waited = 0;
    while (!ffmpegPathResolved && waited < 2000) {
      await new Promise(resolve => setTimeout(resolve, 100));
      waited += 100;
    }
  }

  // Check if ffmpeg is available
  if (!ffmpegPath) {
    const error = new Error("FFMPEG_NOT_AVAILABLE: No valid ffmpeg found. Install ffmpeg or set FFMPEG_PATH environment variable.");
    error.code = "FFMPEG_NOT_AVAILABLE";
    throw error;
  }

  console.log(`[STT] Transcoding -> WAV starting`);
  console.log(`[STT] Input file: ${inputPath}`);
  console.log(`[STT] Output file: ${outputPath}`);
  console.log(`[STT] FFmpeg path: ${ffmpegPath}`);

  // Verify input file exists and get size
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }
  const inputStats = fs.statSync(inputPath);
  console.log(`[STT] Input file size: ${inputStats.size} bytes`);

  // Build ffmpeg command args: -y -i <input> -ac 1 -ar 16000 -f wav <output.wav>
  const ffmpegArgs = [
    '-y',                    // Overwrite output file if it exists
    '-i', inputPath,         // Input file
    '-ac', '1',             // Mono channel
    '-ar', '16000',         // 16kHz sample rate
    '-f', 'wav',            // WAV format
    outputPath              // Output file
  ];

  const commandLine = `${ffmpegPath} ${ffmpegArgs.join(' ')}`;
  console.log(`[STT] FFmpeg command: ${commandLine}`);

  try {
    // Run ffmpeg using execFileAsync with windowsHide for Windows compatibility
    const { stdout, stderr } = await execFileAsync(ffmpegPath, ffmpegArgs, {
      windowsHide: true
    });

    // Log stdout/stderr if present (usually minimal for ffmpeg)
    if (stdout) {
      console.log(`[STT] FFmpeg stdout: ${stdout.substring(0, 500)}`);
    }
    if (stderr) {
      console.log(`[STT] FFmpeg stderr: ${stderr.substring(0, 500)}`);
    }

    // Verify output file was created and has size > 0
    if (!fs.existsSync(outputPath)) {
      console.error(`[STT] ERROR: Output file not found after transcoding: ${outputPath}`);
      throw new Error("Transcoding completed but output file not found");
    }

    const outputStats = fs.statSync(outputPath);
    if (outputStats.size === 0) {
      console.error(`[STT] ERROR: Output file is empty: ${outputPath}`);
      throw new Error("Transcoding completed but output file is empty");
    }

    console.log(`[STT] Transcoding -> WAV complete`);
    console.log(`[STT] Output file size: ${outputStats.size} bytes`);
    console.log(`[STT] Output file path: ${outputPath}`);
    return outputPath;

  } catch (err) {
    // Capture all error details for debugging
    const errorDetails = {
      message: err.message || null,
      code: err.code || null,
      signal: err.signal || null,
      stdout: err.stdout || null,
      stderr: err.stderr || null,
      ffmpegPath: ffmpegPath || null,
      args: ffmpegArgs || null,
    };

    // Robust error logging - log all captured details
    console.error(`[STT] FFmpeg execFile error: ${errorDetails.message}`);
    console.error(`[STT] FFmpeg path: ${errorDetails.ffmpegPath}`);
    console.error(`[STT] Error code: ${errorDetails.code || 'N/A'}`);
    console.error(`[STT] Error signal: ${errorDetails.signal || 'N/A'}`);
    console.error(`[STT] Error name: ${err.name || 'N/A'}`);
    console.error(`[STT] FFmpeg args: ${JSON.stringify(errorDetails.args)}`);
    if (errorDetails.stdout) {
      console.error(`[STT] FFmpeg stdout: ${errorDetails.stdout.substring(0, 1000)}`);
    }
    if (errorDetails.stderr) {
      console.error(`[STT] FFmpeg stderr: ${errorDetails.stderr.substring(0, 1000)}`);
    }
    if (err.stack) {
      console.error(`[STT] Error stack: ${err.stack}`);
    }

    // Attach error details to error object for use in catch handler
    const transcodeError = new Error(`TRANSCODE_FAILED: ${errorDetails.message || 'Unknown error'}`);
    transcodeError.transcodeDetails = errorDetails;
    throw transcodeError;
  }
}

// Multer error handler middleware - must be before route handlers
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Clean up any partial uploads
    if (req.file) {
      fs.unlink(req.file.path, () => { });
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
// Resolves userKey from header, body, query, or form-data
const validateUserKey = (req, res, next) => {
  // Resolve userKey from multiple sources
  const userKey = resolveUserKey(req);

  // Validate userKey is present
  if (!userKey) {
    // Clean up uploaded file if present
    if (req.file) {
      fs.unlink(req.file.path, () => { });
    }
    return res.status(400).json({ error: "Missing userKey" });
  }

  // Attach to request for use in route handlers
  req.userKey = userKey;
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

// OPTIONS handler for CORS preflight
router.options("/stt", (req, res) => {
  console.log("[STT] OPTIONS /api/stt");
  res.status(204).end();
});

// Rate limiting: 20 requests per minute per userKey (or IP if userKey not available)
// Note: userKey comes from form-data, so rate limiting happens after multer
// Order: multer -> validateUserKey -> rateLimiter -> handler
// 
// Daily speaking attempt limit rule:
// - ONLY successful POST /api/stt transcriptions consume 1 daily attempt
// - Failed STT requests do NOT consume attempts (only count on success)
// - /voice/generate does NOT consume speaking attempts (has separate TTS limit)
// - /ai/micro-demo does NOT consume speaking attempts
// - Resume endpoints do NOT consume speaking attempts
router.post("/stt", uploadAudio, handleMulterError, validateUserKey, rateLimiter(20, 60000, null, "stt:"), async (req, res) => {
  // Track files for cleanup
  const originalFilePath = req.file?.path;
  let outputWavPath = null;

  console.log("[STT] POST /api/stt begins");

  try {
    if (!req.file) {
      console.log("[STT] POST /api/stt ends with status 400 (no file)");
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    // Resolve userKey (already validated by middleware)
    const userKey = req.userKey;

    // Resolve attemptId from multiple sources, generate UUID if missing
    // Note: Multer puts form-data fields directly in req.body, not req.body.fields
    let attemptId = req.header('x-attempt-id') || req.body?.attemptId || req.query?.attemptId;
    if (!attemptId || typeof attemptId !== 'string' || attemptId.trim().length === 0) {
      attemptId = crypto.randomUUID();
      console.log(`[STT] Generated attemptId: ${attemptId} (missing from request)`);
    } else {
      attemptId = attemptId.trim();
      console.log(`[STT] Using provided attemptId: ${attemptId}`);
    }

    // Check subscription status
    const subscription = getSubscription(userKey);
    let isPro = false;
    if (subscription) {
      isPro = subscription.isPro;

      // Check if subscription is expired
      if (subscription.currentPeriodEnd) {
        const periodEnd = new Date(subscription.currentPeriodEnd);
        const now = new Date();
        if (periodEnd < now) {
          isPro = false;
        }
      }

      // Ensure isPro matches status
      if (subscription.status && subscription.status !== "active" && subscription.status !== "trialing") {
        isPro = false;
      }
    }

    // Free users: WE NO LONGER BLOCK STT.
    // Limits are enforced at the practice submission level (/ai/micro-demo).
    // We still track STT usage for analytics/abuse monitoring but it is unlimited.
    if (!isPro) {
      const usage = getUsage(userKey, "stt");
      console.log(`[STT] Usage check - userKey: ${userKey}, used: ${usage.used}, limit: Unlimited, route: /api/stt`);
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
    console.log("[STT] FFmpeg path:", ffmpegPath || "ffmpeg not found");

    // Check for missing environment keys
    const missingKeys = [];
    if (!process.env.OPENAI_API_KEY) {
      missingKeys.push("OPENAI_API_KEY");
    }

    if (missingKeys.length > 0) {
      console.error("STT ERROR: Missing required environment keys:", missingKeys);
      return res.status(503).json({
        error: "stt_unavailable"
      });
    }

    if (!openai) {
      console.error("STT ERROR: OpenAI client not initialized - missing OPENAI_API_KEY");
      return res.status(503).json({
        error: "stt_unavailable"
      });
    }

    // Check file size - if 0 or < 1000 bytes, return 400 immediately
    if (!fileSize || fileSize < 1000) {
      console.error("STT ERROR: File too small - size:", fileSize);
      return res.status(400).json({
        error: "empty_audio_upload",
        size: fileSize
      });
    }

    // Determine if transcoding is needed (webm/ogg only)
    const requiresTranscoding = needsTranscoding(mimetype);
    let audioFilePath = req.file.path;
    let filenameSent = null;
    let mimeSent = null;

    if (requiresTranscoding) {
      console.log(`[STT] Transcoding required for ${mimetype}`);

      // Wait for ffmpeg path resolution if still in progress
      if (!ffmpegPathResolved) {
        let waited = 0;
        while (!ffmpegPathResolved && waited < 2000) {
          await new Promise(resolve => setTimeout(resolve, 100));
          waited += 100;
        }
      }

      // Check if ffmpeg is available
      if (!ffmpegPath) {
        console.error("[STT] ERROR: FFMPEG_NOT_AVAILABLE - cannot transcode", mimetype);
        return res.status(503).json({
          error: "stt_unavailable"
        });
      }

      // Create deterministic output path
      outputWavPath = `${req.file.path}.wav`;
      console.log(`[STT] Output WAV path: ${outputWavPath}`);

      try {
        // Transcode webm/ogg to WAV (16kHz mono)
        const transcodedPath = await transcodeToWav(req.file.path, mimetype);

        // Verify output exists and size > 0
        if (!fs.existsSync(transcodedPath)) {
          console.error("[STT] ERROR: WAV transcoding failed - output file not found");
          return res.status(500).json({
            error: "stt_failed",
            details: "Failed to transcode to WAV - output file not found"
          });
        }

        const wavStats = fs.statSync(transcodedPath);
        if (wavStats.size === 0) {
          console.error("[STT] ERROR: WAV file is empty");
          return res.status(500).json({
            error: "stt_failed",
            details: "Transcoded WAV file is empty"
          });
        }

        console.log(`[STT] Output WAV size: ${wavStats.size} bytes`);

        // Set the file to use for OpenAI
        audioFilePath = transcodedPath;
        filenameSent = "audio.wav";
        mimeSent = "audio/wav";

      } catch (transcodeErr) {
        console.error("[STT] ERROR: Transcoding failed:", transcodeErr.message);
        console.error("[STT] Transcoding error stack:", transcodeErr.stack);

        // Handle FFMPEG_NOT_AVAILABLE error
        if (transcodeErr.code === "FFMPEG_NOT_AVAILABLE" || transcodeErr.message?.includes("FFMPEG_NOT_AVAILABLE")) {
          return res.status(503).json({
            error: "stt_unavailable"
          });
        }

        // Extract error details if available
        const errorDetails = transcodeErr.transcodeDetails || {};
        return res.status(400).json({
          error: "TRANSCODE_FAILED",
          message: errorDetails.message || transcodeErr?.message || null,
          code: errorDetails.code || transcodeErr?.code || null,
          stderr: errorDetails.stderr || transcodeErr?.stderr || null,
          stdout: errorDetails.stdout || transcodeErr?.stdout || null,
          ffmpegPath: errorDetails.ffmpegPath || ffmpegPath || null,
        });
      }
    } else {
      console.log(`[STT] File format ${mimetype} does not require transcoding, using directly`);
      filenameSent = getFilenameWithExtension(mimetype);
      mimeSent = mimetype;
    }

    // Log exactly what file is being sent to OpenAI
    const finalStats = fs.statSync(audioFilePath);
    console.log(`[STT] Sending to OpenAI: path=${audioFilePath} type=${mimeSent} filename=${filenameSent} size=${finalStats.size} bytes`);

    // Create OpenAI File using stream (not buffer) - CRITICAL: use the WAV file when transcoded
    const audioStream = fs.createReadStream(audioFilePath);
    const openaiFile = await toFile(audioStream, filenameSent, {
      type: mimeSent,
    });

    // Call OpenAI transcription API
    let transcript;
    try {
      console.log(`[STT] Calling OpenAI transcription API`);
      console.log(`[STT]   model: whisper-1`);
      console.log(`[STT]   file type: ${mimeSent}`);
      transcript = await openai.audio.transcriptions.create({
        file: openaiFile,
        model: "whisper-1",
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
      console.error("[STT]   file type sent to OpenAI:", mimeSent);
      console.error("[STT]   file path sent to OpenAI:", audioFilePath);
      if (openaiErr.response) {
        console.error("[STT]   OpenAI response:", openaiErr.response);
      }

      // Track STT failure
      const errorType = openaiErr.status === 400 ? "openai_400" : "openai_error";
      trackSTT("fail", userKey, errorType);

      // Capture to Sentry
      captureException(openaiErr, {
        userKey,
        route: "/api/stt",
        requestId: req.requestId,
        errorType: errorType,
        extra: {
          mimetype,
          fileType: mimeSent,
          fileSize: req.file?.size,
        },
      });

      // If OpenAI returns 400, return 400 status with clear error
      if (openaiErr.status === 400 || openaiErr.code === 400 || (openaiErr.message && openaiErr.message.includes("400"))) {
        console.error("[STT] OpenAI rejected file with 400 error - unsupported format");
        return res.status(400).json({
          error: "stt_failed",
          details: openaiErr.message || "OpenAI transcription failed - unsupported file format",
          mimetype: mimetype,
          fileType: mimeSent
        });
      }

      // Otherwise return 500
      return res.status(500).json({
        error: "stt_failed",
        details: openaiErr.message || "OpenAI transcription failed"
      });
    }

    // Track STT usage (unlimited)
    // CRITICAL: We pass "stt" as the type so it doesn't consume "practice" quota
    let usage = null;
    if (!isPro && transcript && transcript.text && transcript.text.trim()) {
      // Record attempt with idempotency (type="stt")
      usage = recordAttempt(userKey, attemptId, "stt");

      if (usage.wasNew) {
        console.log(`[STT] RECORDED - userKey: ${userKey}, attemptId: ${attemptId}, used: ${usage.used}, route: /api/stt`);
      } else {
        console.log(`[STT] IDEMPOTENT - userKey: ${userKey}, attemptId: ${attemptId}, used: ${usage.used}, route: /api/stt (already recorded)`);
      }
    } else if (!isPro) {
      usage = getUsage(userKey, "stt");
      console.log(`[STT] NOT RECORDED - userKey: ${userKey}, reason: transcription failed or empty, route: /api/stt`);
    }

    console.log(`[STT] ========================================`);
    console.log(`[STT] Request completed successfully`);

    // Track STT success
    trackSTT("success", userKey);

    // Build response with usage info
    const response = {
      transcript: transcript.text || "",
    };

    // Include sttUsage for free users (renamed to avoid confusion with practice limits)
    if (!isPro && usage) {
      response.sttUsage = {
        used: usage.used,
        limit: usage.limit, // -1 (unlimited)
      };
    }

    console.log("[STT] POST /api/stt ends with status 200");
    return res.json(response);
  } catch (err) {
    // Log full error stack
    console.error("=== STT ERROR (FULL STACK) ===");
    console.error(err.stack || err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error code:", err.code);
    console.error("Error status:", err.status);
    console.error("==============================");

    // Track STT failure
    const userKey = req.userKey || null;
    trackSTT("fail", userKey, err.name || "unknown_error");

    // Capture to Sentry
    captureException(err, {
      userKey,
      route: "/api/stt",
      requestId: req.requestId,
      errorType: err.name || "unknown",
      extra: {
        fileSize: req.file?.size,
        mimetype: req.file?.mimetype,
      },
    });

    // If OpenAI throws 400, return that 400 with proper error format
    if (err.status === 400 || err.code === 400 || (err.message && err.message.includes("400"))) {
      console.log("[STT] POST /api/stt ends with status 400");
      return res.status(400).json({
        error: "stt_failed",
        details: err.message || "Unknown error occurred"
      });
    }

    // Return JSON error with details for other errors
    console.log("[STT] POST /api/stt ends with status 500");
    return res.status(500).json({
      error: "stt_failed",
      details: err.message || "Unknown error occurred"
    });
  } finally {
    // Cleanup: delete original tmp file and output wav file
    console.log(`[STT] Cleaning up temporary files`);

    if (originalFilePath && fs.existsSync(originalFilePath)) {
      fs.unlink(originalFilePath, (err) => {
        if (err) console.error(`[STT] Error deleting original file: ${err.message}`);
        else console.log(`[STT] Deleted original file: ${originalFilePath}`);
      });
    }

    if (outputWavPath && fs.existsSync(outputWavPath)) {
      fs.unlink(outputWavPath, (err) => {
        if (err) console.error(`[STT] Error deleting WAV file: ${err.message}`);
        else console.log(`[STT] Deleted WAV file: ${outputWavPath}`);
      });
    }
  }
});

export default router;
