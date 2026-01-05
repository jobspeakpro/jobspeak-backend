
import { generateSTARRewrite, sanitizeForProfessionalism } from '../services/intelligentFeedbackGenerator.js';

console.log("=== PROFESSIONALISM GATE VERIFICATION ===\n");

const tests = [
    { name: "Profanity (F-word)", input: "I fucked up the database migration.", expectedFlag: true },
    { name: "Sexual Content", input: "I like pussy and I want it tonight.", expectedFlag: true },
    { name: "Informal/Flirty", input: "Hey sugar, I don't know girl, I just want you.", expectedFlag: true }, // "girl" is in list? Yes.
    { name: "Safe Professional", input: "I managed a large team of 50 engineers.", expectedFlag: false },
    { name: "Safe but Conflict", input: "I had a disagreement with my manager about the timeline.", expectedFlag: false }
];

let passed = 0;

tests.forEach(test => {
    console.log(`[TEST] ${test.name}`);
    console.log(`Input: "${test.input}"`);

    // 1. Check Sanitize Direct
    const sanitized = sanitizeForProfessionalism(test.input);
    console.log(`Sanitized: Flagged=${sanitized.flagged}, Reasons=[${sanitized.reasons.join(', ')}]`);

    // 2. Check Rewrite Generation
    // Mock feedback/score
    const result = generateSTARRewrite("Tell me about a time you failed", test.input, 50, { metrics: 0, structure: 0 }, [{ word: "Focus", pos: "verb" }, { word: "Result", pos: "noun" }]);

    console.log(`Rewrite: "${result.text}"`);
    console.log(`Metadata:`, result.professionalism);

    // Validation
    if (sanitized.flagged === test.expectedFlag) {
        // If flagged, ensure rewrite DOES NOT contain original unsafe input words
        if (test.expectedFlag) {
            const unsafeWords = ["fuck", "pussy", "girl", "sugar"]; // simplified check
            const hasUnsafe = unsafeWords.some(w => result.text.toLowerCase().includes(w));
            if (!hasUnsafe && result.professionalism.flagged === true && result.professionalism.replaced === true) {
                console.log("✅ PASS: Flagged and cleaned correctly.");
                passed++;
            } else {
                console.log("❌ FAIL: Flagged but contained unsafe words OR metadata mismatch.");
            }
        } else {
            console.log("✅ PASS: Correctly identified as safe.");
            passed++;
        }
    } else {
        console.log(`❌ FAIL: Expected flagged=${test.expectedFlag}, got ${sanitized.flagged}`);
    }
    console.log("-".repeat(40));
});

console.log(`\nResults: ${passed}/${tests.length} passed.`);
if (passed === tests.length) process.exit(0);
else process.exit(1);
