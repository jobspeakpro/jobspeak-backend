# Activity Tracking Backend - Verification Tests
# Replace YOUR_RAILWAY_URL with your actual Railway deployment URL

$RAILWAY_URL = "https://jobspeak-backend-production.up.railway.app"

Write-Host "`n=== Activity Tracking Backend Verification ===" -ForegroundColor Cyan
Write-Host "Railway URL: $RAILWAY_URL`n" -ForegroundColor Yellow

# Test 1: Health Check
Write-Host "[1/5] Testing Health Endpoint..." -ForegroundColor Green
$healthResponse = Invoke-RestMethod -Uri "$RAILWAY_URL/health" -Method Get
Write-Host "✅ Health Check Response:" -ForegroundColor Green
$healthResponse | ConvertTo-Json -Depth 3
Write-Host ""

# Test 2: Practice Start (Guest)
Write-Host "[2/5] Testing Practice Start (Guest)..." -ForegroundColor Green
$practiceBody = @{
    activityType = "practice"
    context      = @{
        tabId     = "test-tab-1"
        sessionId = "test-session-practice-$(Get-Date -Format 'yyyyMMddHHmmss')"
    }
} | ConvertTo-Json

$practiceResponse = Invoke-RestMethod -Uri "$RAILWAY_URL/api/activity/start" `
    -Method Post `
    -Headers @{
    "Content-Type" = "application/json"
    "x-guest-key"  = "guest-proof-123"
} `
    -Body $practiceBody

Write-Host "✅ Practice Start Response:" -ForegroundColor Green
$practiceResponse | ConvertTo-Json -Depth 3
Write-Host ""

# Test 3: Mock Interview Start (Guest)
Write-Host "[3/5] Testing Mock Interview Start (Guest)..." -ForegroundColor Green
$mockBody = @{
    activityType = "mock_interview"
    context      = @{
        tabId     = "test-tab-2"
        type      = "short"
        sessionId = "test-session-mock-$(Get-Date -Format 'yyyyMMddHHmmss')"
    }
} | ConvertTo-Json

$mockResponse = Invoke-RestMethod -Uri "$RAILWAY_URL/api/activity/start" `
    -Method Post `
    -Headers @{
    "Content-Type" = "application/json"
    "x-guest-key"  = "guest-proof-123"
} `
    -Body $mockBody

Write-Host "✅ Mock Interview Start Response:" -ForegroundColor Green
$mockResponse | ConvertTo-Json -Depth 3
Write-Host ""

# Test 4: Retrieve Events (Guest)
Write-Host "[4/5] Testing Retrieve Events (Guest)..." -ForegroundColor Green
$eventsResponse = Invoke-RestMethod -Uri "$RAILWAY_URL/api/activity/events?limit=10" `
    -Method Get `
    -Headers @{
    "x-guest-key" = "guest-proof-123"
}

Write-Host "✅ Events Response:" -ForegroundColor Green
$eventsResponse | ConvertTo-Json -Depth 5
Write-Host ""

# Test 5: Dedupe Test (should return dedupe: true)
Write-Host "[5/5] Testing Dedupe Protection..." -ForegroundColor Green
$dedupeResponse = Invoke-RestMethod -Uri "$RAILWAY_URL/api/activity/start" `
    -Method Post `
    -Headers @{
    "Content-Type" = "application/json"
    "x-guest-key"  = "guest-proof-123"
} `
    -Body $practiceBody

Write-Host "✅ Dedupe Test Response (should show dedupe: true):" -ForegroundColor Green
$dedupeResponse | ConvertTo-Json -Depth 3
Write-Host ""

Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Verify Supabase activity_events table has rows" -ForegroundColor White
Write-Host "2. Take screenshots of all responses" -ForegroundColor White
Write-Host "3. Check Railway logs for any errors" -ForegroundColor White
