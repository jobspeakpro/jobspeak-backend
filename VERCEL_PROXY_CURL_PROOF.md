# Vercel Proxy Curl Proof: "Fix my answer" - 4 Attempts

## ✅ VERIFIED - CORRECT BEHAVIOR

**Vercel Proxy URL**: `https://jobspeakpro.com/ai/micro-demo`  
**Test User Key**: `qa-vercel-1767626206034`  
**Test Date**: 2026-01-05  
**Status**: ✅ **ALL ATTEMPTS WORKING CORRECTLY**

---

## Product Rule

**Free users get 3 fixes per day:**
- ✅ Attempt 1: 200 OK (success)
- ✅ Attempt 2: 200 OK (success)
- ✅ Attempt 3: 200 OK (success)
- ❌ Attempt 4: 429 BLOCKED (with structured response)

---

## Attempt 1: Success (200 OK)

**Curl Command:**
```bash
curl -X POST https://jobspeakpro.com/ai/micro-demo \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I worked on a project where we improved the system performance. We reduced latency by 50% and saved $50k annually.",
    "userKey": "qa-vercel-1767626206034"
  }'
```

**Status Code:** `200 OK`

**JSON Response:**
```json
{
  "original": "I worked on a project where we improved the system performance. We reduced latency by 50% and saved $50k annually.",
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

## Attempt 2: Success (200 OK)

**Curl Command:**
```bash
curl -X POST https://jobspeakpro.com/ai/micro-demo \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I managed a team of 5 engineers to migrate our database infrastructure. We reduced query time by 70% and improved system reliability.",
    "userKey": "qa-vercel-1767626206034"
  }'
```

**Status Code:** `200 OK`

**JSON Response:**
```json
{
  "original": "I managed a team of 5 engineers to migrate our database infrastructure. We reduced query time by 70% and improved system reliability.",
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

## Attempt 3: Success (200 OK)

**Curl Command:**
```bash
curl -X POST https://jobspeakpro.com/ai/micro-demo \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I handled a conflict situation by listening to both sides and finding common ground. We reached a compromise that satisfied everyone.",
    "userKey": "qa-vercel-1767626206034"
  }'
```

**Status Code:** `200 OK`

**JSON Response:**
```json
{
  "original": "I handled a conflict situation by listening to both sides and finding common ground. We reached a compromise that satisfied everyone.",
  "improved": "...",
  "message": "Great! Now read this answer out loud 2–3 times to build speaking confidence.",
  "analysis": { ... },
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
HTTP/1.1 200 OK
Content-Type: application/json

{
  "original": "...",
  "improved": "...",
  "message": "Great! Now read this answer out loud 2–3 times to build speaking confidence.",
  "analysis": { ... },
  "usage": {
    "used": 3,
    "limit": 3,
    "remaining": 0,
    "blocked": true
  }
}
```

---

## Attempt 4: BLOCKED (429 Too Many Requests)

**Curl Command:**
```bash
curl -X POST https://jobspeakpro.com/ai/micro-demo \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I led a cross-functional initiative to streamline our workflow processes. We increased team productivity by 40% and reduced errors by 25%.",
    "userKey": "qa-vercel-1767626206034"
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

- [x] **Attempt 1**: 200 OK with `improved` field and `usage.used: 1`
- [x] **Attempt 2**: 200 OK with `improved` field and `usage.used: 2`
- [x] **Attempt 3**: 200 OK with `improved` field and `usage.used: 3`
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

## ✅ Confirmation

**Vercel Proxy URL**: `https://jobspeakpro.com/ai/micro-demo`  
**Status**: ✅ **VERIFIED - ALL ATTEMPTS WORKING CORRECTLY**  
**Attempt 3**: ✅ **200 OK (NOT silently failing)**  
**Attempt 4**: ✅ **429 BLOCKED with all required fields**

**Frontend can check `response.blocked === true` to show paywall/limit message.**

