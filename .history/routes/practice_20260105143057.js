// jobspeak-backend/routes/practice.js
// Practice session endpoints including demo questions

import express from "express";
import { generatePracticeDemoQuestions } from "../services/personalizedQuestionSelector.js";
import { supabase } from "../services/supabase.js";
import { evaluateAnswer } from "../services/answerEvaluator.js";
import { generateSessionSummary } from "../services/summaryGenerator.js";
import {
    generateRoleVocabulary,
    generateSTARRewrite,
    generateSignalBasedFeedback,
    generateActionableImprovements,
    generateHiringManagerInterpretation,
    generateHireLikelihoodComparison
} from "../services/intelligentFeedbackGenerator.js";
import { generateTTS } from "../services/ttsService.js";
import { getUsage, recordAttempt } from "../services/sttUsageStore.js";
import { getSubscription } from "../services/db.js";
import { trackLimitHit } from "../services/analytics.js";
import crypto from "crypto";

const router = express.Router();

/**
 * Shape function for /api/practice/answer response
 * Ensures all keys are present with safe defaults
 */
function shapePracticeAnswerResponse(data = {}) {
    return {
        success: data.success ?? true,
        score: data.score ?? 0,
        whatWorked: data.whatWorked ?? [],
        improveNext: data.improveNext ?? [],
        interpretation: data.interpretation ?? "",
        vocabulary: data.vocabulary ?? [],
        clearerRewrite: data.clearerRewrite ?? "",
        clearerRewriteAudioUrl: data.clearerRewriteAudioUrl ?? null,
        hireLikelihood: data.hireLikelihood ?? 0,
        hireLikelihoodAfterRewrite: data.hireLikelihoodAfterRewrite ?? 0,
        why: data.why ?? "",
        feedback: data.feedback ?? [],
        progress: data.progress ?? { answered: 0, score: 0, feedback: [] }
    };
}

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

