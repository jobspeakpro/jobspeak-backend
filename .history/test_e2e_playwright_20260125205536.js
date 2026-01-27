import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const FRONTEND_URL = 'https://jobspeakpro.com';
const PROOF_DIR = 'docs/proofs/2026-01-24_fix_v4/screenshots';

// Ensure proof directory exists
if (!fs.existsSync(PROOF_DIR)) {
    fs.mkdirSync(PROOF_DIR, { recursive: true });
}

async function runE2ETest() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    // Capture console logs
    const consoleLogs = [];
    page.on('console', msg => {
        consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    try {
        console.log('Starting E2E Test...');

        // Test 1: Affiliate Apply Flow
        console.log('\n1. Testing Affiliate Apply Flow...');
        await page.goto(`${FRONTEND_URL}/affiliate`, { waitUntil: 'networkidle' });
        await page.screenshot({ path: path.join(PROOF_DIR, '01_affiliate_page.png'), fullPage: true });

        // Fill out affiliate form
        await page.fill('input[name="name"]', 'E2E Test User');
        await page.fill('input[name="email"]', `e2e_test_${Date.now()}@gmail.com`);
        await page.selectOption('select[name="country"]', 'US');
        await page.selectOption('select[name="primaryPlatform"]', 'YouTube');
        await page.selectOption('select[name="audienceSize"]', '10k-50k');
        await page.selectOption('select[name="payoutPreference"]', 'paypal');
        await page.fill('input[name="payoutDetails"]', 'test@paypal.com');

        await page.screenshot({ path: path.join(PROOF_DIR, '02_affiliate_form_filled.png'), fullPage: true });

        // Submit form
        await page.click('button[type="submit"]');
        await page.waitForURL('**/affiliate/joined', { timeout: 10000 });
        await page.screenshot({ path: path.join(PROOF_DIR, '03_affiliate_joined_success.png'), fullPage: true });

        console.log('✅ Affiliate Apply Flow: SUCCESS');

        // Test 2: Referral Code Flow
        console.log('\n2. Testing Referral Code Flow...');

        // Sign up a test user first
        await page.goto(`${FRONTEND_URL}/signup`, { waitUntil: 'networkidle' });
        const testEmail = `e2e_referral_${Date.now()}@gmail.com`;
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', 'TestPassword123!');
        await page.click('button[type="submit"]');

        // Wait for auth and navigate to referral page
        await page.waitForTimeout(2000);
        await page.goto(`${FRONTEND_URL}/referral`, { waitUntil: 'networkidle' });
        await page.screenshot({ path: path.join(PROOF_DIR, '04_referral_page.png'), fullPage: true });

        // Check for referral code display
        const codeElement = await page.locator('[data-testid="referral-code"], .referral-code, code').first();
        await codeElement.waitFor({ timeout: 5000 });
        const referralCode = await codeElement.textContent();
        console.log(`Referral Code: ${referralCode}`);

        // Test copy functionality
        await page.click('button:has-text("Copy")');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(PROOF_DIR, '05_referral_copy_toast.png'), fullPage: true });

        console.log('✅ Referral Code Flow: SUCCESS');

        // Save console logs
        fs.writeFileSync(
            path.join(PROOF_DIR, 'console_logs.txt'),
            consoleLogs.join('\n')
        );

        console.log('\n✅ All E2E Tests Passed');
        console.log(`Screenshots saved to: ${PROOF_DIR}`);

    } catch (error) {
        console.error('❌ E2E Test Failed:', error.message);
        await page.screenshot({ path: path.join(PROOF_DIR, 'error_screenshot.png'), fullPage: true });
        throw error;
    } finally {
        await browser.close();
    }
}

runE2ETest();
