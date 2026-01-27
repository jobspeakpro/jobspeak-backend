$baseUrl = "https://jobspeakpro-backend.railway.app"
$expectedCommitShort = "396dd32" 

Write-Host "Waiting for deployment of commit $expectedCommitShort..."

while ($true) {
    try {
        $res = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -ErrorAction SilentlyContinue
        # If it returns a string "OK", it's the old version in some cases, or maybe invalid JSON
        if ($res -is [string] -and $res -eq "OK") {
            Write-Host "Still seeing 'OK' (Old version)..."
        }
        elseif ($res -is [PSCustomObject]) {
            if ($res.commit -and $res.commit.StartsWith($expectedCommitShort)) {
                Write-Host "DEPLOYMENT CONFIRMED! Commit: $($res.commit)"
                exit 0
            }
            else {
                Write-Host "JSON received but commit mismatch. Got: $($res.commit). Expected start: $expectedCommitShort"
            }
        }
        else {
            Write-Host "Unknown response type: $($res.GetType().Name)"
        }
    }
    catch {
        Write-Host "Error checking health: $_"
    }
    Start-Sleep -Seconds 10
}
