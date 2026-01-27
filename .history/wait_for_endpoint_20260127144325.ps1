$url = "https://jobspeak-backend-production.up.railway.app/api/__admin/mailersend/identities"
$headers = @{ "x-verify-key" = "temp-verify-123" }

Write-Host "Waiting for endpoint $url..."

while ($true) {
    try {
        $response = Invoke-WebRequest -Uri $url -Headers $headers -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "Success! Endpoint is up."
            Write-Host $response.Content
            exit 0
        }
    }
    catch {
        $status = $_.Exception.Response.StatusCode
        if ($status -eq 404) {
            Write-Host "Still 404..."
        }
        elseif ($status -eq 403) {
            Write-Host "403 Unauthorized (Endpoint exists!)"
            exit 0
        }
        else {
            Write-Host "Error: $_"
        }
    }
    Start-Sleep -Seconds 5
}
