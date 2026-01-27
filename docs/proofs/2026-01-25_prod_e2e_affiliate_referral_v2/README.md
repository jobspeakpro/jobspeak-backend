# Production E2E Test Results V2
**Date:** 2026-01-26T02:14:03.171Z
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

- **Time:** 2026-01-26T02:14:22.237Z

### 2. Fill affiliate form
- **Status:** FAIL
- **Details:** page.waitForSelector: Timeout 5000ms exceeded.
Call log:
[2m  - waiting for locator('input[name="name"], input[placeholder*="name" i]') to be visible[22m

- **Time:** 2026-01-26T02:14:27.619Z

### 3. Submit affiliate form and redirect to /joined
- **Status:** FAIL
- **Details:** page.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('button[type="submit"]')[22m

- **Time:** 2026-01-26T02:14:57.905Z

### 4. Login with test credentials
- **Status:** FAIL
- **Details:** page.fill: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('input[type="email"]')[22m

- **Time:** 2026-01-26T02:15:44.659Z

### 5. Navigate to /referral
- **Status:** PASS

- **Time:** 2026-01-26T02:16:00.543Z

### 6. Referral code is visible
- **Status:** FAIL
- **Details:** page.waitForSelector: Timeout 5000ms exceeded.
Call log:
[2m  - waiting for locator('[data-testid="referral-code"], .referral-code, code, [class*="code"]') to be visible[22m

- **Time:** 2026-01-26T02:16:05.736Z

### 7. Click copy button
- **Status:** FAIL
- **Details:** locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('button:has-text("Copy"), button:has-text("copy")').first()[22m

- **Time:** 2026-01-26T02:16:35.910Z


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

