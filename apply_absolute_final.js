
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'routes', 'mockInterview.js');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '// Generate per-question breakdown';
const endMarker = '// Calculate strongest area from strengths';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

console.log(`Searching for markers in ${filePath}`);
console.log(`Start Marker: "${startMarker}" -> Index: ${startIdx}`);
console.log(`End Marker: "${endMarker}" -> Index: ${endIdx}`);

if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const replacement = `        // Generate per-question breakdown
        const perQuestion = generatePerQuestionBreakdown(attempts);

        `;

    const newContent = content.substring(0, startIdx) + replacement + content.substring(endIdx);

    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log("Successfully replaced perQuestion logic with helper call.");
} else {
    console.error("Critical failure: Could not find code block to replace.");
    process.exit(1);
}
