
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'routes', 'mockInterview.js');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize for searching
const normalizedContent = content.replace(/\r\n/g, '\n');

// We need to replace the entire `const perQuestion = ...` block with:
// const perQuestion = generatePerQuestionBreakdown(attempts);

// Let's find the start of the block
const startMarker = '// Generate per-question breakdown';
const endMarker = '// Calculate strongest area from strengths';

const startIdx = normalizedContent.indexOf(startMarker);
const endIdx = normalizedContent.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const replacement = `        // Generate per-question breakdown
        const perQuestion = generatePerQuestionBreakdown(attempts);

        `;

    // Construct new content
    const newContent = normalizedContent.substring(0, startIdx) + replacement + normalizedContent.substring(endIdx);

    // Write back
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log("Successfully replaced perQuestion logic with helper call.");
} else {
    console.error("Could not find block markers for replacement.");
    console.log({ startIdx, endIdx });
    process.exit(1);
}
