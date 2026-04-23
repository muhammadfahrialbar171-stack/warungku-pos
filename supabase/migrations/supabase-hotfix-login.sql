-- =============================================
-- HOTFIX: Fix Login - Perbaiki Users RLS Policy
-- Jalankan SQL ini SEGERA di Supabase SQL Editor
-- =============================================

-- Masalah: Policy "Users can view team profiles" menggunakan subquery
-- yang membaca tabel users sendiri, menyebabkan recursive RLS evaluation
-- dan membuat login gagal.

-- Solusi: Buat helper function SECURITY DEFINER (bypass RLS) untuk ambil owner_id

CREATE OR REPLACE FUNCTION public.get_my_owner_id()
RETURNS UUID AS $$
  SELECT owner_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop policy yang bermasalah
DROP POLICY IF EXISTS "Users can view team profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

-- Buat ulang policy yang aman (tanpa recursive subquery)
CREATE POLICY "Users can view own and owner profile" ON public.users
FOR SELECT
USING (
  auth.uid() = id
  OR id = public.get_my_owner_id()
);

-- Pastikan policy INSERT dan UPDATE masih ada
-- (mungkin terhapus jika migration v14 dijalankan parsial)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users 
FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users 
FOR INSERT WITH CHECK (auth.uid() = id);
