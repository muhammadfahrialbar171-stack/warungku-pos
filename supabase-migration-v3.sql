-- =============================================
-- WarungKu POS - Migration: Multi-User & Role
-- Jalankan SQL ini di Supabase SQL Editor
-- =============================================

-- 1. Tambah kolom role, owner_id, phone ke tabel users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'owner'; -- 'owner' or 'cashier'
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Update RLS policies agar kasir bisa akses data milik owner-nya
-- Drop old policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can manage own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can manage own products" ON public.products;
DROP POLICY IF EXISTS "Users can manage own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can manage own transaction items" ON public.transaction_items;
DROP POLICY IF EXISTS "Users can manage own stock history" ON public.stock_history;

-- Helper function: get the effective owner id (if user is cashier, return their owner_id, otherwise return their own id)
CREATE OR REPLACE FUNCTION public.effective_owner_id()
RETURNS UUID AS $$
  SELECT CASE
    WHEN (SELECT role FROM public.users WHERE id = auth.uid()) = 'cashier'
    THEN (SELECT owner_id FROM public.users WHERE id = auth.uid())
    ELSE auth.uid()
  END;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Users: can view self + team members (owner sees cashiers, cashier sees owner)
-- Users: can view self + team members (owner sees cashiers, cashier sees owner)
CREATE POLICY "Users can view profiles" ON public.users FOR SELECT USING (
  id = auth.uid() OR
  owner_id = auth.uid()
);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Owner can delete cashier accounts
CREATE POLICY "Owner can delete cashiers" ON public.users FOR DELETE USING (
  owner_id = auth.uid()
);

-- Categories: owner and cashiers can read, only owner can write
CREATE POLICY "Team can view categories" ON public.categories FOR SELECT USING (
  user_id = public.effective_owner_id()
);
CREATE POLICY "Owner can manage categories" ON public.categories FOR INSERT WITH CHECK (
  user_id = auth.uid() AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner'
);
CREATE POLICY "Owner can update categories" ON public.categories FOR UPDATE USING (
  user_id = auth.uid() AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner'
);
CREATE POLICY "Owner can delete categories" ON public.categories FOR DELETE USING (
  user_id = auth.uid() AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner'
);

-- Products: owner and cashiers can read, only owner can write
CREATE POLICY "Team can view products" ON public.products FOR SELECT USING (
  user_id = public.effective_owner_id()
);
CREATE POLICY "Owner can manage products" ON public.products FOR INSERT WITH CHECK (
  user_id = auth.uid() AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner'
);
CREATE POLICY "Owner can update products" ON public.products FOR UPDATE USING (
  user_id = public.effective_owner_id()
);
CREATE POLICY "Owner can delete products" ON public.products FOR DELETE USING (
  user_id = auth.uid() AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner'
);

-- Transactions: both can create and read (owner sees all, cashier sees own)
CREATE POLICY "Team can view transactions" ON public.transactions FOR SELECT USING (
  user_id = public.effective_owner_id()
);
CREATE POLICY "Team can create transactions" ON public.transactions FOR INSERT WITH CHECK (
  user_id = public.effective_owner_id()
);

-- Transaction Items: via transaction ownership
CREATE POLICY "Team can view transaction items" ON public.transaction_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND t.user_id = public.effective_owner_id())
);
CREATE POLICY "Team can create transaction items" ON public.transaction_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND t.user_id = public.effective_owner_id())
);

-- Stock History: team can view and create
CREATE POLICY "Team can view stock history" ON public.stock_history FOR SELECT USING (
  user_id = public.effective_owner_id()
);
CREATE POLICY "Team can manage stock history" ON public.stock_history FOR INSERT WITH CHECK (
  user_id = public.effective_owner_id()
);
