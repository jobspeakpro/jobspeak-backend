$baseUrl = "https://jobspeakpro-backend.railway.app"
$adminUrl = "$baseUrl/api/__admin/affiliate-applications/latest"

Write-Host "Waiting for admin endpoint to appear at $adminUrl..."

while ($true) {
    try {
        # access without token should return 403 if it exists, 404 if not
        $res = Invoke-WebRequest -Uri $adminUrl -Method Get -ErrorAction SilentlyContinue
        $status = $res.StatusCode
    }
    catch {
        if ($_.Exception.Response) {
            $status = $_.Exception.Response.StatusCode
        }
        else {
            $status = 0
        }
    }

    Write-Host "Admin Endpoint Status: $status"

    if ($status -eq 403) {
        Write-Host "DEPLOYMENT CONFIRMED! Endpoint exists (Got 403)."
        exit 0
    }
    elseif ($status -eq 401) {
        Write-Host "DEPLOYMENT CONFIRMED! Endpoint exists (Got 401)."
        exit 0
    }
    elseif ($status -eq 200) {
        Write-Host "DEPLOYMENT CONFIRMED! Endpoint exists (Got 200)."
        exit 0
    }

    Start-Sleep -Seconds 10
}
