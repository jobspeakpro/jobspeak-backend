
import fetch from 'node-fetch';

const API_KEY = 'mlsn.5eed5fa687e9d42fbfc6219b25d058800016d9a50ff33e76a29aaabbd77ea761';

async function run() {
    try {
        const response = await fetch('https://api.mailersend.com/v1/identities', {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });

        if (!response.ok) {
            console.error('Failed:', response.status, await response.text());
            return;
        }

        const data = await response.json();
        console.log('Identities:', JSON.stringify(data, null, 2));

        // Also check domains
        const domainsResponse = await fetch('https://api.mailersend.com/v1/domains', {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });
        const domainsData = await domainsResponse.json();
        console.log('Domains:', JSON.stringify(domainsData, null, 2));

    } catch (e) {
        console.error(e);
    }
}

run();
