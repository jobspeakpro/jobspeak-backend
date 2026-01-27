import dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/node";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

// import accountRoutes from "./routes/account.js";
// import activityRoutes from "./routes/activity.js";
// import aiRoutes from "./routes/ai.js";
import authRoutes from "./routes/auth.js";
// import billingRoutes from "./routes/billing.js";
// import dashboardRoutes from "./routes/dashboard.js";
// import dailyTipRoutes from "./routes/dailyTip.js";
// import heardAboutRoutes from "./routes/heardAbout.js";
// import mockInterviewRoutes from "./routes/mockInterview.js";
// import practiceRoutes from "./routes/practice.js";
// import progressRoutes from "./routes/progress.js";
// import reflectionRoutes from "./routes/reflection.js";
// import resumeRoutes from "./routes/resume.js";
// import sessionsRoutes from "./routes/sessions.js";
// import stripeRoutes from "./routes/stripe.js";
// import sttRoutes from "./routes/stt.js";
// import ttsRoutes from "./routes/tts.js";
// import usageRoutes from "./routes/usage.js";
// import voiceRoutes from "./voiceRoute.js";

// New Feature Routes
// import referralRoutes from "./routes/referrals.js";
import affiliateRoutes from "./routes/affiliates.js";
// import supportRoutes from "./routes/support.js";

import { requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";

// server.js startup
// Ensure we handle startup errors gracefully
const PORT = process.env.PORT || 3000;

// Wrap Stripe init
// Stripe initialization removed to prevent ReferenceError (Stripe not imported)
// Billing routes handle their own Stripe instances safely.

// Initialize Sentry (safe - only if DSN is provided)
let sentryInitialized = false;
try {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
    });
    sentryInitialized = true;
    console.log("[SENTRY] Initialized successfully");
  } else {
    console.log("[SENTRY] SENTRY_DSN not set, skipping initialization");
  }
} catch (err) {
  console.error("[SENTRY] Failed to initialize (non-fatal):", err.message);
  sentryInitialized = false;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();

// Ensure tmp directory exists for file uploads
const tmpDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
  console.log("Created tmp directory:", tmpDir);
}

// ------------ MIDDLEWARE ------------
// Sentry request handler (must be first, only if Sentry is initialized)
if (sentryInitialized) {
  app.use(Sentry.Handlers.requestHandler());
}

// Webhook endpoint needs raw body for signature verification - must be before express.json()
// app.use("/api/billing/webhook", express.raw({ type: "application/json" }));

// Body size limits (10MB for JSON, 25MB for file uploads handled by multer)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom error handler for JSON parsing errors on calibration endpoint
// This ensures malformed JSON returns 200 with default response instead of 400
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    // JSON parsing error
    if (req.url === '/ai/calibrate-difficulty' || req.path === '/calibrate-difficulty') {
      console.log('[CALIBRATE] Malformed JSON body, returning default response');
      return res.status(200).json({
        recommended: "normal",
        reason: "Not enough signal to assess—defaulting to Normal."
      });
    }
    // For other routes, let the default error handler deal with it
  }
  next(err);
});

// Disable ETags globally to prevent 304 Not Modified responses
// This ensures fresh data is always returned (especially for summary endpoint)
app.disable('etag');

// Request logging
app.use(requestLogger);

// CORS configuration - production-ready
const frontendOrigin = process.env.FRONTEND_ORIGIN;
const isDevelopment = process.env.NODE_ENV !== "production";

// Allowed production origins
const allowedOrigins = [
  "https://www.jobspeakpro.com",
  "https://jobspeakpro.com",
  // Add Vercel preview domains if strictly needed, but wildcard is unsafe
  // Better to rely on FRONTEND_ORIGIN env var for dynamic previews
];

// Vite frontend origins for local development
const viteOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000"
];

const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Development mode: allow Vite frontend origins explicitly
    if (isDevelopment && viteOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Development mode: allow other localhost origins (for backwards compatibility)
    if (isDevelopment) {
      const localhostPatterns = [
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
        /^http:\/\/0\.0\.0\.0:\d+$/,
      ];

      if (localhostPatterns.some(pattern => pattern.test(origin))) {
        return callback(null, true);
      }
    }

    // Debug logging for troubleshooting
    console.log(`[CORS] Checking origin: ${origin}`);

    // Allow production origins
    if (allowedOrigins.includes(origin)) {
      console.log(`[CORS] Allowed production origin: ${origin}`);
      return callback(null, true);
    }

    // Allow Vercel preview assignments (e.g. https://jobspeak-frontend-git-foo.vercel.app)
    if (origin && origin.endsWith('.vercel.app')) {
      console.log(`[CORS] Allowed Vercel preview: ${origin}`);
      return callback(null, true);
    }

    // Allow exact match of FRONTEND_ORIGIN if set (for backwards compatibility)
    if (frontendOrigin && origin === frontendOrigin) {
      return callback(null, true);
    }

    // Development: log blocked origins
    if (isDevelopment) {
      console.warn(`[CORS] Blocked origin: ${origin}${frontendOrigin ? ` (Expected: ${frontendOrigin})` : " (No FRONTEND_ORIGIN set)"}`);
    } else {
      console.warn(`[CORS] Blocked origin in PRODUCTION: ${origin}`);
    }

    // Block all other origins
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-key", "x-guest-key", "x-attempt-id", "X-Attempt-Id", "x-jsp-backend-commit", "x-identity-used", "x-identity-mode"],
  exposedHeaders: ["x-jsp-backend-commit", "x-identity-used", "x-identity-mode"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Global OPTIONS handler - MUST come before route registration
// This ensures preflight requests never hit auth/billing logic
app.options("*", (req, res) => {
  res.status(204)
    .header("Access-Control-Allow-Origin", req.headers.origin || "https://jobspeakpro.com")
    .header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
    .header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-key, x-guest-key")
    .header("Access-Control-Allow-Credentials", "true")
    .end();
});

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "JobSpeakPro backend running",
    version: "MailerSend-Silver-Final-SAFE",
    timestamp: new Date().toISOString()
  });
});

