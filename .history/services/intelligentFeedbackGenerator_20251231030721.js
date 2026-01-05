// jobspeak-backend/services/intelligentFeedbackGenerator.js
// Hire-grade, role-aware feedback generation - ENHANCED VERSION

/**
 * Expanded role-specific vocabulary database with POS and why it helps
 */
const ROLE_VOCABULARY = {
    dentist: [
        { word: "Patient-centered care", pos: "noun phrase", definition: "An approach that prioritizes patient outcomes and experience", example: "I applied patient-centered care by actively listening to patient concerns before treatment", whyItHelps: "Shows empathy and professionalism, critical for patient trust" },
        { word: "Clinical efficacy", pos: "noun", definition: "The proven effectiveness of a treatment or procedure", example: "I improved clinical efficacy by implementing evidence-based protocols", whyItHelps: "Demonstrates results-driven approach and commitment to quality" },
        { word: "Chairside manner", pos: "noun phrase", definition: "Professional demeanor and communication with patients during treatment", example: "My chairside manner helped reduce patient anxiety by 40%", whyItHelps: "Signals soft skills and ability to manage difficult situations" },
        { word: "Mitigate", pos: "verb", definition: "To make less severe or reduce negative impact", example: "I mitigated patient discomfort by explaining each step clearly", whyItHelps: "Shows proactive problem-solving and risk management" },
        { word: "Streamline", pos: "verb", definition: "To make a process more efficient by simplifying or removing steps", example: "I streamlined the check-in process, reducing wait times by 25%", whyItHelps: "Demonstrates operational thinking and efficiency focus" },
        { word: "Preventive care", pos: "noun phrase", definition: "Healthcare focused on preventing problems before they occur", example: "I championed preventive care through patient education programs", whyItHelps: "Shows long-term thinking and value creation" },
        { word: "Treatment protocol", pos: "noun phrase", definition: "Standardized procedure for addressing specific conditions", example: "I developed treatment protocols that improved consistency across the practice", whyItHelps: "Signals systematic approach and leadership" },
        { word: "Stakeholder alignment", pos: "noun phrase", definition: "Ensuring all parties agree on goals and approach", example: "I achieved stakeholder alignment between patients, staff, and insurance providers", whyItHelps: "Shows ability to manage complex relationships" }
    ],
    engineer: [
        { word: "Scalability", pos: "noun", definition: "System's ability to handle growing workload efficiently", example: "I improved scalability by implementing distributed caching, reducing latency by 60%", whyItHelps: "Shows forward-thinking and understanding of system design" },
        { word: "Technical debt", pos: "noun phrase", definition: "The implied cost of future rework caused by choosing quick solutions", example: "I reduced technical debt by refactoring legacy code with 95% test coverage", whyItHelps: "Demonstrates long-term thinking and code quality focus" },
        { word: "Architect", pos: "verb", definition: "To design the high-level structure of a system", example: "I architected a microservices solution that supported 10x user growth", whyItHelps: "Signals senior-level design skills and strategic thinking" },
        { word: "Optimize", pos: "verb", definition: "To improve efficiency, speed, or resource usage", example: "I optimized database queries, reducing response time from 5s to 500ms", whyItHelps: "Shows results-orientation and technical depth" },
        { word: "Root-cause analysis", pos: "noun phrase", definition: "Systematic process of identifying the underlying reason for a problem", example: "I performed root-cause analysis to eliminate recurring production issues", whyItHelps: "Demonstrates analytical thinking and problem-solving rigor" },
        { word: "Cross-functional collaboration", pos: "noun phrase", definition: "Working effectively across different teams and disciplines", example: "I drove cross-functional collaboration between engineering and product teams", whyItHelps: "Shows leadership and communication skills beyond coding" },
        { word: "Tradeoff", pos: "noun", definition: "A balance between competing priorities or constraints", example: "I evaluated tradeoffs between performance and maintainability", whyItHelps: "Signals mature decision-making and business awareness" },
        { word: "Mitigate risk", pos: "verb phrase", definition: "To reduce the likelihood or impact of potential problems", example: "I mitigated risk by implementing feature flags and gradual rollouts", whyItHelps: "Shows responsibility and production-readiness mindset" }
    ],
    student: [
        { word: "Initiative", pos: "noun", definition: "Taking action without being prompted; self-motivation", example: "I demonstrated initiative by founding a coding club that grew to 50 members", whyItHelps: "Shows self-starter attitude, critical for entry-level roles" },
        { word: "Spearhead", pos: "verb", definition: "To lead or initiate an effort or project", example: "I spearheaded a hackathon project that won first place", whyItHelps: "Signals leadership potential despite limited experience" },
        { word: "Adaptability", pos: "noun", definition: "Ability to adjust to new conditions and learn quickly", example: "I showed adaptability by mastering three new frameworks in one semester", whyItHelps: "Critical for fast-paced environments and learning curves" },
        { word: "Collaborate", pos: "verb", definition: "To work jointly with others toward a common goal", example: "I collaborated with designers and developers on a full-stack project", whyItHelps: "Shows teamwork skills valued in all roles" },
        { word: "Troubleshoot", pos: "verb", definition: "To identify and solve problems systematically", example: "I troubleshot deployment issues that blocked the team for days", whyItHelps: "Demonstrates problem-solving and persistence" },
        { word: "Stakeholder", pos: "noun", definition: "A person or group with interest in a project's outcome", example: "I gathered requirements from stakeholders including professors and peers", whyItHelps: "Shows awareness of broader context beyond just coding" },
        { word: "Iterate", pos: "verb", definition: "To refine through repeated cycles of improvement", example: "I iterated on the design based on user feedback, improving satisfaction by 40%", whyItHelps: "Signals growth mindset and user focus" },
        { word: "Prioritize", pos: "verb", definition: "To arrange tasks by importance or urgency", example: "I prioritized features based on user impact and technical complexity", whyItHelps: "Shows judgment and time management skills" }
    ],
    default: [
        { word: "Strategic thinking", pos: "noun phrase", definition: "Long-term planning and decision-making aligned with goals", example: "I applied strategic thinking to prioritize high-impact initiatives", whyItHelps: "Shows big-picture awareness beyond tactical execution" },
        { word: "Stakeholder management", pos: "noun phrase", definition: "Effectively communicating with and influencing key parties", example: "I excelled at stakeholder management by aligning diverse team interests", whyItHelps: "Critical for leadership and cross-functional roles" },
        { word: "Data-driven", pos: "adjective", definition: "Making decisions based on metrics and analysis rather than intuition", example: "I took a data-driven approach to optimize our marketing spend", whyItHelps: "Shows analytical rigor and results-focus" },
        { word: "Streamline", pos: "verb", definition: "To make a process more efficient by simplifying steps", example: "I streamlined the approval process, reducing cycle time by 40%", whyItHelps: "Demonstrates operational excellence and efficiency mindset" },
        { word: "Mitigate", pos: "verb", definition: "To reduce the severity or impact of something negative", example: "I mitigated project risk by implementing weekly check-ins", whyItHelps: "Shows proactive problem-solving and risk awareness" },
        { word: "Facilitate", pos: "verb", definition: "To make an action or process easier or more efficient", example: "I facilitated cross-team workshops to align on priorities", whyItHelps: "Signals leadership and collaboration skills" },
        { word: "Tradeoff", pos: "noun", definition: "A balance between competing factors or priorities", example: "I evaluated tradeoffs between speed and quality", whyItHelps: "Shows mature judgment and decision-making" },
        { word: "Root-cause analysis", pos: "noun phrase", definition: "Systematic identification of the underlying reason for a problem", example: "I conducted root-cause analysis to prevent recurring issues", whyItHelps: "Demonstrates analytical depth and problem-solving rigor" }
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
 * Generate STAR-based rewrite with metrics (NEVER EMPTY)
 */
export function generateSTARRewrite(questionText, answerText, score, feedback) {
    const role = detectRole(questionText, answerText);

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

    // Remove profanity/unprofessional wording
    let enhanced = answerText
        .replace(/\b(damn|hell|crap|suck|stupid)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    // Add STAR structure if missing or weak
    if (!hasSTAR || wordCount < 30) {
        const sentences = enhanced.split(/[.!?]+/).filter(s => s.trim());
        if (sentences.length <= 2) {
            // Very short - add full STAR template
            enhanced = `In a previous role, ${sentences[0]?.trim().toLowerCase() || 'I faced a challenge'}. I was responsible for addressing this systematically. I took action by analyzing the root cause and implementing a targeted solution. This resulted in a ~30% improvement in key performance metrics.`;
        }
    }

    // Add metrics if missing
    if (!hasMetrics) {
        enhanced += " This led to approximately 25-30% improvement in key outcomes.";
    }

    // Role-specific enhancements
    if (role === 'dentist') {
        enhanced = enhanced.replace(/\b(helped|assisted)\b/gi, 'provided patient-centered care to');
        enhanced = enhanced.replace(/\b(fixed|solved)\b/gi, 'diagnosed and treated');
    } else if (role === 'engineer') {
        enhanced = enhanced.replace(/\b(made|created)\b/gi, 'architected and implemented');
        enhanced = enhanced.replace(/\b(fixed|solved)\b/gi, 'debugged and resolved');
    } else if (role === 'student') {
        enhanced = enhanced.replace(/\b(did|completed)\b/gi, 'took initiative to complete');
        enhanced = enhanced.replace(/\blearned\b/gi, 'rapidly acquired proficiency in');
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
 * Generate signal-based "what worked" feedback (2-4 items)
 */
export function generateSignalBasedFeedback(feedback, answerText) {
    const signals = [];

    if (feedback.clarity >= 20) {
        signals.push("Your clear communication signals strong presentation skills, which matters because hiring managers need to trust you'll represent the team well.");
    }

    if (feedback.structure >= 20) {
        signals.push("Your structured approach signals organized thinking, which matters because complex projects require systematic problem-solving.");
    }

    if (feedback.metrics >= 15) {
        signals.push("Your use of metrics signals results-orientation, which matters because employers need evidence of impact, not just effort.");
    }

    if (feedback.relevance >= 20) {
        signals.push("Your focused answer signals you understand the question, which matters because it shows you listen and respond appropriately.");
    }

    // Ensure 2-4 items
    if (signals.length === 0) {
        signals.push("You provided a response, which signals willingness to engage, though adding specific examples would strengthen your candidacy.");
        signals.push("Your answer shows basic communication, but lacks the depth hiring managers need to assess your true capability.");
    }

    return signals.slice(0, 4);
}

/**
 * Generate actionable "improve next" feedback (2-4 items)
 */
export function generateActionableImprovements(feedback, answerText, score) {
    const improvements = [];

    if (feedback.metrics < 15) {
        improvements.push("Add one measurable outcome: time saved, error reduction, satisfaction score, or revenue impact.");
    }

    if (feedback.structure < 15) {
        improvements.push("Restructure using STAR: start with context, state your role, describe actions, end with results.");
    }

    if (feedback.clarity < 15) {
        improvements.push("Tighten your language: remove filler words, use active voice, keep sentences under 20 words.");
    }

    if (!/\d/.test(answerText)) {
        improvements.push("Include at least one number: percentage change, dollar amount, time frame, or team size.");
    }

    const wordCount = answerText.split(/\s+/).length;
    if (wordCount < 30) {
        improvements.push("Expand to 50-150 words to provide sufficient context and detail.");
    } else if (wordCount > 200) {
        improvements.push("Condense to 100-150 words: focus on the most impactful details.");
    }

    // Ensure 2-4 items
    if (improvements.length === 0) {
        improvements.push("Add a specific example with concrete details to make your experience more memorable.");
        improvements.push("Quantify your impact with before/after metrics to demonstrate value.");
    }

    return improvements.slice(0, 4);
}

/**
 * Generate blunt, helpful hiring manager interpretation
 */
export function generateHiringManagerInterpretation(score, feedback, answerText) {
    const hasMetrics = /\d+%|\d+x|by \d+/.test(answerText);
    const wordCount = answerText.split(/\s+/).length;
    const hasSTAR = answerText.split(/[.!?]/).length >= 3;

    // Determine seniority perception
    let seniority = 'junior';
    if (score >= 75 && hasMetrics && feedback.structure >= 18) seniority = 'senior';
    else if (score >= 60 && (hasMetrics || feedback.structure >= 15)) seniority = 'mid-level';

    // Build blunt, helpful interpretation
    if (score >= 80) {
        return `The candidate clearly knows what they're doing. ${hasMetrics ? 'Quantified results show impact awareness.' : 'Good structure but would like to see more metrics.'} ${seniority === 'senior' ? 'Reads as senior-level.' : 'Solid mid-level.'} Would interview. Low risk.`;
    } else if (score >= 60) {
        return `Decent answer but ${!hasMetrics ? 'no numbers makes it hard to gauge actual impact' : 'structure is weak, hard to follow the story'}. ${seniority === 'mid-level' ? 'Probably mid-level but needs validation.' : 'Seems junior, would need coaching.'} Moderate risk - need more data points.`;
    } else if (score >= 40) {
        return `Candidate can talk but lacks specifics. ${!hasMetrics ? 'Zero metrics - can\'t tell if they actually moved the needle.' : ''} ${!hasSTAR ? 'No clear story structure.' : ''} Reads as junior. Would pass unless desperate. Higher risk.`;
    } else {
        return `Not enough here to evaluate. ${wordCount < 20 ? 'Answer is too short.' : 'Lacks structure and substance.'} Can't assess competency from this. Would not move forward. High risk.`;
    }
}
