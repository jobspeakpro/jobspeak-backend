# Railway Deployment Diagnostic Checklist

## Required Environment Variables (Check Railway Dashboard → Variables)

Based on server.js analysis, these are REQUIRED for the backend to start:

### Critical (Server will crash without these):
- [ ] `PORT` (Railway auto-sets this, should be present)
- [ ] `SUPABASE_URL` (Used in multiple services)
- [ ] `SUPABASE_ANON_KEY` (Used in multiple services)
- [ ] `OPENAI_API_KEY` (Used by AI routes)
- [ ] `ELEVENLABS_API_KEY` (Used by TTS routes)
- [ ] `ELEVENLABS_VOICE_ID` (Used by TTS routes)

### Billing (Will log warnings but may not crash):
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_PRICE_ID_MONTHLY`
- [ ] `STRIPE_PRICE_ID_ANNUAL`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `FRONTEND_URL`

### Optional (Has fallbacks):
- [ ] `NODE_ENV` (defaults to development)
- [ ] `SENTRY_DSN` (optional monitoring)
- [ ] `DATABASE_URL` (only needed if using pg directly - NOT used in current code)

## Common Crash Patterns to Look For in Railway Logs:

1. **Missing Module Error:**
   ```
   Error: Cannot find module '@supabase/supabase-js'
   ```
   → Fix: Check package.json dependencies are installed

2. **Environment Variable Missing:**
   ```
   TypeError: Cannot read property 'SUPABASE_URL' of undefined
   ```
   → Fix: Add missing env var in Railway

3. **Port Binding:**
   ```
   Error: listen EADDRINUSE :::3000
   ```
   → Should NOT happen on Railway (auto-assigns PORT)

4. **Import Error:**
   ```
   SyntaxError: Cannot use import statement outside a module
   ```
   → Check package.json has "type": "module"

5. **Supabase Connection:**
   ```
   Error: Invalid Supabase URL or Key
   ```
   → Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct

## Steps to Fix:

1. **Check Railway Logs** (in Railway Dashboard):
   - Go to your backend service
   - Click "Deployments" tab
   - Click latest deployment
   - Scroll to find the FIRST error (usually near the top)

2. **Verify Environment Variables**:
   - Go to Railway → Variables tab
   - Confirm ALL required vars above are set
   - Check for typos in variable names

3. **Redeploy**:
   - After fixing env vars, click "Redeploy" button
   - Wait 2-3 minutes for deployment to complete

4. **Test Health**:
   ```bash
   curl https://jobspeak-backend-production.up.railway.app/health
   ```
   Should return: `{"status":"ok","service":"JobSpeakPro Backend","commit":"..."}`

## Most Likely Cause (Based on Recent Changes):

The recent commits added:
- Global OPTIONS handler (should be fine)
- Billing error handling changes (should be fine)

**Hypothesis:** Railway deployment is using an OLD commit or environment variables are missing.

Check Railway → Settings → "Source Repo" to ensure it's pointing to the correct branch (main) and latest commit (942540b).
