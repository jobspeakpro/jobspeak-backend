
import fs from 'fs';
try {
    const content = fs.readFileSync('bundle.js', 'utf8');
    // Regex for JWT (Supabase Anon Key is a JWT)
    // Starts with eyJ (header), dot, body, dot, signature
    const match = content.match(/eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/);
    if (match) {
        console.log("KEY_FOUND:" + match[0]);
    } else {
        console.log("KEY_NOT_FOUND");
    }

    // Also try to find URL
    const urlMatch = content.match(/https:\/\/[a-z0-9-]+\.supabase\.co/);
    if (urlMatch) {
        console.log("URL_FOUND:" + urlMatch[0]);
    }
} catch (err) {
    console.error(err);
}
