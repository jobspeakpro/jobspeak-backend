# verify-production.ps1
$BaseUrl = "https://jobspeak-backend-production.up.railway.app"
$GuestKey = "guest-prod-verify-" + (Get-Random)

Write-Host "Target: $BaseUrl" -ForegroundColor Cyan
Write-Host "Guest Key: $GuestKey" -ForegroundColor Cyan

# 1. Check Health
Write-Host "`n--- 1. CHECK HEALTH ---" -ForegroundColor Yellow
try {
    $HealthResponse = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
    Write-Host "Health Response: $($HealthResponse | ConvertTo-Json -Depth 2)" -ForegroundColor Green
}
catch {
    Write-Host "Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Seed Data (Ensure 1 event exists so we can verify querying)
Write-Host "`n--- 2. SEED ACTIVITY (POST /api/activity/start) ---" -ForegroundColor Yellow
try {
    $Body = @{ activityType = "practice"; context = @{ source = "verification-script" } } | ConvertTo-Json
    $Seed = Invoke-RestMethod -Uri "$BaseUrl/api/activity/start" -Method Post -Body $Body -ContentType "application/json" -Headers @{ "x-guest-key" = $GuestKey }
    Write-Host "Seed Result: $($Seed | ConvertTo-Json -Depth 2)" -ForegroundColor Green
}
catch {
    Write-Host "Seeding Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# 3. Check Progress (Headers + Debug + Data)
Write-Host "`n--- 3. CHECK PROGRESS (GET /api/progress) ---" -ForegroundColor Yellow
try {
    $Progress = Invoke-Webrequest -Uri "$BaseUrl/api/progress?userKey=$GuestKey" -Method Get -Headers @{ "x-guest-key" = $GuestKey }
    
    # Headers
    $CommitHeader = $Progress.Headers["x-jsp-backend-commit"]
    Write-Host "Header [x-jsp-backend-commit]: $CommitHeader" -ForegroundColor ($CommitHeader ? "Green" : "Red")

    # Body
    $Json = $Progress.Content | ConvertFrom-Json
    Write-Host "Debug Field: $($Json.debug | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
    
    $EventCount = $Json.activityEvents.Length
    Write-Host "Activity Events Returned: $EventCount" -ForegroundColor ($EventCount -ge 1 ? "Green" : "Red")
    
    if ($Json.activityEvents.Length -gt 0) {
        Write-Host "First Event: $($Json.activityEvents[0] | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "Progress Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Check Raw Activity Events
Write-Host "`n--- 4. CHECK ACTIVITY EVENTS (GET /api/activity/events) ---" -ForegroundColor Yellow
try {
    $Events = Invoke-RestMethod -Uri "$BaseUrl/api/activity/events" -Method Get -Headers @{ "x-guest-key" = $GuestKey }
    Write-Host "Total Raw Events: $($Events.total)"
    Write-Host "Events List: $($Events.events.Length)" -ForegroundColor ($Events.events.Length -ge 1 ? "Green" : "Red")
}
catch {
    Write-Host "Activity Events Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}
