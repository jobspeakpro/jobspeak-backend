
$ErrorActionPreference = "Stop"

# 1. Fetch nothing (optimize)
# Hardcoded Credentials from .env
$supaUrl = "https://wlxacpqlokoiqqhgaads.supabase.co"
$supaKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndseGFjcHFsb2tvaXFxaGdhYWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2ODkxMTcsImV4cCI6MjA4MjI2NTExN30.96MoSnR2KESLPQIIuMN5w_Eo0bWlw5uAqvJSD7CO0zA"

Write-Host "Using Supabase URL: $supaUrl"

# 2. Login / Signup
$rand = Get-Random -Minimum 1000 -Maximum 9999
$email = "resend_verify_$rand@jobspeakpro-test.local"
$password = "Password123!"
$signUpUrl = "$supaUrl/auth/v1/signup"
$authUrl = "$supaUrl/auth/v1/token?grant_type=password"
$authHeaders = @{ "apikey" = $supaKey; "Content-Type" = "application/json" }

Write-Host "Creating new test user: $email..."
$authBody = @{ email = $email; password = $password } | ConvertTo-Json

try {
    # Attempt Signup
    $signRes = Invoke-RestMethod -Method Post -Uri $signUpUrl -Headers $authHeaders -Body $authBody
    Write-Host "Signup successful. ID: $($signRes.id)"
}
catch {
    Write-Host "Signup Warning: $($_.Exception.Message). Assuming user exists, trying login."
}

# Login
Write-Host "Logging in..."
try {
    $authRes = Invoke-RestMethod -Method Post -Uri $authUrl -Headers $authHeaders -Body $authBody
}
catch {
    Write-Error "Login failed: $($_.Exception.Message)"
    exit 1
}

$accessToken = $authRes.access_token
Write-Host "Login successful."

# 3. Submit Affiliate Application
$applyUrl = "https://jobspeakpro.com/api/affiliate/apply"
$applyBody = @{
    name              = "Resend Proof Agent"
    email             = "proof-agent@resend.dev"
    country           = "ResendLand"
    primary_platform  = "API"
    audience_size     = "9999"
    payout_preference = "PayPal"
    payout_details    = "agent@proof.com"
} | ConvertTo-Json

$applyHeaders = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type"  = "application/json"
}

Write-Host "Submitting Application to $applyUrl..."
try {
    $applyRes = Invoke-RestMethod -Method Post -Uri $applyUrl -Headers $applyHeaders -Body $applyBody
    Write-Host "Application Submitted: $($applyRes | ConvertTo-Json -Depth 1)"
}
catch {
    Write-Error "Submission failed: $($_.Exception.Message)"
}

# 4. Verify Database (Admin Endpoint)
$adminUrl = "https://jobspeakpro.com/api/__admin/affiliate-applications/latest"
$adminHeaders = @{ "x-verify-key" = "temp-verify-123" }

Write-Host "Checking Database Record..."
try {
    $dbRecord = Invoke-RestMethod -Method Get -Uri $adminUrl -Headers $adminHeaders
    $dbRecord | ConvertTo-Json -Depth 5 | Out-File "proof_supabase_row.json"
    Write-Host "Saved proof_supabase_row.json"
}
catch {
    Write-Error "DB Check failed: $($_.Exception.Message)"
}

# 5. Verify Resend API
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
    Write-Error "Resend Check failed: $($_.Exception.Message)"
}

Write-Host "VERIFICATION COMPLETE"
