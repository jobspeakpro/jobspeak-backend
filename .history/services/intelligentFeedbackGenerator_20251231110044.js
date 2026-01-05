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
    if (combined.match(/code|engineer|software|system|api|database|deploy/)) return 'engineer';
    if (combined.match(/student|school|university|course|study|gpa|intern/)) return 'student';

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
 * Generate STAR-based rewrite with metrics and vocabulary integration (NEVER EMPTY)
 */
export function generateSTARRewrite(questionText, answerText, score, feedback) {
    const role = detectRole(questionText, answerText);
    const vocabList = ROLE_VOCABULARY[role] || ROLE_VOCABULARY.default;

    // Select 1-3 vocab terms to integrate
    const vocabToUse = vocabList.slice(0, 3).map(v => v.word.toLowerCase());

    // Handle empty answer
    if (!answerText || answerText.trim().length === 0) {
        return {
            text: "To provide a strong answer, structure your response using STAR: Situation (context), Task (your responsibility), Action (specific steps you took), and Result (measurable outcome). For example: 'In Q2 2023, our team faced a 40% increase in customer complaints (Situation). As the lead, I was tasked with identifying root causes (Task). I implemented a new feedback system and trained the team on active listening (Action). This reduced complaints by 65% within 3 months (Result).'",
            hireProbabilityEstimate: 15
        };
    }

    const hasMetrics = /\d+%|\d+x|by \d+|from \d+ to \d+/.test(answerText);
    const hasSTAR = answerText.split(/[.!?]/).length >= 3;
    const wordCount = answerText.split(/\s+/).length;

    // Comprehensive profanity filter - replace with professional language
    const profanityPattern = /\b(fuck|shit|damn|hell|crap|suck|stupid|bitch|ass|piss|bastard|dick|cock|pussy)\b/gi;
    const hasProfanity = profanityPattern.test(answerText);

    let enhanced = answerText
        .replace(profanityPattern, '')
        .replace(/\s+/g, ' ')
        .trim();

    // If profanity detected, start with professional reset
    if (hasProfanity || wordCount < 15) {
        const sentences = enhanced.split(/[.!?]+/).filter(s => s.trim());
        enhanced = `In my previous role, I faced a situation that required quick thinking and clear action. I took ownership of the problem and worked through it step by step. By staying focused and bringing in the right people, I was able to turn things around. The end result was a noticeable improvement that helped the team move forward more efficiently.`;
    } else if (!hasSTAR || wordCount < 30) {
        // Add STAR structure if missing or weak
        const sentences = enhanced.split(/[.!?]+/).filter(s => s.trim());
        if (sentences.length <= 2) {
            const firstPart = sentences[0]?.trim().toLowerCase() || 'I had to handle a challenging situation';
            enhanced = `${firstPart.charAt(0).toUpperCase() + firstPart.slice(1)}. I knew I needed to act quickly, so I broke down the problem and tackled it piece by piece. By staying organized and focused, I was able to make real progress. The result was about a 30% improvement in how things were running.`;
        }
    }

    // Add metrics if missing
    if (!hasMetrics) {
        enhanced += " This led to approximately 25-30% improvement in key outcomes.";
    }

    // Role-specific enhancements with vocabulary integration
    if (role === 'dentist') {
        enhanced = enhanced.replace(/\b(helped|assisted)\b/gi, 'provided patient-centered care to');
        enhanced = enhanced.replace(/\b(fixed|solved)\b/gi, 'diagnosed and treated');
        // Integrate vocab: ensure "mitigate" or "streamline" appears
        if (!enhanced.toLowerCase().includes('mitigate') && !enhanced.toLowerCase().includes('streamline')) {
            enhanced = enhanced.replace(/improved/i, 'streamlined');
        }
    } else if (role === 'engineer') {
        enhanced = enhanced.replace(/\b(made|created)\b/gi, 'architected and implemented');
        enhanced = enhanced.replace(/\b(fixed|solved)\b/gi, 'debugged and resolved');
        // Integrate vocab: ensure "optimize" or "scalability" appears
        if (!enhanced.toLowerCase().includes('optimi') && !enhanced.toLowerCase().includes('scalab')) {
            enhanced = enhanced.replace(/improved/i, 'optimized');
        }
    } else if (role === 'student') {
        enhanced = enhanced.replace(/\b(did|completed)\b/gi, 'took initiative to complete');
        enhanced = enhanced.replace(/\blearned\b/gi, 'rapidly acquired proficiency in');
        // Integrate vocab: ensure "collaborate" or "troubleshoot" appears
        if (!enhanced.toLowerCase().includes('collaborat') && !enhanced.toLowerCase().includes('troubleshoot')) {
            enhanced = enhanced.replace(/worked with/i, 'collaborated with');
        }
    } else {
        // Default: integrate "mitigate" or "facilitate"
        if (!enhanced.toLowerCase().includes('mitigate') && !enhanced.toLowerCase().includes('facilitate')) {
            enhanced = enhanced.replace(/helped/i, 'facilitated');
        }
    }

    // Calculate hire probability
    let hireProbability = score;
    if (hasMetrics) hireProbability += 10;
    if (hasSTAR) hireProbability += 5;
    if (feedback.structure >= 20) hireProbability += 5;
    hireProbability = Math.min(95, Math.max(20, hireProbability));

    return {
        text: enhanced.trim(),
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
 * Generate natural "what worked" feedback (1-2 items)
 */
export function generateSignalBasedFeedback(feedback, answerText) {
    const signals = [];

    if (feedback.clarity >= 20) {
        signals.push("You explained your thinking clearly and stayed on topic.");
    }

    if (feedback.structure >= 20) {
        signals.push("You organized your answer well with a clear beginning, middle, and end.");
    }

    if (feedback.metrics >= 15) {
        signals.push("You included specific numbers that show real impact.");
    }

    if (feedback.relevance >= 20) {
        signals.push("You answered the question directly without going off track.");
    }

    // Ensure 1-2 items
    if (signals.length === 0) {
        signals.push("You showed you're willing to engage and share your experience.");
    }

    return signals.slice(0, 2);
}

/**
 * Generate actionable "improve next" feedback (2-3 items)
 */
export function generateActionableImprovements(feedback, answerText, score) {
    const improvements = [];

    if (feedback.metrics < 15) {
        improvements.push("Add one concrete result: time saved, error reduced, or speed improved.");
    }

    if (feedback.structure < 15) {
        improvements.push("Use a simple structure: situation, action, result.");
    }

    if (feedback.clarity < 15) {
        improvements.push("Cut filler words and keep sentences short and direct.");
    }

    if (!/\d/.test(answerText)) {
        improvements.push("Include at least one number to show measurable impact.");
    }

    const wordCount = answerText.split(/\s+/).length;
    if (wordCount < 30) {
        improvements.push("Aim for 45-60 seconds to give enough detail.");
    } else if (wordCount > 200) {
        improvements.push("Keep your answer to 60-90 seconds and focus on the most important parts.");
    }

    // Ensure 2-3 items
    if (improvements.length === 0) {
        improvements.push("Add a specific example with real details.");
        improvements.push("Show the before and after with numbers.");
    }

    return improvements.slice(0, 3);
}

/**
 * Generate natural hiring manager interpretation (2 sentences, conversational)
 */
export function generateHiringManagerInterpretation(score, feedback, answerText) {
    const hasMetrics = /\d+%|\d+x|by \d+/.test(answerText);
    const wordCount = answerText.split(/\s+/).length;
    const hasSTAR = answerText.split(/[.!?]/).length >= 3;

    // Build natural, conversational interpretation
    if (score >= 80) {
        if (hasMetrics && feedback.structure >= 18) {
            return "This person clearly knows what they're doing and can back it up with real results. I'd bring them in for an interview without hesitation.";
        } else {
            return "Solid answer with good structure, though I'd like to hear more about measurable outcomes. Still worth interviewing.";
        }
    } else if (score >= 60) {
        if (!hasMetrics) {
            return "They can talk about their work, but without numbers it's hard to know if they actually made a difference. I'd need to dig deeper in the interview.";
        } else {
            return "The content is there but the delivery could be clearer. With some coaching, they could be a good fit.";
        }
    } else if (score >= 40) {
        if (wordCount < 20) {
            return "Too brief to really evaluate their skills. I'd want to hear a lot more before making any decision.";
        } else {
            return "They're trying, but the answer lacks the specifics I need to feel confident about their abilities. Probably not ready yet.";
        }
    } else {
        return "Not enough substance here to assess whether they can do the job. I'd pass and keep looking.";
    }
}

