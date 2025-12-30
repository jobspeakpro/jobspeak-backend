// jobspeak-backend/server.js
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import aiRoutes from "./routes/ai.js";
import authRoutes from "./routes/auth.js";
import billingRoutes from "./routes/billing.js";
import dashboardRoutes from "./routes/dashboard.js";
import dailyTipRoutes from "./routes/dailyTip.js";
import mockInterviewRoutes from "./routes/mockInterview.js";
import resumeRoutes from "./routes/resume.js";
import sessionsRoutes from "./routes/sessions.js";
import stripeRoutes from "./routes/stripe.js";
import sttRoutes from "./routes/stt.js";
import ttsRoutes from "./routes/tts.js";
import usageRoutes from "./routes/usage.js";
import voiceRoutes from "./voiceRoute.js";
import { requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
// Sentry init removed
const sentryInit = null;

dotenv.config();

// Sentry init removed to fix crash
// initSentry().catch(err => {
//   console.error("Failed to initialize Sentry:", err.message);
// });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure tmp directory exists for file uploads
const tmpDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
  console.log("Created tmp directory:", tmpDir);
}

// ------------ MIDDLEWARE ------------
// Sentry request handler removed
// if (process.env.SENTRY_DSN) {
//   app.use(sentryRequestHandler);
// }

// Webhook endpoint needs raw body for signature verification - must be before express.json()
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));

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

// Request logging
app.use(requestLogger);

// CORS configuration - production-ready
const frontendOrigin = process.env.FRONTEND_ORIGIN;
const isDevelopment = process.env.NODE_ENV !== "production";

// Allowed production origins
const allowedOrigins = [
  "https://www.jobspeakpro.com",
  "https://jobspeakpro.com",
];

// Vite frontend origins for local development
const viteOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
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

    // Allow production origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow exact match of FRONTEND_ORIGIN if set (for backwards compatibility)
    if (frontendOrigin && origin === frontendOrigin) {
      return callback(null, true);
    }

    // Development: log blocked origins
    if (isDevelopment) {
      console.warn(`[CORS] Blocked origin: ${origin}${frontendOrigin ? ` (Expected: ${frontendOrigin})` : " (No FRONTEND_ORIGIN set)"}`);
    }

    // Block all other origins
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-key", "x-attempt-id", "X-Attempt-Id"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Explicit OPTIONS handler for all routes to ensure preflight works
app.options("*", cors(corsOptions));

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "JobSpeakPro backend running" });
});

// GET /health - Production health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    service: "JobSpeakPro Backend"
  });
});

// Alias for frontend compatibility
app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    service: "JobSpeakPro Backend (Alias)"
  });
});

// ------------ ROUTES ------------
// API routes (mounted under /api prefix for frontend proxy compatibility)
// POST /api/stt - Speech-to-text endpoint
// GET /api/sessions?userKey=... - Get user sessions
// POST /api/sessions - Save session
// GET /api/billing/status?userKey=... - Get billing status
// POST /api/track - Analytics event tracking
import analyticsRoutes from "./routes/analytics.js";
app.use("/api", analyticsRoutes); // /api/track
app.use("/api", billingRoutes);  // /api/billing/*
app.use("/api", dashboardRoutes); // /api/dashboard/*
app.use("/api", dailyTipRoutes);  // /api/daily-tip
app.use("/api", mockInterviewRoutes); // /api/mock-interview/*
app.use("/api", sttRoutes);      // /api/stt
app.use("/api", sessionsRoutes);  // /api/sessions
app.use("/api", ttsRoutes);      // /api/tts
app.use("/api", usageRoutes);    // /api/usage/*

// Non-API routes
app.use("/ai", aiRoutes);
app.use("/auth", authRoutes);
app.use("/resume", resumeRoutes);
app.use("/stripe", stripeRoutes);
app.use("/voice", voiceRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Sentry error handler removed
// if (process.env.SENTRY_DSN) {
//   app.use(sentryErrorHandler);
// }

// Centralized error handler (must be last)
app.use(errorHandler);

// Railway requires explicit binding to 0.0.0.0 to accept external connections
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend listening on http://127.0.0.1:${PORT}`);
  console.log("[BACKEND] listening", { port: PORT, baseUrl: `http://127.0.0.1:${PORT}` });
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const isWindows = process.platform === 'win32';

    console.error('\n❌ Port already in use!');
    console.error(`Port ${PORT} is already being used by another process.\n`);

    if (isWindows) {
      console.error('🔧 Windows detected. Run these commands to resolve:\n');
      console.error(`  1. Find the process using port ${PORT}:`);
      console.error(`     netstat -ano | findstr :${PORT}\n`);
      console.error(`  2. Kill the process (replace <PID> with the PID from step 1):`);
      console.error(`     taskkill /PID <PID> /F\n`);
      console.error(`  3. Retry starting the server:`);
      console.error(`     npm run dev\n`);
    } else {
      console.error('🔧 To resolve on Unix/Linux/Mac:');
      console.error(`  1. Find the process: lsof -ti:${PORT}`);
      console.error(`  2. Kill it: kill -9 $(lsof -ti:${PORT})`);
      console.error(`  3. Retry: npm run dev\n`);
    }

    process.exit(1);
  } else {
    // Re-throw other errors
    throw err;
  }
});
