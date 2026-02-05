$url = "https://jobspeak-backend-production.up.railway.app/api/affiliate/apply"
$headers = @{ "Content-Type" = "application/json" }

function Submit-Affiliate($email, $name) {
    $body = @{
        name = $name
        email = $email
        country = "US"
        primaryPlatform = "YouTube"
        audienceSize = "10k"
        payoutPreference = "PayPal"
        payoutDetails = "test@paypal.com"
    } | ConvertTo-Json

    Write-Host "$(Get-Date): Submitting for $email..."
    try {
        $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body -ErrorAction Stop
        Write-Host "Success: $($response | ConvertTo-Json -Depth 1)"
    } catch {
        Write-Host "Error: $_"
    }
}

# 1. doscbabi@gmail.com
Submit-Affiliate "doscbabi@gmail.com" "Doscbabi Spaced Test"

Write-Host "Waiting 3 minutes..."
Start-Sleep -Seconds 180

# 2. bradleywins025@gmail.com
Submit-Affiliate "bradleywins025@gmail.com" "Bradley Spaced Test"

Write-Host "Waiting 3 minutes..."
Start-Sleep -Seconds 180

# 3. berry1million2026@gmail.com
Submit-Affiliate "berry1million2026@gmail.com" "Berry Spaced Test"

Write-Host "Waiting 3 minutes..."
Start-Sleep -Seconds 180

# 4. remakaf415@ixunbo.com
Submit-Affiliate "remakaf415@ixunbo.com" "Remakaf Spaced Test"

Write-Host "$(Get-Date): Test Sequence Complete."
