// jobspeak-backend/routes/practice.js
// Practice session endpoints including demo questions

import express from "express";
import { generatePracticeDemoQuestions } from "../services/mockInterviewQuestions.js";

const router = express.Router();

/**
 * GET /api/practice/demo-questions
 * Generate personalized practice demo questions
 * 
 * Query params:
 * - jobTitle (optional)
 * - industry (optional)
 * - seniority (optional)
 * - focusAreas (optional, comma-separated)
 * 
 * Returns 3-5 starter questions tailored to the role
 */
router.get("/practice/demo-questions", (req, res) => {
    try {
        const { jobTitle, industry, seniority, focusAreas } = req.query;

        // Parse focus areas if provided
        let parsedFocusAreas = [];
        if (focusAreas) {
            parsedFocusAreas = focusAreas.split(',').map(f => f.trim()).filter(Boolean);
        }

        // Generate questions
        const questions = generatePracticeDemoQuestions({
            jobTitle,
            industry,
            seniority,
            focusAreas: parsedFocusAreas
        });

        return res.json({
            questions,
            count: questions.length
        });

    } catch (error) {
        console.error("Error generating practice demo questions:", error);
        return res.status(500).json({ error: "Failed to generate demo questions" });
    }
});

export default router;
