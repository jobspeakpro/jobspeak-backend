
const urls = [
  { method: 'GET', url: 'https://jobspeak-backend-production.up.railway.app/health', headers: {} },
  { method: 'OPTIONS', url: 'https://jobspeak-backend-production.up.railway.app/api/affiliate/apply', headers: { 'Origin': 'https://jobspeakpro.com', 'Access-Control-Request-Method': 'POST' } },
  { method: 'POST', url: 'https://jobspeak-backend-production.up.railway.app/api/affiliate/apply', headers: { 'Origin': 'https://jobspeakpro.com', 'Content-Type': 'application/json' }, body: JSON.stringify({}) }
];

async function check() {
  for (const req of urls) {
    console.log(`\n--- ${req.method} ${req.url} ---`);
    try {
      const opts = { method: req.method, headers: req.headers };
      if (req.body) opts.body = req.body;
      
      const res = await fetch(req.url, opts);
      console.log(`Status: ${res.status}`);
      console.log('Headers:');
      ['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-credentials'].forEach(h => {
          const val = res.headers.get(h);
          if (val) console.log(`${h}: ${val}`);
      });
      
      if (req.method === 'GET' && req.url.includes('health')) {
         const json = await res.json();
         console.log('Body:', JSON.stringify(json));
      } else if (req.method === 'POST') {
         const txt = await res.text();
         console.log('Body Preview:', txt.substring(0, 100));
      }
    } catch (e) {
      console.log('ERROR:', e.message);
    }
  }
}

check();
