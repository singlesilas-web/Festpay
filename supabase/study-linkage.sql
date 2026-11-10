-- Additive migration. No historical links are guessed or backfilled.
create table public.study_participants (
  id uuid primary key,
  created_at timestamptz not null default now()
);
alter table public.study_participants enable row level security;
revoke all on public.study_participants from public, anon, authenticated;
grant select on public.study_participants to authenticated;
grant all on public.study_participants to service_role;
create policy study_admin_read on public.study_participants for select to authenticated using (exists(select 1 from public.analytics_admins a where a.user_id=(select auth.uid())));
alter table public.analytics_sessions add column participant_id uuid references public.study_participants(id);
create index analytics_sessions_participant on public.analytics_sessions(participant_id);

alter table public.festpay_survey_responses
  add column participant_id uuid references public.study_participants(id),
  add column attempt_ids uuid[] not null default '{}',
  add column linkage_consent boolean not null default false,
  add column age smallint check(age between 0 and 120);
alter table public.festpay_observations
  add column participant_id uuid references public.study_participants(id),
  add column attempt_ids uuid[] not null default '{}',
  add column linkage_consent boolean not null default false;
create index survey_participant on public.festpay_survey_responses(participant_id);
create index observation_participant on public.festpay_observations(participant_id);

-- Linked submissions go through the checked ingest endpoint. Legacy unlinked forms continue working.
create policy survey_linked_ingest_only on public.festpay_survey_responses as restrictive for insert to anon, authenticated with check (participant_id is null and cardinality(attempt_ids)=0 and not linkage_consent);
create policy observation_linked_ingest_only on public.festpay_observations as restrictive for insert to anon, authenticated with check (participant_id is null and cardinality(attempt_ids)=0 and not linkage_consent);
grant select on public.festpay_survey_responses,public.festpay_observations to authenticated;
create policy survey_admin_read on public.festpay_survey_responses for select to authenticated using (exists(select 1 from public.analytics_admins a where a.user_id=(select auth.uid())));
create policy observation_admin_read on public.festpay_observations for select to authenticated using (exists(select 1 from public.analytics_admins a where a.user_id=(select auth.uid())));

create function public.validate_study_form() returns trigger language plpgsql security invoker set search_path='' as $$
declare k text; v jsonb; observed_ids uuid[];
begin
  if new.participant_id is null then
    if cardinality(new.attempt_ids)>0 or new.linkage_consent then raise exception 'Missing participant'; end if;
    return new;
  end if;
  if not new.linkage_consent or cardinality(new.attempt_ids) not between 1 and 100 then raise exception 'Consent and attempts required'; end if;
  if (select count(*) from unnest(new.attempt_ids) x) <> (select count(distinct x) from unnest(new.attempt_ids) x) then raise exception 'Duplicate attempt'; end if;
  if exists(select 1 from unnest(new.attempt_ids) x where not exists(select 1 from public.analytics_sessions s where s.id=x and s.participant_id=new.participant_id and not s.excluded)) then raise exception 'Attempt does not belong to participant'; end if;
  if tg_table_name='festpay_observations' then
    observed_ids='{}';
    for k,v in select * from jsonb_each(new.observations) loop
      if not exists(select 1 from public.analytics_sessions s where s.id=(v->>'session_id')::uuid and s.participant_id=new.participant_id and s.task=k and not s.excluded) then raise exception 'Observation task/attempt mismatch'; end if;
      observed_ids=array_append(observed_ids,(v->>'session_id')::uuid);
    end loop;
    if not(new.attempt_ids @> observed_ids and observed_ids @> new.attempt_ids) then raise exception 'Observation attempt list mismatch'; end if;
  end if;
  return new;
end; $$;
revoke execute on function public.validate_study_form() from public,anon,authenticated;
create trigger survey_validate_link before insert or update on public.festpay_survey_responses for each row execute function public.validate_study_form();
create trigger observation_validate_link before insert or update on public.festpay_observations for each row execute function public.validate_study_form();

