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
export function generateSTARRewrite(questionText, answerText, score, feedback) {
    const role = detectRole(questionText, answerText);
    const vocabList = ROLE_VOCABULARY[role] || ROLE_VOCABULARY.default;

    // Select 2 diverse vocab terms
    const shuffledVocab = [...vocabList].sort(() => Math.random() - 0.5);
    const valVocab1 = shuffledVocab[0];
    const valVocab2 = shuffledVocab[1];
    const w1 = valVocab1.word.toLowerCase();
    const w2 = valVocab2.word.toLowerCase();

    // Helper to inject vocab naturally based on POS
    const injectVocab = (v, word) => {
        if (v.pos.includes('verb')) return `<u>${word}</u>`;
        return `improve <u>${word}</u>`; // Fallback for nouns in verb slots
    };
    const injectNoun = (v, word) => {
        if (v.pos.includes('noun')) return `<u>${word}</u>`;
        return `<u>${word}</u>`; // Just print it if we force a noun slot
    };

    // Detect Question Context
    const q = questionText.toLowerCase();
    let contextType = 'challenge'; // default STAR
    if (q.match(/disagree|conflict|argue|difficult|persuade|convince|opinion/)) contextType = 'conflict';
    else if (q.match(/fail|mistake|error|wrong|regret|lesson/)) contextType = 'failure';
    else if (q.match(/weakness|improve|negative feedback/)) contextType = 'weakness';
    else if (q.match(/lead|manage|team|mentor|style/)) contextType = 'leadership';

    // Extract basic context from user answer to ground the rewrite
    const cleanAnswer = answerText.replace(/\b(fuck|shit|damn|hell)\b/gi, '').trim();
    const sentences = cleanAnswer.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const userContext = sentences[0] ? sentences[0].trim() : "I was working on a critical initiative";

    let rewrite = "";

    // --- CONTEXT-AWARE TEMPLATES ---

    if (contextType === 'conflict') {
        rewrite = `In a past situation, I disagreed with a colleague on the best approach. ${userContext}. I knew we needed alignment, so I asked questions to understand their perspective first. I focused on ways to ${injectVocab(valVocab1, w1)} the tension without making it personal. We found a compromise that respected both technical needs and business goals. This helped us ${injectVocab(valVocab2, w2)} the relationship and move forward effectively.`;
    }
    else if (contextType === 'failure') {
        rewrite = `I made a mistake where I missed a key detail. ${userContext}. Instead of making excuses, I took immediate ownership. I communicated the issue to stakeholders and worked quickly to ${injectVocab(valVocab1, w1)} the impact. I also documented the error to ensure it wouldn't happen again. The experience taught me to ${injectVocab(valVocab2, w2)} my review process, which made me a stronger professional.`;
    }
    else if (contextType === 'leadership') {
        rewrite = `I noticed the team was facing a blocker. ${userContext}. I stepped in to provide clear direction while giving them space to own the work. I made sure to ${injectVocab(valVocab1, w1)} communication so everyone felt heard. By checking in regularly, I was able to ${injectVocab(valVocab2, w2)} their progress. The team delivered the project successfully and felt supported throughout.`;
    }
    else if (contextType === 'weakness') {
        rewrite = `I used to struggle with taking on too much at once. ${userContext}. I realized I needed to change, so I started using a new system to stay organized. I focused on learning how to ${injectVocab(valVocab1, w1)} my workload better. This helped me ${injectVocab(valVocab2, w2)} expectations with my manager. Now, I'm much more consistent and deliver higher quality work.`;
    }
    else {
        // Default / Challenge (STAR Lite)
        rewrite = `Here is how I would handle that. ${userContext}. I knew I needed to take action, so I assessed the situation immediately. I focused on ways to ${injectVocab(valVocab1, w1)} the process to get us back on track. I broke the problem down and made sure to ${injectVocab(valVocab2, w2)} effectively. By staying focused on the end goal, I was able to drive a strong result. This approach led to a measurable improvement in performance.`;
    }

    // Safety check for length
    if (rewrite.length < 100) {
        rewrite += ` Overall, it was a valuable experience that sharpened my skills.`;
    }

    // Calculate Hire Likelihood (Optimistic because this is a "Perfect" Rewrite)
    let hireProbability = 92; // Baseline high for the rewrite
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

