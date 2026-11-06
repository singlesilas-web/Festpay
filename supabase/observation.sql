create table public.festpay_observations (
  id uuid primary key,
  created_at timestamptz not null default now(),
  form_version smallint not null check (form_version = 1),
  participant_code text not null check (char_length(trim(participant_code)) between 1 and 60),
  app text not null check (char_length(trim(app)) between 1 and 80),
  test_date date not null,
  moderator text not null default '' check (char_length(moderator) <= 80),
  observer text not null default '' check (char_length(observer) <= 80),
  other text not null default '' check (char_length(other) <= 4000),
  observations jsonb not null,
  constraint observation_tasks check (
    jsonb_typeof(observations) = 'object' and observations <> '{}'::jsonb
    and observations - array['gast_guthaben','gast_marken','helfer','betreiber_marken','betreiber_guthaben'] = '{}'::jsonb
    and octet_length(observations::text) <= 340000
    and not jsonb_path_exists(observations, '$.* ? (@.type() != "object" || !exists(@.duration_ms) || @.duration_ms.type() != "number" || @.duration_ms < 0 || @.duration_ms > 86400000 || !exists(@.result) || (@.result != null && @.result != "independent" && @.result != "help" && @.result != "aborted"))')
  )
);
alter table public.festpay_observations enable row level security;
revoke all on public.festpay_observations from public, anon, authenticated;
grant insert (id,form_version,participant_code,app,test_date,moderator,observer,other,observations)
  on public.festpay_observations to anon;
grant all on public.festpay_observations to service_role;
create policy observation_submission on public.festpay_observations for insert to anon with check (form_version = 1);

create view public.festpay_observation_tasks with (security_invoker = true) as
select o.id as observation_id, o.created_at, o.participant_code, o.app, o.test_date, o.moderator, o.observer,
       t.key as task, t.value->>'result' as result,
       round((t.value->>'duration_ms')::numeric / 60000, 3) as duration_minutes,
       t.value->>'blockage' as blockage, t.value->>'quote' as quote,
       t.value->>'frustration' as frustration, t.value->>'liked' as liked, o.other
from public.festpay_observations o cross join lateral jsonb_each(o.observations) t;
revoke all on public.festpay_observation_tasks from public, anon, authenticated;
grant select on public.festpay_observation_tasks to service_role;

-- Demographic fields and formatted duration.
alter table public.festpay_observations
  add column age smallint check (age between 0 and 120),
  add column gender text check (gender in ('female','male','diverse','not_specified'));
grant insert (age,gender) on public.festpay_observations to anon;
create or replace view public.festpay_observation_tasks with (security_invoker = true) as
select o.id as observation_id, o.created_at, o.participant_code, o.app, o.test_date, o.moderator, o.observer,
       t.key as task, t.value->>'result' as result,
       round((t.value->>'duration_ms')::numeric / 60000, 3) as duration_minutes,
       t.value->>'blockage' as blockage, t.value->>'quote' as quote,
       t.value->>'frustration' as frustration, t.value->>'liked' as liked, o.other,
       o.age, o.gender,
       (floor((t.value->>'duration_ms')::numeric / 60000)::int)::text || ':' ||
       lpad((floor((t.value->>'duration_ms')::numeric / 1000)::int % 60)::text, 2, '0') || ' min' as duration
from public.festpay_observations o cross join lateral jsonb_each(o.observations) t;
