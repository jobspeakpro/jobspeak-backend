
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'routes', 'mockInterview.js');
let content = fs.readFileSync(filePath, 'utf8');

const targetBlock = `        const perQuestion = (attempts || []).map((attempt, index) => {
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

const replacementBlock = `        const usedVocabWords = new Set();
        
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

if (content.includes(targetBlock.replace(/\\/g, ''))) {
    console.log("Target found exact match (after cleaning escapes).");
} else {
    // Normalization to handle whitespace
    const normalizedTarget = targetBlock.replace(/\s+/g, ' ').trim();
    // Logic to replace... simplistic replacement
    const startIdx = content.indexOf('const perQuestion = (attempts || []).map((attempt, index) => {');
    const endDist = content.indexOf('return res.json(shapeMockSummaryResponse({', startIdx);

    if (startIdx !== -1 && endDist !== -1) {
        // Find the matching closing brace for the map callback... 
        // Just searching for the known structure:
        const blockEnd = '});';
        const searchArea = content.substring(startIdx, endDist);
        const lastBraceIdx = searchArea.lastIndexOf(blockEnd);

        if (lastBraceIdx !== -1) {
            const toReplace = searchArea.substring(0, lastBraceIdx + blockEnd.length);
            console.log("Found block to replace via substring search.");
            const newContent = content.substring(0, startIdx) + replacementBlock + content.substring(startIdx + toReplace.length);
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log("Successfully replaced content.");
            process.exit(0);
        }
    }
    console.error("Could not find target block exactly or via heuristic.");
    process.exit(1);
}

// Exact match replacement (if escapes were perfect)
// content = content.replace(targetBlock, replacementBlock);
// fs.writeFileSync(filePath, content, 'utf8');
