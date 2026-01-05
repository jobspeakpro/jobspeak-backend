// jobspeak-backend/services/intelligentFeedbackGenerator.js
// Hire-grade, role-aware feedback generation - ENHANCED VERSION

/**
 * Expanded role-specific vocabulary database with POS and why it helps
 */
const ROLE_VOCABULARY = {
    dentist: [
        { word: "Patient-centered care", phonetic: "", pos: "noun phrase", definition: "An approach that prioritizes patient outcomes and experience", example: "I applied patient-centered care by actively listening to patient concerns before treatment", whyItHelps: "Shows empathy and professionalism, critical for patient trust" },
        { word: "Clinical efficacy", phonetic: "/ˈklɪnɪkəl ˈɛfɪkəsi/", pos: "noun", definition: "The proven effectiveness of a treatment or procedure", example: "I improved clinical efficacy by implementing evidence-based protocols", whyItHelps: "Demonstrates results-driven approach and commitment to quality" },
        { word: "Chairside manner", phonetic: "", pos: "noun phrase", definition: "Professional demeanor and communication with patients during treatment", example: "My chairside manner helped reduce patient anxiety by 40%", whyItHelps: "Signals soft skills and ability to manage difficult situations" },
        { word: "Mitigate", phonetic: "/ˈmɪtɪɡeɪt/", pos: "verb", definition: "To make less severe or reduce negative impact", example: "I mitigated patient discomfort by explaining each step clearly", whyItHelps: "Shows proactive problem-solving and risk management" },
        { word: "Streamline", phonetic: "/ˈstriːmlaɪn/", pos: "verb", definition: "To make a process more efficient by simplifying or removing steps", example: "I streamlined the check-in process, reducing wait times by 25%", whyItHelps: "Demonstrates operational thinking and efficiency focus" },
        { word: "Preventive care", phonetic: "", pos: "noun phrase", definition: "Healthcare focused on preventing problems before they occur", example: "I championed preventive care through patient education programs", whyItHelps: "Shows long-term thinking and value creation" },
        { word: "Treatment protocol", phonetic: "", pos: "noun phrase", definition: "Standardized procedure for addressing specific conditions", example: "I developed treatment protocols that improved consistency across the practice", whyItHelps: "Signals systematic approach and leadership" },
        { word: "Stakeholder alignment", phonetic: "", pos: "noun phrase", definition: "Ensuring all parties agree on goals and approach", example: "I achieved stakeholder alignment between patients, staff, and insurance providers", whyItHelps: "Shows ability to manage complex relationships" }
    ],
    engineer: [
        { word: "Scalability", phonetic: "/ˌskeɪləˈbɪləti/", pos: "noun", definition: "System's ability to handle growing workload efficiently", example: "I improved scalability by implementing distributed caching, reducing latency by 60%", whyItHelps: "Shows forward-thinking and understanding of system design" },
        { word: "Technical debt", phonetic: "", pos: "noun phrase", definition: "The implied cost of future rework caused by choosing quick solutions", example: "I reduced technical debt by refactoring legacy code with 95% test coverage", whyItHelps: "Demonstrates long-term thinking and code quality focus" },
        { word: "Architect", phonetic: "/ˈɑːrkɪtɛkt/", pos: "verb", definition: "To design the high-level structure of a system", example: "I architected a microservices solution that supported 10x user growth", whyItHelps: "Signals senior-level design skills and strategic thinking" },
        { word: "Optimize", phonetic: "/ˈɑːptɪmaɪz/", pos: "verb", definition: "To improve efficiency, speed, or resource usage", example: "I optimized database queries, reducing response time from 5s to 500ms", whyItHelps: "Shows results-orientation and technical depth" },
        { word: "Root-cause analysis", phonetic: "", pos: "noun phrase", definition: "Systematic process of identifying the underlying reason for a problem", example: "I performed root-cause analysis to eliminate recurring production issues", whyItHelps: "Demonstrates analytical thinking and problem-solving rigor" },
        { word: "Cross-functional collaboration", phonetic: "", pos: "noun phrase", definition: "Working effectively across different teams and disciplines", example: "I drove cross-functional collaboration between engineering and product teams", whyItHelps: "Shows leadership and communication skills beyond coding" },
        { word: "Tradeoff", phonetic: "/ˈtreɪdɔːf/", pos: "noun", definition: "A balance between competing priorities or constraints", example: "I evaluated tradeoffs between performance and maintainability", whyItHelps: "Signals mature decision-making and business awareness" },
        { word: "Mitigate risk", phonetic: "", pos: "verb phrase", definition: "To reduce the likelihood or impact of potential problems", example: "I mitigated risk by implementing feature flags and gradual rollouts", whyItHelps: "Shows responsibility and production-readiness mindset" }
    ],
    student: [
        { word: "Initiative", phonetic: "/ɪˈnɪʃətɪv/", pos: "noun", definition: "Taking action without being prompted; self-motivation", example: "I demonstrated initiative by founding a coding club that grew to 50 members", whyItHelps: "Shows self-starter attitude, critical for entry-level roles" },
        { word: "Spearhead", phonetic: "/ˈspɪrhɛd/", pos: "verb", definition: "To lead or initiate an effort or project", example: "I spearheaded a hackathon project that won first place", whyItHelps: "Signals leadership potential despite limited experience" },
        { word: "Adaptability", phonetic: "/əˌdæptəˈbɪləti/", pos: "noun", definition: "Ability to adjust to new conditions and learn quickly", example: "I showed adaptability by mastering three new frameworks in one semester", whyItHelps: "Critical for fast-paced environments and learning curves" },
        { word: "Collaborate", phonetic: "/kəˈlæbəreɪt/", pos: "verb", definition: "To work jointly with others toward a common goal", example: "I collaborated with designers and developers on a full-stack project", whyItHelps: "Shows teamwork skills valued in all roles" },
        { word: "Troubleshoot", phonetic: "/ˈtrʌbəlʃuːt/", pos: "verb", definition: "To identify and solve problems systematically", example: "I troubleshot deployment issues that blocked the team for days", whyItHelps: "Demonstrates problem-solving and persistence" },
        { word: "Stakeholder", phonetic: "/ˈsteɪkhoʊldər/", pos: "noun", definition: "A person or group with interest in a project's outcome", example: "I gathered requirements from stakeholders including professors and peers", whyItHelps: "Shows awareness of broader context beyond just coding" },
        { word: "Iterate", phonetic: "/ˈɪtəreɪt/", pos: "verb", definition: "To refine through repeated cycles of improvement", example: "I iterated on the design based on user feedback, improving satisfaction by 40%", whyItHelps: "Signals growth mindset and user focus" },
        { word: "Prioritize", phonetic: "/praɪˈɔːrɪtaɪz/", pos: "verb", definition: "To arrange tasks by importance or urgency", example: "I prioritized features based on user impact and technical complexity", whyItHelps: "Shows judgment and time management skills" }
    ],
    default: [
        { word: "Strategic thinking", phonetic: "", pos: "noun phrase", definition: "Long-term planning and decision-making aligned with goals", example: "I applied strategic thinking to prioritize high-impact initiatives", whyItHelps: "Shows big-picture awareness beyond tactical execution" },
        { word: "Stakeholder management", phonetic: "", pos: "noun phrase", definition: "Effectively communicating with and influencing key parties", example: "I excelled at stakeholder management by aligning diverse team interests", whyItHelps: "Critical for leadership and cross-functional roles" },
        { word: "Data-driven", phonetic: "", pos: "adjective", definition: "Making decisions based on metrics and analysis rather than intuition", example: "I took a data-driven approach to optimize our marketing spend", whyItHelps: "Shows analytical rigor and results-focus" },
        { word: "Streamline", phonetic: "/ˈstriːmlaɪn/", pos: "verb", definition: "To make a process more efficient by simplifying steps", example: "I streamlined the approval process, reducing cycle time by 40%", whyItHelps: "Demonstrates operational excellence and efficiency mindset" },
        { word: "Mitigate", phonetic: "/ˈmɪtɪɡeɪt/", pos: "verb", definition: "To reduce the severity or impact of something negative", example: "I mitigated project risk by implementing weekly check-ins", whyItHelps: "Shows proactive problem-solving and risk awareness" },
        { word: "Facilitate", phonetic: "/fəˈsɪlɪteɪt/", pos: "verb", definition: "To make an action or process easier or more efficient", example: "I facilitated cross-team workshops to align on priorities", whyItHelps: "Signals leadership and collaboration skills" },
        { word: "Tradeoff", phonetic: "/ˈtreɪdɔːf/", pos: "noun", definition: "A balance between competing factors or priorities", example: "I evaluated tradeoffs between speed and quality", whyItHelps: "Shows mature judgment and decision-making" },
        { word: "Root-cause analysis", phonetic: "", pos: "noun phrase", definition: "Systematic identification of the underlying reason for a problem", example: "I conducted root-cause analysis to prevent recurring issues", whyItHelps: "Demonstrates analytical depth and problem-solving rigor" }
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
            const firstPart = sentences[0]?.trim().toLowerCase() || 'I had to handle a challenging situation'; \n            enhanced = `${firstPart.charAt(0).toUpperCase() + firstPart.slice(1)}. I knew I needed to act quickly, so I broke down the problem and tackled it piece by piece. By staying organized and focused, I was able to make real progress. The result was about a 30% improvement in how things were running.`;
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
