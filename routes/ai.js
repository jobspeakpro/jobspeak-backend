// jobspeak-backend/routes/ai.js
import express from "express";
import dotenv from "dotenv";
import crypto from "crypto";
import { askGPT } from "../services/openaiService.js";
import { rateLimiter } from "../middleware/rateLimiter.js";
import { saveSessionWithIdempotency } from "../services/db.js";
const captureException = (err, context) => console.error("[SENTRY_FALLBACK]", err, context);
import { trackRewrite } from "../services/analytics.js";
import { getRecentQuestionIds, recordQuestionSeen } from "../services/db.js";
import { getProfile } from "../services/supabase.js";
import { getNextQuestion } from "../services/questionBank.js";
import { analyzeContent, extractProblematicQuote } from "../services/contentDetector.js";

import multer from "multer";
import fs from "fs";
import path from "path";
import { transcribeAudioFile } from "../services/audioTranscriber.js";
import { getUsage, recordAttempt, isBlocked } from "../services/sttUsageStore.js";
import { getSubscription } from "../services/db.js";
import { trackLimitHit } from "../services/analytics.js";


// Setup Multer for audio uploads
const tmpDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
const upload = multer({ dest: tmpDir, limits: { fileSize: 25 * 1024 * 1024 } });


const router = express.Router();

/**
 * POST /ai/calibrate-difficulty
 * Analyze an answer to determine recommended difficulty
 * Accepts:
 * - JSON: { "answer": "..." } or { "transcript": "..." } or { "text": "..." }
 * - Multipart form-data with "answer" or "transcript" field
 * - Multipart form-data with "audio" file
 * 
 * Always returns 200 with stable JSON:
 * { "recommended": "easy|normal|hard", "reason": "..." }
 * 
 * CRITICAL: Never returns HTML or 4xx for format issues
 */
