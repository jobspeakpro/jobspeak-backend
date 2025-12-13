// jobspeak-backend/routes/sessions.js
import express from "express";
import { saveSession, getSessions, getSessionById, sessionExistsById } from "../services/db.js";
import { rateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// POST /api/sessions - Save a session (rate limited: 30 requests per minute)
router.post("/sessions", rateLimiter(30, 60000), async (req, res) => {
  try {
    const { userKey, transcript, aiResponse, score } = req.body;

    // Validate required fields - return 400 on missing fields
    const missingFields = [];
    
    if (userKey === undefined || userKey === null) {
      missingFields.push("userKey");
    } else if (typeof userKey !== "string" || userKey.trim().length === 0) {
      return res.status(400).json({
        error: "userKey must be a non-empty string",
      });
    }

    if (transcript === undefined || transcript === null) {
      missingFields.push("transcript");
    } else if (typeof transcript !== "string" || transcript.trim().length === 0) {
      return res.status(400).json({
        error: "transcript must be a non-empty string",
      });
    }

    if (aiResponse === undefined || aiResponse === null) {
      missingFields.push("aiResponse");
    } else if (typeof aiResponse !== "string" || aiResponse.trim().length === 0) {
      return res.status(400).json({
        error: "aiResponse must be a non-empty string",
      });
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Validate score if provided (score can be null/undefined, but if provided must be valid)
    let validatedScore = null;
    if (score !== null && score !== undefined) {
      const scoreNum = Number(score);
      if (isNaN(scoreNum) || !Number.isInteger(scoreNum)) {
        return res.status(400).json({
          error: "score must be an integer or null",
        });
      }
      validatedScore = scoreNum;
    }

    // Save session with all required fields: userKey, transcript, aiResponse, score, createdAt (ISO)
    const session = saveSession(
      userKey.trim(),
      transcript.trim(),
      aiResponse.trim(),
      validatedScore
    );

    // Ensure response includes all required fields
    if (!session || !session.createdAt) {
      throw new Error("Session save failed to return required fields");
    }

    // Verify createdAt is ISO format
    const createdAtDate = new Date(session.createdAt);
    if (isNaN(createdAtDate.getTime())) {
      throw new Error("Invalid createdAt format");
    }

    return res.json({
      id: session.id,
      userKey: session.userKey,
      transcript: session.transcript,
      aiResponse: session.aiResponse,
      score: session.score,
      createdAt: session.createdAt, // ISO format
    });
  } catch (error) {
    console.error("Error saving session:", error);
    return res.status(500).json({ error: "Failed to save session" });
  }
});

// GET /api/sessions?limit=&userKey= - Get recent sessions for a user (newest first)
router.get("/sessions", async (req, res) => {
  try {
    const { userKey, limit } = req.query;

    // Validate userKey - return 400 on missing field
    if (userKey === undefined || userKey === null) {
      return res.status(400).json({ error: "Missing required field: userKey" });
    }
    if (typeof userKey !== "string" || userKey.trim().length === 0) {
      return res.status(400).json({ error: "userKey must be a non-empty string" });
    }

    // Validate limit - return 400 on invalid limit
    let limitNum = 10; // default
    if (limit !== undefined && limit !== null) {
      limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({ error: "limit must be an integer between 1 and 100" });
      }
    }

    // Get sessions ordered by newest first (ORDER BY createdAt DESC)
    const sessions = getSessions(userKey.trim(), limitNum);

    // Ensure all sessions have required fields and createdAt is ISO format
    const validatedSessions = sessions.map(session => ({
      id: session.id,
      userKey: session.userKey,
      transcript: session.transcript,
      aiResponse: session.aiResponse,
      score: session.score,
      createdAt: session.createdAt, // ISO format, already ordered DESC
    }));

    return res.json(validatedSessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// GET /api/sessions/:id?userKey= - Get one session detail (validates userKey)
router.get("/sessions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userKey } = req.query;

    // Validate userKey - return 400 on missing field
    if (userKey === undefined || userKey === null) {
      return res.status(400).json({ error: "Missing required field: userKey" });
    }
    if (typeof userKey !== "string" || userKey.trim().length === 0) {
      return res.status(400).json({ error: "userKey must be a non-empty string" });
    }

    // Validate id - return 400 on invalid id
    const idNum = parseInt(id, 10);
    if (isNaN(idNum) || idNum < 1) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    // First check if session exists (without userKey filter) to distinguish 403 vs 404
    const sessionExists = sessionExistsById(idNum);
    
    if (!sessionExists) {
      // Session doesn't exist - return 404
      return res.status(404).json({ error: "Session not found" });
    }

    // Session exists - now verify userKey matches
    const session = getSessionById(idNum, userKey.trim());

    if (!session) {
      // Session exists but userKey doesn't match - return 403 (forbidden)
      return res.status(403).json({ error: "Access denied" });
    }

    // Ensure response includes all required fields with createdAt in ISO format
    return res.json({
      id: session.id,
      userKey: session.userKey,
      transcript: session.transcript,
      aiResponse: session.aiResponse,
      score: session.score,
      createdAt: session.createdAt, // ISO format
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return res.status(500).json({ error: "Failed to fetch session" });
  }
});

export default router;

