-- D’Lorgia Orienta v4.2 — Pulse / Journey analytics
-- Ejecutar UNA VEZ en Supabase SQL Editor sobre una base v4.0/v4.1.
-- Es idempotente: puede volver a ejecutarse sin duplicar objetos.

create table if not exists public.journey_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  source text not null default 'system',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists journey_events_user_created_idx
  on public.journey_events(user_id, created_at desc);
create index if not exists journey_events_type_created_idx
  on public.journey_events(event_type, created_at desc);
create index if not exists journey_events_actor_created_idx
  on public.journey_events(actor_id, created_at desc);

alter table public.journey_events enable row level security;
revoke all on public.journey_events from anon;
revoke all on public.journey_events from authenticated;
grant all on public.journey_events to service_role;

-- Los eventos se escriben y leen exclusivamente desde el backend Node con la clave secreta.
-- Esto evita que el cliente falsifique métricas, auditoría o acciones administrativas.
