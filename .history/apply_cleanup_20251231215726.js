
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'routes', 'mockInterview.js');
let content = fs.readFileSync(filePath, 'utf8');

// The code we want to find starts around "// Generate per-question breakdown"
// and ends before "// Calculate strongest area from strengths"

let startIdx = content.indexOf('// Generate per-question breakdown');
let endIdx = content.indexOf('// Calculate strongest area from strengths');

// Debug
if (startIdx === -1) {
    console.log("Start exact match failed. Searching for partial...");
    const partial = "const perQuestion = (attempts || []).map";
    startIdx = content.indexOf(partial);
    if (startIdx !== -1) {
        // We found the code, now move back to find the comment line if possible, or just replace from here
        // The helper approach expects to replace the whole block including the comment?
        // Let's just replace the code and leave the comment if we can't find it.
        // Actually, cleaner to replace from the variable declaration.
    }
}

if (endIdx === -1) {
    console.log("End exact match failed. Searching for partial...");
    const partial = "let strongest_area";
    endIdx = content.indexOf(partial);
    // Back up to empty lines
}

console.log(`Indices: ${startIdx} to ${endIdx}`);

if (startIdx !== -1 && endIdx !== -1) {
    // We need to match the indentation of the surrounding code for neatness? 
    // Not critical for JS execution, but nice.

    // Check if startIdx points to the comment or the code
    const isComment = content.substring(startIdx).startsWith('//');

    let replacement = '';
    if (isComment) {
        replacement = `        // Generate per-question breakdown
        const perQuestion = generatePerQuestionBreakdown(attempts);
        
`;
    } else {
        replacement = `const perQuestion = generatePerQuestionBreakdown(attempts);
`;
    }

    // We need to cut out the old code. 
    // If endIdx is the start of the next section, we replace everything up to it.

    // Let's verify what we are replacing
    const toReplace = content.substring(startIdx, endIdx);
    console.log("About to replace:");
    console.log(toReplace.substring(0, 100) + " ... " + toReplace.substring(toReplace.length - 100));

    const newContent = content.substring(0, startIdx) + replacement + "\n        " + content.substring(endIdx);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log("Success.");
} else {
    // Fallback: Read line by line and find the range
    console.log("Fallback: Line-by-line search");
    const lines = content.split('\n');
    let sLine = -1;
    let eLine = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('// Generate per-question breakdown')) sLine = i;
        if (lines[i].includes('// Calculate strongest area from strengths')) eLine = i;
    }
    console.log(`Lines: ${sLine} to ${eLine}`);

    if (sLine !== -1 && eLine !== -1 && eLine > sLine) {
        const newLines = [
            ...lines.slice(0, sLine),
            '        // Generate per-question breakdown',
            '        const perQuestion = generatePerQuestionBreakdown(attempts);',
            '',
            ...lines.slice(eLine)
        ];
        fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
        console.log("Success with line-by-line.");
    } else {
        console.error("Failed completely.");
        process.exit(1);
    }
}
