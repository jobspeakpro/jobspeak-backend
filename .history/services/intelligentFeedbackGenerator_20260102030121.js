// jobspeak-backend/services/intelligentFeedbackGenerator.js
// Hire-grade, role-aware feedback generation - ENHANCED VERSION

/**
 * Expanded role-specific vocabulary database with POS and why it helps
 */
/**
 * Expanded Dictionary of Hire-Grade Vocabulary
 */
/**
 * Expanded Dictionary of Hire-Grade Vocabulary
 */
export const VOCAB_DATA = {

    // COMMUNICATION
    "articulate": { pos: "verb", phonetic: "/ɑːrˈtɪkjʊleɪt/", definition: "To express an idea clearly", example: "I <u>articulated</u> the risks to the stakeholders.", whyItHelps: "Shows clarity of thought" },
    "align": { pos: "verb", phonetic: "/əˈlaɪn/", definition: "To bring into agreement", example: "I worked to <u>align</u> the team on the new goals.", whyItHelps: "Crucial for teamwork" },
    "negociate": { pos: "verb", phonetic: "/nɪˈɡoʊʃieɪt/", definition: "To find a compromise", example: "I <u>negotiated</u> a deadline extension.", whyItHelps: "Demonstrates conflict resolution" },
    "facilitate": { pos: "verb", phonetic: "/fəˈsɪlɪteɪt/", definition: "To make a process easier", example: "I <u>facilitated</u> the design workshop.", whyItHelps: "Signals leadership" },
    "advocate": { pos: "verb", phonetic: "/ˈædvəkeɪt/", definition: "To support a cause or person", example: "I <u>advocated</u> for the user's needs.", whyItHelps: "Shows empathy and conviction" },
    "clarify": { pos: "verb", phonetic: "/ˈklærɪfaɪ/", definition: "To make less confusing", example: "I asked questions to <u>clarify</u> the requirements.", whyItHelps: "Prevents costly mistakes" },
    "mediate": { pos: "verb", phonetic: "/ˈmiːdieɪt/", definition: "To intervene in a dispute", example: "I helped <u>mediate</u> the disagreement.", whyItHelps: "Shows emotional intelligence" },

    // EXECUTION
    "prioritize": { pos: "verb", phonetic: "/praɪˈɔːrɪtaɪz/", definition: "To determine what is most important", example: "I <u>prioritized</u> the critical bugs first.", whyItHelps: "Shows time management" },
    "execute": { pos: "verb", phonetic: "/ˈɛksɪkjuːt/", definition: "To carry out a plan", example: "I <u>executed</u> the launch strategy.", whyItHelps: "Focuses on results" },
    "coordinate": { pos: "verb", phonetic: "/koʊˈɔːrdɪneɪt/", definition: "To organize diverse elements", example: "I <u>coordinated</u> the cross-team effort.", whyItHelps: "Shows organizational skill" },
    "drive": { pos: "verb", phonetic: "/draɪv/", definition: "To propel or carry along", example: "I helped <u>drive</u> the project to completion.", whyItHelps: "Demonstrates energy and ownership" },
    "implement": { pos: "verb", phonetic: "/ˈɪmplɪmɛnt/", definition: "To put into effect", example: "We <u>implemented</u> a new testing protocol.", whyItHelps: "Shows technical capability" },
    "spearhead": { pos: "verb", phonetic: "/ˈspɪrhɛd/", definition: "To lead a movement or attack", example: "I <u>spearheaded</u> the migration initiative.", whyItHelps: "Strong leadership word" },

    // PROBLEM SOLVING
    "diagnose": { pos: "verb", phonetic: "/ˌdaɪəɡˈnoʊs/", definition: "To identify the nature of a problem", example: "I <u>diagnosed</u> the root cause of the latency.", whyItHelps: "Shows analytical depth" },
    "troubleshoot": { pos: "verb", phonetic: "/ˈtrʌbəlʃuːt/", definition: "To trace and correct faults", example: "I <u>troubleshot</u> the connection failures.", whyItHelps: "Demonstrates persistence" },
    "investigate": { pos: "verb", phonetic: "/ɪnˈvɛstɪɡeɪt/", definition: "To observe or study by close examination", example: "I <u>investigated</u> the discrepancy in data.", whyItHelps: "Shows thoroughness" },
    "resolve": { pos: "verb", phonetic: "/rɪˈzɒlv/", definition: "To find a solution", example: "I <u>resolved</u> the conflict by finding common ground.", whyItHelps: "Focuses on outcomes" },
    "assess": { pos: "verb", phonetic: "/əˈsɛs/", definition: "To estimate the nature or quality", example: "I <u>assessed</u> the impact of the delay.", whyItHelps: "Shows strategic thinking" },

    // LEADERSHIP
    "mentor": { pos: "verb", phonetic: "/ˈmɛntɔːr/", definition: "To advise and train", example: "I <u>mentored</u> two junior engineers.", whyItHelps: "Shows investment in others" },
    "empower": { pos: "verb", phonetic: "/ɪmˈpaʊər/", definition: "To give power or authority", example: "I <u>empowered</u> the team to make decisions.", whyItHelps: "Good management style" },
    "influence": { pos: "verb", phonetic: "/ˈɪnfluəns/", definition: "To have an effect on", example: "I used data to <u>influence</u> the roadmap.", whyItHelps: "Critical for senior roles" },
    "guide": { pos: "verb", phonetic: "/ɡaɪd/", definition: "To show the way", example: "I <u>guided</u> the new hires through onboarding.", whyItHelps: "Shows supportiveness" },
    "motivate": { pos: "verb", phonetic: "/ˈmoʊtɪveɪt/", definition: "To provide a motive", example: "I tried to <u>motivate</u> the team during the crunch.", whyItHelps: "Emotional intelligence" },

    // EFFICIENCY
    "optimize": { pos: "verb", phonetic: "/ˈɒptɪmaɪz/", definition: "To make as perfect as effective as possible", example: "I <u>optimized</u> the workflow to save time.", whyItHelps: "Results oriented" },
    "streamline": { pos: "verb", phonetic: "/ˈstriːmlaɪn/", definition: "To make simpler or more efficient", example: "I <u>streamlined</u> the approval process.", whyItHelps: "Process improvement focus" },
    "accelerate": { pos: "verb", phonetic: "/ækˈsɛləreɪt/", definition: "To move faster", example: "We <u>accelerated</u> the release schedule.", whyItHelps: "Shows speed of execution" },
    "enhance": { pos: "verb", phonetic: "/ɪnˈhɑːns/", definition: "To improve the quality", example: "I <u>enhanced</u> the user documentation.", whyItHelps: "Commitment to quality" },
    "quantify": { pos: "verb", phonetic: "/ˈkwɑːntɪfaɪ/", definition: "To express or measure the amount of something", example: "I <u>quantified</u> the impact by tracking time saved each week.", whyItHelps: "Shows data-driven thinking" },

    // STRATEGY & ANALYSIS
    "synthesize": { pos: "verb", phonetic: "/ˈsɪnθəsaɪz/", definition: "To combine elements into a coherent whole", example: "I <u>synthesized</u> feedback from multiple teams.", whyItHelps: "Shows analytical thinking" },
    "validate": { pos: "verb", phonetic: "/ˈvælɪdeɪt/", definition: "To check or prove the validity", example: "I <u>validated</u> the assumptions with user research.", whyItHelps: "Shows rigor" },
    "initiate": { pos: "verb", phonetic: "/ɪˈnɪʃieɪt/", definition: "To cause a process to begin", example: "I <u>initiated</u> the code review process.", whyItHelps: "Shows proactivity" },
    "collaborate": { pos: "verb", phonetic: "/kəˈlæbəreɪt/", definition: "To work jointly with others", example: "I <u>collaborated</u> with the design team.", whyItHelps: "Teamwork focus" },
    "innovate": { pos: "verb", phonetic: "/ˈɪnəveɪt/", definition: "To introduce new methods or ideas", example: "We <u>innovated</u> on the user experience.", whyItHelps: "Shows creativity" },

    // IMPACT & OUTCOMES  
    "impact": { pos: "noun", phonetic: "/ˈɪmpækt/", definition: "The effect or influence of something", example: "The <u>impact</u> was measurable in user satisfaction.", whyItHelps: "Results-oriented" },
    "efficiency": { pos: "noun", phonetic: "/ɪˈfɪʃənsi/", definition: "The state of achieving maximum productivity", example: "I improved team <u>efficiency</u> by 30%.", whyItHelps: "Shows optimization mindset" },
    "resolution": { pos: "noun", phonetic: "/ˌrɛzəˈluːʃən/", definition: "The action of solving a problem", example: "The <u>resolution</u> came from better communication.", whyItHelps: "Problem-solving focus" },
    "alignment": { pos: "noun", phonetic: "/əˈlaɪnmənt/", definition: "Agreement or cooperation", example: "We achieved <u>alignment</u> on priorities.", whyItHelps: "Shows collaboration" },
    "decision": { pos: "noun", phonetic: "/dɪˈsɪʒən/", definition: "A conclusion reached after consideration", example: "I made the <u>decision</u> to pivot the strategy.", whyItHelps: "Shows ownership" },
    "strategy": { pos: "noun", phonetic: "/ˈstrætədʒi/", definition: "A plan of action designed to achieve a goal", example: "Our <u>strategy</u> focused on user retention.", whyItHelps: "Strategic thinking" },
    "mentorship": { pos: "noun", phonetic: "/ˈmɛntɔːrʃɪp/", definition: "The guidance provided by a mentor", example: "I provided <u>mentorship</u> to junior developers.", whyItHelps: "Leadership quality" },

    // NOUNS (Special Handling)
    "scalability": { pos: "noun", phonetic: "/ˌskeɪləˈbɪləti/", definition: "Ability to handle growth", example: "I focused on <u>scalability</u>.", whyItHelps: "System design focus" },
    "initiative": { pos: "noun", phonetic: "/ɪˈnɪʃətɪv/", definition: "Power or opportunity to act", example: "I took <u>initiative</u>.", whyItHelps: "Self-starter" },
    "empathy": { pos: "noun", phonetic: "/ˈɛmpəθi/", definition: "Understanding others' feelings", example: "I led with <u>empathy</u>.", whyItHelps: "Emotional intelligence" },
    "transparency": { pos: "noun", phonetic: "/trænsˈpærənsi/", definition: "Openness and accountability", example: "I valued <u>transparency</u>.", whyItHelps: "Builds trust" }
};

