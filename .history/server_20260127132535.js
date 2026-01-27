import dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/node";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

// Safe Mode Imports (Proven to work)
import authRoutes from "./routes/auth.js";
import affiliateRoutes from "./routes/affiliates.js"; // This was present in working Safe Mode

// import referralRoutes from "./routes/referrals.js"; // Commented out in Safe Mode

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
  }
} catch (err) {
  console.error("[SENTRY] Failed to initialize:", err.message);
}

const app = express();
const tmpDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

if (sentryInitialized) app.use(Sentry.Handlers.requestHandler());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

app.use(cors({
  origin(origin, callback) { return callback(null, true); },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-key", "x-guest-key"],
}));

let commitHash = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT || "unknown";

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "JobSpeakPro backend running",
    version: "Safe-Mode-Restore", // Reverting to safe mode
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "JobSpeakPro Backend",
    version: "Safe-Mode-Restore",
    commit: commitHash
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "JobSpeakPro Backend",
    version: "Safe-Mode-Restore"
  });
});

// MOUNT AUTH
app.use("/auth", authRoutes);

// MOUNT AFFILIATE
app.use("/api", affiliateRoutes);
app.use("/", affiliateRoutes);

// INLINE REFERRALS STUB (The only addition to Safe Mode)
app.get("/api/referrals/me", (req, res) => {
  res.status(401).json({ error: "Unauthorized (Stubbed)" });
});

app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend listening on 0.0.0.0:${PORT}`);
  console.log(`[DEPLOY] Safe-Mode-Restore`);
});
