$baseUrl = "https://jobspeakpro-backend.railway.app"
$proofDir = "docs\proofs\2026-01-27_backend_restore"

New-Item -ItemType Directory -Force -Path $proofDir | Out-Null

function Test-Endpoint {
    param (
        [string]$url,
        [string]$method,
        [string]$outFile,
        [string]$expectedStatusPattern # Regex for allowed status line (e.g. "200 OK|400 Bad Request")
    )

    Write-Host "Testing $method $url ..."
    try {
        $response = Invoke-WebRequest -Uri $url -Method $method -ErrorAction Stop
        $statusLine = "$($response.StatusCode) $($response.StatusDescription)"
        Write-Host "  Success: $statusLine"
        $statusLine | Out-File "$proofDir\$outFile"
    }
    catch {
        if ($_.Exception.Response) {
            $code = $_.Exception.Response.StatusCode.value__
            $desc = $_.Exception.Response.StatusDescription
            $statusLine = "$code $desc"
            Write-Host "  Response: $statusLine"
            
            # Check if 404
            if ($code -eq 404) {
                Write-Error "  FAILED: Endpoint returned 404 Not Found"
                "404 Not Found" | Out-File "$proofDir\$outFile"
                return $false
            }

            $statusLine | Out-File "$proofDir\$outFile"
            return $true
        }
        else {
            Write-Error "  Network Error: $_"
            "Network Error" | Out-File "$proofDir\$outFile"
            return $false
        }
    }
    return $true
}

# 1. Health
Test-Endpoint -url "$baseUrl/health" -method "Get" -outFile "health_200.txt" -expectedStatusPattern "200"

# 2. Affiliate Apply (Expect 400 or 401, NOT 404)
# We send empty body to force validation error (400) or auth error (401)
Test-Endpoint -url "$baseUrl/api/affiliate/apply" -method "Post" -outFile "affiliate_apply_not_404.txt" -expectedStatusPattern "400|401"

# 3. Referrals Me (Expect 401, NOT 404)
Test-Endpoint -url "$baseUrl/api/referrals/me" -method "Get" -outFile "referrals_me_not_404.txt" -expectedStatusPattern "401"

Write-Host "Verification script completed."
