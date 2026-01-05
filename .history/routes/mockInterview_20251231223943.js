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
    if (uniqueVocab.length < 2) {
        const fallbacks = ["Articulate", "Quantify", "Clarify", "Synthesize", "Prioritize", "Validate"];
        for (const fb of fallbacks) {
            const lower = fb.toLowerCase();
            if (!usedSet.has(lower)) {
                // Ensure it's in VOCAB_DATA for full fields
                if (VOCAB_DATA[lower]) {
                    uniqueVocab.push(normalizeVocabEntry(fb));
                } else {
                    // Manual fallback if not in VOCAB_DATA (should match standard structure)
                    uniqueVocab.push({
                        word: fb,
                        ipa: "",
                        accent: "US",
                        audioText: fb,
                        pos: "verb",
                        definition: "To express clearly", // Generic filler
                        example: `It is important to ${fb.toLowerCase()} your thoughts.`
                    });
                }
                usedSet.add(lower);
            }
            if (uniqueVocab.length >= 2) break;
        }
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
 * Main helper to generate per-question breakdown enforcing uniqueness
 */
function generatePerQuestionBreakdown(attempts) {
    const usedVocabWords = new Set();

    return (attempts || []).map((attempt, index) => {
        // 1. Get vocab candidates
        let rawVocab = attempt.vocabulary || [];
        if (!Array.isArray(rawVocab)) rawVocab = [];

        // 2. Pick unique words
        const finalVocab = pickUniqueVocabWords(rawVocab, usedVocabWords);

        // 3. Underlined words matches exactly
        const underlinedWords = finalVocab.map(v => v.word);

        // 4. Strip HTML from clearer_rewrite
        let cleanText = stripHtml(attempt.clearer_rewrite || "");

        // Vary the intro checking against common boilerplate
        if (cleanText.startsWith("In a previous role,")) {
            // Simple variations for common start
            const intros = ["When I was working as...", "During my time at...", "In a past project,"];
            const newIntro = intros[index % intros.length];
            cleanText = cleanText.replace("In a previous role,", newIntro);
        }

        // 5. Ensure transcript
        const transcript = attempt.answer_text || "";

        return {
            questionId: attempt.question_id || `q${index + 1}`,
            questionText: attempt.question_text || "",
            answerText: transcript,
            answer_text: transcript,
            transcript: transcript,
            score: attempt.score || 0,
            whatWorked: varyBullets(attempt.what_worked, index, 'positive'),
            improveNext: varyBullets(attempt.improve_next, index, 'negative'),
            strongerExample: {
                text: cleanText,
                vocab: finalVocab,
                underlinedWords
            }
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
router.post("/mock-interview/answer", async (req, res) => {
    try {
        const contentType = req.headers['content-type'] || 'unknown';
        console.log(`[MOCK ANSWER] Content-Type: ${contentType}`);

        const { userKey, sessionId, questionId, questionText, answerText, audioUrl, interviewType } = req.body;

        // Defensive logging
        console.log(`MOCK_ANSWER_IN sessionId=${sessionId || 'MISSING'} questionId=${questionId || 'MISSING'}`);
        console.log(`[MOCK ANSWER] Request received - sessionId=${sessionId}, questionId=${questionId}, userKey=${userKey}`);

        // Checking missing fields
        const missingFields = [];
        if (!sessionId) missingFields.push("sessionId");
        if (!questionId) missingFields.push("questionId");
        if (!questionText) missingFields.push("questionText");

        if (missingFields.length > 0) {
            const errorMsg = `Missing required fields: ${missingFields.join(', ')}`;
            console.error(`[MOCK ANSWER] ❌ 400 Bad Request: ${errorMsg}`);
            return res.status(400).json({
                error: errorMsg,
                missing: missingFields
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
        }

        // Evaluate answer
        const evaluation = evaluateAnswer(questionText, answerText || '');

        // --- INTELLIGENT FEEDBACK GENERATION ---
        const fullVocabulary = generateRoleVocabulary(questionText, answerText || '');
        const rewriteObj = generateSTARRewrite(questionText, answerText || '', evaluation.score, evaluation.feedback, fullVocabulary);
        const improveNext = generateActionableImprovements(evaluation.feedback, answerText || '', evaluation.score);
        const signals = generateSignalBasedFeedback(evaluation.feedback, answerText || '');
        const interpretation = generateHiringManagerInterpretation(evaluation.score, evaluation.feedback, answerText || '');

        const usedVocab = rewriteObj.usedVocabulary || fullVocabulary.slice(0, 2);

        // Save attempt
        console.log(`MOCK_ATTEMPT_SAVE sessionId=${sessionId} questionId=${questionId}`);
        const { data: attempt, error: attemptError } = await supabase
            .from('mock_attempts')
            .insert({
                session_id: sessionId,
                question_id: questionId,
                question_text: questionText,
                answer_text: answerText,
                audio_url: audioUrl,
                score: evaluation.score,
                feedback: evaluation.feedback,
                bullets: evaluation.bullets,
                clearer_rewrite: rewriteObj.text,
                vocabulary: usedVocab,
                what_worked: signals,
                improve_next: improveNext,
                hiring_manager_heard: interpretation
            })
            .select()
            .single();

        if (attemptError) {
            console.error('[MOCK ANSWER] ❌ ATTEMPT INSERT FAILED:');
            console.error('Error Code:', attemptError.code);
            console.error('Error Message:', attemptError.message);
            console.error('Error Details:', JSON.stringify(attemptError, null, 2));
            return res.status(500).json({
                error: 'Failed to save answer',
                code: attemptError.code,
                details: attemptError.message
            });
        }

        console.log(`[MOCK ANSWER] ✅ ATTEMPT INSERTED SUCCESSFULLY: id=${attempt.id}, score=${attempt.score}`);

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
        const { sessionId } = req.query;

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

        if (attempts && attempts.length > 0) {
            console.log(`[MOCK SUMMARY] ✅ Found ${attempts.length} attempts`);
            console.log(`[MOCK SUMMARY] Sample attempt IDs:`, attempts.slice(0, 3).map(a => a.id));
        } else {
            console.log(`MOCK_SUMMARY_EMPTY sessionId=${sessionId}`);
            console.log(`[MOCK SUMMARY] ⚠️ No attempts found for session ${sessionId}`);
        }

        // Generate summary from real attempts
        const summary = generateSessionSummary(attempts || [], 'mock');
        const recommendation = getHiringRecommendation(summary.overall_score);

        // Extract hiring_manager_heard from latest attempt
        let hiring_manager_heard = "Keep practicing to build stronger interview responses.";
        if (attempts && attempts.length > 0) {
            const latestAttempt = attempts[attempts.length - 1];
            if (latestAttempt.hiring_manager_heard && latestAttempt.hiring_manager_heard.trim()) {
                hiring_manager_heard = latestAttempt.hiring_manager_heard;
            }
        }

        // Extract improvedExample from best attempt (highest score)
        let improvedExample = "";
        if (attempts && attempts.length > 0) {
            const bestAttempt = attempts.reduce((best, current) =>
                (current.score || 0) > (best.score || 0) ? current : best
            );

            if (bestAttempt.clearer_rewrite && bestAttempt.clearer_rewrite.trim()) {
                const firstSentence = bestAttempt.clearer_rewrite.split(/[.!?]/).filter(s => s.trim().length > 0)[0];
                if (firstSentence) {
                    improvedExample = firstSentence.trim() + '.';
                }
            }
        }

        // Generate per-question breakdown
        const perQuestion = generatePerQuestionBreakdown(attempts);

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

        console.log(`[MOCK SUMMARY] Generated summary for session ${sessionId}, score: ${summary.overall_score}, attempts: ${attempts?.length || 0}`);

        // totalQuestions determined earlier based on session data


        return res.json(shapeMockSummaryResponse({
            sessionId,
            attemptCount: attempts?.length || 0,
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
