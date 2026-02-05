// jobspeak-backend/routes/entitlements.js
import express from "express";
import { getAuthenticatedUser } from "../middleware/auth.js";
import { supabase } from "../services/supabase.js";

const router = express.Router();

/**
 * GET /api/entitlements
 * Returns what the user is allowed to do based on their plan, trial, credits, etc.
 * Auth optional - returns guest state if not logged in
 */
router.get("/entitlements", async (req, res) => {
    try {
        // Add timeout to prevent hanging (1 second max)
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Entitlements timeout')), 1000)
        );

        const entitlementsPromise = (async () => {
            // Get user authentication status
            const { userId, isGuest } = await getAuthenticatedUser(req);

            // Guest/unauthenticated user
            if (isGuest || !userId) {
                return {
                    isAuthenticated: false,
                    plan: "guest",
                    mockInterview: {
                        allowed: false,
                        reason: "AUTH_REQUIRED",
                        remaining: 0,
                        referralCredits: 0,
                        trialEndsAt: null
                    }
                };
            }

            // Fetch user data from Supabase profile table
            const { data: user, error } = await supabase
                .from('profile')
                .select('plan_status, trial_ends_at, free_mock_used_at, referral_mock_credits')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('[ENTITLEMENTS] Error fetching user:', error);
                // Default to free plan if user not found
                return {
                    isAuthenticated: true,
                    plan: "free",
                    mockInterview: {
                        allowed: true,
                        reason: "FREE_ONE_TIME",
                        remaining: 1,
                        referralCredits: 0,
                        trialEndsAt: null
                    }
                };
            }

            // Extract user data with defaults
            const planStatus = user?.plan_status || 'free';
            const trialEndsAt = user?.trial_ends_at;
            const freeMockUsedAt = user?.free_mock_used_at;
            const referralCredits = user?.referral_mock_credits || 0;

            // Determine mock interview eligibility
            let allowed = false;
            let reason = "NO_CREDITS";
            let remaining = 0;

            // Check eligibility in priority order
            if (planStatus === 'paid' || planStatus === 'pro') {
                allowed = true;
                reason = "PAID";
                remaining = 999;
            } else if (planStatus === 'trial' && trialEndsAt) {
                const trialEnd = new Date(trialEndsAt);
                const now = new Date();

                if (trialEnd > now) {
                    allowed = true;
                    reason = "TRIAL_ACTIVE";
                    remaining = 999;
                } else if (referralCredits > 0) {
                    allowed = true;
                    reason = "REFERRAL_CREDIT";
                    remaining = referralCredits;
                } else {
                    allowed = false;
                    reason = "NO_CREDITS";
                    remaining = 0;
                }
            } else if (referralCredits > 0) {
                allowed = true;
                reason = "REFERRAL_CREDIT";
                remaining = referralCredits;
            } else if (!freeMockUsedAt) {
                allowed = true;
                reason = "FREE_ONE_TIME";
                remaining = 1;
            } else {
                allowed = false;
                reason = "NO_CREDITS";
                remaining = 0;
            }

            return {
                isAuthenticated: true,
                plan: planStatus,
                mockInterview: {
                    allowed,
                    reason,
                    remaining,
                    referralCredits,
                    trialEndsAt
                }
            };
        })();

        // Race between entitlements logic and timeout
        const result = await Promise.race([entitlementsPromise, timeoutPromise]);
        return res.json(result);

    } catch (error) {
        console.error('[ENTITLEMENTS] Error:', error.message);

        // Return safe fallback response
        return res.status(503).json({
            error: "Service temporarily unavailable",
            isAuthenticated: false,
            plan: "unknown",
            mockInterview: {
                allowed: false,
                reason: "SERVICE_UNAVAILABLE",
                remaining: 0,
                referralCredits: 0,
                trialEndsAt: null
            }
        });
    }
});

export default router;
