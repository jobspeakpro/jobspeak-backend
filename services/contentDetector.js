// jobspeak-backend/services/contentDetector.js
// Detects inappropriate content in transcripts for feedback grounding

/**
 * Comprehensive profanity detection
 * Includes common profanity, slurs, and unprofessional language
 */
const PROFANITY_PATTERNS = [
    // Common profanity
    /\bf+u+c+k+/i,
    /\bs+h+i+t+/i,
    /\bd+a+m+n+/i,
    /\bh+e+l+l+/i,
    /\ba+s+s+h+o+l+e+/i,
    /\bb+i+t+c+h+/i,
    /\bc+r+a+p+/i,
    /\bp+i+s+s+/i,
    /\bc+u+n+t+/i,
    /\bd+i+c+k+/i,
    /\bc+o+c+k+/i,

    // Unprofessional language
    /\bstupid\b/i,
    /\bidiot\b/i,
    /\bmoron\b/i,
    /\bdumb\b/i,
    /\bloser\b/i,
    /\bsucks\b/i,
    /\bshut\s+up\b/i,
    /\bshut\s+the\s+hell\s+up\b/i,
];

/**
 * Sexual content detection
 * Detects explicit sexual references
 */
const SEXUAL_CONTENT_PATTERNS = [
    /\bsex\b/i,
    /\bsexy\b/i,
    /\bporn/i,
    /\bnaked\b/i,
    /\bnude\b/i,
    /\bbreast/i,
    /\bgenitals?\b/i,
    /\berotic\b/i,
    /\bmasturbat/i,
    /\borgasm/i,
    /\bviagra\b/i,
    /\bprostitut/i,
    /\bstrip\s+club\b/i,
    /\bsexual\s+harass/i,
    /\binappropriate\s+touch/i,
];

/**
 * Threat and violence detection
 * Detects aggressive, violent, or threatening language
 */
const THREAT_PATTERNS = [
    /\bkill\b/i,
    /\bmurder\b/i,
    /\bpunch\b/i,
    /\bhit\b/i,
    /\bbeat\s+up\b/i,
    /\bslap\b/i,
    /\bstab\b/i,
    /\bshoot\b/i,
    /\battack\b/i,
    /\bharm\b/i,
    /\bhurt\b/i,
    /\bdestroy\b/i,
    /\bthreaten/i,
    /\bviolence\b/i,
    /\bwanted\s+to\s+punch\b/i,
    /\bwanted\s+to\s+hit\b/i,
    /\bwanted\s+to\s+kill\b/i,
    /\bi\s+hate\b/i,
    /\bhate\s+them\b/i,
];

/**
 * Test text against an array of regex patterns
 * @param {string} text - Text to test
 * @param {RegExp[]} patterns - Array of regex patterns
 * @returns {boolean} - True if any pattern matches
 */
function matchesAnyPattern(text, patterns) {
    if (!text || typeof text !== 'string') return false;
    return patterns.some(pattern => pattern.test(text));
}

/**
 * Detect profanity in text
 * @param {string} text - Text to analyze
 * @returns {boolean} - True if profanity detected
 */
export function detectProfanity(text) {
    return matchesAnyPattern(text, PROFANITY_PATTERNS);
}

/**
 * Detect sexual content in text
 * @param {string} text - Text to analyze
 * @returns {boolean} - True if sexual content detected
 */
export function detectSexualContent(text) {
    return matchesAnyPattern(text, SEXUAL_CONTENT_PATTERNS);
}

/**
 * Detect threats or violence in text
 * @param {string} text - Text to analyze
 * @returns {boolean} - True if threats detected
 */
export function detectThreats(text) {
    return matchesAnyPattern(text, THREAT_PATTERNS);
}

/**
 * Comprehensive content analysis
 * @param {string} text - Text to analyze
 * @returns {Object} - Analysis results with all flags
 */
export function analyzeContent(text) {
    const profanityDetected = detectProfanity(text);
    const sexualContentDetected = detectSexualContent(text);
    const threatsDetected = detectThreats(text);

    const hasInappropriateContent = profanityDetected || sexualContentDetected || threatsDetected;

    return {
        profanityDetected,
        sexualContentDetected,
        threatsDetected,
        hasInappropriateContent,
        flags: {
            profanity: profanityDetected,
            sexual: sexualContentDetected,
            threats: threatsDetected,
        }
    };
}

/**
 * Extract a quote from the text that triggered the content detection
 * Useful for grounding feedback in actual transcript content
 * @param {string} text - Original text
 * @param {Object} analysis - Content analysis result
 * @returns {string|null} - Problematic quote or null
 */
export function extractProblematicQuote(text, analysis) {
    if (!analysis.hasInappropriateContent) return null;

    // Find the first sentence or phrase containing inappropriate content
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);

    for (const sentence of sentences) {
        if (detectProfanity(sentence) || detectSexualContent(sentence) || detectThreats(sentence)) {
            // Return first 100 chars of problematic sentence
            return sentence.length > 100 ? sentence.substring(0, 100) + '...' : sentence;
        }
    }

    // Fallback: return first 100 chars of entire text
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
}
