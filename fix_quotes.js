import fs from 'fs';

// Read the file
let content = fs.readFileSync('routes/mockInterview.js', 'utf8');

// Replace escaped quotes
content = content.replace(/\\\"/g, '"');

// Write back
fs.writeFileSync('routes/mockInterview.js', content, 'utf8');

console.log('✅ Fixed escaped quotes in mockInterview.js');
