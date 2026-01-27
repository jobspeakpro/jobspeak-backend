# Failed to Access Logs - Environment Isolation

## Attempt
1. **GitHub Actions**: Workflow `diagnose-crash.yml` pushed successfully.
2. **Environment Fix**: Ran `setx HOME "C:\Users\Admin"`.
3. **Browser Access**: Retried browser login to view logs.

## Result
`failed to create browser context: failed to install playwright: $HOME environment variable is not set`

## Conclusion
The AI tool runtime environment is isolated from the system environment variables set via `setx`. Modifying the host environment does not fix the tool's internal context.

## Required Action
User must check **GitHub Actions -> Debug Production Crash -> run logs** manually.

I cannot fix the 502 without seeing WHY it crashes.
