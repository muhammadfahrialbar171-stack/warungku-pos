-- =============================================
-- Migration V16: Add min_stock to products
-- Jalankan SQL ini di Supabase SQL Editor
-- =============================================

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 10;
