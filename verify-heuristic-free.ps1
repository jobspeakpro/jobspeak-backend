# verify-heuristic-free.ps1
$baseUrl = "https://jobspeak-backend-production.up.railway.app"
$guestKey = "50158919-0025-4b72-9a26-56df4ddcf86d"

Write-Host "--- TEST 1: POST ACTIVITY START (UUID-as-Guest) ---"
$body = @{ 
    activityType = "practice"
    context      = @{ tabId = "UUID-GUEST-TEST-$(Get-Date -Format 'HHmmss')" } 
} | ConvertTo-Json
$res = Invoke-WebRequest -Uri "$baseUrl/api/activity/start" -Method Post -Body $body -ContentType "application/json" -Headers @{ "x-guest-key" = $guestKey; "Origin" = "https://jobspeakpro.com" }
Write-Host "Status: $($res.StatusCode)"
Write-Host "x-identity-used: $($res.Headers['x-identity-used'])"
Write-Host "x-identity-mode: $($res.Headers['x-identity-mode'])"
$res.Content

Write-Host "`n--- TEST 2: GET DASHBOARD SUMMARY ---"
$dash = Invoke-WebRequest -Uri "$baseUrl/api/dashboard/summary?userKey=$guestKey" -Method Get -Headers @{ "x-guest-key" = $guestKey; "Origin" = "https://jobspeakpro.com" }
Write-Host "Status: $($dash.StatusCode)"
Write-Host "x-identity-used: $($dash.Headers['x-identity-used'])"
Write-Host "x-identity-mode: $($dash.Headers['x-identity-mode'])"
$dashJson = $dash.Content | ConvertFrom-Json
Write-Host "Activity Combined: $($dashJson.debug.activityCountCombined)"

Write-Host "`n--- TEST 3: GET PROGRESS ---"
$prog = Invoke-WebRequest -Uri "$baseUrl/api/progress?userKey=$guestKey" -Method Get -Headers @{ "x-guest-key" = $guestKey; "Origin" = "https://jobspeakpro.com" }
Write-Host "Status: $($prog.StatusCode)"
Write-Host "x-identity-used: $($prog.Headers['x-identity-used'])"
Write-Host "x-identity-mode: $($prog.Headers['x-identity-mode'])"
$progJson = $prog.Content | ConvertFrom-Json
Write-Host "Sessions Count: $($progJson.sessions.Count)"
