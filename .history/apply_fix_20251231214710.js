
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'routes', 'mockInterview.js');
let content = fs.readFileSync(filePath, 'utf8');

// The block to replace, copied verbatim from view_file output
const targetBlock = `        // Generate per-question breakdown
        const perQuestion = (attempts || []).map((attempt, index) => {
            // Get exactly 2 vocab words with complete data
            let vocab = (attempt.vocabulary || []).slice(0, 2);
            
            // Ensure vocab objects have all required fields
            vocab = vocab.map(v => {
                if (typeof v === 'string') {
                    return { word: v, ipa: '', audioText: v };
                }
                return {
                    word: v.word || '',
                    ipa: v.ipa || '',
                    audioText: v.audioText || v.word || ''
                };
            });
            
            // Ensure we have exactly 2 items (pad with empty if needed)
            while (vocab.length < 2) {
                vocab.push({ word: '', ipa: '', audioText: '' });
            }
            
            const underlinedWords = vocab.map(v => v.word).filter(w => w);

            return {
                questionId: attempt.question_id || \`q\${index + 1}\`,
                questionText: attempt.question_text || "",
                answerText: attempt.answer_text || "",
                score: attempt.score || 0,
                whatWorked: Array.isArray(attempt.what_worked) ? attempt.what_worked : [],
                improveNext: Array.isArray(attempt.improve_next) ? attempt.improve_next : [],
                strongerExample: {
                    text: attempt.clearer_rewrite || "",
                    vocab: vocab.map(v => ({
                        word: v.word,
                        ipa: v.ipa,
                        accent: "US",
                        audioText: v.audioText
                    })),
                    underlinedWords
                }
            };
        });`;

const replacementBlock = `        // Generate per-question breakdown
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
        });`;

// Normalize whitespace to mitigate tab/space issues
// We replace multiple newlines/spaces with a single space for comparison logic if needed, 
// BUT verifying string replace is better if we are confident.
// Given strict failures, let's look for exact match.
// If not found, log details.

if (content.indexOf(targetBlock) !== -1) {
    const newContent = content.replace(targetBlock, replacementBlock);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log("Successfully replaced block using exact string match.");
} else {
    console.error("Target block not found via exact match.");
    // Debug: Print a chunk of content where we expect it
    const marker = '// Generate per-question breakdown';
    const idx = content.indexOf(marker);
    if (idx !== -1) {
        console.log("Found marker at index", idx);
        console.log("Following 500 chars:");
        console.log(content.substring(idx, idx + 500));
        console.log("--- Expected Target Start ---");
        console.log(targetBlock.substring(0, 500));
    } else {
        console.log("Marker not found either.");
    }
    process.exit(1);
}
