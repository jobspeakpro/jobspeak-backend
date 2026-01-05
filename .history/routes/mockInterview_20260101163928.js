// jobspeak-backend/routes/mockInterview.js
import express from "express";
import {
    getMockInterviewAttempt,
    markMockInterviewUsed,
    saveMockInterview,
    getSubscription
} from "../services/db.js";
import { getProfile, supabase } from "../services/supabase.js";
import { generateMockInterviewQuestions } from "../services/personalizedQuestionSelector.js";
import { evaluateAnswer } from "../services/answerEvaluator.js";
import { generateSessionSummary, getHiringRecommendation } from "../services/summaryGenerator.js";
import {
    generateSTARRewrite,
    generateActionableImprovements,
    generateHiringManagerInterpretation,
    generateSignalBasedFeedback,
    generateRoleVocabulary,
    VOCAB_DATA
} from "../services/intelligentFeedbackGenerator.js";

const router = express.Router();

/**
 * Generate varied risk detail (avoid repetitive STAR wording)
 */
function generateRiskDetail(weaknesses, score) {
    if (!weaknesses || weaknesses.length === 0) {
        return "Continue practicing to refine your interview technique.";
    }

    const templates = [
        "Focus on adding more concrete examples and measurable outcomes to strengthen your answers.",
        "Work on connecting your actions directly to business results or team impact.",
        "Practice explaining your decision-making process more clearly to show how you think.",
        "Try to include specific numbers or percentages to make your achievements more tangible.",
        "Strengthen your responses by clearly stating what changed as a result of your work."
    ];

    // Select based on score to add variety
    const index = Math.floor(score / 20) % templates.length;
    return templates[index];
}

/**
 * Shape function for /api/mock-interview/summary response
 * Ensures all keys are present with safe defaults
 */
function shapeMockSummaryResponse(data = {}) {
    const hiringManagerValue = data.hiring_manager_heard ?? "Keep practicing to build stronger interview responses.";

    return {
        version: data.version ?? "unknown",
        sessionId: data.sessionId ?? "",
        attemptCount: data.attemptCount ?? 0,
        totalQuestions: data.totalQuestions ?? 5,
        overall_score: data.overall_score ?? 0,
        overallScore: data.overall_score ?? 0,
        strengths: data.strengths ?? [],
        weaknesses: data.weaknesses ?? [],
        improvements: data.improvements ?? [],
        points_to_focus: data.points_to_focus ?? [],
        risks: data.risks ?? [],
        biggest_risk: data.biggest_risk ?? "No major risks identified",
        biggest_risk_detail: data.biggest_risk_detail ?? "Focus on the areas above to improve your interview performance.",
        biggestRisk: data.biggestRisk ?? "No major risks identified",
        strongest_area: data.strongest_area ?? "N/A",
        strongest_area_detail: data.strongest_area_detail ?? "",
        bullets: data.bullets ?? [],
        recommendation: data.recommendation ?? "not_recommended_yet",
        completed: data.completed ?? false,
        hiring_manager_heard: hiringManagerValue,
        hiringManagerHeard: hiringManagerValue,
        improvedExample: data.improvedExample ?? "",
        perQuestion: data.perQuestion ?? [],
        per_question: data.perQuestion ?? []
    };
}

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



import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

/**
 * Helper to strip HTML tags from text
 */
function stripHtml(text) {
    if (!text) return "";
    return text.replace(/<\/?[^>]+(>|$)/g, "");
}

/**
 * Helper to normalize vocab entry with safe defaults
 */
function normalizeVocabEntry(raw) {
    // If raw is just a string
    if (typeof raw === 'string') {
        const lower = raw.toLowerCase().trim();
        const enriched = VOCAB_DATA[lower] || {};
        const cleanExample = stripHtml(enriched.example || "");

        return {
            word: raw,
            ipa: enriched.phonetic || "",
            accent: "US",
            audioText: raw,
            pos: enriched.pos || "word",
            definition: enriched.definition || "Definition not available",
            example: cleanExample
        };
    }

    // If raw is object
    const word = (raw.word || "").trim();
    const lower = word.toLowerCase();
    const enriched = VOCAB_DATA[lower] || {};

    // Prefer enriched data if available, fallback to existing object data
    const ipa = enriched.phonetic || raw.ipa || raw.phonetic || "";
    const pos = enriched.pos || raw.pos || "word";
    const definition = enriched.definition || raw.definition || "Definition not available";
    const example = stripHtml(enriched.example || raw.example || "");
    const audioText = raw.audioText || word;

    return {
        word,
        ipa,
        accent: "US",
        audioText,
        pos,
        definition,
        example
    };
}

/**
 * Helper to pick exactly 2 unique vocab words
 */
