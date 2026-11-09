-- Expand the task catalog while retaining all historical sessions.
begin;
alter table public.analytics_sessions drop constraint analytics_sessions_task_check;
alter table public.analytics_sessions add constraint analytics_sessions_task_check check (task in ('w1', 'w2', 'explore', 'wallet_topped_up', 'wallet_qr_shown', 'tokens_purchased', 'token_redeemed', 'festival_created', 'festival_updated', 'festival_helper_saved', 'wallet_charged', 'gast_guthaben', 'gast_marken', 'helfer', 'betreiber_marken', 'betreiber_guthaben'));
commit;
