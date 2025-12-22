// jobspeak-backend/routes/usage.js
import express from "express";
import { getSubscription } from "../services/db.js";
import { getUsage } from "../services/sttUsageStore.js";
import { resolveUserKey } from "../middleware/resolveUserKey.js";

const router = express.Router();

// GET /api/usage/today
// Accepts userKey from query, header, or body
router.get("/usage/today", async (req, res) => {
  try {
    // Resolve userKey from multiple sources
    const userKey = resolveUserKey(req);

    // Validate userKey
    if (!userKey) {
      return res.status(400).json({ error: "Missing userKey" });
    }

    // Get subscription and determine Pro status
    const subscription = getSubscription(userKey);
    
    // Determine if user is Pro (check expiration)
    let isPro = false;
    if (subscription) {
      isPro = subscription.isPro;
      
      // If subscription exists, check if it's expired
      if (subscription.currentPeriodEnd) {
        const periodEnd = new Date(subscription.currentPeriodEnd);
        const now = new Date();
        if (periodEnd < now) {
          isPro = false; // Expired subscriptions are not Pro
        }
      }
      
      // Ensure isPro matches status truth
      if (subscription.status && subscription.status !== "active" && subscription.status !== "trialing") {
        isPro = false;
      }
    }

    // Pro users have unlimited access
    if (isPro) {
      return res.json({
        usage: {
          used: 0,
          limit: -1, // -1 means unlimited
          remaining: -1,
          blocked: false,
        },
      });
    }

    // Free users: return today's STT attempts (speaking attempts)
    // Only successful STT transcriptions count toward the daily limit
    const usage = getUsage(userKey);
    
    // Log usage query for debugging
    console.log(`[USAGE] Query - userKey: ${userKey}, used: ${usage.used}, limit: ${usage.limit}, route: /api/usage/today`);

    // Return consistent JSON shape
    return res.json({
      usage: {
        used: usage.used,
        limit: usage.limit,
        remaining: usage.remaining,
        blocked: usage.blocked,
      },
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return res.status(500).json({ error: "Failed to fetch usage" });
  }
});

export default router;

