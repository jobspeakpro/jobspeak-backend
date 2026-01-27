$baseUrl = "https://jobspeakpro-backend.railway.app"
$supabaseUrl = "https://wlxacpqlokoiqqhgaads.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndseGFjcHFsb2tvaXFxaGdhYWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY4OTExNywiZXhwIjoyMDgyMjY1MTE3fQ.W77uE7U-MgtmLnC7Yuv9x9gO3ezJvvC6CtzJ1UjeMcQ"

# Ensure output directory exists
New-Item -ItemType Directory -Force -Path "docs\proofs\2026-01-27_mailersend_final" | Out-Null

# 1. Health Check loop
Write-Host "Checking Health..."
$maxRetries = 20
$retryCount = 0
$healthy = $false

while (-not $healthy -and $retryCount -lt $maxRetries) {
    try {
        $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -ErrorAction Stop
        $healthy = $true
        # Write generic 200 OK proof
        "200 OK" | Out-File "docs\proofs\2026-01-27_mailersend_final\health_200_prod.txt"
        Write-Host "Health Check: OK"
    }
    catch {
        Write-Host "Health check failed, retrying in 10s... ($_)"
        Start-Sleep -Seconds 10
        $retryCount++
    }
}

if (-not $healthy) {
    Write-Error "Deployment timed out or failed health check."
    exit 1
}

# 2. Submit Application
Write-Host "Submitting Application..."
$body = @{
    name             = "Production Verifier"
    email            = "prod.verifier@example.com"
    country          = "TestLand"
    primaryPlatform  = "YouTube"
    audienceSize     = "10k-50k"
    payoutPreference = "paypal"
    payoutDetails    = "prod.verifier@example.com"
} | ConvertTo-Json

$pathsToTry = @("/api/affiliate/apply", "/affiliate/apply")
$submitted = $false

foreach ($path in $pathsToTry) {
    if ($submitted) { break }
    try {
        Write-Host "Trying POST $baseUrl$path ..."
        $response = Invoke-RestMethod -Uri "$baseUrl$path" -Method Post -Body $body -ContentType "application/json"
        
        "200 OK`n$($response | ConvertTo-Json)" | Out-File "docs\proofs\2026-01-27_mailersend_final\affiliate_apply_200_prod.txt"
        Write-Host "Application Submitted: OK"
        $submitted = $true
    }
    catch {
        Write-Host "Failed path $path : $_"
        # Try to read error details
        if ($_.Exception.Response) {
            # $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
            # $errBody = $reader.ReadToEnd()
            # Write-Host "Error Response: $errBody"
        }
    }
}

if (-not $submitted) {
    Write-Error "Submission failed on all paths."
    exit 1
}

# 3. Query Supabase
Write-Host "Querying Supabase..."
$headers = @{
    "apikey"        = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
}

# Wait a brief moment for async (though app awaits it)
Start-Sleep -Seconds 5

try {
    $row = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/affiliate_applications?select=*&order=created_at.desc&limit=1" -Method Get -Headers $headers
    $rowText = $row | ConvertTo-Json -Depth 5
    $rowText | Out-File "docs\proofs\2026-01-27_mailersend_final\db_latest_row_mailersend_status_prod.txt"
    Write-Host "Supabase Query: OK"
    Write-Host "Latest Row Payout Details: $($row.payout_details)"
}
catch {
    Write-Error "Supabase query failed: $_"
    exit 1
}
