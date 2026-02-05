Write-Host "=== TTS Production Verification ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "[1/3] Testing health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "https://jobspeakpro.com/api/health" -Method GET
    Write-Host "✓ Backend is online" -ForegroundColor Green
    Write-Host "  Version: $($health.version)" -ForegroundColor Gray
}
catch {
    Write-Host "✗ Backend health check failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: TTS Endpoint
Write-Host "[2/3] Testing TTS endpoint..." -ForegroundColor Yellow
try {
    $body = @{ text = "Production verification test"; voiceName = "female" } | ConvertTo-Json
    $tts = Invoke-RestMethod -Uri "https://jobspeakpro.com/api/tts" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $body
    
    if ($tts.ok -eq $true) {
        Write-Host "✓ TTS returned ok:true" -ForegroundColor Green
        Write-Host "  Provider: $($tts.provider)" -ForegroundColor Gray
        Write-Host "  Voice: $($tts.voice)" -ForegroundColor Gray
        Write-Host "  AudioURL length: $($tts.audioUrl.Length) chars" -ForegroundColor Gray
        
        if ($tts.audioUrl -match "^data:audio/mpeg;base64,") {
            Write-Host "✓ Valid audio data URI format" -ForegroundColor Green
        }
        else {
            Write-Host "✗ Invalid audio URL format" -ForegroundColor Red
        }
    }
    else {
        Write-Host "✗ TTS returned ok:false" -ForegroundColor Red
        Write-Host "  Error: $($tts.error)" -ForegroundColor Red
        Write-Host "  Details: $($tts.details | ConvertTo-Json)" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "✗ TTS request failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 3: Different Voice
Write-Host "[3/3] Testing voice switching..." -ForegroundColor Yellow
try {
    $body2 = @{ text = "Testing male voice"; voiceName = "male" } | ConvertTo-Json
    $tts2 = Invoke-RestMethod -Uri "https://jobspeakpro.com/api/tts" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $body2
    
    if ($tts2.ok -eq $true) {
        Write-Host "✓ Male voice TTS successful" -ForegroundColor Green
        Write-Host "  Provider: $($tts2.provider)" -ForegroundColor Gray
    }
    else {
        Write-Host "✗ Male voice TTS failed" -ForegroundColor Red
    }
}
catch {
    Write-Host "✗ Voice switching test failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Verification Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT STEP: Test https://jobspeakpro.com/practice in browser" -ForegroundColor Yellow
Write-Host "- Confirm onboarding girl speaks audibly" -ForegroundColor Gray
Write-Host "- Try switching voices and confirm they sound different" -ForegroundColor Gray
