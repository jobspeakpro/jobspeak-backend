// jobspeak-backend/services/answerEvaluator.js
// Simple rubric-based answer evaluation for MVP

/**
 * Evaluate an interview answer using a simple rubric
 * @param {string} questionText - The question that was asked
 * @param {string} answerText - The user's answer
 * @returns {Object} { score, feedback, breakdown }
 */
export function evaluateAnswer(questionText, answerText) {
    if (!answerText || answerText.trim().length === 0) {
        return {
            score: 0,
            feedback: {
                clarity: 0,
                structure: 0,
                metrics: 0,
                relevance: 0
            },
            bullets: ['No answer provided']
        };
    }

    const answer = answerText.toLowerCase();
    const wordCount = answerText.split(/\s+/).length;

    // Rubric scoring (0-25 points each, total 100)
    const scores = {
        clarity: evaluateClarity(answerText, wordCount),
        structure: evaluateStructure(answer, wordCount),
        metrics: evaluateMetrics(answer),
        relevance: evaluateRelevance(questionText, answerText)
    };

    const totalScore = Math.round(
        scores.clarity + scores.structure + scores.metrics + scores.relevance
    );

    const bullets = generateFeedbackBullets(scores, answerText, wordCount);

    return {
        score: totalScore,
        feedback: scores,
        bullets
    };
}

/**
 * Evaluate clarity (0-25 points)
 * - Length appropriate (not too short, not rambling)
 * - Complete sentences
 * - Coherent flow
 */
function evaluateClarity(answerText, wordCount) {
    let score = 0;

    // Length check (15-300 words is good)
    if (wordCount >= 15 && wordCount <= 300) {
        score += 15;
    } else if (wordCount >= 10 && wordCount <= 400) {
        score += 10;
    } else if (wordCount >= 5) {
        score += 5;
    }

    // Sentence structure (has periods, not just fragments)
    const sentences = answerText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 2) {
        score += 5;
    } else if (sentences.length >= 1) {
        score += 3;
    }

    // Avoid excessive filler words
    const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually'];
    const fillerCount = fillerWords.reduce((count, word) => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        return count + (answerText.match(regex) || []).length;
    }, 0);

    if (fillerCount === 0) {
        score += 5;
    } else if (fillerCount <= 2) {
        score += 3;
    }

    return Math.min(score, 25);
}

/**
 * Evaluate structure (0-25 points)
 * - STAR format indicators (Situation, Task, Action, Result)
 * - Logical flow
 * - Clear beginning and end
 */
function evaluateStructure(answer, wordCount) {
    let score = 0;

    // STAR indicators
    const starIndicators = {
        situation: ['situation', 'when', 'where', 'context', 'background', 'at the time'],
        task: ['task', 'challenge', 'problem', 'goal', 'needed to', 'had to'],
        action: ['i did', 'i took', 'i implemented', 'i created', 'i worked', 'my approach'],
        result: ['result', 'outcome', 'achieved', 'improved', 'increased', 'decreased', 'successfully']
    };

    let starComponents = 0;
    for (const [component, keywords] of Object.entries(starIndicators)) {
        if (keywords.some(keyword => answer.includes(keyword))) {
            starComponents++;
            score += 5;
        }
    }

    // Bonus for having all STAR components
    if (starComponents >= 3) {
        score += 5;
    }

    return Math.min(score, 25);
}

/**
 * Evaluate metrics (0-25 points)
 * - Includes numbers/percentages
 * - Quantifiable results
 * - Specific examples
 */
function evaluateMetrics(answer) {
    let score = 0;

    // Check for numbers
    const hasNumbers = /\d+/.test(answer);
    if (hasNumbers) {
        score += 10;
    }

    // Check for percentages
    const hasPercentage = /%|percent/.test(answer);
    if (hasPercentage) {
        score += 5;
    }

    // Check for quantifiable terms
    const quantifiableTerms = [
        'increased', 'decreased', 'reduced', 'improved', 'grew',
        'saved', 'generated', 'delivered', 'completed', 'achieved'
    ];
    const hasQuantifiable = quantifiableTerms.some(term => answer.includes(term));
    if (hasQuantifiable) {
        score += 5;
    }

    // Check for specific examples
    const specificityIndicators = ['for example', 'specifically', 'such as', 'including'];
    const hasSpecifics = specificityIndicators.some(indicator => answer.includes(indicator));
    if (hasSpecifics) {
        score += 5;
    }

    return Math.min(score, 25);
}

