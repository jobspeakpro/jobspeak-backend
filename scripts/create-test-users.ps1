# Create Pre-Confirmed Test Users (PowerShell Alternative)
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

Write-Host "🔧 Creating pre-confirmed test users..." -ForegroundColor Cyan
Write-Host ""

$testUsers = @(
    @{
        email    = "qa1@jobspeakpro.test"
        password = "TestPassword123!"
        metadata = @{ role = "qa_test_user" }
    },
    @{
        email    = "qa2@jobspeakpro.test"
        password = "TestPassword123!"
        metadata = @{ role = "qa_test_user" }
    }
)

foreach ($user in $testUsers) {
    try {
        $body = @{
            email         = $user.email
            password      = $user.password
            email_confirm = $true
            user_metadata = $user.metadata
        } | ConvertTo-Json

        $headers = @{
            "apikey"        = $supabaseServiceRole
            "Authorization" = "Bearer $supabaseServiceRole"
            "Content-Type"  = "application/json"
        }

        $response = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/admin/users" `
            -Method POST `
            -Headers $headers `
            -Body $body

        Write-Host "✅ Created: $($user.email)" -ForegroundColor Green
        Write-Host "   User ID: $($response.id)" -ForegroundColor Gray
        Write-Host "   Email Confirmed: $(if ($response.email_confirmed_at) { 'YES' } else { 'NO' })" -ForegroundColor Gray
        Write-Host "   Password: $($user.password)" -ForegroundColor Gray
        Write-Host ""
    }
    catch {
        Write-Host "❌ Failed to create $($user.email): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "✅ Test user creation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now login with:" -ForegroundColor Cyan
foreach ($user in $testUsers) {
    Write-Host "  Email: $($user.email)" -ForegroundColor Gray
    Write-Host "  Password: $($user.password)" -ForegroundColor Gray
    Write-Host ""
}
