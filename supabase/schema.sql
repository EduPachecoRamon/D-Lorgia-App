-- D’Lorgia Orienta v4.0
-- Ejecutar en Supabase SQL Editor una sola vez.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text unique not null,
  name text not null,
  role text not null default 'patient' check (role in ('patient','admin')),
  branch text not null default 'huancayo',
  response_style text not null default 'equilibrada',
  guidance_style text not null default 'guiado',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.treatments (
  id text primary key,
  category text not null,
  name text not null,
  short text not null default '',
  description text not null default '',
  objective text not null default '',
  goals jsonb not null default '[]'::jsonb,
  recovery text not null default '',
  intensity text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.personal_guides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists personal_guides_user_created_idx
  on public.personal_guides(user_id, created_at desc);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  treatment_id text references public.treatments(id) on delete set null,
  branch text not null default 'huancayo',
  interest text not null default 'Orientación general',
  date date,
  time text,
  contact text not null default '',
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  external_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_user_created_idx
  on public.appointments(user_id, created_at desc);
create index if not exists appointments_status_idx
  on public.appointments(status, created_at desc);
create unique index if not exists appointments_active_slot_unique
  on public.appointments(branch, date, time)
  where status in ('pending','confirmed');

-- Mantener updated_at automáticamente.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists treatments_set_updated_at on public.treatments;
create trigger treatments_set_updated_at before update on public.treatments
for each row execute procedure public.set_updated_at();

drop trigger if exists personal_guides_set_updated_at on public.personal_guides;
create trigger personal_guides_set_updated_at before update on public.personal_guides
for each row execute procedure public.set_updated_at();

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at before update on public.appointments
for each row execute procedure public.set_updated_at();

-- Crear perfil cuando Auth crea un usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_username text;
  requested_name text;
begin
  requested_username := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  requested_name := coalesce(new.raw_user_meta_data->>'name', requested_username);

  insert into public.profiles (id, email, username, name)
  values (new.id, lower(new.email), requested_username, requested_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS: útil incluso si la app usa el backend Node como puerta principal.
alter table public.profiles enable row level security;
alter table public.treatments enable row level security;
alter table public.personal_guides enable row level security;
alter table public.appointments enable row level security;

-- Grants mínimos: RLS filtra filas, grants define qué operaciones existen.
revoke all on public.profiles, public.treatments, public.personal_guides, public.appointments from anon;
revoke all on public.profiles, public.treatments, public.personal_guides, public.appointments from authenticated;
-- El paciente puede leer su perfil, pero solo editar preferencias inocuas; nunca role/email/username.
grant select on public.profiles to authenticated;
grant update (name, branch, response_style, guidance_style) on public.profiles to authenticated;
-- Catálogo de solo lectura para usuarios autenticados.
grant select on public.treatments to authenticated;
-- El usuario puede crear/leer su propio Orientador.
grant select on public.personal_guides to authenticated;
grant insert (user_id, payload, result) on public.personal_guides to authenticated;
-- El paciente puede crear y leer citas propias, pero NO alterar status.
grant select on public.appointments to authenticated;
grant insert (user_id, treatment_id, branch, interest, date, time, contact, external_reference) on public.appointments to authenticated;
-- El backend Admin usa la clave secreta -> service_role.
grant all on public.profiles, public.treatments, public.personal_guides, public.appointments to service_role;

-- Re-crear políticas de forma idempotente.
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "treatments_read_active" on public.treatments;
create policy "treatments_read_active" on public.treatments for select using (active = true);

drop policy if exists "guides_read_own" on public.personal_guides;
create policy "guides_read_own" on public.personal_guides for select using (auth.uid() = user_id);
drop policy if exists "guides_insert_own" on public.personal_guides;
create policy "guides_insert_own" on public.personal_guides for insert with check (auth.uid() = user_id);

drop policy if exists "appointments_read_own" on public.appointments;
create policy "appointments_read_own" on public.appointments for select using (auth.uid() = user_id);
drop policy if exists "appointments_insert_own" on public.appointments;
create policy "appointments_insert_own" on public.appointments for insert with check (auth.uid() = user_id);

-- Para convertir una cuenta ya creada en administrador:
-- update public.profiles set role = 'admin' where email = 'tu-correo@ejemplo.com';
