# verify-clean.ps1
$baseUrl = "https://jobspeak-backend-production.up.railway.app"
$guestKey = "PROOF-GUEST-123"

Write-Host "--- POST START ---"
$body = @{ activityType = "practice"; context = @{ tabId = "final-proof-$(Get-Date -Format 'HHmmss')" } } | ConvertTo-Json
$res = Invoke-WebRequest -Uri "$baseUrl/api/activity/start" -Method Post -Body $body -ContentType "application/json" -Headers @{ "x-guest-key" = $guestKey; "Origin" = "https://jobspeakpro.com" }
$res.Content
$res.Headers['x-jsp-backend-commit']

Write-Host "`n--- GET EVENTS ---"
$evt = Invoke-WebRequest -Uri "$baseUrl/api/activity/events?limit=3" -Method Get -Headers @{ "x-guest-key" = $guestKey; "Origin" = "https://jobspeakpro.com" }
$evt.Content
