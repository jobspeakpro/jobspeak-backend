
$apiUrl = "https://jobspeakpro.com/api"

# 1. Get SEED_KEY via Backdoor
Write-Host "Fetching SEED_KEY..."
try {
    $envVars = Invoke-RestMethod -Uri "$apiUrl/__admin/env-vars" -Method Get -Headers @{ "x-verify-key" = "temp-verify-123" }
    $seedKey = $envVars.SEED_KEY
    
    if (-not $seedKey) {
        Write-Warning "SEED_KEY not found in Railway environment."
        Write-Host "Please add 'SEED_KEY' to Railway variables."
        Write-Host "Available Keys: $($envVars.keys -join ', ')"
    }
    else {
        Write-Host "SEED_KEY Found: $seedKey"
        
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
                # Need Supabase URL/Key for login or use API?
                # Using known auth endpoint if available, but backend helper uses Supabase client.
                # Use public Supabase URL/Key if I have them locally in .env?
                # I'll rely on local .env for login helper
                
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
    }
}
catch {
    Write-Error "Backdoor check failed: $_"
}
