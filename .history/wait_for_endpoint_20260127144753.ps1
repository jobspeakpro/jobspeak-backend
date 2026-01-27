$url = "https://jobspeak-backend-production.up.railway.app/api/__admin/mailersend/probe"
$headers = @{ 
    "x-verify-key" = "temp-verify-123"
    "Content-Type" = "application/json"
}
$body = '{"fromEmail": "jobspeakpro@gmail.com"}'

Write-Host "Waiting for endpoint $url..."

while ($true) {
    try {
        $response = Invoke-WebRequest -Uri $url -Method Post -Headers $headers -Body $body -ErrorAction Stop
        Write-Host "Success! Endpoint responded."
        Write-Host $response.Content
        exit 0
    }
    catch {
        $status = $_.Exception.Response.StatusCode
        $content = $_.Exception.Response.GetResponseStream()
        
        if ($null -ne $content) {
            $reader = New-Object System.IO.StreamReader($content)
            $respBody = $reader.ReadToEnd()
        }
        else {
            $respBody = ""
        }

        if ($status -eq 404) {
            Write-Host "Still 404 (Not Deployed)..."
        }
        else {
            Write-Host "Response ($status): $respBody"
            exit 0
        }
    }
    Start-Sleep -Seconds 5
}
