# Test all 7 voices for distinctness
Write-Host "=== Testing All 7 Voices for Distinctness ===" -ForegroundColor Cyan
Write-Host "Waiting 45 seconds for Railway deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 45
Write-Host ""

$testText = "This is a voice preview."
$voices = @(
    @{ name = "Onboarding (default)"; voiceId = "" },
    @{ name = "US Female Emma"; voiceId = "us_female_emma" },
    @{ name = "US Female Ava"; voiceId = "us_female_ava" },
    @{ name = "US Male Jake"; voiceId = "us_male_jake" },
    @{ name = "US Male Noah"; voiceId = "us_male_noah" },
    @{ name = "UK Female Emma"; voiceId = "uk_female_emma" },
    @{ name = "UK Male Oliver"; voiceId = "uk_male_oliver" }
)

$results = @()

foreach ($voice in $voices) {
    Write-Host "Testing: $($voice.name)..." -ForegroundColor Yellow
    
    $body = @{ text = $testText; voiceId = $voice.voiceId } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "https://jobspeakpro.com/api/tts" -Method POST -Headers @{"Content-Type" = "application/json" } -Body $body
        
        if ($response.ok) {
            Write-Host "  ✓ OK" -ForegroundColor Green
            Write-Host "    Provider: $($response.provider)" -ForegroundColor Gray
            Write-Host "    Requested: $($response.requestedVoiceName)" -ForegroundColor Gray
            Write-Host "    Resolved: $($response.resolvedVoice)" -ForegroundColor Gray
            Write-Host "    Audio length: $($response.audioUrl.Length)" -ForegroundColor Gray
            
            $results += @{
                name        = $voice.name
                ok          = $true
                provider    = $response.provider
                requested   = $response.requestedVoiceName
                resolved    = $response.resolvedVoice
                audioLength = $response.audioUrl.Length
            }
        }
        else {
            Write-Host "  ✗ FAILED: $($response.error)" -ForegroundColor Red
            $results += @{ name = $voice.name; ok = $false; error = $response.error }
        }
    }
    catch {
        Write-Host "  ✗ ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $results += @{ name = $voice.name; ok = $false; error = $_.Exception.Message }
    }
    
    Write-Host ""
}

Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan
$successCount = ($results | Where-Object { $_.ok -eq $true }).Count
Write-Host "Successful: $successCount / $($voices.Count)" -ForegroundColor $(if ($successCount -eq $voices.Count) { "Green" } else { "Red" })

if ($successCount -eq $voices.Count) {
    $resolvedVoices = $results | ForEach-Object { $_.resolved }
    $uniqueVoices = $resolvedVoices | Select-Object -Unique
    
    Write-Host ""
    Write-Host "Resolved voices:" -ForegroundColor Cyan
    foreach ($r in $results) {
        Write-Host "  $($r.name): $($r.resolved)" -ForegroundColor Gray
    }
    
    Write-Host ""
    if ($uniqueVoices.Count -eq $resolvedVoices.Count) {
        Write-Host "✓ ALL VOICES ARE DISTINCT!" -ForegroundColor Green
    }
    else {
        Write-Host "✗ DUPLICATE VOICES DETECTED!" -ForegroundColor Red
        Write-Host "  Unique: $($uniqueVoices.Count) / Total: $($resolvedVoices.Count)" -ForegroundColor Red
    }
    
    # Check onboarding is female
    $onboarding = $results | Where-Object { $_.name -eq "Onboarding (default)" }
    if ($onboarding.resolved -eq "shimmer") {
        Write-Host "✓ Onboarding uses SHIMMER (clearly female)" -ForegroundColor Green
    }
    else {
        Write-Host "✗ Onboarding NOT using shimmer: $($onboarding.resolved)" -ForegroundColor Red
    }
}
