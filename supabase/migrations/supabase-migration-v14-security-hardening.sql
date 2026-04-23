-- =============================================
-- Migration V14: Security Hardening
-- Jalankan SQL ini di Supabase SQL Editor
-- =============================================

-- =============================================
-- 0. BUAT FUNGSI is_authorized_user() jika belum ada
-- Fungsi ini mengecek apakah current user adalah owner 
-- ATAU cashier yang bekerja di bawah owner tersebut.
-- =============================================
CREATE OR REPLACE FUNCTION public.is_authorized_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  current_owner_id UUID;
BEGIN
  current_user_id := auth.uid();

  -- Jika user itu sendiri (owner)
  IF current_user_id = target_user_id THEN
    RETURN TRUE;
  END IF;

  -- Jika cashier yang bekerja di bawah owner ini
  SELECT owner_id INTO current_owner_id
  FROM public.users
  WHERE id = current_user_id;

  IF current_owner_id = target_user_id THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function untuk ambil owner_id tanpa recursive RLS
CREATE OR REPLACE FUNCTION public.get_my_owner_id()
RETURNS UUID AS $$
  SELECT owner_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- 1. RE-ENABLE RLS pada tabel customers
-- (sebelumnya di-disable oleh migration v9 karena error)
-- =============================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Bersihkan semua policy lama
DROP POLICY IF EXISTS "Team can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Team can update customers" ON public.customers;
DROP POLICY IF EXISTS "Team can view customers" ON public.customers;
DROP POLICY IF EXISTS "Owner can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Users can manage own customers" ON public.customers;
DROP POLICY IF EXISTS "Authorized users can manage customers" ON public.customers;

-- Buat policy baru menggunakan is_authorized_user()
CREATE POLICY "Authorized users can manage customers"
ON public.customers FOR ALL
USING ( public.is_authorized_user(user_id) )
WITH CHECK ( public.is_authorized_user(user_id) );

-- =============================================
-- 2. FIX: Izinkan cashier melihat profile owner-nya
-- Menggunakan SECURITY DEFINER function untuk hindari recursive RLS
-- =============================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view team profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view own and owner profile" ON public.users;

CREATE POLICY "Users can view own and owner profile" ON public.users
FOR SELECT
USING (
  auth.uid() = id
  OR id = public.get_my_owner_id()
);

-- Pastikan INSERT dan UPDATE policy tetap ada
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================
-- 3. Tambah index pada products.sku untuk performa barcode scan
-- =============================================
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
