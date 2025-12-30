// jobspeak-backend/routes/dashboard.js
import express from "express";
import { getSessions, getMockInterviewCount, getLastMockInterview } from "../services/db.js";

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

        return res.json({
            total_practice_sessions,
            total_mock_interviews,
            last_mock_interview,
        });
    } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        return res.status(500).json({ error: "Failed to fetch dashboard summary" });
    }
});

export default router;
