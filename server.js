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
import referralRoutes from "./routes/referrals.js"; // USER REQUESTED
import affiliateRoutes from "./routes/affiliates.js"; // USER REQUESTED
// import supportRoutes from "./routes/support.js";

import { requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";

const PORT = process.env.PORT || 3000;

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

const tmpDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

if (sentryInitialized) {
  app.use(Sentry.Handlers.requestHandler());
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(requestLogger);

const corsOptions = {
  origin(origin, callback) {
    // Permissive CORS for verification phase
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-key", "x-guest-key", "x-attempt-id", "X-Attempt-Id", "x-jsp-backend-commit", "x-identity-used", "x-identity-mode"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "JobSpeakPro backend running",
    version: "Strategic-Restore-Log-Debug",
    timestamp: new Date().toISOString()
  });
});

let commitHash = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT || "unknown";

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    service: "JobSpeakPro Backend",
    commit: commitHash,
    version: "Strategic-Restore"
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    service: "JobSpeakPro Backend",
    commit: commitHash,
    version: "Strategic-Restore"
  });
});

// ROUTE MOUNTING DEBUG
console.log("[STARTUP] Mounting Auth Routes...");
app.use("/auth", authRoutes);

console.log("[STARTUP] Mounting Referral Routes...");
app.use("/api", referralRoutes);

console.log("[STARTUP] Mounting Affiliate Routes...");
app.use("/api", affiliateRoutes);
// Double mount for legacy fallback
app.use("/", affiliateRoutes);

console.log("[STARTUP] Mounting Debug Ping...");
app.get("/api/debug_ping", (req, res) => {
  res.json({ pong: true, time: new Date().toISOString() });
});

// Explicitly handle 404 for debugging
app.use((req, res) => {
  console.log(`[404] Method: ${req.method} URL: ${req.url}`);
  res.status(404).json({ error: "Not found", url: req.url, method: req.method });
});

app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend listening on 0.0.0.0:${PORT}`);
  console.log(`[DEPLOY] Strategic-Restore-Log-Debug`);
});
