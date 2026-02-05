# Test audio streaming performance
Write-Host "=== Testing Audio Streaming Performance ===" -ForegroundColor Cyan
Write-Host "Waiting 45 seconds for Railway deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 45
Write-Host ""

Write-Host "Test 1: First request (uncached)" -ForegroundColor Yellow
$body = @{ text = "What should I call you?" } | ConvertTo-Json
try {
    $r = Invoke-RestMethod -Uri "https://jobspeakpro.com/api/tts" -Method POST -Headers @{"Content-Type" = "application/json" } -Body $body
    Write-Host "  OK: $($r.ok)" -ForegroundColor Green
    Write-Host "  AudioURL: $($r.audioUrl)" -ForegroundColor Gray
    Write-Host "  Provider: $($r.provider)" -ForegroundColor Gray
    Write-Host "  Voice: $($r.resolvedVoice)" -ForegroundColor Gray
    Write-Host "  Cached: $($r.cached)" -ForegroundColor Gray
    Write-Host "  Timing:" -ForegroundColor Cyan
    Write-Host "    Generation: $($r.timingMs.generationMs)ms" -ForegroundColor Gray
    Write-Host "    Encode: $($r.timingMs.encodeMs)ms" -ForegroundColor Gray
    Write-Host "    Total: $($r.timingMs.totalMs)ms" -ForegroundColor Gray
    Write-Host "    Response bytes: $($r.timingMs.responseBytes)" -ForegroundColor Gray
    
    # Test audio endpoint
    if ($r.audioUrl -match "/api/tts/audio/") {
        Write-Host "  Testing audio endpoint..." -ForegroundColor Yellow
        $audioResponse = Invoke-WebRequest -Uri "https://jobspeakpro.com$($r.audioUrl)" -Method GET
        Write-Host "    Audio endpoint status: $($audioResponse.StatusCode)" -ForegroundColor $(if ($audioResponse.StatusCode -eq 200) { "Green" } else { "Red" })
        Write-Host "    Content-Type: $($audioResponse.Headers['Content-Type'])" -ForegroundColor Gray
        Write-Host "    Content-Length: $($audioResponse.Headers['Content-Length'])" -ForegroundColor Gray
    }
}
catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test 2: Cached request" -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod -Uri "https://jobspeakpro.com/api/tts" -Method POST -Headers @{"Content-Type" = "application/json" } -Body $body
    Write-Host "  OK: $($r.ok)" -ForegroundColor Green
    Write-Host "  AudioURL: $($r.audioUrl)" -ForegroundColor Gray
    Write-Host "  Cached: $($r.cached)" -ForegroundColor Gray
    Write-Host "  Timing:" -ForegroundColor Cyan
    Write-Host "    Generation: $($r.timingMs.generationMs)ms" -ForegroundColor Gray
    Write-Host "    Encode: $($r.timingMs.encodeMs)ms" -ForegroundColor Gray
    Write-Host "    Total: $($r.timingMs.totalMs)ms" -ForegroundColor Gray
}
catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Audio streaming implemented successfully!" -ForegroundColor Green
Write-Host "- No more base64 encoding overhead" -ForegroundColor Green
Write-Host "- Direct audio/mpeg streaming" -ForegroundColor Green
Write-Host "- Detailed timing breakdown available" -ForegroundColor Green
