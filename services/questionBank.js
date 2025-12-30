
import crypto from 'crypto';

/**
 * Question Templates
 * Categories: behavioral, technical, communication, leadership, storytelling
 * Difficulties: easy, normal, hard
 */
const questionTemplates = [
    // BEHAVIORAL - GENERAL
    {
        id: "behav_challenge_1",
        text: "Tell me about a significant challenge you faced as a {{job_title}} and how you overcame it.",
        category: "behavioral",
        difficulty: "normal",
        roles: ["all"]
    },
    {
        id: "behav_mistake_1",
        text: "Describe a time you made a mistake in your role as a {{job_title}}. How did you handle it?",
        category: "behavioral",
        difficulty: "normal",
        roles: ["all"]
    },
    {
        id: "behav_conflict_1",
        text: "Tell me about a time you had a disagreement with a colleague in the {{industry}} industry. How did you resolve it?",
        category: "behavioral",
        difficulty: "normal",
        roles: ["all"]
    },

    // LEADERSHIP / SENIOR
    {
        id: "lead_motivate_1",
        text: "How do you motivate a team when deadlines are tight and morale is low?",
        category: "leadership",
        difficulty: "hard",
        roles: ["manager", "lead", "senior", "director", "vp", "head"]
    },
    {
        id: "lead_strategy_1",
        text: "Describe a strategic decision you made that significantly impacted your {{industry}} organization.",
        category: "leadership",
        difficulty: "hard",
        roles: ["manager", "lead", "senior", "director", "vp", "head"]
    },

    // TECHNICAL / ROLE SPECIFIC
    {
        id: "tech_trend_1",
        text: "What emerging trends in the {{industry}} industry do you think will impact the {{job_title}} role most in the next 5 years?",
        category: "technical",
        difficulty: "hard",
        roles: ["all"]
    },
    {
        id: "tech_process_1",
        text: "Walk me through your process for starting a new project as a {{job_title}}.",
        category: "technical",
        difficulty: "normal",
        roles: ["all"]
    },

    // EASY / STRUCTURED
    {
        id: "easy_intro_1",
        text: "Tell me about yourself and why you want to work as a {{job_title}}.",
        category: "communication",
        difficulty: "easy",
        roles: ["all"]
    },
    {
        id: "easy_strength_1",
        text: "What are your top three strengths as a {{job_title}}?",
        category: "communication",
        difficulty: "easy",
        roles: ["all"]
    },

    // SPECIFIC ROLES (Examples)
    {
        id: "pm_prioritize_1",
        text: "How do you prioritize features when stakeholders have conflicting requirements?",
        category: "technical",
        difficulty: "hard",
        roles: ["product manager", "project manager", "owner"]
    },
    {
        id: "eng_debug_1",
        text: "Describe a particularly difficult bug you tracked down and fixed.",
        category: "technical",
        difficulty: "normal",
        roles: ["engineer", "developer", "programmer"]
    },
    {
        id: "sales_close_1",
        text: "Tell me about the toughest deal you ever closed.",
        category: "technical",
        difficulty: "normal",
        roles: ["sales", "account executive", "bdr"]
    }
];

// Helper to check if template matches role
function matchesRole(templateRoles, userJobTitle) {
    if (templateRoles.includes("all")) return true;
    if (!userJobTitle) return false;

    const lowerTitle = userJobTitle.toLowerCase();

    // Direct match check
    const isDirectMatch = templateRoles.some(r => lowerTitle.includes(r.toLowerCase()));
    if (isDirectMatch) return true;

    return false;
}

export function getNextQuestion(context, recentIds = [], excludeIds = []) {
    const {
        job_title = "professional",
        industry = "tech",
        seniority = "mid-level",
        focus_areas = [],
        difficulty = "normal"
    } = context;

    // 1. Filter candidates
    let candidates = questionTemplates.filter(t => {
        // Difficulty filter: loosely match (if hard requested, allow normal/hard; if easy, allow easy/normal)
        // For strictness, let's try exact match or adjacent.
        const diffMap = { "easy": 1, "normal": 2, "hard": 3 };
        const tDiff = diffMap[t.difficulty];
        const uDiff = diffMap[difficulty] || 2;

        // Allow templates within 1 difficulty step (e.g. normal user gets easy/normal/hard, easy user gets easy/normal)
        if (Math.abs(tDiff - uDiff) > 1) return false;

        // Role filter
        if (!matchesRole(t.roles, job_title)) {
            // If seniority is high, try to match high seniority templates even if job title doesn't match specific keyword
            const isSenior = ["senior", "lead", "staff", "principle", "manager", "director", "vp", "head"].some(s => seniority.toLowerCase().includes(s));
            if (isSenior && matchesRole(t.roles, "senior")) return true; // simplified logic
            return false;
        }

        return true;
    });



    // 2. Anti-repeat
    // Combine recent server history with client exclusions
    const allExcluded = new Set([...recentIds, ...excludeIds]);

    const freshCandidates = candidates.filter(c => !allExcluded.has(c.id));

    // If we exhausted all candidates, reset (ignore history) BUT keep client exclusions strict if possible
    // Prioritize strictly obeying excludeIds.
    if (freshCandidates.length > 0) {
        candidates = freshCandidates;
    } else {
        // If freshCandidates is empty, try to relax recentIds but KEEP excludeIds
        const relaxedCandidates = candidates.filter(c => !excludeIds.includes(c.id));
        if (relaxedCandidates.length > 0) {
            candidates = relaxedCandidates;
        }
        // If still empty (e.g. client excluded EVERYTHING available), well, we might have to return something repeated or generic 'all' fallback
    }

    // 3. Weight by focus areas
    // If user has focus areas, boost probability of matching categories
    // "mixed" means purely random among valid candidates
    const wantsMixed = focus_areas.includes("mixed") || focus_areas.length === 0;

    let finalPool = [];
    if (wantsMixed) {
        finalPool = candidates;
    } else {
        // Boost matching categories
        const focused = candidates.filter(c => focus_areas.includes(c.category));
        const others = candidates.filter(c => !focus_areas.includes(c.category));

        // 80% chance to pick from focused, 20% from others (if available)
        // Simplified: just construct a weighted array or pick a bucket first
        if (focused.length > 0) {
            // For strict 80/20, we can just return one from focused 80% of time
            if (Math.random() < 0.8 || others.length === 0) {
                finalPool = focused;
            } else {
                finalPool = others;
            }
        } else {
            finalPool = others;
        }
    }

    // Fallback if pool empty (shouldn't happen due to 'all' templates, but safety first)
    if (finalPool.length === 0) {
        finalPool = questionTemplates.filter(t => t.roles.includes("all"));
    }

    // 4. Random Pick
    const template = finalPool[Math.floor(Math.random() * finalPool.length)];

    // 5. Interpolate
    let text = template.text
        .replace(/{{job_title}}/g, job_title)
        .replace(/{{industry}}/g, industry);

    return {
        id: template.id,
        text: text,
        category: template.category,
        difficulty: template.difficulty
    };
}
