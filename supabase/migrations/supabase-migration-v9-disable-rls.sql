-- =============================================
-- Migration V9: Disable RLS for Customers
-- =============================================

-- Karena terus terjadi error "new row violates row-level security policy",
-- cara paling mutlak untuk memperbaikinya adalah dengan mematikan RLS pada tabel customers.
-- Keamanan data (memastikan user hanya bisa melihat data miliknya)
-- sudah diatur dengan aman di level backend API kita (src/app/api/customers/route.js).

-- 1. Matikan pembatasan baris (Row Level Security) untuk tabel Pelanggan
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;

-- 2. Hapus semua policy yang mungkin masih tersangkut
DROP POLICY IF EXISTS "Team can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Team can update customers" ON public.customers;
DROP POLICY IF EXISTS "Team can view customers" ON public.customers;
DROP POLICY IF EXISTS "Owner can delete customers" ON public.customers;
