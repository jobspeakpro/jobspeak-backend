// jobspeak-backend/services/vocabularyEnhancer.js
// Generate vocabulary suggestions and improved rewrites

/**
 * Common weak words to replace in interview answers
 */
const WEAK_WORD_REPLACEMENTS = {
    'helped': ['spearheaded', 'facilitated', 'orchestrated', 'coordinated'],
    'did': ['executed', 'implemented', 'delivered', 'accomplished'],
    'made': ['created', 'developed', 'established', 'built'],
    'worked on': ['led', 'drove', 'championed', 'managed'],
    'good': ['effective', 'successful', 'impactful', 'valuable'],
    'bad': ['challenging', 'problematic', 'inefficient', 'suboptimal'],
    'a lot': ['significantly', 'substantially', 'considerably', 'extensively'],
    'very': ['extremely', 'highly', 'remarkably', 'exceptionally'],
    'things': ['initiatives', 'projects', 'solutions', 'deliverables'],
    'stuff': ['components', 'elements', 'features', 'aspects'],
    'got': ['achieved', 'obtained', 'secured', 'attained'],
    'used': ['leveraged', 'utilized', 'employed', 'applied'],
    'big': ['substantial', 'significant', 'major', 'considerable'],
    'small': ['minor', 'incremental', 'targeted', 'focused'],
    'problem': ['challenge', 'obstacle', 'issue', 'bottleneck'],
    'fix': ['resolve', 'address', 'remediate', 'optimize']
};

/**
 * Extract vocabulary suggestions from answer
 * @param {string} answerText - User's answer
 * @returns {Array} Vocabulary suggestions
 */
export function generateVocabularySuggestions(answerText) {
    if (!answerText || answerText.trim().length === 0) {
        return [
            "Use action verbs like 'spearheaded', 'implemented', 'optimized'",
            "Replace vague terms with specific metrics and outcomes"
        ];
    }

    const suggestions = [];
    const lowerAnswer = answerText.toLowerCase();

    // Find weak words in the answer
    for (const [weakWord, strongWords] of Object.entries(WEAK_WORD_REPLACEMENTS)) {
        const regex = new RegExp(`\\b${weakWord}\\b`, 'i');
        if (regex.test(lowerAnswer)) {
            const replacement = strongWords[0];
            const example = answerText.replace(regex, replacement);
            const exampleSnippet = example.substring(0, 60) + '...';

            suggestions.push(
                `Replace '${weakWord}' → '${replacement}' (e.g., "${exampleSnippet}")`
            );

            if (suggestions.length >= 6) break;
        }
    }

    // Add generic suggestions if we don't have enough
    if (suggestions.length < 3) {
        const genericSuggestions = [
            "Use quantifiable metrics (e.g., 'increased by 40%', 'reduced from 5s to 1s')",
            "Replace passive voice with active voice (e.g., 'I led' instead of 'was led by')",
            "Add specific technical terms relevant to your role",
            "Use power verbs: 'orchestrated', 'architected', 'pioneered'",
            "Include business impact terms: 'revenue', 'efficiency', 'scalability'"
        ];

        while (suggestions.length < 3 && genericSuggestions.length > 0) {
            suggestions.push(genericSuggestions.shift());
        }
    }

    return suggestions.slice(0, 6);
}

/**
 * Generate a clearer rewrite of the answer
 * @param {string} questionText - The question asked
 * @param {string} answerText - User's original answer
 * @param {number} score - Evaluation score
 * @returns {string} Improved version of the answer
 */
export function generateClearerRewrite(questionText, answerText, score) {
    if (!answerText || answerText.trim().length === 0) {
        return "Provide a structured answer using the STAR format: describe the Situation, your Task, the Actions you took, and the Results you achieved. Include specific metrics where possible.";
    }

    // If answer is already good (score >= 80), minimal changes
    if (score >= 80) {
        return enhanceAnswer(answerText, 'minimal');
    }

    // If answer needs work (score < 60), more substantial rewrite
    if (score < 60) {
        return enhanceAnswer(answerText, 'substantial');
    }

    // Medium score: moderate enhancement
    return enhanceAnswer(answerText, 'moderate');
}

/**
 * Enhance answer based on level
 */
function enhanceAnswer(answerText, level) {
    let enhanced = answerText;

    // Replace weak words with stronger alternatives
    for (const [weakWord, strongWords] of Object.entries(WEAK_WORD_REPLACEMENTS)) {
        const regex = new RegExp(`\\b${weakWord}\\b`, 'gi');
        if (regex.test(enhanced)) {
            enhanced = enhanced.replace(regex, strongWords[0]);
        }
    }

    // Add structure hints if substantial rewrite needed
    if (level === 'substantial') {
        const sentences = enhanced.split(/[.!?]+/).filter(s => s.trim().length > 0);

        if (sentences.length === 1) {
            // Very short answer - add STAR structure template
            return `[Situation] ${enhanced.trim()}. [Task] I was responsible for addressing this challenge. [Action] I implemented a solution by analyzing the problem and taking targeted steps. [Result] This led to measurable improvements in efficiency and outcomes.`;
        }

        // Add metric placeholders if missing numbers
        if (!/\d/.test(enhanced)) {
            enhanced += " This resulted in a X% improvement in key metrics.";
        }
    }

    // Add connecting words for better flow
    if (level !== 'minimal') {
        enhanced = enhanced
            .replace(/\. I /g, '. Subsequently, I ')
            .replace(/^I /, 'In this situation, I ');
    }

    return enhanced.trim();
}
