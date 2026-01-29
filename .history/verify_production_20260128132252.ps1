
$ErrorActionPreference = "Stop"

# 1. Fetch Frontend Assets to find Supabase Keys
Write-Host "Fetching jobspeakpro.com..."
$html = (Invoke-WebRequest -Uri "https://jobspeakpro.com" -UseBasicParsing).Content

# Hardcoded Credentials from .env
$supaUrl = "https://wlxacpqlokoiqqhgaads.supabase.co"
$supaKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndseGFjcHFsb2tvaXFxaGdhYWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2ODkxMTcsImV4cCI6MjA4MjI2NTExN30.96MoSnR2KESLPQIIuMN5w_Eo0bWlw5uAqvJSD7CO0zA"

Write-Host "Using Supabase URL: $supaUrl"


# 2. Login to Supabase
$email = "jsp.qa.001@jobspeakpro-test.local"
$password = $email
$authUrl = "$supaUrl/auth/v1/token?grant_type=password"

Write-Host "Logging in as $email..."
$authBody = @{ email = $email; password = $password } | ConvertTo-Json
$authHeaders = @{ "apikey" = $supaKey; "Content-Type" = "application/json" }

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
    # Continue to check DB anyway just in case
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
    # Limit to latest 5
    $resendData = Invoke-RestMethod -Method Get -Uri $resendUrl -Headers $resendHeaders
    # Resend API returns { "data": [ ... ] }
    $resendData.data | Select-Object -First 5 | ConvertTo-Json -Depth 5 | Out-File "proof_resend_api_logs.json"
    Write-Host "Saved proof_resend_api_logs.json"
}
catch {
    Write-Error "Resend Check failed: $($_.Exception.Message)"
}

Write-Host "VERIFICATION COMPLETE"
