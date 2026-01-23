# Test Dashboard and Progress Endpoints with Activity Data
# Verifies that recentActivity and activityEvents are included in responses

$RAILWAY_URL = "https://jobspeak-backend-production.up.railway.app"
$GUEST_KEY = "guest-proof-123"  # Using existing guest with data

Write-Host "`n=== TESTING DASHBOARD + PROGRESS ACTIVITY DATA ===" -ForegroundColor Cyan
Write-Host "Railway URL: $RAILWAY_URL" -ForegroundColor Yellow
Write-Host "Guest Key: $GUEST_KEY`n" -ForegroundColor Yellow

# Test 1: Health Check (get commit hash)
Write-Host "[1/3] Health Check..." -ForegroundColor Green
$healthResp = Invoke-RestMethod -Uri "$RAILWAY_URL/health" -Method Get
Write-Host "Backend Version: $($healthResp.version)" -ForegroundColor Cyan
Write-Host "Commit: $($healthResp.commit)" -ForegroundColor Cyan
Write-Host ""

# Test 2: Dashboard Summary
Write-Host "[2/3] Testing /api/dashboard/summary..." -ForegroundColor Green
$dashboardResp = Invoke-RestMethod -Uri "$RAILWAY_URL/api/dashboard/summary?userKey=$GUEST_KEY" -Method Get

Write-Host "Dashboard Response:" -ForegroundColor Yellow
$dashboardResp | ConvertTo-Json -Depth 5
Write-Host ""

# Check for new fields
if ($dashboardResp.recentActivity) {
    Write-Host "SUCCESS: recentActivity field present ($($dashboardResp.recentActivity.Count) events)" -ForegroundColor Green
}
else {
    Write-Host "WARNING: recentActivity field missing" -ForegroundColor Yellow
}

if ($null -ne $dashboardResp.practiceStartsToday) {
    Write-Host "SUCCESS: practiceStartsToday = $($dashboardResp.practiceStartsToday)" -ForegroundColor Green
}
else {
    Write-Host "WARNING: practiceStartsToday field missing" -ForegroundColor Yellow
}

if ($null -ne $dashboardResp.mockInterviewStartsToday) {
    Write-Host "SUCCESS: mockInterviewStartsToday = $($dashboardResp.mockInterviewStartsToday)" -ForegroundColor Green
}
else {
    Write-Host "WARNING: mockInterviewStartsToday field missing" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Progress Endpoint
Write-Host "[3/3] Testing /api/progress..." -ForegroundColor Green
$progressResp = Invoke-RestMethod -Uri "$RAILWAY_URL/api/progress?userKey=$GUEST_KEY" -Method Get

Write-Host "Progress Response:" -ForegroundColor Yellow
$progressResp | ConvertTo-Json -Depth 5
Write-Host ""

# Check for new fields
if ($progressResp.activityEvents) {
    Write-Host "SUCCESS: activityEvents field present ($($progressResp.activityEvents.Count) events)" -ForegroundColor Green
}
else {
    Write-Host "WARNING: activityEvents field missing" -ForegroundColor Yellow
}

# Check backward compatibility
if ($progressResp.sessions) {
    Write-Host "SUCCESS: sessions field still present ($($progressResp.sessions.Count) sessions)" -ForegroundColor Green
}
else {
    Write-Host "ERROR: sessions field missing (backward compatibility broken!)" -ForegroundColor Red
}
Write-Host ""

# Final Summary
Write-Host "=== VERIFICATION SUMMARY ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Dashboard Endpoint:" -ForegroundColor Yellow
Write-Host "  - recentActivity: $($dashboardResp.recentActivity.Count) events" -ForegroundColor White
Write-Host "  - practiceStartsToday: $($dashboardResp.practiceStartsToday)" -ForegroundColor White
Write-Host "  - mockInterviewStartsToday: $($dashboardResp.mockInterviewStartsToday)" -ForegroundColor White
Write-Host ""
Write-Host "Progress Endpoint:" -ForegroundColor Yellow
Write-Host "  - sessions: $($progressResp.sessions.Count)" -ForegroundColor White
Write-Host "  - activityEvents: $($progressResp.activityEvents.Count)" -ForegroundColor White
Write-Host ""

if ($dashboardResp.recentActivity -and $progressResp.activityEvents) {
    Write-Host "SUCCESS: All activity data fields present!" -ForegroundColor Green
}
else {
    Write-Host "PARTIAL: Some fields may be missing" -ForegroundColor Yellow
}
Write-Host ""
