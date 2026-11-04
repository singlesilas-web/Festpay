-- Independent post-test survey. No foreign keys to analytics or auth.
create table public.festpay_survey_responses (
 id uuid primary key,
 created_at timestamptz not null default now(),
 survey_version smallint not null default 1 check (survey_version = 1),
 real_role text not null check (real_role in ('guest','helper','organizer','none')),
 prior_problem text not null check (prior_problem in ('yes','partly','no','no_experience')),
 task_success text not null check (task_success in ('all','mostly','partly','none','free')),
 ease smallint not null check (ease between 0 and 5),
 navigation smallint not null check (navigation between 0 and 5),
 design smallint not null check (design between 0 and 5),
 enjoyment smallint not null check (enjoyment between 0 and 5),
 payment_clarity smallint not null check (payment_clarity between 0 and 5),
 balance_clarity smallint not null check (balance_clarity between 0 and 5),
 usefulness smallint check (usefulness between 0 and 5),
 intent smallint check (intent between 0 and 5),
 feedback text not null default '' check (char_length(feedback) <= 500),
 consent boolean not null check (consent = true),
 constraint role_answers check ((real_role = 'none' and usefulness is null and intent is null) or (real_role <> 'none' and usefulness is not null and intent is not null))
);
alter table public.festpay_survey_responses enable row level security;
revoke all on public.festpay_survey_responses from public, anon, authenticated;
grant insert (id, survey_version, real_role, prior_problem, task_success, ease, navigation, design, enjoyment, payment_clarity, balance_clarity, usefulness, intent, feedback, consent) on public.festpay_survey_responses to anon;
create policy survey_submission on public.festpay_survey_responses for insert to anon with check (consent = true and survey_version = 1);
comment on table public.festpay_survey_responses is 'Standalone Festpay survey v1; 0 = cannot judge, 1..5 = agreement. No analytics session linkage. Access for evaluation via Supabase dashboard only.';
