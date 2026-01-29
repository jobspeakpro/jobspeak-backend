
$ErrorActionPreference = "Continue"

# 0. Check Resend API FIRST
$resendApiKey = "re_REUD1fu9_5k99W1onLvevW6BvF7L8mRj7"
$resendUrl = "https://api.resend.com/emails"
$resendHeaders = @{ "Authorization" = "Bearer $resendApiKey" }

Write-Host "Checking Resend Logs..."
try {
    $resendData = Invoke-RestMethod -Method Get -Uri $resendUrl -Headers $resendHeaders
    $resendData.data | Select-Object -First 5 | ConvertTo-Json -Depth 5 | Out-File "proof_resend_api_logs.json"
    Write-Host "Saved proof_resend_api_logs.json"
}
catch {
    Write-Host "Resend Check failed: $($_.Exception.Message)"
}

# 1. Supabase Config
$supaUrl = "https://wlxacpqlokoiqqhgaads.supabase.co"
$supaKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndseGFjcHFsb2tvaXFxaGdhYWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2ODkxMTcsImV4cCI6MjA4MjI2NTExN30.96MoSnR2KESLPQIIuMN5w_Eo0bWlw5uAqvJSD7CO0zA"
# Note: Using Anon Key. If Login works, good. If not, Guest.

# 2. Login / Signup
$rand = Get-Random -Minimum 10000 -Maximum 99999
$email = "resend_verify_$rand@jobspeakpro-test.local"
$password = "Password123!"
$signUpUrl = "$supaUrl/auth/v1/signup"
$authUrl = "$supaUrl/auth/v1/token?grant_type=password"
$authHeaders = @{ "apikey" = $supaKey; "Content-Type" = "application/json" }

Write-Host "Creating new test user: $email..."
$authBody = @{ email = $email; password = $password } | ConvertTo-Json

try {
    $signRes = Invoke-RestMethod -Method Post -Uri $signUpUrl -Headers $authHeaders -Body $authBody
    Write-Host "Signup successful. ID: $($signRes.id)"
}
catch {
    Write-Host "Signup Warning: $($_.Exception.Message)"
}

Write-Host "Logging in..."
$authRes = $null
try {
    $authRes = Invoke-RestMethod -Method Post -Uri $authUrl -Headers $authHeaders -Body $authBody
}
catch {
    Write-Host "Login failed: $($_.Exception.Message)"
}

if (-not $authRes) {
    Write-Host "Proceeding as Guest."
}
else {
    $accessToken = $authRes.access_token
    Write-Host "Login successful."
}

# 3. Submit Affiliate Application
# IMPORTANT: Use camelCase for body keys as expected by routes/affiliates.js
$applyUrl = "https://jobspeakpro.com/api/affiliate/apply"
$applyBody = @{
    name             = "Resend Proof Agent Guest"
    email            = "proof-guest-$rand@resend.dev"
    country          = "ResendLand"
    primaryPlatform  = "API"
    audienceSize     = "9999"
    payoutPreference = "PayPal"
    payoutDetails    = "agent-guest@proof.com"
} | ConvertTo-Json

$applyHeaders = @{ "Content-Type" = "application/json" }
if ($accessToken) {
    $applyHeaders["Authorization"] = "Bearer $accessToken"
}

Write-Host "Submitting Application to $applyUrl..."
try {
    $applyRes = Invoke-RestMethod -Method Post -Uri $applyUrl -Headers $applyHeaders -Body $applyBody
    Write-Host "Application Submitted: $($applyRes | ConvertTo-Json -Depth 1)"
}
catch {
    Write-Host "Submission failed: $($_.Exception.Message)"
    if ($_.ErrorDetails) { Write-Host "Details: $($_.ErrorDetails.Message)" }
}

# 4. Verify Database
$adminUrl = "https://jobspeakpro.com/api/__admin/affiliate-applications/latest"
$adminHeaders = @{ "x-verify-key" = "temp-verify-123" }

Write-Host "Checking Database..."
try {
    $dbRecord = Invoke-RestMethod -Method Get -Uri $adminUrl -Headers $adminHeaders
    $dbRecord | ConvertTo-Json -Depth 5 | Out-File "proof_supabase_row.json"
    Write-Host "Saved proof_supabase_row.json"
}
catch {
    Write-Host "DB Check failed: $($_.Exception.Message)"
}

Write-Host "VERIFICATION COMPLETE"
