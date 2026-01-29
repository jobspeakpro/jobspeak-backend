
try {
    $res = Invoke-RestMethod -Uri "https://jobspeakpro.com/api/health" -Method Get -ErrorAction Stop
    Write-Host "HEALTH OK: $($res | ConvertTo-Json)"
}
catch {
    Write-Error "HEALTH FAIL: $_"
}
