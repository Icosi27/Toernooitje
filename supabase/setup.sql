-- Toernooitje: online synchronisatie
-- Plak dit één keer in de SQL Editor van je Supabase-project (supabase.com,
-- gratis account) en klik op Run. Daarna: Project Settings > API, kopieer de
-- "Project URL" en "anon public" key en plak ze in Toernooitje bij
-- Presentatie > Delen > Live online zetten.

create table if not exists public.tournaments (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Geheime schrijfsleutels staan apart en zijn voor niemand leesbaar
-- (RLS aan, geen policies); alleen de functies hieronder kunnen erbij.
create table if not exists public.tournament_keys (
  id text primary key references public.tournaments(id) on delete cascade,
  write_key text not null
);

create table if not exists public.scores (
  tournament_id text not null references public.tournaments(id) on delete cascade,
  match_id text not null,
  score_a int,
  score_b int,
  pens_a int,
  pens_b int,
  updated_at timestamptz not null default now(),
  primary key (tournament_id, match_id)
);

alter table public.tournaments enable row level security;
alter table public.tournament_keys enable row level security;
alter table public.scores enable row level security;

-- Iedereen mag toernooien en uitslagen lezen (bezoekers van de toernooipagina).
drop policy if exists "publiek lezen" on public.tournaments;
create policy "publiek lezen" on public.tournaments for select using (true);
drop policy if exists "publiek lezen" on public.scores;
create policy "publiek lezen" on public.scores for select using (true);

-- Schrijven kan alléén via deze functies, met de geheime write_key van het
-- toernooi (zit in de links van de organisator en scheidsrechters).

create or replace function public.publish_tournament(p_id text, p_key text, p_data jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  existing text;
begin
  -- reclamestatus wordt server-side bepaald door de betaling, niet door de client
  p_data := jsonb_set(
    p_data,
    '{presentation,adsRemoved}',
    to_jsonb(exists (select 1 from ad_buyouts b where b.tournament_id = p_id))
  );
  select write_key into existing from tournament_keys where id = p_id;
  if existing is null then
    insert into tournaments (id, data, updated_at) values (p_id, p_data, now())
    on conflict (id) do nothing;
    insert into tournament_keys (id, write_key) values (p_id, p_key)
    on conflict (id) do nothing;
  elsif existing = p_key then
    update tournaments set data = p_data, updated_at = now() where id = p_id;
  else
    raise exception 'Ongeldige sleutel';
  end if;
end;
$$;

create or replace function public.submit_score(
  p_tid text, p_key text, p_match text,
  p_a int, p_b int, p_pa int default null, p_pb int default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from tournament_keys where id = p_tid and write_key = p_key) then
    raise exception 'Ongeldige sleutel';
  end if;
  insert into scores (tournament_id, match_id, score_a, score_b, pens_a, pens_b, updated_at)
  values (p_tid, p_match, p_a, p_b, p_pa, p_pb, now())
  on conflict (tournament_id, match_id) do update
    set score_a = excluded.score_a, score_b = excluded.score_b,
        pens_a = excluded.pens_a, pens_b = excluded.pens_b, updated_at = now();
end;
$$;

create or replace function public.delete_tournament(p_id text, p_key text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (select 1 from tournament_keys where id = p_id and write_key = p_key) then
    delete from tournaments where id = p_id;
  end if;
end;
$$;

-- Online inschrijvingen. Geen select-policy: e-mailadressen zijn niet
-- publiek; de organisator leest ze via list_registrations met zijn sleutel.
create table if not exists public.registrations (
  id text primary key,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  division_id text,
  team_name text not null,
  contact text,
  email text,
  phone text,
  note text,
  status text not null default 'nieuw',
  created_at timestamptz not null default now()
);
alter table public.registrations enable row level security;

create or replace function public.submit_registration(
  p_id text, p_tid text, p_division text, p_team text,
  p_contact text, p_email text, p_phone text, p_note text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if coalesce((select data->>'registrationOpen' from tournaments where id = p_tid), 'false') <> 'true' then
    raise exception 'De inschrijving is gesloten';
  end if;
  if (select count(*) from registrations where tournament_id = p_tid) >= 500 then
    raise exception 'Maximum aantal inschrijvingen bereikt';
  end if;
  insert into registrations (id, tournament_id, division_id, team_name, contact, email, phone, note)
  values (p_id, p_tid, p_division, p_team, p_contact, p_email, p_phone, p_note)
  on conflict (id) do nothing;
end;
$$;

create or replace function public.list_registrations(p_tid text, p_key text)
returns setof public.registrations
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from tournament_keys where id = p_tid and write_key = p_key) then
    raise exception 'Ongeldige sleutel';
  end if;
  return query select * from registrations where tournament_id = p_tid order by created_at;
end;
$$;

create or replace function public.decide_registration(p_tid text, p_key text, p_rid text, p_status text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from tournament_keys where id = p_tid and write_key = p_key) then
    raise exception 'Ongeldige sleutel';
  end if;
  update registrations set status = p_status where id = p_rid and tournament_id = p_tid;
end;
$$;

-- Betalingen (reclame afkopen via Mollie). De payments-tabel is intern
-- (alleen Edge Functions met service-role); ad_buyouts is publiek leesbaar
-- zodat de app kan tonen dat een toernooi reclamevrij is.
create table if not exists public.payments (
  id text primary key, -- Mollie payment id (tr_...)
  tournament_id text not null,
  status text not null default 'open',
  amount numeric,
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;

create table if not exists public.ad_buyouts (
  tournament_id text primary key references public.tournaments(id) on delete cascade,
  payment_id text,
  amount numeric,
  paid_at timestamptz not null default now()
);
alter table public.ad_buyouts enable row level security;
drop policy if exists "publiek lezen" on public.ad_buyouts;
create policy "publiek lezen" on public.ad_buyouts for select using (true);

-- Koppeling account <-> toernooien: ingelogde organisatoren bewaren hier hun
-- volledige toernooien (incl. schrijfsleutel) zodat ze op elk apparaat verder
-- kunnen. Alleen de eigenaar kan zijn eigen rijen lezen en schrijven.
create table if not exists public.account_tournaments (
  user_id uuid not null references auth.users(id) on delete cascade,
  tournament_id text not null,
  write_key text,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, tournament_id)
);
alter table public.account_tournaments enable row level security;
drop policy if exists "eigen toernooien" on public.account_tournaments;
create policy "eigen toernooien" on public.account_tournaments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime: kijkers krijgen updates zodra er iets verandert.
do $$
begin
  alter publication supabase_realtime add table public.tournaments;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.scores;
exception when duplicate_object then null;
end $$;
