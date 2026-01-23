$URL = "https://jobspeak-backend-production.up.railway.app"
$ID = "check-$(Get-Date -Format 'HHmmss')"
$KEY = "guest-$ID"
Write-Host "Checking Identity: $KEY"
try {
    $S = Invoke-RestMethod -Uri "$URL/api/activity/start" -Method Post -Body (@{activityType = "practice"; context = @{sessionId = $ID } } | ConvertTo-Json) -Headers @{"Content-Type" = "application/json"; "x-guest-key" = $KEY }
    Write-Host "Activity Stored: $($S.stored)"
  
    $E = Invoke-RestMethod -Uri "$URL/api/activity/events?limit=1" -Method Get -Headers @{"x-guest-key" = $KEY }
    $StoredID = $E.events[0].identity_key
    Write-Host "Activity stored under: $StoredID"
  
    $D = Invoke-RestMethod -Uri "$URL/api/dashboard/summary?userKey=$KEY" -Method Get
    $D_Match = ($D.recentActivity | Where-Object { $_.context.sessionId -eq $ID }) -ne $null
    Write-Host "Dashboard query found event: $D_Match"
  
    if ($D_Match) { Write-Host "Dashboard querying under: $KEY (MATCH)" } else { Write-Host "Dashboard querying under: MISMATCH" }
}
catch {
    Write-Host "Error: $_"
}
