-- =============================================
-- WarungKu POS - Migration: CRM (Customers)
-- Jalankan SQL ini di Supabase SQL Editor
-- =============================================

-- 1. Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  total_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add customer_id reference to transactions table
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS customer_id INT REFERENCES public.customers(id) ON DELETE SET NULL;

-- 3. Row Level Security for customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Categories: owner and cashiers can read, owner can manage
DROP POLICY IF EXISTS "Team can view customers" ON public.customers;
CREATE POLICY "Team can view customers" ON public.customers FOR SELECT USING (
  user_id = public.effective_owner_id()
);

DROP POLICY IF EXISTS "Team can manage customers" ON public.customers;
CREATE POLICY "Team can manage customers" ON public.customers FOR INSERT WITH CHECK (
  user_id = public.effective_owner_id()
);

DROP POLICY IF EXISTS "Team can update customers" ON public.customers;
CREATE POLICY "Team can update customers" ON public.customers FOR UPDATE USING (
  user_id = public.effective_owner_id()
);

DROP POLICY IF EXISTS "Owner can delete customers" ON public.customers;
CREATE POLICY "Owner can delete customers" ON public.customers FOR DELETE USING (
  user_id = auth.uid() AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner'
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_customers_user ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON public.transactions(customer_id);
