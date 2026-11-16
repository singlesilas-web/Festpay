-- Keep the originally submitted build when assigning a known UI iteration.
alter table public.analytics_sessions add column recorded_version text;
update public.analytics_sessions set recorded_version=version;
alter table public.analytics_sessions alter column recorded_version set not null;
-- The redesign was first committed on 2026-11-16 (a7c31e9).
-- P013 and P014 were observed using that UI; both remain excluded QA runs.
update public.analytics_sessions set version='festpay-2026-11-16-v10-redesign'
where version='festpay-2026-11-10-v9-clean' and participant_code in ('P013','P014')
  and excluded and started_at>='2026-11-16T10:49:43Z';

create or replace function public.analytics_current_run_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
declare enabled boolean; version_allowed text; submitted_version text; submitted_task text;
begin
  select accepting,active_version into enabled,version_allowed from public.analytics_run_settings where singleton for share;
  if not coalesce(enabled,false) then raise exception 'Analytics paused'; end if;
  if tg_table_name='analytics_sessions' then
    submitted_version=new.version;submitted_task=new.task;new.recorded_version=new.version;
    -- Rollout bridge: the new frontend may arrive just before the active-version flip.
    if submitted_version is distinct from version_allowed and not(version_allowed='festpay-2026-11-10-v9-clean' and submitted_version='festpay-2026-11-16-v10-redesign') then raise exception 'Analytics version retired'; end if;
  else
    select version,task into submitted_version,submitted_task from public.analytics_sessions where id=new.session_id;
    -- Old in-flight attempts may finish; the endpoint still verifies token and 4h TTL.
  end if;
  if submitted_version not in ('festpay-2026-11-10-v9-clean','festpay-2026-11-16-v10-redesign') then raise exception 'Analytics version retired'; end if;
  if submitted_task not in ('gast_guthaben','gast_marken','helfer','betreiber_marken','betreiber_guthaben') then raise exception 'Analytics task retired'; end if;
  return new;
end; $$;
