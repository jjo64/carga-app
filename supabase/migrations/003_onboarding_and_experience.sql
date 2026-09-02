-- ====================================================================
-- MIGRACIÓN 003: CAMPOS DE ONBOARDING Y NIVEL DE EXPERIENCIA
-- Añade soporte para experiencia, días por semana y estado de onboarding
-- ====================================================================

alter table public.profiles 
  add column if not exists experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced')),
  add column if not exists training_days_per_week int default 3,
  add column if not exists onboarding_completed boolean default false,
  add column if not exists initial_weight_kg numeric(5,2);

-- Añadir soporte para assigned_days como array si no existe
alter table public.routines
  add column if not exists assigned_days text[];
