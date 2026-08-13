alter table public.events
add column sport text not null default 'football'
check (sport in ('football', 'basketball'));

create table public.basketball_tournaments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  format text not null check (format in ('league', 'knockout')),
  start_stage text check (start_stage is null or start_stage in ('quarter_final', 'semi_final', 'final')),
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'completed')),
  game_minutes smallint not null default 8 check (game_minutes between 1 and 60),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((format = 'league' and start_stage is null) or (format = 'knockout' and start_stage is not null))
);

create table public.basketball_tournament_teams (
  tournament_id uuid not null references public.basketball_tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  seed integer not null check (seed > 0),
  created_at timestamptz not null default now(),
  primary key (tournament_id, team_id),
  unique (tournament_id, seed)
);

create table public.basketball_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.basketball_tournaments(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  home_team_id uuid references public.teams(id) on delete restrict,
  away_team_id uuid references public.teams(id) on delete restrict,
  stage text not null check (stage in ('league', 'quarter_final', 'semi_final', 'third_place', 'final', 'friendly')),
  round_number integer not null default 1 check (round_number > 0),
  position integer not null default 1 check (position > 0),
  tipoff_at timestamptz,
  court text,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'full_time', 'postponed', 'cancelled')),
  home_score integer not null default 0 check (home_score >= 0),
  away_score integer not null default 0 check (away_score >= 0),
  winner_team_id uuid references public.teams(id) on delete restrict,
  next_match_id uuid references public.basketball_matches(id) on delete set null,
  next_match_slot text check (next_match_slot is null or next_match_slot in ('home', 'away')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_team_id is null or away_team_id is null or home_team_id <> away_team_id),
  check ((next_match_id is null and next_match_slot is null) or (next_match_id is not null and next_match_slot is not null))
);

create index basketball_tournaments_event_idx on public.basketball_tournaments (event_id, created_at desc);
create index basketball_tournament_teams_idx on public.basketball_tournament_teams (tournament_id, seed);
create index basketball_matches_order_idx on public.basketball_matches (tournament_id, round_number, position);
create index basketball_matches_live_idx on public.basketball_matches (event_id, status, tipoff_at);
create unique index basketball_one_live_match_per_event_idx
on public.basketball_matches (event_id)
where status = 'live';

create or replace function public.validate_football_tournament_sport()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.events
    where events.id = new.event_id and events.sport = 'football'
  ) then
    raise exception 'Football tournaments must belong to a football event';
  end if;
  return new;
end;
$$;

create trigger football_tournaments_validate_sport
before insert or update of event_id on public.football_tournaments
for each row execute function public.validate_football_tournament_sport();

create or replace function public.validate_basketball_tournament_sport()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.events
    where events.id = new.event_id and events.sport = 'basketball'
  ) then
    raise exception 'Basketball tournaments must belong to a basketball event';
  end if;
  return new;
end;
$$;

create trigger basketball_tournaments_validate_sport
before insert or update of event_id on public.basketball_tournaments
for each row execute function public.validate_basketball_tournament_sport();

create trigger basketball_tournaments_set_updated_at
before update on public.basketball_tournaments
for each row execute function public.set_updated_at();

create trigger basketball_matches_set_updated_at
before update on public.basketball_matches
for each row execute function public.set_updated_at();

create or replace function public.validate_basketball_tournament_team()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.basketball_tournaments
    join public.teams on teams.id = new.team_id
    where basketball_tournaments.id = new.tournament_id
      and basketball_tournaments.event_id = teams.event_id
  ) then
    raise exception 'Tournament teams must belong to the same event';
  end if;
  return new;
end;
$$;

create trigger basketball_tournament_teams_validate_event
before insert or update on public.basketball_tournament_teams
for each row execute function public.validate_basketball_tournament_team();

create or replace function public.validate_basketball_match()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.basketball_tournaments
    where id = new.tournament_id and event_id = new.event_id
  ) then raise exception 'Match tournament and event must match'; end if;
  if new.home_team_id is not null and not exists (
    select 1 from public.basketball_tournament_teams
    where tournament_id = new.tournament_id and team_id = new.home_team_id
  ) then raise exception 'Home team must belong to the tournament'; end if;
  if new.away_team_id is not null and not exists (
    select 1 from public.basketball_tournament_teams
    where tournament_id = new.tournament_id and team_id = new.away_team_id
  ) then raise exception 'Away team must belong to the tournament'; end if;
  if new.winner_team_id is not null
    and new.winner_team_id is distinct from new.home_team_id
    and new.winner_team_id is distinct from new.away_team_id
  then raise exception 'Winner must be one of the teams in the match'; end if;
  return new;
