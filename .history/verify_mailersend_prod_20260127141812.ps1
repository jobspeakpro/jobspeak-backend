$baseUrl = "https://jobspeak-backend-production.up.railway.app"
$verifyKey = "temp-verify-123"
$proofDir = "c:\Users\Admin\Desktop\SAAS Projects\JobSpeakPro\jobspeak-backend\docs\proofs\2026-01-27_mailersend_verify_prod"

if (-not (Test-Path $proofDir)) {
    New-Item -ItemType Directory -Force -Path $proofDir | Out-Null
}

Write-Host "[VERIFY] Starting MailerSend Verification on $baseUrl"

# 1. Fetch Env Vars
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/__admin/env-vars" -Headers @{ "x-verify-key" = $verifyKey }
    if ($res.keys) {
        $res.keys -join "`n" | Set-Content -Path "$proofDir\vars_present_names_only.txt"
        Write-Host "[VERIFY] Saved vars_present_names_only.txt"
    }
}
catch {
    Write-Host "[VERIFY] Failed to fetch vars: $($_.Exception.Message)"
}

# 2. Auth (Register or Login)
$token = $null
$userId = $null
$email = "verify_$((Get-Date).Ticks)@test.com"

try {
    $body = @{
        email    = $email
        password = "Password123!"
        name     = "MailerSend Verify"
    } | ConvertTo-Json

    $res = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $body -ContentType "application/json"
    
    if ($res.session) {
        $token = $res.session.access_token
        $userId = $res.user.id
    }
    elseif ($res.id) {
        # Sometimes returns user object directly
        $userId = $res.id
        # Token might be missing if email confirm required, but let's see. 
        # Usually Supabase returns session on sign up unless disabled.
    }
    
    Write-Host "[VERIFY] Registration attempted. UserID: $userId"
}
catch {
    Write-Host "[VERIFY] Auth failed: $($_.Exception.Message)"
}

# 3. Submit Affiliate Application
try {
    $payload = @{
        name              = "MailerSend Verification User"
        email             = "test_affiliate@gmail.com"
        country           = "US"
        primaryPlatform   = "YouTube"
        otherPlatformText = ""
        audienceSize      = "10k-50k"
        payoutPreference  = "paypal"
        payoutDetails     = "test_payout@gmail.com"
    } | ConvertTo-Json

    # Use specific headers
    $headers = @{ "Content-Type" = "application/json" }
    
    # If we had a token, we'd add it: $headers["Authorization"] = "Bearer $token"
    # Proceeding as guest for now as fallback

    $res = Invoke-RestMethod -Uri "$baseUrl/api/affiliate/apply" -Method Post -Body $payload -Headers $headers
    Write-Host "[VERIFY] Application Submitted: $($res | ConvertTo-Json -Depth 1)"
}
catch {
    Write-Host "[VERIFY] Submit failed: $($_.Exception.Message)"
}

# 4. Check DB Status
Start-Sleep -Seconds 3

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/__admin/affiliate-applications/latest" -Headers @{ "x-verify-key" = $verifyKey }
    
    if ($res.success -and $res.applications.Count -gt 0) {
        $latest = $res.applications[0]
        $statusProof = "ID: $($latest.id)`nStatus: $($latest._notify_status)`nRaw: $($latest.payout_details)"
        
        Set-Content -Path "$proofDir\db_latest_row_mailersend_status_prod.txt" -Value $statusProof
        Write-Host "[VERIFY] Saved db_latest_row_mailersend_status_prod.txt"
        Write-Host $statusProof
    }
    else {
        Write-Host "[VERIFY] No applications found."
    }
}
catch {
    Write-Host "[VERIFY] Check DB failed: $($_.Exception.Message)"
}