router.post("/calibrate-difficulty", rateLimiter(20, 60000), upload.single("audio"), async (req, res) => {
  // Outer try-catch to handle ANY error (including body parsing errors)
  try {
    // 1. Normalize input: accept answer, transcript, or text
    // Safely access req.body with fallback to empty object
    const body = req.body || {};
    let answerText = body.answer || body.transcript || body.text || "";
    const { job_title, seniority } = body;

    // Debug Log (once)
    console.log("[CALIBRATE IN]", {
      hasAnswer: !!answerText,
      len: answerText?.length
    });

    try {
      // 2. If audio file provided and no text, transcribe it
      if (req.file && (!answerText || answerText.trim().length === 0)) {
        console.log("[CALIBRATE] Transcribing audio...");
        answerText = await transcribeAudioFile(req.file);
        console.log("[CALIBRATE] Transcribed length:", answerText.length);
        // Cleanup file
        fs.unlink(req.file.path, () => { });
      } else if (req.file) {
        // Cleanup unused file
        fs.unlink(req.file.path, () => { });
      }

      // 3. If still no valid input, return safe default (NOT a 400 error)
      if (!answerText || answerText.trim().length < 5) {
        return res.status(200).json({
          recommended: "normal",
          reason: "Not enough signal to assess—defaulting to Normal."
        });
      }

      // 4. Call OpenAI for analysis
      const SYSTEM_PROMPT = `You are an expert interviewer.
Analyze the candidate's answer to recommend a difficulty level for their next practice question.

CRITERIA:
- EASY: Short, vague, basic structure, lacks specifics.
- NORMAL: Structured (STAR), clear, some details, professional.
- HARD: Highly specific, STAR mastered, metrics/data included, addresses trade-offs/complexity.

OUTPUT JSON:
{
  "recommendedDifficulty": "easy|normal|hard",
  "reasons": ["string", "string"], 
  "confidence": "low|med|high"
}
`;
      const jsonResponse = await askGPT({
        prompt: `Candidate Role: ${job_title || "General"} (${seniority || "Mid"})
Answer: "${answerText}"

Recommend difficulty:`,
        systemPrompt: SYSTEM_PROMPT,
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(jsonResponse);

      // 5. Return stable response format (ONLY recommended and reason fields)
      return res.status(200).json({
        recommended: parsed.recommendedDifficulty?.toLowerCase() || "normal",
        reason: Array.isArray(parsed.reasons) ? parsed.reasons[0] : (parsed.reasons || "Analysis complete")
      });
    } catch (err) {
      console.error("[CALIBRATE ERROR]", err);
      // Cleanup file if error occurred before cleanup
      if (req.file) {
        fs.unlink(req.file.path, () => { });
      }

      // 6. Fallback: word-count heuristic (always return 200)
      const words = (answerText || "").split(/\s+/).length;
      let diff = "easy";
      if (words > 40) diff = "normal";
      if (words > 100) diff = "hard";

      return res.status(200).json({
        recommended: diff,
        reason: "Fallback analysis used due to service error."
      });
    }
  } catch (outerErr) {
    // CRITICAL: Catch-all for ANY unexpected error (e.g., malformed JSON body)
    console.error("[CALIBRATE CRITICAL ERROR]", outerErr);

    // Cleanup file if present
    if (req.file) {
      fs.unlink(req.file.path, () => { });
    }

    // Always return valid JSON, never HTML or error page
    return res.status(200).json({
      recommended: "normal",
      reason: "Unable to process request—defaulting to Normal."
    });
  }
});

/**
 * POST /ai/question
 * Generate a random tailored question
 */
router.post("/question", async (req, res) => {
  const { userKey, excludeQuestionIds = [], ...overrideContext } = req.body;

  let context = { ...overrideContext };
  let recentIds = [];

  // If userKey, load profile and history
  if (userKey) {
    const profile = getProfile(userKey);
    if (profile) {
      context = { ...profile, ...context }; // overrideContext takes precedence if passed
    }
    recentIds = getRecentQuestionIds(userKey, 15);
  }

  // Generate
  const question = getNextQuestion(context, recentIds, excludeQuestionIds);

  // Record history if userKey present
  if (userKey) {
    recordQuestionSeen(userKey, question.id);
  }

  return res.json(question);
});

/**
 * Deterministic fallback rubric if OpenAI is unavailable
 */
function deterministicAnalysis(text) {
  const wordCount = text.trim().split(/\s+/).length;
  // Simple heuristic: length -> score
  let score = 45;
  let label = "Okay";

  if (wordCount > 30) { score = 60; label = "Good"; }
  if (wordCount > 80) { score = 75; label = "Strong"; }

  return {
    score,
    label,
    whatWorked: ["You provided an answer."],
    improveNext: ["Expand on your specific actions.", "Include measurable results."],
    hiringManagerHeard: "A basic response that needs more detail.",
    vocabulary: []
  };
}

/**
 * Very simple local "improvement" if OpenAI fails.
 * - Trim spaces
 * - Collapse multiple spaces
 * - Capitalize first letter
 * - Add a period at the end if missing
 */
function simpleImprove(text) {
  if (!text) return "";
  let cleaned = text.trim().replace(/\s+/g, " ");
  if (cleaned.length === 0) return "";
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (!/[.!?]$/.test(cleaned)) {
    cleaned += ".";
  }
  return cleaned;
}

/**
 * POST /ai/micro-demo
 * Body: { text: string, userKey: string }
 *
 * Returns:
 * {
 *   original: string,
 *   improved: string,
 *   message: string
 * }
 * 
 * CRITICAL: This endpoint does NOT consume daily speaking attempts.
 * Only successful STT transcriptions (/api/stt) consume daily attempts.
 * This endpoint has its own separate rate limit (30/min) but NO usage limit.
 */
// Rate limiting: 30 requests per minute per IP (strict IP enforcement to prevent session refresh bypass)
router.post("/micro-demo", rateLimiter(30, 60000, (req) => req.ip || req.connection?.remoteAddress || 'unknown', "ai:"), async (req, res) => {
  const { text, userKey } = req.body;

  // Check if user is Pro
  let isPro = false;
  if (userKey) {
    const subscription = getSubscription(userKey);
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

  // ENFORCE PRACTICE LIMIT (3/day) for free users - check BEFORE processing
  if (userKey && !isPro) {
    const usage = getUsage(userKey, "practice");
    console.log(`[AI/micro-demo] Practice Usage check - userKey: ${userKey}, used: ${usage.used}/${usage.limit}`);

    // Block if this attempt would exceed the limit
    // "3 free fixes" means 3 are allowed, so block the 4th attempt
    // Check BEFORE recording: if used >= limit, we've already used all 3, block the 4th
    if (usage.used >= usage.limit) {
      console.log(`[AI/micro-demo] BLOCKED - Daily practice limit reached`);
      trackLimitHit(userKey, "daily_practice");
      
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
          used: usage.used,
          limit: usage.limit,
          remaining: usage.remaining,
          blocked: usage.blocked,
        },
      });
    }
  }

  // Validate text input size (max 5000 characters)
  if (!text || !text.trim()) {
    return res
      .status(400)
      .json({ error: "Please provide your answer text." });
  }

  if (text.length > 5000) {
    return res
      .status(400)
      .json({ error: "Text input is too long. Maximum 5000 characters allowed." });
  }

  const baseResponse = {
    original: text,
    message:
      "Great! Now read this answer out loud 2–3 times to build speaking confidence.",
  };

  const hasKey = !!process.env.OPENAI_API_KEY;

  let improved = "";
  let analysis = null;

  // If no key at all → use local simple improvement
  if (!hasKey) {
    console.warn(
      "No OPENAI_API_KEY found. Using simpleImprove fallback for /ai/micro-demo."
    );
    improved = simpleImprove(text);
  } else {
    // Try OpenAI first, but if it fails, fall back to simpleImprove
    // Try OpenAI first, but if it fails, fall back to simpleImprove
    try {
      // Fetch profile for context-aware analysis
      const profile = userKey ? getProfile(userKey) : null;
      const contextStr = profile
        ? `Role: ${profile.job_title} | Seniority: ${profile.seniority} | Industry: ${profile.industry}`
        : "Role: General Professional";

      const SYSTEM_PROMPT = `You are a professional interview coach.
Your task is to:
1. Rewrite the candidate's answer to be professional and hireable (field: "improved").
2. Analyze their original answer against a rubric (field: "analysis").

CONTEXT:
${contextStr}

NON-NEGOTIABLE SAFETY & RUBRIC RULES:
1. PROFANITY / VIOLENCE:
   - If found: set "professionalism" score < 50.
   - Mention it explicitly in "improveNext" using a quote.
2. MISSING RESULT:
   - If no outcome/impact mentioned: set "impact" score < 60.
3. MISSING STRUCTURE:
   - If not STAR (Situation-Task-Action-Result): set "structure" score < 60.

OUTPUT SCHEMA (JSON):
{
  "improved": "string (rewritten version, I-statement, 4-7 sentences)",
  "analysis": {
    "score": number (0-100),
    "label": "Okay|Good|Strong|Excellent",
    "rubricBreakdown": {
      "professionalism": number,
      "structure": number,
      "impact": number
    },
    "whatWorked": ["bullet string (MUST include short quote max 12 words)"],
    "improveNext": [
      "bullet string (specific critque)", 
      "bullet string (rewrite suggestion)",
      "bullet string (STAR structure suggestion)",
      "bullet string (metric/result prompt like 'Add metric like X')"
    ],
    "hiringManagerHeard": "string (1 sentence summary, MUST quote specific phrase)",
    "vocabulary": [
      { "word": "string", "partOfSpeech": "noun|verb|adj|etc", "definition": "string", "usage": "string" }
    ]
  }
}

SCORING RUBRIC:
- 40-50: Vague, short, or confusing OR Contains Profanity. Label: Okay
- 55-65: Professional but generic. Label: Good
- 70-80: Specific actions + some outcomes. Label: Strong
- 85+: Metrics + ownership + clarity. Label: Excellent

FEEDBACK REQUIREMENTS:
- "whatWorked": EACH item must include a short quote from the transcript as evidence (e.g. "You said 'xyz'...").
- "improveNext": 
    - MUST include a rewritten sentence.
    - MUST include a STAR structure suggestion.
    - MUST include a prompt to add a specific metric.
- "hiringManagerHeard": MUST quote a phrase that stood out.
- "vocabulary": Include 2 advanced, relevant terms. "partOfSpeech" is required (e.g., "noun", "verb").
`;

      const jsonResponse = await askGPT({
        prompt: `Analyze and rewrite this interview answer:
${text} `,
        systemPrompt: SYSTEM_PROMPT,
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(jsonResponse);
      improved = parsed.improved || simpleImprove(text);

      // Merge analysis into the base response
      // Merge analysis into the base response with normalization
      if (parsed.analysis) {
        const raw = parsed.analysis;

        // simple aliases map
        let w = raw.whatWorked || raw.strengths || raw.positives || raw.good || [];
        let i = raw.improveNext || raw.weaknesses || raw.negatives || raw.improvements || raw.feedback || [];

        // Ensure arrays
        if (!Array.isArray(w)) w = [typeof w === 'string' ? w : "Good clear answer."];
        if (!Array.isArray(i)) i = [typeof i === 'string' ? i : "Add more specific examples."];

        // Deterministic Fallback if empty
        if (w.length === 0) {
          w.push("You provided a structured response.");
          w.push(text.length > 100 ? "Good length and detail." : "You spoke clearly.");
        }
        if (i.length === 0) {
          i.push("Try to include more specific metrics (numbers/percentages).");
          i.push("Use the STAR method (Situation, Task, Action, Result).");
        }

        // Limit to max 3
        w = w.slice(0, 3);
        i = i.slice(0, 3);

        analysis = {
          score: typeof raw.score === 'number' ? raw.score : 60,
          label: raw.label || "Good",
          whatWorked: w,
          improveNext: i,
          hiringManagerHeard: raw.hiringManagerHeard || "A decent response, but could be more specific.",
          vocabulary: Array.isArray(raw.vocabulary) ? raw.vocabulary.slice(0, 2) : [],
          improved: improved,
          rubricBreakdown: raw.rubricBreakdown || { professionalism: 80, structure: 70, impact: 70 }
        };

        // --- FEEDBACK GROUNDING: CONTENT DETECTION ---
        // CRITICAL: Detect inappropriate content BEFORE AI can praise it
        const contentAnalysis = analyzeContent(text);

        if (contentAnalysis.hasInappropriateContent) {
          console.log("[CONTENT DETECTION]", {
            profanity: contentAnalysis.profanityDetected,
            sexual: contentAnalysis.sexualContentDetected,
            threats: contentAnalysis.threatsDetected
          });

          // FORCE professionalism score < 50
          analysis.rubricBreakdown.professionalism = 40;

          // CAP overall score at 45
          analysis.score = Math.min(analysis.score, 45);
          analysis.label = "Okay";

          // OVERRIDE whatWorked - neutral only, NO praise for professionalism
          analysis.whatWorked = [
            "You attempted to answer the question.",
            text.length > 50 ? "You provided some detail." : "You responded to the prompt."
          ];

          // OVERRIDE improveNext - must include content warning
          const improveItems = [];

          if (contentAnalysis.profanityDetected) {
            improveItems.push("Remove all profanity and unprofessional language from your response.");
          }
          if (contentAnalysis.sexualContentDetected) {
            improveItems.push("Avoid any sexual or inappropriate content in professional interviews.");
          }
          if (contentAnalysis.threatsDetected) {
            improveItems.push("Never mention violence, threats, or aggressive behavior in interviews.");
          }

          // Add STAR and metrics guidance
          improveItems.push("Use the STAR method (Situation, Task, Action, Result) to structure your answer.");
          improveItems.push("Add specific metrics or results to quantify your impact.");

          analysis.improveNext = improveItems.slice(0, 4);

          // OVERRIDE hiringManagerHeard - MUST quote actual problematic text
          const problematicQuote = extractProblematicQuote(text, contentAnalysis);
          analysis.hiringManagerHeard = problematicQuote
            ? `"${problematicQuote}" - This language is unprofessional and raises red flags.`
            : "Unprofessional language that would concern any hiring manager.";
        } else {
          // No inappropriate content - apply standard rubric checks

          // 1. Impact/Result Check (look for numbers or key result words)
          const resultRegex = /\d+|result|outcome|increased|reduced|saved|revenue|improved/i;
          if (!resultRegex.test(text)) {
            analysis.rubricBreakdown.impact = Math.min(analysis.rubricBreakdown.impact || 100, 55);
            // Ensure metric prompt exists
            if (!analysis.improveNext.some(s => s.toLowerCase().includes("metric") || s.toLowerCase().includes("result"))) {
              analysis.improveNext.push("Add a specific metric or result to quantify your impact.");
            }
          }

          // 2. Structure Check (heuristic: length)
          if (text.split(' ').length < 20) {
            analysis.rubricBreakdown.structure = Math.min(analysis.rubricBreakdown.structure || 100, 50);
          }
        }

        // --- VOCABULARY SURFACE-FORM VALIDATION ---
        // CRITICAL: Vocabulary words MUST appear verbatim in rewrite
        if (analysis.vocabulary && analysis.vocabulary.length > 0) {
          const improvedLower = improved.toLowerCase();
          const validatedVocab = [];

          for (const vocabItem of analysis.vocabulary) {
            if (!vocabItem.word) continue;

            // Check if word appears verbatim in rewrite (case-insensitive)
            const wordLower = vocabItem.word.toLowerCase();
            if (improvedLower.includes(wordLower)) {
              // Ensure partOfSpeech exists
              if (!vocabItem.partOfSpeech) {
                vocabItem.partOfSpeech = "unknown";
              }
              validatedVocab.push(vocabItem);
            } else {
              console.log(`[VOCAB DROPPED] "${vocabItem.word}" not found in rewrite`);
            }
          }

          analysis.vocabulary = validatedVocab;
          console.log(`[VOCAB VALIDATED] ${validatedVocab.length}/${analysis.vocabulary.length} items matched`);
        }
        // ----------------------------------------


        // Log the required analysis stats
        console.log("[ANALYZE OUT]", {
          score: analysis.score,
          whatWorked: analysis.whatWorked.length,
          improveNext: analysis.improveNext.length,
          hasVocab: analysis.vocabulary.length,
          hasImproved: !!analysis.improved,
          rubric: analysis.rubricBreakdown
        });
      }

      // Track rewrite success
      trackRewrite("success", userKey);
    } catch (err) {
      console.error("/ai/micro-demo error, falling back to simpleImprove:", err);

      // Track rewrite failure
      trackRewrite("fail", userKey, err.name || "openai_error");

      // Capture to Sentry
      captureException(err, {
        userKey,
        route: "/ai/micro-demo",
        requestId: req.requestId,
        errorType: "openai_error",
      });

      improved = simpleImprove(text);
      analysis = deterministicAnalysis(text);
      // Ensure deterministic analysis also follows the shape
      analysis.improved = improved;
    }
  }

  const response = { ...baseResponse, improved };
  if (analysis) {
    // Top-level analysis object
    response.analysis = analysis;
  }

  // Auto-save session server-side after interview submission
  // Uses idempotency key to avoid duplicates (e.g., from retries or double-clicks)
  if (userKey && text && text.trim()) {
    try {
      // Generate idempotency key: hash of userKey + normalized text
      // Normalize text by trimming and lowercasing to catch near-duplicates
      const normalizedText = text.trim().toLowerCase().replace(/\s+/g, ' ');
      const idempotencyData = `${userKey.trim()}:${normalizedText} `;
      const idempotencyKey = crypto
        .createHash('sha256')
        .update(idempotencyData)
        .digest('hex')
        .substring(0, 32); // Use first 32 chars as key

      const aiResponseJson = JSON.stringify(response);

      // Save session with idempotency (returns existing session if key exists, prevents duplicates)
      saveSessionWithIdempotency(
        userKey.trim(),
        text.trim(),
        aiResponseJson,
        null, // score
        idempotencyKey
      );
    } catch (saveError) {
      // Log but don't fail the request - session saving is non-critical
      console.error("Failed to auto-save session server-side:", saveError);
    }
  }

  // RECORD PRACTICE ATTEMPT (Increment usage)
  // Only for authenticated free users (Pro is unlimited, Anon is session-limited elsewhere)
  if (userKey && !isPro) {
    // We can use the same logic we used for idempotency above if available, or generate new
    const normalizedText = text.trim().toLowerCase().replace(/\s+/g, ' ');
    const idempotencyData = `${userKey.trim()}:${normalizedText} `;
    const attemptId = crypto.createHash('sha256').update(idempotencyData).digest('hex').substring(0, 32);

    const usage = recordAttempt(userKey, attemptId, "practice");

    // Add usage info to response
    response.usage = {
      used: usage.used,
      limit: usage.limit,
      remaining: usage.remaining,
      blocked: usage.blocked
    };

    if (usage.wasNew) {
      console.log(`[AI / micro - demo] INCREMENTED PRACTICE - Used: ${usage.used}/${usage.limit}`);
    } else {
      console.log(`[AI/micro-demo] IDEMPOTENT PRACTICE - Already counted.`);
    }

    // Check if recording this attempt exceeded the limit - if so, return blocked response
    if (usage.blocked && usage.used > usage.limit) {
      // This should not happen if limit check worked, but handle edge case
      console.log(`[AI/micro-demo] BLOCKED AFTER RECORDING - Daily practice limit exceeded`);
      
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
          used: usage.used,
          limit: usage.limit,
          remaining: usage.remaining,
          blocked: usage.blocked,
        },
      });
    }
  }

  return res.json(response);
});

export default router;
