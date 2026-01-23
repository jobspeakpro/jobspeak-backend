# verify-prod-final.ps1
$baseUrl = "https://jobspeak-backend-production.up.railway.app"
$guestKey = "guest-prod-check-final"

Write-Host "`n--- STEP 1: CHECK HEALTH & COMMIT ---"
try {
    $healthResponse = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method Get -Headers @{ "Origin" = "https://jobspeakpro.com" }
    $healthJson = $healthResponse.Content | ConvertFrom-Json
    Write-Host "Health OK: $($healthJson.ok)"
    Write-Host "Commit: $($healthJson.commit)"
    Write-Host "Exposed Headers: $($healthResponse.Headers['Access-Control-Expose-Headers'])"
    Write-Host "Commit Header: $($healthResponse.Headers['x-jsp-backend-commit'])"
}
catch {
    Write-Host "Health Check Failed: $_"
    exit 1
}

Write-Host "`n--- STEP 2: DEBUG SEED (PROD) ---"
$seedBody = @{} | ConvertTo-Json
try {
    $seedResponse = Invoke-WebRequest -Uri "$baseUrl/api/activity/debug-seed" -Method Post -Body $seedBody -ContentType "application/json" -Headers @{ "x-guest-key" = $guestKey; "Origin" = "https://jobspeakpro.com" }
    Write-Host "Seed Status: $($seedResponse.StatusCode)"
    
    # Check Headers
    $commitHeader = $seedResponse.Headers['x-jsp-backend-commit']
    Write-Host "Seed Commit Header: $commitHeader"

    # Check Body
    $seedJson = $seedResponse.Content | ConvertFrom-Json
    Write-Host "Seed OK: $($seedJson.ok)"
    Write-Host "Seed IdentityKey: $($seedJson.identityKey)"
    Write-Host "Seed InsertedCount: $($seedJson.insertedCount)"
    Write-Host "Seed TotalToday: $($seedJson.totalToday)"
}
catch {
    Write-Host "Seed Failed (Likely Env Var Not Set): $_"
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)"
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Body: $($reader.ReadToEnd())"
    }
}

Write-Host "`n--- STEP 3: CHECK DASHBOARD (PROD) ---"
try {
    $dashResponse = Invoke-WebRequest -Uri "$baseUrl/api/dashboard/summary?userKey=$guestKey" -Method Get -Headers @{ "x-guest-key" = $guestKey; "Origin" = "https://jobspeakpro.com" }
    $dashJson = $dashResponse.Content | ConvertFrom-Json
    Write-Host "Dash Activity Combined: $($dashJson.debug.activityCountCombined)"
    Write-Host "Dash Recent Count: $($dashJson.recentActivity.Count)"
}
catch {
    Write-Host "Dashboard Failed: $_"
}

Write-Host "`n--- STEP 4: CHECK PROGRESS (PROD) ---"
try {
    $progResponse = Invoke-WebRequest -Uri "$baseUrl/api/progress?userKey=$guestKey" -Method Get -Headers @{ "x-guest-key" = $guestKey; "Origin" = "https://jobspeakpro.com" }
    $progJson = $progResponse.Content | ConvertFrom-Json
    Write-Host "Progress Activity Combined: $($progJson.debug.activityCountCombined)"
}
catch {
    Write-Host "Progress Failed: $_"
}
