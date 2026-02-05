Write-Host "=== TTS Voice Mapping Verification ===" -ForegroundColor Cyan
Write-Host ""

# Wait for deployment
Write-Host "Waiting 45 seconds for Railway deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 45

$voices = @(
    @{ id = "us_female_emma"; text = "Hello, I am Emma, a US female voice" },
    @{ id = "us_female_ava"; text = "Hello, I am Ava, another US female voice" },
    @{ id = "us_male_jake"; text = "Hello, I am Jake, a US male voice" },
    @{ id = "us_male_noah"; text = "Hello, I am Noah, another US male voice" },
    @{ id = "uk_female_emma"; text = "Hello, I am Emma, a UK female voice" },
    @{ id = "uk_male_oliver"; text = "Hello, I am Oliver, a UK male voice" }
)

$results = @()

foreach ($voice in $voices) {
    Write-Host "[Testing] $($voice.id)..." -ForegroundColor Yellow
    
    try {
        $body = @{ 
            text    = $voice.text
            voiceId = $voice.id
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "https://jobspeakpro.com/api/tts" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $body
        
        if ($response.ok -eq $true) {
            Write-Host "  ✓ Success" -ForegroundColor Green
            Write-Host "    Provider: $($response.provider)" -ForegroundColor Gray
            Write-Host "    VoiceIdOrName: $($response.voiceIdOrName)" -ForegroundColor Gray
            Write-Host "    AudioURL length: $($response.audioUrl.Length) chars" -ForegroundColor Gray
            
            $results += @{
                voice         = $voice.id
                ok            = $true
                provider      = $response.provider
                voiceIdOrName = $response.voiceIdOrName
                audioLength   = $response.audioUrl.Length
            }
        }
        else {
            Write-Host "  ✗ Failed: $($response.error)" -ForegroundColor Red
            $results += @{
                voice = $voice.id
                ok    = $false
                error = $response.error
            }
        }
    }
    catch {
        Write-Host "  ✗ Request failed: $($_.Exception.Message)" -ForegroundColor Red
        $results += @{
            voice = $voice.id
            ok    = $false
            error = $_.Exception.Message
        }
    }
    
    Write-Host ""
}

Write-Host "=== Summary ===" -ForegroundColor Cyan
$successCount = ($results | Where-Object { $_.ok -eq $true }).Count
Write-Host "Successful: $successCount / $($voices.Count)" -ForegroundColor $(if ($successCount -eq $voices.Count) { "Green" } else { "Yellow" })

if ($successCount -eq $voices.Count) {
    Write-Host ""
    Write-Host "✓ All voices returned ok:true with audioUrl" -ForegroundColor Green
    Write-Host "✓ Provider: $($results[0].provider)" -ForegroundColor Green
    Write-Host ""
    Write-Host "NEXT: Test https://jobspeakpro.com/practice onboarding" -ForegroundColor Yellow
}
else {
    Write-Host ""
    Write-Host "Some voices failed. Check errors above." -ForegroundColor Red
}
