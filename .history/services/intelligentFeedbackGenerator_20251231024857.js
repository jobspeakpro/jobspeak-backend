// jobspeak-backend/services/intelligentFeedbackGenerator.js
// Hire-grade, role-aware feedback generation

/**
 * Role-specific vocabulary database
 */
const ROLE_VOCABULARY = {
    dentist: [
        { word: "Patient-centered care", definition: "An approach that prioritizes patient outcomes and experience", example: "I applied patient-centered care by actively listening to patient concerns before treatment" },
        { word: "Clinical efficacy", definition: "The proven effectiveness of a treatment or procedure", example: "I improved clinical efficacy by implementing evidence-based protocols" },
        { word: "Chairside manner", definition: "Professional demeanor and communication with patients during treatment", example: "My chairside manner helped reduce patient anxiety by 40%" },
        { word: "Treatment planning", definition: "Strategic approach to diagnosing and addressing dental health issues", example: "I developed comprehensive treatment planning that increased case acceptance" },
        { word: "Preventive dentistry", definition: "Focus on preventing dental problems before they occur", example: "I championed preventive dentistry through patient education programs" }
    ],
    engineer: [
        { word: "Technical debt", definition: "The implied cost of future rework caused by choosing quick solutions", example: "I reduced technical debt by refactoring legacy code with 95% test coverage" },
        { word: "Scalability", definition: "System's ability to handle growing workload efficiently", example: "I improved scalability by implementing distributed caching, reducing latency by 60%" },
        { word: "Cross-functional collaboration", definition: "Working effectively across different teams and disciplines", example: "I drove cross-functional collaboration between engineering and product teams" },
        { word: "System architecture", definition: "High-level structure and design of software systems", example: "I designed system architecture that supported 10x user growth" },
        { word: "Performance optimization", definition: "Improving system speed, efficiency, and resource usage", example: "I led performance optimization that cut server costs by 40%" }
    ],
    student: [
        { word: "Initiative", definition: "Taking action without being prompted; self-motivation", example: "I demonstrated initiative by founding a coding club that grew to 50 members" },
        { word: "Adaptability", definition: "Ability to adjust to new conditions and learn quickly", example: "I showed adaptability by mastering three new frameworks in one semester" },
        { word: "Collaboration", definition: "Working effectively with others toward common goals", example: "I strengthened collaboration skills by leading a team project to completion" },
        { word: "Problem-solving", definition: "Identifying issues and developing effective solutions", example: "I applied problem-solving by debugging complex code that stumped senior developers" },
        { word: "Time management", definition: "Efficiently organizing and prioritizing tasks", example: "I improved time management by balancing coursework, internship, and extracurriculars" }
    ],
    default: [
        { word: "Strategic thinking", definition: "Long-term planning and decision-making aligned with goals", example: "I applied strategic thinking to prioritize high-impact initiatives" },
        { word: "Stakeholder management", definition: "Effectively communicating with and influencing key parties", example: "I excelled at stakeholder management by aligning diverse team interests" },
        { word: "Data-driven decision making", definition: "Using metrics and analysis to guide choices", example: "I employed data-driven decision making to optimize our approach" },
        { word: "Process improvement", definition: "Identifying and implementing better ways of working", example: "I led process improvement that reduced cycle time by 30%" },
        { word: "Cross-team coordination", definition: "Aligning efforts across different groups", example: "I facilitated cross-team coordination to deliver on tight deadlines" }
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
 * Generate role-specific vocabulary
 */
export function generateRoleVocabulary(questionText, answerText) {
    const role = detectRole(questionText, answerText);
    const vocabList = ROLE_VOCABULARY[role] || ROLE_VOCABULARY.default;

    // Return 3-6 random items
    const count = Math.min(6, Math.max(3, Math.floor(Math.random() * 4) + 3));
    const shuffled = [...vocabList].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

/**
 * Generate STAR-based rewrite with metrics
 */
export function generateSTARRewrite(questionText, answerText, score, feedback) {
    if (!answerText || answerText.trim().length === 0) {
        return {
            text: "To provide a strong answer, structure your response using STAR: Situation (context), Task (your responsibility), Action (specific steps you took), and Result (measurable outcome). For example: 'In Q2 2023, our team faced a 40% increase in customer complaints (Situation). As the lead, I was tasked with identifying root causes (Task). I implemented a new feedback system and trained the team on active listening (Action). This reduced complaints by 65% within 3 months (Result).'",
            hireProbabilityEstimate: 15
        };
    }

    const role = detectRole(questionText, answerText);
    const hasMetrics = /\d+%|\d+x|by \d+|from \d+ to \d+/.test(answerText);
    const hasSTAR = answerText.split(/[.!?]/).length >= 3;

    // Build enhanced version
    let enhanced = answerText;

    // Add STAR structure if missing
    if (!hasSTAR) {
        const sentences = enhanced.split(/[.!?]+/).filter(s => s.trim());
        if (sentences.length === 1) {
            enhanced = `In a previous role, ${sentences[0].trim().toLowerCase()}. I was responsible for addressing this challenge systematically. I took action by analyzing the root cause and implementing a targeted solution. This resulted in measurable improvements in efficiency and outcomes.`;
        }
    }

    // Add metrics if missing
    if (!hasMetrics) {
        enhanced += " This led to a 30% improvement in key performance metrics.";
    }

    // Role-specific enhancements
    if (role === 'dentist') {
        enhanced = enhanced.replace(/helped|assisted/, 'provided patient-centered care to');
        enhanced = enhanced.replace(/fixed|solved/, 'diagnosed and treated');
    } else if (role === 'engineer') {
        enhanced = enhanced.replace(/made|created/, 'architected and implemented');
        enhanced = enhanced.replace(/fixed|solved/, 'debugged and resolved');
    } else if (role === 'student') {
        enhanced = enhanced.replace(/did|completed/, 'took initiative to complete');
        enhanced = enhanced.replace(/learned/, 'rapidly acquired proficiency in');
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
 * Generate signal-based "what worked" feedback
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

    // Add at least one signal
    if (signals.length === 0) {
        signals.push("You provided a response, which signals willingness to engage, though adding specific examples would strengthen your candidacy.");
    }

    return signals;
}

/**
 * Generate actionable "improve next" feedback
 */
export function generateActionableImprovements(feedback, answerText, score) {
    const improvements = [];

    if (feedback.metrics < 15) {
        improvements.push("Add one measurable outcome (time saved, error reduction, satisfaction score, revenue impact).");
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
        improvements.push("Expand your answer to 50-150 words to provide sufficient context and detail.");
    } else if (wordCount > 200) {
        improvements.push("Condense to 100-150 words: focus on the most impactful details.");
    }

    // Ensure at least one improvement
    if (improvements.length === 0) {
        improvements.push("Add a specific example with concrete details to make your experience more memorable.");
    }

    return improvements.slice(0, 3);
}

/**
 * Generate hiring manager interpretation
 */
export function generateHiringManagerInterpretation(score, feedback, answerText) {
    const hasMetrics = /\d+%|\d+x|by \d+/.test(answerText);
    const wordCount = answerText.split(/\s+/).length;

    // Determine seniority perception
    let seniority = 'junior';
    if (score >= 75 && hasMetrics && feedback.structure >= 18) seniority = 'senior';
    else if (score >= 60 && (hasMetrics || feedback.structure >= 15)) seniority = 'mid-level';

    // Build interpretation
    if (score >= 80) {
        return `Strong candidate. Communicates clearly with concrete outcomes. ${seniority === 'senior' ? 'Demonstrates senior-level impact awareness.' : 'Shows promise for growth.'} Low hiring risk.`;
    } else if (score >= 60) {
        return `Solid foundation but ${hasMetrics ? 'needs stronger structure' : 'lacks concrete outcomes'}, making impact harder to evaluate. ${seniority === 'mid-level' ? 'Appears mid-level.' : 'May need coaching.'} Moderate risk.`;
    } else if (score >= 40) {
        return `The candidate communicates but lacks specificity and measurable results. Difficult to assess true capability. Appears junior. Higher risk without further validation.`;
    } else {
        return `Insufficient detail to evaluate competency. Answer lacks structure, metrics, and clarity. Would require significant development. High hiring risk.`;
    }
}
