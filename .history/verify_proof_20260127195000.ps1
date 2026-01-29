
# Validates Referral & Affiliate System on Production

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
    Write-Error "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    exit 1
}

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
        
        $loginBody = @{
            email    = $email
            password = $password
        } | ConvertTo-Json
        
        $loginRes = Invoke-RestMethod -Uri "$supaUrl/auth/v1/token?grant_type=password" -Method Post -Headers @{
            "apikey"        = $serviceKey
            "Authorization" = "Bearer $serviceKey"
            "Content-Type"  = "application/json"
        } -Body $loginBody
        
        return @{
            Email = $email
            Token = $loginRes.access_token
        }
    }
    catch {
        Write-Error "Failed to create/login user $email : $_"
        return $null
    }
}

Write-Host "Verifying Production at $apiUrl..."
Start-Sleep -Seconds 5

$referrer = New-TestUser "referrer"
if (-not $referrer) { exit }
Write-Host "Referrer created."

$codeRes = Invoke-RestMethod -Uri "$apiUrl/referrals/me" -Method Get -Headers @{ "Authorization" = "Bearer $($referrer.Token)" }
$refCode = $codeRes.code
Write-Host "Referral Code: $refCode"

1..3 | ForEach-Object {
    $referee = New-TestUser "referee$_"
    if ($referee) {
        Invoke-RestMethod -Uri "$apiUrl/referrals/claim" -Method Post -Headers @{ "Authorization" = "Bearer $($referee.Token)"; "Content-Type" = "application/json" } -Body (@{ referralCode = $refCode } | ConvertTo-Json)
    }
}

Start-Sleep -Seconds 2
$historyRes = Invoke-RestMethod -Uri "$apiUrl/referrals/history" -Method Get -Headers @{ "Authorization" = "Bearer $($referrer.Token)" }
Write-Host "History Count: $($historyRes.history.Count)"

$affBody = @{
    name             = "Proof User"
    email            = $referrer.Email
    country          = "US"
    primaryPlatform  = "Blog"
    audienceSize     = "5000"
    payoutPreference = "paypal"
    payoutDetails    = @{ email = "pay@test.com" }
} | ConvertTo-Json

$affRes = Invoke-RestMethod -Uri "$apiUrl/affiliate/apply" -Method Post -Headers @{ "Authorization" = "Bearer $($referrer.Token)"; "Content-Type" = "application/json" } -Body $affBody

$appId = $affRes.applicationId
$dbRow = Invoke-RestMethod -Uri "$supaUrl/rest/v1/affiliate_applications?id=eq.$appId&select=payout_details" -Method Get -Headers @{ "apikey" = $serviceKey; "Authorization" = "Bearer $serviceKey" }

Write-Host "DB Status: $($dbRow.payout_details)"
