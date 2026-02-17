
# Execute with portable node
$node = ".\tmp\node_bin\node.exe"

# Start Server
$env:ADMIN_EMAIL = "jobspeakpro@gmail.com"
$env:PORT = "8080"
# Re-enable migration check (it will skip now)
$serverProcess = Start-Process -FilePath $node -ArgumentList "server.js" -PassThru -NoNewWindow -RedirectStandardOutput "server_out.log" -RedirectStandardError "server_err.log"

Write-Host "Waiting for server (30s)..."
Start-Sleep -Seconds 30

Write-Host "Running Verification..."
& $node scripts/verify_contact_endpoint.js

Stop-Process -Id $serverProcess.Id -Force
Write-Host "Server stopped."
Get-Content "server_out.log" -Tail 30
