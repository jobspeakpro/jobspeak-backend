$ErrorActionPreference = "Stop"
$url = "https://jobspeak-backend-production.up.railway.app/health"
$maxRetries = 60
$retryInterval = 5
$referralUrl = "https://jobspeak-backend-production.up.railway.app/api/referrals/me"
$affiliateUrl = "https://jobspeak-backend-production.up.railway.app/api/affiliate/apply"

Write-Host "Starting health check loop..."

for ($i = 0; $i -lt $maxRetries; $i++) {
    try {
        $response = Invoke-WebRequest -Uri $url -Method Get -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "Success: 200 OK"
            
            # Capture Health Check
            $health = Invoke-WebRequest -Uri $url -Method Get
            $healthHeaders = $health.RawContent
            $healthHeaders | Out-File -FilePath "docs\proofs\2026-01-24_fix_v4\console\health_check.txt" -Encoding utf8

            # Capture Referral Check (expect 401 Unauthorized as we have no token, proving app is running)
            try {
                $ref = Invoke-WebRequest -Uri $referralUrl -Method Get
            } catch {
                $ref = $_.Exception.Response
            }
            if ($ref) {
               $ref.RawContent | Out-File -FilePath "docs\proofs\2026-01-24_fix_v4\console\route_check.txt" -Encoding utf8 -Append
            }

            # Capture Affiliate Check (expect 400 Bad Request or similar, verify not 404/502)
            try {
                 $aff = Invoke-WebRequest -Uri $affiliateUrl -Method Post -Body ""
            } catch {
                 $aff = $_.Exception.Response
            }
            if ($aff) {
                # Append to route_check.txt as requested "route_check.txt" (or separate if I want)
                # User asked for "route_check.txt" containing both? 
                # "route_check.txt ... curl ... curl ..." implying one file or two? 
                # I'll put them in one file separated by newlines to be safe or separate files if names differ.
                # User asked for "route_check.txt" containing both.
                "`n`n--- AFFILIATE CHECK ---`n" | Out-File -FilePath "docs\proofs\2026-01-24_fix_v4\console\route_check.txt" -Encoding utf8 -Append
                $aff.RawContent | Out-File -FilePath "docs\proofs\2026-01-24_fix_v4\console\route_check.txt" -Encoding utf8 -Append
            }

            exit 0
        }
    } catch {
        # ignore connectivity errors while deploying
    }
    
    Write-Host "Waiting for deployment... ($($i+1)/$maxRetries)"
    Start-Sleep -Seconds $retryInterval
}

Write-Host "Timeout waiting for deployment."
exit 1
