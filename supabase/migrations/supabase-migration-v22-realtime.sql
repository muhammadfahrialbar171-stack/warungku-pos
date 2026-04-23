-- Migration: Enable Realtime for Dashboard
-- Created to allow Dashboard to automatically update when cashiers add transactions or expenses

-- Adding tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
