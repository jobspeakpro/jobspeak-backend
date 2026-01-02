// jobspeak-backend/services/mockInterviewQuestions.js
// Personalized question generation for mock interviews

import crypto from 'crypto';
import { getTodayUTC } from './dateUtils.js';

/**
 * Comprehensive question bank for mock interviews
 * Organized by category, difficulty, and role relevance
 */
const QUESTION_BANK = [
    // ===== BEHAVIORAL QUESTIONS =====
    {
        id: "behav_challenge_001",
        category: "behavioral",
        difficulty: "normal",
        prompt: "Tell me about a significant challenge you faced as a {{job_title}} and how you overcame it.",
        hint: "Use STAR: Describe the Situation, your Task, the Action you took, and the Result.",
        roles: ["all"]
    },
    {
        id: "behav_mistake_001",
        category: "behavioral",
        difficulty: "normal",
        prompt: "Describe a time you made a mistake in your role. How did you handle it?",
        hint: "Focus on what you learned and how you improved from the experience.",
        roles: ["all"]
    },
    {
        id: "behav_conflict_001",
        category: "behavioral",
        difficulty: "normal",
        prompt: "Tell me about a time you had a disagreement with a colleague. How did you resolve it?",
        hint: "Emphasize communication, empathy, and finding common ground.",
        roles: ["all"]
    },
    {
        id: "behav_pressure_001",
        category: "behavioral",
        difficulty: "normal",
        prompt: "Describe a situation where you had to work under significant pressure. How did you manage?",
        hint: "Highlight your time management and prioritization skills.",
        roles: ["all"]
    },
    {
        id: "behav_team_001",
        category: "behavioral",
        difficulty: "easy",
        prompt: "Tell me about a successful team project you contributed to. What was your role?",
        hint: "Quantify your specific contributions and the team's outcome.",
        roles: ["all"]
    },

    // ===== SITUATIONAL QUESTIONS =====
    {
        id: "sit_deadline_001",
        category: "situational",
        difficulty: "normal",
        prompt: "How would you handle a situation where you're given an unrealistic deadline?",
        hint: "Discuss negotiation, prioritization, and stakeholder communication.",
        roles: ["all"]
    },
    {
        id: "sit_resources_001",
        category: "situational",
        difficulty: "hard",
        prompt: "What would you do if you had to deliver a project with limited resources?",
        hint: "Show creativity, resourcefulness, and strategic thinking.",
        roles: ["all"]
    },
    {
        id: "sit_feedback_001",
        category: "situational",
        difficulty: "easy",
        prompt: "How do you typically respond to constructive criticism?",
        hint: "Demonstrate openness to feedback and commitment to growth.",
        roles: ["all"]
    },

    // ===== ROLE-SPECIFIC: LEADERSHIP =====
    {
        id: "lead_motivate_001",
        category: "role-specific",
        difficulty: "hard",
        prompt: "How do you motivate a team when deadlines are tight and morale is low?",
        hint: "Share specific strategies you've used to inspire and support your team.",
        roles: ["manager", "lead", "senior", "director", "vp", "head", "principal"]
    },
    {
        id: "lead_strategy_001",
        category: "role-specific",
        difficulty: "hard",
        prompt: "Describe a strategic decision you made that significantly impacted your organization.",
        hint: "Include the context, your decision-making process, and measurable outcomes.",
        roles: ["manager", "director", "vp", "head", "senior"]
    },
    {
        id: "lead_delegate_001",
        category: "role-specific",
        difficulty: "normal",
        prompt: "How do you decide what tasks to delegate and what to handle yourself?",
        hint: "Explain your framework for delegation and team development.",
        roles: ["manager", "lead", "director", "senior"]
    },

    // ===== ROLE-SPECIFIC: TECHNICAL =====
    {
        id: "tech_process_001",
        category: "role-specific",
        difficulty: "normal",
        prompt: "Walk me through your process for starting a new project as a {{job_title}}.",
        hint: "Cover planning, execution, and how you ensure quality.",
        roles: ["engineer", "developer", "designer", "analyst", "architect"]
    },
    {
        id: "tech_debug_001",
        category: "role-specific",
        difficulty: "normal",
        prompt: "Describe a particularly difficult technical problem you solved.",
        hint: "Explain your debugging approach and the solution's impact.",
        roles: ["engineer", "developer", "architect", "analyst"]
    },
    {
        id: "tech_trend_001",
        category: "role-specific",
        difficulty: "hard",
        prompt: "What emerging trends in {{industry}} do you think will impact the {{job_title}} role most?",
        hint: "Show industry awareness and forward thinking.",
        roles: ["all"]
    },

    // ===== ROLE-SPECIFIC: PRODUCT/PROJECT =====
    {
        id: "pm_prioritize_001",
        category: "role-specific",
        difficulty: "hard",
        prompt: "How do you prioritize features when stakeholders have conflicting requirements?",
        hint: "Describe your framework for balancing competing priorities.",
        roles: ["product", "project", "program", "manager"]
    },
    {
        id: "pm_roadmap_001",
        category: "role-specific",
        difficulty: "normal",
        prompt: "How do you build and communicate a product roadmap?",
        hint: "Include stakeholder alignment and how you handle changes.",
        roles: ["product", "project", "program"]
    },

    // ===== ROLE-SPECIFIC: SALES/BUSINESS =====
    {
        id: "sales_close_001",
        category: "role-specific",
        difficulty: "normal",
        prompt: "Tell me about the toughest deal you ever closed.",
        hint: "Highlight your sales strategy and relationship-building skills.",
        roles: ["sales", "account", "business", "bdr", "sdr"]
    },
    {
        id: "sales_objection_001",
        category: "role-specific",
        difficulty: "normal",
        prompt: "How do you handle objections from potential clients?",
        hint: "Share specific techniques and a successful example.",
        roles: ["sales", "account", "business"]
    },

    // ===== COMMUNICATION & SOFT SKILLS =====
    {
        id: "comm_intro_001",
        category: "behavioral",
        difficulty: "easy",
        prompt: "Tell me about yourself and why you're interested in this {{job_title}} role.",
        hint: "Keep it concise: background, relevant experience, and motivation.",
        roles: ["all"]
    },
    {
        id: "comm_strength_001",
        category: "behavioral",
        difficulty: "easy",
        prompt: "What are your top three strengths as a {{job_title}}?",
        hint: "Provide specific examples that demonstrate each strength.",
        roles: ["all"]
    },
    {
        id: "comm_weakness_001",
        category: "behavioral",
        difficulty: "normal",
        prompt: "What's an area you're actively working to improve?",
        hint: "Be honest but show self-awareness and proactive development.",
        roles: ["all"]
    },
    {
        id: "comm_achievement_001",
        category: "behavioral",
        difficulty: "easy",
        prompt: "What's your proudest professional achievement?",
        hint: "Quantify the impact and explain why it matters to you.",
        roles: ["all"]
    },

    // ===== ADDITIONAL VARIETY =====
    {
        id: "behav_adapt_001",
        category: "behavioral",
        difficulty: "normal",
        prompt: "Describe a time when you had to quickly adapt to a major change at work.",
        hint: "Show flexibility and positive attitude toward change.",
        roles: ["all"]
    },
    {
        id: "sit_priority_001",
        category: "situational",
        difficulty: "normal",
        prompt: "If you had three urgent tasks and could only complete one today, how would you decide?",
        hint: "Explain your prioritization framework and communication strategy.",
        roles: ["all"]
    },
    {
        id: "role_impact_001",
        category: "role-specific",
        difficulty: "normal",
        prompt: "Tell me about a time you made a measurable impact in your {{industry}} role.",
        hint: "Use specific metrics to demonstrate your contribution.",
        roles: ["all"]
    }
];

