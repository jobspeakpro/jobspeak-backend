
$envVars = @{}
try {
    Get-Content .env | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            $envVars[$matches[1].Trim()] = $matches[2].Trim()
        }
    }
}
catch {
    Write-Warning ".env not found or unreadable"
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
Start-Sleep -Seconds 15 # Wait for deployment

$referrer = New-TestUser "referrer_final"
if (-not $referrer) { exit }
Write-Host "Referrer created: $($referrer.Email)"

$codeRes = Invoke-RestMethod -Uri "$apiUrl/referrals/me" -Method Get -Headers @{ "Authorization" = "Bearer $($referrer.Token)" }
$refCode = $codeRes.code
Write-Host "Referral Code: $refCode"

$referee = New-TestUser "referee_final"
Write-Host "Referee created: $($referee.Email)"

try {
    Write-Host "Claiming code..."
    $claimRes = Invoke-RestMethod -Uri "$apiUrl/referrals/claim" -Method Post -Headers @{ "Authorization" = "Bearer $($referee.Token)"; "Content-Type" = "application/json" } -Body (@{ referralCode = $refCode } | ConvertTo-Json)
    Write-Host "CLAIM RESPONSE: $($claimRes | ConvertTo-Json -Depth 5)"
}
catch {
    Write-Error "Claim failed: $_"
    $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() }
}

Start-Sleep -Seconds 2

try {
    Write-Host "Fetching History..."
    $historyRes = Invoke-RestMethod -Uri "$apiUrl/referrals/history" -Method Get -Headers @{ "Authorization" = "Bearer $($referrer.Token)" }
    Write-Host "HISTORY RESPONSE: $($historyRes | ConvertTo-Json -Depth 5)"
    
    if ($historyRes.history.Count -gt 0) {
        Write-Host "SUCCESS: History found!"
    }
    else {
        Write-Error "FAILURE: History empty."
    }
}
catch {
    Write-Error "History fetch failed: $_"
}
