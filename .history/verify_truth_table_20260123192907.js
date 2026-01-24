import https from 'https';

const guestKey = '50158919-0025-4b72-9a26-56df4ddcf86d';
const host = 'jobspeak-backend-production.up.railway.app';
const origin = 'https://jobspeakpro.com';

async function request(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: host,
            path,
            method,
            headers: {
                'x-guest-key': guestKey,
                'Origin': origin,
                'Content-Type': 'application/json'
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
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function formatHeader(headers, name) {
    return headers[name] || headers[name.toLowerCase()] || '(missing)';
}

async function run() {
    let output = `# TRUTH TABLE BACKEND VERIFICAITON\n\n`;
    output += `**Date**: ${new Date().toISOString()}\n`;
    output += `**Guest Key**: \`${guestKey}\`\n`;
    output += `**Base URL**: \`https://${host}\`\n\n`;

    // 1. POST /api/activity/start
    output += `## 1. POST /api/activity/start\n`;
    const startBody = {
        activityType: 'practice',
        context: { tabId: 'TRUTH-TABLE-' + Date.now(), source: 'truth-table' }
    };
    const start = await request('/api/activity/start', 'POST', startBody);
    output += `**Status**: ${start.status}\n`;
    output += `**x-identity-used**: \`${formatHeader(start.headers, 'x-identity-used')}\`\n`;
    output += `**x-identity-mode**: \`${formatHeader(start.headers, 'x-identity-mode')}\`\n`;
    output += `**Response**:\n\`\`\`json\n${JSON.stringify(JSON.parse(start.body), null, 2)}\n\`\`\`\n\n`;

    // 2. GET /api/activity/events
    output += `## 2. GET /api/activity/events\n`;
    const events = await request('/api/activity/events?limit=5');
    const eventsJson = JSON.parse(events.body);
    output += `**Status**: ${events.status}\n`;
    output += `**Count**: ${eventsJson.total}\n`;
    output += `**x-identity-used**: \`${formatHeader(events.headers, 'x-identity-used')}\`\n`;
    output += `**Response Snippet (First Event)**:\n\`\`\`json\n${JSON.stringify(eventsJson.events ? eventsJson.events[0] || "No events" : eventsJson, null, 2)}\n\`\`\`\n\n`;

    // 3. GET /api/dashboard/summary
    output += `## 3. GET /api/dashboard/summary\n`;
    const dash = await request(`/api/dashboard/summary?userKey=${guestKey}`);
    const dashJson = JSON.parse(dash.body);
    output += `**Status**: ${dash.status}\n`;
    output += `**Activity Count Combined**: ${dashJson.debug?.activityCountCombined}\n`;
    output += `**x-identity-used**: \`${formatHeader(dash.headers, 'x-identity-used')}\`\n`;
    output += `**Response Snippet (Debug)**:\n\`\`\`json\n${JSON.stringify(dashJson.debug || {}, null, 2)}\n\`\`\`\n\n`;

    // 4. GET /api/progress
    output += `## 4. GET /api/progress\n`;
    const prog = await request(`/api/progress?userKey=${guestKey}`);
    const progJson = JSON.parse(prog.body);
    output += `**Status**: ${prog.status}\n`;
    output += `**Sessions Count**: ${progJson.sessions?.length}\n`;
    output += `**Activity Count Combined**: ${progJson.debug?.activityCountCombined}\n`;
    output += `**x-identity-used**: \`${formatHeader(prog.headers, 'x-identity-used')}\`\n`;
    output += `**Response Snippet (Debug)**:\n\`\`\`json\n${JSON.stringify(progJson.debug || {}, null, 2)}\n\`\`\`\n\n`;

    console.log(output);
}

run().catch(err => console.error(err));
