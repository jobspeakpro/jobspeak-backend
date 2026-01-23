# Test if ACTIVITY_TRACKING_ENABLED is set on Railway
# This will help us understand why /api/progress isn't showing activity events

$RAILWAY_URL = "https://jobspeak-backend-production.up.railway.app"
$GUEST_KEY = "guest-env-test-$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "`n=== TESTING ACTIVITY TRACKING ENVIRONMENT ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Trigger an activity event
Write-Host "[1/3] Triggering activity event..." -ForegroundColor Green
$body = @{
    activityType = "practice"
    context      = @{
        tabId     = "env-test-tab"
        sessionId = "env-test-session-$(Get-Date -Format 'yyyyMMddHHmmss')"
    }
} | ConvertTo-Json

$startResponse = Invoke-RestMethod -Uri "$RAILWAY_URL/api/activity/start" `
    -Method Post `
    -Headers @{
    "Content-Type" = "application/json"
    "x-guest-key"  = $GUEST_KEY
} `
    -Body $body

Write-Host "Start Response:" -ForegroundColor Yellow
$startResponse | ConvertTo-Json -Depth 3

# Check if disabled flag is present
if ($startResponse.disabled -eq $true) {
    Write-Host "`nWARNING: Activity tracking is DISABLED on Railway!" -ForegroundColor Red
    Write-Host "ACTIVITY_TRACKING_ENABLED is set to 'false'" -ForegroundColor Red
}
elseif ($startResponse.stored -eq $true) {
    Write-Host "`nSUCCESS: Activity tracking is ENABLED" -ForegroundColor Green
}
else {
    Write-Host "`nUNKNOWN: Check response above" -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Check if events are returned
Write-Host "[2/3] Checking /api/activity/events..." -ForegroundColor Green
$eventsResponse = Invoke-RestMethod -Uri "$RAILWAY_URL/api/activity/events?limit=10" `
    -Method Get `
    -Headers @{ "x-guest-key" = $GUEST_KEY }

Write-Host "Events Response:" -ForegroundColor Yellow
$eventsResponse | ConvertTo-Json -Depth 3

if ($eventsResponse.disabled -eq $true) {
    Write-Host "`nWARNING: Activity tracking is DISABLED!" -ForegroundColor Red
}
elseif ($eventsResponse.total -gt 0) {
    Write-Host "`nSUCCESS: Events endpoint is working ($($eventsResponse.total) events)" -ForegroundColor Green
}
else {
    Write-Host "`nINFO: No events found (this is OK for new guest)" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Check /api/progress
Write-Host "[3/3] Checking /api/progress..." -ForegroundColor Green
$progressResponse = Invoke-RestMethod -Uri "$RAILWAY_URL/api/progress?userKey=$GUEST_KEY" `
    -Method Get

Write-Host "Progress Response:" -ForegroundColor Yellow
$progressResponse | ConvertTo-Json -Depth 5

# Count activity events in progress
$activityEvents = $progressResponse.sessions | Where-Object { $_.activityEvent -eq $true }
$activityEventCount = ($activityEvents | Measure-Object).Count

Write-Host "`nProgress Analysis:" -ForegroundColor Cyan
Write-Host "  Total sessions: $($progressResponse.total)" -ForegroundColor White
Write-Host "  Activity events: $activityEventCount" -ForegroundColor White

if ($activityEventCount -gt 0) {
    Write-Host "`nSUCCESS: Progress endpoint includes activity events!" -ForegroundColor Green
}
else {
    Write-Host "`nINFO: Progress endpoint has no activity events" -ForegroundColor Yellow
    Write-Host "This could mean:" -ForegroundColor Yellow
    Write-Host "  1. ACTIVITY_TRACKING_ENABLED is set to 'false' on Railway" -ForegroundColor White
    Write-Host "  2. Progress only shows completed sessions, not activity starts" -ForegroundColor White
    Write-Host "  3. Activity events are tracked separately" -ForegroundColor White
}
Write-Host ""

# Final Summary
Write-Host "=== ENVIRONMENT CHECK COMPLETE ===" -ForegroundColor Cyan
Write-Host ""
