# verify_production_fixes.ps1
$ErrorActionPreference = "Stop"

function Test-PrivacyPage {
    Write-Host "Checking Privacy Page..."
    try {
        $response = Invoke-WebRequest -Uri "https://jobspeakpro.com/privacy" -Method Get
        $content = $response.Content
        
        # Check for the specific "n" before "UniversalHeader" or at start of body logic
        # Since we can't see the react code, we look for "n<div" or similar patterns if it rendered to HTML
        # OR just check if the text "n" appears in a suspicious place. 
        # A simple check: does the body start with "n"?
        
        if ($content -match ">n<") {
            Write-Warning "Potentially found the stray 'n' character in HTML."
            return $false
        }
        
        Write-Host "Privacy Page HTTP Status: $($response.StatusCode)"
        return $true
    }
    catch {
        Write-Error "Failed to fetch Privacy Page: $_"
        return $false
    }
}

function Test-ContactForm {
    Write-Host "Sending Contact Form Test..."
    $url = "https://jobspeakpro.com/api/support/contact" 
    # Note: We need to know the actual API endpoint the form POSTs to. 
    # Based on earlier review, it is /api/support/contact
    
    $body = @{
        name    = "Antigravity Test Agent"
        email   = "antigravity-verification@jobspeakpro.com"
        subject = "Admin Dashboard Verification Test"
        message = "This message was sent by the AI agent to verify it appears in the Admin Dashboard. Current Time: $(Get-Date)"
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
        Write-Host "Form Submission Success!"
        Write-Host "Response: $($response | ConvertTo-Json -Depth 2)"
        return $true
    }
    catch {
        Write-Error "Failed to submit contact form: $_"
        return $false
    }
}

# Run Tests
$privacyPass = Test-PrivacyPage
$contactPass = Test-ContactForm

Write-Host "--------------------------------------------------"
Write-Host "Privacy Page Check Passed: $privacyPass"
Write-Host "Contact Form Check Passed: $contactPass"
Write-Host "--------------------------------------------------"
