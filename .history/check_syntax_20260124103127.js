import './routes/referrals.js';
import './routes/affiliates.js';
import './routes/support.js';
import './routes/mockInterview.js';
import './server.js'; // This tries to start server, might fail on port binding or db connection, but catches syntax errors.
// Actually importing server.js runs app.listen which hangs.
// So let's just import routes.

console.log("Syntax check passed for routes.");
process.exit(0);
