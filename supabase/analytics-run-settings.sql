-- Freeze ingest for a verified backup/reset, then release only the current study build.
create table public.analytics_run_settings (
  singleton boolean primary key default true check(singleton),
  accepting boolean not null default false,
  active_version text not null,
  reset_at timestamptz not null default now()
);
insert into public.analytics_run_settings(singleton,accepting,active_version)
values(true,false,'festpay-2026-11-10-v9-clean');
alter table public.analytics_run_settings enable row level security;
revoke all on public.analytics_run_settings from public,anon,authenticated;
grant all on public.analytics_run_settings to service_role;
create function public.analytics_current_run_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
declare enabled boolean; version_allowed text; submitted_version text; submitted_task text;
begin
  select accepting,active_version into enabled,version_allowed from public.analytics_run_settings where singleton for share;
  if not coalesce(enabled,false) then raise exception 'Analytics paused for verified export and reset'; end if;
  if tg_table_name='analytics_sessions' then submitted_version=new.version;submitted_task=new.task;
  else select version,task into submitted_version,submitted_task from public.analytics_sessions where id=new.session_id; end if;
  if submitted_version is distinct from version_allowed then raise exception 'Analytics version retired'; end if;
  if submitted_task not in ('gast_guthaben','gast_marken','helfer','betreiber_marken','betreiber_guthaben') then raise exception 'Analytics task retired'; end if;
  return new;
end; $$;
revoke execute on function public.analytics_current_run_guard() from public,anon,authenticated;
create trigger analytics_guard_session before insert on public.analytics_sessions for each row execute function public.analytics_current_run_guard();
create trigger analytics_guard_event before insert on public.analytics_events for each row execute function public.analytics_current_run_guard();
-- After the backup is durably saved, reset sessions/events explicitly in one transaction.
-- After publishing the matching frontend and ingest endpoint, set accepting=true.
