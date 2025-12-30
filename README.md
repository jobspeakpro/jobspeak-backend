## JobSpeakPro Backend – Stripe Subscriptions

This backend exposes Stripe-powered subscriptions with a single source of truth for entitlements via the `subscriptions` table (`isPro` field) in the SQLite database.

### Entitlement model

- **Single source of truth**: the `subscriptions` table in `services/db.js`:
  - `userKey` (PRIMARY KEY)
  - `isPro` (0/1 flag)
  - `stripeCustomerId`
  - `stripeSubscriptionId`
  - `status`
  - `currentPeriodEnd`
- **Consumer routes**:
  - `routes/billing.js` – creates checkout sessions, returns `/billing/status` including `isPro`, and processes Stripe webhooks.
  - `routes/usage.js`, `routes/stt.js`, `voiceRoute.js` – all read `getSubscription(userKey)` and gate Pro features using `isPro`.

### Key API endpoints

- **POST** `POST /api/billing/create-checkout-session`
  - Body/query: `plan` or `priceType` or `interval` or explicit `priceId`.
  - Optional `userKey` via `x-user-key` header, JSON body, query, or form-data (resolved by `resolveUserKey`).
  - Uses `STRIPE_PRICE_ID_MONTHLY` / `STRIPE_PRICE_ID_ANNUAL` or the supplied `priceId`.
  - Returns `{ url }` – Stripe Checkout URL.
  - `success_url` / `cancel_url` are built from `FRONTEND_URL` (e.g. `https://app.yourdomain.com?success=true`).

- **GET** `/api/billing/status?userKey=...`
  - Returns `{ isPro, status, currentPeriodEnd, usage }`.
  - If a `stripeSubscriptionId` exists and Stripe is configured, it refreshes from Stripe’s API to avoid race conditions.
  - Free users get usage info for the daily free tier; Pro users get `limit: -1` (unlimited).

- **POST** `/api/billing/webhook`
  - Expects a raw JSON body (`express.raw`) and a valid `stripe-signature` header.
  - Verifies signatures with `STRIPE_WEBHOOK_SECRET`.
  - Uses the `webhook_events` table for idempotency (stores `event.id` and skips duplicates).
  - Handles at least:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.paid`
    - `invoice.payment_failed`
  - On `checkout.session.completed`, it:
    - Reads `session.metadata.userKey`.
    - Fetches the Stripe subscription.
    - Stores `stripeCustomerId`, `stripeSubscriptionId`, `status`, `currentPeriodEnd`, and sets `isPro` based on status (`active`/`trialing` = true).
  - On cancellation / failed payment, it updates `status` and sets `isPro` to `false` (or as dictated by the current Stripe subscription state).

- **POST** `/api/billing/customer-portal`
  - Requires `userKey` (resolved by `resolveUserKey`).
  - Looks up the existing subscription by `userKey` and uses its `stripeCustomerId`.
  - Creates a Stripe Billing Portal session and returns `{ url }`.
  - Uses `STRIPE_BILLING_PORTAL_RETURN_URL` if set; otherwise falls back to `FRONTEND_URL`.

### Client UX pattern

- **After successful checkout**:
  1. Stripe redirects back to `FRONTEND_URL?success=true`.
  2. The client should immediately call `GET /api/billing/status?userKey=...` (or the equivalent fetch using `x-user-key`).
  3. Optionally, poll `billing/status` a few times if `isPro` is still `false` to account for webhook delay.
  4. When `isPro` becomes `true`, unlock Pro features in the UI.

- **If checkout fails or is canceled**:
  - Stripe redirects to `FRONTEND_URL?canceled=true`.
  - The frontend should show an error toast and offer a “Try again” button that calls `POST /api/billing/create-checkout-session` again.

### Required environment variables (Stripe/entitlement)

Set these in your deployment environment (e.g. Vercel) for subscriptions to work:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_MONTHLY`
- `STRIPE_PRICE_ID_ANNUAL`
- `FRONTEND_URL` – full production URL of your frontend (used for `success_url` and `cancel_url`).
- `FRONTEND_ORIGIN` – origin for CORS (e.g. `https://app.yourdomain.com`).
- Optional but recommended:
  - `STRIPE_BILLING_PORTAL_RETURN_URL` – explicit return URL for the Billing Portal (falls back to `FRONTEND_URL`).

On startup, the backend logs a concise summary of which Stripe-related env vars are present.

### FFmpeg Requirements (for STT audio transcoding)

