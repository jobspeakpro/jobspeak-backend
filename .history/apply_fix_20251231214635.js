
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'routes', 'mockInterview.js');
let content = fs.readFileSync(filePath, 'utf8');

// Use relaxed markers (trim whitespace issues by searching substring)
const startMarker = '// Generate per-question breakdown';
const endMarker = '// Calculate strongest area from strengths';

let startIdx = content.indexOf(startMarker);
let endIdx = content.indexOf(endMarker);

// Fallback search if exact match fails
if (startIdx === -1) {
    console.log("Start marker exact match failed, trying trimmed.");
    startIdx = content.indexOf('Generate per-question breakdown');
    // Adjust back to include comment slashes if found
    if (startIdx !== -1) startIdx -= 10; // Request is heuristic, careful
    // Safer: search for the code line below it
    if (startIdx === -1) startIdx = content.indexOf('const perQuestion = (attempts || []).map');
}

if (endIdx === -1) {
    console.log("End marker exact match failed, trying trimmed.");
    endIdx = content.indexOf('Calculate strongest area from strengths');
    if (endIdx !== -1) endIdx -= 10; // approximate
}

console.log(`Start Index: ${startIdx}, End Index: ${endIdx}`);

if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const replacement = `        // Generate per-question breakdown
        const usedVocabWords = new Set();
        
        const perQuestion = (attempts || []).map((attempt, index) => {
            // Get all potential vocab words from the attempt
            let rawVocab = attempt.vocabulary || [];
            if (!Array.isArray(rawVocab)) rawVocab = [];

            // Filter for uniqueness against session-wide set
            let uniqueVocab = [];
            for (const v of rawVocab) {
                 const w = (typeof v === 'string' ? v : v.word).trim();
                 if (!w) continue;
                 // Case-insensitive check
                 if (!usedVocabWords.has(w.toLowerCase())) {
                     uniqueVocab.push(typeof v === 'string' ? { word: w } : v);
                     usedVocabWords.add(w.toLowerCase());
                 }
                 if (uniqueVocab.length >= 2) break;
            }

            // Fallback: Pick random words from VOCAB_DATA that haven't been used if we don't have enough
            if (uniqueVocab.length < 2) {
                const allVocabKeys = Object.keys(VOCAB_DATA);
                for (const key of allVocabKeys) {
                    if (!usedVocabWords.has(key.toLowerCase())) {
                        uniqueVocab.push({ word: key.charAt(0).toUpperCase() + key.slice(1) });
                        usedVocabWords.add(key.toLowerCase());
                    }
                    if (uniqueVocab.length >= 2) break;
                }
            }
            
            // If still somehow < 2 (extremely rare), fallback to generic
            if (uniqueVocab.length < 2) {
                 if (!usedVocabWords.has('practice')) { uniqueVocab.push({ word: 'Practice' }); usedVocabWords.add('practice'); }
                 if (uniqueVocab.length < 2 && !usedVocabWords.has('result')) { uniqueVocab.push({ word: 'Result' }); usedVocabWords.add('result'); }
            }

            // Enrich with VOCAB_DATA
            const finalVocab = uniqueVocab.map(v => {
                const w = v.word;
                const enriched = VOCAB_DATA[w.toLowerCase()] || {};
                
                // Merge data: prefer enriched, fallback to existing v, fallback to defaults
                // Need to remove <u> tags from example if it comes from VOCAB_DATA or v
                const rawExample = enriched.example || v.example || '';
                const cleanExample = rawExample.replace(/<\\/?u>/g, '');

                return {
                    word: w,
                    ipa: enriched.phonetic || v.ipa || v.phonetic || '',
                    accent: "US",
                    audioText: w,
                    pos: enriched.pos || 'word',
                    definition: enriched.definition || 'Definition unavailable',
                    example: cleanExample
                };
            });

            // Ensure exactly 2 (should be guaranteed by fallback logic, but safety check)
            while (finalVocab.length < 2) {
                 finalVocab.push({ word: '', ipa: '', audioText: '', definition: '', example: '' });
            }

            const underlinedWords = finalVocab.map(v => v.word).filter(w => w);

            // Strip HTML from strongerExample text
            const cleanText = (attempt.clearer_rewrite || '').replace(/<\\/?[^>]+(>|$)/g, '');

            // Ensure we have the user transcript
            const transcript = attempt.answer_text || "";

            return {
                questionId: attempt.question_id || \`q\${index + 1}\`,
                questionText: attempt.question_text || "",
                answerText: transcript,
                answer_text: transcript,
                transcript: transcript, // Preferred alias
                score: attempt.score || 0,
                whatWorked: Array.isArray(attempt.what_worked) ? attempt.what_worked : [],
                improveNext: Array.isArray(attempt.improve_next) ? attempt.improve_next : [],
                strongerExample: {
                    text: cleanText,
                    vocab: finalVocab,
                    underlinedWords
                }
            };
        });

        `;

    const newContent = content.substring(0, startIdx) + replacement + content.substring(endIdx);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log("Successfully replaced block using markers.");
} else {
    console.error("Markers not found or invalid order.", { startIdx, endIdx });
    process.exit(1);
}
