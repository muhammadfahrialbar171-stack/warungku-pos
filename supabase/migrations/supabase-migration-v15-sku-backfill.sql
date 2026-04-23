-- =============================================
-- Migration V15: Backfill SKU untuk Produk yang Sudah Ada
-- Jalankan SQL ini di Supabase SQL Editor
-- =============================================

-- 1. Backfill SKU pada produk yang belum memiliki SKU
-- Format: SKU-{id padded to 6 digits}
UPDATE public.products
SET sku = 'SKU-' || LPAD(id::TEXT, 6, '0')
WHERE sku IS NULL OR sku = '';

-- 2. Tambah unique constraint pada kombinasi (user_id, sku)
-- Ini mencegah duplikasi SKU dalam satu toko
-- Gunakan CREATE UNIQUE INDEX karena lebih toleran jika constraint sudah ada
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_user_sku_unique
ON public.products(user_id, sku)
WHERE sku IS NOT NULL AND sku != '';

-- 3. Verifikasi: Cek produk yang masih tanpa SKU (seharusnya 0)
-- SELECT count(*) FROM public.products WHERE sku IS NULL OR sku = '';
