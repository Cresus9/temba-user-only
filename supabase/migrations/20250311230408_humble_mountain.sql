/*
  # Add avatar URL to profiles

  1. Changes
    - Add avatar_url column to profiles table
    - Add storage policy for avatars bucket
    - Add trigger to delete old avatar when updated

  2. Security
    - Enable RLS on storage.objects
    - Add policy for avatar uploads
*/

-- Add avatar_url column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('avatars', 'avatars')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (regexp_match(name, '^avatar-([a-f0-9-]+)'))[1]
);

-- Allow public read access to avatars
CREATE POLICY "Public can read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Function to delete old avatar when updated
CREATE OR REPLACE FUNCTION delete_old_avatar()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.avatar_url IS NOT NULL AND OLD.avatar_url != NEW.avatar_url THEN
    -- Extract file name from URL
    PERFORM storage.delete_object(
      'avatars',
      regexp_replace(OLD.avatar_url, '^.*/([^/]+)$', '\1')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to delete old avatar
DROP TRIGGER IF EXISTS delete_old_avatar_trigger ON profiles;
CREATE TRIGGER delete_old_avatar_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url)
  EXECUTE FUNCTION delete_old_avatar();