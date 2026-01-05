// jobspeak-backend/services/intelligentFeedbackGenerator.js
// Hire-grade, role-aware feedback generation - ENHANCED VERSION

/**
 * Expanded role-specific vocabulary database with POS and why it helps
 */
const ROLE_VOCABULARY = {
    dentist: [
        { word: "Patient-centered care", phonetic: "", pos: "noun phrase", definition: "Prioritizing patient comfort and outcomes", example: "I focused on <u>patient-centered care</u> by explaining each step.", whyItHelps: "Shows empathy and professionalism" },
        { word: "Clinical efficacy", phonetic: "/ˈklɪnɪkəl ˈɛfɪkəsi/", pos: "noun", definition: "The effectiveness of a treatment", example: "I improved <u>clinical efficacy</u> by following new protocols.", whyItHelps: "Shows commitment to quality results" },
        { word: "Mitigate", phonetic: "/ˈmɪtɪɡeɪt/", pos: "verb", definition: "To reduce negative impact", example: "I helped <u>mitigate</u> anxiety by walking them through the process.", whyItHelps: "Shows proactive problem-solving" },
        { word: "Streamline", phonetic: "/ˈstriːmlaɪn/", pos: "verb", definition: "To make a process more efficient", example: "I <u>streamlined</u> the check-in forms to save time.", whyItHelps: "Shows efficiency focus" },
        { word: "Treatment protocol", phonetic: "", pos: "noun phrase", definition: "Standard procedure for specific conditions", example: "I followed the <u>treatment protocol</u> to ensure safety.", whyItHelps: "Signals systematic approach" },
        { word: "Connect", phonetic: "/kəˈnɛkt/", pos: "verb", definition: "To build a relationship or understanding", example: "I took time to <u>connect</u> with patients before starting.", whyItHelps: "Demonstrates strong interpersonal skills" }
    ],
    engineer: [
        { word: "Scalability", phonetic: "/ˌskeɪləˈbɪləti/", pos: "noun", definition: "Ability to handle growing workload", example: "I designed for <u>scalability</u> to support more users.", whyItHelps: "Shows forward-thinking design skills" },
        { word: "Technical debt", phonetic: "", pos: "noun phrase", definition: "Future rework cost from quick solutions", example: "We paid down <u>technical debt</u> by refactoring old code.", whyItHelps: "Shows long-term code quality focus" },
        { word: "Architect", phonetic: "/ˈɑːrkɪtɛkt/", pos: "verb", definition: "To design a system's structure", example: "I helped <u>architect</u> a more reliable backend.", whyItHelps: "Signals senior-level design capability" },
        { word: "Optimize", phonetic: "/ˈɑːptɪmaɪz/", pos: "verb", definition: "To improve efficiency or speed", example: "I <u>optimized</u> the query to run 50% faster.", whyItHelps: "Shows results-orientation" },
        { word: "Tradeoff", phonetic: "/ˈtreɪdɔːf/", pos: "noun", definition: "Balancing competing priorities", example: "I weighed the <u>tradeoff</u> between speed and cost.", whyItHelps: "Signals mature decision-making" },
        { word: "Debug", phonetic: "/diːˈbʌɡ/", pos: "verb", definition: "To identify and remove errors", example: "I <u>debugged</u> the critical issue in production.", whyItHelps: "Demonstrates hands-on problem solving" }
    ],
    student: [
        { word: "Initiative", phonetic: "/ɪˈnɪʃətɪv/", pos: "noun", definition: "Taking action without being asked", example: "I took <u>initiative</u> to organize the study group.", whyItHelps: "Shows self-starter attitude" },
        { word: "Adapt", phonetic: "/əˈdæpt/", pos: "verb", definition: "To adjust to new conditions", example: "I had to <u>adapt</u> quickly to the new schedule.", whyItHelps: "Critical for learning curves" },
        { word: "Collaborate", phonetic: "/kəˈlæbəreɪt/", pos: "verb", definition: "To work jointly with others", example: "I <u>collaborated</u> with three classmates on the project.", whyItHelps: "Shows teamwork skills" },
        { word: "Troubleshoot", phonetic: "/ˈtrʌbəlʃuːt/", pos: "verb", definition: "To solve problems systematically", example: "I <u>troubleshot</u> the connection issue until it worked.", whyItHelps: "Demonstrates persistence" },
        { word: "Prioritize", phonetic: "/praɪˈɔːrɪtaɪz/", pos: "verb", definition: "To decide what is most important", example: "I <u>prioritized</u> my exams over social events.", whyItHelps: "Shows time management skills" },
        { word: "Research", phonetic: "/ˈriːsɜːrtʃ/", pos: "verb", definition: "To investigate systematically", example: "I <u>researched</u> best practices before starting.", whyItHelps: "Shows preparation and thoroughness" }
    ],
    default: [
        { word: "Prioritize", phonetic: "/praɪˈɔːrɪtaɪz/", pos: "verb", definition: "To arrange by importance", example: "I <u>prioritized</u> the most urgent tasks first.", whyItHelps: "Shows strong time management" },
        { word: "Streamline", phonetic: "/ˈstriːmlaɪn/", pos: "verb", definition: "To make simpler and more efficient", example: "I <u>streamlined</u> our weekly reporting process.", whyItHelps: "Demonstrates efficiency mindset" },
        { word: "Mitigate", phonetic: "/ˈmɪtɪɡeɪt/", pos: "verb", definition: "To reduce negative impact", example: "I took steps to <u>mitigate</u> any potential delays.", whyItHelps: "Shows proactive problem-solving" },
        { word: "Facilitate", phonetic: "/fəˈsɪlɪteɪt/", pos: "verb", definition: "To make a process easier", example: "I <u>facilitated</u> better communication between teams.", whyItHelps: "Signals leadership skills" },
        { word: "Tradeoff", phonetic: "/ˈtreɪdɔːf/", pos: "noun", definition: "Balancing competing factors", example: "Make a smart <u>tradeoff</u> to meet the deadline.", whyItHelps: "Shows mature judgment" },
        { word: "Coordinate", phonetic: "/koʊˈɔːrdɪneɪt/", pos: "verb", definition: "To organize people or activities", example: "I <u>coordinated</u> the launch schedule.", whyItHelps: "Shows organizational ability" }
    ]
};

