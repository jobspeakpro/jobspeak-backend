import dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/node";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

import { requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";

const PORT = process.env.PORT || 3000;
let routeStatus = {}; // Store load status of routes

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
  origin(origin, callback) { return callback(null, true); }, // Permissive for debug
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-key", "x-guest-key"],
}));

// Basic Info
let commitHash = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT || "unknown";

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "JobSpeakPro backend running",
    version: "Dynamic-Restore-Debug",
    timestamp: new Date().toISOString(),
    routes: routeStatus
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "JobSpeakPro Backend",
    version: "Dynamic-Restore",
    routes: routeStatus
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "JobSpeakPro Backend",
    version: "Dynamic-Restore",
    routes: routeStatus
  });
});

// DYNAMIC ROUTE LOADER
// This allows 'server.js' to start even if a specific route file crashes on import.
async function loadRoutes() {
  console.log("[LOADER] Starting dynamic route loading...");

  // Helper to load and mount
  const load = async (name, pathStr, mountPath = "/api") => {
    try {
      console.log(`[LOADER] importing ${name} from ${pathStr}...`);
      const module = await import(pathStr);
      const router = module.default;
      if (router) {
        app.use(mountPath, router);
        if (mountPath === "/api" && name === "affiliates") {
          // Double mount as requested
          app.use("/", router);
        }
        routeStatus[name] = "Loaded";
        console.log(`[LOADER] ${name} -> OK`);
      } else {
        routeStatus[name] = "Failed: No default export";
        console.error(`[LOADER] ${name} -> FAIL (No default)`);
      }
    } catch (e) {
      routeStatus[name] = `Failed: ${e.message}`;
      console.error(`[LOADER] ${name} -> CRASH:`, e);
    }
  };

  // Load Critical Routes
  await load("auth", "./routes/auth.js", "/auth");
  await load("affiliates", "./routes/affiliates.js");
  await load("referrals", "./routes/referrals.js");

  // Load Suspect Routes (can verify later which ones work)
  // await load("stripe", "./routes/stripe.js");
  // await load("billing", "./routes/billing.js");
  // await load("voice", "./voiceRoute.js", "/voice");
}

// Start Loader
loadRoutes().then(() => {
  console.log("[LOADER] Route loading complete. Status:", routeStatus);
});


app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend listening on 0.0.0.0:${PORT}`);
  console.log(`[DEPLOY] Dynamic-Restore-Debug`);
});
