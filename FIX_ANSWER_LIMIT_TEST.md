# "Fix my answer" Daily Limit Test

## Endpoint
**POST** `/ai/micro-demo`

## Request Body
```json
{
  "text": "Your answer text here",
  "userKey": "user-key-here"
}
```

## Expected Behavior
- **Attempt 1**: ✅ Success (200 OK)
- **Attempt 2**: ✅ Success (200 OK)
- **Attempt 3**: ❌ Blocked (429) with structured response

---

## Test Commands (Production)

Replace `YOUR_PRODUCTION_URL` with your production base URL (e.g., `https://api.jobspeakpro.com`)

Replace `TEST_USER_KEY` with a fresh QA user key (e.g., `qa-test-${Date.now()}`)

### Attempt 1: First "Fix my answer" (Should Succeed)
```bash
curl -X POST YOUR_PRODUCTION_URL/ai/micro-demo \
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
curl -X POST YOUR_PRODUCTION_URL/ai/micro-demo \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I managed a team of 5 engineers to migrate our database infrastructure. We reduced query time by 70%.",
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

---

### Attempt 3: Third "Fix my answer" (Should be BLOCKED)
```bash
curl -X POST YOUR_PRODUCTION_URL/ai/micro-demo \
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

---

## Verification Checklist

- [ ] Attempt 1 returns 200 OK with `improved` field
- [ ] Attempt 2 returns 200 OK with `improved` field
- [ ] Attempt 3 returns 429 with:
  - [ ] `blocked: true`
  - [ ] `reason: "DAILY_LIMIT_REACHED"`
  - [ ] `message` includes "3 free fixes" and hours until reset
  - [ ] `nextAllowedAt` is a valid ISO timestamp (midnight UTC next day)
  - [ ] `usage.blocked: true`
  - [ ] `usage.used: 3`
  - [ ] `usage.remaining: 0`

---

## Notes

- Daily limit resets at **midnight UTC**
- `nextAllowedAt` is calculated as midnight UTC of the next day
- Free users get exactly 3 "Fix my answer" attempts per day
- Pro users have unlimited access (no limit check)

