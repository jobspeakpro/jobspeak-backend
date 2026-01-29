
$envVars = @{}
Get-Content .env | ForEach-Object {
    if ($_ -match "^([^=]+)=(.*)$") {
        $envVars[$matches[1].Trim()] = $matches[2].Trim()
    }
}
$supaUrl = $envVars["SUPABASE_URL"]
$serviceKey = $envVars["SUPABASE_SERVICE_ROLE_KEY"]

# Create user
$email = "proof_resend_$(Get-Date -Format 'ss')@test.com"
$body = @{ email = $email; password = "Password123!"; email_confirm = $true } | ConvertTo-Json
$reg = Invoke-RestMethod -Uri "$supaUrl/auth/v1/signup" -Method Post -Headers @{ "apikey" = $serviceKey; "Content-Type" = "application/json" } -Body $body
$token = $reg.access_token

# Apply
$affBody = @{
    name             = "Resend Proof"
    email            = $email
    country          = "US"
    primaryPlatform  = "Test"
    audienceSize     = "100"
    payoutPreference = "paypal"
    payoutDetails    = @{ email = "test@test.com" }
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "https://jobspeakpro.com/api/affiliate/apply" -Method Post -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } -Body $affBody
    Write-Host "Application ID: $($res.applicationId)"
    
    Start-Sleep -Seconds 2
    
    # Check DB
    $row = Invoke-RestMethod -Uri "$supaUrl/rest/v1/affiliate_applications?id=eq.$($res.applicationId)&select=payout_details" -Method Get -Headers @{ "apikey" = $serviceKey; "Authorization" = "Bearer $serviceKey" }
    
    Write-Host "PROOF: $($row.payout_details)"
}
catch {
    Write-Error $_
}