The STT endpoint requires ffmpeg to transcode WebM/OGG audio files to WAV format (16kHz mono). The backend uses a smart fallback strategy to find ffmpeg:

1. **FFMPEG_PATH environment variable** (highest priority)
   - If set, uses the specified path: `FFMPEG_PATH=C:\path\to\ffmpeg.exe`
2. **System PATH** (second priority)
   - Uses `ffmpeg` command if available in system PATH
3. **ffmpeg-static package** (fallback)
   - Falls back to the bundled `ffmpeg-static` binary if system ffmpeg is not available

**Installation (Windows):**

The fastest way to install ffmpeg on Windows:

```powershell
# Option 1: Using winget (recommended, fastest)
winget install Gyan.FFmpeg

# Option 2: Using Chocolatey
choco install ffmpeg

# Option 3: Manual installation
# Download from https://ffmpeg.org/download.html
# Extract and add to PATH, or set FFMPEG_PATH environment variable
```

After installation, close and reopen your terminal, then verify:
```bash
ffmpeg -version
```

**Startup Verification:**

On server startup, the backend automatically:
- Resolves which ffmpeg path is being used
- Logs the ffmpeg version (first line of `-version` output)
- Shows clear error messages if no valid ffmpeg is found

**Error Handling:**

If no valid ffmpeg is found when transcoding is needed, the API returns:
```json
{
  "error": "FFMPEG_NOT_AVAILABLE",
  "message": "No valid ffmpeg found. Install ffmpeg or set FFMPEG_PATH environment variable.",
  "instructions": {
    "windows": [
      "winget install Gyan.FFmpeg",
      "choco install ffmpeg",
      "Or set FFMPEG_PATH=C:\\path\\to\\ffmpeg.exe"
    ]
  }
}
```

### Stripe Dashboard configuration

1. **Price IDs**
   - Create or locate two recurring prices in the Stripe Dashboard:
     - Monthly plan – set its ID as `STRIPE_PRICE_ID_MONTHLY`.
     - Annual plan – set its ID as `STRIPE_PRICE_ID_ANNUAL`.

2. **Webhook endpoint**
   - URL: `https://YOUR_BACKEND_DOMAIN/api/billing/webhook`
   - Events to send:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
   - Copy the signing secret from this endpoint into `STRIPE_WEBHOOK_SECRET`.

3. **Billing Portal**
   - Enable the Stripe Billing Portal in the dashboard.
   - Configure allowed return URL(s) to match `STRIPE_BILLING_PORTAL_RETURN_URL` or `FRONTEND_URL`.

### How to test Stripe locally

1. **Start the backend**

```bash
npm install
npm run dev
```

2. **Set local env vars**

Create a `.env` file with at least:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_ANNUAL=price_...
FRONTEND_URL=http://localhost:3001
FRONTEND_ORIGIN=http://localhost:3001
```

3. **Run Stripe CLI to forward webhooks**

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Copy the webhook signing secret that Stripe CLI prints (e.g. `whsec_...`) into `STRIPE_WEBHOOK_SECRET` in your `.env`.

4. **Exercise the flow**

- Call `POST http://localhost:3000/api/billing/create-checkout-session` with a JSON body like:

```json
{ "plan": "monthly" }
```

- Open the returned `url` in your browser, complete the checkout in Stripe’s test mode.
- After Stripe redirects to `FRONTEND_URL?success=true`, call:

```bash
curl "http://localhost:3000/api/billing/status?userKey=YOUR_USER_KEY"
```

You should see `isPro: true` once the webhook and status refresh have run.

---

## Error Monitoring (Sentry) & Analytics

### Sentry Error Monitoring

The backend is instrumented with Sentry for production-grade error tracking. Errors are automatically captured with user context, route information, and request IDs.

#### Backend Setup

1. **Install dependencies** (already in `package.json`):
   ```bash
   npm install
   ```

2. **Environment variables**:
   - `SENTRY_DSN` - Your Sentry DSN (get from Sentry dashboard)
   - `SENTRY_RELEASE` (optional) - Release version (defaults to `VERCEL_GIT_COMMIT_SHA` if available)
   - `NODE_ENV` - Set to `production` in production

