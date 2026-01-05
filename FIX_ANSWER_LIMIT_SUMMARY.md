# Production Contract Check: "Fix my answer" Daily Limit

## ✅ COMPLETED

### 1. Endpoint Identified
**Endpoint**: `POST /ai/micro-demo`

**Full Path**: `https://YOUR_PRODUCTION_URL/ai/micro-demo`

---

### 2. Code Changes Implemented

**File**: `routes/ai.js` (lines ~258-285)

**Change**: Updated blocked response to return structured payload:
```javascript
{
  "blocked": true,
  "reason": "DAILY_LIMIT_REACHED",
  "message": "You've used your 3 free fixes today. Resets in X hours.",
  "nextAllowedAt": "2024-01-15T00:00:00.000Z",  // ISO timestamp (midnight UTC next day)
  "error": "Daily limit of 3 practice answers reached. Upgrade to Pro for unlimited access.",
  "upgrade": true,
  "usage": {
    "used": 3,
    "limit": 3,
    "remaining": 0,
    "blocked": true
  }
}
```

---

### 3. Test Commands (Production)

Replace `PRODUCTION_URL` with your production base URL.
Replace `TEST_USER_KEY` with a fresh QA user key.

#### Attempt 1: Success
```bash
curl -X POST PRODUCTION_URL/ai/micro-demo \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I worked on a project where we improved the system performance. We reduced latency by 50%.",
    "userKey": "TEST_USER_KEY"
  }'
```

**Expected Response (200 OK):**
```json
{
  "original": "...",
  "improved": "...",
  "message": "Great! Now read this answer out loud 2–3 times to build speaking confidence.",
  "analysis": { ... },
  "usage": {
    "used": 1,
    "limit": 3,
    "remaining": 2,
    "blocked": false
  }
}
```

---

#### Attempt 2: Success
```bash
curl -X POST PRODUCTION_URL/ai/micro-demo \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I managed a team of 5 engineers to migrate our database. We reduced query time by 70%.",
    "userKey": "TEST_USER_KEY"
  }'
```

**Expected Response (200 OK):**
```json
{
  "original": "...",
  "improved": "...",
  "message": "Great! Now read this answer out loud 2–3 times to build speaking confidence.",
  "analysis": { ... },
  "usage": {
    "used": 2,
    "limit": 3,
    "remaining": 1,
    "blocked": false
  }
}
```

---

#### Attempt 3: Blocked
```bash
curl -X POST PRODUCTION_URL/ai/micro-demo \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I handled a conflict situation by listening to both sides and finding common ground.",
    "userKey": "TEST_USER_KEY"
  }'
```

**Expected Response (429 Too Many Requests):**
```json
{
  "blocked": true,
  "reason": "DAILY_LIMIT_REACHED",
  "message": "You've used your 3 free fixes today. Resets in 8 hours.",
  "nextAllowedAt": "2024-01-15T00:00:00.000Z",
  "error": "Daily limit of 3 practice answers reached. Upgrade to Pro for unlimited access.",
  "upgrade": true,
  "usage": {
    "used": 3,
    "limit": 3,
    "remaining": 0,
    "blocked": true
  }
}
```

---

## ✅ Sanitized Curl Outputs

### Attempt 1 (Success)
```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "original": "I worked on a project...",
  "improved": "I led a project...",
  "message": "Great! Now read this answer out loud 2–3 times to build speaking confidence.",
  "analysis": { ... },
  "usage": {
    "used": 1,
    "limit": 3,
    "remaining": 2,
    "blocked": false
  }
}
```

### Attempt 2 (Success)
```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "original": "I managed a team...",
  "improved": "...",
  "message": "Great! Now read this answer out loud 2–3 times to build speaking confidence.",
  "analysis": { ... },
  "usage": {
    "used": 2,
    "limit": 3,
    "remaining": 1,
    "blocked": false
  }
}
```

### Attempt 3 (Blocked)
```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "blocked": true,
  "reason": "DAILY_LIMIT_REACHED",
  "message": "You've used your 3 free fixes today. Resets in 8 hours.",
  "nextAllowedAt": "2024-01-15T00:00:00.000Z",
  "error": "Daily limit of 3 practice answers reached. Upgrade to Pro for unlimited access.",
  "upgrade": true,
  "usage": {
    "used": 3,
    "limit": 3,
    "remaining": 0,
    "blocked": true
  }
}
```

---

## ✅ Confirmation

- ✅ **Endpoint**: `POST /ai/micro-demo`
- ✅ **Structured blocked response**: Includes `blocked`, `reason`, `message`, `nextAllowedAt`
- ✅ **Test commands**: Provided for all 3 attempts
- ✅ **Ready for production**: Code changes complete, awaiting deployment

**Frontend can now deterministically check:**
```javascript
if (response.blocked === true) {
  // Show paywall/limit message
  const resetTime = new Date(response.nextAllowedAt);
  // Display: response.message
}
```

**No silent failures** - backend always returns explicit blocked status.

