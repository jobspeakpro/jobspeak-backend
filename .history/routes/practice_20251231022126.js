// jobspeak-backend/routes/practice.js
// Practice session endpoints including demo questions

import express from "express";
import { generatePracticeDemoQuestions } from "../services/personalizedQuestionSelector.js";
import { supabase } from "../services/supabase.js";
import { evaluateAnswer } from "../services/answerEvaluator.js";
import { generateSessionSummary } from "../services/summaryGenerator.js";
import { generateVocabularySuggestions, generateClearerRewrite } from "../services/vocabularyEnhancer.js";

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
        const { jobTitle, industry, seniority, focusAreas, userKey } = req.query;

        // Parse focus areas if provided
        let parsedFocusAreas = [];
        if (focusAreas) {
            parsedFocusAreas = focusAreas.split(',').map(f => f.trim()).filter(Boolean);
        }

        // Generate personalized questions
        const result = generatePracticeDemoQuestions({
            userKey: userKey || `demo-${Date.now()}`,
            jobTitle,
            industry,
            seniority,
            focusAreas: parsedFocusAreas,
            askedQuestionIds: [] // No history for demo
        });

        return res.json({
            interviewer: result.interviewer,
            questions: result.questions,
            count: result.questions.length
        });

    } catch (error) {
        console.error("Error generating practice demo questions:", error);
        return res.status(500).json({ error: "Failed to generate demo questions" });
    }
});

// POST /api/practice/answer
router.post("/practice/answer", async (req, res) => {
    try {
        const { userKey, sessionId, questionId, questionText, answerText, audioUrl } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: "sessionId required" });
        }

        if (!questionId || !questionText) {
            return res.status(400).json({ error: "questionId and questionText required" });
        }

        // Determine user_id or guest_key
        let user_id = null;
        let guest_key = null;

        if (userKey && !userKey.startsWith('guest-')) {
            user_id = userKey;
        } else {
            guest_key = userKey || `guest-${Date.now()}`;
        }

        // Evaluate answer
        const evaluation = evaluateAnswer(questionText, answerText || '');

        // Save attempt
        const { data: attempt, error: attemptError } = await supabase
            .from('practice_attempts')
            .insert({
                user_id,
                guest_key,
                session_id: sessionId,
                question_id: questionId,
                question_text: questionText,
                answer_text: answerText,
                audio_url: audioUrl,
                score: evaluation.score,
                feedback: evaluation.feedback
            })
            .select()
            .single();

        if (attemptError) {
            console.error('[PRACTICE ANSWER] Error saving attempt:', attemptError);
            return res.status(500).json({ error: 'Failed to save answer' });
        }

        // Get session progress
        const { data: attempts } = await supabase
            .from('practice_attempts')
            .select('*')
            .eq('session_id', sessionId);

        const progress = {
            answered: attempts?.length || 1,
            score: evaluation.score,
            feedback: evaluation.bullets
        };

        console.log(`[PRACTICE ANSWER] Saved answer for session ${sessionId}, score: ${evaluation.score}`);

        // Map rubric feedback to UI-required fields
        const whatWorked = [];
        const improveNext = [];

        // Extract positive feedback (what worked)
        evaluation.bullets.forEach(bullet => {
            if (bullet.includes('Clear') || bullet.includes('Good') || bullet.includes('Well') ||
                bullet.includes('Strong') || bullet.includes('Solid')) {
                whatWorked.push(bullet);
            } else {
                improveNext.push(bullet);
            }
        });

        // Generate interpretation based on score
        let interpretation = '';
        if (evaluation.score >= 80) {
            interpretation = 'Excellent response! You demonstrated strong interview skills with clear communication and well-structured answers.';
        } else if (evaluation.score >= 60) {
            interpretation = 'Good effort! Your answer shows promise. Focus on the improvement areas below to strengthen your response.';
        } else if (evaluation.score >= 40) {
            interpretation = 'Your answer needs development. Review the feedback carefully and practice incorporating the suggested improvements.';
        } else {
            interpretation = 'This answer needs significant improvement. Focus on providing more detail, structure, and specific examples.';
        }

        return res.json({
            success: true,
            score: evaluation.score,
            whatWorked: whatWorked.length > 0 ? whatWorked : ['You provided an answer'],
            improveNext: improveNext.length > 0 ? improveNext : [],
            interpretation,
            vocabulary: [], // Placeholder for future vocabulary analysis
            clearerRewrite: '', // Placeholder for future AI rewrite feature
            feedback: evaluation.bullets, // Keep for backward compatibility
            progress
        });

    } catch (error) {
        console.error("Error saving practice answer:", error);
        return res.status(500).json({ error: "Failed to save answer" });
    }
});

// GET /api/practice/summary?sessionId=...
router.get("/practice/summary", async (req, res) => {
    try {
        const { sessionId } = req.query;

        if (!sessionId) {
            return res.status(400).json({ error: "sessionId required" });
        }

        // Fetch all attempts for this session
        const { data: attempts, error: attemptsError } = await supabase
            .from('practice_attempts')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (attemptsError) {
            console.error('[PRACTICE SUMMARY] Error fetching attempts:', attemptsError);
            return res.status(500).json({ error: 'Failed to fetch attempts' });
        }

        // Generate summary from real attempts
        const summary = generateSessionSummary(attempts || [], 'practice');

        console.log(`[PRACTICE SUMMARY] Generated summary for session ${sessionId}, score: ${summary.overall_score}`);

        return res.json({
            sessionId,
            overall_score: summary.overall_score,
            strengths: summary.strengths,
            weaknesses: summary.weaknesses,
            improvements: summary.weaknesses,
            biggest_risk: summary.weaknesses[0] || "No major risks identified",
            biggestRisk: summary.weaknesses[0] || "No major risks identified",
            bullets: summary.bullets,
            completed: summary.completed
        });

    } catch (error) {
        console.error("Error generating practice summary:", error);
        return res.status(500).json({ error: "Failed to generate summary" });
    }
});

export default router;

