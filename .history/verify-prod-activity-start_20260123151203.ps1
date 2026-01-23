# verify-prod-activity-start.ps1
$baseUrl = "https://jobspeak-backend-production.up.railway.app"
$guestKey = "PROOF-GUEST-123"

Write-Host "`n--- STEP 1: POST ACTIVITY START (PROD) ---"
$body = @{
    activityType = "practice"
    context      = @{ source = "prove" }
} | ConvertTo-Json -Depth 5

$startResponse = Invoke-WebRequest -Uri "$baseUrl/api/activity/start" -Method Post -Body $body -ContentType "application/json" -Headers @{ "x-guest-key" = $guestKey; "Origin" = "https://jobspeakpro.com" }
Write-Host "Status: $($startResponse.StatusCode)"
Write-Host "Headers:" 
$startResponse.Headers | Out-String | Write-Host
Write-Host "Body:"
$startResponse.Content

Write-Host "`n--- STEP 2: GET EVENTS (PROD) ---"
$eventsResponse = Invoke-WebRequest -Uri "$baseUrl/api/activity/events?limit=5" -Method Get -Headers @{ "x-guest-key" = $guestKey; "Origin" = "https://jobspeakpro.com" }
Write-Host "Status: $($eventsResponse.StatusCode)"
Write-Host "Body (Snippet):"
$eventsJson = $eventsResponse.Content | ConvertFrom-Json
$eventsJson | ConvertTo-Json -Depth 5 | Select-Object -First 20
