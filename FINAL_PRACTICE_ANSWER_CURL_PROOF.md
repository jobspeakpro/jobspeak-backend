# Final Curl Proof: /api/practice/answer - 4 Attempts

## ✅ ENDPOINT IDENTIFIED AND VERIFIED

**File**: `routes/practice.js`  
**Handler**: `router.post(["/practice/answer", "/answer"], async (req, res) => {` (line 88)  
**Vercel Proxy URL**: `https://jobspeakpro.com/api/practice/answer`  
**Deployed Commit**: `aa79536` - "Fix: Include questionId in idempotency key to ensure each attempt is counted"  
**Status**: ✅ **VERIFIED - CORRECT BEHAVIOR**

---

## Test Results (Fresh QA Account)

**Test User Key**: `qa-practice-1767626914477`  
**Session ID**: `test-session-1767626914477`  
**Test Date**: 2026-01-05

---

## Attempt 1: Success (200 OK)

**Curl Command:**
```bash
curl -X POST https://jobspeakpro.com/api/practice/answer \
  -H "Content-Type: application/json" \
  -d '{
    "userKey": "qa-practice-1767626914477",
    "sessionId": "test-session-1767626914477",
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
    "userKey": "qa-practice-1767626914477",
    "sessionId": "test-session-1767626914477",
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
  "score": 65,
  "clearerRewrite": "...",
  "usage": {
    "used": 2,
    "limit": 3,
    "remaining": 1,
    "blocked": false
  }
}
```

---

## Attempt 3: Success (200 OK)

**Curl Command:**
```bash
curl -X POST https://jobspeakpro.com/api/practice/answer \
  -H "Content-Type: application/json" \
  -d '{
    "userKey": "qa-practice-1767626914477",
    "sessionId": "test-session-1767626914477",
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
    "used": 3,
    "limit": 3,
    "remaining": 0,
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
    "used": 3,
    "limit": 3,
    "remaining": 0,
    "blocked": false
  }
}
```

**Contract Check**: ✅
- `usage.blocked: false` ✅
- `usage.remaining: 0` ✅
- `usage.used: 3` ✅

---

## Attempt 4: BLOCKED (429 Too Many Requests)

**Curl Command:**
```bash
curl -X POST https://jobspeakpro.com/api/practice/answer \
  -H "Content-Type: application/json" \
  -d '{
    "userKey": "qa-practice-1767626914477",
    "sessionId": "test-session-1767626914477",
    "questionId": "q4",
    "questionText": "Where do you see yourself in 5 years?",
    "answerText": "I led a cross-functional initiative to streamline our workflow processes. We increased team productivity by 40% and reduced errors by 25%."
  }'
```

**Status Code:** `429 Too Many Requests`

**JSON Response:**
```json
{
  "blocked": true,
  "reason": "DAILY_LIMIT_REACHED",
  "message": "You've used your 3 free fixes today. Resets in 9 hours.",
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

**Sanitized Output:**
```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "blocked": true,
  "reason": "DAILY_LIMIT_REACHED",
  "message": "You've used your 3 free fixes today. Resets in 9 hours.",
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

## ✅ Verification Checklist

- [x] **Attempt 1**: 200 OK with `clearerRewrite` and `usage.used: 1`
- [x] **Attempt 2**: 200 OK with `clearerRewrite` and `usage.used: 2`
- [x] **Attempt 3**: 200 OK with `clearerRewrite`, `usage.used: 3`, `usage.remaining: 0`, `usage.blocked: false`
- [x] **Attempt 4**: 429 with:
  - [x] `blocked: true` (top-level)
  - [x] `reason: "DAILY_LIMIT_REACHED"`
  - [x] `message` includes "3 free fixes" and hours until reset
  - [x] `nextAllowedAt` is valid ISO timestamp (midnight UTC next day)
  - [x] `upgrade: true`
  - [x] `usage.blocked: true`
  - [x] `usage.used: 3`
  - [x] `usage.remaining: 0`

---

## ✅ Final Confirmation

**Endpoint**: `POST https://jobspeakpro.com/api/practice/answer`  
**Deployment Status**: ✅ **DEPLOYED AND VERIFIED**  
**Production Behavior**: ✅ **CORRECT** - 3 fixes allowed, 4th blocked  
**Contract Compliance**: ✅ **VERIFIED**
- Attempt 3: `usage.blocked: false`, `usage.remaining: 0` ✅
- Attempt 4: 429 with all required fields ✅

**Frontend Ready**: ✅ **YES** - Frontend can check `response.blocked === true` to show paywall/limit message.

