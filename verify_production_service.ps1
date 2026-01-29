
$ErrorActionPreference = "Continue"

# Service Role Key (From .env)
$supaUrl = "https://wlxacpqlokoiqqhgaads.supabase.co"
$supaServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndseGFjcHFsb2tvaXFxaGdhYWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY4OTExNywiZXhwIjoyMDgyMjY1MTE3fQ.W77uE7U-MgtmLnC7Yuv9x9gO3ezJvvC6CtzJ1UjeMcQ"

# We already submitted ID: e0bc0ef9-7590-4c06-a24a-3f9b9f739119 (From previous run)
# But let's submit a NEW one just to be fresh and allow correlation.

$rand = Get-Random -Minimum 1000 -Maximum 9999
$applyUrl = "https://jobspeakpro.com/api/affiliate/apply"
$applyBody = @{
    name             = "Final Verify User $rand"
    email            = "final-verify-$rand@resend.dev"
    country          = "ResendLand"
    primaryPlatform  = "API"
    audienceSize     = "9999"
    payoutPreference = "PayPal"
    payoutDetails    = "agent-final@proof.com"
} | ConvertTo-Json

$applyHeaders = @{ "Content-Type" = "application/json" }

Write-Host "Submitting New Application..."
try {
    $applyRes = Invoke-RestMethod -Method Post -Uri $applyUrl -Headers $applyHeaders -Body $applyBody
    $appId = $applyRes.applicationId
    Write-Host "Submitted ID: $appId"
}
catch {
    Write-Error "Submission Failed: $($_.Exception.Message)"
    if ($_.ErrorDetails) { Write-Host "Details: $($_.ErrorDetails.Message)" }
    exit 1
}

# Verify via Supabase REST (Bypass RLS)
Start-Sleep -Seconds 2
$dbUrl = "$supaUrl/rest/v1/affiliate_applications?id=eq.$appId&select=*"
$dbHeaders = @{ 
    "apikey"        = $supaServiceKey
    "Authorization" = "Bearer $supaServiceKey"
}

Write-Host "Fetching Record via Service Role..."
try {
    $record = Invoke-RestMethod -Method Get -Uri $dbUrl -Headers $dbHeaders
    $record | ConvertTo-Json -Depth 5 | Out-File "proof_supabase_final.json"
    Write-Host "Saved proof_supabase_final.json"
}
catch {
    Write-Error "DB Fetch Failed: $($_.Exception.Message)"
}
