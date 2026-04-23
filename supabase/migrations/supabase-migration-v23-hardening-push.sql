-- =============================================
-- Migration V23: API Hardening & Web Push
-- Jalankan SQL ini di Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. RLS HARDENING (Role-Based Restriction)
-- =============================================

-- TUGAS KASIR: Hanya bisa SELECT (view) dan UPDATE (untuk edit profile atau decrement stock)
-- TUGAS OWNER: Bebas (SELECT, INSERT, UPDATE, DELETE)

-- =============================================
-- A. PRODUCTS RLS HARDENING
-- =============================================
-- Hapus policy sebelumnya
DROP POLICY IF EXISTS "Users can manage own products" ON public.products;

-- Ganti dengan policy yang lebih ketat:
-- 1. Semua authorized user bisa SELECT
CREATE POLICY "Authorized can select products" 
ON public.products FOR SELECT 
USING ( public.is_authorized_user(user_id) );

-- 2. Semua authorized user bisa UPDATE (Kasir butuh ini untuk update stok saat checkout)
CREATE POLICY "Authorized can update products" 
ON public.products FOR UPDATE 
USING ( public.is_authorized_user(user_id) );

-- 3. HANYA OWNER yang bisa INSERT
CREATE POLICY "Only owner can insert products" 
ON public.products FOR INSERT 
WITH CHECK ( auth.uid() = user_id );

-- 4. HANYA OWNER yang bisa DELETE
CREATE POLICY "Only owner can delete products" 
ON public.products FOR DELETE 
USING ( auth.uid() = user_id );

-- =============================================
-- B. CATEGORIES RLS HARDENING
-- =============================================
DROP POLICY IF EXISTS "Users can manage own categories" ON public.categories;

CREATE POLICY "Authorized can select categories" 
ON public.categories FOR SELECT 
USING ( public.is_authorized_user(user_id) );

-- Kasir tidak butuh update/insert/delete kategori
CREATE POLICY "Only owner can update categories" 
ON public.categories FOR UPDATE 
USING ( auth.uid() = user_id );

CREATE POLICY "Only owner can insert categories" 
ON public.categories FOR INSERT 
WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Only owner can delete categories" 
ON public.categories FOR DELETE 
USING ( auth.uid() = user_id );

-- =============================================
-- C. CUSTOMERS RLS HARDENING
-- =============================================
DROP POLICY IF EXISTS "Authorized users can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Users can manage own customers" ON public.customers;

-- Kasir butuh lihat, tambah, dan update pelanggan. Tapi tidak boleh HAPUS.
CREATE POLICY "Authorized can select customers" 
ON public.customers FOR SELECT 
USING ( public.is_authorized_user(user_id) );

CREATE POLICY "Authorized can insert customers" 
ON public.customers FOR INSERT 
WITH CHECK ( public.is_authorized_user(user_id) );

CREATE POLICY "Authorized can update customers" 
ON public.customers FOR UPDATE 
USING ( public.is_authorized_user(user_id) );

CREATE POLICY "Only owner can delete customers" 
ON public.customers FOR DELETE 
USING ( auth.uid() = user_id );

-- =============================================
-- 2. PUSH SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Owner bisa manage token miliknya sendiri
CREATE POLICY "Users can manage own push subscriptions" 
ON public.push_subscriptions FOR ALL 
USING ( auth.uid() = user_id );

-- Kasir tidak ada urusan dengan tabel ini.
