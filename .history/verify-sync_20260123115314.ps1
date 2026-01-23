# verify-sync.ps1
# Verifies:
# 1. Guest Tracking
# 2. Dual Identity Querying (User ID + Guest Key)
# 3. Activity Sync (Guest -> User)

$BaseUrl = "http://localhost:3000"
$GuestKey = "guest-verify-" + (Get-Random)
$UserId = "user-verify-" + (Get-Random) # Fake UUID for test
# Fake JWT (no signature verification in dev/local usually or simplistic decode used in activity.js)
# Payload: {"sub": $UserId, "user_id": $UserId}
$PayloadJson = @{ sub = $UserId; user_id = $UserId } | ConvertTo-Json -Compress
$PayloadB64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($PayloadJson))
$FakeJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.$PayloadB64.fake-signature"

function Test-Endpoint {
    param($Name, $Method, $Uri, $Headers, $Body, $QueryUserKey)
    Write-Host "[$Name] $Method $Uri (UserKey=$QueryUserKey)" -ForegroundColor Cyan
    
    $Url = "$BaseUrl$Uri"
    if ($QueryUserKey) { $Url += "?userKey=$QueryUserKey" }

    try {
        $params = @{
            Method      = $Method
            Uri         = $Url
            Headers     = $Headers
            ContentType = "application/json"
        }
        if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10) }
        
        $response = Invoke-RestMethod @params
        return $response
    }
    catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader $_.Exception.Response.GetResponseStream()
            Write-Host "Response Body: $($reader.ReadToEnd())" -ForegroundColor Red
        }
        return $null
    }
}

# 1. Start Activity as Guest
Write-Host "`n--- 1. TRACK ACTIVITY AS GUEST ---" -ForegroundColor Yellow
$Start = Test-Endpoint "Start Guest" "POST" "/api/activity/start" `
@{ "x-guest-key" = $GuestKey } `
@{ activityType = "practice"; context = @{ test = "sync-verify" } } 

if ($Start.ok) { Write-Host "Activity Tracked: $($Start.id)" -ForegroundColor Green }
else { Write-Host "Failed to track activity" -ForegroundColor Red; exit }

Start-Sleep -Seconds 1

# 2. Check Dashboard as Guest (Should see it)
Write-Host "`n--- 2. CHECK DASHBOARD AS GUEST ---" -ForegroundColor Yellow
$DashGuest = Test-Endpoint "Dash Guest" "GET" "/api/dashboard/summary" @{} $null $GuestKey

if ($DashGuest.recentActivity.Length -ge 1) { 
    Write-Host "Success: Guest sees activity" -ForegroundColor Green
    Write-Host "Debug: $($DashGuest.debug.identityKey)" -ForegroundColor Gray
}
else { 
    Write-Host "Failure: Guest cannot see activity" -ForegroundColor Red 
}

# 3. Check Dashboard as User (Should NOT see it yet)
Write-Host "`n--- 3. CHECK DASHBOARD AS USER (PRE-SYNC) ---" -ForegroundColor Yellow
$DashUser = Test-Endpoint "Dash User" "GET" "/api/dashboard/summary" @{} $null $UserId

if ($DashUser.recentActivity.Length -eq 0) { 
    Write-Host "Success: User does not see activity yet" -ForegroundColor Green 
}
else { 
    Write-Host "Failure: User sees activity unexpectedly" -ForegroundColor Red
    Write-Host "Debug: $($DashUser.debug.identityKey)" -ForegroundColor Gray
}

# 4. Check Dashboard Dual Query (User + Guest Header) (Should see it)
Write-Host "`n--- 4. CHECK DASHBOARD DUAL QUERY ---" -ForegroundColor Yellow
$DashDual = Test-Endpoint "Dash Dual" "GET" "/api/dashboard/summary" `
@{ "x-guest-key" = $GuestKey } $null $UserId

if ($DashDual.recentActivity.Length -ge 1) { 
    Write-Host "Success: Dual Query sees activity" -ForegroundColor Green
    Write-Host "Debug IDs: userId=$($DashDual.debug.userId) guestKey=$($DashDual.debug.guestKeyFromHeader)" -ForegroundColor Gray
    Write-Host "Counts: Combined=$($DashDual.debug.activityCountCombined)" -ForegroundColor Gray
}
else {
    Write-Host "Failure: Dual Query failed to find activity" -ForegroundColor Red 
}

# 5. Sync Activity
Write-Host "`n--- 5. SYNC ACTIVITY ---" -ForegroundColor Yellow
$Sync = Test-Endpoint "Sync" "POST" "/api/activity/sync" `
@{ "Authorization" = "Bearer $FakeJwt"; "x-guest-key" = $GuestKey } $null

if ($Sync.ok -and $Sync.synced -ge 1) {
    Write-Host "Success: Synced $($Sync.synced) events" -ForegroundColor Green
}
else {
    Write-Host "Failure: Sync failed" -ForegroundColor Red
    exit
}

# 6. Check Dashboard as User (After Sync) (Should see it now without header)
Write-Host "`n--- 6. CHECK DASHBOARD AS USER (POST-SYNC) ---" -ForegroundColor Yellow
$DashUserPost = Test-Endpoint "Dash User Post" "GET" "/api/dashboard/summary" @{} $null $UserId

if ($DashUserPost.recentActivity.Length -ge 1) { 
    Write-Host "Success: User sees activity after sync" -ForegroundColor Green
    Write-Host "Debug: $($DashUserPost.debug.identityKey)" -ForegroundColor Gray
}
else { 
    Write-Host "Failure: User cannot see activity after sync" -ForegroundColor Red 
}

# 7. Progress Endpoint Check
Write-Host "`n--- 7. CHECK PROGRESS ENDPOINT ---" -ForegroundColor Yellow
$Prog = Test-Endpoint "Progress" "GET" "/api/progress" @{} $null $UserId
if ($Prog.activityEvents.Length -ge 1) {
    Write-Host "Success: Progress endpoint sees activity" -ForegroundColor Green
}
else {
    Write-Host "Failure: Progress endpoint missing activity" -ForegroundColor Red
}

Write-Host "`n--- VERIFICATION COMPLETE ---" -ForegroundColor Cyan