/**
 * Available interviewer personas
 */
const INTERVIEWERS = {
    alexMorgan: {
        name: "Alex Morgan",
        title: "Senior Hiring Manager",
        avatarUrl: null, // Frontend can use default avatar
        voiceId: "en-US-Neural2-J" // Google Cloud TTS voice (professional, neutral)
    },
    sarahJenkins: {
        name: "Sarah Jenkins",
        title: "Lead Technical Recruiter",
        avatarUrl: null, // Frontend can use default avatar
        voiceId: "en-US-Studio-O", // Google Cloud TTS Studio voice (reserved exclusively for Sarah Jenkins)
        languageCode: "en-US"
    }
};

/**
 * Default interviewer persona
 */
const DEFAULT_INTERVIEWER = INTERVIEWERS.sarahJenkins;

/**
 * Check if question matches user's role
 */
function matchesRole(questionRoles, userJobTitle) {
    if (questionRoles.includes("all")) return true;
    if (!userJobTitle) return false;

    const lowerTitle = userJobTitle.toLowerCase();
    return questionRoles.some(role => lowerTitle.includes(role.toLowerCase()));
}

/**
 * Check if question matches user's seniority
 */
function matchesSeniority(question, seniority) {
    if (!seniority) return true;

    const lowerSeniority = seniority.toLowerCase();
    const isSenior = ["senior", "lead", "staff", "principal", "manager", "director", "vp", "head"].some(
        s => lowerSeniority.includes(s)
    );

    // Senior users can get leadership questions even if role doesn't match
    if (isSenior && question.roles.some(r => ["manager", "lead", "director", "senior"].includes(r))) {
        return true;
    }

    return true; // Default to allowing
}

/**
 * Generate deterministic seed for daily rotation
 */
