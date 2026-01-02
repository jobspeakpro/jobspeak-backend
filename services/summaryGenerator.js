// jobspeak-backend/services/summaryGenerator.js
// Generate session summaries from answer attempts

import { generateOverallInsights } from './answerEvaluator.js';

/**
 * Generate summary for a practice or mock session
 * @param {Array} attempts - Array of attempt objects with scores and feedback
 * @param {string} sessionType - 'practice' or 'mock'
 * @returns {Object} Summary with score, strengths, weaknesses, bullets
 */
export function generateSessionSummary(attempts, sessionType = 'practice') {
    if (!attempts || attempts.length === 0) {
        return {
            overall_score: 0,
            strengths: ['Complete the session to get insights'],
            weaknesses: ['No attempts recorded'],
            bullets: [],
            completed: false
        };
    }

    // Calculate overall score (average of all attempt scores)
    const validScores = attempts
        .filter(a => a.score !== null && a.score !== undefined)
        .map(a => a.score);

    const overall_score = validScores.length > 0
        ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length)
        : 0;

    // Generate insights from attempts
    const insights = generateOverallInsights(attempts);

    // Generate per-question bullets
    const bullets = attempts.map((attempt, index) => {
        const questionNum = index + 1;
        const score = attempt.score || 0;
        const topFeedback = attempt.bullets && attempt.bullets.length > 0
            ? attempt.bullets[0]
            : 'No feedback available';

        return {
            question: `Q${questionNum}: ${attempt.question_text?.substring(0, 60)}...`,
            score,
            feedback: topFeedback
        };
    });

    return {
        overall_score,
        strengths: insights.strengths,
        weaknesses: insights.weaknesses,
        bullets,
        completed: true,
        avg_scores: insights.avgScores
    };
}

/**
 * Get hiring recommendation based on score
 * ALWAYS returns one of three normalized values
 * @param {number} score - Overall score (0-100)
 * @returns {string} Recommendation level (normalized)
 */
export function getHiringRecommendation(score) {
    if (score >= 80) return 'recommended';
    if (score >= 60) return 'recommend_with_reservations';
    return 'not_recommended_yet';
}

/**
 * Get recommendation message
 * @param {string} recommendation - Recommendation level
 * @returns {string} Human-readable message
 */
export function getRecommendationMessage(recommendation) {
    const messages = {
        recommended: 'Strong performance! You demonstrated excellent interview skills.',
        recommend_with_reservations: 'Good effort! With some refinement, you\'ll be interview-ready.',
        not_recommended_yet: 'Keep practicing! Focus on the areas for improvement below.'
    };
    return messages[recommendation] || messages.not_recommended_yet;
}
