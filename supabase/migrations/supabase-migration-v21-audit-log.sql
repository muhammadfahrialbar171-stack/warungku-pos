-- Migration: Create system_activities table for audit logging
-- Created to fix "Audit table missing" bug

CREATE TABLE IF NOT EXISTS public.system_activities (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  target_resource TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Owner can view own and cashier activities
DROP POLICY IF EXISTS "Users can view own system activities" ON public.system_activities;
CREATE POLICY "Users can view own system activities" ON public.system_activities
FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = system_activities.user_id AND owner_id = auth.uid()
  )
);

-- RLS Policy: Everyone can insert their own activities
DROP POLICY IF EXISTS "Users can insert own system activities" ON public.system_activities;
CREATE POLICY "Users can insert own system activities" ON public.system_activities
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_activities_user ON public.system_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_system_activities_created ON public.system_activities(created_at);
