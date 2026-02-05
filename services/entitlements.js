// jobspeak-backend/services/entitlements.js
import { supabase } from "./supabase.js";

/**
 * Check if user is eligible for mock interview
 * Returns: { allowed: boolean, reason: string, remaining: number, planStatus: string }
 */
export async function checkMockInterviewEligibility(userId) {
    if (!userId) {
        return {
            allowed: false,
            reason: "AUTH_REQUIRED",
            remaining: 0,
            planStatus: "guest"
        };
    }

    try {
        // Fetch user data from profile table
        const { data: user, error } = await supabase
            .from('profile')
            .select('plan_status, trial_ends_at, free_mock_used_at, referral_mock_credits')
            .eq('id', userId)
            .single();

        if (error || !user) {
            console.error('[ENTITLEMENTS] Error fetching user:', error);
            // Default to allowing free one-time if user not found
            return {
                allowed: true,
                reason: "FREE_ONE_TIME",
                remaining: 1,
                planStatus: "free"
            };
        }

        const planStatus = user.plan_status || 'free';
        const trialEndsAt = user.trial_ends_at;
        const freeMockUsedAt = user.free_mock_used_at;
        const referralCredits = user.referral_mock_credits || 0;

        // Check eligibility in priority order
        if (planStatus === 'paid') {
            return {
                allowed: true,
                reason: "PAID",
                remaining: 999,
                planStatus
            };
        }

        if (planStatus === 'trial' && trialEndsAt) {
            const trialEnd = new Date(trialEndsAt);
            const now = new Date();

            if (trialEnd > now) {
                return {
                    allowed: true,
                    reason: "TRIAL_ACTIVE",
                    remaining: 999,
                    planStatus
                };
            }
        }

        if (referralCredits > 0) {
            return {
                allowed: true,
                reason: "REFERRAL_CREDIT",
                remaining: referralCredits,
                planStatus
            };
        }

        if (!freeMockUsedAt) {
            return {
                allowed: true,
                reason: "FREE_ONE_TIME",
                remaining: 1,
                planStatus
            };
        }

        // No eligibility
        return {
            allowed: false,
            reason: "NO_CREDITS",
            remaining: 0,
            planStatus
        };

    } catch (error) {
        console.error('[ENTITLEMENTS] Error checking eligibility:', error);
        return {
            allowed: false,
            reason: "ERROR",
            remaining: 0,
            planStatus: "unknown"
        };
    }
}

/**
 * Consume a mock interview credit
 * Decrements referral credit or marks free one-time as used
 */
export async function consumeMockInterviewCredit(userId, reason) {
    if (!userId) {
        return { success: false, error: "No user ID" };
    }

    try {
        if (reason === "REFERRAL_CREDIT") {
            // Decrement referral credit
            const { data, error } = await supabase
                .from('profile')
                .update({
                    referral_mock_credits: supabase.raw('referral_mock_credits - 1')
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                console.error('[ENTITLEMENTS] Error decrementing referral credit:', error);
                return { success: false, error: error.message };
            }

            console.log(`[ENTITLEMENTS] Decremented referral credit for user ${userId}`);
            return { success: true, data };

        } else if (reason === "FREE_ONE_TIME") {
            // Mark free one-time as used
            const { data, error } = await supabase
                .from('profile')
                .update({ free_mock_used_at: new Date().toISOString() })
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                console.error('[ENTITLEMENTS] Error marking free mock as used:', error);
                return { success: false, error: error.message };
            }

            console.log(`[ENTITLEMENTS] Marked free mock as used for user ${userId}`);
            return { success: true, data };
        }

        // PAID or TRIAL_ACTIVE don't need consumption
        return { success: true };

    } catch (error) {
        console.error('[ENTITLEMENTS] Error consuming credit:', error);
        return { success: false, error: error.message };
    }
}
