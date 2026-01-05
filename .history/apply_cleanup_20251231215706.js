
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'routes', 'mockInterview.js');
let content = fs.readFileSync(filePath, 'utf8');

const normalizedContent = content.replace(/\r\n/g, '\n');

// Relaxed markers
let startIdx = normalizedContent.indexOf('// Generate per-question breakdown');
let endIdx = normalizedContent.indexOf('// Calculate strongest area from strengths');

if (startIdx === -1) {
    console.log("Start marker not found. Trying heuristic for 'const perQuestion ='");
    // Look for assignment after "Extract improvedExample" block
    const prevBlock = 'let improvedExample = "";';
    const pbIdx = normalizedContent.indexOf(prevBlock);
    if (pbIdx !== -1) {
        startIdx = normalizedContent.indexOf('const perQuestion =', pbIdx);
        // Ideally capture the comment before it if it exists
        const cmt = '// Generate per-question breakdown';
        const cmtIdx = normalizedContent.indexOf(cmt, pbIdx);
        if (cmtIdx !== -1 && cmtIdx < startIdx) startIdx = cmtIdx;
    }
}

if (endIdx === -1) {
    // If exactcomment missing, look via 'strongest_area'
    endIdx = normalizedContent.indexOf('let strongest_area = "N/A";');
    // Back up to capture the comment
    const cmt = '// Calculate strongest area from strengths';
    const cmtIdx = normalizedContent.lastIndexOf(cmt, endIdx);
    if (cmtIdx !== -1) endIdx = cmtIdx;
}

console.log(`Start: ${startIdx}, End: ${endIdx}`);

if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const replacement = `        // Generate per-question breakdown
        const perQuestion = generatePerQuestionBreakdown(attempts);

        `;

    // Use normalized content for replacement logic, but need to be careful with writing back.
    // If we write normalized (LF), Windows is fine. 
    const newContent = normalizedContent.substring(0, startIdx) + replacement + normalizedContent.substring(endIdx);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log("Success with heuristic.");
} else {
    console.error("Markers failed.");
    process.exit(1);
}
