[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$clientId = "c40eb82a53dd48e8c4b7880eae86690d"
$clientSecret = "b021c05abcd3708e967fc7ce95db4dc0"

# 1. Get Access Token
$tokenUrl = "https://api.sendpulse.com/oauth/access_token"
$tokenBody = @{
    grant_type    = "client_credentials"
    client_id     = $clientId
    client_secret = $clientSecret
}

try {
    Write-Host "Requesting Access Token..."
    $tokenResponse = Invoke-RestMethod -Uri $tokenUrl -Method Post -Body $tokenBody
    $accessToken = $tokenResponse.access_token
    
    if (-not $accessToken) {
        Write-Error "No access token in response"
        exit 1
    }
    Write-Host "Access Token Received."
}
catch {
    Write-Error "Failed to get access token: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            Write-Error "Response Body: $($reader.ReadToEnd())"
        }
        catch {}
    }
    exit 1
}

# 2. Send Email
$sendUrl = "https://api.sendpulse.com/smtp/emails"
$headers = @{
    Authorization  = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

# Structure matching sendpulse.js
$emailData = @{
    email = @{
        html    = "<p>This is a verification email from JobSpeakPro PowerShell script.</p>"
        text    = "This is a verification email from JobSpeakPro PowerShell script."
        subject = "JobSpeakPro SendPulse Verification"
        from    = @{
            name  = "JobSpeakPro Verification"
            email = "jobspeakpro@gmail.com"
        }
        to      = @(
            @{
                email = "jobspeakpro@gmail.com"
            }
        )
    }
}

$jsonBody = $emailData | ConvertTo-Json -Depth 10

try {
    Write-Host "Sending Email to jobspeakpro@gmail.com..."
    $sendResponse = Invoke-RestMethod -Uri $sendUrl -Method Post -Headers $headers -Body $jsonBody
    
    Write-Host "Response received."
    $sendResponse | ConvertTo-Json
    
    if ($sendResponse.result -eq $true) {
        Write-Host "SUCCESS: Email sent successfully."
    }
    else {
        Write-Error "FAILED: Email not sent."
        $sendResponse | ConvertTo-Json
    }
}
catch {
    Write-Error "Failed to send email: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            Write-Error "Response Body: $($reader.ReadToEnd())"
        }
        catch {}
    }
    exit 1
}
