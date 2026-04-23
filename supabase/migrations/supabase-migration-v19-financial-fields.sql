-- Migration: V19 - Financial Fields
-- Description: Add tax_amount, discount_amount, paid_amount, change_amount to transactions table.

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS tax_amount INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_amount INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS change_amount INT DEFAULT 0;

-- Ensure shift_id column exists (it might from V11, but good to be safe)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='shift_id') THEN
        ALTER TABLE public.transactions ADD COLUMN shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON COLUMN public.transactions.tax_amount IS 'Total pajak (PPN) yang dikenakan';
COMMENT ON COLUMN public.transactions.discount_amount IS 'Total potongan harga yang diberikan';
COMMENT ON COLUMN public.transactions.paid_amount IS 'Jumlah uang yang dibayarkan pelanggan';
COMMENT ON COLUMN public.transactions.change_amount IS 'Jumlah uang kembalian';