// Get commit hash at startup (fallback to env var or unknown)
let commitHash = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT || process.env.COMMIT_HASH || 'unknown';
if (commitHash === 'unknown') {
  try {
    commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8', timeout: 1000 }).trim();
  } catch (e) {
    // Git not available or command failed, use 'unknown'
    commitHash = 'unknown';
  }
}

// GET /health - Production health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    service: "JobSpeakPro Backend",
    commit: commitHash,
    version: commitHash.substring(0, 7) // Short commit hash for display
  });
});

// Alias for frontend compatibility
app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    service: "JobSpeakPro Backend",
    commit: commitHash,
    version: commitHash.substring(0, 7) // Short commit hash for display
  });
});

// TEMPORARY: Sentry test route (REMOVE AFTER CONFIRMING)
app.get("/__sentry-test", () => {
  throw new Error("SENTRY_BACKEND_CONFIRMED");
});

// Serve onboarding audio file
// Used by frontend for reliable audio playback
app.get("/audio/onboarding", (req, res) => {
  const audioPath = path.join(process.cwd(), "b2.mp3");
  if (fs.existsSync(audioPath)) {
    res.setHeader("Content-Type", "audio/mpeg");
    // Cache for 1 day
    res.setHeader("Cache-Control", "public, max-age=86400");
    fs.createReadStream(audioPath).pipe(res);
  } else {
    console.warn("[AUDIO] b2.mp3 not found at", audioPath);
    res.status(404).json({ error: "Audio file not found" });
  }
});

// CRITICAL: Hard-coded TTS health endpoint (app-level to avoid routing issues)
app.get("/api/tts/health", (req, res) => {
  return res.json({ ok: false, message: "DISABLED_SAFE_MODE" });
});

// ------------ ROUTES ------------
// Debug Ping (Verify API mounting works)
app.get("/api/debug_ping", (req, res) => {
  res.json({ pong: true, time: new Date().toISOString() });
});

app.get("/debug/routes", (req, res) => {
  if (process.env.NODE_ENV === 'production' && req.query.key !== 'debug_prod_2026') {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ ok: true, mode: "safe" });
});

// API routes (mounted under /api prefix for frontend proxy compatibility)
// import analyticsRoutes from "./routes/analytics.js";
// app.use("/api", accountRoutes);   // /api/account (DELETE), /api/account/restore (POST)
// app.use("/api", activityRoutes);  // /api/activity/start, /api/activity/events
// app.use("/api", analyticsRoutes); // /api/track
// app.use("/api", billingRoutes);  // /api/billing/*
// app.use("/api", dashboardRoutes); // /api/dashboard/*
// app.use("/api", dailyTipRoutes);  // /api/daily-tip
// app.use("/api", mockInterviewRoutes); // /api/mock-interview/*
// app.use("/api", practiceRoutes);  // /api/practice/*
// app.use("/api/profile", heardAboutRoutes); // /api/profile/heard-about
// app.use("/api", progressRoutes);  // /api/progress/summary
// app.use("/api", reflectionRoutes); // /api/daily-reflection
// app.use("/api", sttRoutes);      // /api/stt
// app.use("/api", ttsRoutes);      // /api/tts, /api/tts/health
// app.use("/api", sessionsRoutes);  // /api/sessions
// app.use("/api", usageRoutes);    // /api/usage/*

// Mount new features
// app.use("/api", referralRoutes);
app.use("/api", affiliateRoutes);
// app.use("/api", supportRoutes);

// Non-API routes
// app.use("/ai", aiRoutes);
app.use("/auth", authRoutes); // Keep auth for affiliate user attachment

// Fix for Frontend posting to /affiliate/apply instead of /api/affiliate/apply
app.use("/", affiliateRoutes); // Ment to capture /affiliate/apply directly

// ADMIN: One-time migration endpoint (Secret protected)
// This exists because direct DB access is unavailable and startup scripts were causing issues.
app.post("/__admin/migrate", async (req, res) => {
  // Disabled in safe mode
  res.status(401).json({ error: "SAFE_MODE_DISABLED" });
});
// app.use("/resume", resumeRoutes);
// app.use("/stripe", stripeRoutes);
// app.use("/voice", voiceRoutes);

// Railway requires explicit binding to 0.0.0.0 to accept external connections
// PORT must come from process.env.PORT (Railway sets this automatically)
console.log(`[STARTUP] Starting server on port ${PORT} (from ${process.env.PORT ? 'process.env.PORT' : 'default 3000'})`);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend (SAFE MODE) listening on 0.0.0.0:${PORT}`);
  console.log(`✅ Health check available at: http://0.0.0.0:${PORT}/health`);
  console.log(`[BACKEND] Server ready`, { port: PORT, env: process.env.NODE_ENV || "development" });
});