function pickUniqueVocabWords(candidateWords, usedSet) {
    const uniqueVocab = [];

    // Process candidates from attempt
    for (const v of candidateWords) {
        const w = (typeof v === 'string' ? v : v.word).trim();
        if (!w) continue;

        const lower = w.toLowerCase();
        if (!usedSet.has(lower)) {
            uniqueVocab.push(normalizeVocabEntry(v));
            usedSet.add(lower);
        }
        if (uniqueVocab.length >= 2) break;
    }

    // Fallback if < 2: Pick generic high-value words from VOCAB_DATA
    // All words in this list MUST exist in VOCAB_DATA with complete IPA/definition
    if (uniqueVocab.length < 2) {
        const fallbacks = [
            "Articulate", "Quantify", "Clarify", "Synthesize", "Prioritize", "Validate",
            "Streamline", "Optimize", "Facilitate", "Collaborate", "Initiate", "Execute",
            "Innovate", "Mentorship", "Strategy", "Impact", "Efficiency", "Resolution",
            "Alignment", "Decision", "Advocate", "Mediate", "Align", "Assess", "Diagnose"
        ];

        for (const fb of fallbacks) {
            const lower = fb.toLowerCase();
            if (!usedSet.has(lower) && VOCAB_DATA[lower]) {
                // Only add if it exists in VOCAB_DATA (guaranteed to have IPA/definition)
                uniqueVocab.push(normalizeVocabEntry(fb));
                usedSet.add(lower);
            }
            if (uniqueVocab.length >= 2) break;
        }
    }

    // Extreme fallback: If we somehow still don't have 2 (should never happen with 20+ fallbacks)
    // Log error but don't break - return what we have
    if (uniqueVocab.length < 2) {
        console.error(`[VOCAB] WARNING: Only found ${uniqueVocab.length} vocab words. Session may have exhausted fallback list.`);
    }

    return uniqueVocab;
}

/**
 * Helper to generate varied feedback bullets
 */
function varyBullets(baseBullets, index, type) {
    if (!baseBullets || baseBullets.length === 0) {
        return type === 'positive'
            ? ["Good effort on this answer."]
            : ["Try to structure your answer more clearly."];
    }

    // Template pools for prefixes to add variety
    const positiveIntros = [
        "You effectively demonstrated",
        "It was great to hear",
        "You successfully highlighted",
        "The answer clearly showed",
        "You did a good job explaining"
    ];

    const improvementIntros = [
        "Consider enhancing this by",
        "Try to focus more on",
        "It would be impactful to",
        "Work on clarifying",
        "Strengthen your answer by"
    ];

    // Simple rotation based on index
    const pool = type === 'positive' ? positiveIntros : improvementIntros;
    const prefix = pool[index % pool.length];

    // Apply the prefix to the first bullet for variety
    const variedBullets = [...baseBullets];
    if (variedBullets.length > 0) {
        variedBullets[0] = `${prefix} ${variedBullets[0].charAt(0).toLowerCase() + variedBullets[0].slice(1)}`;
    }

    return variedBullets;
}

/**
 * Basic profanity/inappropriate content filter
 */
function sanitizeText(text) {
    if (!text) return "";

    // Strip HTML first
    let clean = stripHtml(text);

    // Basic profanity filter (case-insensitive)
    const inappropriatePatterns = [
        /\b(fuck|shit|damn|ass|bitch|hell|crap|piss)\b/gi,
        /\b(sex|sexual|porn|dick|cock|pussy)\b/gi,
        /\bcan\s+i\s+hit\s+that\b/gi
    ];

    inappropriatePatterns.forEach(pattern => {
        clean = clean.replace(pattern, '[redacted]');
    });

    return clean;
}

/**
 * Generate a professional stronger example WITHOUT using user's raw transcript
 * Uses templates based on question type and role context
 */
function generateProfessionalStrongerExample(questionText, vocabWords) {
    // Extract question type
    const qLower = (questionText || "").toLowerCase();

    let template = "";

    if (qLower.includes("conflict") || qLower.includes("disagreement") || qLower.includes("difficult")) {
        template = `I encountered a situation where team members had differing views on the approach. I facilitated a discussion to understand each perspective, then worked to align everyone on a shared goal. By maintaining open communication and focusing on the outcome, we resolved the issue collaboratively and delivered successfully.`;
    } else if (qLower.includes("failure") || qLower.includes("mistake") || qLower.includes("didn't go well")) {
        template = `I faced a challenge where my initial approach didn't yield the expected results. I took time to assess what went wrong, gathered feedback, and adjusted my strategy. This experience taught me to validate assumptions early and remain adaptable when circumstances change.`;
    } else if (qLower.includes("lead") || qLower.includes("leadership") || qLower.includes("team")) {
        template = `I led a cross-functional initiative where clear direction was essential. I worked to articulate the vision, empower team members to own their areas, and maintain alignment through regular check-ins. The team delivered the project on time while building stronger collaboration habits.`;
    } else if (qLower.includes("pressure") || qLower.includes("deadline") || qLower.includes("tight timeline")) {
        template = `I managed a high-pressure situation with competing priorities. I prioritized the most critical tasks, communicated transparently with stakeholders, and focused the team on incremental progress. By staying organized and maintaining clear communication, we met the deadline successfully.`;
    } else if (qLower.includes("why") || qLower.includes("hire you") || qLower.includes("fit")) {
        template = `I bring a combination of technical expertise and collaborative leadership. I've consistently delivered results by focusing on clear communication, strategic thinking, and empowering teams. My approach emphasizes both execution and building sustainable processes that drive long-term success.`;
    } else {
        // Generic professional template
        template = `I approached this challenge by first understanding the core requirements and constraints. I collaborated with stakeholders to align on priorities, then executed systematically while maintaining clear communication. The outcome demonstrated both technical capability and effective teamwork.`;
    }

    // If we have vocab words, try to naturally incorporate them
    if (vocabWords && vocabWords.length >= 2) {
        const word1 = vocabWords[0].word.toLowerCase();
        const word2 = vocabWords[1].word.toLowerCase();

        // Append a sentence that uses both words if they're not already in the template
        if (!template.toLowerCase().includes(word1) || !template.toLowerCase().includes(word2)) {
            template += ` I made sure to ${word1} the approach and ${word2} with all stakeholders throughout the process.`;
        }
    }

    return template;
}

