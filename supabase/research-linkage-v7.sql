-- Apply ONCE after analytics-tasks-v6.sql, survey-v5.sql and observation.sql.
-- Existing rows deliberately stay unlinked. No guessed demographic backfill.
begin;
alter table public.analytics_sessions
  add column trial_id uuid,
  add constraint analytics_linked_version check (
    version <> 'festpay-2026-11-10-v7-linked' or
    (trial_id is not null and consent_version = '2026-11-10-v3-linked')
  ),
  add constraint analytics_attempt_identity unique (id,trial_id,task);
create index analytics_sessions_trial on public.analytics_sessions(trial_id);

alter table public.festpay_survey_responses
  add column trial_id uuid,
  add column age smallint check (age between 0 and 120);
-- At most one questionnaire per trial. NULL permits independent historical rows.
create unique index festpay_survey_trial on public.festpay_survey_responses(trial_id);
grant insert (trial_id,age) on public.festpay_survey_responses to anon;

alter table public.festpay_observations
  add column trial_id uuid,
  add constraint observation_trial_identity unique (id,trial_id);
create index festpay_observations_trial on public.festpay_observations(trial_id);
grant insert (trial_id) on public.festpay_observations to anon;

-- A repeated task has a new analytics session. One observation per exact attempt.
create table public.festpay_observation_attempts (
  session_id uuid primary key,
  observation_id uuid not null,
  trial_id uuid not null,
  task text not null,
  foreign key (session_id,trial_id,task)
    references public.analytics_sessions(id,trial_id,task) on delete cascade,
  foreign key (observation_id,trial_id)
    references public.festpay_observations(id,trial_id) on delete cascade
);
create index observation_attempts_observation on public.festpay_observation_attempts(observation_id,trial_id);
alter table public.festpay_observation_attempts enable row level security;
revoke all on public.festpay_observation_attempts from public,anon,authenticated;
grant select on public.festpay_observation_attempts to authenticated;
grant all on public.festpay_observation_attempts to service_role;
create policy admin_read_attempts on public.festpay_observation_attempts for select to authenticated
using (exists(select 1 from public.analytics_admins a where a.user_id=(select auth.uid())));

-- Internal trigger only: guests cannot write the mapping directly or read sessions.
-- The composite FKs reject wrong trial IDs, wrong tasks, and nonexistent attempts.
create schema if not exists festpay_private;
revoke all on schema festpay_private from public,anon,authenticated;
create function festpay_private.link_observation_attempts() returns trigger
language plpgsql security definer set search_path='' as $$
declare item record;
begin
  delete from public.festpay_observation_attempts where observation_id=new.id;
  if new.trial_id is null then return new; end if;
  for item in select key,value from jsonb_each(new.observations) loop
    if item.value->>'attempt_id' is null then
      raise exception 'Missing task attempt ID' using errcode='23514';
    end if;
    insert into public.festpay_observation_attempts(session_id,observation_id,trial_id,task)
    values ((item.value->>'attempt_id')::uuid,new.id,new.trial_id,item.key);
  end loop;
  return new;
end; $$;
revoke all on function festpay_private.link_observation_attempts() from public,anon,authenticated;
create trigger observation_linkage after insert or update of trial_id,observations on public.festpay_observations
for each row execute function festpay_private.link_observation_attempts();

-- Existing analysts gain read access under the same explicit allowlist as analytics.
grant select on public.festpay_observations,public.festpay_survey_responses to authenticated;
create policy admin_read_observations on public.festpay_observations for select to authenticated
using (exists(select 1 from public.analytics_admins a where a.user_id=(select auth.uid())));
create policy admin_read_surveys on public.festpay_survey_responses for select to authenticated
using (exists(select 1 from public.analytics_admins a where a.user_id=(select auth.uid())));

-- Exactly one row per attempt. Conflicting ages stay NULL and are flagged.
-- Only explicit linkage participates; no date, name or task-order heuristics.
create view public.festpay_research_attempts with (security_invoker=true) as
with ages as (
  select trial_id,age from public.festpay_observations where trial_id is not null and age is not null
  union all
  select trial_id,age from public.festpay_survey_responses where trial_id is not null and age is not null
), demographics as (
  select trial_id, count(distinct age)>1 as age_conflict,
    case when count(distinct age)=1 then min(age) end as age
  from ages group by trial_id
)
select s.id as id, s.trial_id, s.task, s.version, s.started_at,
  d.age, coalesce(d.age_conflict,false) as age_conflict,
  case when d.age between 20 and 30 then '20–30'
       when d.age between 50 and 80 then '50–80'
       when d.age is not null then 'Andere' else 'Unbekannt' end as age_group,
  q.id as survey_id, to_jsonb(q) - 'trial_id' - 'created_at' as survey,
  o.id as observation_id, o.observations->s.task as observation,
  case when s.trial_id is null then 'unlinked'
       when q.id is not null and o.id is not null then 'complete'
       else 'partial' end as linkage
from public.analytics_sessions s
left join demographics d on d.trial_id=s.trial_id
left join public.festpay_survey_responses q on q.trial_id=s.trial_id
left join public.festpay_observation_attempts m on m.session_id=s.id
left join public.festpay_observations o on o.id=m.observation_id
where not s.excluded;
revoke all on public.festpay_research_attempts from public,anon,authenticated;
grant select on public.festpay_research_attempts to authenticated,service_role;
comment on view public.festpay_research_attempts is 'One row per task attempt, trial-linked questionnaire and exact observation. Age conflicts excluded from age groups. Subject-level survey outcomes are not per-attempt outcomes.';
notify pgrst,'reload schema';
commit;
