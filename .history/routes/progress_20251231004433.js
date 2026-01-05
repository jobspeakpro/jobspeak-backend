// jobspeak-backend/routes/progress.js
// User progress tracking and statistics

import express from "express";
import { getSessions } from "../services/db.js";
import { getTodayUTC } from "../services/dateUtils.js";
import { supabase } from "../services/supabase.js";

const router = express.Router();

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
        const { userKey } = req.query;

        if (!userKey) {
            return res.status(400).json({ error: "userKey required" });
        }

        // Get all sessions for user (we'll process them for stats)
        const sessions = getSessions(userKey, 1000); // Get all sessions

        if (!sessions || sessions.length === 0) {
            // Return zeros if no sessions
            return res.json({
                total_practice_sessions: 0,
                days_practiced: 0,
                current_streak_days: 0,
                recent_practice: [],
                weekly_minutes: 0
            });
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

        return res.json({
            total_practice_sessions,
            days_practiced,
            current_streak_days,
            recent_practice,
            weekly_minutes
        });

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
        const { userKey } = req.query;

        if (!userKey) {
            return res.status(400).json({ error: "userKey required" });
        }

        // Determine if authenticated user or guest
        const isGuest = userKey.startsWith('guest-');
        const user_id = isGuest ? null : userKey;
        const guest_key = isGuest ? userKey : null;

        // Fetch mock sessions
        let mockQuery = supabase
            .from('mock_sessions')
            .select('*')
            .eq('completed', true)
            .order('created_at', { ascending: false });

        if (user_id) {
            mockQuery = mockQuery.eq('user_id', user_id);
        } else {
            mockQuery = mockQuery.eq('guest_key', guest_key);
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

        if (user_id) {
            practiceQuery = practiceQuery.eq('user_id', user_id);
        } else {
            practiceQuery = practiceQuery.eq('guest_key', guest_key);
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

        console.log(`[PROGRESS] Fetched ${sessions.length} sessions for ${userKey}`);

        return res.json({
            sessions,
            total: sessions.length
        });

    } catch (error) {
        console.error("Error fetching progress:", error);
        return res.status(500).json({ error: "Failed to fetch progress" });
    }
});

export default router;
