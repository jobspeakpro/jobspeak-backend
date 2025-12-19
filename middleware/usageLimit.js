// jobspeak-backend/middleware/usageLimit.js
import { getSubscription, getTodaySessionCount } from "../services/db.js";

const FREE_DAILY_LIMIT = 3;

/**
 * Middleware to enforce free-tier usage limits
 * - Free users: 3 interview sessions per day
 * - Pro users: unlimited (server-side enforcement only)
 * - Returns 402 { upgrade: true } when limit reached
 */
export const requireUsageAllowance = (req, res, next) => {
  try {
    const userKey = req.body?.userKey || req.query?.userKey;

    if (!userKey || typeof userKey !== "string" || userKey.trim().length === 0) {
      return res.status(400).json({ error: "userKey is required and must be a non-empty string" });
    }

    // Get subscription and check Pro status
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

    // Pro users have unlimited access - skip limit check
    if (isPro) {
      return next();
    }

    // Free users: count sessions created today
    const todayCount = getTodaySessionCount(userKey.trim());

    // Enforce limit: 3 sessions per day for free users
    if (todayCount >= FREE_DAILY_LIMIT) {
      return res.status(402).json({
        error: "Daily limit of 3 interview sessions reached. Upgrade to Pro for unlimited access.",
        upgrade: true,
      });
    }

    // Allow the request
    next();
  } catch (error) {
    console.error("Usage limit check error:", error);
    return res.status(500).json({ error: "Failed to check usage limit" });
  }
};

