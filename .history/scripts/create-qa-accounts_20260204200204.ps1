# Create 20 QA Accounts with Password Reset Links (PowerShell)
# DO NOT DEPLOY THIS AS A PUBLIC ENDPOINT
# Run locally only for QA setup

$ErrorActionPreference = "Stop"

# Load environment variables
$envFile = Join-Path $PSScriptRoot ".." ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
        }
    }
}

$supabaseUrl = $env:SUPABASE_URL
$supabaseServiceRole = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $supabaseUrl -or -not $supabaseServiceRole) {
    Write-Host "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Red
    exit 1
}

Write-Host "🔧 Creating 20 QA accounts with password reset links..." -ForegroundColor Cyan
Write-Host ""

$results = @()

for ($i = 1; $i -le 20; $i++) {
    $num = $i.ToString("00")
    $email = "qa$num@jobspeakpro.test"
    
    try {
        # Create user
        $createBody = @{
            email         = $email
            email_confirm = $true
            user_metadata = @{
                role           = "qa_test_user"
                account_number = $num
            }
        } | ConvertTo-Json

        $headers = @{
            "apikey"        = $supabaseServiceRole
            "Authorization" = "Bearer $supabaseServiceRole"
            "Content-Type"  = "application/json"
        }

        $createResponse = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/admin/users" `
            -Method POST `
            -Headers $headers `
            -Body $createBody

        $userId = $createResponse.id

        # Generate password reset link
        $resetBody = @{
            type  = "recovery"
            email = $email
        } | ConvertTo-Json

        $resetResponse = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/admin/generate_link" `
            -Method POST `
            -Headers $headers `
            -Body $resetBody

        $resetLink = $resetResponse.properties.action_link

        Write-Host "✅ Created: $email" -ForegroundColor Green
        Write-Host "   User ID: $userId" -ForegroundColor Gray
        Write-Host "   Reset Link: $resetLink" -ForegroundColor Gray
        Write-Host ""

        $results += [PSCustomObject]@{
            Email     = $email
            ResetLink = $resetLink
            Status    = "SUCCESS"
        }
    }
    catch {
        Write-Host "❌ Failed to create $email : $($_.Exception.Message)" -ForegroundColor Red
        $results += [PSCustomObject]@{
            Email     = $email
            ResetLink = "N/A"
            Status    = "FAILED"
        }
    }
}

# Export to CSV
$csvPath = "qa-accounts.csv"
$results | Export-Csv -Path $csvPath -NoTypeInformation

Write-Host ""
Write-Host "✅ QA account creation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📄 CSV file saved: $csvPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Successful accounts: $($results | Where-Object { $_.Status -eq 'SUCCESS' } | Measure-Object | Select-Object -ExpandProperty Count)/20" -ForegroundColor Gray
Write-Host ""
Write-Host "QA can now:" -ForegroundColor Cyan
Write-Host "1. Click their reset link" -ForegroundColor Gray
Write-Host "2. Set their own password" -ForegroundColor Gray
Write-Host "3. Login with email + password" -ForegroundColor Gray

