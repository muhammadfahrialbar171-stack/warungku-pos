-- =============================================
-- WarungKu POS - Migration: Diskon & Gambar Produk
-- Jalankan SQL ini di Supabase SQL Editor
-- =============================================

-- 1. Tambah kolom diskon ke tabel products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount INT DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percentage'; -- 'percentage' or 'fixed'

-- 2. Tambah kolom diskon transaksi ke tabel transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS discount_amount INT DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS subtotal INT DEFAULT 0;

-- 3. Buat Storage Bucket untuk gambar produk
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Policy: siapapun bisa lihat gambar (public bucket)
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- 5. Policy: user yang login bisa upload gambar
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- 6. Policy: user yang login bisa update gambar
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
CREATE POLICY "Authenticated users can update product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- 7. Policy: user yang login bisa hapus gambar
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;
CREATE POLICY "Authenticated users can delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
