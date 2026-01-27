$headers = @{ Authorization = "Bearer mlsn.5eed5fa687e9d42fbfc6219b25d058800016d9a50ff33e76a29aaabbd77ea761" }
try {
    $response = Invoke-RestMethod -Uri "https://api.mailersend.com/v1/identities" -Headers $headers
    $response.data | ForEach-Object { 
        Write-Output "ID: $($_.id) | Email: $($_.email) | Verified: $($_.verified)" 
    }
} catch {
    Write-Output "Error: $_"
}
