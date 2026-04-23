-- =============================================
-- Migration V18: Fix Storage Buckets
-- Jalankan SQL ini di Supabase SQL Editor
-- https://supabase.com/dashboard → SQL Editor
-- =============================================

-- 1. Buat bucket 'product-images' (untuk foto produk & logo toko)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[];

-- 2. Drop policy lama jika ada (aman untuk di-rerun)
DROP POLICY IF EXISTS "Public Access for product-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- 3. Izinkan SEMUA orang membaca gambar (public)
CREATE POLICY "Public Access for product-images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- 4. Izinkan user login mengunggah gambar
CREATE POLICY "Authenticated users can upload to product-images"
ON storage.objects FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated' AND
    bucket_id = 'product-images'
);

-- 5. Izinkan user memperbarui file miliknya sendiri
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
USING (
    auth.role() = 'authenticated' AND
    bucket_id = 'product-images'
);

-- 6. Izinkan user menghapus file miliknya sendiri
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (
    auth.role() = 'authenticated' AND
    bucket_id = 'product-images'
);

-- Selesai! Coba upload logo di Pengaturan sekarang.
