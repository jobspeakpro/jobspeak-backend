
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'routes', 'mockInterview.js');
const rawContent = fs.readFileSync(filePath, 'utf8');

// Use line-based approach to avoid normalization issues
const lines = rawContent.split(/\r?\n/);

let sLine = -1;
let eLine = -1;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('// Generate per-question breakdown')) {
        sLine = i;
    }
    if (line.includes('// Calculate strongest area from strengths')) {
        eLine = i;
    }
}

console.log(`Lines found: Start=${sLine}, End=${eLine}`);

if (sLine !== -1 && eLine !== -1 && eLine > sLine) {
    // Keep the start comment 
    // Replace lines between sLine+1 and eLine-1
    // Actually, just replace sLine to eLine-1 with the new logic

    // Construct new lines
    const newBlock = [
        '        // Generate per-question breakdown',
        '        const perQuestion = generatePerQuestionBreakdown(attempts);',
        '' // Empty line spacing
    ];

    // Splice: remove count is (eLine - sLine)
    lines.splice(sLine, eLine - sLine, ...newBlock);

    const finalContent = lines.join('\r\n'); // Windows style write back
    fs.writeFileSync(filePath, finalContent, 'utf8');
    console.log("Success with line array splice.");
} else {
    // Failure debug
    console.error("Could not find start/end lines.");
    // Print lines around typical locations
    // ...
    process.exit(1);
}
