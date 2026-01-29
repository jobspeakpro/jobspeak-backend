
$apiUrl = "https://jobspeakpro.com/api"
$seedKey = "seed-2026-1"

Write-Host "Using SEED_KEY: $seedKey"

# 2. Call Seed Endpoint
Write-Host "Seeding Data..."
try {
    $seedRes = Invoke-RestMethod -Uri "$apiUrl/referrals/seed-test" -Method Post -Headers @{ "x-seed-key" = $seedKey }
    
    Write-Host "SEED RESPONSE:"
    Write-Host ($seedRes | ConvertTo-Json -Depth 5)
    
    if ($seedRes.success) {
        # 3. Login as Referrer and Check History
        $refEmail = $seedRes.referrer.email
        $refPass = $seedRes.referrer.password
        
        Write-Host "Logging in as $refEmail..."
        
        $localEnv = @{}
        if (Test-Path .env) {
            Get-Content .env | ForEach-Object { if ($_ -match "^([^=]+)=(.*)$") { $localEnv[$matches[1]] = $matches[2] } }
        }
        
        $supaUrl = $localEnv["SUPABASE_URL"]
        $anonKey = $localEnv["SUPABASE_ANON_KEY"]
        
        if ($supaUrl -and $anonKey) {
            $loginBody = @{ email = $refEmail; password = $refPass } | ConvertTo-Json
            $tokenRes = Invoke-RestMethod -Uri "$supaUrl/auth/v1/token?grant_type=password" -Method Post -Headers @{ "apikey" = $anonKey; "Content-Type" = "application/json" } -Body $loginBody
            $token = $tokenRes.access_token
            
            Write-Host "Fetching History..."
            $histRes = Invoke-RestMethod -Uri "$apiUrl/referrals/history" -Method Get -Headers @{ "Authorization" = "Bearer $token" }
            
            Write-Host "HISTORY RESPONSE (PROOF):"
            Write-Host ($histRes | ConvertTo-Json -Depth 5)
            
            if ($histRes.history.Count -eq 3) {
                Write-Host "SUCCESS: History Verified (3 Rows)."
            }
            else {
                Write-Error "FAILURE: History Count Mismatch."
            }
        }
        else {
            Write-Warning "Local .env missing Supabase keys, cannot verify history manually."
        }
    }
}
catch {
    Write-Error "Seed call failed: $_"
    if ($_.Exception.Response) { 
        $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } 
    }
}
