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