function getDailySeed(userKey) {
    const today = getTodayUTC(); // YYYY-MM-DD
    const seedString = `${userKey}-${today}`;
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
 * Generate personalized mock interview questions
 */
export function generateMockInterviewQuestions(userKey, type, profile = {}) {
    const {
        job_title = "professional",
        industry = "your field",
        seniority = "mid-level",
        focus_areas = []
    } = profile;

    // Determine question count
    const questionCount = type === "short" ? 5 : 10;

    // Filter candidates based on profile
    let candidates = QUESTION_BANK.filter(q => {
        // Role match
        if (!matchesRole(q.roles, job_title)) return false;

        // Seniority match
        if (!matchesSeniority(q, seniority)) return false;

        return true;
    });

    // If no candidates (shouldn't happen due to "all" roles), use all questions
    if (candidates.length === 0) {
        candidates = QUESTION_BANK.filter(q => q.roles.includes("all"));
    }

    // Apply focus area weighting if specified
    let weightedCandidates = candidates;
    if (focus_areas && focus_areas.length > 0 && !focus_areas.includes("mixed")) {
        const focused = candidates.filter(q => focus_areas.includes(q.category));
        const others = candidates.filter(q => !focus_areas.includes(q.category));

        // 70% from focused areas, 30% from others
        weightedCandidates = [
            ...focused,
            ...focused, // Double weight
            ...others
        ];
    }

    // Generate deterministic seed for today
    const seed = getDailySeed(userKey);

    // Shuffle using seeded random
    const shuffled = [...weightedCandidates];
    let currentSeed = seed;
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(currentSeed++) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Select questions (ensure no duplicates by ID)
    const selected = [];
    const usedIds = new Set();

    for (const question of shuffled) {
        if (selected.length >= questionCount) break;
        if (usedIds.has(question.id)) continue;

        usedIds.add(question.id);
        selected.push(question);
    }

    // If we don't have enough, fill with remaining candidates
    if (selected.length < questionCount) {
        for (const question of QUESTION_BANK) {
            if (selected.length >= questionCount) break;
            if (usedIds.has(question.id)) continue;

            usedIds.add(question.id);
            selected.push(question);
        }
    }

    // Interpolate placeholders
    const questions = selected.map(q => ({
        id: q.id,
        category: q.category,
        difficulty: q.difficulty,
        prompt: q.prompt
            .replace(/{{job_title}}/g, job_title)
            .replace(/{{industry}}/g, industry),
        hint: q.hint
    }));

    return {
        interviewer: DEFAULT_INTERVIEWER,
        questions
    };
}

/**
 * Generate practice demo questions (3-5 starter questions)
 */
export function generatePracticeDemoQuestions(params = {}) {
    const {
        jobTitle = "professional",
        industry = "your field",
        seniority = "mid-level",
        focusAreas = []
    } = params;

    // Select 4 questions: 1 easy intro, 2 behavioral, 1 role-specific
    const questions = [];

    // 1. Easy intro question
    const introQuestion = QUESTION_BANK.find(q => q.id === "comm_intro_001");
    if (introQuestion) {
        questions.push({
            id: introQuestion.id,
            category: introQuestion.category,
            difficulty: introQuestion.difficulty,
            prompt: introQuestion.prompt.replace(/{{job_title}}/g, jobTitle),
            hint: introQuestion.hint
        });
    }

    // 2. Behavioral questions (2)
    const behavioralCandidates = QUESTION_BANK.filter(q =>
        q.category === "behavioral" &&
        q.id !== "comm_intro_001" &&
        matchesRole(q.roles, jobTitle)
    );

    const selectedBehavioral = behavioralCandidates.slice(0, 2);
    selectedBehavioral.forEach(q => {
        questions.push({
            id: q.id,
            category: q.category,
            difficulty: q.difficulty,
            prompt: q.prompt
                .replace(/{{job_title}}/g, jobTitle)
                .replace(/{{industry}}/g, industry),
            hint: q.hint
        });
    });

    // 3. Role-specific or focus area question
    let roleSpecific = QUESTION_BANK.find(q =>
        q.category === "role-specific" &&
        matchesRole(q.roles, jobTitle)
    );

    // If focus areas specified, try to match
    if (focusAreas && focusAreas.length > 0) {
        const focusMatch = QUESTION_BANK.find(q =>
            focusAreas.includes(q.category) &&
            matchesRole(q.roles, jobTitle)
        );
        if (focusMatch) roleSpecific = focusMatch;
    }

    if (roleSpecific) {
        questions.push({
            id: roleSpecific.id,
            category: roleSpecific.category,
            difficulty: roleSpecific.difficulty,
            prompt: roleSpecific.prompt
                .replace(/{{job_title}}/g, jobTitle)
                .replace(/{{industry}}/g, industry),
            hint: roleSpecific.hint
        });
    }

    return questions.slice(0, 5); // Max 5 questions
}
