-- =============================================
-- WarungKu POS - Migration: Store Theme & Logo
-- Jalankan SQL ini di Supabase SQL Editor
-- =============================================

-- 1. Add theme and logo columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS theme_color VARCHAR(50) DEFAULT 'rose',
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Create Storage Bucket for Store Assets
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('store_assets', 'store_assets', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- 3. Set up Storage Policies for 'store_assets' bucket
-- Allow public access to view images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'store_assets' );

-- Allow authenticated users to upload their own store logo
CREATE POLICY "Auth Users Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'store_assets' );

-- Allow authenticated users to update their own store logo
CREATE POLICY "Auth Users Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'store_assets' );

-- Allow authenticated users to delete their own store logo
CREATE POLICY "Auth Users Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'store_assets' );
