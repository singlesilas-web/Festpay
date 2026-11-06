-- Apply after survey version 4. Existing responses and submissions remain compatible.
alter table public.festpay_survey_responses
  add column if not exists legacy_payment_satisfaction smallint check (legacy_payment_satisfaction between 1 and 5),
  add column if not exists guest_abuse_feedback text check (char_length(guest_abuse_feedback) <= 1000),
  add column if not exists task_guest_balance text check (task_guest_balance in ('done','with_help','failed','not_tried')),
  add column if not exists task_guest_tokens text check (task_guest_tokens in ('done','with_help','failed','not_tried')),
  add column if not exists task_helper_checkout text check (task_helper_checkout in ('done','with_help','failed','not_tried')),
  add column if not exists task_organizer_tokens text check (task_organizer_tokens in ('done','with_help','failed','not_tried')),
  add column if not exists task_organizer_balance text check (task_organizer_balance in ('done','with_help','failed','not_tried')),
  add column if not exists task_organizer_helper text check (task_organizer_helper in ('done','with_help','failed','not_tried')),
  drop constraint festpay_survey_responses_survey_version_check,
  add constraint festpay_survey_responses_survey_version_check check (survey_version between 1 and 5),
  drop constraint survey_version_answers,
  add constraint survey_version_answers check (((((survey_version = 1) AND (prior_problem IS NOT NULL) AND (task_success IS NOT NULL) AND (payment_practicality IS NULL) AND (payment_preference IS NULL) AND (task_topup IS NULL) AND (task_topup_note = ''::text) AND (task_qr IS NULL) AND (task_qr_note = ''::text) AND (task_buy_tokens IS NULL) AND (task_buy_tokens_note = ''::text) AND (task_redeem_token IS NULL) AND (task_redeem_token_note = ''::text)) OR ((survey_version = 2) AND (prior_problem IS NULL) AND (task_success IS NULL) AND (payment_practicality IS NOT NULL) AND (payment_preference IS NOT NULL) AND (task_topup IS NOT NULL) AND (task_qr IS NOT NULL) AND (task_buy_tokens IS NOT NULL) AND (task_redeem_token IS NOT NULL)) OR ((survey_version = ANY (ARRAY[3, 4])) AND (prior_problem IS NULL) AND (task_success IS NULL) AND (payment_practicality IS NULL) AND (payment_preference IS NOT NULL) AND (task_topup IS NOT NULL) AND (task_qr IS NOT NULL) AND (task_buy_tokens IS NOT NULL) AND (task_redeem_token IS NOT NULL)))) or (survey_version = 5 and prior_problem is null and task_success is null and payment_practicality is null and payment_preference is not null and task_topup is null and task_qr is null and task_buy_tokens is null and task_redeem_token is null and task_topup_note = '' and task_qr_note = '' and task_buy_tokens_note = '' and task_redeem_token_note = '')),
  drop constraint survey_v3_questions,
  add constraint survey_v3_questions check (
    (survey_version in (3,4) and coupon_practicality is not null and guest_usefulness is not null and organizer_usefulness is not null)
    or (survey_version < 3 and coupon_practicality is null and guest_usefulness is null and organizer_usefulness is null)
    or (survey_version = 5 and coupon_practicality is null and guest_usefulness is not null and organizer_usefulness is not null)
  ),
  drop constraint role_answers,
  add constraint role_answers CHECK (((((survey_version < 4) AND ((real_role = 'none'::text) = (usefulness IS NULL))) OR ((survey_version >= 4) AND ((real_role = 'none'::text) = (usefulness IS NULL)))) AND (((survey_version >= 3) AND (intent IS NULL)) OR ((survey_version < 3) AND ((real_role = 'none'::text) = (intent IS NULL)))))),
  drop constraint survey_v4_roles_fee,
  add constraint survey_v4_roles_fee CHECK ((((survey_version < 4) AND (real_roles IS NULL) AND (organizer_transaction_fee_percent IS NULL)) OR ((survey_version >= 4) AND (real_roles IS NOT NULL) AND ((cardinality(real_roles) >= 1) AND (cardinality(real_roles) <= 3)) AND (real_roles <@ ARRAY['guest'::text, 'helper'::text, 'organizer'::text, 'none'::text]) AND ((cardinality(real_roles) = 1) OR (NOT ('none'::text = ANY (real_roles)))) AND (real_role = real_roles[1]) AND ((('organizer'::text = ANY (real_roles)) AND ((organizer_transaction_fee_percent >= (0)::numeric) AND (organizer_transaction_fee_percent <= (100)::numeric))) OR ((NOT ('organizer'::text = ANY (real_roles))) AND (organizer_transaction_fee_percent IS NULL)))))),
  add constraint survey_v5_answers check (
    (survey_version < 5 and legacy_payment_satisfaction is null and guest_abuse_feedback is null and task_guest_balance is null and task_guest_tokens is null and task_helper_checkout is null and task_organizer_tokens is null and task_organizer_balance is null and task_organizer_helper is null)
    or (survey_version = 5 and legacy_payment_satisfaction is not null and task_guest_balance is not null and task_guest_balance in ('done','with_help','failed','not_tried') and task_guest_tokens is not null and task_guest_tokens in ('done','with_help','failed','not_tried') and task_helper_checkout is not null and task_helper_checkout in ('done','with_help','failed','not_tried') and task_organizer_tokens is not null and task_organizer_tokens in ('done','with_help','failed','not_tried') and task_organizer_balance is not null and task_organizer_balance in ('done','with_help','failed','not_tried') and task_organizer_helper is not null and task_organizer_helper in ('done','with_help','failed','not_tried')
      and (guest_abuse_feedback is null or 'guest' = any(real_roles)))
  );
grant insert (legacy_payment_satisfaction, guest_abuse_feedback, task_guest_balance, task_guest_tokens, task_helper_checkout, task_organizer_tokens, task_organizer_balance, task_organizer_helper) on public.festpay_survey_responses to anon;
alter policy survey_submission on public.festpay_survey_responses to anon with check (consent = true and survey_version between 1 and 5);
