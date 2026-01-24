import https from 'https';

const guestKey = '50158919-0025-4b72-9a26-56df4ddcf86d';
const host = 'jobspeak-backend-production.up.railway.app';
const origin = 'https://jobspeakpro.com';

async function request(path, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: host,
            path,
            method: 'GET',
            headers: {
                'Origin': origin,
                ...headers
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', reject);
        req.end();
    });
}

function formatHeader(headers, name) {
    return headers[name] || headers[name.toLowerCase()] || '(missing)';
}

async function run() {
    let output = `# FRONTEND SIMULATION PROOF\n\n`;
    output += `**Scenario**: Frontend sends \`?userKey=...\` parameters but **NO** \`x-guest-key\` header.\n`;
    output += `**Goal**: Verify backend falls back to query param correctly.\n\n`;

    // 1. GET /api/dashboard/summary (No Header)
    {
        const path = `/api/dashboard/summary?userKey=${guestKey}`;
        output += `## 1. GET ${path}\n`;
        output += `**Request Headers**: (No x-guest-key)\n`;

        const res = await request(path); // NO extra headers
        const json = JSON.parse(res.body);

        output += `**Status**: ${res.status}\n`;
        output += `**x-identity-used**: \`${formatHeader(res.headers, 'x-identity-used')}\`\n`;
        output += `**Activity Count**: ${json.debug?.activityCountCombined ?? 'undefined'}\n`;
        output += `**Response (Debug)**:\n\`\`\`json\n${JSON.stringify(json.debug || json, null, 2)}\n\`\`\`\n\n`;
    }

    // 2. GET /api/progress (No Header)
    {
        const path = `/api/progress?userKey=${guestKey}`;
        output += `## 2. GET ${path}\n`;
        output += `**Request Headers**: (No x-guest-key)\n`;

        const res = await request(path);
        const json = JSON.parse(res.body);

        output += `**Status**: ${res.status}\n`;
        output += `**x-identity-used**: \`${formatHeader(res.headers, 'x-identity-used')}\`\n`;
        output += `**Sessions Count**: ${json.sessions?.length}\n`;
        output += `**Response (Debug)**:\n\`\`\`json\n${JSON.stringify(json.debug || json, null, 2)}\n\`\`\`\n\n`;
    }

    console.log(output);
}

run().catch(err => console.error(err));
