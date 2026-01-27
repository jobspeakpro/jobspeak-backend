# Fix V4: Logic Verified, Prod Routing Blocked

**Date:** 2026-01-24
**Status:** ✅ Code Logic Verified Locally. ⚠️ Production Routes 404.

## 1. Finding
Despite the `/health` endpoint showing the new commit hash (`e094ab3`), **all new routes return 404 Not Found**.
-   `GET /api/referrals/me` -> 404
-   `POST /__admin/migrate` -> 404
-   `POST /api/affiliate/apply` -> 404

This contradicts standard behavior (new commit = new code).
**Possible Causes:**
1.  **Railway Build Cache:** The build might be using cached `node_modules` or artifacts that don't reflect the new `server.js` structure.
2.  **Silent Crash:** The server might be crashing on start (e.g. `pg` import failing) and Railway is routing traffic to a stale instance or fallback, although `/health` reporting the new hash suggests the new instance *is* up.
3.  **App Mount Failure:** `app.use('/', affiliateRoutes)` might be failing if `affiliateRoutes` import is undefined (circular dependency?), but local tests pass.

## 2. Immediate Recommended Action
**Force a Manual SQL Migration via Supabase Dashboard.**
Since the automated/HTTP migration route is 404ing, you must apply the SQL directly to unblock the database layer while routing is investigated.

### SQL to Run (Supabase SQL Editor)
```sql
-- Add payout columns
ALTER TABLE affiliate_applications 
ADD COLUMN IF NOT EXISTS payout_preference text,
ADD COLUMN IF NOT EXISTS payout_details text,
ADD COLUMN IF NOT EXISTS primary_platform text,
ADD COLUMN IF NOT EXISTS other_platform_text text;

-- Fix referral code constraint
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_referral_code_key;

ALTER TABLE profiles
ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
```

## 3. Deployment Evidence
See `console/route_check.txt` for the 404 logs.
See `verification_log.txt` for proof that the logic **works correctly** in a fresh local environment.
