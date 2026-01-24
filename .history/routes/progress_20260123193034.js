// jobspeak-backend/routes/progress.js
// User progress tracking and statistics

import express from "express";
import { getSessions } from "../services/db.js";
import { getTodayUTC } from "../services/dateUtils.js";
import { supabase } from "../services/supabase.js";
import { resolveIdentity } from "./activity.js";

const router = express.Router();

/**
 * Shape function for /api/progress/summary response
 * Ensures all keys are present with safe defaults
 */
function shapeProgressSummaryResponse(data = {}) {
    return {
        total_practice_sessions: data.total_practice_sessions ?? 0,
        days_practiced: data.days_practiced ?? 0,
        current_streak_days: data.current_streak_days ?? 0,
        recent_practice: data.recent_practice ?? [],
        weekly_minutes: data.weekly_minutes ?? 0,
        // Frontend convenience aliases (camelCase)
        totalSessions: data.total_practice_sessions ?? 0,
        daysPracticed: data.days_practiced ?? 0,
        currentStreak: data.current_streak_days ?? 0,
        recentSessions: data.recent_practice ?? []
    };
}

/**
 * Shape function for /api/progress response
 * Ensures all keys are present with safe defaults
 */
function shapeProgressResponse(data = {}) {
    return {
        sessions: data.sessions ?? [],
        total: data.total ?? 0,
        activityEvents: data.activityEvents ?? []
    };
}

/**
 * GET /api/progress/summary?userKey=...
 * Returns real progress data for authenticated user
 * 
 * Response:
 * {
 *   total_practice_sessions: number,
 *   days_practiced: number,
 *   current_streak_days: number,
 *   recent_practice: [{ title, date, duration }],
 *   weekly_minutes: number
 * }
 */
router.get("/progress/summary", async (req, res) => {
    try {
        // Resolve identity (using refactored helper)
        const { user_id, identity_key, mode, usedValue } = resolveIdentity(req);

        // Set identity headers
        res.setHeader('x-identity-used', usedValue || 'none');
        res.setHeader('x-identity-mode', mode);

        // Support both authenticated and guest users
        // If no userKey, return empty data (don't break dashboard)
        if (!usedValue) {
            return res.json(shapeProgressSummaryResponse({
                total_practice_sessions: 0,
                days_practiced: 0,
                current_streak_days: 0,
                recent_practice: [],
                weekly_minutes: 0
            }));
        }

        // Get all sessions for user (we'll process them for stats)
        const sessions = getSessions(usedValue, 1000); // Get all sessions

        if (!sessions || sessions.length === 0) {
            // Return zeros if no sessions
            return res.json(shapeProgressSummaryResponse({
                total_practice_sessions: 0,
                days_practiced: 0,
                current_streak_days: 0,
                recent_practice: [],
                weekly_minutes: 0
            }));
        }

        // 1. Total practice sessions
        const total_practice_sessions = sessions.length;

        // 2. Days practiced (distinct dates)
        const uniqueDates = new Set();
        sessions.forEach(session => {
            const date = session.createdAt.substring(0, 10); // YYYY-MM-DD
            uniqueDates.add(date);
        });
        const days_practiced = uniqueDates.size;

        // 3. Current streak (consecutive days from today backwards)
        const sortedDates = Array.from(uniqueDates).sort().reverse(); // Most recent first
        const todayUTC = getTodayUTC();
        let current_streak_days = 0;

        if (sortedDates.length > 0) {
            const today = new Date(todayUTC);
            let checkDate = new Date(today);

            for (const dateStr of sortedDates) {
                const sessionDate = new Date(dateStr);
                const daysDiff = Math.floor((checkDate - sessionDate) / (1000 * 60 * 60 * 24));

                if (daysDiff === 0 || daysDiff === 1) {
                    current_streak_days++;
                    checkDate = new Date(sessionDate);
                } else {
                    break; // Streak broken
                }
            }
        }

        // 4. Recent practice (last 3 sessions)
        const recent_practice = sessions.slice(0, 3).map(session => {
            let aiResponse = {};
            try {
                aiResponse = JSON.parse(session.aiResponse);
            } catch (e) {
                // Ignore parse errors
            }

            // Estimate duration based on transcript length (rough heuristic: 150 words/min speaking)
            const wordCount = session.transcript.split(/\s+/).length;
            const estimatedMinutes = Math.max(1, Math.round(wordCount / 150));

            return {
                title: `Practice Session`,
                date: session.createdAt,
                duration: estimatedMinutes,
                score: aiResponse.analysis?.score || session.score || null
            };
        });

        // 5. Weekly minutes (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentSessions = sessions.filter(s => new Date(s.createdAt) >= sevenDaysAgo);

        const weekly_minutes = recentSessions.reduce((total, session) => {
            const wordCount = session.transcript.split(/\s+/).length;
            const minutes = Math.max(1, Math.round(wordCount / 150));
            return total + minutes;
        }, 0);

        return res.json(shapeProgressSummaryResponse({
            total_practice_sessions,
            days_practiced,
            current_streak_days,
            recent_practice,
            weekly_minutes
        }));

    } catch (error) {
        console.error("Progress summary error:", error);
        return res.status(500).json({ error: "Failed to fetch progress summary" });
    }
});