const SKILL_CATEGORIES = {
    communication: ["articulate", "align", "facilitate", "clarify", "advocate", "mediate"],
    execution: ["prioritize", "execute", "coordinate", "drive", "implement", "spearhead"],
    problemSolving: ["diagnose", "troubleshoot", "investigate", "resolve", "assess"],
    leadership: ["mentor", "empower", "influence", "guide", "motivate", "initiative"],
    efficiency: ["optimize", "streamline", "accelerate", "enhance", "scalability"],
    default: ["prioritize", "facilitate", "resolve", "collaborate", "adapt"]
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
 * Generate role/context-specific vocabulary (5-8 items with full structure)
 */
export function generateRoleVocabulary(questionText, answerText) {
    const q = (questionText + ' ' + answerText).toLowerCase();

    // Determine primary skill category
    let category = 'default';
    if (q.match(/conflict|disagree|argue|persuade|team|people/)) category = 'communication';
    else if (q.match(/execute|ship|deliver|plan|manage/)) category = 'execution';
    else if (q.match(/fail|mistake|error|bug|fix|solve/)) category = 'problemSolving';
    else if (q.match(/lead|mentor|grow|guide|strategic/)) category = 'leadership';
    else if (q.match(/fast|slow|efficient|scale|optimize/)) category = 'efficiency';

    let keys = SKILL_CATEGORIES[category] || SKILL_CATEGORIES.default;

    // Mix in some default execution/efficiency words if list is short
    if (keys.length < 5) {
        keys = [...keys, ...SKILL_CATEGORIES.execution.slice(0, 3)];
    }

    // Convert keys to full objects
    const fullObjects = keys.map(k => {
        const data = VOCAB_DATA[k] || VOCAB_DATA[k.toLowerCase()];
        if (!data) return null;
        return {
            word: k.charAt(0).toUpperCase() + k.slice(1),
            partOfSpeech: data.pos, // Include explicitly as requested
            ipa: data.phonetic || '', // Restore IPA
            audioUrl: `/api/tts?text=${encodeURIComponent(k)}&voice=en-US`, // Restore Audio
            ...data
        };
    }).filter(Boolean);

    // Return 5-8 items shuffled
    const count = Math.min(8, Math.max(5, Math.floor(Math.random() * 4) + 5));
    const shuffled = [...fullObjects].sort(() => Math.random() - 0.5);
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
// --- PROFESSIONALISM SAFEGUARDS ---

const BANNED_PATTERNS = {
    // Catch roots for strong profanity (fuck->fucking, shit->shitty) but be careful with others
    profanity: /\b(fuck[a-z]*|shit[a-z]*|bitch[a-z]*|cunt[a-z]*|damn|hell|ass|bastard|piss|dick|cock|pussy|slut|whore)\b/i,
    sexual: /\b(sex|sexual|sexy|nude|naked|erotic|arouse|orgasm|penetrate|intercourse|blowjob|handjob)\b/i,
    slurs: /\b(nigger|faggot|retard|spic|chink|kike|dyke|tranny)\b/i,
    informal: /\b(girl|baby|tonight|babe|honey|sweetie|yo|bro|dude|nah|gonna|wanna|gotta)\b/i,
    harassment: /\b(hate|kill|murder|die|stupid|idiot|dumb|ugly|fat)\b/i
};

/**
 * Sanitize text for professionalism
 * @param {string} text 
 * @returns {Object} { flagged: boolean, reasons: string[], cleanedText: string }
 */
export function sanitizeForProfessionalism(text) {
    let flagged = false;
    let reasons = [];
    let cleanedText = text;

    for (const [category, regex] of Object.entries(BANNED_PATTERNS)) {
        if (regex.test(text)) {
            flagged = true;
            reasons.push(category);
            // Redact offending words
            cleanedText = cleanedText.replace(new RegExp(regex, 'gi'), '[REDACTED]');
        }
    }

    return { flagged, reasons, cleanedText };
}


/**
 * Generate highly contextual, spoken-style rewrite (Target: 90%+ Hire Likelihood)
 */
export function generateSTARRewrite(questionText, answerText, score, feedback, forcedVocab = null) {
    // 1. PROFESSIONALISM GATE
    const safetyCheck = sanitizeForProfessionalism(answerText);
    const isSafe = !safetyCheck.flagged;

    let v1, v2;
    // Use forced vocab if provided (ENSURES UI MATCH)
    if (forcedVocab && forcedVocab.length >= 2) {
        v1 = forcedVocab[0];
        v2 = forcedVocab[1];
    } else {
        // Fallback: Generate fresh list if none provided
        const fullList = generateRoleVocabulary(questionText, answerText);
        // Ensure at least 2
        if (fullList.length < 2) {
            // Emergency fallback
            const emergency = SKILL_CATEGORIES.default.slice(0, 2).map(k => ({ word: k, ...VOCAB_DATA[k] }));
            v1 = emergency[0];
            v2 = emergency[1];
        } else {
            v1 = fullList[0];
            v2 = fullList[1];
        }
    }

    // Helper to build a natural sentence fragment based on POS
    const buildActionPhrase = (v) => {
        const w = v.word.toLowerCase();
        if (v.pos.includes('noun')) {
            const templates = [
                `focused heavily on <u>${w}</u>`,
                `made <u>${w}</u> a top priority`,
                `ensured <u>${w}</u> was central to my plan`
            ];
            return templates[Math.floor(Math.random() * templates.length)];
        } else {
            // Verbs
            const templates = [
                `took steps to <u>${w}</u> the situation`,
                `worked diligently to <u>${w}</u> the process`,
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
                `demonstrated the huge value of <u>${w}</u>`,
                `significantly strengthened our <u>${w}</u>`
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

    // Remove legacy cleaning, rely on new gate
    const cleanAnswer = answerText.trim();
    const sentences = cleanAnswer.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences[0]) {
        // Take first sentence but cap length to avoid rambling
        userContext = sentences[0].substring(0, 80).trim();
        if (!userContext.endsWith('.')) userContext += '...';
    }
} else if (!isSafe) {
    // If flagged, use generic safe context based on type
    if (contextType === 'conflict') userContext = "there was a disagreement on the team strategy";
    else if (contextType === 'failure') userContext = "I encountered an unexpected issue with the deliverables";
    else if (contextType === 'leadership') userContext = "the team needed clear direction to move forward";
    else if (contextType === 'weakness') userContext = "I realized I needed to improve my workflow efficiency";
    else userContext = "I encountered a complex challenge that required immediate attention";
}

let rewrite = "";

// --- CONTEXT-AWARE ASSEMBLY (HIGH TENSION -> RESOLUTION) ---

// Note: We use the 'userContext' which is now guaranteed safe (either extracting from safe text or using safe template)

if (contextType === 'conflict') {
    rewrite = `In a past situation, I disagreed with a colleague on the best approach. ${userContext}, but we hit a wall. I knew we needed alignment, so I asked questions to understand their perspective. I ${buildActionPhrase(v1)} to bridge the gap. We found a compromise that worked for everyone. This choice ${buildResultPhrase(v2)} and kept the relationship professional.`;
}
else if (contextType === 'failure') {
    rewrite = `I once made a mistake where I missed a key detail. ${userContext}. I took immediate ownership rather than making excuses. I communicated the issue and ${buildActionPhrase(v1)} to fix it. I also documented the error to prevent recurrence. This experience taught me to ${buildResultPhrase(v2)}, making me a more reliable professional.`;
}
else if (contextType === 'leadership') {
    rewrite = `I noticed the team was facing a blocked workflow. ${userContext}. I stepped in to provide clear direction while giving them space to own the work. I ${buildActionPhrase(v1)} so everyone felt supported. By checking in regularly, I ${buildResultPhrase(v2)}. The team delivered the project successfully and morale remained high.`;
}
else if (contextType === 'weakness') {
    rewrite = `I used to struggle with taking on too much. ${userContext}. I realized I needed a better system, so I started prioritizing my day differently. I ${buildActionPhrase(v1)} to stay organized. This shift ${buildResultPhrase(v2)} with my stakeholders. Call it a lesson learned in sustainable working.`;
}
else {
    // Default / Challenge
    rewrite = `In a previous role, ${userContext}. I assessed the situation and noticed a clear friction point. I knew I needed to act, so I ${buildActionPhrase(v1)} to hit the ground running. I broke the problem down and ${buildResultPhrase(v2)}. By staying focused on the goal, I drove a strong, measurable result.`;
}

let hireProbability = 92;
if (feedback.metrics >= 15) hireProbability += 3;
if (feedback.structure >= 20) hireProbability += 3;

return {
    text: rewrite,
    hireProbabilityEstimate: Math.min(99, hireProbability),
    usedVocabulary: [v1, v2], // Return exact words used for UI sync
    professionalism: {
        flagged: safetyCheck.flagged,
        reasons: safetyCheck.reasons,
        replaced: safetyCheck.flagged // True if we replaced context due to flags
    }
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
 * ALWAYS returns a populated, conversational interpretation
 */
export function generateHiringManagerInterpretation(score, feedback, answerText) {
    // Ensure we have valid input
    if (!answerText || answerText.trim().length === 0) {
        return "The candidate didn't provide enough information for me to assess their capabilities.";
    }

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
        // Fallback for very low scores
        return "Not enough here to tell if they can do the job. I'd pass and keep looking for a stronger candidate.";
    }
}