3. **Source maps** (for Vercel):
   - Option A: Use [Sentry Vercel Integration](https://docs.sentry.io/product/integrations/deployment/vercel/) (recommended)
     - Install the Sentry Vercel integration in your Vercel project
     - Source maps will be uploaded automatically on deploy
   - Option B: Manual source map upload (if not using Vercel integration):
     - Configure `@sentry/cli` in your build process
     - See: https://docs.sentry.io/platforms/javascript/guides/nodejs/sourcemaps/

4. **Verification**:
   - Check startup logs: You should see `✅ Sentry initialized successfully` if `SENTRY_DSN` is set
   - Trigger a test error (e.g., invalid request to `/api/stt`)
   - Check Sentry dashboard: Error should appear within seconds with:
     - User context (userKey)
     - Route tag (`/api/stt`, `/voice/generate`, etc.)
     - Request ID for tracing
     - **No secrets** (Authorization headers are scrubbed)

#### Frontend Setup (Next.js)

1. **Install Sentry**:
   ```bash
   npm install @sentry/nextjs
   ```

2. **Initialize Sentry**:
   ```bash
   npx @sentry/wizard@latest -i nextjs
   ```
   This creates `sentry.client.config.ts` and `sentry.server.config.ts`.

3. **Environment variables** (in Vercel):
   - `NEXT_PUBLIC_SENTRY_DSN` - Your Sentry DSN (public, safe to expose)
   - `SENTRY_ORG` - Your Sentry organization slug
   - `SENTRY_PROJECT` - Your Sentry project slug
   - `SENTRY_AUTH_TOKEN` - Auth token for source map uploads

4. **Verify frontend Sentry**:
   - Add a test error in your frontend code
   - Check Sentry dashboard for the error
   - Verify source maps are working (stack traces show original file names/line numbers)

#### Security

- **Authorization headers are automatically scrubbed** before sending to Sentry
- API keys and tokens in error context are redacted
- Only non-sensitive request metadata is included

### Analytics Event Tracking

Analytics events are tracked via a simple `/api/track` endpoint that logs to the database. Events are non-blocking and never break UX if tracking fails.

#### Tracked Events

**Backend-instrumented events** (automatically tracked):
- `stt_success`, `stt_fail` (with `error_type`)
- `tts_success`, `tts_fail` (with `error_type`)
- `rewrite_success`, `rewrite_fail` (with `error_type`)
- `checkout_started`, `checkout_success`, `checkout_failed` (with `plan`: monthly/annual)
- `limit_hit` (with `limit_type`: daily)

**Frontend events** (call `/api/track` from your frontend):
- `practice_page_view`
- `rewrite_click`
- `tts_click`
- `upgrade_click` (include `plan`: monthly/annual)

#### API Endpoint

**POST** `/api/track`
```json
{
  "event": "practice_page_view",
  "properties": {
    "userKey": "optional-user-id",
    "additional": "data"
  }
}
```

Returns: `{ success: true }` (always succeeds, even if tracking fails internally)

#### Database Storage

Events are stored in the `analytics_events` table:
- `eventName` - Event name
- `userKey` - User identifier (if available)
- `properties` - JSON string of event properties
- `createdAt` - ISO timestamp

Query events:
```sql
SELECT * FROM analytics_events 
WHERE eventName = 'stt_success' 
ORDER BY createdAt DESC 
LIMIT 100;
```

#### Verification Checklist

**Sentry Verification:**
1. ✅ Check startup logs for `✅ Sentry initialized successfully`
2. ✅ Trigger a test error (e.g., POST to `/api/stt` with invalid data)
3. ✅ Check Sentry dashboard within 30 seconds
4. ✅ Verify error includes:
   - User context (userKey if available)
   - Route tag (e.g., `/api/stt`)
   - Request ID
   - No Authorization headers (should show `[REDACTED]`)
5. ✅ Verify source maps (stack traces show original file names, not minified)

**Analytics Verification:**
1. ✅ Trigger a tracked event (e.g., successful STT transcription)
2. ✅ Query database:
   ```sql
   SELECT * FROM analytics_events WHERE eventName = 'stt_success' ORDER BY createdAt DESC LIMIT 1;
   ```
3. ✅ Verify event includes:
   - Correct `eventName`
   - `userKey` (if user was authenticated)
   - `properties` JSON with expected data
4. ✅ Test frontend tracking:
   ```javascript
   fetch('/api/track', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ event: 'practice_page_view' })
   });
   ```
5. ✅ Verify event appears in database

#### Environment Variables Summary

**Required for Sentry:**
- `SENTRY_DSN` (backend)
- `NEXT_PUBLIC_SENTRY_DSN` (frontend)

**Optional:**
- `SENTRY_RELEASE` - Release version
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` - For source map uploads (if not using Vercel integration)

**No additional env vars needed for analytics** (uses existing database).


