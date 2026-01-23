# verify-identity-final.ps1
$baseUrl = "https://jobspeak-backend-production.up.railway.app"
$guestKey = "50158919-0025-4b72-9a26-56df4ddcf86d"

# Helper for headers
function Show-IdentityHeaders($res) {
    Write-Host "x-identity-used: $($res.Headers['x-identity-used'])"
    Write-Host "x-identity-mode: $($res.Headers['x-identity-mode'])"
    Write-Host "x-jsp-backend-commit: $($res.Headers['x-jsp-backend-commit'])"
}

Write-Host "`n--- STEP 1: POST /activity/start (UUID Guest) ---"
$body = @{ activityType = "practice"; context = @{ realProof = "final-heuristic-free" } } | ConvertTo-Json
$res = Invoke-WebRequest -Uri "$baseUrl/api/activity/start" -Method Post -Body $body -ContentType "application/json" -Headers @{ "x-guest-key" = $guestKey; "Origin" = "https://jobspeakpro.com" }
Show-IdentityHeaders $res
$res.Content

Write-Host "`n--- STEP 2: GET /dashboard/summary ---"
$dash = Invoke-WebRequest -Uri "$baseUrl/api/dashboard/summary?userKey=$guestKey" -Method Get -Headers @{ "x-guest-key" = $guestKey; "Origin" = "https://jobspeakpro.com" }
Show-IdentityHeaders $dash
$dash.Content

Write-Host "`n--- STEP 3: GET /progress ---"
$prog = Invoke-WebRequest -Uri "$baseUrl/api/progress?userKey=$guestKey" -Method Get -Headers @{ "x-guest-key" = $guestKey; "Origin" = "https://jobspeakpro.com" }
Show-IdentityHeaders $prog
$prog.Content
