-- =============================================
-- Migration V17: Supabase Storage Configuration
-- Jalankan SQL ini di Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. Create 'product-images' bucket
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880, -- 5 MB (5 * 1024 * 1024)
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================
-- 2. Setup Storage Policies
-- =============================================

-- Drop existing policies if they exist to allow safe re-running
DROP POLICY IF EXISTS "Public Access for product-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Allow public read access to product-images
CREATE POLICY "Public Access for product-images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- Allow authenticated users to upload to product-images
CREATE POLICY "Authenticated users can upload to product-images"
ON storage.objects FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated' AND
    bucket_id = 'product-images'
);

-- Allow users to update their own images
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
USING (
    auth.role() = 'authenticated' AND
    bucket_id = 'product-images' AND
    owner = auth.uid()
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (
    auth.role() = 'authenticated' AND
    bucket_id = 'product-images' AND
    owner = auth.uid()
);