/**
 * Validate and fix strongerExample to ensure:
 * - Exactly 2 underlinedWords
 * - Both words appear in the text (case-insensitive)
 * - Text is professional and sanitized
 * - NO user transcript contamination
 */
function validateAndFixStrongerExample(strongerExample, usedVocabSet, questionText, userTranscript) {
    let { text, vocab, underlinedWords } = strongerExample;

    // Sanitize text
    text = sanitizeText(text);

    // CRITICAL: Check if user's transcript appears in the stronger example
    // This is contamination and must be replaced
    const transcriptSnippet = (userTranscript || "").trim().substring(0, 50);
    const isContaminated = transcriptSnippet.length > 10 && text.includes(transcriptSnippet);

    // Ensure we have exactly 2 vocab words
    if (!vocab || vocab.length < 2) {
        // Pick fallback words
        const fallbacks = ["Articulate", "Prioritize", "Facilitate", "Collaborate", "Validate", "Align"];
        const needed = 2 - (vocab?.length || 0);

        for (const fb of fallbacks) {
            const lower = fb.toLowerCase();
            if (!usedVocabSet.has(lower) && VOCAB_DATA[lower]) {
                vocab = vocab || [];
                vocab.push(normalizeVocabEntry(fb));
                usedVocabSet.add(lower);
                if (vocab.length >= 2) break;
            }
        }
    }

    // Ensure exactly 2 vocab items
    vocab = vocab.slice(0, 2);
    underlinedWords = vocab.map(v => v.word);

    // Check if both words appear in text (case-insensitive word boundary match)
    const word1 = vocab[0]?.word || "";
    const word2 = vocab[1]?.word || "";

    const word1Regex = new RegExp(`\\b${word1}\\b`, 'i');
    const word2Regex = new RegExp(`\\b${word2}\\b`, 'i');

    const hasWord1 = word1Regex.test(text);
    const hasWord2 = word2Regex.test(text);

    // If text is empty, contaminated, or too short, regenerate it
    if (!text || text.length < 50 || text.includes('[redacted]') || isContaminated) {
        console.log(`[MOCK] Regenerating stronger example (contaminated=${isContaminated}, length=${text.length})`);
        text = generateProfessionalStrongerExample(questionText, vocab);
    }

    // If either word is missing, append a sentence with both
    if (!hasWord1 || !hasWord2) {
        text += ` I made sure to ${word1.toLowerCase()} the strategy and ${word2.toLowerCase()} with stakeholders.`;
    }

    return {
        text,
        vocab,
        underlinedWords
    };
}

/**
 * Main helper to generate per-question breakdown enforcing uniqueness
 */
function generatePerQuestionBreakdown(attempts) {
    const usedVocabWords = new Set();

    return (attempts || []).map((attempt, index) => {
        // HARD RULE: yourAnswer must come from raw transcript ONLY, never rewrite
        // Priority: answer_text (raw transcript) > typed answer
        // NEVER use clearer_rewrite for yourAnswer
        const yourAnswer = attempt.answer_text || attempt.answerText || attempt.answer || "";
        const rewrite = attempt.clearer_rewrite || "";

        // DEBUG: Log to verify separation
        console.log(`[MOCK SUMMARY] Q${index + 1} yourAnswer: "${yourAnswer.substring(0, 60)}${yourAnswer.length > 60 ? '...' : ''}" (${yourAnswer.length} chars)`);
        console.log(`[MOCK SUMMARY] Q${index + 1} rewrite: "${rewrite.substring(0, 60)}${rewrite.length > 60 ? '...' : ''}" (${rewrite.length} chars)`);

        // DEFENSIVE ASSERTION: Detect rewrite contamination
        // If yourAnswer contains patterns that suggest it's a rewrite (not verbatim), log ERROR
        const rewritePatterns = [
            /^In a previous role/i,
            /^The most critical aspect/i,
            /^I encountered a situation where/i,
            /^I faced a challenge where/i,
            /^I led a cross-functional/i,
            /^I managed a high-pressure/i,
            /^I bring a combination of/i
        ];

        const containsRewritePattern = rewritePatterns.some(pattern => pattern.test(yourAnswer));

        if (containsRewritePattern && yourAnswer.length > 0) {
            console.error(`[MOCK SUMMARY] ❌ ERROR: yourAnswer contains rewrite pattern! This should NEVER happen.`);
            console.error(`[MOCK SUMMARY] Contaminated yourAnswer: "${yourAnswer.substring(0, 100)}"`);
            console.error(`[MOCK SUMMARY] This is NOT the user's verbatim transcript.`);
        }

        // Verify yourAnswer and rewrite are different (unless both empty)
        if (yourAnswer === rewrite && yourAnswer.length > 0) {
            console.warn(`[MOCK SUMMARY] ⚠️ WARNING: yourAnswer === rewrite for Q${index + 1}. Possible contamination.`);
        }

        // 2. Get vocab candidates
        let rawVocab = attempt.vocabulary || [];
        if (!Array.isArray(rawVocab)) rawVocab = [];

        // 3. Pick unique words
        const finalVocab = pickUniqueVocabWords(rawVocab, usedVocabWords);

        // 4. Generate initial stronger example structure
        let strongerExample = {
            text: rewrite,
            vocab: finalVocab,
            underlinedWords: finalVocab.map(v => v.word)
        };

        // 5. CRITICAL: Validate and fix stronger example
        // This ensures: no transcript contamination, exactly 2 underlined words, both words in text
        strongerExample = validateAndFixStrongerExample(
            strongerExample,
            usedVocabWords,
            attempt.question_text || "",
            yourAnswer  // Pass user transcript to detect contamination
        );

        return {
            questionId: attempt.question_id || `q${index + 1}`,
            questionText: attempt.question_text || "",
            // HARD RULE: yourAnswer = verbatim transcript ONLY (never rewrite)
            yourAnswer: yourAnswer,           // Verbatim transcript from answer_text
            answerText: yourAnswer,           // Legacy field (same as yourAnswer)
            answer_text: yourAnswer,          // Legacy field (same as yourAnswer)
            transcript: yourAnswer,           // Legacy field (same as yourAnswer)
            score: attempt.score || 0,
            whatWorked: varyBullets(attempt.what_worked, index, 'positive'),
            improveNext: varyBullets(attempt.improve_next, index, 'negative'),
            strongerExample                   // AI-generated rewrite ONLY (never in yourAnswer)
        };
    });
}

