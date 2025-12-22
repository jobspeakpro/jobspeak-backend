// jobspeak-backend/routes/usage.js
import express from "express";
import { getSubscription, getTodaySTTCount } from "../services/db.js";

const router = express.Router();

const FREE_DAILY_LIMIT = 3;

// GET /api/usage/today?userKey=
router.get("/usage/today", async (req, res) => {
  try {
    const { userKey } = req.query;

    // Validate userKey
    if (!userKey || typeof userKey !== "string" || userKey.trim().length === 0) {
      return res.status(400).json({ error: "userKey is required and must be a non-empty string" });
    }

    // Get subscription and determine Pro status
    const subscription = getSubscription(userKey.trim());
    
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
        used: 0,
        limit: -1, // -1 means unlimited
        remaining: -1,
        isPro: true,
      });
    }

    // Free users: return today's STT attempts (speaking attempts)
    // Only successful STT transcriptions count toward the daily limit
    const used = getTodaySTTCount(userKey.trim());
    const remaining = Math.max(0, FREE_DAILY_LIMIT - used);
    
    // Log usage query for debugging
    console.log(`[USAGE] Query - userKey: ${userKey.trim()}, sttAttemptsUsed: ${used}, sttLimit: ${FREE_DAILY_LIMIT}, remaining: ${remaining}`);

    return res.json({
      used,
      limit: FREE_DAILY_LIMIT,
      remaining,
      isPro: false,
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return res.status(500).json({ error: "Failed to fetch usage" });
  }
});

export default router;

