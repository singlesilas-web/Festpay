-- Dedicated analytics only. Original payment schema is intentionally not deployed.
create table public.analytics_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table public.analytics_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null,
  task text not null check(task in ('w1', 'w2', 'explore', 'wallet_topped_up', 'wallet_qr_shown', 'tokens_purchased', 'token_redeemed', 'festival_created', 'festival_updated', 'festival_helper_saved', 'wallet_charged', 'gast_guthaben', 'gast_marken', 'helfer', 'betreiber_marken', 'betreiber_guthaben')),
  version text not null,
  consent_version text not null,
  started_at timestamptz not null default now(),
  excluded boolean not null default false,
  event_count integer not null default 0
);
create table public.analytics_events (
  id uuid primary key,
  session_id uuid not null references public.analytics_sessions(id) on delete cascade,
  seq integer not null check(seq>0),
  type text not null,
  screen text not null,
  at timestamptz not null,
  received_at timestamptz not null default now(),
  elapsed integer not null check(elapsed>=0 and elapsed<=14400000),
  props jsonb not null default '{}',
  unique(session_id,seq)
);
create index analytics_events_session on public.analytics_events(session_id,seq);
create index analytics_events_received on public.analytics_events(received_at);
alter table public.analytics_admins enable row level security;
alter table public.analytics_sessions enable row level security;
alter table public.analytics_events enable row level security;
revoke all on public.analytics_admins, public.analytics_sessions, public.analytics_events from anon, authenticated;
grant select on public.analytics_admins, public.analytics_sessions, public.analytics_events to authenticated;
grant all on public.analytics_admins, public.analytics_sessions, public.analytics_events to service_role;
create policy admin_self on public.analytics_admins for select to authenticated using ((select auth.uid())=user_id);
create policy admin_read_sessions on public.analytics_sessions for select to authenticated using (exists(select 1 from public.analytics_admins a where a.user_id=(select auth.uid())));
create policy admin_read_events on public.analytics_events for select to authenticated using (exists(select 1 from public.analytics_admins a where a.user_id=(select auth.uid())));
-- Restrict each real inserted event, including concurrent requests, to a session budget.
create function public.analytics_event_budget() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  update public.analytics_sessions set event_count=event_count+1
    where id=new.session_id and event_count<5000 and started_at>now()-interval '4 hours';
  if not found then raise exception 'Session expired or event budget exhausted'; end if;
  return new;
end; $$;
revoke execute on function public.analytics_event_budget() from public,anon,authenticated;
create trigger analytics_budget after insert on public.analytics_events for each row execute function public.analytics_event_budget();
-- Run once after enabling pg_cron in Supabase: see retention.sql.