// GET /api/mock-interview/status?userKey=...
router.get("/mock-interview/status", async (req, res) => {
    try {
        let { userKey } = req.query;

        // Guest-friendly: generate guest key if missing
        if (!userKey) {
            userKey = `guest-${Date.now()}`;
            console.log(`[MOCK STATUS] Generated guest key: ${userKey}`);
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

// GET /api/mock-interview/limit-status?userKey=...
// UX-only endpoint to check if user can start a new mock interview
// Returns 200 always - enforcement still happens on /answer endpoint
router.get("/mock-interview/limit-status", async (req, res) => {
    try {
        let { userKey } = req.query;

        // Require userKey
        if (!userKey) {
            return res.status(400).json({ error: "userKey required" });
        }

        console.log(`[MOCK LIMIT STATUS] Checking eligibility for: ${userKey}`);

        // Determine if this is an authenticated user or guest
        let user_id = null;
        if (userKey && !userKey.startsWith('guest-')) {
            user_id = userKey;
        }

        // Guest users are not subject to this limit (they have separate gating)
        if (!user_id) {
            console.log(`[MOCK LIMIT STATUS] Guest user - not subject to completed limit`);
            return res.json({ canStartMock: true });
        }

        // Check subscription status (same logic as answer endpoint)
        const subscription = getSubscription(user_id);
        const isPro = subscription?.isPro || false;

        if (isPro) {
            console.log(`[MOCK LIMIT STATUS] ✓ Pro user - unlimited access`);
            return res.json({ canStartMock: true });
        }

        // Free user - check if they've already completed a mock interview
        // CRITICAL: Use exact same logic as /answer endpoint (lines 690-708)
        console.log(`[MOCK LIMIT STATUS] Free user detected, checking completed session count...`);

        const { data: completedSessions, error: countError } = await supabase
            .from('mock_sessions')
            .select('id')
            .eq('user_id', user_id)
            .eq('completed', true)
            .limit(1);

        if (countError) {
            console.error('[MOCK LIMIT STATUS] Error checking completed sessions:', countError);
            // Fail open for better UX - let them try, enforcement happens on /answer
            return res.json({ canStartMock: true });
        }

        if (completedSessions && completedSessions.length >= 1) {
            console.log(`[MOCK LIMIT STATUS] ❌ Free user has already completed a mock interview`);
            return res.json({
                canStartMock: false,
                reason: "FREE_LIMIT_REACHED"
            });
        }

        console.log(`[MOCK LIMIT STATUS] ✓ Free user has not completed a mock interview yet`);
        return res.json({ canStartMock: true });

    } catch (error) {
        console.error("Error checking mock interview limit status:", error);
        // Fail open - let them try, enforcement happens on /answer
        return res.json({ canStartMock: true });
    }
});

// POST /api/mock-interview/start
router.post("/mock-interview/start", async (req, res) => {
    try {
        let { userKey, interviewType } = req.body;

        // Guest-friendly: generate guest key if missing
        if (!userKey) {
            userKey = `guest-${Date.now()}`;
            console.log(`[MOCK START] Generated guest key: ${userKey}`);
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

// GET /api/mock-interview/questions?userKey=...&type=short|long&sessionId=...
router.get("/mock-interview/questions", async (req, res) => {
    try {
        let { userKey, type, sessionId } = req.query;

        // Guest-friendly: generate guest key if missing
        if (!userKey) {
            userKey = `guest-${Date.now()}`;
            console.log(`[MOCK QUESTIONS] Generated guest key: ${userKey}`);
        }

        // Generate sessionId if not provided (for per-session rotation)
        if (!sessionId) {
            sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            console.log(`[MOCK QUESTIONS] Generated sessionId: ${sessionId}`);
        }

        // Only 400 for invalid type
        if (!type || !['short', 'long'].includes(type)) {
            return res.status(400).json({ error: "type must be 'short' or 'long'" });
        }

        // Fetch user profile for personalization (graceful fallback if Supabase unavailable)
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
                console.log(`[MOCK QUESTIONS] Using profile for ${userKey}`);
            } else {
                console.log(`[MOCK QUESTIONS] No profile found, using defaults`);
            }
        } catch (profileError) {
            console.warn(`[MOCK QUESTIONS] Profile lookup failed (using defaults):`, profileError.message);
            // Continue with empty profile - graceful fallback
        }

        // Generate personalized questions with sessionId for per-session rotation
        const result = generateMockInterviewQuestions({
            userKey,
            type,
            jobTitle: profile.job_title,
            industry: profile.industry,
            seniority: profile.seniority,
            focusAreas: profile.focus_areas,
            askedQuestionIds: [], // TODO: Track asked questions per user
            sessionId // Pass sessionId for per-session rotation
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
            sessionId, // Return sessionId so frontend can reuse on refresh
            interviewer: result.interviewer,
            questions: formattedQuestions
        });

    } catch (error) {
        console.error("Error generating mock interview questions:", error);
        return res.status(500).json({ error: "Failed to generate questions" });
    }
});

// POST /api/mock-interview/answer
router.post("/mock-interview/answer", upload.single('audioFile'), async (req, res) => {
    try {
        const contentType = req.headers['content-type'] || 'unknown';
        console.log(`[MOCK ANSWER] Content-Type: ${contentType}`);

        // HOTFIX: Normalize field names - accept both camelCase and snake_case
        // FormData from mic uses snake_case, JSON uses camelCase
        const sessionId = req.body.sessionId || req.body.session_id;
        const questionId = req.body.questionId || req.body.question_id;
        const questionText = req.body.questionText || req.body.question_text;
        const userKey = req.body.userKey || req.body.user_key;
        const audioUrl = req.body.audioUrl || req.body.audio_url;
        const interviewType = req.body.interviewType || req.body.interview_type;

        // Normalize answer from multiple possible field names
        const normalizedAnswer =
            req.body.answer_text ||
            req.body.answerText ||
            req.body.answer ||
            req.body.transcript ||
            '';

        // Defensive logging
        console.log(`MOCK_ANSWER_IN sessionId=${sessionId || 'MISSING'} questionId=${questionId || 'MISSING'}`);
        console.log(`[MOCK ANSWER] Request received - sessionId=${sessionId}, questionId=${questionId}, userKey=${userKey}`);

        // Validate required fields
        if (!sessionId || !questionId) {
            const missing = [
                !sessionId ? 'sessionId' : null,
                !questionId ? 'questionId' : null
            ].filter(Boolean);

            const errorMsg = `Missing required fields: ${missing.join(', ')}`;
            console.error(`[MOCK ANSWER] ❌ 400 Bad Request: ${errorMsg}`);
            console.error(`[MOCK ANSWER] Received keys:`, Object.keys(req.body || {}));

            return res.status(400).json({
                error: errorMsg,
                missing,
                receivedKeys: Object.keys(req.body || {})
            });
        }

        // Determine user_id or guest_key
        let user_id = null;
        let guest_key = null;

        if (userKey && !userKey.startsWith('guest-')) {
            user_id = userKey;
        } else {
            guest_key = userKey || `guest-${Date.now()}`;
        }

        console.log(`[MOCK ANSWER] Identified as: user_id=${user_id}, guest_key=${guest_key}`);

        // CRITICAL: Enforce free user limit (one completed mock interview total)
        // Check if this is a free user and if they've already completed a mock interview
        if (user_id) {
            // Check subscription status
            const subscription = getSubscription(user_id);
            const isPro = subscription?.isPro || false;

            if (!isPro) {
                // Free user - check if they've already completed a mock interview
                console.log(`[MOCK ANSWER] Free user detected, checking completed session count...`);

                const { data: completedSessions, error: countError } = await supabase
                    .from('mock_sessions')
                    .select('id')
                    .eq('user_id', user_id)
                    .eq('completed', true)
                    .limit(1);

                if (countError) {
                    console.error('[MOCK ANSWER] Error checking completed sessions:', countError);
                    // Don't block on error - fail open for better UX
                } else if (completedSessions && completedSessions.length >= 1) {
                    console.error(`[MOCK ANSWER] ❌ 403 Forbidden: Free user ${user_id} has already completed a mock interview`);
                    return res.status(403).json({
                        error: 'Free users can only complete one mock interview',
                        code: 'FREE_LIMIT_REACHED',
                        message: 'Free users can only complete one mock interview. Upgrade to continue.',
                        upgrade: true
                    });
                }

                console.log(`[MOCK ANSWER] ✓ Free user has not completed a mock interview yet`);
            } else {
                console.log(`[MOCK ANSWER] ✓ Pro user - unlimited mock interviews`);
            }
        }

        // Ensure session exists
        console.log(`[MOCK ANSWER] Checking for existing session: ${sessionId}`);
        const { data: existingSession, error: sessionCheckError } = await supabase
            .from('mock_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .single();

        if (sessionCheckError && sessionCheckError.code !== 'PGRST116') {
            console.error('[MOCK ANSWER] Error checking session:', sessionCheckError);
        }

        if (!existingSession) {
            console.log(`[MOCK ANSWER] Session not found, creating new session`);
            const { data: newSession, error: sessionError } = await supabase
                .from('mock_sessions')
                .insert({
                    session_id: sessionId,
                    user_id,
                    guest_key,
                    interview_type: interviewType || 'short',
                    completed: false
                })
                .select()
                .single();

            if (sessionError) {
                console.error('[MOCK ANSWER] ❌ Session creation FAILED:', JSON.stringify(sessionError, null, 2));
                return res.status(500).json({ error: 'Failed to create session', details: sessionError.message });
            }
            console.log(`[MOCK ANSWER] ✅ Session created successfully: ${newSession?.session_id}`);
        } else {
            console.log(`[MOCK ANSWER] ✅ Existing session found: ${existingSession.session_id}`);

            // CRITICAL: Check if session is already completed (immutability enforcement)
            // Completed sessions are immutable - reject new answers to prevent mixed attempts
            if (existingSession.completed === true) {
                console.error(`[MOCK ANSWER] ❌ 403 Forbidden: Session ${sessionId} is already completed`);
                console.error(`[MOCK ANSWER] Rejecting answer for question ${questionId} - session is immutable`);
                return res.status(403).json({
                    error: 'Session is completed and cannot accept new answers',
                    code: 'SESSION_COMPLETED',
                    message: 'This mock interview has already been completed. Please start a new interview.',
                    sessionId: sessionId
                });
            }
        }

        // CRITICAL: Reject empty answers (bulletproof validation)
        const trimmedAnswer = normalizedAnswer.trim();
        if (!trimmedAnswer || trimmedAnswer.length === 0) {
            console.error(`[MOCK ANSWER] ❌ 400 Bad Request: Empty answer after normalization`);
            return res.status(400).json({
                error: 'Answer text is required and cannot be empty',
                field: 'answerText'
            });
        }

        console.log(`[MOCK ANSWER] Normalized answer length: ${trimmedAnswer.length}`);

        // Evaluate answer
        const evaluation = evaluateAnswer(questionText, normalizedAnswer);

        // --- INTELLIGENT FEEDBACK GENERATION ---
        const fullVocabulary = generateRoleVocabulary(questionText, normalizedAnswer);
        const rewriteObj = generateSTARRewrite(questionText, normalizedAnswer, evaluation.score, evaluation.feedback, fullVocabulary);
        const improveNext = generateActionableImprovements(evaluation.feedback, normalizedAnswer, evaluation.score);
        const signals = generateSignalBasedFeedback(evaluation.feedback, normalizedAnswer);
        const interpretation = generateHiringManagerInterpretation(evaluation.score, evaluation.feedback, normalizedAnswer);

        const usedVocab = rewriteObj.usedVocabulary || fullVocabulary.slice(0, 2);

        // SAFETY CHECK: Ensure we're not accidentally saving rewrite as answer_text
        if (normalizedAnswer === rewriteObj.text && normalizedAnswer.length > 0) {
            console.error(`[MOCK ANSWER] ❌ CRITICAL: normalizedAnswer matches rewrite! This is a bug.`);
            console.error(`[MOCK ANSWER] normalizedAnswer: "${normalizedAnswer.substring(0, 100)}"`);
            console.error(`[MOCK ANSWER] rewriteObj.text: "${rewriteObj.text.substring(0, 100)}"`);
        }

        // UPSERT attempt (insert or update if session_id + question_id already exists)
        console.log(`MOCK_ATTEMPT_UPSERT sessionId=${sessionId} questionId=${questionId}`);
        const { data: attempt, error: attemptError } = await supabase
            .from('mock_attempts')
            .upsert({
                session_id: sessionId,
                question_id: questionId,
                question_text: questionText,
                answer_text: normalizedAnswer, // ALWAYS persist normalized answer
                audio_url: audioUrl,
                score: evaluation.score,
                feedback: evaluation.feedback,
                bullets: evaluation.bullets,
                clearer_rewrite: rewriteObj.text,
                vocabulary: usedVocab,
                what_worked: signals,
                improve_next: improveNext,
                hiring_manager_heard: interpretation
            }, {
                onConflict: 'session_id,question_id', // Unique constraint columns
                ignoreDuplicates: false // Update existing row instead of ignoring
            })
            .select()
            .single();

        if (attemptError) {
            console.error('[MOCK ANSWER] ❌ ATTEMPT UPSERT FAILED:');
            console.error('Error Code:', attemptError.code);
            console.error('Error Message:', attemptError.message);
            console.error('Error Details:', JSON.stringify(attemptError, null, 2));
            return res.status(500).json({
                error: 'Failed to save answer',
                code: attemptError.code,
                details: attemptError.message
            });
        }

        console.log(`[MOCK ANSWER] ✅ ATTEMPT UPSERTED: id=${attempt.id}, score=${attempt.score}, answer_length=${normalizedAnswer.length}`);

        // DEBUG: Verify verbatim transcript is preserved separately from rewrite
        const savedTranscript = attempt.answer_text || '';
        const savedRewrite = attempt.clearer_rewrite || '';
        console.log(`[MOCK ANSWER] 📝 Saved transcript: length=${savedTranscript.length} preview="${savedTranscript.substring(0, 60)}${savedTranscript.length > 60 ? '...' : ''}"`);
        console.log(`[MOCK ANSWER] ✨ Saved rewrite: length=${savedRewrite.length} preview="${savedRewrite.substring(0, 60)}${savedRewrite.length > 60 ? '...' : ''}"`);

        if (savedTranscript === savedRewrite && savedTranscript.length > 0) {
            console.warn(`[MOCK ANSWER] ⚠️ WARNING: Transcript and rewrite are identical! This should not happen.`);
        }

        // Get session progress
        const { data: attempts } = await supabase
            .from('mock_attempts')
            .select('*')
            .eq('session_id', sessionId);

        const progress = {
            answered: attempts?.length || 1,
            score: evaluation.score,
            feedback: evaluation.bullets
        };

        return res.json({
            success: true,
            score: evaluation.score,
            feedback: evaluation.bullets,
            progress,
            // Return full data for immediate UI update if needed
            rewrite: rewriteObj.text,
            vocabulary: usedVocab,
            interpretation
        });

    } catch (error) {
        console.error("Error saving mock interview answer:", error);
        return res.status(500).json({ error: "Failed to save answer" });
    }
});

// GET /api/mock-interview/summary?sessionId=...
router.get("/mock-interview/summary", async (req, res) => {
    try {
        // CRITICAL: Disable caching to prevent 304 Not Modified responses
        // Browser was showing stale yourAnswer data due to ETag caching
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.set('Surrogate-Control', 'no-store');

        // HOTFIX: Normalize sessionId - accept both camelCase and snake_case
        const sessionId = req.query.sessionId || req.query.session_id;

        // Defensive logging
        console.log(`MOCK_SUMMARY_IN sessionId=${sessionId || 'MISSING'}`);

        if (!sessionId) {
            return res.status(400).json({ error: "sessionId required" });
        }

        // Fetch session details (for interview_type)
        console.log(`[MOCK SUMMARY] Querying session details for: ${sessionId}`);
        const { data: sessionData, error: sessionError } = await supabase
            .from('mock_sessions')
            .select('interview_type')
            .eq('session_id', sessionId)
            .single();

        if (sessionError && sessionError.code !== 'PGRST116') {
            console.error('[MOCK SUMMARY] ⚠️ Failed to fetch session type:', sessionError.message);
        }

        const interviewType = sessionData?.interview_type || 'short';
        // Determine totalQuestions based on interview type
        const totalQuestions = interviewType === 'long' ? 10 : 5;

        // Fetch all attempts for this session
        console.log(`[MOCK SUMMARY] Querying attempts for session_id: ${sessionId}`);
        const { data: attempts, error: attemptsError } = await supabase
            .from('mock_attempts')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (attemptsError) {
            console.error('[MOCK SUMMARY] ❌ Query FAILED:', JSON.stringify(attemptsError, null, 2));
            return res.status(500).json({ error: 'Failed to fetch attempts', details: attemptsError.message });
        }

        console.log(`MOCK_SUMMARY_FETCH sessionId=${sessionId} attemptsCount=${attempts?.length || 0} type=${interviewType}`);

        // CRITICAL: Filter out attempts with empty answer_text
        const validAttempts = (attempts || []).filter(attempt => {
            const hasAnswer = attempt.answer_text && attempt.answer_text.trim().length > 0;
            if (!hasAnswer) {
                console.log(`[MOCK SUMMARY] Filtering out attempt ${attempt.id} - empty answer_text`);
            }
            return hasAnswer;
        });

        // CRITICAL: Deduplicate by question_id, keeping only the latest attempt per question
        // Sort by created_at descending (newest first)
        const sortedAttempts = validAttempts.sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return dateB - dateA; // Descending order
        });

        // Build Map: question_id -> first (newest) attempt with non-empty answer
        const attemptsByQuestion = new Map();
        for (const attempt of sortedAttempts) {
            const qid = attempt.question_id;
            if (!attemptsByQuestion.has(qid)) {
                attemptsByQuestion.set(qid, attempt);
            }
        }

        // Convert to array and cap at totalQuestions
        const uniqueAttempts = Array.from(attemptsByQuestion.values());
        const cappedAttempts = uniqueAttempts.slice(0, totalQuestions);

        console.log(`[MOCK SUMMARY] Valid attempts: ${validAttempts.length}, Unique by question_id: ${uniqueAttempts.length}, Capped: ${cappedAttempts.length}, Total allowed: ${totalQuestions}`);

        if (cappedAttempts && cappedAttempts.length > 0) {
            console.log(`[MOCK SUMMARY] ✅ Found ${cappedAttempts.length} valid attempts`);
            console.log(`[MOCK SUMMARY] Sample attempt IDs:`, cappedAttempts.slice(0, 3).map(a => a.id));
        } else {
            console.log(`MOCK_SUMMARY_EMPTY sessionId=${sessionId}`);
            console.log(`[MOCK SUMMARY] ⚠️ No valid attempts found for session ${sessionId}`);
        }

        // Generate summary from valid attempts only
        const summary = generateSessionSummary(cappedAttempts || [], 'mock');
        const recommendation = getHiringRecommendation(summary.overall_score);

        // Extract hiring_manager_heard from latest valid attempt
        let hiring_manager_heard = "Keep practicing to build stronger interview responses.";
        if (cappedAttempts && cappedAttempts.length > 0) {
            const latestAttempt = cappedAttempts[cappedAttempts.length - 1];
            if (latestAttempt.hiring_manager_heard && latestAttempt.hiring_manager_heard.trim()) {
                hiring_manager_heard = latestAttempt.hiring_manager_heard;
            }
        }

        // Extract improvedExample from best valid attempt (highest score)
        let improvedExample = "";
        if (cappedAttempts && cappedAttempts.length > 0) {
            const bestAttempt = cappedAttempts.reduce((best, current) =>
                (current.score || 0) > (best.score || 0) ? current : best
            );

            if (bestAttempt.clearer_rewrite && bestAttempt.clearer_rewrite.trim()) {
                const firstSentence = bestAttempt.clearer_rewrite.split(/[.!?]/).filter(s => s.trim().length > 0)[0];
                if (firstSentence) {
                    improvedExample = firstSentence.trim() + '.';
                }
            }
        }

        // Generate per-question breakdown from capped attempts
        const perQuestion = generatePerQuestionBreakdown(cappedAttempts);

        // Calculate strongest area from strengths
        let strongest_area = "N/A";
        if (summary.strengths && summary.strengths.length > 0) {
            const firstStrength = summary.strengths[0].toLowerCase();
            if (firstStrength.includes('clear') || firstStrength.includes('articulate')) {
                strongest_area = "Clarity";
            } else if (firstStrength.includes('structure') || firstStrength.includes('organized')) {
                strongest_area = "Structure";
            } else if (firstStrength.includes('metric') || firstStrength.includes('quantif') || firstStrength.includes('number')) {
                strongest_area = "Detail";
            } else if (firstStrength.includes('relevant') || firstStrength.includes('address')) {
                strongest_area = "Relevance";
            } else if (firstStrength.includes('confiden')) {
                strongest_area = "Confidence";
            } else {
                strongest_area = "Communication";
            }
        }

        // Generate varied biggest_risk_detail
        const biggest_risk_detail = generateRiskDetail(summary.weaknesses, summary.overall_score);

        // CRITICAL: attemptCount must equal capped valid attempts (non-empty, not exceeding totalQuestions)
        const actualAttemptCount = cappedAttempts?.length || 0;

        // CRITICAL LOGGING: Verify count accuracy
        console.log(`[MOCK SUMMARY] ═══ ATTEMPT COUNT BREAKDOWN ═══`);
        console.log(`[MOCK SUMMARY] Total attempts fetched from DB: ${attempts?.length || 0}`);
        console.log(`[MOCK SUMMARY] Valid (non-empty answer_text): ${validAttempts.length}`);
        console.log(`[MOCK SUMMARY] Unique by question_id: ${uniqueAttempts.length}`);
        console.log(`[MOCK SUMMARY] Capped at totalQuestions (${totalQuestions}): ${cappedAttempts.length}`);
        console.log(`[MOCK SUMMARY] FINAL attemptCount: ${actualAttemptCount}`);
        console.log(`[MOCK SUMMARY] ═══════════════════════════════`);

        if (actualAttemptCount > totalQuestions) {
            console.error(`[MOCK SUMMARY] ❌ CRITICAL BUG: attemptCount (${actualAttemptCount}) > totalQuestions (${totalQuestions})!`);
        }

        console.log(`[MOCK SUMMARY] Counts - attempts: ${actualAttemptCount}, totalQuestions: ${totalQuestions}, perQuestion: ${perQuestion.length}`);

        // Update session with computed summary
        const { error: updateError } = await supabase
            .from('mock_sessions')
            .update({
                overall_score: summary.overall_score,
                summary: {
                    strengths: summary.strengths,
                    weaknesses: summary.weaknesses,
                    bullets: summary.bullets,
                    recommendation
                },
                completed: summary.completed
            })
            .eq('session_id', sessionId);

        if (updateError) {
            console.error('[MOCK SUMMARY] Error updating session:', updateError);
        }

        console.log(`[MOCK SUMMARY] Generated summary for session ${sessionId}, score: ${summary.overall_score}, attempts: ${actualAttemptCount}`);

        // VERIFICATION LOG: Show what we're sending to frontend
        if (perQuestion && perQuestion.length > 0) {
            console.log(`[SUMMARY] sending yourAnswer preview: "${perQuestion[0]?.yourAnswer?.slice(0, 80) || '(empty)'}"`);
            console.log(`[SUMMARY] sending rewrite preview: "${perQuestion[0]?.strongerExample?.text?.slice(0, 80) || '(empty)'}"`);
        }

        // totalQuestions determined earlier based on session data


        return res.json(shapeMockSummaryResponse({
            version: "summary_fix_v3",
            sessionId,
            attemptCount: actualAttemptCount, // Use actual count from DB, not inflated
            totalQuestions,
            overall_score: summary.overall_score,
            strengths: summary.strengths,
            weaknesses: summary.weaknesses,
            improvements: summary.weaknesses,
            points_to_focus: summary.weaknesses,
            risks: [],
            biggest_risk: summary.weaknesses[0] || "No major risks identified",
            biggest_risk_detail,
            biggestRisk: summary.weaknesses[0] || "No major risks identified",
            strongest_area,
            bullets: summary.bullets,
            recommendation,
            completed: summary.completed,
            hiring_manager_heard,
            improvedExample,
            perQuestion
        }));

    } catch (error) {
        console.error("Error generating mock interview summary:", error);
        return res.status(500).json({ error: "Failed to generate summary" });
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
