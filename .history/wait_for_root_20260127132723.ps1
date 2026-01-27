$baseUrl = "https://jobspeakpro-backend.railway.app"
$expectedVersion = "Super-Safe-Mode"

Write-Host "Waiting for deployment of version '$expectedVersion' at $baseUrl..."

while ($true) {
    try {
        $res = Invoke-RestMethod -Uri "$baseUrl" -Method Get -ErrorAction SilentlyContinue
        
        if ($res -is [PSCustomObject] -and $res.version -eq $expectedVersion) {
            Write-Host "DEPLOYMENT CONFIRMED! Version: $($res.version)"
            exit 0
        }
        else {
            $v = if ($res.version) { $res.version } else { "Old/Unknown" }
            Write-Host "Still seeing old version: $v"
        }
    }
    catch {
        Write-Host "Error checking root: $_"
    }
    Start-Sleep -Seconds 10
}
