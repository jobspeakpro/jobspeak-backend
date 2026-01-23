# Activity Tracking Implementation

## Overview
Activity tracking storage & retrieval for JobSpeakPro backend. Tracks when users start practice sessions or mock interviews.

## Components

### 1. Database Schema
**Table:** `activity_events`

**Location:** [supabase-migrations/activity_tracking.sql](supabase-migrations/activity_tracking.sql)

**Fields:**
- `id` - Bigint (auto-generated primary key)
- `created_at` - Timestamptz (auto-set to now())
- `user_id` - UUID (null for guests)
- `identity_key` - Text (null for authenticated users)
- `activity_type` - Text ('practice' | 'mock_interview')
- `context` - JSONB (additional data: tabId, sessionId, etc.)
- `day` - Date (for deduplication)

**Indexes:**
- Unique dedupe index on (day, activity_type, user_id, identity_key, tabId)
- Performance indexes on user_id, identity_key, activity_type

**RLS Policies:**
- Service role: full access (backend operations)
- Authenticated users: read own events
- Anonymous: no access (handled via service role)

### 2. API Endpoints

#### POST /api/activity/start
Track when user starts an activity.

**Request:**
```json
{
  "activityType": "practice" | "mock_interview",
  "context": {
    "tabId": "optional-tab-id",
    "sessionId": "optional-session-id",
    "interviewType": "short" | "long"
  }
}
```

**Identity Resolution (Priority Order):**
1. `Authorization: Bearer <JWT>` header → extract user_id
2. `x-guest-key: <guest-key>` header → use as identity_key
3. `body.userKey` → use as identity_key or user_id

**Response (Always 200):**
```json
{
  "ok": true,
  "stored": true,
  "id": 12345
}
```

**Response (Dedupe):**
```json
{
  "ok": true,
  "stored": true,
  "dedupe": true
}
```

**Response (Error - Non-Fatal):**
```json
{
  "ok": true,
  "stored": false,
  "error": "Insert error message"
}
```

**Response (Disabled):**
```json
{
  "ok": true,
  "stored": false,
  "disabled": true
}
```

#### GET /api/activity/events
Retrieve activity events for current user.

**Query Params:**
- `limit` (optional, default: 50, max: 100)

**Identity Resolution:** Same as POST /api/activity/start

**Response:**
```json
{
  "events": [
    {
      "id": 1,
      "created_at": "2026-01-22T10:30:00Z",
      "user_id": "uuid-or-null",
      "identity_key": "guest-key-or-null",
      "activity_type": "practice",
      "context": { "tabId": "abc123", "sessionId": "sess-456" },
      "day": "2026-01-22"
    }
  ],
  "total": 1
}
```

### 3. Progress Endpoint Integration

The `/api/progress` endpoint now includes activity events in the sessions list:

**Example Response:**
```json
{
  "sessions": [
    {
      "date": "2026-01-22T10:30:00Z",
      "type": "Practice Started",
      "score": null,
      "topStrength": "Activity started",
      "topWeakness": "N/A",
      "sessionId": "sess-456",
      "activityEvent": true
    },
    {
      "date": "2026-01-22T09:00:00Z",
      "type": "Mock Interview (short)",
      "score": 85,
      "topStrength": "Clear communication",
      "topWeakness": "More examples needed",
      "sessionId": "mock-123"
    }
  ],
  "total": 2
}
```

## Feature Flag

**Environment Variable:** `ACTIVITY_TRACKING_ENABLED`

- **Default:** Enabled (feature flag not set or set to any value except 'false')
- **Disable:** Set `ACTIVITY_TRACKING_ENABLED=false`

When disabled:
- POST /api/activity/start returns `{ok: true, stored: false, disabled: true}`
- GET /api/activity/events returns `{events: [], total: 0, disabled: true}`
- Progress endpoint skips activity events

## Deployment Instructions

### 1. Run Migration
```bash
# Connect to your Supabase project SQL editor
# Copy and paste the contents of supabase-migrations/activity_tracking.sql
# Execute the migration
```

### 2. Deploy Backend
```bash
# The routes are automatically registered in server.js
# Just deploy as usual
git add .
git commit -m "Add activity tracking"
git push
```

### 3. Verify Deployment
```bash
# Check health
curl https://your-backend.railway.app/health

# Test activity tracking (see examples below)
```

## Testing Examples

### 1. Guest User - Practice Start
```bash
curl -X POST https://your-backend.railway.app/api/activity/start \
  -H "Content-Type: application/json" \
  -H "x-guest-key: guest-12345" \
  -d '{
    "activityType": "practice",
    "context": {
      "tabId": "tab-abc123",
      "sessionId": "practice-session-1"
    }
  }'

# Expected Response:
# {"ok":true,"stored":true,"id":1}
```

