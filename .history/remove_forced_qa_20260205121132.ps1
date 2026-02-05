# Remove hardcoded FORCED_QA_MODE and replace with safe QA mode check

$file = "routes\mockInterview.js"
$content = Get-Content $file -Raw -Encoding UTF8

# Pattern 1: /qa-mode endpoint (lines 620-635)
$pattern1 = @'
// GET /api/qa-mode - Frontend detection endpoint \(no auth required\)
router\.get\("/qa-mode", \(req, res\) => \{
    // ⚠️⚠️⚠️ TEMPORARY FORCED QA MODE - 24 HOUR TESTING WINDOW ⚠️⚠️⚠️
    // TODO: REVERT AFTER QA PASSES
    const FORCED_QA_MODE = true; // HARDCODED FOR TESTING - REMOVE AFTER QA
    
    if \(FORCED_QA_MODE\) \{
        console\.log\('🚨🚨🚨 \[FORCED QA MODE\] Auth bypass ENABLED - TEMPORARY TESTING ONLY 🚨🚨🚨'\);
        console\.log\('\[FORCED QA MODE\] This should be reverted after QA testing is complete'\);
    \}
    
    const qaMode = FORCED_QA_MODE \|\| process\.env\.MOCK_INTERVIEW_QA_MODE === 'true';
    return res\.json\(\{
        enabled: qaMode
    \}\);
\}\);
'@

$replacement1 = @'
// GET /api/qa-mode - Frontend detection endpoint (no auth required)
router.get("/qa-mode", (req, res) => {
    // SAFE QA MODE: Only enabled in non-production with env var
    const qaMode = (
        process.env.MOCK_INTERVIEW_QA_MODE === 'true' &&
        process.env.NODE_ENV !== 'production'
    );
    
    if (qaMode) {
        console.log('[QA MODE] ⚠️  QA mode active - non-production only');
    }
    
    return res.json({
        enabled: qaMode
    });
});
'@

Write-Host "Replacing /qa-mode endpoint..." -ForegroundColor Yellow
$content = $content -replace $pattern1, $replacement1

# Save the file
$content | Set-Content $file -Encoding UTF8 -NoNewline

Write-Host "✅ Removed hardcoded FORCED_QA_MODE from /qa-mode endpoint" -ForegroundColor Green
Write-Host "Now manually update the /answer endpoint (line 828)..." -ForegroundColor Yellow
