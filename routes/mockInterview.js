// jobspeak-backend/routes/mockInterview.js
import express from "express";
import {
    getMockInterviewAttempt,
    markMockInterviewUsed,
    saveMockInterview,
    getSubscription
} from "../services/db.js";
import { getProfile } from "../services/supabase.js";
import { generateMockInterviewQuestions } from "../services/personalizedQuestionSelector.js";

const router = express.Router();

/**
 * MOCK INTERVIEW STRUCTURE
 * 
 * SHORT FORMAT:
 * - 5 questions
 * - ~10 minutes duration
 * - Per-question scoring: clarity, structure, relevance, communication
 * 
 * LONG FORMAT:
 * - 10-12 questions
 * - ~25 minutes duration
 * - Per-question scoring: clarity, structure, relevance, communication
 * 
 * OVERALL SCORING:
 * - Aggregated from per-question scores
 * - Range: 0-100
 * 
 * HIRING RECOMMENDATION (not badges):
 * - strong_recommend: score >= 80
 * - recommend_with_reservations: score >= 60
 * - not_recommended_yet: score < 60
 * 
 * GATING:
 * - Free users: ONE mock interview EVER (not per day)
 * - Pro users: Unlimited
 */


// GET /api/mock-interview/status?userKey=...
router.get("/mock-interview/status", async (req, res) => {
    try {
        const { userKey } = req.query;

        if (!userKey) {
            return res.status(400).json({ error: "userKey required" });
        }

        // Check if user is Pro
        const subscription = getSubscription(userKey);
        const isPro = subscription?.isPro || false;

        // Check attempt status
        const attempt = getMockInterviewAttempt(userKey);
        const used = attempt.used === 1;

        // Determine if allowed
        const allowed = isPro || !used;

        return res.json({
            used,
            is_pro: isPro,
            allowed,
        });
    } catch (error) {
        console.error("Error checking mock interview status:", error);
        return res.status(500).json({ error: "Failed to check status" });
    }
});

// POST /api/mock-interview/start
router.post("/mock-interview/start", async (req, res) => {
    try {
        const { userKey, interviewType } = req.body;

        if (!userKey) {
            return res.status(400).json({ error: "userKey required" });
        }

        if (!interviewType || !['short', 'long'].includes(interviewType)) {
            return res.status(400).json({ error: "interviewType must be 'short' or 'long'" });
        }

        // Check if user is Pro
        const subscription = getSubscription(userKey);
        const isPro = subscription?.isPro || false;

        if (isPro) {
            // Pro users always allowed
            return res.json({ allowed: true, reason: "pro_unlimited" });
        }

        // Check if free attempt already used
        const attempt = getMockInterviewAttempt(userKey);

        if (attempt.used === 1) {
            // Free attempt already used - require upgrade
            return res.status(403).json({
                upgrade: true,
                reason: "mock_interview_limit"
            });
        }

        // Mark attempt as used
        markMockInterviewUsed(userKey);

        return res.json({
            allowed: true,
            reason: "free_attempt",
            message: "Mock interview started. This is your one free attempt."
        });
    } catch (error) {
        console.error("Error starting mock interview:", error);
        return res.status(500).json({ error: "Failed to start mock interview" });
    }
});

// GET /api/mock-interview/questions?userKey=...&type=short|long
router.get("/mock-interview/questions", async (req, res) => {
    try {
        const { userKey, type } = req.query;

        if (!userKey) {
            return res.status(400).json({ error: "userKey required" });
        }

        if (!type || !['short', 'long'].includes(type)) {
            return res.status(400).json({ error: "type must be 'short' or 'long'" });
        }

        // Fetch user profile for personalization
        let profile = {};
        try {
            const userProfile = await getProfile(userKey);
            if (userProfile) {
                profile = {
                    job_title: userProfile.job_title,
                    industry: userProfile.industry,
                    seniority: userProfile.seniority,
                    focus_areas: userProfile.focus_areas || []
                };
            }
        } catch (profileError) {
            console.warn("Failed to fetch profile, using defaults:", profileError.message);
            // Continue with empty profile - graceful fallback
        }

        // Generate personalized questions
        const result = generateMockInterviewQuestions({
            userKey,
            type,
            jobTitle: profile.job_title,
            industry: profile.industry,
            seniority: profile.seniority,
            focusAreas: profile.focus_areas,
            askedQuestionIds: [] // TODO: Track asked questions per user
        });

        // Format response to match frontend contract
        const formattedQuestions = result.questions.map(q => ({
            id: q.id,
            category: q.category.toUpperCase(), // Uppercase for frontend
            difficulty: q.difficulty.toUpperCase(), // Uppercase for frontend
            text: q.prompt, // Primary field for frontend
            prompt: q.prompt, // Backward compatibility
            hint: q.hint
        }));

        return res.json({
            interviewer: result.interviewer,
            questions: formattedQuestions
        });

    } catch (error) {
        console.error("Error generating mock interview questions:", error);
        return res.status(500).json({ error: "Failed to generate questions" });
    }
});

// POST /api/mock-interview/complete
router.post("/mock-interview/complete", async (req, res) => {
    try {
        const { userKey, interviewType, overallScore } = req.body;

        if (!userKey) {
            return res.status(400).json({ error: "userKey required" });
        }

        if (!interviewType || !['short', 'long'].includes(interviewType)) {
            return res.status(400).json({ error: "interviewType must be 'short' or 'long'" });
        }

        if (overallScore === undefined || overallScore === null) {
            return res.status(400).json({ error: "overallScore required" });
        }

        const score = parseInt(overallScore, 10);
        if (isNaN(score) || score < 0 || score > 100) {
            return res.status(400).json({ error: "overallScore must be an integer between 0 and 100" });
        }

        // Save mock interview
        const interview = saveMockInterview(userKey, interviewType, score);

        return res.json({
            id: interview.id,
            interview_type: interview.interview_type,
            overall_score: interview.overall_score,
            hiring_recommendation: interview.hiring_recommendation,
            created_at: interview.created_at,
        });
    } catch (error) {
        console.error("Error completing mock interview:", error);
        return res.status(500).json({ error: "Failed to save mock interview" });
    }
});

export default router;
