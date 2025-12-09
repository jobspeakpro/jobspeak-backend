import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import aiRoutes from "./routes/ai.js";
import ttsRoutes from "./routes/tts.js";
import resumeRoutes from "./routes/resume.js";
import stripeRoutes from "./routes/stripe.js";
import authRoutes from "./routes/auth.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Health check / root
app.get("/", (req, res) => {
  res.send("JobSpeak Pro Backend Running on port 5055.");
});

// --- ROUTES ---
app.use("/ai", aiRoutes);
app.use("/tts", ttsRoutes);
app.use("/resume", resumeRoutes);
app.use("/stripe", stripeRoutes);
app.use("/auth", authRoutes);

// --- START SERVER ---
// IMPORTANT: use 5055 locally, but Railway will override with its own PORT env
const PORT = process.env.PORT || 5055;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