/**
 * GET /api/progress?userKey=...
 * Fetch all practice and mock sessions for a user
 * Returns list with date, type, score, top strength, top weakness
 */
router.get("/progress", async (req, res) => {
    try {
        let debugInfo = {
            activityCountCombined: 0
        };
        // Resolve identity (using refactored helper)
        const { user_id, identity_key, mode, usedValue } = resolveIdentity(req);

        // Set identity headers
        res.setHeader('x-identity-used', usedValue || 'none');
        res.setHeader('x-identity-mode', mode);

        // If no userKey, return empty sessions (don't break dashboard)
        if (!usedValue) {
            return res.json(shapeProgressResponse({ sessions: [], total: 0 }));
        }

        const user_id_val = user_id; // For query logic
        const guest_key_val = identity_key; // For query logic

        // Fetch mock sessions
        let mockQuery = supabase
            .from('mock_sessions')
            .select('*')
            .eq('completed', true)
            .order('created_at', { ascending: false });

        if (user_id_val) {
            mockQuery = mockQuery.eq('user_id', user_id_val);
        } else {
            mockQuery = mockQuery.eq('guest_key', guest_key_val);
        }

        const { data: mockSessions, error: mockError } = await mockQuery;

        if (mockError) {
            console.error('[PROGRESS] Error fetching mock sessions:', mockError);
        }

        // Fetch practice sessions (group by session_id)
        let practiceQuery = supabase
            .from('practice_attempts')
            .select('session_id, created_at, score, feedback')
            .order('created_at', { ascending: false });

        if (user_id_val) {
            practiceQuery = practiceQuery.eq('user_id', user_id_val);
        } else {
            practiceQuery = practiceQuery.eq('guest_key', guest_key_val);
        }

        const { data: practiceAttempts, error: practiceError } = await practiceQuery;

        if (practiceError) {
            console.error('[PROGRESS] Error fetching practice attempts:', practiceError);
        }

        // Group practice attempts by session
        const practiceSessions = {};
        (practiceAttempts || []).forEach(attempt => {
            if (!practiceSessions[attempt.session_id]) {
                practiceSessions[attempt.session_id] = {
                    session_id: attempt.session_id,
                    created_at: attempt.created_at,
                    scores: [],
                    feedbacks: []
                };
            }
            if (attempt.score !== null) {
                practiceSessions[attempt.session_id].scores.push(attempt.score);
            }
            if (attempt.feedback) {
                practiceSessions[attempt.session_id].feedbacks.push(attempt.feedback);
            }
        });

        // Build progress list
        const sessions = [];

        // NEW: Separate array for activity events
        let activityEvents = [];

        // Add activity events if available (practice/mock starts)
        // Check if activity tracking is enabled
        if (process.env.ACTIVITY_TRACKING_ENABLED !== 'false') {
            try {
                debugInfo.userId = user_id_val;
                debugInfo.guestKeyFromHeader = req.header('x-guest-key') || null;

                let activityQuery = supabase
                    .from('activity_events')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (user_id_val && guest_key_val) {
                    // Dual Query: user_id OR identity_key
                    activityQuery = activityQuery.or(`user_id.eq.${user_id_val},identity_key.eq.${guest_key_val}`);
                } else if (user_id_val) {
                    activityQuery = activityQuery.eq('user_id', user_id_val);
                } else if (guest_key_val) {
                    activityQuery = activityQuery.eq('identity_key', guest_key_val);
                } else {
                    activityQuery = null;
                }

                if (activityQuery) {
                    const { data: activityEventsData, error: activityError } = await activityQuery;

                    if (!activityError && activityEventsData) {
                        // NEW: Populate activityEvents array in requested format
                        activityEvents = activityEventsData.map(event => ({
                            activityType: event.activity_type,
                            startedAt: event.created_at,
                            context: event.context || {}
                        }));

                        // Also add to sessions array for backward compatibility
                        activityEventsData.forEach(event => {
                            // Debug counts
                            if (event.user_id === userId) debugInfo.activityCountUserId++;
                            if (event.identity_key === guestKey) debugInfo.activityCountGuestKey++;

                            const activityLabel = event.activity_type === 'practice'
                                ? 'Practice Started'
                                : 'Mock Interview Started';

                            sessions.push({
                                date: event.created_at,
                                type: activityLabel,
                                score: null,
                                topStrength: 'Activity started',
                                topWeakness: 'N/A',
                                sessionId: event.context?.sessionId || null,
                                activityEvent: true
                            });
                        });
                        debugInfo.activityCountCombined = activityEventsData.length;
                    }
                }
            } catch (activityErr) {
                console.warn('[PROGRESS] Activity events fetch failed (non-fatal):', activityErr.message);
            }
        }

        // Add mock sessions
        (mockSessions || []).forEach(session => {
            const summary = session.summary || {};
            sessions.push({
                date: session.created_at,
                type: `Mock Interview (${session.interview_type})`,
                score: session.overall_score || 0,
                topStrength: summary.strengths?.[0] || 'N/A',
                topWeakness: summary.weaknesses?.[0] || 'N/A',
                sessionId: session.session_id
            });
        });

        // Add practice sessions
        Object.values(practiceSessions).forEach(session => {
            const avgScore = session.scores.length > 0
                ? Math.round(session.scores.reduce((a, b) => a + b, 0) / session.scores.length)
                : 0;

            // Extract top strength/weakness from feedback
            const allFeedback = session.feedbacks.flat();
            const topStrength = allFeedback.find(f =>
                typeof f === 'object' && (f.clarity >= 20 || f.structure >= 20)
            );
            const topWeakness = allFeedback.find(f =>
                typeof f === 'object' && (f.clarity < 15 || f.structure < 15)
            );

            sessions.push({
                date: session.created_at,
                type: 'Practice Session',
                score: avgScore,
                topStrength: topStrength ? 'Good structure and clarity' : 'Consistent practice',
                topWeakness: topWeakness ? 'Work on structure' : 'Keep improving',
                sessionId: session.session_id
            });
        });

        // Sort by date (most recent first)
        sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

        console.log(`[PROGRESS] Fetched ${sessions.length} sessions for ${usedValue}`);

        // DEBUG: Add debug info
        const commit = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT || "local";
        const debug = {
            commit,
            identityKey: usedValue, // Legacy
            identityKeyResolved: usedValue,
            guestKeyFromHeader: req.header('x-guest-key') || null,
            userId: user_id_val,
            activityCountCombined: debugInfo.activityCountCombined ?? 0,
            ...debugInfo
        };

        // Add response header
        res.setHeader('x-jsp-backend-commit', commit);

        const responseData = shapeProgressResponse({
            sessions,
            total: sessions.length,
            activityEvents
        });

        // Mix in debug info
        return res.json({
            ...responseData,
            debug
        });

    } catch (error) {
        console.error("Error fetching progress:", error);
        return res.status(500).json({ error: "Failed to fetch progress" });
    }
});

export default router;
