# Verify production health and CORS
Write-Host "=== Testing Production Backend ===" -ForegroundColor Cyan

# Test 1: Health check
Write-Host "`n1. Testing /health endpoint..." -ForegroundColor Yellow
$health = curl.exe -i https://jobspeak-backend-production.up.railway.app/health 2>&1
$health | Out-File -FilePath "docs/proofs/2026-01-25_prod_e2e_affiliate_referral_v2/curl_health.txt" -Encoding UTF8
Write-Host $health

# Test 2: OPTIONS preflight for billing/status
Write-Host "`n2. Testing OPTIONS /api/billing/status..." -ForegroundColor Yellow
$options = curl.exe -i -X OPTIONS https://jobspeak-backend-production.up.railway.app/api/billing/status -H "Origin: https://jobspeakpro.com" -H "Access-Control-Request-Method: GET" 2>&1
$options | Out-File -FilePath "docs/proofs/2026-01-25_prod_e2e_affiliate_referral_v2/curl_options_billing.txt" -Encoding UTF8
Write-Host $options

# Test 3: GET billing/status
Write-Host "`n3. Testing GET /api/billing/status..." -ForegroundColor Yellow
$get = curl.exe -i https://jobspeak-backend-production.up.railway.app/api/billing/status 2>&1
$get | Out-File -FilePath "docs/proofs/2026-01-25_prod_e2e_affiliate_referral_v2/curl_get_billing.txt" -Encoding UTF8
Write-Host $get

Write-Host "`n=== Tests Complete ===" -ForegroundColor Green
Write-Host "Outputs saved to docs/proofs/2026-01-25_prod_e2e_affiliate_referral_v2/" -ForegroundColor Green
