$baseUrl = "https://jobspeak-backend-production.up.railway.app"

function Test-Endpoint {
    param (
        [string]$Url,
        [string]$Method = "GET",
        [string]$ExpectedContent = ""
    )
    try {
        $response = Invoke-WebRequest -Uri $Url -Method $Method -ErrorAction Stop
        
        # Content Check
        if ($ExpectedContent -ne "" -and $response.Content -notmatch $ExpectedContent) {
            return [PSCustomObject]@{
                Url               = $Url
                Method            = $Method
                StatusCode        = $response.StatusCode
                StatusDescription = $response.StatusDescription
                Is404             = $false
                ContentMatch      = $false
            }
        }

        return [PSCustomObject]@{
            Url               = $Url
            Method            = $Method
            StatusCode        = $response.StatusCode
            StatusDescription = $response.StatusDescription
            Is404             = $false
            ContentMatch      = $true
        }
    }
    catch {
        # Catch 4xx/5xx errors
        if ($_.Exception.Response) {
            return [PSCustomObject]@{
                Url               = $Url
                Method            = $Method
                StatusCode        = $_.Exception.Response.StatusCode.value__
                StatusDescription = $_.Exception.Response.StatusDescription
                Is404             = ($_.Exception.Response.StatusCode.value__ -eq 404)
                ContentMatch      = $false
            }
        }
        else {
            return [PSCustomObject]@{
                Url               = $Url
                Method            = $Method
                StatusCode        = "NetworkError"
                StatusDescription = $_.Exception.Message
                Is404             = $false
                ContentMatch      = $false
            }
        }
    }
}

Write-Host "--- STRICT VERIFICATION ---"

# 1. /health (Expect 200 AND "JobSpeakPro")
$health = Test-Endpoint -Url "$baseUrl/health" -ExpectedContent "JobSpeakPro"
Write-Host "1. Health Check: $($health.StatusCode)"
if ($health.StatusCode -eq 200 -and $health.ContentMatch) { 
    Write-Host "   [PASS] Health is 200 and matches content" -ForegroundColor Green
    
    # Only check others if Health passes
    # 2. /api/affiliate/apply (POST) (Expect 400/401, NOT 404)
    $affiliate = Test-Endpoint -Url "$baseUrl/api/affiliate/apply" -Method "POST"
    Write-Host "2. Affiliate Apply: $($affiliate.StatusCode)"
    if (-not $affiliate.Is404 -and $affiliate.StatusCode -ne 200) {
        # Expecting validation error (400) not success (200 empty) or 404
        Write-Host "   [PASS] Endpoint Exists ($($affiliate.StatusCode))" -ForegroundColor Green 
    }
    elseif ($affiliate.StatusCode -eq 200) {
        Write-Host "   [WARN] Endpoint Exists but returned 200 (Unexpected success?)" -ForegroundColor Yellow
    }
    else { Write-Host "   [FAIL] Returned $($affiliate.StatusCode)" -ForegroundColor Red }

    # 3. /api/referrals/me (GET) (Expect 401, NOT 404)
    $referral = Test-Endpoint -Url "$baseUrl/api/referrals/me"
    Write-Host "3. Referrals Me: $($referral.StatusCode)"
    if ($referral.StatusCode -eq 401) { Write-Host "   [PASS] Endpoint Exists (401)" -ForegroundColor Green }
    else { Write-Host "   [FAIL] Returned $($referral.StatusCode)" -ForegroundColor Red }

}
else { 
    Write-Host "   [FAIL] Expected 200 with 'JobSpeakPro'. Got $($health.StatusCode) (Content Match: $($health.ContentMatch))" -ForegroundColor Red
    Write-Host "   Likely hitting default Railway page."
}

Write-Host "--- END VERIFICATION ---"
