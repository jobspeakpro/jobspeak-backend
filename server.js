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
import resumeRoutes from "./routes/resume.js";
import sessionsRoutes from "./routes/sessions.js";
import stripeRoutes from "./routes/stripe.js";
import sttRoutes from "./routes/stt.js";
import ttsRoutes from "./routes/tts.js";
import usageRoutes from "./routes/usage.js";
import voiceRoutes from "./voiceRoute.js";
import { requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

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
// Webhook endpoint needs raw body for signature verification - must be before express.json()
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));

// Body size limits (10MB for JSON, 25MB for file uploads handled by multer)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// CORS configuration - production-ready
const frontendOrigin = process.env.FRONTEND_ORIGIN;
const isDevelopment = process.env.NODE_ENV !== "production";

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      // Development mode: allow localhost origins
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
      
      // Allow exact match of FRONTEND_ORIGIN if set
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
  })
);

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

// ------------ ROUTES ------------
// API routes (mounted under /api prefix for frontend proxy compatibility)
// POST /api/stt - Speech-to-text endpoint
// GET /api/sessions?userKey=... - Get user sessions
// POST /api/sessions - Save session
// GET /api/billing/status?userKey=... - Get billing status
app.use("/api", billingRoutes);  // /api/billing/*
app.use("/api", sttRoutes);      // /api/stt
app.use("/api", sessionsRoutes);  // /api/sessions
app.use("/api", usageRoutes);    // /api/usage/*

// Non-API routes
app.use("/ai", aiRoutes);
app.use("/auth", authRoutes);
app.use("/resume", resumeRoutes);
app.use("/stripe", stripeRoutes);
app.use("/tts", ttsRoutes);
app.use("/voice", voiceRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Centralized error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`JobSpeakPro backend listening on port ${PORT}`);
});
