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


-- V2 upgrade (applied separately as standalone_festpay_survey_v2).
-- Upgrade v1 in place; existing responses and old open survey tabs remain valid.
alter table public.festpay_survey_responses
 alter column prior_problem drop not null,
 alter column task_success drop not null,
 drop constraint festpay_survey_responses_survey_version_check,
 add constraint festpay_survey_responses_survey_version_check check (survey_version in (1,2)),
 add column payment_practicality smallint check (payment_practicality between 0 and 5),
 add column payment_preference text check (payment_preference in ('cash','tokens','digital','no_preference','cannot_judge'));
alter table public.festpay_survey_responses
 add column task_topup text check (task_topup in ('done','with_help','failed','not_tried')),
 add column task_topup_note text not null default '' check (char_length(task_topup_note) <= 300),
 add constraint task_topup_note_context check (task_topup in ('with_help','failed') or task_topup_note = '');
alter table public.festpay_survey_responses
 add column task_qr text check (task_qr in ('done','with_help','failed','not_tried')),
 add column task_qr_note text not null default '' check (char_length(task_qr_note) <= 300),
 add constraint task_qr_note_context check (task_qr in ('with_help','failed') or task_qr_note = '');
alter table public.festpay_survey_responses
 add column task_buy_tokens text check (task_buy_tokens in ('done','with_help','failed','not_tried')),
 add column task_buy_tokens_note text not null default '' check (char_length(task_buy_tokens_note) <= 300),
 add constraint task_buy_tokens_note_context check (task_buy_tokens in ('with_help','failed') or task_buy_tokens_note = '');
alter table public.festpay_survey_responses
 add column task_redeem_token text check (task_redeem_token in ('done','with_help','failed','not_tried')),
 add column task_redeem_token_note text not null default '' check (char_length(task_redeem_token_note) <= 300),
 add constraint task_redeem_token_note_context check (task_redeem_token in ('with_help','failed') or task_redeem_token_note = '');
alter table public.festpay_survey_responses add constraint survey_version_answers check (
 (survey_version = 1 and prior_problem is not null and task_success is not null and payment_practicality is null and payment_preference is null and task_topup is null and task_topup_note = '' and task_qr is null and task_qr_note = '' and task_buy_tokens is null and task_buy_tokens_note = '' and task_redeem_token is null and task_redeem_token_note = '') or
 (survey_version = 2 and prior_problem is null and task_success is null and payment_practicality is not null and payment_preference is not null and task_topup is not null and task_qr is not null and task_buy_tokens is not null and task_redeem_token is not null)
);
grant insert (payment_practicality, payment_preference, task_topup, task_topup_note, task_qr, task_qr_note, task_buy_tokens, task_buy_tokens_note, task_redeem_token, task_redeem_token_note) on public.festpay_survey_responses to anon;
alter policy survey_submission on public.festpay_survey_responses to anon with check (consent = true and survey_version in (1,2));
comment on table public.festpay_survey_responses is 'Standalone Festpay survey v1/v2. V2: practicality 0=no experience, 1..5=very impractical to very practical; separate payment preference and four task outcomes/optional notes. No analytics linkage.';

-- Applied as standalone_festpay_survey_v3.
-- V3 adds separately interpretable coupon and perspective answers.
alter table public.festpay_survey_responses
 add column coupon_practicality smallint check (coupon_practicality between 0 and 5),
 add column guest_usefulness smallint check (guest_usefulness between 0 and 5),
 add column organizer_usefulness smallint check (organizer_usefulness between 0 and 5),
 drop constraint festpay_survey_responses_survey_version_check,
 add constraint festpay_survey_responses_survey_version_check check (survey_version in (1,2,3)),
 drop constraint survey_version_answers,
 add constraint survey_version_answers check (
 (survey_version = 1 and prior_problem is not null and task_success is not null and payment_practicality is null and payment_preference is null and task_topup is null and task_topup_note = '' and task_qr is null and task_qr_note = '' and task_buy_tokens is null and task_buy_tokens_note = '' and task_redeem_token is null and task_redeem_token_note = '') or
 (survey_version = 2 and prior_problem is null and task_success is null and payment_practicality is not null and payment_preference is not null and task_topup is not null and task_qr is not null and task_buy_tokens is not null and task_redeem_token is not null) or
 (survey_version = 3 and prior_problem is null and task_success is null and payment_practicality is null and payment_preference is not null and task_topup is not null and task_qr is not null and task_buy_tokens is not null and task_redeem_token is not null)
 ),
 add constraint survey_v3_questions check (
 (survey_version = 3 and coupon_practicality is not null and guest_usefulness is not null and organizer_usefulness is not null) or
 (survey_version < 3 and coupon_practicality is null and guest_usefulness is null and organizer_usefulness is null)
 ),
 drop constraint role_answers,
 add constraint role_answers check (
 (real_role = 'none') = (usefulness is null) and
 ((survey_version = 3 and intent is null) or (survey_version < 3 and (real_role = 'none') = (intent is null)))
 );
grant insert (coupon_practicality, guest_usefulness, organizer_usefulness) on public.festpay_survey_responses to anon;
alter policy survey_submission on public.festpay_survey_responses to anon with check (consent = true and survey_version in (1,2,3));
comment on table public.festpay_survey_responses is 'Standalone Festpay survey v1/v2/v3. V3 asks about cash-purchased coupons and guest/organizer usefulness separately. 0 means no experience or cannot judge. No analytics linkage.';
