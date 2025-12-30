// jobspeak-backend/routes/analytics.js
import express from "express";
import { trackEvent } from "../services/analytics.js";
import { resolveUserKey } from "../middleware/resolveUserKey.js";

const router = express.Router();

/**
 * POST /api/track
 * Track analytics events from frontend
 * 
 * Body: {
 *   event: string (required) - Event name (e.g., 'practice_page_view', 'upgrade_click')
 *   properties: object (optional) - Event properties
 *   userKey: string (optional) - User identifier (can also come from header)
 * }
 * 
 * Returns: { success: true }
 * 
 * Non-blocking: Never throws, always returns success even if tracking fails
 */
router.post("/track", async (req, res) => {
  try {
    const { event, properties = {} } = req.body;
    
    if (!event || typeof event !== "string") {
      return res.status(400).json({ 
        error: "Missing or invalid 'event' field" 
      });
    }

    // Resolve userKey from multiple sources
    const userKey = resolveUserKey(req) || properties.userKey || properties.userId || null;

    // Track event (non-blocking, never throws)
    trackEvent(event, properties, userKey);

    // Always return success - analytics should never break UX
    return res.json({ success: true });
  } catch (err) {
    // Even if tracking fails, return success to not break frontend
    console.warn("[ANALYTICS] /api/track error (non-blocking):", err.message);
    return res.json({ success: true });
  }
});

export default router;