### 2. Authenticated User - Mock Interview Start
```bash
# Replace YOUR_JWT_TOKEN with actual token
curl -X POST https://your-backend.railway.app/api/activity/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "activityType": "mock_interview",
    "context": {
      "sessionId": "mock-session-1",
      "interviewType": "short"
    }
  }'

# Expected Response:
# {"ok":true,"stored":true,"id":2}
```

### 3. Dedupe Test (Same Day, Same Activity)
```bash
# Run the same request twice
curl -X POST https://your-backend.railway.app/api/activity/start \
  -H "Content-Type: application/json" \
  -H "x-guest-key: guest-12345" \
  -d '{
    "activityType": "practice",
    "context": {
      "tabId": "tab-abc123"
    }
  }'

# First call: {"ok":true,"stored":true,"id":3}
# Second call: {"ok":true,"stored":true,"dedupe":true}
```

### 4. Retrieve Activity Events (Guest)
```bash
curl -X GET "https://your-backend.railway.app/api/activity/events?limit=10" \
  -H "x-guest-key: guest-12345"

# Expected Response:
# {
#   "events": [
#     {
#       "id": 1,
#       "created_at": "2026-01-22T10:30:00Z",
#       "user_id": null,
#       "identity_key": "guest-12345",
#       "activity_type": "practice",
#       "context": {"tabId":"tab-abc123","sessionId":"practice-session-1"},
#       "day": "2026-01-22"
#     }
#   ],
#   "total": 1
# }
```

### 5. Retrieve Activity Events (Authenticated)
```bash
curl -X GET "https://your-backend.railway.app/api/activity/events?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected Response:
# {
#   "events": [
#     {
#       "id": 2,
#       "created_at": "2026-01-22T11:00:00Z",
#       "user_id": "uuid-123",
#       "identity_key": null,
#       "activity_type": "mock_interview",
#       "context": {"sessionId":"mock-session-1","interviewType":"short"},
#       "day": "2026-01-22"
#     }
#   ],
#   "total": 1
# }
```

### 6. Progress Endpoint (With Activity Events)
```bash
curl -X GET "https://your-backend.railway.app/api/progress?userKey=guest-12345"

# Expected Response:
# {
#   "sessions": [
#     {
#       "date": "2026-01-22T10:30:00Z",
#       "type": "Practice Started",
#       "score": null,
#       "topStrength": "Activity started",
#       "topWeakness": "N/A",
#       "sessionId": "practice-session-1",
#       "activityEvent": true
#     }
#   ],
#   "total": 1
# }
```

## Rollback Plan

### Option 1: Disable Feature (No Deploy Required)
```bash
# In Railway/Vercel dashboard, set environment variable:
ACTIVITY_TRACKING_ENABLED=false

# Or via CLI:
railway variables set ACTIVITY_TRACKING_ENABLED=false
```

### Option 2: Leave Table in Place
The table is harmless and can be left in the database. It will simply not be written to if the feature is disabled.

### Option 3: Drop Table (Only if Necessary)
```sql
-- Only run if you want to completely remove the feature
DROP TABLE IF EXISTS activity_events CASCADE;
```

## Security Considerations

1. **Authentication:**
   - Respects JWT tokens for authenticated users
   - Supports guest keys for unauthenticated users
   - No client-side spoofing possible (server-side JWT decode)

2. **RLS Policies:**
   - Service role (backend) has full access
   - Authenticated users can only read their own events
   - Guests cannot access Supabase directly (must go through backend)

3. **Deduplication:**
   - Prevents spam by enforcing unique constraint on (day, activity_type, identity, tabId)
   - Server-side dedupe detection returns success to avoid client errors

4. **Resilience:**
   - Always returns 200 OK (even on errors)
   - Graceful degradation if Supabase is down
   - Feature flag for instant disable without deploy

## Files Changed

1. **New Files:**
   - [supabase-migrations/activity_tracking.sql](supabase-migrations/activity_tracking.sql) - Database schema
   - [routes/activity.js](routes/activity.js) - Activity tracking routes

2. **Modified Files:**
   - [server.js](server.js:14) - Import and register activity routes
   - [routes/progress.js](routes/progress.js:239) - Add activity events to sessions list

## Environment Variables

- `ACTIVITY_TRACKING_ENABLED` (optional, default: enabled)
  - Set to `'false'` to disable activity tracking
  - Any other value (or unset) = enabled

## Notes

- Activity tracking is **opt-in** via feature flag
- No breaking changes to existing endpoints
- Safe to deploy - errors are non-fatal and logged
- Dedupe ensures client can retry without creating duplicates
- Progress endpoint gracefully handles missing activity data
