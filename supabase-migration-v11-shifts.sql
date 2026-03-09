-- Migration: V11 - Shift Management
-- Description: Create shifts table, add shift_id to transactions, and set up RLS policies.

-- 0. Create handle_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Create shifts table
DROP TABLE IF EXISTS public.shifts CASCADE;
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    starting_cash NUMERIC NOT NULL DEFAULT 0,
    actual_cash NUMERIC,
    expected_cash NUMERIC,
    status TEXT NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: We assume the existence of a standard 'updated_at' trigger for tables
DROP TRIGGER IF EXISTS set_shifts_updated_at ON public.shifts;
CREATE TRIGGER set_shifts_updated_at
BEFORE UPDATE ON public.shifts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 2. Add shift_id to transactions table
ALTER TABLE public.transactions
ADD COLUMN shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL;

-- 3. Set up Row Level Security (RLS) for shifts

-- Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Policy: Owners can view all shifts in their store
CREATE POLICY "Owners can view all shifts in their store"
ON public.shifts FOR SELECT
USING (
    store_id IN (
        SELECT id FROM public.users
        WHERE id = auth.uid() OR owner_id = auth.uid()
    )
    OR
    user_id = auth.uid() -- Kasir juga bisa melihat shift-nya sendiri
);

-- Policy: Users can insert their own shifts
CREATE POLICY "Users can insert their own shifts"
ON public.shifts FOR INSERT
WITH CHECK (
    user_id = auth.uid()
);

-- Policy: Users can update their own shifts (e.g., to close them)
CREATE POLICY "Users can update their own shifts"
ON public.shifts FOR UPDATE
USING (
    user_id = auth.uid()
    OR
    store_id IN (
        SELECT id FROM public.users
        WHERE id = auth.uid() OR owner_id = auth.uid()
    )
);

-- Policy: Owners can delete shifts in their store (optional, usually we just keep them, but good for cleanup)
CREATE POLICY "Owners can delete shifts in their store"
ON public.shifts FOR DELETE
USING (
    store_id IN (
        SELECT id FROM public.users
        WHERE id = auth.uid() OR owner_id = auth.uid()
    )
);
