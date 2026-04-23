-- =============================================
-- EMERGENCY FIX: Restore Login
-- Jalankan SATU PER SATU di Supabase SQL Editor
-- =============================================

-- LANGKAH 1: Hapus semua policy users yang bermasalah
DROP POLICY IF EXISTS "Users can view team profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view own and owner profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

-- LANGKAH 2: Buat ulang policy paling simple (yang awalnya bekerja)
CREATE POLICY "Users can view own profile" ON public.users 
FOR SELECT USING (auth.uid() = id);

-- LANGKAH 3: Pastikan INSERT dan UPDATE masih ada
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users 
FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users 
FOR UPDATE USING (auth.uid() = id);

-- LANGKAH 4 (OPSIONAL): Buat fungsi + policy untuk cashier lihat owner
-- Jalankan ini SETELAH login berhasil
-- CREATE OR REPLACE FUNCTION public.get_my_owner_id()
-- RETURNS UUID AS $$
--   SELECT owner_id FROM public.users WHERE id = auth.uid();
-- $$ LANGUAGE sql SECURITY DEFINER STABLE;
--
-- DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
-- CREATE POLICY "Users can view own and owner profile" ON public.users
-- FOR SELECT USING (
--   auth.uid() = id OR id = public.get_my_owner_id()
-- );
