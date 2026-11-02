-- Server-owned allowlist; registration alone never grants analysis access.
create table public.analytics_admin_invites(email text primary key check(email=lower(email)));
alter table public.analytics_admin_invites enable row level security;
revoke all on public.analytics_admin_invites from public,anon,authenticated;
grant all on public.analytics_admin_invites to service_role;
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
-- Auth trigger must write a protected table; deliberately kept outside exposed schemas.
create function private.enroll_analytics_admin() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email_confirmed_at is not null and exists(select 1 from public.analytics_admin_invites where email=lower(new.email)) then
   insert into public.analytics_admins(user_id) values(new.id) on conflict do nothing;
 else
   delete from public.analytics_admins where user_id=new.id;
 end if;
 return new;
end; $$;
revoke execute on function private.enroll_analytics_admin() from public,anon,authenticated;
create trigger enroll_analytics_admin after insert or update of email,email_confirmed_at on auth.users for each row execute function private.enroll_analytics_admin();
