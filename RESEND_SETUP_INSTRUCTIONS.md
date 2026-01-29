# Resend Setup Instructions

## 1. Create Resend API Key

1. Go to https://resend.com/login
2. Navigate to API Keys
3. Create new API key named: `jobspeakpro-backend`
4. Copy the API key value

## 2. Verify Sender Email

1. In Resend dashboard, go to Domains/Senders
2. Add sender email: `jobspeakpro@gmail.com`
3. Complete verification (check Gmail for verification email)
4. Confirm sender is verified

## 3. Configure Railway Environment Variables

Add these variables in Railway dashboard:

```
RESEND_API_KEY=<paste_api_key_here>
RESEND_FROM_EMAIL=jobspeakpro@gmail.com
ADMIN_EMAIL=jobspeakpro@gmail.com
```

## 4. Verification

After deployment, run:
```powershell
.\verify_proof.ps1
```

This will:
- Create 3 test users
- Test referral claim flow
- Verify referral history shows 3 rows
- Submit affiliate application
- Verify Resend email status in DB
