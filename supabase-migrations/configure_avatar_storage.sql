/*
 * SUPABASE STORAGE: Avatar Bucket Configuration
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open Supabase Dashboard → Storage
 * 2. Create new bucket named "avatars" (if not exists)
 * 3. Open Supabase Dashboard → SQL Editor
 * 4. Paste and run this SQL
 * 
 * WHAT THIS DOES:
 * - Creates "avatars" storage bucket (public access for reading)
 * - Sets RLS policies so users can only upload to their own folder
 * - Allows public read access to all avatars
 * - Enforces user-specific write paths (userId/*)
 */

-- Create avatars bucket (if not exists via UI, this is the SQL equivalent)
-- NOTE: Bucket creation is typically done via Supabase UI, but policies are set via SQL

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload/update their own avatars only
-- Path format: userId/avatar.jpg or userId/avatar.png
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Public read access to all avatars
CREATE POLICY "Public read access to avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE '%avatar%';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Avatar storage policies configured!';
  RAISE NOTICE 'Bucket: avatars (must be created via UI if not exists)';
  RAISE NOTICE 'Upload path format: {userId}/avatar.{ext}';
  RAISE NOTICE 'Public read: enabled';
  RAISE NOTICE 'User write: restricted to own folder';
END $$;
