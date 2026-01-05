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
 * Generate highly contextual, spoken-style rewrite (Target: 90%+ Hire Likelihood)
 */
export function generateSTARRewrite(questionText, answerText, score, feedback, forcedVocab = null) {
    const role = detectRole(questionText, answerText);

    let v1, v2;
    // Use forced vocab if provided (ENSURES UI MATCH)
    if (forcedVocab && forcedVocab.length >= 2) {
        v1 = forcedVocab[0];
        v2 = forcedVocab[1];
    } else {
        const vocabList = ROLE_VOCABULARY[role] || ROLE_VOCABULARY.default;
        const shuffledVocab = [...vocabList].sort(() => Math.random() - 0.5);
        v1 = shuffledVocab[0];
        v2 = shuffledVocab[1];
    }

    // Helper to build a natural sentence fragment based on POS
    const buildActionPhrase = (v) => {
        const w = v.word.toLowerCase();
        if (v.pos.includes('noun')) {
            const templates = [
                `focused heavily on <u>${w}</u>`,
                `made <u>${w}</u> a top priority`,
                `ensured <u>${w}</u> was considered`
            ];
            return templates[Math.floor(Math.random() * templates.length)];
        } else {
            // Verbs
            const templates = [
                `took steps to <u>${w}</u> the situation`,
                `worked efficiently to <u>${w}</u> the process`,
                `made a plan to <u>${w}</u> the core issues`
            ];
            return templates[Math.floor(Math.random() * templates.length)];
        }
    };

    const buildResultPhrase = (v) => {
        const w = v.word.toLowerCase();
        if (v.pos.includes('noun')) {
            const templates = [
                `improved our overall <u>${w}</u>`,
                `demonstrated the value of <u>${w}</u>`,
                `strengthened our <u>${w}</u>`
            ];
            return templates[Math.floor(Math.random() * templates.length)];
        } else {
            // Verbs
            const templates = [
                `enabled us to <u>${w}</u> effectively`,
                `allowed the team to <u>${w}</u> without friction`,
                `empowered us to <u>${w}</u> faster`
            ];
            return templates[Math.floor(Math.random() * templates.length)];
        }
    };

    // Detect Question Context & User Context
    const q = questionText.toLowerCase();
    let contextType = 'challenge';
    if (q.match(/disagree|conflict|argue|difficult|persuade|convince|opinion/)) contextType = 'conflict';
    else if (q.match(/fail|mistake|error|wrong|regret|lesson/)) contextType = 'failure';
    else if (q.match(/weakness|improve|negative feedback/)) contextType = 'weakness';
    else if (q.match(/lead|manage|team|mentor|style/)) contextType = 'leadership';

    const cleanAnswer = answerText.replace(/\b(fuck|shit|damn|hell)\b/gi, '').trim();
    const sentences = cleanAnswer.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const userContext = sentences[0] ? sentences[0].trim() : "I was working on a critical project";

    let rewrite = "";

    // --- CONTEXT-AWARE ASSEMBLY ---

    if (contextType === 'conflict') {
        rewrite = `In a past situation, I disagreed with a colleague on the best approach. ${userContext}. I knew we needed alignment, so I asked questions to understand their perspective. I ${buildActionPhrase(v1)} to bridge the gap. We found a compromise that worked for everyone. This approach ${buildResultPhrase(v2)} and helped us move forward professionally.`;
    }
    else if (contextType === 'failure') {
        rewrite = `I made a mistake where I missed a key detail. ${userContext}. I took immediate ownership rather than making excuses. I communicated the issue and ${buildActionPhrase(v1)} to fix it. I also documented the error to prevent it from happening again. This experience taught me to ${buildResultPhrase(v2)}, making me a more reliable professional.`;
    }
    else if (contextType === 'leadership') {
        rewrite = `I noticed the team was facing a blocker. ${userContext}. I stepped in to provide clear direction while giving them space to own the work. I ${buildActionPhrase(v1)} so everyone felt supported. By checking in regularly, I ${buildResultPhrase(v2)}. The team delivered the project successfully and morale remained high.`;
    }
    else if (contextType === 'weakness') {
        rewrite = `I used to struggle with taking on too much. ${userContext}. I realized I needed a better system, so I started prioritizing my day differently. I ${buildActionPhrase(v1)} to stay organized. This shift ${buildResultPhrase(v2)} with my stakeholders. Now, I deliver consistent quality without burning out.`;
    }
    else {
        // Default / Challenge
        rewrite = `Here is how I would handle that. ${userContext}. I assessed the situation and knew I needed to act. I ${buildActionPhrase(v1)} to get things back on track. I broke the problem down and ${buildResultPhrase(v2)}. By staying focused on the goal, I drove a strong result. This led to a measurable improvement in performance.`;
    }

    // Hire Likelihood Calc
    let hireProbability = 92;
    if (feedback.metrics >= 15) hireProbability += 3;
    if (feedback.structure >= 20) hireProbability += 3;

    return {
        text: rewrite,
        hireProbabilityEstimate: Math.min(99, hireProbability)
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
    const improveNextVariants = [
        "Try briefly explaining why you made that decision before describing what you did.",
        "Focus on one clear outcome so the listener can easily follow your impact.",
        "Add a short result at the end to show what changed because of your actions.",
        "Tighten the story by removing extra setup and getting to the action sooner.",
        "Connect your actions directly to a business or team outcome.",
        "End with one sentence that clearly states what improved as a result.",
        "Explain your thinking out loud so the interviewer understands how you approach problems."
    ];

    // Randomly select 3 tips to keep it fresh
    const shuffled = improveNextVariants.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
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