/**
 * Evaluate relevance (0-25 points)
 * - Addresses the question
 * - Stays on topic
 * - Appropriate depth
 */
function evaluateRelevance(questionText, answerText) {
    let score = 15; // Start with baseline

    const question = questionText.toLowerCase();
    const answer = answerText.toLowerCase();

    // Extract key terms from question
    const questionWords = question
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 4); // Only meaningful words

    // Check if answer addresses key question terms
    const addressedTerms = questionWords.filter(word => answer.includes(word));
    const relevanceRatio = addressedTerms.length / Math.max(questionWords.length, 1);

    if (relevanceRatio >= 0.3) {
        score += 10;
    } else if (relevanceRatio >= 0.2) {
        score += 5;
    }

    return Math.min(score, 25);
}

/**
 * Generate actionable feedback bullets
 */
function generateFeedbackBullets(scores, answerText, wordCount) {
    const bullets = [];

    // Clarity feedback
    if (scores.clarity < 15) {
        if (wordCount < 15) {
            bullets.push('Provide more detail in your answer (aim for 50-200 words)');
        } else if (wordCount > 300) {
            bullets.push('Keep your answer more concise and focused');
        }
    } else if (scores.clarity >= 20) {
        bullets.push('Clear and well-articulated response');
    }

    // Structure feedback
    if (scores.structure < 15) {
        bullets.push('Use the STAR format: Situation, Task, Action, Result');
    } else if (scores.structure >= 20) {
        bullets.push('Well-structured answer with clear flow');
    }

    // Metrics feedback
    if (scores.metrics < 10) {
        bullets.push('Include specific numbers, percentages, or measurable outcomes');
    } else if (scores.metrics >= 15) {
        bullets.push('Good use of quantifiable results and metrics');
    }

    // Relevance feedback
    if (scores.relevance < 15) {
        bullets.push('Make sure to directly address the question asked');
    } else if (scores.relevance >= 20) {
        bullets.push('Answer directly addresses the question');
    }

    // If no specific feedback, provide encouragement
    if (bullets.length === 0) {
        bullets.push('Solid answer overall');
    }

    return bullets;
}

/**
 * Generate overall strengths and weaknesses from multiple attempts
 */
export function generateOverallInsights(attempts) {
    if (!attempts || attempts.length === 0) {
        return {
            strengths: ['Complete more questions to get insights'],
            weaknesses: ['No attempts yet']
        };
    }

    // Aggregate scores
    const avgScores = {
        clarity: 0,
        structure: 0,
        metrics: 0,
        relevance: 0
    };

    let validAttempts = 0;
    attempts.forEach(attempt => {
        if (attempt.feedback) {
            avgScores.clarity += attempt.feedback.clarity || 0;
            avgScores.structure += attempt.feedback.structure || 0;
            avgScores.metrics += attempt.feedback.metrics || 0;
            avgScores.relevance += attempt.feedback.relevance || 0;
            validAttempts++;
        }
    });

    if (validAttempts > 0) {
        avgScores.clarity /= validAttempts;
        avgScores.structure /= validAttempts;
        avgScores.metrics /= validAttempts;
        avgScores.relevance /= validAttempts;
    }

    // Identify strengths (scores >= 18)
    const strengths = [];
    if (avgScores.clarity >= 18) strengths.push('Clear and articulate communication');
    if (avgScores.structure >= 18) strengths.push('Well-structured responses using STAR format');
    if (avgScores.metrics >= 18) strengths.push('Strong use of quantifiable results and metrics');
    if (avgScores.relevance >= 18) strengths.push('Answers directly address questions');

    // Identify weaknesses (scores < 15)
    const weaknesses = [];
    if (avgScores.clarity < 15) weaknesses.push('Work on clarity and conciseness');
    if (avgScores.structure < 15) weaknesses.push('Practice using STAR format (Situation, Task, Action, Result)');
    if (avgScores.metrics < 15) weaknesses.push('Include more specific numbers and measurable outcomes');
    if (avgScores.relevance < 15) weaknesses.push('Ensure answers directly address the question');

    // Default messages if no clear strengths/weaknesses
    if (strengths.length === 0) {
        strengths.push('Keep practicing to identify your strengths');
    }
    if (weaknesses.length === 0) {
        weaknesses.push('Continue refining your answers for even better results');
    }

    return {
        strengths: strengths.slice(0, 3),
        weaknesses: weaknesses.slice(0, 3),
        avgScores
    };
}
