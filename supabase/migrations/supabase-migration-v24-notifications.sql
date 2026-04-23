-- =============================================
-- Migration V24: Store Notifications (Realtime-Based)
-- Pengganti Web Push untuk arsitektur Static Export + Firebase Hosting
-- Jalankan SQL ini di Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS public.store_notifications (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'warning', 'info', 'success', 'error'
  url TEXT DEFAULT '/dashboard',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.store_notifications ENABLE ROW LEVEL SECURITY;

-- Owner bisa lihat notifikasinya sendiri
CREATE POLICY "Owner can view own notifications"
ON public.store_notifications FOR SELECT
USING ( auth.uid() = store_id );

-- Authorized users (owner + kasir) bisa INSERT notifikasi ke toko
CREATE POLICY "Authorized can insert notifications"
ON public.store_notifications FOR INSERT
WITH CHECK ( public.is_authorized_user(store_id) );

-- Owner bisa update (mark as read)
CREATE POLICY "Owner can update own notifications"
ON public.store_notifications FOR UPDATE
USING ( auth.uid() = store_id );

-- Owner bisa delete
CREATE POLICY "Owner can delete own notifications"
ON public.store_notifications FOR DELETE
USING ( auth.uid() = store_id );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_store_notifications_store ON public.store_notifications(store_id);
CREATE INDEX IF NOT EXISTS idx_store_notifications_read ON public.store_notifications(store_id, is_read);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE store_notifications;
