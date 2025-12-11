// jobspeak-backend/server.js
import dotenv from "dotenv";
import express from "express";
import cors from "cors";

import aiRoutes from "./routes/ai.js";
import authRoutes from "./routes/auth.js";
import resumeRoutes from "./routes/resume.js";
import stripeRoutes from "./routes/stripe.js";
import ttsRoutes from "./routes/tts.js";
import voiceRoutes from "./voiceRoute.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ------------ MIDDLEWARE ------------
app.use(express.json());

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "https://jobspeakpro.netlify.app",
  "https://www.jobspeakpro.netlify.app",
  "https://jobspeakpro.com",
  "https://www.jobspeakpro.com",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn("Blocked CORS origin:", origin);
      return callback(null, false);
    },
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "JobSpeakPro backend running" });
});

// ------------ ROUTES ------------
app.use("/ai", aiRoutes);
app.use("/auth", authRoutes);
app.use("/resume", resumeRoutes);
app.use("/stripe", stripeRoutes);
app.use("/tts", ttsRoutes);
app.use("/voice", voiceRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`JobSpeakPro backend listening on port ${PORT}`);
});
