// jobspeak-backend/services/personalizedQuestionSelector.js
// Very personalized question selection with role-family mapping and anti-repeat

import crypto from 'crypto';
import { getTodayUTC } from './dateUtils.js';
import { mapToRoleFamily, getSeniorityLevel, ROLE_FAMILIES } from './roleFamilyMapper.js';
import { QUESTION_BANK } from './expandedQuestionBank.js';

/**
 * Default interviewer persona
 */
const DEFAULT_INTERVIEWER = {
    name: "Sarah Jenkins",
    title: "Lead Technical Recruiter",
    avatarUrl: null,
    voiceId: "en-US-Studio-O",
    languageCode: "en-US"
};

/**
 * Generate deterministic seed for rotation
 * @param {string} userKey - User identifier
 * @param {string} [sessionId] - Optional session identifier for per-session rotation
 * @returns {number} Seed for random number generator
 */
function getRotationSeed(userKey, sessionId = null) {
    // If sessionId provided, use it for per-session rotation
    // Otherwise fall back to date-based rotation
    const rotationKey = sessionId || getTodayUTC();
    const seedString = `${userKey}-${rotationKey}`;
    const hash = crypto.createHash('md5').update(seedString).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
}

/**
 * Seeded random number generator
 */
function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

/**
 * Seeded shuffle array
 */
function seededShuffle(array, seed) {
    const shuffled = [...array];
    let currentSeed = seed;

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(currentSeed++) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

/**
 * Check if question matches criteria
 */
function matchesQuestion(question, roleFamily, seniorityLevel, focusAreas = []) {
    // Role family match
    if (!question.role_families.includes('all') && !question.role_families.includes(roleFamily)) {
        return false;
    }

    // Seniority level match
    if (!question.seniority_levels.includes('all') && !question.seniority_levels.includes(seniorityLevel)) {
        return false;
    }

    return true;
}

/**
 * Score question relevance (higher = more relevant)
 */
function scoreQuestionRelevance(question, roleFamily, seniorityLevel, focusAreas = []) {
    let score = 0;

    // Role family exact match
    if (question.role_families.includes(roleFamily)) {
        score += 10;
    } else if (question.role_families.includes('all')) {
        score += 1;
    }

    // Seniority exact match
    if (question.seniority_levels.includes(seniorityLevel)) {
        score += 5;
    } else if (question.seniority_levels.includes('all')) {
        score += 1;
    }

    // Focus area match
    if (focusAreas.length > 0 && focusAreas.includes(question.category)) {
        score += 8;
    }

    return score;
}

/**
 * Interpolate placeholders in question prompt
 */
function interpolatePrompt(prompt, jobTitle, industry) {
    return prompt
        .replace(/{job_title}/g, jobTitle || 'professional')
        .replace(/{industry}/g, industry || 'your field');
}

/**
 * Select personalized questions with anti-repeat
 */
export function selectPersonalizedQuestions(params) {
    const {
        userKey,
        count,
        jobTitle = 'professional',
        industry = 'your field',
        seniority = 'mid-level',
        focusAreas = [],
        askedQuestionIds = [], // Last 30 asked questions to avoid
        includeBreakdown = false, // For mock interviews
        sessionId = null // Optional session ID for per-session rotation
    } = params;

    // Map to role family and seniority level
    const roleFamily = mapToRoleFamily(jobTitle, seniority);
    const seniorityLevel = getSeniorityLevel(seniority);

    console.log(`[QUESTION SELECTOR] Role: ${jobTitle} → Family: ${roleFamily}, Seniority: ${seniorityLevel}`);

    // Filter candidates
    let candidates = QUESTION_BANK.filter(q => matchesQuestion(q, roleFamily, seniorityLevel, focusAreas));

    // Remove recently asked questions
    const askedSet = new Set(askedQuestionIds);
    const freshCandidates = candidates.filter(q => !askedSet.has(q.id));

    // Use fresh candidates if available, otherwise use all candidates
    if (freshCandidates.length >= count) {
        candidates = freshCandidates;
    } else {
        console.log(`[QUESTION SELECTOR] Only ${freshCandidates.length} fresh questions, using all ${candidates.length} candidates`);
    }

    // Score and sort by relevance
    const scoredCandidates = candidates.map(q => ({
        question: q,
        relevance: scoreQuestionRelevance(q, roleFamily, seniorityLevel, focusAreas)
    }));

    scoredCandidates.sort((a, b) => b.relevance - a.relevance);

    // Apply deterministic shuffle to top candidates (per-session if sessionId provided)
    const seed = getRotationSeed(userKey, sessionId);
    const topCandidates = scoredCandidates.slice(0, Math.min(count * 3, scoredCandidates.length));
    const shuffled = seededShuffle(topCandidates, seed);

    // Select questions with breakdown if needed
    let selected = [];

    if (includeBreakdown) {
        // For mock interviews: ensure variety
        const behavioral = shuffled.filter(s => s.question.category === 'behavioral').slice(0, 2);
        const roleSpecific = shuffled.filter(s => s.question.category === 'role_specific').slice(0, 2);
        const focusAreaQuestions = focusAreas.length > 0
            ? shuffled.filter(s => focusAreas.includes(s.question.category)).slice(0, 1)
            : [];
        const others = shuffled.filter(s =>
            !behavioral.includes(s) &&
            !roleSpecific.includes(s) &&
            !focusAreaQuestions.includes(s)
        );

        selected = [...behavioral, ...roleSpecific, ...focusAreaQuestions, ...others].slice(0, count);
    } else {
        // For practice demo: just take top scored
        selected = shuffled.slice(0, count);
    }

    // Interpolate and format questions
    const questions = selected.map(s => ({
        id: s.question.id,
        prompt: interpolatePrompt(s.question.prompt, jobTitle, industry),
        hint: s.question.hint,
        category: s.question.category,
        difficulty: s.question.difficulty,
        competencies: s.question.competencies
    }));

    return {
        interviewer: DEFAULT_INTERVIEWER,
        questions,
        metadata: {
            roleFamily,
            seniorityLevel,
            totalCandidates: candidates.length,
            freshCandidates: freshCandidates.length
        }
    };
}

/**
 * Generate practice demo questions (3-5 questions)
 */
export function generatePracticeDemoQuestions(params) {
    return selectPersonalizedQuestions({
        ...params,
        count: 4,
        includeBreakdown: false
    });
}

/**
 * Generate mock interview questions (5 or 10 questions)
 */
export function generateMockInterviewQuestions(params) {
    const { type } = params;
    const count = type === 'short' ? 5 : 10;

    return selectPersonalizedQuestions({
        ...params,
        count,
        includeBreakdown: true
    });
}
