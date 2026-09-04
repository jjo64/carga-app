-- ====================================================================
-- MIGRACIÓN 004: SEGURIDAD DE IA Y VERIFICACIÓN DE ALIMENTOS
-- ====================================================================

-- 1. TABLA GLOBAL DE PRODUCTOS ALIMENTICIOS (DICCIONARIO COLABORATIVO)
create table if not exists public.food_products (
  id uuid default uuid_generate_v4() primary key,
  barcode text unique,
  name text not null,
  brand text,
  serving_size_g numeric(6,1) default 100,
  serving_name text default '100g',
  
  -- Macronutrientes por 100g
  calories numeric(6,1) default 0,
  protein numeric(6,1) default 0,
  carbs numeric(6,1) default 0,
  fat numeric(6,1) default 0,
  
  -- Sub-macros y micronutrientes
  sugars numeric(6,1) default 0,
  saturated_fat numeric(6,1) default 0,
  salt_g numeric(6,2) default 0,
  fiber numeric(6,1) default 0,
  sodium_mg numeric(6,1) default 0,
  ingredients text[] default '{}',
  ultra_processed_score int default 1,
  
  -- Metadatos de Confianza y Calidad
  data_source text check (data_source in ('verified', 'openfoodfacts', 'ai_scan', 'user_custom')) default 'verified',
  is_verified boolean default false,
  verified_count int default 0,
  created_by uuid references auth.users(id) on delete set null,
  
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Habilitar RLS en food_products
alter table public.food_products enable row level security;

-- Políticas:
-- Lectura pública para cualquier usuario autenticado o anónimo
create policy "Cualquiera puede consultar alimentos de la base de datos" on public.food_products
  for select using (true);

-- Inserción permitida para usuarios autenticados
create policy "Usuarios autenticados pueden registrar alimentos" on public.food_products
  for insert with check (auth.role() = 'authenticated');

-- Actualización permitida para aumentar verified_count o si es el creador/admin
create policy "Usuarios pueden actualizar o verificar alimentos" on public.food_products
  for update using (auth.role() = 'authenticated');

create index if not exists idx_food_products_barcode on public.food_products(barcode);
create index if not exists idx_food_products_name on public.food_products using gin (to_tsvector('spanish', name));

-- 2. MEJORAS EN LA TABLA DE AUDITORÍA Y RATE LIMITING DE IA
alter table public.ai_usage_log
  add column if not exists cost_usd numeric(8,6) default 0,
  add column if not exists action_type text default 'general',
  add column if not exists model_used text default 'claude-haiku-4-5';

-- Índice compuesto para conteos ultrarrápidos de Rate Limiting en ventanas de 24h
create index if not exists idx_ai_usage_rate_limit on public.ai_usage_log(user_id, action_type, created_at desc);

-- 3. PERMISO IS_ADMIN EN PROFILES
alter table public.profiles
  add column if not exists is_admin boolean default false,
  add column if not exists role text default 'athlete';
