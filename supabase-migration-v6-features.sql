-- =============================================
-- Migration V6: Receipt Customization & COGS
-- =============================================

-- 1. Add receipt customization to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS receipt_header TEXT,
ADD COLUMN IF NOT EXISTS receipt_footer TEXT;

-- 2. Add cost_price to transaction_items table for accurate Profit logging
ALTER TABLE public.transaction_items
ADD COLUMN IF NOT EXISTS cost_price INT NOT NULL DEFAULT 0;

-- Optional: Update existing transaction_items to have cost_price = price
-- (Assuming historical transactions had 100% margin if cost_price was unknown)
-- Or better, we can try to join with current product cost_price if available
UPDATE public.transaction_items ti
SET cost_price = COALESCE((SELECT p.cost_price FROM public.products p WHERE p.id = ti.product_id), 0)
WHERE ti.cost_price = 0;