/**
 * Detect role from question or context
 */
function detectRole(questionText, answerText) {
    const combined = (questionText + ' ' + answerText).toLowerCase();

    if (combined.match(/patient|dental|clinic|tooth|teeth|dentist/)) return 'dentist';
    if (combined.match(/code|engineer|software|system|api|database|deploy|dev/)) return 'engineer';
    if (combined.match(/student|school|university|course|study|gpa|intern|class|project/)) return 'student';

    return 'default';
}

/**
 * Generate role-specific vocabulary (5-8 items with full structure)
 */
export function generateRoleVocabulary(questionText, answerText) {
    const role = detectRole(questionText, answerText);
    const vocabList = ROLE_VOCABULARY[role] || ROLE_VOCABULARY.default;

    // Return 5-8 items
    const count = Math.min(8, Math.max(5, Math.floor(Math.random() * 4) + 5));
    const shuffled = [...vocabList].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

/**
 * Calculate hire likelihood before rewrite
 */
function calculateHireLikelihood(score, feedback, answerText) {
    let likelihood = score;

    // Penalties
    if (answerText.split(/\s+/).length < 30) likelihood -= 15; // Too short
    if (!/\d/.test(answerText)) likelihood -= 20; // No metrics
    if (feedback.structure < 15) likelihood -= 10; // Poor structure
    if (feedback.clarity < 15) likelihood -= 10; // Unclear

    // Bonuses
    if (feedback.metrics >= 20) likelihood += 10; // Strong metrics
    if (feedback.structure >= 20) likelihood += 10; // Good structure
    if (answerText.split(/[.!?]/).length >= 4) likelihood += 5; // Well-developed

    return Math.min(95, Math.max(5, Math.round(likelihood)));
}

/**
 * Calculate hire likelihood after rewrite
 */
function calculateHireLikelihoodAfterRewrite(beforeLikelihood, rewriteQuality) {
    // Rewrite should materially improve likelihood
    let improvement = 0;

    if (rewriteQuality.hasSTAR) improvement += 15;
    if (rewriteQuality.hasMetrics) improvement += 15;
    if (rewriteQuality.isProfessional) improvement += 10;
    if (rewriteQuality.isSpecific) improvement += 10;

    const afterLikelihood = Math.min(95, beforeLikelihood + improvement);
    return Math.round(afterLikelihood);
}

/**
 * Generate STAR-based rewrite with natural flow and underlined vocabulary (NEVER EMPTY)
 */
export function generateSTARRewrite(questionText, answerText, score, feedback) {
    const role = detectRole(questionText, answerText);
    const vocabList = ROLE_VOCABULARY[role] || ROLE_VOCABULARY.default;
    
    // Select 2 diverse vocab terms to integrate
    const shuffledVocab = [...vocabList].sort(() => Math.random() - 0.5);
    const vocab1 = shuffledVocab[0];
    const vocab2 = shuffledVocab[1];
    const word1 = vocab1.word.toLowerCase();
    const word2 = vocab2.word.toLowerCase();

    // Handle empty or extremely short answer
    if (!answerText || answerText.trim().length < 10) {
        // Generic high-quality response example if input matches nothing
        return {
            text: `In my previous role, I had to <u>${word1}</u> resources when our team size doubled. I realized our old process was too slow, so I broke the task down into smaller steps. To keep things moving, I focused on ways to <u>${word2}</u> the workflow without cutting corners. By staying organized, I was able to help the team adapt quickly and maintain high quality. The result was a smoother transition that saved us about 10 hours a week.`,
            hireProbabilityEstimate: 20
        };
    }

    const hasMetrics = /\d+%|\d+x|by \d+|from \d+ to \d+/.test(answerText);
    const hasSTAR = answerText.split(/[.!?]/).length >= 3;
    const wordCount = answerText.split(/\s+/).length;

    // Comprehensive profanity filter
    const profanityPattern = /\b(fuck|shit|damn|hell|crap|suck|stupid|bitch|ass|piss|bastard|dick|cock|pussy)\b/gi;
    const hasProfanity = profanityPattern.test(answerText);
    
    let baseText = answerText
        .replace(profanityPattern, '')
        .replace(/\s+/g, ' ')
        .trim();

    // 1. If profanity or very short, provide a role-aware "Perfect Answer" template
    if (hasProfanity || wordCount < 20) {
        if (role === 'engineer') {
            return {
                text: `In my last project, I had to <u>${word1}</u> a complex system to handle more traffic. I noticed performance was dropping, so I paused to analyze the root cause. I decided to <u>${word2}</u> the database queries to reduce load. This allowed us to handle 3x more users without crashing. The fix improved overall system stability by 40%.`,
                hireProbabilityEstimate: 85
            };
        } else if (role === 'dentist') {
            return {
                text: `I had a patient who was very anxious about a procedure. To help them relax, I used a soft tone to <u>${word1}</u> their fears before we started. I focused on ways to <u>${word2}</u> the treatment so they wouldn't be in the chair as long. This approach helped them feel safe and built trust. As a result, the procedure went smoothly and they left with a smile.`,
                hireProbabilityEstimate: 85
            };
        } else if (role === 'student') {
             return {
                text: `During my final project, I had to <u>${word1}</u> effectively with a team of four. We were falling behind, so I took the lead to reorganize our schedule. I made sure to <u>${word2}</u> the most critical tasks first. This helped us get back on track and finish on time. Ideally, we delivered the project two days early and got an A.`,
                hireProbabilityEstimate: 80
            };
        } else {
            return {
                text: `In a past role, I had to <u>${word1}</u> a project with a very tight deadline. I realized we were at risk of missing it, so I gathered the team to find a solution. We decided to <u>${word2}</u> our process to remove unnecessary steps. This helped us move faster without making mistakes. In the end, we delivered the work on time and improved efficiency by 20%.`,
                hireProbabilityEstimate: 80
            };
        }
    }

    // 2. For decent length answers, we construct a natural rewrite that respects their content but uses our vocab
    // Since we can't semantically rewrite without an LLM, we use a generic "Wrapper" that fits most situations
    // and injects the vocab naturally.
    
    // Simplistic extraction of "What happened" (first sentence)
    const sentences = baseText.split(/[.!?]+/).filter(s => s.trim().length > 5);
    const context = sentences[0] ? sentences[0].trim() : "I faced a challenge";
    
    // Construct a natural rewrite flow
    let rewrite = `Here is how I would approach that. ${context}. `;
    
    // Add middle section with vocab 1
    rewrite += `I knew I needed to take action, so I focused on ways to <u>${word1}</u> the situation. `;
    
    // Add action/result section with vocab 2
    rewrite += `I broke the problem down and made sure to <u>${word2}</u> effectively. By staying focused, I was able to drive a positive outcome. `;
    
    // Add metrics if missing
    if (!hasMetrics) {
        rewrite += `The result was a solid improvement that saved time and reduced errors by about 20%.`;
    } else {
        rewrite += `This led to strong measurable results for the team.`;
    }

    // Clean up punctuation
    rewrite = rewrite.replace(/\.\./g, '.').replace(/\s+/g, ' ');

    // Calculate hire probability
    let hireProbability = score;
    if (hasMetrics) hireProbability += 10;
    if (hasSTAR) hireProbability += 5;
    if (feedback.structure >= 20) hireProbability += 5;
    hireProbability = Math.min(95, Math.max(20, hireProbability));

    return {
        text: rewrite,
        hireProbabilityEstimate: Math.round(hireProbability)
    };
}

/**
 * Generate hire likelihood comparison
 */
export function generateHireLikelihoodComparison(score, feedback, answerText, rewriteText) {
    const before = calculateHireLikelihood(score, feedback, answerText);

    const rewriteQuality = {
        hasSTAR: rewriteText.split(/[.!?]/).length >= 4,
        hasMetrics: /\d+%|\d+x|~\d+%/.test(rewriteText),
        isProfessional: !/\b(damn|hell|crap|suck|stupid)\b/i.test(rewriteText),
        isSpecific: rewriteText.split(/\s+/).length >= 50
    };

    const after = calculateHireLikelihoodAfterRewrite(before, rewriteQuality);

    const why = [];
    if (rewriteQuality.hasSTAR) why.push("Added STAR structure (Situation, Task, Action, Result) makes impact clear");
    if (rewriteQuality.hasMetrics) why.push("Included quantifiable outcomes shows results-orientation");
    if (!rewriteQuality.hasSTAR && !rewriteQuality.hasMetrics) {
        why.push("Original answer lacked structure and metrics, limiting evaluability");
        why.push("Rewrite provides clearer narrative but needs your specific numbers");
    }

    return {
        hireLikelihood: before,
        hireLikelihoodAfterRewrite: after,
        why: why.slice(0, 2)
    };
}

/**
 * Generate natural "what worked" feedback (Plain English)
 */
export function generateSignalBasedFeedback(feedback, answerText) {
    const signals = [];

    if (feedback.clarity >= 20) {
        signals.push("You spoke clearly and made your main point easy to understand.");
    }

    if (feedback.structure >= 20) {
        signals.push("Your answer had a clear flow from start to finish.");
    }

    if (feedback.metrics >= 15) {
        signals.push("You used a specific number that proved your success.");
    }

    if (feedback.relevance >= 20) {
        signals.push("You answered exactly what I asked without getting sidetracked.");
    }

    // Ensure 1-2 items
    if (signals.length === 0) {
        signals.push("You gave a genuine answer that felt honest.");
    }

    return signals.slice(0, 2);
}

/**
 * Generate actionable improvements (Plain English, starts with Verb)
 */
export function generateActionableImprovements(feedback, answerText, score) {
    const improvements = [];

    if (feedback.metrics < 15) {
        improvements.push("Add one number: count, percentage, or time saved.");
    }

    if (feedback.structure < 15) {
        improvements.push("Tell a simple story: Problem -> Action -> Result.");
    }

    if (feedback.clarity < 15) {
        improvements.push("Shorten your sentences to keep the listener engaged.");
    }

    if (!/\d/.test(answerText)) {
        improvements.push("Prove your impact with a specific metric.");
    }

    const wordCount = answerText.split(/\s+/).length;
    if (wordCount < 30) {
        improvements.push("Speak for about 45 seconds to cover the details.");
    } else if (wordCount > 200) {
        improvements.push("Cut the small details and focus on the result.");
    }

    // Ensure 2-3 items
    if (improvements.length === 0) {
        improvements.push("Give one real-life example to make it stick.");
        improvements.push("Describe the final outcome more clearly.");
    }

    return improvements.slice(0, 3);
}

/**
 * Generate hiring manager interpretation (Blunt but constructive)
 */
export function generateHiringManagerInterpretation(score, feedback, answerText) {
    const hasMetrics = /\d+%|\d+x|by \d+/.test(answerText);
    const wordCount = answerText.split(/\s+/).length;

    if (score >= 80) {
        if (hasMetrics) {
            return "This person gets it. They focused on results and shared a clear win. I'd definitely want to interview them.";
        } else {
            return "Good communication style, but I'm hungry for the hard numbers. Still, they seem competent enough to move forward.";
        }
    } else if (score >= 60) {
        if (!hasMetrics) {
            return "They prefer talking about effort rather than impact. I need to know if they can actually deliver results, so I'm hesitant.";
        } else {
            return "The answer was a bit messy, but the core skills seem to be there. I'd need to probe deeper to be sure.";
        }
    } else if (score >= 40) {
        if (wordCount < 20) {
            return "Ideally, I need more than a few words to judge their skill. This felt rushed or unprepared.";
        } else {
            return "This feels like someone who understands the basics but hasn't had real ownership yet. I'd pass for a senior role.";
        }
    } else {
        return "Not enough here to tell if they can do the job. I'd pass and keep looking for a stronger candidate.";
    }
}

