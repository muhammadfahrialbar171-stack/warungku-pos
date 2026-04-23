-- Migration: V20 - Production Hardening
-- Description: Align expenses RLS and add performance indices.

-- 1. Align expenses RLS with is_authorized_user()
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team can view expenses" ON public.expenses;
CREATE POLICY "Team can view expenses" ON public.expenses 
FOR SELECT USING ( public.is_authorized_user(user_id) );

DROP POLICY IF EXISTS "Team can create expenses" ON public.expenses;
CREATE POLICY "Team can create expenses" ON public.expenses 
FOR INSERT WITH CHECK ( public.is_authorized_user(user_id) );

DROP POLICY IF EXISTS "Owner can update expenses" ON public.expenses;
CREATE POLICY "Owner can update expenses" ON public.expenses 
FOR UPDATE USING ( public.is_authorized_user(user_id) );

DROP POLICY IF EXISTS "Owner can delete expenses" ON public.expenses;
CREATE POLICY "Owner can delete expenses" ON public.expenses 
FOR DELETE USING ( public.is_authorized_user(user_id) );

-- 2. Performance Indices
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transaction_items_tx_id ON public.transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_shifts_store_id ON public.shifts(store_id);
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON public.shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_created_at ON public.shifts(created_at);