-- One row per attempt. All joins are ID-based; names, dates and approximate times are never matched.
create view public.study_attempt_analysis with(security_invoker=true) as
select s.id as attempt_id,s.participant_id,s.task,s.version,s.started_at,
  case when ages.n=1 then ages.age end as age,
  coalesce(ages.n>1,false) as age_conflict,
  case when ages.n<>1 or ages.n is null then 'missing_or_conflict' when ages.age between 20 and 30 then '20-30' when ages.age between 50 and 80 then '50-80' else 'other' end as age_group,
  coalesce(q.ids,'{}'::uuid[]) as survey_ids,coalesce(o.ids,'{}'::uuid[]) as observation_ids,
  coalesce(q.n,0) as survey_count,coalesce(o.n,0) as observation_count,
  obs.id as selected_observation_id,obs.observations->s.task->>'result' as observation_result,
  (obs.observations->s.task->>'duration_ms')::bigint as observation_duration_ms,
  survey.id as selected_survey_id,
  case when (select count(*) from public.analytics_sessions repeat_session where repeat_session.task=s.task and repeat_session.id=any(survey.attempt_ids))<=1 then case s.task when 'gast_guthaben' then survey.task_guest_balance when 'gast_marken' then survey.task_guest_tokens when 'helfer' then survey.task_helper_checkout when 'betreiber_marken' then survey.task_organizer_tokens when 'betreiber_guthaben' then survey.task_organizer_balance end end as survey_task_result,
  case when s.task='betreiber_guthaben' then survey.task_organizer_helper end as survey_helper_result,
  survey.ease as survey_ease,survey.navigation as survey_navigation,
  ev.clicks,ev.recorded_errors,ev.repeated_clicks,ev.goal_elapsed_ms,ev.end_elapsed_ms,ev.last_elapsed_ms,
  case when ev.goal_elapsed_ms is not null then 'observed_goal_reached' when ev.end_elapsed_ms is not null then 'ended_without_observed_goal' else 'open_or_unfinished' end as mining_outcome,
  case when s.participant_id is null then 'historical_unlinked' when coalesce(q.n,0)>1 or coalesce(o.n,0)>1 then 'multiple_forms_latest_selected' when coalesce(q.n,0)>0 and coalesce(o.n,0)>0 then 'all_three_linked' else 'partially_linked' end as linkage_status,
  case s.task when 'gast_guthaben' then survey.task_guest_balance when 'gast_marken' then survey.task_guest_tokens when 'helfer' then survey.task_helper_checkout when 'betreiber_marken' then survey.task_organizer_tokens when 'betreiber_guthaben' then survey.task_organizer_balance end as survey_reported_task_result,
  (select count(*) from public.analytics_sessions repeat_session where repeat_session.task=s.task and repeat_session.id=any(survey.attempt_ids)) as survey_task_attempt_count
from public.analytics_sessions s
left join lateral (
  select count(distinct a) as n,min(a) as age from (
    select age as a from public.festpay_survey_responses where participant_id=s.participant_id and linkage_consent and age is not null
    union all select age from public.festpay_observations where participant_id=s.participant_id and linkage_consent and age is not null
  ) all_ages
) ages on true
left join lateral (select array_agg(id order by created_at,id) ids,count(*) n from public.festpay_survey_responses where participant_id=s.participant_id and s.id=any(attempt_ids) and linkage_consent) q on true
left join lateral (select array_agg(id order by created_at,id) ids,count(*) n from public.festpay_observations where participant_id=s.participant_id and s.id=any(attempt_ids) and linkage_consent) o on true
left join lateral (select * from public.festpay_observations where participant_id=s.participant_id and s.id=any(attempt_ids) and linkage_consent order by created_at desc,id desc limit 1) obs on true
left join lateral (select * from public.festpay_survey_responses where participant_id=s.participant_id and s.id=any(attempt_ids) and linkage_consent order by created_at desc,id desc limit 1) survey on true
left join lateral (
  select count(*) filter(where type='click') as clicks,
    count(*) filter(where type='activity' and props->>'activity' like '%\_failed' escape '\') as recorded_errors,
    count(*) filter(where type='repeated_click') as repeated_clicks,
    min(elapsed) filter(where type='activity' and props->>'activity'=case s.task when 'gast_guthaben' then 'wallet_qr_shown' when 'gast_marken' then 'token_redeemed' when 'helfer' then 'wallet_charged' when 'betreiber_marken' then 'festival_created' when 'betreiber_guthaben' then 'festival_helper_saved' else s.task end) as goal_elapsed_ms,
    min(elapsed) filter(where type='session_end') as end_elapsed_ms,max(elapsed) as last_elapsed_ms
  from public.analytics_events where session_id=s.id
) ev on true
where not s.excluded;
revoke all on public.study_attempt_analysis from public,anon;
grant select on public.study_attempt_analysis to authenticated,service_role;
comment on view public.study_attempt_analysis is 'Admin-only, one row per attempt. goal_elapsed_ms measures an observed activity, NOT all requirements of a multi-part task. observation_result is the task assessment. Conflicting ages are null; multiple forms are flagged and latest form selected explicitly.';
