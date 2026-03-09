-- =============================================
-- WarungKu POS - Migration: Expand RLS for Cashiers
-- Jalankan SQL ini di Supabase SQL Editor
-- =============================================

-- We need to allow cashiers (users with an owner_id) to INSERT/UPDATE 
-- records where the user_id corresponds to their owner_id.
-- Currently, policies strictly check auth.uid() = user_id.

-- 1. Helper function to check if the current user is the owner or an authorized cashier under that owner
CREATE OR REPLACE FUNCTION public.is_authorized_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  current_owner_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- If it's the owner themself
  IF current_user_id = target_user_id THEN
    RETURN TRUE;
  END IF;

  -- If it's a cashier under this owner
  SELECT owner_id INTO current_owner_id
  FROM public.users
  WHERE id = current_user_id;

  IF current_owner_id = target_user_id THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Transactions RLS
DROP POLICY IF EXISTS "Users can manage own transactions" ON public.transactions;
CREATE POLICY "Users can manage own transactions" 
ON public.transactions FOR ALL 
USING ( public.is_authorized_user(user_id) );

-- 3. Update Transaction Items RLS
DROP POLICY IF EXISTS "Users can manage own transaction items" ON public.transaction_items;
CREATE POLICY "Users can manage own transaction items" 
ON public.transaction_items FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.transactions t 
    WHERE t.id = transaction_id 
    AND public.is_authorized_user(t.user_id)
  )
);

-- 4. Update Stock History RLS
DROP POLICY IF EXISTS "Users can manage own stock history" ON public.stock_history;
CREATE POLICY "Users can manage own stock history" 
ON public.stock_history FOR ALL 
USING ( public.is_authorized_user(user_id) );

-- 5. Update Products RLS (So cashiers can decrement stock)
DROP POLICY IF EXISTS "Users can manage own products" ON public.products;
CREATE POLICY "Users can manage own products" 
ON public.products FOR ALL 
USING ( public.is_authorized_user(user_id) );

-- 6. Update Categories RLS
DROP POLICY IF EXISTS "Users can manage own categories" ON public.categories;
CREATE POLICY "Users can manage own categories" 
ON public.categories FOR ALL 
USING ( public.is_authorized_user(user_id) );

-- 7. Update Customers RLS (if exists)
DROP POLICY IF EXISTS "Users can manage own customers" ON public.customers;
CREATE POLICY "Users can manage own customers" 
ON public.customers FOR ALL 
USING ( public.is_authorized_user(user_id) );
