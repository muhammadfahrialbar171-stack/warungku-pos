-- =============================================
-- Migration V7: Fix Customer RLS Issue
-- =============================================

-- The previous RLS policy for customers was:
-- CREATE POLICY "Team can manage customers" ON public.customers FOR INSERT WITH CHECK (
--   user_id = public.effective_owner_id()
-- );
-- BUT effective_owner_id might not exist or evaluates weirdly when inserting.

-- Since we are explicitly providing `user_id` as `ownerId` from the backend route,
-- the insert RLS needs to simply allow inserts where the `user_id` matches the owner_id of the current user.
-- However, an easier and more robust Row Level Security (RLS) is to let the backend bypass RLS (using service_role)
-- OR just write a better RLS function.

-- In Supabase, the best approach for team-based RLS is querying the users table:
DROP POLICY IF EXISTS "Team can manage customers" ON public.customers;

-- This policy allows INSERT if the user_id being inserted belongs to the current user (if owner),
-- OR if it belongs to the owner of the current user (if cashier).
CREATE POLICY "Team can manage customers" ON public.customers 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() OR
  user_id = (SELECT owner_id FROM public.users WHERE id = auth.uid())
);

-- Similarly update UPDATE and DELETE just to be completely safe:
DROP POLICY IF EXISTS "Team can update customers" ON public.customers;
CREATE POLICY "Team can update customers" ON public.customers 
FOR UPDATE 
USING (
  user_id = auth.uid() OR
  user_id = (SELECT owner_id FROM public.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Team can view customers" ON public.customers;
CREATE POLICY "Team can view customers" ON public.customers 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  user_id = (SELECT owner_id FROM public.users WHERE id = auth.uid())
);
