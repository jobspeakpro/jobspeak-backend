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

async function run() {
    console.log('--- STEP 1: POST /api/activity/start ---');
    const start = await request('/api/activity/start', 'POST', {
        activityType: 'practice',
        context: { tabId: 'NODE-PROOF-' + Date.now() }
    });
    console.log('Status:', start.status);
    console.log('x-identity-used:', start.headers['x-identity-used']);
    console.log('x-identity-mode:', start.headers['x-identity-mode']);
    console.log('Body:', start.body);

    console.log('\n--- STEP 2: GET /api/dashboard/summary ---');
    const dash = await request(`/api/dashboard/summary?userKey=${guestKey}`);
    console.log('Status:', dash.status);
    console.log('x-identity-used:', dash.headers['x-identity-used']);
    console.log('x-identity-mode:', dash.headers['x-identity-mode']);
    // console.log('Body:', dash.body);
    const dashJson = JSON.parse(dash.body);
    console.log('Activity Count Combined:', dashJson.debug?.activityCountCombined);

    console.log('\n--- STEP 3: GET /api/progress ---');
    const prog = await request(`/api/progress?userKey=${guestKey}`);
    console.log('Status:', prog.status);
    console.log('x-identity-used:', prog.headers['x-identity-used']);
    console.log('x-identity-mode:', prog.headers['x-identity-mode']);
    const progJson = JSON.parse(prog.body);
    console.log('Sessions length:', progJson.sessions?.length);
}

run().catch(console.error);
