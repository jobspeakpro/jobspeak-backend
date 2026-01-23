// jobspeak-backend/routes/dashboard.js
import express from "express";
import { getSessions, getMockInterviewCount, getLastMockInterview } from "../services/db.js";
import { supabase } from "../services/supabase.js";

const router = express.Router();

// GET /api/dashboard/summary?userKey=...
router.get("/dashboard/summary", async (req, res) => {
    try {
        const { userKey } = req.query;

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

        try {
            // Determine if authenticated user or guest
            const isGuest = userKey.startsWith('guest-');
            const user_id = isGuest ? null : userKey;
            const identity_key = isGuest ? userKey : null;

            // Fetch last 10 activity events
            let activityQuery = supabase
                .from('activity_events')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (user_id) {
                activityQuery = activityQuery.eq('user_id', user_id);
            } else {
                activityQuery = activityQuery.eq('identity_key', identity_key);
            }

            const { data: activityEvents, error: activityError } = await activityQuery;

            if (!activityError && activityEvents) {
                // Map to recentActivity format
                recentActivity = activityEvents.map(event => ({
                    activityType: event.activity_type,
                    startedAt: event.created_at,
                    context: event.context || {}
                }));

                // Count today's starts
                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                activityEvents.forEach(event => {
                    if (event.day === today) {
                        if (event.activity_type === 'practice') {
                            practiceStartsToday++;
                        } else if (event.activity_type === 'mock_interview') {
                            mockInterviewStartsToday++;
                        }
                    }
                });
            }
        } catch (activityErr) {
            console.warn('[DASHBOARD] Activity events fetch failed (non-fatal):', activityErr.message);
            // Continue without activity data
        }

        // DEBUG: Add debug info
        const commit = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT || "local";
        const debug = {
            commit,
            identityKey: user_id ? `user:${user_id}` : `guest:${identity_key || userKey}`,
            recentActivityCount: recentActivity.length,
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
            debug // NEW: Debug info
        });
    } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        return res.status(500).json({ error: "Failed to fetch dashboard summary" });
    }
});

export default router;
