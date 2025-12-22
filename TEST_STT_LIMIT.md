# Test: STT Speaking Attempts Limit (3/day)

## Goal
Verify that free users get exactly 3 speaking attempts per day, and that `/ai/micro-demo` does NOT consume speaking attempts.

## Test Steps

### 1. Reset Test User (if needed)
```bash
# Connect to database and reset STT count for test user
# Or wait until next day (resets at midnight UTC)
```

### 2. Verify Initial State
```bash
# Check current usage (should be 0/3 for new day)
curl "http://localhost:3000/api/usage/today?userKey=test-user-key"
# Expected: {"used":0,"limit":3,"remaining":3,"isPro":false}
```

### 3. Test STT Endpoint (Should Allow 3 Attempts)

#### Attempt 1:
```bash
curl -X POST http://localhost:3000/api/stt \
  -F "audio=@test-audio.webm" \
  -F "userKey=test-user-key"
# Expected: 200 OK with transcript
# Check usage: should show {"used":1,"limit":3,"remaining":2}
```

#### Attempt 2:
```bash
curl -X POST http://localhost:3000/api/stt \
  -F "audio=@test-audio.webm" \
  -F "userKey=test-user-key"
# Expected: 200 OK with transcript
# Check usage: should show {"used":2,"limit":3,"remaining":1}
```

#### Attempt 3:
```bash
curl -X POST http://localhost:3000/api/stt \
  -F "audio=@test-audio.webm" \
  -F "userKey=test-user-key"
# Expected: 200 OK with transcript
# Check usage: should show {"used":3,"limit":3,"remaining":0}
```

#### Attempt 4 (Should be Blocked):
```bash
curl -X POST http://localhost:3000/api/stt \
  -F "audio=@test-audio.webm" \
  -F "userKey=test-user-key"
# Expected: 402 Payment Required
# Response: {"error":"Daily limit of 3 speaking attempts reached. Upgrade to Pro for unlimited access.","upgrade":true}
```

### 4. Test /ai/micro-demo (Should NOT Consume Attempts)

Even after 3 STT attempts are used, `/ai/micro-demo` should still work:

```bash
curl -X POST http://localhost:3000/ai/micro-demo \
  -H "Content-Type: application/json" \
  -d '{"text":"This is a test answer","userKey":"test-user-key"}'
# Expected: 200 OK with improved text
# Check usage: should STILL show {"used":3,"limit":3,"remaining":0}
# (micro-demo should NOT increment the count)
```

### 5. Verify Logs

Check server logs for:
- `[STT] Usage check - userKey: ..., sttAttemptsUsed: X, sttLimit: 3, route: /api/stt`
- `[STT] INCREMENTED - Speaking attempts: X/3 (route: /api/stt, success only)`
- `[AI/micro-demo] Request received - userKey: ..., route: /ai/micro-demo (NO STT attempt check/consumption)`
- `[USAGE] Query - userKey: ..., sttAttemptsUsed: X, sttLimit: 3, remaining: Y`

## Expected Behavior

✅ **3 STT calls succeed** (attempts 1, 2, 3)
✅ **4th STT call returns 402** (limit reached)
✅ **/ai/micro-demo works even after 3 STT attempts** (doesn't consume attempts)
✅ **Usage endpoint shows correct count** (0→1→2→3, stays at 3 after micro-demo)

## Notes

- STT attempts only increment on **successful** transcriptions
- Failed STT requests do NOT consume attempts
- `/ai/micro-demo` has its own rate limit (30/min) but NO usage limit
- Daily limit resets at midnight UTC

