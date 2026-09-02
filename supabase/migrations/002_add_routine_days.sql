-- ====================================================================
-- MIGRATION 002: Add assigned_days to routines
-- ====================================================================

alter table public.routines 
add column if not exists assigned_days text[] default array[]::text[];
