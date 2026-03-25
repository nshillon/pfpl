-- ============================================================
-- pFPL Supabase Schema
-- Run once in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ── Users (synced from Clerk via webhook) ────────────────────
create table if not exists public.users (
  id                     text primary key,
  email                  text not null,
  first_name             text default '',
  last_name              text default '',
  plan                   text not null default 'free',
  stripe_customer_id     text,
  stripe_subscription_id text,
  subscription_status    text default 'inactive',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users: own row" on public.users
  for all using (auth.uid()::text = id);

create policy "Service role: users full access" on public.users
  for all using (auth.role() = 'service_role');

-- ── FPL Teams ────────────────────────────────────────────────
create table if not exists public.fpl_teams (
  id            bigserial primary key,
  user_id       text not null references public.users(id) on delete cascade,
  fpl_team_id   integer not null,
  team_name     text,
  player_name   text,
  overall_rank  integer,
  total_points  integer,
  synced_at     timestamptz not null default now(),
  unique (user_id)
);

alter table public.fpl_teams enable row level security;

create policy "FPL teams: own row" on public.fpl_teams
  for all using (auth.uid()::text = user_id);

create policy "Service role: fpl_teams full access" on public.fpl_teams
  for all using (auth.role() = 'service_role');

-- ── AI Queries ───────────────────────────────────────────────
create table if not exists public.ai_queries (
  id          bigserial primary key,
  user_id     text not null references public.users(id) on delete cascade,
  prompt      text not null,
  response    text,
  gameweek    integer,
  tokens_used integer,
  created_at  timestamptz not null default now()
);

alter table public.ai_queries enable row level security;

create policy "AI queries: own rows" on public.ai_queries
  for all using (auth.uid()::text = user_id);

create policy "Service role: ai_queries full access" on public.ai_queries
  for all using (auth.role() = 'service_role');

-- ── Usage Limits ─────────────────────────────────────────────
create table if not exists public.usage_limits (
  user_id     text primary key references public.users(id) on delete cascade,
  month       text not null,
  query_count integer not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.usage_limits enable row level security;

create policy "Usage limits: own row" on public.usage_limits
  for all using (auth.uid()::text = user_id);

create policy "Service role: usage_limits full access" on public.usage_limits
  for all using (auth.role() = 'service_role');

-- ── Trigger: auto-update updated_at ──────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();

drop trigger if exists usage_updated_at on public.usage_limits;
create trigger usage_updated_at
  before update on public.usage_limits
  for each row execute procedure public.set_updated_at();
