$supabaseUrl = "https://wlxacpqlokoiqqhgaads.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndseGFjcHFsb2tvaXFxaGdhYWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY4OTExNywiZXhwIjoyMDgyMjY1MTE3fQ.W77uE7U-MgtmLnC7Yuv9x9gO3ezJvvC6CtzJ1UjeMcQ"

$headers = @{
    "apikey"        = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
}

try {
    Write-Host "Querying Supabase..."
    $row = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/affiliate_applications?select=*&order=created_at.desc&limit=1" -Method Get -Headers $headers
    $rowText = $row | ConvertTo-Json -Depth 5
    $rowText | Out-File "docs\proofs\2026-01-27_mailersend_final\db_latest_row_mailersend_status_prod.txt"
    Write-Host "Latest Row:"
    Write-Host $rowText
}
catch {
    Write-Error "Supabase query failed: $_"
    exit 1
}
