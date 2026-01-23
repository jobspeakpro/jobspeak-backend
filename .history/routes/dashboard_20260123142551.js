// jobspeak-backend/routes/dashboard.js
import express from "express";
import { getSessions, getMockInterviewCount, getLastMockInterview } from "../services/db.js";
import { supabase } from "../services/supabase.js";

const router = express.Router();

// GET /api/dashboard/summary?userKey=...
router.get("/dashboard/summary", async (req, res) => {
    try {
        const { userKey } = req.query;
        const headerGuestKey = req.header('x-guest-key');

        if (!userKey) {
            return res.status(400).json({ error: "userKey required" });
        }

        // Get total practice sessions (from sessions table)
        const sessions = getSessions(userKey, 1000); // Get all sessions to count
        const total_practice_sessions = sessions.length;

        // Get total mock interviews
        const total_mock_interviews = getMockInterviewCount(userKey);

        // Get last mock interview
        const lastMock = getLastMockInterview(userKey);

        let last_mock_interview = null;
        if (lastMock) {
            last_mock_interview = {
                type: lastMock.interview_type,
                score: lastMock.overall_score,
                hiring_recommendation: lastMock.hiring_recommendation,
                completed_at: lastMock.created_at,
            };
        }

        // NEW: Fetch recent activity events (last 10)
        let recentActivity = [];
        let practiceStartsToday = 0;
        let mockInterviewStartsToday = 0;
        let debugInfo = {
            userId: null,
            guestKeyFromHeader: null,
            activityCountUserId: 0,
            activityCountGuestKey: 0,
            activityCountCombined: 0
        };

        try {
            // Determine identity (Dual Query Logic)
            const isGuest = userKey.startsWith('guest-');
            const primaryUserId = isGuest ? null : userKey;
            const primaryGuestKey = isGuest ? userKey : null;

            // Check header for guest key (even if authenticated)
            // const headerGuestKey = req.header('x-guest-key'); // Moved to top scope

            // Final resolved IDs
            const userId = primaryUserId;
            const guestKey = headerGuestKey || primaryGuestKey;

            debugInfo.userId = userId;
            debugInfo.guestKeyFromHeader = headerGuestKey || null;

            // Build Query
            let activityQuery = supabase
                .from('activity_events')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50); // Fetch more to dedupe client-side if needed, though limit 10 is output

            if (userId && guestKey) {
                // Dual Query: user_id OR identity_key
                // Syntax: .or('user_id.eq.UID,identity_key.eq.KEY')
                activityQuery = activityQuery.or(`user_id.eq.${userId},identity_key.eq.${guestKey}`);
            } else if (userId) {
                activityQuery = activityQuery.eq('user_id', userId);
            } else if (guestKey) {
                activityQuery = activityQuery.eq('identity_key', guestKey);
            } else {
                // No identity, empty result
                activityQuery = null;
            }

            if (activityQuery) {
                const { data: activityEvents, error: activityError } = await activityQuery;

                if (!activityError && activityEvents) {
                    // Deduplicate if needed (though OR query shouldn't return dupes of same row)
                    // But logical dupes (same activity tracked under both IDs? unlikely if day/time match)

                    // Filter to last 10 for display
                    recentActivity = activityEvents.slice(0, 10).map(event => ({
                        activityType: event.activity_type,
                        startedAt: event.created_at,
                        context: event.context || {}
                    }));

                    // Count today's starts
                    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                    activityEvents.forEach(event => {
                        // Debug counts
                        if (event.user_id === userId) debugInfo.activityCountUserId++;
                        if (event.identity_key === guestKey) debugInfo.activityCountGuestKey++;

                        if (event.day === today) {
                            if (event.activity_type === 'practice') {
                                practiceStartsToday++;
                            } else if (event.activity_type === 'mock_interview') {
                                mockInterviewStartsToday++;
                            }
                        }
                    });
                    debugInfo.activityCountCombined = activityEvents.length;
                }
            }
        } catch (activityErr) {
            console.warn('[DASHBOARD] Activity events fetch failed (non-fatal):', activityErr.message);
            // Continue without activity data
        }

        // DEBUG: Add debug info
        const commit = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT || "local";
        const debug = {
            commit,
            identityKey: userKey, // Legacy field
            ...debugInfo // Expanded debug info
        };

        // Add response header
        res.setHeader('x-jsp-backend-commit', commit);

        return res.json({
            total_practice_sessions,
            total_mock_interviews,
            last_mock_interview,
            // NEW: Activity tracking data
            recentActivity,
            practiceStartsToday,
            mockInterviewStartsToday,
            debug: {
                commit,
                identityKeyResolved: userKey,
                guestKeyFromHeader: headerGuestKey || null,
                userId: debugInfo.userId,
                activityCountCombined: debugInfo.activityCountCombined ?? 0,
                // keep legacy for safety
                ...debug
            }
        });
    } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        return res.status(500).json({ error: "Failed to fetch dashboard summary" });
    }
});

export default router;
