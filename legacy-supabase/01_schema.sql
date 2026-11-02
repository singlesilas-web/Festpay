-- =========================================================
-- 01_schema.sql – Tabellen für FestPay
-- Im Supabase Dashboard > SQL Editor ausführen (vor 02_rls.sql).
-- Keine Beispieldaten – alles startet leer.
-- =========================================================

-- Rollen
create type public.app_role as enum ('gast', 'helfer', 'betreiber', 'admin');
create type public.marken_status as enum ('offen', 'entwertet', 'erstattet');
create type public.transaktion_typ as enum ('aufladung', 'abbuchung', 'markenkauf', 'erstattung');

-- Profile (1:1 zu auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  anzeigename text,
  created_at timestamptz not null default now()
);

-- Rollen getrennt vom Profil (Schutz vor Rechte-Ausweitung)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

-- Feste
create table public.feste (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  ort text,
  beginn timestamptz,
  ende timestamptz,
  zone jsonb not null,                 -- Polygon: [[lng,lat], ...] bzw. Kartenpunkte
  w1_aktiv boolean not null default true,   -- W1 Festguthaben
  w2_aktiv boolean not null default true,   -- W2 Festmarken
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);

-- Helfer je Fest
create table public.fest_helfer (
  fest_id uuid not null references public.feste(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (fest_id, user_id)
);

-- W1: Aufladebeträge, die der Betreiber vorgibt
create table public.aufladeoptionen (
  id uuid primary key default gen_random_uuid(),
  fest_id uuid not null references public.feste(id) on delete cascade,
  betrag numeric(10,2) not null check (betrag > 0),
  unique (fest_id, betrag)
);

-- W1: Guthaben pro Gast und Fest
create table public.guthaben (
  fest_id uuid not null references public.feste(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  betrag numeric(10,2) not null default 0 check (betrag >= 0),
  updated_at timestamptz not null default now(),
  primary key (fest_id, user_id)
);

-- W2: Speisekarte
create table public.speisekarte_items (
  id uuid primary key default gen_random_uuid(),
  fest_id uuid not null references public.feste(id) on delete cascade,
  name text not null,
  preis numeric(10,2) not null check (preis >= 0),
  kategorie text,
  icon text,                           -- Lucide-Iconname, z.B. 'beer'
  verfuegbar boolean not null default true,
  created_at timestamptz not null default now()
);

-- W2: Festmarken (1 Marke = 1 Artikel)
create table public.marken (
  id uuid primary key default gen_random_uuid(),
  fest_id uuid not null references public.feste(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.speisekarte_items(id) on delete restrict,
  preis numeric(10,2) not null,
  status public.marken_status not null default 'offen',
  entwertet_am timestamptz,
  created_at timestamptz not null default now()
);

-- Buchungsjournal (alles, was Geld bewegt)
create table public.transaktionen (
  id uuid primary key default gen_random_uuid(),
  fest_id uuid not null references public.feste(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  helfer_id uuid references auth.users(id),
  typ public.transaktion_typ not null,
  betrag numeric(10,2) not null,
  zahlungsart text,
  zahlungs_referenz text,              -- ID vom Zahlungsanbieter
  created_at timestamptz not null default now()
);

create index on public.marken (user_id);
create index on public.transaktionen (fest_id);

-- Profil + Gast-Rolle automatisch bei Registrierung
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_roles (user_id, role) values (new.id, 'gast');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Data-API Zugriffe (Supabase vergibt diese nicht automatisch)
grant select on public.feste, public.aufladeoptionen, public.speisekarte_items to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
