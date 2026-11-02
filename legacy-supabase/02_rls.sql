-- =========================================================
-- 02_rls.sql – Row Level Security + sichere Funktionen
-- Nach 01_schema.sql ausführen.
-- Geld wird NIE direkt per UPDATE geändert, nur über die Funktionen unten.
-- =========================================================

-- ---------- Hilfsfunktionen (security definer = keine RLS-Rekursion) ----------
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.ist_betreiber_von(_fest_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.feste where id = _fest_id and owner_id = auth.uid())
$$;

create or replace function public.ist_helfer_von(_fest_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.ist_betreiber_von(_fest_id)
      or exists (select 1 from public.fest_helfer where fest_id = _fest_id and user_id = auth.uid())
$$;

-- ---------- RLS einschalten ----------
alter table public.profiles          enable row level security;
alter table public.user_roles        enable row level security;
alter table public.feste             enable row level security;
alter table public.fest_helfer       enable row level security;
alter table public.aufladeoptionen   enable row level security;
alter table public.guthaben          enable row level security;
alter table public.speisekarte_items enable row level security;
alter table public.marken            enable row level security;
alter table public.transaktionen     enable row level security;

-- profiles
create policy "eigenes Profil lesen"   on public.profiles for select to authenticated using (id = auth.uid());
create policy "eigenes Profil ändern"  on public.profiles for update to authenticated using (id = auth.uid());

-- user_roles: nur eigene lesen, vergeben nur Admin
create policy "eigene Rollen lesen" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admin verwaltet Rollen" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- feste: aktive öffentlich, Betreiber verwaltet eigene
create policy "aktive Feste öffentlich" on public.feste for select to anon, authenticated
  using (aktiv or owner_id = auth.uid());
create policy "Betreiber legt Fest an" on public.feste for insert to authenticated
  with check (owner_id = auth.uid() and public.has_role(auth.uid(), 'betreiber'));
create policy "Betreiber ändert eigenes Fest" on public.feste for update to authenticated
  using (owner_id = auth.uid());
create policy "Betreiber löscht eigenes Fest" on public.feste for delete to authenticated
  using (owner_id = auth.uid());

-- fest_helfer
create policy "Helferliste sehen" on public.fest_helfer for select to authenticated
  using (user_id = auth.uid() or public.ist_betreiber_von(fest_id));
create policy "Betreiber verwaltet Helfer" on public.fest_helfer for all to authenticated
  using (public.ist_betreiber_von(fest_id)) with check (public.ist_betreiber_von(fest_id));

-- aufladeoptionen & speisekarte: öffentlich lesen, Betreiber schreibt
create policy "Aufladeoptionen lesen" on public.aufladeoptionen for select to anon, authenticated using (true);
create policy "Betreiber pflegt Aufladeoptionen" on public.aufladeoptionen for all to authenticated
  using (public.ist_betreiber_von(fest_id)) with check (public.ist_betreiber_von(fest_id));
create policy "Speisekarte lesen" on public.speisekarte_items for select to anon, authenticated using (true);
create policy "Betreiber pflegt Speisekarte" on public.speisekarte_items for all to authenticated
  using (public.ist_betreiber_von(fest_id)) with check (public.ist_betreiber_von(fest_id));

-- guthaben: Gast sieht eigenes, Helfer/Betreiber des Fests sehen es beim Scannen. Kein direktes Schreiben.
create policy "Guthaben lesen" on public.guthaben for select to authenticated
  using (user_id = auth.uid() or public.ist_helfer_von(fest_id));

-- marken: Gast sieht eigene, Betreiber sieht alle seines Fests. Kein direktes Schreiben.
create policy "Marken lesen" on public.marken for select to authenticated
  using (user_id = auth.uid() or public.ist_betreiber_von(fest_id));

-- transaktionen
create policy "Transaktionen lesen" on public.transaktionen for select to authenticated
  using (user_id = auth.uid() or public.ist_betreiber_von(fest_id));

-- Direktes Schreiben auf Geldtabellen entziehen
revoke insert, update, delete on public.guthaben, public.marken, public.transaktionen from authenticated;

-- =========================================================
-- Funktionen (RPC) – einzige Wege, Geld zu bewegen
-- =========================================================

-- Helfer bucht Guthaben ab (W1)
create or replace function public.guthaben_abbuchen(_fest_id uuid, _user_id uuid, _betrag numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare neu numeric;
begin
  if not public.ist_helfer_von(_fest_id) then raise exception 'Keine Berechtigung'; end if;
  if _betrag <= 0 then raise exception 'Ungültiger Betrag'; end if;
  update public.guthaben set betrag = betrag - _betrag, updated_at = now()
    where fest_id = _fest_id and user_id = _user_id and betrag >= _betrag
    returning betrag into neu;
  if neu is null then raise exception 'Guthaben reicht nicht aus'; end if;
  insert into public.transaktionen (fest_id, user_id, helfer_id, typ, betrag)
    values (_fest_id, _user_id, auth.uid(), 'abbuchung', _betrag);
  return neu;
end; $$;

-- Gast entwertet eigene Marke (W2)
create or replace function public.marke_entwerten(_marke_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.marken set status = 'entwertet', entwertet_am = now()
    where id = _marke_id and user_id = auth.uid() and status = 'offen';
  if not found then raise exception 'Marke ungültig oder bereits entwertet'; end if;
end; $$;

-- ---------------------------------------------------------
-- NUR FÜR DEN KLICKDUMMY / TESTBETRIEB!
-- Bucht ohne echte Zahlung. Im Echtbetrieb löschen und die
-- Gutschrift serverseitig nach Zahlungs-Webhook (service_role) ausführen.
-- ---------------------------------------------------------
create or replace function public.guthaben_aufladen_demo(_fest_id uuid, _betrag numeric, _zahlungsart text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.aufladeoptionen where fest_id = _fest_id and betrag = _betrag)
    then raise exception 'Betrag nicht erlaubt'; end if;
  insert into public.guthaben (fest_id, user_id, betrag) values (_fest_id, auth.uid(), _betrag)
    on conflict (fest_id, user_id) do update set betrag = guthaben.betrag + excluded.betrag, updated_at = now();
  insert into public.transaktionen (fest_id, user_id, typ, betrag, zahlungsart)
    values (_fest_id, auth.uid(), 'aufladung', _betrag, _zahlungsart);
end; $$;

-- _items: [{ "item_id": "...", "menge": 2 }, ...]
create or replace function public.marken_kaufen_demo(_fest_id uuid, _items jsonb, _zahlungsart text)
returns void language plpgsql security definer set search_path = public as $$
declare pos jsonb; it record; summe numeric := 0;
begin
  for pos in select * from jsonb_array_elements(_items) loop
    select * into it from public.speisekarte_items
      where id = (pos->>'item_id')::uuid and fest_id = _fest_id and verfuegbar;
    if it is null then raise exception 'Artikel nicht verfügbar'; end if;
    insert into public.marken (fest_id, user_id, item_id, preis)
      select _fest_id, auth.uid(), it.id, it.preis from generate_series(1, (pos->>'menge')::int);
    summe := summe + it.preis * (pos->>'menge')::int;
  end loop;
  insert into public.transaktionen (fest_id, user_id, typ, betrag, zahlungsart)
    values (_fest_id, auth.uid(), 'markenkauf', summe, _zahlungsart);
end; $$;

revoke execute on all functions in schema public from anon;
grant execute on function public.guthaben_abbuchen, public.marke_entwerten,
  public.guthaben_aufladen_demo, public.marken_kaufen_demo, public.has_role to authenticated;
