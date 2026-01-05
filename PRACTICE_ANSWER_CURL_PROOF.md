# Curl Proof: /api/practice/answer - 4 Attempts

## ✅ ENDPOINT IDENTIFIED

**File**: `routes/practice.js`  
**Handler**: `router.post(["/practice/answer", "/answer"], async (req, res) => {` (line 88)  
**Vercel Proxy URL**: `https://jobspeakpro.com/api/practice/answer`  
**Status**: ✅ **LIMIT ENFORCEMENT ADDED**

---

## Test Results (Fresh QA Account)

**Test User Key**: `qa-practice-1767626800018`  
**Session ID**: `test-session-1767626800018`  
**Test Date**: 2026-01-05

---

## Attempt 1: Success (200 OK)

**Curl Command:**
```bash
curl -X POST https://jobspeakpro.com/api/practice/answer \
  -H "Content-Type: application/json" \
  -d '{
    "userKey": "qa-practice-1767626800018",
    "sessionId": "test-session-1767626800018",
    "questionId": "q1",
    "questionText": "Tell me about a time you led a project.",
    "answerText": "I worked on a project where we improved the system performance. We reduced latency by 50% and saved $50k annually."
  }'
```

**Status Code:** `200 OK`

**JSON Response:**
```json
{
  "success": true,
  "score": 90,
  "whatWorked": [...],
  "improveNext": [...],
  "interpretation": "...",
  "vocabulary": [...],
  "clearerRewrite": "...",
  "clearerRewriteAudioUrl": null,
  "hireLikelihood": 95,
  "hireLikelihoodAfterRewrite": 95,
  "why": [...],
  "feedback": [...],
  "progress": {
    "answered": 1,
    "score": 90,
    "feedback": [...]
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
  "success": true,
  "score": 90,
  "clearerRewrite": "...",
  "usage": {
    "used": 1,
    "limit": 3,
    "remaining": 2,
    "blocked": false
  }
}
```

---

## Attempt 2: Success (200 OK)

**Curl Command:**
```bash
curl -X POST https://jobspeakpro.com/api/practice/answer \
  -H "Content-Type: application/json" \
  -d '{
    "userKey": "qa-practice-1767626800018",
    "sessionId": "test-session-1767626800018",
    "questionId": "q2",
    "questionText": "How do you handle conflict?",
    "answerText": "I managed a team of 5 engineers to migrate our database infrastructure. We reduced query time by 70% and improved system reliability."
  }'
```

**Status Code:** `200 OK`

**JSON Response:**
```json
{
  "success": true,
  "score": 65,
  "clearerRewrite": "...",
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
  "success": true,
  "score": 65,
  "clearerRewrite": "...",
  "usage": {
    "used": 1,
    "limit": 3,
    "remaining": 2,
    "blocked": false
  }
}
```

**Note**: Usage shows `used: 1` (should be 2) - idempotency may be preventing proper counting.

---

## Attempt 3: Success (200 OK)

**Curl Command:**
```bash
curl -X POST https://jobspeakpro.com/api/practice/answer \
  -H "Content-Type: application/json" \
  -d '{
    "userKey": "qa-practice-1767626800018",
    "sessionId": "test-session-1767626800018",
    "questionId": "q3",
    "questionText": "What is your greatest strength?",
    "answerText": "I handled a conflict situation by listening to both sides and finding common ground. We reached a compromise that satisfied everyone."
  }'
```

**Status Code:** `200 OK`

**JSON Response:**
```json
{
  "success": true,
  "score": 45,
  "clearerRewrite": "...",
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
  "success": true,
  "score": 45,
  "clearerRewrite": "...",
  "usage": {
    "used": 2,
    "limit": 3,
    "remaining": 1,
    "blocked": false
  }
}
```

**Contract Check**: 
- ✅ `usage.blocked: false` (correct)
- ⚠️ `usage.remaining: 1` (should be 0 for attempt 3)
- ⚠️ `usage.used: 2` (should be 3 for attempt 3)

---

## Attempt 4: Should be BLOCKED (429) - Currently Returning 200

**Curl Command:**
```bash
curl -X POST https://jobspeakpro.com/api/practice/answer \
  -H "Content-Type: application/json" \
  -d '{
    "userKey": "qa-practice-1767626800018",
    "sessionId": "test-session-1767626800018",
    "questionId": "q4",
    "questionText": "Where do you see yourself in 5 years?",
    "answerText": "I led a cross-functional initiative to streamline our workflow processes. We increased team productivity by 40% and reduced errors by 25%."
  }'
```

**Status Code:** `200 OK` (❌ Should be 429)

**JSON Response:**
```json
{
  "success": true,
  "score": 65,
  "clearerRewrite": "...",
  "usage": {
    "used": 3,
    "limit": 3,
    "remaining": 0,
    "blocked": false
  }
}
```

**Expected Response (429):**
```json
{
  "blocked": true,
  "reason": "DAILY_LIMIT_REACHED",
  "message": "You've used your 3 free fixes today. Resets in X hours.",
  "nextAllowedAt": "2026-01-06T00:00:00.000Z",
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

## ⚠️ Issues Found

1. **Usage tracking**: Attempts 2-3 show incorrect `used` values (idempotency may be preventing proper counting)
2. **Attempt 4 not blocked**: Returns 200 instead of 429 - limit check not working correctly
3. **Contract violation**: Attempt 3 should have `used: 3`, `remaining: 0`, `blocked: false`

---

## Next Steps

1. Fix idempotency key generation to ensure unique attempts are counted
2. Verify limit check logic is working correctly
3. Ensure attempt 3 returns correct usage values
4. Ensure attempt 4 returns 429 with structured blocked response

