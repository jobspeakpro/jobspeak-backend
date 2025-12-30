// jobspeak-backend/routes/progress.js
// User progress tracking and statistics

import express from "express";
import { getSessions } from "../services/db.js";
import { getTodayUTC } from "../services/dateUtils.js";

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

export default router;
