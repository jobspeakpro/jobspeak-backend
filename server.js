import dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/node";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

// Core Routes (Restored)
import authRoutes from "./routes/auth.js";
import affiliateRoutes from "./routes/affiliates.js"; // Fixed import
import referralRoutes from "./routes/referrals.js"; // Fixed import

// Middleware
import { requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";

const PORT = process.env.PORT || 3000;

// Sentry Initialization
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

// Permissive CORS for broad compatibility
app.use(cors({
  origin(origin, callback) { return callback(null, true); },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-key", "x-guest-key"],
}));

let commitHash = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT || "unknown";

// Root and Health Endpoints
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "JobSpeakPro backend running",
    version: "Production-Restored-Fix",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "JobSpeakPro Backend",
    version: "Production-Restored-Fix",
    commit: commitHash
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "JobSpeakPro Backend",
    version: "Production-Restored-Fix"
  });
});

// Route Mounting
console.log("[STARTUP] Mounting Auth Routes...");
app.use("/auth", authRoutes);

console.log("[STARTUP] Mounting Affiliate Routes...");
app.use("/api", affiliateRoutes);
// Fallback for root access (if some clients use /affiliate/apply directly without /api)
app.use("/", affiliateRoutes);

console.log("[STARTUP] Mounting Referral Routes...");
app.use("/api", referralRoutes);

// Error Handler
app.use(errorHandler);

// Listen
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend listening on 0.0.0.0:${PORT}`);
  console.log(`[DEPLOY] Production-Restored-Fix`);
});
