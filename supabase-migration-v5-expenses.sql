-- =============================================
-- WarungKu POS - Migration: Expenses (Pengeluaran)
-- Jalankan SQL ini di Supabase SQL Editor
-- =============================================

-- 1. Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount INT NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'lainnya', -- 'Bahan Baku', 'Gaji', 'Listrik', 'Sewa', 'Lainnya'
  notes TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Row Level Security for expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Expenses: owner and cashiers can read, owner can manage
DROP POLICY IF EXISTS "Team can view expenses" ON public.expenses;
CREATE POLICY "Team can view expenses" ON public.expenses FOR SELECT USING (
  user_id = public.effective_owner_id()
);

DROP POLICY IF EXISTS "Team can create expenses" ON public.expenses;
CREATE POLICY "Team can create expenses" ON public.expenses FOR INSERT WITH CHECK (
  user_id = public.effective_owner_id()
);

DROP POLICY IF EXISTS "Owner can update expenses" ON public.expenses;
CREATE POLICY "Owner can update expenses" ON public.expenses FOR UPDATE USING (
  user_id = auth.uid() AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner'
);

DROP POLICY IF EXISTS "Owner can delete expenses" ON public.expenses;
CREATE POLICY "Owner can delete expenses" ON public.expenses FOR DELETE USING (
  user_id = auth.uid() AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner'
);

-- 3. Create Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_user ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
