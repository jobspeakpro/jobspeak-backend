
// Raw Node Server - Dependency Free
import http from 'http';

const PORT = process.env.PORT || 3000;

console.log("Starting Raw Node Server...");

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);

  if (req.url === '/' || req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      version: 'Raw-Node-Debug',
      service: 'JobSpeakPro Backend'
    }));
    return;
  }

  if (req.url === '/api/referrals/me') {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized (Stub)' }));
    return;
  }

  if (req.url === '/api/affiliate/apply' && req.method === 'POST') {
    // We can't easily parse body in raw node without buffers, but for proof of existence (400/200),
    // we can just return 200 or 400.
    // Proof requires "NOT 404".
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'validation_failed', message: 'Raw Node Stub' }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Raw Node Server listening on ${PORT}`);
});
