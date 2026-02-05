# Create 20 QA Accounts with Password Reset Links
# DO NOT DEPLOY - Local admin script only

param()

$ErrorActionPreference = "Stop"

# Load .env
$envPath = Join-Path $PSScriptRoot ".." ".env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
        }
    }
}

$url = $env:SUPABASE_URL
$key = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $url -or -not $key) {
    Write-Host "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Red
    exit 1
}

Write-Host "Creating 20 QA accounts..." -ForegroundColor Cyan
$results = @()

for ($i = 1; $i -le 20; $i++) {
    $num = "{0:D2}" -f $i
    $email = "qa$num@jobspeakpro.test"
    
    try {
        # Create user
        $createBody = @{
            email         = $email
            email_confirm = $true
            user_metadata = @{ role = "qa_test_user" }
        } | ConvertTo-Json -Compress

        $headers = @{
            "apikey"        = $key
            "Authorization" = "Bearer $key"
            "Content-Type"  = "application/json"
        }

        $user = Invoke-RestMethod -Uri "$url/auth/v1/admin/users" -Method POST -Headers $headers -Body $createBody

        # Generate reset link
        $resetBody = @{
            type  = "recovery"
            email = $email
        } | ConvertTo-Json -Compress

        $reset = Invoke-RestMethod -Uri "$url/auth/v1/admin/generate_link" -Method POST -Headers $headers -Body $resetBody

        Write-Host "Created: $email" -ForegroundColor Green
        
        $results += [PSCustomObject]@{
            Email     = $email
            ResetLink = $reset.properties.action_link
            Status    = "SUCCESS"
        }
    }
    catch {
        Write-Host "Failed: $email - $($_.Exception.Message)" -ForegroundColor Red
        $results += [PSCustomObject]@{
            Email     = $email
            ResetLink = "N/A"
            Status    = "FAILED"
        }
    }
}

# Export CSV
$results | Export-Csv -Path "qa-accounts.csv" -NoTypeInformation
Write-Host "`nCSV saved: qa-accounts.csv" -ForegroundColor Green
Write-Host "Success: $($results | Where-Object Status -eq 'SUCCESS' | Measure-Object | Select-Object -ExpandProperty Count)/20" -ForegroundColor Gray
