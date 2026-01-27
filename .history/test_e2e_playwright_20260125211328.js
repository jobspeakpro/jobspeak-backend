import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const FRONTEND_URL = 'https://jobspeakpro.com';
const BACKEND_URL = 'https://jobspeak-backend-production.up.railway.app';
const PROOF_DIR = 'docs/proofs/2026-01-25_prod_e2e_affiliate_referral_v2';
const SCREENSHOTS_DIR = path.join(PROOF_DIR, 'screenshots');
const VIDEO_DIR = path.join(PROOF_DIR, 'video');

// Test credentials (existing user to avoid email confirmation)
const TEST_EMAIL = 'meyefaf490@24faw.com';
const TEST_PASSWORD = 'meyefaf490@24faw.com';

// Ensure proof directories exist
[PROOF_DIR, SCREENSHOTS_DIR, VIDEO_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

async function runE2ETest() {
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        recordVideo: {
            dir: VIDEO_DIR,
            size: { width: 1280, height: 720 }
        }
    });

    const page = await context.newPage();

    // Capture console logs and network errors
    const consoleLogs = [];
    const networkErrors = [];

    page.on('console', msg => {
        const text = `[${msg.type()}] ${msg.text()}`;
        consoleLogs.push(text);
        console.log(text);
    });

    page.on('requestfailed', request => {
        const error = `[NETWORK FAIL] ${request.method()} ${request.url()} - ${request.failure().errorText}`;
        networkErrors.push(error);
        console.error(error);
    });

    const results = {
        steps: [],
        passed: 0,
        failed: 0,
        timestamp: new Date().toISOString()
    };

    function recordStep(name, status, details = '') {
        const step = { name, status, details, timestamp: new Date().toISOString() };
        results.steps.push(step);
        if (status === 'PASS') results.passed++;
        if (status === 'FAIL') results.failed++;
        console.log(`${status === 'PASS' ? '✅' : '❌'} ${name}${details ? ': ' + details : ''}`);
    }

    try {
        console.log('=== Starting Production E2E Test V2 ===\n');

        // STEP 1: Test Affiliate Apply Flow (Guest)
        console.log('STEP 1: Affiliate Apply Flow (Guest)');
        await page.goto(`${FRONTEND_URL}/affiliate`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_affiliate_page_loaded.png'), fullPage: true });
        recordStep('Navigate to /affiliate', 'PASS');

        // Fill affiliate form
        try {
            await page.waitForSelector('input[name="name"], input[placeholder*="name" i]', { timeout: 5000 });
            await page.fill('input[name="name"], input[placeholder*="name" i]', 'E2E Automated Test');
            await page.fill('input[name="email"], input[type="email"]', `e2e_${Date.now()}@test.com`);

            // Handle select dropdowns
            await page.selectOption('select[name="country"], select:has(option:text("United States"))', { label: 'United States' }).catch(() =>
                page.selectOption('select[name="country"], select:has(option:text("United States"))', 'US')
            );

            await page.selectOption('select[name="primaryPlatform"], select:has(option:text("YouTube"))', { label: 'YouTube' }).catch(() =>
                page.selectOption('select[name="primaryPlatform"]', 'YouTube')
            );

            await page.selectOption('select[name="audienceSize"]', { label: '10k-50k' }).catch(() =>
                page.selectOption('select[name="audienceSize"]', '10k-50k')
            );

            await page.selectOption('select[name="payoutPreference"]', { label: 'PayPal' }).catch(() =>
                page.selectOption('select[name="payoutPreference"]', 'paypal')
            );

            await page.fill('input[name="payoutDetails"]', 'test@paypal.com');

            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_affiliate_form_filled.png'), fullPage: true });
            recordStep('Fill affiliate form', 'PASS');
        } catch (error) {
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_affiliate_form_ERROR.png'), fullPage: true });
            recordStep('Fill affiliate form', 'FAIL', error.message);
        }

        // Submit form
        try {
            await page.click('button[type="submit"]');
            await page.waitForURL('**/affiliate/joined', { timeout: 10000 });
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_affiliate_joined_success.png'), fullPage: true });
            recordStep('Submit affiliate form and redirect to /joined', 'PASS');
        } catch (error) {
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_affiliate_submit_ERROR.png'), fullPage: true });
            recordStep('Submit affiliate form and redirect to /joined', 'FAIL', error.message);
        }

        // STEP 2: Login
        console.log('\nSTEP 2: User Login');
        try {
            await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_login_page.png'), fullPage: true });

            await page.fill('input[type="email"]', TEST_EMAIL);
            await page.fill('input[type="password"]', TEST_PASSWORD);
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_login_credentials_filled.png'), fullPage: true });

            await page.click('button[type="submit"]');
            await page.waitForTimeout(3000); // Wait for auth
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_login_complete.png'), fullPage: true });
            recordStep('Login with test credentials', 'PASS');
        } catch (error) {
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_login_ERROR.png'), fullPage: true });
            recordStep('Login with test credentials', 'FAIL', error.message);
        }

        // STEP 3: Referral Code Flow
        console.log('\nSTEP 3: Referral Code Flow');
        try {
            await page.goto(`${FRONTEND_URL}/referral`, { waitUntil: 'networkidle', timeout: 30000 });
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_referral_page_loaded.png'), fullPage: true });
            recordStep('Navigate to /referral', 'PASS');
        } catch (error) {
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_referral_page_ERROR.png'), fullPage: true });
            recordStep('Navigate to /referral', 'FAIL', error.message);
        }

        // Check for referral code
        try {
            const codeSelector = '[data-testid="referral-code"], .referral-code, code, [class*="code"]';
            await page.waitForSelector(codeSelector, { timeout: 5000 });
            const codeElement = await page.locator(codeSelector).first();
            const referralCode = await codeElement.textContent();
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_referral_code_visible.png'), fullPage: true });
            recordStep('Referral code is visible', 'PASS', `Code: ${referralCode}`);
        } catch (error) {
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_referral_code_ERROR.png'), fullPage: true });
            recordStep('Referral code is visible', 'FAIL', error.message);
        }

        // Test copy button
        try {
            const copyButton = page.locator('button:has-text("Copy"), button:has-text("copy")').first();
            await copyButton.click();
            await page.waitForTimeout(1500);
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_referral_copy_clicked.png'), fullPage: true });
            recordStep('Click copy button', 'PASS');
        } catch (error) {
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_referral_copy_ERROR.png'), fullPage: true });
            recordStep('Click copy button', 'FAIL', error.message);
        }

        console.log('\n=== Test Complete ===');

    } catch (error) {
        console.error('❌ Fatal Error:', error.message);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'FATAL_ERROR.png'), fullPage: true });
        recordStep('E2E Test Execution', 'FAIL', error.message);
    } finally {
        // Save logs
        fs.writeFileSync(
            path.join(PROOF_DIR, 'console.log'),
            consoleLogs.join('\n')
        );

        if (networkErrors.length > 0) {
            fs.writeFileSync(
                path.join(PROOF_DIR, 'network_errors.log'),
                networkErrors.join('\n')
            );
        }

        // Generate README
        const readme = `# Production E2E Test Results V2
**Date:** ${results.timestamp}
**Frontend:** ${FRONTEND_URL}
**Backend:** ${BACKEND_URL}

## Test Summary
- **Passed:** ${results.passed}
- **Failed:** ${results.failed}
- **Total Steps:** ${results.steps.length}

## Commands Used
\`\`\`bash
npx playwright install
node test_e2e_playwright.js
\`\`\`

## Test Steps

${results.steps.map((step, i) => `### ${i + 1}. ${step.name}
- **Status:** ${step.status}
${step.details ? `- **Details:** ${step.details}` : ''}
- **Time:** ${step.timestamp}
`).join('\n')}

## Artifacts
- **Screenshots:** \`screenshots/\` (${fs.readdirSync(SCREENSHOTS_DIR).length} files)
- **Video:** \`video/\` (Playwright recording)
- **Console Logs:** \`console.log\`
${networkErrors.length > 0 ? '- **Network Errors:** `network_errors.log`' : ''}

## Issues Found
${results.failed > 0 ? results.steps.filter(s => s.status === 'FAIL').map(s => `- **${s.name}:** ${s.details}`).join('\n') : 'None - all tests passed! ✅'}
`;

        fs.writeFileSync(path.join(PROOF_DIR, 'README.md'), readme);

        await context.close();
        await browser.close();

        console.log(`\n📁 Proof artifacts saved to: ${PROOF_DIR}`);
        console.log(`📊 Results: ${results.passed} passed, ${results.failed} failed`);

        process.exit(results.failed > 0 ? 1 : 0);
    }
}

runE2ETest();
