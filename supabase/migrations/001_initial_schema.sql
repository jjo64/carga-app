-- ====================================================================
-- CARGA — SCHEMA SQL INICIAL
-- Base de datos PostgreSQL con RLS, triggers y vistas para Supabase
-- ====================================================================

-- 1. EXTENSIONES
create extension if not exists "uuid-ossp";

-- 2. PERFILES DE USUARIO
-- Se vincula directamente a auth.users en Supabase
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  
  name text,
  birth_date date,
  gender text check (gender in ('male', 'female', 'other')),
  height_cm numeric(5,1),
  
  goal text check (goal in ('muscle_gain', 'fat_loss', 'maintenance', 'recomp')),
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active'))
);

alter table public.profiles enable row level security;
create policy "Los usuarios pueden ver su propio perfil" on public.profiles 
  for select using (auth.uid() = id);
create policy "Los usuarios pueden actualizar su propio perfil" on public.profiles 
  for update using (auth.uid() = id);
create policy "Los usuarios pueden insertar su propio perfil" on public.profiles 
  for insert with check (auth.uid() = id);

-- 3. HISTORIAL DE PESO CORPORAL
create table public.body_weight (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  date date not null default current_date,
  weight_kg numeric(5,2) not null,
  
  constraint unique_user_date_weight unique (user_id, date)
);

alter table public.body_weight enable row level security;
create policy "Los usuarios gestionan su propio peso" on public.body_weight
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_body_weight_user_date on public.body_weight(user_id, date desc);

-- 4. MEDIDAS CORPORALES
create table public.body_measurements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  date date not null default current_date,
  waist_cm numeric(5,1),
  chest_cm numeric(5,1),
  arm_cm numeric(5,1),
  thigh_cm numeric(5,1),
  notes text
);

alter table public.body_measurements enable row level security;
create policy "Los usuarios gestionan sus propias medidas" on public.body_measurements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_body_measurements_user_date on public.body_measurements(user_id, date desc);

-- 5. RUTINAS DE ENTRENAMIENTO
create table public.routines (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  name text not null,
  description text,
  is_active boolean default true not null,
  sort_order int default 0 not null
);

alter table public.routines enable row level security;
create policy "Los usuarios gestionan sus propias rutinas" on public.routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_routines_user on public.routines(user_id, sort_order);

-- 6. EJERCICIOS DE LA RUTINA
create table public.routine_exercises (
  id uuid default uuid_generate_v4() primary key,
  routine_id uuid references public.routines(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  name text not null,
  target_sets int not null default 3,
  target_reps text not null default '8-10',
  rest_seconds int default 90 not null,
  notes text,
  sort_order int default 0 not null
);

alter table public.routine_exercises enable row level security;
create policy "Los usuarios gestionan los ejercicios de sus rutinas" on public.routine_exercises
  for all using (
    exists (
      select 1 from public.routines r
      where r.id = routine_id and r.user_id = auth.uid()
    )
  );

create index idx_routine_exercises_routine on public.routine_exercises(routine_id, sort_order);

-- 7. SESIONES DE ENTRENAMIENTO (Historial de ejecución)
create table public.workout_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  routine_id uuid references public.routines(id) on delete set null,
  created_at timestamptz default now() not null,
  date date not null default current_date,
  started_at timestamptz,
  finished_at timestamptz,
  duration_minutes int,
  
  -- Métricas calculadas
  total_volume_kg numeric(10,2),
  estimated_calories_burned int,
  ai_summary text,
  notes text
);

alter table public.workout_sessions enable row level security;
create policy "Los usuarios gestionan sus propias sesiones" on public.workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_sessions_user_date on public.workout_sessions(user_id, date desc);

-- 8. SERIES REALIZADAS EN UNA SESIÓN
create table public.session_sets (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.workout_sessions(id) on delete cascade not null,
  exercise_id uuid references public.routine_exercises(id) on delete set null,
  created_at timestamptz default now() not null,
  exercise_name text not null,
  set_number int not null,
  reps int not null,
  weight_kg numeric(6,2) not null,
  rpe int check (rpe between 1 and 10),
  is_warmup boolean default false not null,
  notes text
);

alter table public.session_sets enable row level security;
create policy "Los usuarios gestionan las series de sus sesiones" on public.session_sets
  for all using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid()
    )
  );

create index idx_session_sets_session on public.session_sets(session_id, set_number);

-- 9. REGISTROS DE COMIDAS (Nutrición)
create table public.food_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  date date not null default current_date,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')) default 'snack' not null,
  
  -- Entrada de texto o transcripción
  raw_input text not null,
  
  -- Datos estructurados parseados por IA
  foods_parsed jsonb,
  
  -- Totales agregados de la comida
  calories numeric(8,2) default 0,
  protein_g numeric(8,2) default 0,
  carbs_g numeric(8,2) default 0,
  fat_g numeric(8,2) default 0,
  
  ai_confidence text check (ai_confidence in ('high', 'medium', 'low')),
  ai_notes text
);

alter table public.food_logs enable row level security;
create policy "Los usuarios gestionan sus registros de comida" on public.food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_food_logs_user_date on public.food_logs(user_id, date desc);

-- 10. PLANES SEMANALES GENERADOS POR IA
create table public.weekly_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  week_start date not null,
  goal text not null,
  plan_data jsonb not null,
  is_active boolean default true not null
);

alter table public.weekly_plans enable row level security;
create policy "Los usuarios gestionan sus planes semanales" on public.weekly_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 11. REGISTRO DE USO DE IA (Control de límites y costos)
create table public.ai_usage_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  function_name text not null,
  input_tokens int default 0,
  output_tokens int default 0
);

alter table public.ai_usage_log enable row level security;
create policy "Los usuarios pueden ver su consumo de IA" on public.ai_usage_log
  for select using (auth.uid() = user_id);

create index idx_ai_usage_user_date on public.ai_usage_log(user_id, created_at desc);

-- ====================================================================
-- TRIGGERS & FUNCIONES AUTOMÁTICAS
-- ====================================================================

-- Trigger: Actualizar columna updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

create trigger update_routines_updated_at
  before update on public.routines
  for each row execute procedure public.update_updated_at_column();

-- Trigger: Crear automáticamente perfil al registrar usuario en auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ====================================================================
-- VISTA AGREGADA: RESUMEN DIARIO PARA DASHBOARD
-- ====================================================================
create or replace view public.daily_summary as
select
  fl.user_id,
  fl.date,
  coalesce(sum(fl.calories), 0) as total_calories,
  coalesce(sum(fl.protein_g), 0) as total_protein,
  coalesce(sum(fl.carbs_g), 0) as total_carbs,
  coalesce(sum(fl.fat_g), 0) as total_fat,
  count(fl.id) as meal_count,
  coalesce(
    (
      select sum(ws.estimated_calories_burned)
      from public.workout_sessions ws
      where ws.user_id = fl.user_id and ws.date = fl.date
    ),
    0
  ) as calories_burned
from public.food_logs fl
group by fl.user_id, fl.date;