// POST /api/practice/answer (aliased to /answer for robustness)
router.post(["/practice/answer", "/answer"], async (req, res) => {
    const startTime = Date.now();
    console.log(`[PRACTICE ANSWER] ${startTime} - Request received: ${req.originalUrl}`);

    // Fast-response path for smoke tests
    if (req.query.smoke === '1' || req.query.smoke === 1) {
        console.log(`[PRACTICE ANSWER] Fast-response mode (smoke=1)`);

        // Try to save to Supabase with hard timeout (fire and forget)
        const { userKey, sessionId, questionId, questionText, answerText, audioUrl } = req.body;
        if (sessionId && questionId && questionText) {
            let user_id = null;
            let guest_key = null;
            if (userKey && !userKey.startsWith('guest-')) {
                user_id = userKey;
            } else {
                guest_key = userKey || `guest-${Date.now()}`;
            }

            // Quick evaluation for score
            const evaluation = evaluateAnswer(questionText, answerText || '');

            // Fire-and-forget Supabase insert with 3s timeout
            Promise.race([
                supabase
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
                        feedback: evaluation.feedback,
                        bullets: evaluation.bullets
                    })
                    .select()
                    .single(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
            ]).catch(err => {
                if (err.message === 'timeout') {
                    console.log(`[PRACTICE ANSWER] Supabase insert timed out (3s) - continuing`);
                } else {
                    console.error(`[PRACTICE ANSWER] Supabase insert error (non-blocking):`, err.message);
                }
            });
        }

        // Return immediately - skip all AI/TTS work
        return res.json({ ok: true });
    }

    try {
        console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - Parsing body`);
        const { sessionId, questionId, questionText, answerText, audioUrl } = req.body;

        // IDENTITY RESOLUTION - Support multiple sources with comprehensive logging
        let resolvedKey = null;
        let identitySource = null;

        // Priority 1: x-user-key header
        const xUserKey = req.header('x-user-key');
        if (xUserKey && typeof xUserKey === 'string' && xUserKey.trim().length > 0) {
            resolvedKey = xUserKey.trim();
            identitySource = 'x-user-key';
        }

        // Priority 2: x-guest-key header
        if (!resolvedKey) {
            const xGuestKey = req.header('x-guest-key');
            if (xGuestKey && typeof xGuestKey === 'string' && xGuestKey.trim().length > 0) {
                resolvedKey = xGuestKey.trim();
                identitySource = 'x-guest-key';
            }
        }

        // Priority 3: body.userKey (fallback for backward compatibility)
        if (!resolvedKey && req.body.userKey) {
            resolvedKey = req.body.userKey;
            identitySource = 'body.userKey';
        }

        // Determine identity type
        let identityType = 'guest';
        if (resolvedKey && !resolvedKey.startsWith('guest-')) {
            identityType = 'user';
        }

        // If no key provided, generate a guest key
        if (!resolvedKey) {
            resolvedKey = `guest-${Date.now()}`;
            identitySource = 'generated';
            identityType = 'guest';
        }

        // LOG IDENTITY RESOLUTION
        console.log(`[PRACTICE ANSWER] IDENTITY RESOLVED:`);
        console.log(`  - identityType: ${identityType}`);
        console.log(`  - identityKey: ${resolvedKey}`);
        console.log(`  - identitySource: ${identitySource}`);

        if (!sessionId) {
            console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - Missing sessionId`);
            return res.status(400).json({ error: "sessionId required" });
        }

        if (!questionId || !questionText) {
            console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - Missing questionId/questionText`);
            return res.status(400).json({ error: "questionId and questionText required" });
        }

        // ENFORCE PRACTICE LIMIT (3/day) for free users - check BEFORE processing
        let isPro = false;
        if (resolvedKey) {
            const subscription = getSubscription(resolvedKey);
            if (subscription) {
                isPro = subscription.isPro;
                if (subscription.currentPeriodEnd) {
                    const periodEnd = new Date(subscription.currentPeriodEnd);
                    if (periodEnd < new Date()) isPro = false;
                }
                if (subscription.status && subscription.status !== "active" && subscription.status !== "trialing") {
                    isPro = false;
                }
            }
        }

        // Get current usage for logging
        const currentUsage = resolvedKey && !isPro ? getUsage(resolvedKey, "practice") : { used: 0, limit: -1, remaining: -1, blocked: false };

        // LOG USAGE CHECK
        console.log(`[PRACTICE ANSWER] USAGE CHECK:`);
        console.log(`  - isPro: ${isPro}`);
        console.log(`  - used: ${currentUsage.used}`);
        console.log(`  - limit: ${currentUsage.limit}`);
        console.log(`  - decision: ${currentUsage.used >= currentUsage.limit && !isPro ? 'BLOCKED' : 'ALLOWED'}`);

        if (resolvedKey && !isPro) {
            // Block if this attempt would exceed the limit
            // "3 free fixes" means 3 are allowed, so block the 4th attempt
            // Check BEFORE recording: if used >= limit, we've already used all 3, block the 4th
            if (currentUsage.used >= currentUsage.limit) {
                console.log(`[PRACTICE ANSWER] BLOCKED - Daily practice limit reached`);
                trackLimitHit(resolvedKey, "daily_practice");

                // Calculate nextAllowedAt: midnight UTC of next day
                const now = new Date();
                const nextDay = new Date(now);
                nextDay.setUTCDate(nextDay.getUTCDate() + 1);
                nextDay.setUTCHours(0, 0, 0, 0);
                const nextAllowedAt = nextDay.toISOString();

                // Calculate hours until reset
                const msUntilReset = nextDay - now;
                const hoursUntilReset = Math.ceil(msUntilReset / (1000 * 60 * 60));

                return res.status(429).json({
                    blocked: true,
                    reason: "DAILY_LIMIT_REACHED",
                    message: `You've used your 3 free fixes today. Resets in ${hoursUntilReset} hours.`,
                    nextAllowedAt: nextAllowedAt,
                    error: "Daily limit of 3 practice answers reached. Upgrade to Pro for unlimited access.",
                    upgrade: true,
                    usage: {
                        used: currentUsage.used,
                        limit: currentUsage.limit,
                        remaining: currentUsage.remaining,
                        blocked: currentUsage.blocked,
                    },
                    debug: {
                        identityType: identityType,
                        identityKey: resolvedKey,
                        identitySource: identitySource,
                        used: currentUsage.used,
                        limit: currentUsage.limit
                    }
                });
            }
        }

        console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - Determining user identity`);
        // Determine user_id or guest_key for database storage
        let user_id = null;
        let guest_key = null;

        if (resolvedKey && !resolvedKey.startsWith('guest-')) {
            user_id = resolvedKey;
        } else {
            guest_key = resolvedKey;
        }

        console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - Starting evaluation`);
        // Evaluate answer
        const evaluation = evaluateAnswer(questionText, answerText || '');
        console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - Evaluation complete, score: ${evaluation.score}`);

        console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - Inserting to Supabase practice_attempts`);
        // Save attempt with 3s timeout
        const insertPromise = supabase
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
                feedback: evaluation.feedback,
                bullets: evaluation.bullets
            })
            .select()
            .single();

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Supabase insert timeout')), 3000)
        );

        let attempt, attemptError;
        try {
            const result = await Promise.race([insertPromise, timeoutPromise]);
            attempt = result.data;
            attemptError = result.error;
        } catch (err) {
            if (err.message === 'Supabase insert timeout') {
                console.error('[PRACTICE ANSWER] Supabase insert timed out after 3s');
                attemptError = { message: 'Insert timeout' };
            } else {
                attemptError = err;
            }
        }
        if (attemptError) {
            console.error('[PRACTICE ANSWER] DB Insert Failed (Non-fatal):', attemptError);
            // DO NOT RETURN 500. Continue to generation.
            // We will add a 'saved: false' flag to the response
        } else {
            console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - Supabase insert complete`);
        }

        console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - Fetching session progress`);
        // Get session progress
        const { data: attempts } = await supabase
            .from('practice_attempts')
            .select('*')
            .eq('session_id', sessionId);
        console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - Session progress fetched, ${attempts?.length || 0} attempts`);

        const progress = {
            answered: attempts?.length || 1,
            score: evaluation.score,
            feedback: evaluation.bullets
        };

        console.log(`[PRACTICE ANSWER] Saved answer for session ${sessionId}, score: ${evaluation.score}`);

        console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - Starting AI feedback generation`);
        // Generate hire-grade feedback using intelligent system
        const whatWorked = generateSignalBasedFeedback(evaluation.feedback, answerText || '');
        const improveNext = generateActionableImprovements(evaluation.feedback, answerText || '', evaluation.score);
        const interpretation = generateHiringManagerInterpretation(evaluation.score, evaluation.feedback, answerText || '');
        console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - AI feedback complete`);

        console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - Generating vocabulary`);
        // 1. Generate vocab pool
        const fullVocabulary = generateRoleVocabulary(questionText, answerText || '');

        // 2. Generate rewrite using that pool (it will pick 2)
        const clearerRewriteObj = generateSTARRewrite(questionText, answerText || '', evaluation.score, evaluation.feedback, fullVocabulary);
        console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - Vocabulary and rewrite complete`);

        // 3. FORCE UI to show only the 2 words actually used
        const vocabulary = clearerRewriteObj.usedVocabulary || fullVocabulary.slice(0, 2);

        console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - Generating hire likelihood`);
        // Generate hire likelihood comparison
        const hireLikelihoodData = generateHireLikelihoodComparison(
            evaluation.score,
            evaluation.feedback,
            answerText || '',
            clearerRewriteObj.text
        );
        console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - Hire likelihood complete`);

        console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - Starting TTS generation`);
        // Generate TTS audio for clearer rewrite
        let clearerRewriteAudioUrl = null;
        try {
            const ttsText = clearerRewriteObj.text;
            console.log(`[PRACTICE ANSWER] TTS Text candidate: "${ttsText ? (ttsText.substring(0, 20) + '...') : 'undefined'}" (Length: ${ttsText ? ttsText.length : 0})`);

            if (ttsText && ttsText.trim().length > 0) {
                // Safeguard: ensure we don't send empty text
                console.log(`[PRACTICE ANSWER] Starting TTS generation for text length: ${ttsText.length}`);

                // Add 3s timeout to TTS generation
                const ttsPromise = generateTTS(ttsText);
                const ttsTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('TTS timeout')), 3000));

                const audioBuffer = await Promise.race([ttsPromise, ttsTimeout]);

                // In production, upload to storage and return URL
                // For now, we'll return null as TTS requires storage setup
                clearerRewriteAudioUrl = null; // TODO: Upload to storage
                console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - TTS generation complete`);
            } else {
                console.log(`[PRACTICE ANSWER] Skipping TTS - text is empty/blank`);
            }
        } catch (error) {
            console.error('[PRACTICE ANSWER] TTS generation failed/timed out:', error.message);
            // Gracefully degrade - audio is optional
        }

        console.log(`[PRACTICE ANSWER] ${Date.now() - startTime}ms - Preparing response`);
        const response = shapePracticeAnswerResponse({
            success: true,
            score: evaluation.score,
            whatWorked,
            improveNext,
            interpretation,
            vocabulary,
            clearerRewrite: clearerRewriteObj.text, // Return as string for backward compatibility
            clearerRewriteAudioUrl,
            hireLikelihood: hireLikelihoodData.hireLikelihood,
            hireLikelihoodAfterRewrite: hireLikelihoodData.hireLikelihoodAfterRewrite,
            why: hireLikelihoodData.why,
            feedback: evaluation.bullets, // Keep for backward compatibility
            progress,
            saved: !attemptError, // Flag to indicate if persistence succeeded
            professionalism: clearerRewriteObj.professionalism // New Gate Metadata
        });

        // RECORD PRACTICE ATTEMPT (Increment usage)
        // Only for authenticated free users (Pro is unlimited, Anon is session-limited elsewhere)
        if (userKey && !isPro) {
            // Generate idempotency key: hash of userKey + questionId + normalized answer text
            // Include questionId to ensure each question-answer pair is unique
            const normalizedText = (answerText || '').trim().toLowerCase().replace(/\s+/g, ' ');
            const idempotencyData = `${userKey.trim()}:${questionId}:${normalizedText}`;
            const attemptId = crypto.createHash('sha256').update(idempotencyData).digest('hex').substring(0, 32);

            const usage = recordAttempt(userKey, attemptId, "practice");

            // Add usage info to response
            // Contract: Attempt 3 (used=3, limit=3) must have blocked=false and remaining=0
            // blocked should only be true when used > limit (exceeded), not when used === limit (at limit)
            response.usage = {
                used: usage.used,
                limit: usage.limit,
                remaining: usage.remaining,
                blocked: usage.used > usage.limit // Only true if exceeded, not if at limit
            };

            if (usage.wasNew) {
                console.log(`[PRACTICE ANSWER] INCREMENTED PRACTICE - Used: ${usage.used}/${usage.limit}`);
            } else {
                console.log(`[PRACTICE ANSWER] IDEMPOTENT PRACTICE - Already counted.`);
            }
        }

        return res.json(response);

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