end;
$$;

create trigger basketball_matches_validate_relationships
before insert or update on public.basketball_matches
for each row execute function public.validate_basketball_match();

alter table public.basketball_tournaments enable row level security;
alter table public.basketball_tournament_teams enable row level security;
alter table public.basketball_matches enable row level security;

create policy "Public can read basketball tournaments for unlocked events"
on public.basketball_tournaments for select using (
  exists (select 1 from public.events where events.id = basketball_tournaments.event_id and (
    events.owner_id = auth.uid() or public.is_event_admin(events.id) or
    (events.visibility = 'public' and not exists (select 1 from public.event_viewer_access_codes where event_id = events.id))
  ))
);
create policy "Event admins can manage basketball tournaments"
on public.basketball_tournaments for all to authenticated
using (public.is_event_admin(event_id)) with check (public.is_event_admin(event_id));

create policy "Public can read basketball tournament teams for unlocked events"
on public.basketball_tournament_teams for select using (
  exists (select 1 from public.basketball_tournaments bt join public.events e on e.id = bt.event_id
    where bt.id = basketball_tournament_teams.tournament_id and (
      e.owner_id = auth.uid() or public.is_event_admin(e.id) or
      (e.visibility = 'public' and not exists (select 1 from public.event_viewer_access_codes where event_id = e.id))
    ))
);
create policy "Event admins can manage basketball tournament teams"
on public.basketball_tournament_teams for all to authenticated
using (exists (
  select 1 from public.basketball_tournaments
  where basketball_tournaments.id = basketball_tournament_teams.tournament_id
    and public.is_event_admin(basketball_tournaments.event_id)
))
with check (exists (
  select 1 from public.basketball_tournaments
  where basketball_tournaments.id = basketball_tournament_teams.tournament_id
    and public.is_event_admin(basketball_tournaments.event_id)
));

create policy "Public can read basketball matches for unlocked events"
on public.basketball_matches for select using (
  exists (select 1 from public.events where events.id = basketball_matches.event_id and (
    events.owner_id = auth.uid() or public.is_event_admin(events.id) or
    (events.visibility = 'public' and not exists (select 1 from public.event_viewer_access_codes where event_id = events.id))
  ))
);
create policy "Event admins can manage basketball matches"
on public.basketball_matches for all to authenticated
using (public.is_event_admin(event_id)) with check (public.is_event_admin(event_id));

create or replace function public.get_public_event_for_viewer(event_slug text, submitted_code text default '')
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'id', events.id, 'name', events.name, 'slug', events.slug,
    'description', events.description, 'date_label', events.date_label,
    'location', events.location, 'visibility', events.visibility,
    'football_enabled', events.football_enabled, 'team_size', events.team_size,
    'sport', events.sport,
    'teams', coalesce(jsonb_agg(jsonb_build_object(
      'id', teams.id, 'name', teams.name, 'colour', teams.colour,
      'badge_text', teams.badge_text, 'badge_url', teams.badge_url
    ) order by teams.created_at) filter (where teams.id is not null), '[]'::jsonb)
  ) into result
  from public.events left join public.teams on teams.event_id = events.id
  where events.slug = event_slug and events.visibility = 'public'
    and public.verify_event_viewer_access(event_slug, submitted_code)
  group by events.id;
  return result;
end;
$$;

