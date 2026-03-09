-- Migration: Cashier Shift Management System
-- Description: Adds a `shifts` table to track cashier sessions, starting cash, and ending cash discrepancies.

CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    starting_cash NUMERIC(15, 2) NOT NULL DEFAULT 0,
    expected_cash NUMERIC(15, 2), -- Computed by system at closing
    actual_cash NUMERIC(15, 2),   -- Counted physically by cashier
    status TEXT NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'open',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_shifts_store_id ON public.shifts(store_id);
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON public.shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.shifts(status);

-- Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Policy 1: Store owners can see all shifts in their store
CREATE POLICY "Owners can view all shifts in their store" ON public.shifts
    FOR SELECT
    USING (
        auth.uid() = store_id 
        OR 
        auth.uid() IN (SELECT id FROM public.users WHERE role = 'owner' AND id = store_id)
    );

-- Policy 2: Cashiers can view their own shifts
CREATE POLICY "Cashiers can view their own shifts" ON public.shifts
    FOR SELECT
    USING (
        auth.uid() = user_id
    );

-- Policy 3: Allow insert for authenticated users (Kasir/Owner)
CREATE POLICY "Users can insert shifts" ON public.shifts
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
    );

-- Policy 4: Allow updating their own open shift (for closing it)
CREATE POLICY "Users can update their own shifts" ON public.shifts
    FOR UPDATE
    USING (
        auth.uid() = user_id AND status = 'open'
    )
    WITH CHECK (
        auth.uid() = user_id
    );

-- Policy 5: Owners can update any shift
CREATE POLICY "Owners can update any shift" ON public.shifts
    FOR UPDATE
    USING (
        auth.uid() = store_id
    );

-- Function to check if a user has an active open shift
CREATE OR REPLACE FUNCTION public.has_open_shift(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.shifts
    WHERE user_id = p_user_id AND status = 'open';
    
    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
