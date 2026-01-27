import dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/node";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

// --- ROUTES ---
import accountRoutes from "./routes/account.js";
import activityRoutes from "./routes/activity.js";
import aiRoutes from "./routes/ai.js";
import authRoutes from "./routes/auth.js";
import billingRoutes from "./routes/billing.js";
import dashboardRoutes from "./routes/dashboard.js";
import dailyTipRoutes from "./routes/dailyTip.js";
import heardAboutRoutes from "./routes/heardAbout.js";
import mockInterviewRoutes from "./routes/mockInterview.js";
import practiceRoutes from "./routes/practice.js";
import progressRoutes from "./routes/progress.js";
import reflectionRoutes from "./routes/reflection.js";
import resumeRoutes from "./routes/resume.js";
import sessionsRoutes from "./routes/sessions.js";
import stripeRoutes from "./routes/stripe.js";
import sttRoutes from "./routes/stt.js";
import ttsRoutes from "./routes/tts.js";
import usageRoutes from "./routes/usage.js";
import voiceRoutes from "./voiceRoute.js";

// -- NEW FEATURE ROUTES --
import referralRoutes from "./routes/referrals.js";
import affiliateRoutes from "./routes/affiliates.js";
import supportRoutes from "./routes/support.js";

import { requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";

const PORT = process.env.PORT || 8080;

// Initialize Sentry
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

const app = express();
const tmpDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

if (sentryInitialized) {
  app.use(Sentry.Handlers.requestHandler());
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// CORS
const corsOptions = {
  origin(origin, callback) {
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-key", "x-guest-key", "x-attempt-id", "X-Attempt-Id", "x-jsp-backend-commit", "x-identity-used", "x-identity-mode"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

let commitHash = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT || "unknown";

// Root/Health
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "JobSpeakPro backend running",
    version: "Full-Restore-Final",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    service: "JobSpeakPro Backend",
    commit: commitHash,
    version: "Full-Restore-Final"
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    service: "JobSpeakPro Backend",
    version: "Full-Restore-Final"
  });
});

// MOUNT ROUTES
console.log("[STARTUP] Mounting Routes...");
app.use("/auth", authRoutes);
app.use("/api", accountRoutes);
app.use("/api", activityRoutes);
app.use("/api", aiRoutes);
app.use("/api", billingRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", dailyTipRoutes);
app.use("/api", heardAboutRoutes);
app.use("/api", mockInterviewRoutes);
app.use("/api", practiceRoutes);
app.use("/api", progressRoutes);
app.use("/api", reflectionRoutes);
app.use("/api", resumeRoutes);
app.use("/api", sessionsRoutes);
app.use("/api", stripeRoutes);
app.use("/api", sttRoutes);
app.use("/api", ttsRoutes);
app.use("/api", usageRoutes);
// Voice routes typically mounted at root or /voice depending on legacy
app.use("/voice", voiceRoutes);
// Also support old path if needed, but usually it's /voice/generate
// server.js often mounts voiceRoutes at /voice in this project?
// Let's check: "import voiceRoutes from './voiceRoute.js';" usually app.use("/voice", voiceRoutes) or app.use("/", voiceRoutes) if the file has /voice prefix
// Safe bet: app.use(voiceRoutes) if it defines exact paths, or check file. 
// Step 606: router.post("/generate", ...) in voiceRoute.js. So likely app.use("/voice", ...).
app.use("/voice", voiceRoutes);


// NEW ROUTES
app.use("/api", referralRoutes);
app.use("/api", affiliateRoutes);
app.use("/api", supportRoutes);

// Helper for direct access if needed
app.use("/", affiliateRoutes); // For /affiliate/apply direct access

// Error handling
app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend listening on 0.0.0.0:${PORT}`);
  console.log(`[DEPLOY] Full-Restore-Final`);
});
