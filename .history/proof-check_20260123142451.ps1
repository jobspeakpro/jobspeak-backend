# proof-check.ps1
$baseUrl = "http://localhost:3000"
$guestKey = "guest-local-proof"

Write-Host "`n--- STEP 1: VERIFY CORS HEADERS ---"
# Check if x-jsp-backend-commit is exposed
$response = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method Get -Headers @{ "Origin" = "https://jobspeakpro.com" } -ErrorAction Stop
Write-Host "Allowed Headers: $($response.Headers['Access-Control-Allow-Headers'])"
Write-Host "Exposed Headers: $($response.Headers['Access-Control-Expose-Headers'])"
Write-Host "Commit Header: $($response.Headers['x-jsp-backend-commit'])"

Write-Host "`n--- STEP 2: DEBUG SEED (Force Insert) ---"
# Call debug seed logic
$seedBody = @{
    userKey = $guestKey
} | ConvertTo-Json

try {
    $seedResponse = Invoke-WebRequest -Uri "$baseUrl/api/activity/debug-seed" -Method Post -Body $seedBody -ContentType "application/json" -Headers @{ "x-guest-key" = $guestKey }
    Write-Host "Seed Response Code: $($seedResponse.StatusCode)"
    Write-Host "Seed Body:"
    $seedResponse.Content
}
catch {
    Write-Host "Seed Failed: $_"
    $_.Exception.Response.Content
}

Write-Host "`n--- STEP 3: CHECK DASHBOARD SUMMARY (DEBUG INFO) ---"
$dashResponse = Invoke-WebRequest -Uri "$baseUrl/api/dashboard/summary?userKey=$guestKey" -Method Get -Headers @{ "x-guest-key" = $guestKey }
$dashJson = $dashResponse.Content | ConvertFrom-Json
Write-Host "Commit (Body): $($dashJson.debug.commit)"
Write-Host "Identity Resolved: $($dashJson.debug.identityKeyResolved)"
Write-Host "Guest Key Filter: $($dashJson.debug.guestKeyFromHeader)"
Write-Host "User ID (Debug): $($dashJson.debug.userId)"
Write-Host "Activity Count Combined: $($dashJson.debug.activityCountCombined)"
Write-Host "Recent Activity Count: $($dashJson.recentActivity.Count)"
if ($dashJson.recentActivity.Count -gt 0) {
    Write-Host "First Activity Type: $($dashJson.recentActivity[0].activityType)"
}

Write-Host "`n--- STEP 4: CHECK PROGRESS (DEBUG INFO) ---"
$progResponse = Invoke-WebRequest -Uri "$baseUrl/api/progress?userKey=$guestKey" -Method Get -Headers @{ "x-guest-key" = $guestKey }
$progJson = $progResponse.Content | ConvertFrom-Json
Write-Host "Commit (Body): $($progJson.debug.commit)"
Write-Host "Activity Count Combined: $($progJson.debug.activityCountCombined)"
