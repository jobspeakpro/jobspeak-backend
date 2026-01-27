# Production E2E Test Results
**Date:** 2026-01-26T02:03:52.333Z
**Frontend:** https://jobspeakpro.com
**Backend:** https://jobspeak-backend-production.up.railway.app

## Test Summary
- **Passed:** 2
- **Failed:** 5
- **Total Steps:** 7

## Commands Used
```bash
npx playwright install
node test_e2e_playwright.js
```

## Test Steps

### 1. Navigate to /affiliate
- **Status:** PASS

- **Time:** 2026-01-26T02:04:11.372Z

### 2. Fill affiliate form
- **Status:** FAIL
- **Details:** page.waitForSelector: Timeout 5000ms exceeded.
Call log:
[2m  - waiting for locator('input[name="name"], input[placeholder*="name" i]') to be visible[22m

- **Time:** 2026-01-26T02:04:16.737Z

### 3. Submit affiliate form and redirect to /joined
- **Status:** FAIL
- **Details:** page.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('button[type="submit"]')[22m

- **Time:** 2026-01-26T02:04:47.136Z

### 4. Login with test credentials
- **Status:** FAIL
- **Details:** page.fill: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('input[type="email"]')[22m

- **Time:** 2026-01-26T02:05:33.968Z

### 5. Navigate to /referral
- **Status:** PASS

- **Time:** 2026-01-26T02:05:49.953Z

### 6. Referral code is visible
- **Status:** FAIL
- **Details:** page.waitForSelector: Timeout 5000ms exceeded.
Call log:
[2m  - waiting for locator('[data-testid="referral-code"], .referral-code, code, [class*="code"]') to be visible[22m

- **Time:** 2026-01-26T02:05:55.170Z

### 7. Click copy button
- **Status:** FAIL
- **Details:** locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('button:has-text("Copy"), button:has-text("copy")').first()[22m

- **Time:** 2026-01-26T02:06:25.374Z


## Artifacts
- **Screenshots:** `screenshots/` (8 files)
- **Video:** `video/` (Playwright recording)
- **Console Logs:** `console.log`
- **Network Errors:** `network_errors.log`

## Issues Found
- **Fill affiliate form:** page.waitForSelector: Timeout 5000ms exceeded.
Call log:
[2m  - waiting for locator('input[name="name"], input[placeholder*="name" i]') to be visible[22m

- **Submit affiliate form and redirect to /joined:** page.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('button[type="submit"]')[22m

- **Login with test credentials:** page.fill: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('input[type="email"]')[22m

- **Referral code is visible:** page.waitForSelector: Timeout 5000ms exceeded.
Call log:
[2m  - waiting for locator('[data-testid="referral-code"], .referral-code, code, [class*="code"]') to be visible[22m

- **Click copy button:** locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('button:has-text("Copy"), button:has-text("copy")').first()[22m

