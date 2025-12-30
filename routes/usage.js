// jobspeak-backend/routes/usage.js
import express from "express";
import { getSubscription } from "../services/db.js";
import { getUsage, recordAttempt } from "../services/sttUsageStore.js";
import { resolveUserKey } from "../middleware/resolveUserKey.js";
import crypto from "crypto";

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

    // Free users: return today's PRACTICE attempts
    // Only practice submissions count (stt is now unlimited)
    const usage = getUsage(userKey, "practice");

    // Log usage query for debugging
    console.log(`[USAGE TODAY] { userId: "${userKey}", used: ${usage.used}, limit: ${usage.limit}, type: "practice" }`);

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

// POST /api/usage/increment
// Increment usage counter (idempotent with attemptId)
router.post("/usage/increment", async (req, res) => {
  try {
    // Resolve userKey from multiple sources
    const userKey = resolveUserKey(req);

    // Validate userKey
    if (!userKey) {
      return res.status(400).json({ error: "Missing userKey" });
    }

    // Get subscription and determine Pro status
    const subscription = getSubscription(userKey);
    let isPro = false;
    if (subscription) {
      isPro = subscription.isPro;

      if (subscription.currentPeriodEnd) {
        const periodEnd = new Date(subscription.currentPeriodEnd);
        const now = new Date();
        if (periodEnd < now) {
          isPro = false;
        }
      }

      if (subscription.status && subscription.status !== "active" && subscription.status !== "trialing") {
        isPro = false;
      }
    }

    // Pro users don't track usage
    if (isPro) {
      return res.json({
        used: 0,
        limit: -1,
        remaining: -1,
        reachedLimit: false,
      });
    }

    // Get or generate attemptId for idempotency
    let attemptId = req.body?.attemptId || req.query?.attemptId || req.header('x-attempt-id');
    if (!attemptId || typeof attemptId !== 'string' || attemptId.trim().length === 0) {
      attemptId = crypto.randomUUID();
    } else {
      attemptId = attemptId.trim();
    }

    // Record attempt (idempotent)
    const usage = recordAttempt(userKey, attemptId);

    console.log(`[USAGE] Increment - userKey: ${userKey}, attemptId: ${attemptId}, used: ${usage.used}/${usage.limit}, wasNew: ${usage.wasNew}`);

    return res.json({
      used: usage.used,
      limit: usage.limit,
      remaining: usage.remaining,
      reachedLimit: usage.blocked,
    });
  } catch (error) {
    console.error("Error incrementing usage:", error);
    return res.status(500).json({ error: "Failed to increment usage" });
  }
});

export default router;

