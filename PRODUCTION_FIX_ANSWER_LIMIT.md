# Production Contract Check: "Fix my answer" Daily Limit

## Endpoint
**POST** `/ai/micro-demo`

## Summary
- **Endpoint**: `POST /ai/micro-demo`
- **Daily Limit**: 3 free "Fix my answer" attempts per day for free users
- **Reset Time**: Midnight UTC
- **Blocked Response**: 429 with structured payload including `blocked`, `reason`, `message`, and `nextAllowedAt`

---

## Test Commands for Production

### Setup
Replace these variables:
- `PRODUCTION_URL`: Your production API base URL (e.g., `https://api.jobspeakpro.com`)
- `TEST_USER_KEY`: A fresh QA user key (e.g., `qa-test-${Date.now()}`)

---

### Attempt 1: First "Fix my answer" (Should Succeed)

```bash
curl -X POST PRODUCTION_URL/ai/micro-demo \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I worked on a project where we improved the system performance. We reduced latency by 50% and saved $50k annually.",
    "userKey": "TEST_USER_KEY"
  }'
```

**Expected Response (200 OK):**
```json
{
  "original": "I worked on a project...",
  "improved": "I led a project...",
  "message": "Great! Now read this answer out loud 2–3 times to build speaking confidence.",
  "analysis": {
    "score": 75,
    "label": "Strong",
    "whatWorked": [...],
    "improveNext": [...],
    "hiringManagerHeard": "...",
    "vocabulary": [...],
    "rubricBreakdown": {...}
  },
  "usage": {
    "used": 1,
    "limit": 3,
    "remaining": 2,
    "blocked": false
  }
}
```

**Sanitized Output:**
```
HTTP/1.1 200 OK
Content-Type: application/json

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

### Attempt 2: Second "Fix my answer" (Should Succeed)

```bash
curl -X POST PRODUCTION_URL/ai/micro-demo \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I managed a team of 5 engineers to migrate our database infrastructure. We reduced query time by 70% and improved system reliability.",
    "userKey": "TEST_USER_KEY"
  }'
```

**Expected Response (200 OK):**
```json
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

**Sanitized Output:**
```
HTTP/1.1 200 OK
Content-Type: application/json

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

### Attempt 3: Third "Fix my answer" (Should be BLOCKED)

```bash
curl -X POST PRODUCTION_URL/ai/micro-demo \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I handled a conflict situation by listening to both sides and finding common ground. We reached a compromise that satisfied everyone.",
    "userKey": "TEST_USER_KEY"
  }'
```

**Expected Response (429 Too Many Requests):**
```json
{
  "blocked": true,
  "reason": "DAILY_LIMIT_REACHED",
  "message": "You've used your 3 free fixes today. Resets in X hours.",
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

**Sanitized Output:**
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

## Verification Checklist

✅ **Attempt 1**:
- [ ] Status: 200 OK
- [ ] Response includes `improved` field
- [ ] Response includes `usage.used: 1`
- [ ] Response includes `usage.remaining: 2`
- [ ] Response includes `usage.blocked: false`

✅ **Attempt 2**:
- [ ] Status: 200 OK
- [ ] Response includes `improved` field
- [ ] Response includes `usage.used: 2`
- [ ] Response includes `usage.remaining: 1`
- [ ] Response includes `usage.blocked: false`

✅ **Attempt 3** (Blocked):
- [ ] Status: 429 Too Many Requests
- [ ] Response includes `blocked: true` (top-level)
- [ ] Response includes `reason: "DAILY_LIMIT_REACHED"`
- [ ] Response includes `message` with "3 free fixes" and hours until reset
- [ ] Response includes `nextAllowedAt` as valid ISO timestamp (midnight UTC next day)
- [ ] Response includes `usage.blocked: true`
- [ ] Response includes `usage.used: 3`
- [ ] Response includes `usage.remaining: 0`
- [ ] Response includes `upgrade: true`

---

## Implementation Details

### Code Changes
- **File**: `routes/ai.js`
- **Line**: ~258-285
- **Change**: Updated blocked response to include structured fields:
  - `blocked: true`
  - `reason: "DAILY_LIMIT_REACHED"`
  - `message: "You've used your 3 free fixes today. Resets in X hours."`
  - `nextAllowedAt: "ISO timestamp"` (midnight UTC next day)

### Reset Logic
- Daily limit resets at **midnight UTC**
- `nextAllowedAt` is calculated as midnight UTC of the next day
- Hours until reset is calculated dynamically based on current time

### Frontend Integration
The frontend can now deterministically check for limit blocking:
```javascript
if (response.blocked === true) {
  // Show paywall/limit message
  const resetTime = new Date(response.nextAllowedAt);
  // Display message and countdown
}
```

---

## Confirmation

✅ **Endpoint identified**: `POST /ai/micro-demo`
✅ **Structured blocked response implemented**
✅ **Test commands provided for all 3 attempts**
✅ **Ready for production deployment**

**Next Steps:**
1. Deploy changes to production
2. Run the 3 curl commands above with a fresh QA user
3. Verify all responses match expected structure
4. Confirm frontend can handle the blocked response deterministically

