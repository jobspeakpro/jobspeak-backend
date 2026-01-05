# Deploy "Heard About Us" Feature

## Step 1: Apply Database Migration

1. Open Supabase SQL Editor:
   https://supabase.com/dashboard/project/wlxacpqlokoiqqhgaads/sql/new

2. Paste and run this SQL:
   ```sql
   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heard_about_us TEXT;
   ```

3. Verify the migration:
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'profiles' AND column_name = 'heard_about_us';
   ```

   Expected result: One row showing `heard_about_us | text | YES`

## Step 2: Deploy Backend Code

The code changes are already committed. Railway will auto-deploy when you push:

```bash
git push
```

Wait for Railway deployment to complete (~2-3 minutes).

## Step 3: Verify Deployment

Run the verification script:

```bash
node verify_heard_about_column.js
```

Expected output: `✅ Column already exists!`

## Step 4: Test with Production Users

Run the comprehensive test:

```bash
node verify_heard_about_endpoint.js
```

This will test with jsp.qa.001 and jsp.qa.002 to confirm write-once behavior.
