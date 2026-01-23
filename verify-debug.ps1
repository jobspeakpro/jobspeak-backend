# Check deployment of Debug Info
$URL = "https://jobspeak-backend-production.up.railway.app"
$KEY = "guest-debug-verification"

Write-Host "Verifying Deployment..." -ForegroundColor Cyan

# 1. Health - Getting Commit
$H = Invoke-RestMethod -Uri "$URL/health" -Method Get
Write-Host "Deployed Commit: $($H.commit)" -ForegroundColor Yellow

# 2. Dashboard
$D_Resp = Invoke-WebRequest -Uri "$URL/api/dashboard/summary?userKey=$KEY" -Method Get
$D_Json = $D_Resp.Content | ConvertFrom-Json
$D_Head = $D_Resp.Headers["x-jsp-backend-commit"]

Write-Host "`nDashboard:"
Write-Host "  Header Commit: $D_Head"
if ($D_Json.debug) {
    Write-Host "  Debug Body: " -NoNewline
    $D_Json.debug | ConvertTo-Json -Depth 0 | Write-Host -ForegroundColor Green
}
else {
    Write-Host "  Debug field MISSING" -ForegroundColor Red
}

# 3. Progress
$P_Resp = Invoke-WebRequest -Uri "$URL/api/progress?userKey=$KEY" -Method Get
$P_Json = $P_Resp.Content | ConvertFrom-Json
$P_Head = $P_Resp.Headers["x-jsp-backend-commit"]

Write-Host "`nProgress:"
Write-Host "  Header Commit: $P_Head"
if ($P_Json.debug) {
    Write-Host "  Debug Body: " -NoNewline
    $P_Json.debug | ConvertTo-Json -Depth 0 | Write-Host -ForegroundColor Green
}
else {
    Write-Host "  Debug field MISSING" -ForegroundColor Red
}

if ($D_Head -eq $H.commit -and $P_Head -eq $H.commit -and $D_Json.debug -and $P_Json.debug) {
    Write-Host "`nSUCCESS: Debug info verified." -ForegroundColor Green
}
else {
    Write-Host "`nFAILURE: Mismatch or missing data." -ForegroundColor Red
}
