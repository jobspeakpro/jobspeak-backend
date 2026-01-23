# Task: Identity Reconciliation
# 1. Create a script to simulate identity flow
# 2. Trigger activity start
# 3. Verify storage and retrieval identity match

$RAILWAY_URL = "https://jobspeak-backend-production.up.railway.app"
$TEST_ID = "identity-check-$(Get-Date -Format 'yyyyMMddHHmmss')"
$GUEST_KEY = "guest-$TEST_ID"

Write-Host "`n=== IDENTITY RECONCILIATION TEST ===" -ForegroundColor Cyan
Write-Host "Test Identity Key: $GUEST_KEY" -ForegroundColor Yellow

# Step 1: Trigger Activity Start
Write-Host "`n[1/3] Triggering Activity Start..." -ForegroundColor Green
$body = @{
    activityType = "practice"
    context      = @{
        tabId     = "id-check-tab"
        sessionId = "id-check-session-$TEST_ID"
    }
} | ConvertTo-Json

$startResp = Invoke-RestMethod -Uri "$RAILWAY_URL/api/activity/start" `
    -Method Post `
    -Headers @{ "Content-Type" = "application/json"; "x-guest-key" = $GUEST_KEY } `
    -Body $body

Write-Host "Start Response: $($startResp | ConvertTo-Json -Depth 2)" -ForegroundColor White

if ($startResp.stored -eq $true) {
    Write-Host "Activity stored successfully." -ForegroundColor Green
}
else {
    Write-Host "Activity NOT stored." -ForegroundColor Red
    exit
}

# Step 2: Check Storage Identity (via Events Endpoint)
Write-Host "`n[2/3] Verifying Storage Identity..." -ForegroundColor Green
$eventsResp = Invoke-RestMethod -Uri "$RAILWAY_URL/api/activity/events?limit=1" `
    -Method Get `
    -Headers @{ "x-guest-key" = $GUEST_KEY }

$storedEvent = $eventsResp.events[0]
if ($storedEvent) {
    Write-Host "Activity stored under X: $($storedEvent.identity_key)" -ForegroundColor Cyan
    if ($storedEvent.identity_key -eq $GUEST_KEY) {
        Write-Host "MATCH: Stored identity matches input key." -ForegroundColor Green
    }
    else {
        Write-Host "MISMATCH: Stored identity ($($storedEvent.identity_key)) != input key ($GUEST_KEY)" -ForegroundColor Red
    }
}
else {
    Write-Host "No events found for this key!" -ForegroundColor Red
}

# Step 3: Check Dashboard Query Identity
Write-Host "`n[3/3] Verifying Dashboard Query Identity..." -ForegroundColor Green
$dashboardResp = Invoke-RestMethod -Uri "$RAILWAY_URL/api/dashboard/summary?userKey=$GUEST_KEY" `
    -Method Get

$recentActivity = $dashboardResp.recentActivity
if ($recentActivity -and $recentActivity.Count -gt 0) {
    # We can't see the identity used *internally* by the query directly in the response,
    # but if valid data is returned, it means the query used the correct identity.
    # The prompt asks to "Log the identity used in...". 
    # Since I can't see server logs, I have to infer.
    # BUT, if the dashboard returns the event we just created, then the query identity MUST match the stored identity.
    
    # Check if our specific event is in recentActivity
    $found = $false
    foreach ($activity in $recentActivity) {
        # Check context sessionId if available to be sure
        if ($activity.context.sessionId -eq "id-check-session-$TEST_ID") {
            $found = $true
            break
        }
    }
    
    if ($found) {
        Write-Host "Dashboard querying under Y: MATCHES X (Found created event)" -ForegroundColor Cyan
        Write-Host "Dashboard query successful." -ForegroundColor Green
    }
    else {
        Write-Host "Dashboard querying under Y: MISMATCH (Event not found)" -ForegroundColor Red
        Write-Host "Recent Activity returned: $($recentActivity | ConvertTo-Json -Depth 3)" -ForegroundColor Yellow
    }

}
else {
    Write-Host "Dashboard returned no recent activity (MISMATCH or empty)." -ForegroundColor Red
}

# Step 4: Check Progress Query Identity
Write-Host "`n[4/3] Verifying Progress Query Identity..." -ForegroundColor Green
$progressResp = Invoke-RestMethod -Uri "$RAILWAY_URL/api/progress?userKey=$GUEST_KEY" `
    -Method Get

$activityEvents = $progressResp.activityEvents
if ($activityEvents -and $activityEvents.Count -gt 0) {
    $found = $false
    foreach ($activity in $activityEvents) {
        if ($activity.context.sessionId -eq "id-check-session-$TEST_ID") {
            $found = $true
            break
        }
    }
    
    if ($found) {
        Write-Host "Progress querying under Z: MATCHES X (Found created event)" -ForegroundColor Cyan
    }
    else {
        Write-Host "Progress querying under Z: MISMATCH (Event not found)" -ForegroundColor Red
    }
}
else {
    Write-Host "Progress returned no activity events." -ForegroundColor Red
}

Write-Host "`n=== TEST COMPLETE ===" -ForegroundColor Cyan
