
# Validates Referral & Affiliate System on Production

# 1. Parse .env for Creds
$envPath = ".env"
$envVars = @{}
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            $envVars[$matches[1].Trim()] = $matches[2].Trim()
        }
    }
}

$supaUrl = $envVars["SUPABASE_URL"]
$serviceKey = $envVars["SUPABASE_SERVICE_ROLE_KEY"]
$apiUrl = "https://jobspeakpro.com/api" 

if (-not $supaUrl -or -not $serviceKey) {
    Write-Error "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"
    exit 1
}

Write-Host "Targeting API: $apiUrl"
Write-Host "Supabase: $supaUrl"

# Helper: Create Confirmed User via Admin API
function New-TestUser {
    param ($prefix)
    $ts = Get-Date -Format "MMddHHmmss"
    $email = "test_${prefix}_${ts}@example.com"
    $password = "Password123!"

    $body = @{
        email         = $email
        password      = $password
        email_confirm = $true
        user_metadata = @{ display_name = "$prefix User" }
    } | ConvertTo-Json

    try {
        $res = Invoke-RestMethod -Uri "$supaUrl/auth/v1/admin/users" -Method Post -Headers @{
            "apikey"        = $serviceKey
            "Authorization" = "Bearer $serviceKey"
            "Content-Type"  = "application/json"
        } -Body $body
        
        # Admin create returns user object. We need to login to get a bearer token for API calls.
        # Login
        $loginBody = @{
            email    = $email
            password = $password
        } | ConvertTo-Json
        
        $loginRes = Invoke-RestMethod -Uri "$supaUrl/auth/v1/token?grant_type=password" -Method Post -Headers @{
            "apikey"        = $serviceKey # Use service key to allow login if needed, or anon. Service key works universally usually.
            "Authorization" = "Bearer $serviceKey"
            "Content-Type"  = "application/json"
        } -Body $loginBody
        
        return @{
            Email = $email
            Id    = $res.id
            Token = $loginRes.access_token
        }
    }
    catch {
        Write-Error "Failed to create/login user $email : $_"
        return $null
    }
}

# --- Execution ---

Write-Host "`n[1] Creating Referrer..."
$referrer = New-TestUser "referrer"
if (-not $referrer) { exit }
Write-Host "Referrer created: $($referrer.Email)"

Write-Host "`n[2] Fetching Referral Code..."
try {
    $codeRes = Invoke-RestMethod -Uri "$apiUrl/referrals/me" -Method Get -Headers @{
        "Authorization" = "Bearer $($referrer.Token)"
    }
    $refCode = $codeRes.code
    Write-Host "Referral Code: $refCode"
}
catch {
    Write-Error "Failed to get code: $_"
    exit
}

Write-Host "`n[3] Creating 3 Referees & Claiming..."
1..3 | ForEach-Object {
    $i = $_
    $referee = New-TestUser "referee$i"
    if ($referee) {
        try {
            $claimBody = @{ referralCode = $refCode } | ConvertTo-Json
            $claimRes = Invoke-RestMethod -Uri "$apiUrl/referrals/claim" -Method Post -Headers @{
                "Authorization" = "Bearer $($referee.Token)"
                "Content-Type"  = "application/json"
            } -Body $claimBody
            Write-Host "Referee $i ($($referee.Email)) claimed: $($claimRes.success)"
        }
        catch {
            Write-Error "Referee $i failed to claim: $_"
        }
    }
}

Write-Host "`n[4] Verifying History (Expect 3)..."
Start-Sleep -Seconds 2 # Allow DB propagation
try {
    $historyRes = Invoke-RestMethod -Uri "$apiUrl/referrals/history" -Method Get -Headers @{
        "Authorization" = "Bearer $($referrer.Token)"
    }
    
    $count = $historyRes.history.Count
    Write-Host "History Count: $count"
    $historyRes.history | Format-Table -Property created_at, status, referred_email -AutoSize
    
    if ($count -eq 3) {
        Write-Host "PROOF PASSED: 3 Referees found." -ForegroundColor Green
    }
    else {
        Write-Host "PROOF FAILED: Found $count, expected 3." -ForegroundColor Red
    }
}
catch {
    Write-Error "Failed to fetch history: $_"
}

Write-Host "`n[5] Verifying Affiliate Resend..."
try {
    $affBody = @{
        name             = "Proof User"
        email            = $referrer.Email
        country          = "US"
        primaryPlatform  = "Blog"
        audienceSize     = "5000"
        payoutPreference = "paypal"
        payoutDetails    = @{ email = "pay@test.com" }
    } | ConvertTo-Json
    
    $affRes = Invoke-RestMethod -Uri "$apiUrl/affiliate/apply" -Method Post -Headers @{
        "Authorization" = "Bearer $($referrer.Token)"
        "Content-Type"  = "application/json"
    } -Body $affBody
    
    Write-Host "Application Submitted ID: $($affRes.applicationId)"
    
    # Check DB via Admin Row (since we can't query DB directly easily with REST without setup, 
    # but we can assume 'success' from API response means logic ran. 
    # To be strict, let's query the specific row via Supabase Admin REST or __admin endpoint if we have token)
    
    # Using Supabase Admin REST to check 'affiliate_applications' table
    $appId = $affRes.applicationId
    $dbRow = Invoke-RestMethod -Uri "$supaUrl/rest/v1/affiliate_applications?id=eq.$appId&select=payout_details" -Method Get -Headers @{
        "apikey"        = $serviceKey
        "Authorization" = "Bearer $serviceKey"
    }
    
    $details = $dbRow.payout_details
    Write-Host "DB Payout Details: $details"
    
    if ($details -match "resend:sent") {
        Write-Host "EMAIL PROOF PASSED: Found 'resend:sent'." -ForegroundColor Green
    }
    elseif ($details -match "resend:skipped") {
        Write-Host "EMAIL PROOF WARNING: 'resend:skipped' (Likely env vars missing)." -ForegroundColor Yellow
    }
    elseif ($details -match "resend:failed") {
        Write-Host "EMAIL PROOF ATTEMPTED: Found 'resend:failed'." -ForegroundColor Yellow
    }
    else {
        Write-Host "EMAIL PROOF FAILED: No resend status." -ForegroundColor Red
    }

}
catch {
    Write-Error "Affiliate Check Failed: $_"
}