create or replace function public.get_public_basketball_for_viewer(event_slug text, submitted_code text default '')
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare target_event_id uuid; result jsonb;
begin
  if not public.verify_event_viewer_access(event_slug, submitted_code) then return null; end if;
  select id into target_event_id from public.events
  where slug = event_slug and visibility = 'public' and sport = 'basketball';
  if target_event_id is null then return null; end if;
  select jsonb_build_object('tournaments', coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id, 'event_id', t.event_id, 'name', t.name, 'format', t.format,
    'start_stage', t.start_stage, 'status', t.status, 'game_minutes', t.game_minutes,
    'team_ids', (select coalesce(jsonb_agg(tt.team_id order by tt.seed), '[]'::jsonb)
      from public.basketball_tournament_teams tt where tt.tournament_id = t.id),
    'matches', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id, 'tournament_id', m.tournament_id, 'event_id', m.event_id,
      'home_team_id', m.home_team_id, 'away_team_id', m.away_team_id,
      'stage', m.stage, 'round_number', m.round_number, 'position', m.position,
      'tipoff_at', m.tipoff_at, 'court', m.court, 'status', m.status,
      'home_score', m.home_score, 'away_score', m.away_score,
      'winner_team_id', m.winner_team_id, 'next_match_id', m.next_match_id,
      'next_match_slot', m.next_match_slot, 'started_at', m.started_at,
      'ended_at', m.ended_at, 'updated_at', m.updated_at
    ) order by m.round_number, m.position), '[]'::jsonb)
      from public.basketball_matches m where m.tournament_id = t.id)
  ) order by t.created_at desc), '[]'::jsonb)) into result
  from public.basketball_tournaments t where t.event_id = target_event_id;
  return result;
end;
$$;

create or replace function public.submit_team_join_request(
  event_slug text, submitted_code text, submitted_team_name text,
  submitted_team_colour text, submitted_player_names text[]
) returns uuid language plpgsql security definer set search_path = public as $$
declare target_event_id uuid; required_team_size smallint; new_request_id uuid;
  normalized_team_name text := trim(coalesce(submitted_team_name, ''));
  normalized_player_names text[];
begin
  select id, team_size into target_event_id, required_team_size from public.events
  where slug = event_slug and visibility = 'public'
    and public.verify_event_viewer_access(event_slug, submitted_code);
  if target_event_id is null then raise exception 'Tournament not found or access denied'; end if;
  if length(normalized_team_name) not between 2 and 60 then raise exception 'Team name must be between 2 and 60 characters'; end if;
  if public.contains_profanity(normalized_team_name) then raise exception 'Team name contains language that is not allowed'; end if;
  if coalesce(submitted_team_colour, '') !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Choose a valid team colour'; end if;
  if submitted_player_names is null or cardinality(submitted_player_names) <> required_team_size then
    raise exception 'Exactly % player names are required', required_team_size; end if;
  select array_agg(trim(player_name) order by slot) into normalized_player_names
  from unnest(submitted_player_names) with ordinality as players(player_name, slot);
  if exists (
    select 1 from unnest(normalized_player_names) as players(player_name)
    where length(player_name) not between 2 and 80
  )
    then raise exception 'Every player name must be between 2 and 80 characters'; end if;
  if exists (
    select 1 from unnest(normalized_player_names) as players(player_name)
    where public.contains_profanity(player_name)
  )
    then raise exception 'A player name contains language that is not allowed'; end if;
  if (
    select count(distinct lower(player_name))
    from unnest(normalized_player_names) as players(player_name)
  ) <> required_team_size
    then raise exception 'Enter % different player names', required_team_size; end if;
  if exists (select 1 from public.teams where event_id = target_event_id and lower(trim(name)) = lower(normalized_team_name))
    then raise exception 'A team with this name is already in the tournament'; end if;
  if exists (select 1 from public.team_join_requests where event_id = target_event_id and status = 'pending' and lower(trim(team_name)) = lower(normalized_team_name))
    then raise exception 'A request for this team name is already pending'; end if;
  insert into public.team_join_requests(event_id, team_name, team_colour)
  values (target_event_id, normalized_team_name, lower(submitted_team_colour)) returning id into new_request_id;
  insert into public.team_join_request_players(request_id, slot, name)
  select new_request_id, slot::smallint, player_name
  from unnest(normalized_player_names) with ordinality as players(player_name, slot);
  return new_request_id;
end;
$$;

revoke all on function public.get_public_event_for_viewer(text, text) from public;
revoke all on function public.get_public_basketball_for_viewer(text, text) from public;
revoke all on function public.submit_team_join_request(text, text, text, text, text[]) from public;
grant execute on function public.get_public_event_for_viewer(text, text) to anon, authenticated;
grant execute on function public.get_public_basketball_for_viewer(text, text) to anon, authenticated;
grant execute on function public.submit_team_join_request(text, text, text, text, text[]) to anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='basketball_matches')
    then alter publication supabase_realtime add table public.basketball_matches; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='basketball_tournaments')
    then alter publication supabase_realtime add table public.basketball_tournaments; end if;
end $$;
