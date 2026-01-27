$baseUrl = "https://jobspeakpro-backend.railway.app"

function Test-Endpoint {
    param (
        [string]$Url,
        [string]$Method = "GET"
    )
    try {
        $response = Invoke-WebRequest -Uri $Url -Method $Method -ErrorAction Stop
        return [PSCustomObject]@{
            Url               = $Url
            Method            = $Method
            StatusCode        = $response.StatusCode
            StatusDescription = $response.StatusDescription
            Is404             = $false
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
            }
        }
        else {
            return [PSCustomObject]@{
                Url               = $Url
                Method            = $Method
                StatusCode        = "NetworkError"
                StatusDescription = $_.Exception.Message
                Is404             = $false
            }
        }
    }
}

Write-Host "--- VERIFYING ENDPOINTS ---"

# 1. /health (Expect 200)
$health = Test-Endpoint -Url "$baseUrl/health"
Write-Host "1. Health Check: $($health.StatusCode)"
if ($health.StatusCode -eq 200) { Write-Host "   [PASS] Health is 200" -ForegroundColor Green }
else { Write-Host "   [FAIL] Expected 200" -ForegroundColor Red }

# 2. /api/affiliate/apply (POST) (Expect NOT 404 - likely 400 or 401)
$affiliate = Test-Endpoint -Url "$baseUrl/api/affiliate/apply" -Method "POST"
Write-Host "2. Affiliate Apply: $($affiliate.StatusCode)"
if (-not $affiliate.Is404) { Write-Host "   [PASS] Endpoint Exists (Not 404)" -ForegroundColor Green }
else { Write-Host "   [FAIL] Returned 404" -ForegroundColor Red }

# 3. /api/referrals/me (GET) (Expect NOT 404 - likely 401)
$referral = Test-Endpoint -Url "$baseUrl/api/referrals/me"
Write-Host "3. Referrals Me: $($referral.StatusCode)"
if (-not $referral.Is404) { Write-Host "   [PASS] Endpoint Exists (Not 404)" -ForegroundColor Green }
else { Write-Host "   [FAIL] Returned 404" -ForegroundColor Red }

Write-Host "--- END VERIFICATION ---"
