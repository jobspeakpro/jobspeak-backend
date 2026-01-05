// jobspeak-backend/routes/reflection.js
// Daily reflection rotation (30 reflections, deterministic by date)

import express from "express";
import { getTodayUTC } from "../services/dateUtils.js";

const router = express.Router();

// 30 reflections for daily rotation
const REFLECTIONS = [
    "Every answer is a step toward mastery. What did you learn today?",
    "Confidence grows with practice. How did you challenge yourself?",
    "Your voice matters. How did you make it heard today?",
    "Progress isn't perfect—it's persistent. What progress did you make?",
    "Great communicators are made, not born. What skill did you strengthen?",
    "Clarity comes from repetition. What became clearer today?",
    "Every interview is a conversation. How did you connect?",
    "Your story is unique. How did you tell it today?",
    "Feedback is fuel for growth. What will you improve tomorrow?",
    "Preparation builds confidence. How did you prepare today?",
    "Authenticity wins interviews. How did you stay true to yourself?",
    "Metrics tell your impact. What numbers did you share?",
    "Structure guides clarity. How did you use STAR today?",
    "Listening is as important as speaking. What did you learn by listening?",
    "Every setback is setup for a comeback. How did you bounce back?",
    "Your experience is valuable. How did you showcase it?",
    "Nerves are normal. How did you manage them today?",
    "Practice makes permanent. What habit did you reinforce?",
    "Questions reveal curiosity. What did you ask today?",
    "Confidence is quiet. How did you show quiet confidence?",
    "Your potential is limitless. What potential did you unlock?",
    "Growth happens outside comfort zones. How did you stretch today?",
    "Every answer is an opportunity. How did you seize it?",
    "Preparation meets opportunity. How did you prepare?",
    "Your journey is yours alone. What made today unique?",
    "Reflection deepens learning. What insight did you gain?",
    "Consistency compounds. How did you show up today?",
    "Your voice has power. How did you use it?",
    "Improvement is incremental. What small win did you achieve?",
    "Tomorrow starts with today. How will you build on this?"
];

/**
 * GET /api/daily-reflection
 * Returns deterministic daily reflection based on current date
 * 
 * Response:
 * {
 *   reflection: string,
 *   date: "YYYY-MM-DD"
 * }
 */
router.get("/daily-reflection", (req, res) => {
    try {
        const todayUTC = getTodayUTC(); // YYYY-MM-DD format

        // Convert date to number for deterministic rotation
        // Use days since epoch to ensure same reflection all day
        const epochDate = new Date(todayUTC);
        const daysSinceEpoch = Math.floor(epochDate.getTime() / (1000 * 60 * 60 * 24));

        // Rotate through 30 reflections
        const index = daysSinceEpoch % REFLECTIONS.length;
        const reflection = REFLECTIONS[index];

        return res.json({
            reflection,
            date: todayUTC
        });

    } catch (error) {
        console.error("Daily reflection error:", error);
        return res.status(500).json({ error: "Failed to fetch daily reflection" });
    }
});

export default router;
