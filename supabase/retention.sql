create extension if not exists pg_cron;
select cron.schedule('festpay-analytics-retention','17 3 * * *',
  $$delete from public.analytics_sessions where started_at < now() - interval '90 days'$$);
