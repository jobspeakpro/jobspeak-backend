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
    let output = `# TRUTH TABLE BACKEND CANONICAL\n\n`;
    output += `**Date**: ${new Date().toISOString()}\n`;
    output += `**Commit Hash**: (See headers below)\n\n`;

    // 1. POST /api/activity/start
    {
        const path = '/api/activity/start';
        const url = `https://${host}${path}`;
        const body = {
            activityType: 'practice',
            context: { tabId: 'CANONICAL-' + Date.now(), source: 'truth-table-canonical' }
        };

        output += `## 1. POST ${url}\n`;
        output += `**Request Headers**:\n`;
        output += `- x-guest-key: ${guestKey}\n`;
        output += `- Origin: ${origin}\n`;

        const res = await request(path, 'POST', body);
        output += `\n**Response Headers**:\n`;
        output += `- status: ${res.status}\n`;
        output += `- x-identity-used: ${formatHeader(res.headers, 'x-identity-used')}\n`;
        output += `- x-identity-mode: ${formatHeader(res.headers, 'x-identity-mode')}\n`;
        output += `- x-jsp-backend-commit: ${formatHeader(res.headers, 'x-jsp-backend-commit')}\n`;

        output += `\n**Response Body**:\n\`\`\`json\n${JSON.stringify(JSON.parse(res.body), null, 2)}\n\`\`\`\n\n`;
    }

    // 2. GET /api/activity/events
    {
        const path = '/api/activity/events?limit=5';
        const url = `https://${host}${path}`;

        output += `## 2. GET ${url}\n`;
        output += `**Request Headers**:\n`;
        output += `- x-guest-key: ${guestKey}\n`;

        const res = await request(path, 'GET');
        const json = JSON.parse(res.body);

        output += `\n**Response Headers**:\n`;
        output += `- status: ${res.status}\n`;
        output += `- x-identity-used: ${formatHeader(res.headers, 'x-identity-used')}\n`;
        output += `- x-identity-mode: ${formatHeader(res.headers, 'x-identity-mode')}\n`;
        output += `- x-jsp-backend-commit: ${formatHeader(res.headers, 'x-jsp-backend-commit')}\n`;

        output += `\n**Response Body (Snippet)**:\n\`\`\`json\n`;
        output += JSON.stringify({ total: json.total, events_sample: json.events ? json.events.slice(0, 1) : [] }, null, 2);
        output += `\n\`\`\`\n\n`;
    }

    // 3. GET /api/dashboard/summary
    {
        const path = `/api/dashboard/summary?userKey=${guestKey}`;
        const url = `https://${host}${path}`;

        output += `## 3. GET ${url}\n`;
        output += `**Request Headers**:\n`;
        output += `- x-guest-key: ${guestKey}\n`;

        const res = await request(path, 'GET');
        const json = JSON.parse(res.body);

        output += `\n**Response Headers**:\n`;
        output += `- status: ${res.status}\n`;
        output += `- x-identity-used: ${formatHeader(res.headers, 'x-identity-used')}\n`;
        output += `- x-identity-mode: ${formatHeader(res.headers, 'x-identity-mode')}\n`;
        output += `- x-jsp-backend-commit: ${formatHeader(res.headers, 'x-jsp-backend-commit')}\n`;

        output += `\n**Response Body (Debug)**:\n\`\`\`json\n`;
        output += JSON.stringify(json.debug || {}, null, 2);
        output += `\n\`\`\`\n\n`;
    }

    // 4. GET /api/progress
    {
        const path = `/api/progress?userKey=${guestKey}`;
        const url = `https://${host}${path}`;

        output += `## 4. GET ${url}\n`;
        output += `**Request Headers**:\n`;
        output += `- x-guest-key: ${guestKey}\n`;

        const res = await request(path, 'GET');
        const json = JSON.parse(res.body);

        output += `\n**Response Headers**:\n`;
        output += `- status: ${res.status}\n`;
        output += `- x-identity-used: ${formatHeader(res.headers, 'x-identity-used')}\n`;
        output += `- x-identity-mode: ${formatHeader(res.headers, 'x-identity-mode')}\n`;
        output += `- x-jsp-backend-commit: ${formatHeader(res.headers, 'x-jsp-backend-commit')}\n`;

        output += `\n**Response Body (Debug)**:\n\`\`\`json\n`;
        output += JSON.stringify(json.debug || {}, null, 2);
        output += `\n\`\`\`\n\n`;
    }

    console.log(output);
}

run().catch(err => console.error(err));
