create table public.football_tournaments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  format text not null check (format in ('league', 'knockout')),
  start_stage text check (
    start_stage is null
    or start_stage in ('quarter_final', 'semi_final', 'final')
  ),
  status text not null default 'scheduled' check (
    status in ('scheduled', 'live', 'completed')
  ),
  win_points integer not null default 3 check (win_points >= 0),
  draw_points integer not null default 1 check (draw_points >= 0),
  loss_points integer not null default 0 check (loss_points >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (format = 'league' and start_stage is null)
    or (format = 'knockout' and start_stage is not null)
  )
);

create table public.football_tournament_teams (
  tournament_id uuid not null references public.football_tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  seed integer not null check (seed > 0),
  created_at timestamptz not null default now(),
  primary key (tournament_id, team_id),
  unique (tournament_id, seed)
);

create table public.football_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.football_tournaments(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  home_team_id uuid references public.teams(id) on delete restrict,
  away_team_id uuid references public.teams(id) on delete restrict,
  stage text not null check (
    stage in (
      'league',
      'round_of_16',
      'quarter_final',
      'semi_final',
      'third_place',
      'final',
      'friendly'
    )
  ),
  round_number integer not null default 1 check (round_number > 0),
  position integer not null default 1 check (position > 0),
  kickoff_at timestamptz,
  venue text,
  status text not null default 'scheduled' check (
    status in (
      'scheduled',
      'live',
      'halftime',
      'full_time',
      'postponed',
      'cancelled'
    )
  ),
  home_score integer not null default 0 check (home_score >= 0),
  away_score integer not null default 0 check (away_score >= 0),
  winner_team_id uuid references public.teams(id) on delete restrict,
  next_match_id uuid references public.football_matches(id) on delete set null,
  next_match_slot text check (
    next_match_slot is null or next_match_slot in ('home', 'away')
  ),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_team_id is null or away_team_id is null or home_team_id <> away_team_id),
  check (
    (next_match_id is null and next_match_slot is null)
    or (next_match_id is not null and next_match_slot is not null)
  )
);

create table public.football_match_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  tournament_id uuid not null references public.football_tournaments(id) on delete cascade,
  match_id uuid not null references public.football_matches(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (
    event_type in (
      'score',
      'kickoff',
      'halftime',
      'resume',
      'full_time',
      'reopen',
      'schedule'
    )
  ),
  home_score integer not null check (home_score >= 0),
  away_score integer not null check (away_score >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index football_tournaments_event_id_idx
on public.football_tournaments (event_id, created_at desc);

create index football_tournament_teams_tournament_id_idx
on public.football_tournament_teams (tournament_id, seed);

create index football_matches_tournament_order_idx
on public.football_matches (tournament_id, round_number, position);

create index football_matches_event_status_kickoff_idx
on public.football_matches (event_id, status, kickoff_at);

create index football_match_events_match_created_at_idx
on public.football_match_events (match_id, created_at desc);

create trigger football_tournaments_set_updated_at
before update on public.football_tournaments
for each row execute function public.set_updated_at();

create trigger football_matches_set_updated_at
before update on public.football_matches
for each row execute function public.set_updated_at();

create or replace function public.validate_football_tournament_team()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.football_tournaments
    join public.teams
      on teams.id = new.team_id
    where football_tournaments.id = new.tournament_id
      and football_tournaments.event_id = teams.event_id
  ) then
    raise exception 'Tournament teams must belong to the same event';
  end if;

  return new;
end;
$$;

create trigger football_tournament_teams_validate_event
before insert or update on public.football_tournament_teams
for each row execute function public.validate_football_tournament_team();

create or replace function public.validate_football_match()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.football_tournaments
    where football_tournaments.id = new.tournament_id
      and football_tournaments.event_id = new.event_id
  ) then
    raise exception 'Match tournament and event must match';
  end if;

  if new.home_team_id is not null and not exists (
    select 1
    from public.football_tournament_teams
    where football_tournament_teams.tournament_id = new.tournament_id
      and football_tournament_teams.team_id = new.home_team_id
  ) then
    raise exception 'Home team must belong to the tournament';
  end if;

  if new.away_team_id is not null and not exists (
    select 1
    from public.football_tournament_teams
    where football_tournament_teams.tournament_id = new.tournament_id
      and football_tournament_teams.team_id = new.away_team_id
  ) then
    raise exception 'Away team must belong to the tournament';
  end if;

  if new.winner_team_id is not null
    and new.winner_team_id is distinct from new.home_team_id
    and new.winner_team_id is distinct from new.away_team_id then
    raise exception 'Winner must be one of the teams in the match';
  end if;

  return new;
end;
$$;

create trigger football_matches_validate_relationships
before insert or update on public.football_matches
for each row execute function public.validate_football_match();

alter table public.football_tournaments enable row level security;
alter table public.football_tournament_teams enable row level security;
alter table public.football_matches enable row level security;
alter table public.football_match_events enable row level security;

create policy "Public can read football tournaments for unlocked events"
on public.football_tournaments for select
using (
  exists (
    select 1
    from public.events
    where events.id = football_tournaments.event_id
      and (
        events.owner_id = auth.uid()
        or public.is_event_admin(events.id)
        or (
          events.visibility = 'public'
          and not exists (
            select 1
            from public.event_viewer_access_codes
            where event_viewer_access_codes.event_id = events.id
          )
        )
      )
  )
);

create policy "Event admins can manage football tournaments"
on public.football_tournaments for all
to authenticated
using (public.is_event_admin(event_id))
with check (public.is_event_admin(event_id));

create policy "Public can read football tournament teams for unlocked events"
on public.football_tournament_teams for select
using (
  exists (
    select 1
    from public.football_tournaments
    join public.events
      on events.id = football_tournaments.event_id
    where football_tournaments.id = football_tournament_teams.tournament_id
      and (
        events.owner_id = auth.uid()
        or public.is_event_admin(events.id)
        or (
          events.visibility = 'public'
          and not exists (
            select 1
            from public.event_viewer_access_codes
            where event_viewer_access_codes.event_id = events.id
          )
        )
      )
  )
);

create policy "Event admins can manage football tournament teams"
on public.football_tournament_teams for all
to authenticated
using (
  exists (
    select 1
    from public.football_tournaments
    where football_tournaments.id = football_tournament_teams.tournament_id
      and public.is_event_admin(football_tournaments.event_id)
  )
)
with check (
  exists (
    select 1
    from public.football_tournaments
    where football_tournaments.id = football_tournament_teams.tournament_id
      and public.is_event_admin(football_tournaments.event_id)
  )
);

create policy "Public can read football matches for unlocked events"
on public.football_matches for select
using (
  exists (
    select 1
    from public.events
    where events.id = football_matches.event_id
      and (
        events.owner_id = auth.uid()
        or public.is_event_admin(events.id)
        or (
          events.visibility = 'public'
          and not exists (
            select 1
            from public.event_viewer_access_codes
            where event_viewer_access_codes.event_id = events.id
          )
        )
      )
  )
);

create policy "Event admins can manage football matches"
on public.football_matches for all
to authenticated
using (public.is_event_admin(event_id))
with check (public.is_event_admin(event_id));

create policy "Event admins can read football match history"
on public.football_match_events for select
to authenticated
using (public.is_event_admin(event_id));

create policy "Event admins can add football match history"
on public.football_match_events for insert
to authenticated
with check (public.is_event_admin(event_id));

create or replace function public.get_public_football_for_viewer(
  event_slug text,
  submitted_code text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  target_event_id uuid;
  result jsonb;
begin
  if not public.verify_event_viewer_access(event_slug, submitted_code) then
    return null;
  end if;

  select events.id
  into target_event_id
  from public.events
  where events.slug = event_slug
    and events.visibility = 'public';

  if target_event_id is null then
    return null;
  end if;

  select jsonb_build_object(
    'tournaments',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', tournaments.id,
          'event_id', tournaments.event_id,
          'name', tournaments.name,
          'format', tournaments.format,
          'start_stage', tournaments.start_stage,
          'status', tournaments.status,
          'win_points', tournaments.win_points,
          'draw_points', tournaments.draw_points,
          'loss_points', tournaments.loss_points,
          'team_ids', (
            select coalesce(
              jsonb_agg(
                tournament_teams.team_id
                order by tournament_teams.seed
              ),
              '[]'::jsonb
            )
            from public.football_tournament_teams tournament_teams
            where tournament_teams.tournament_id = tournaments.id
          ),
          'matches', (
            select coalesce(
              jsonb_agg(
                jsonb_build_object(
                  'id', matches.id,
                  'tournament_id', matches.tournament_id,
                  'event_id', matches.event_id,
                  'home_team_id', matches.home_team_id,
                  'away_team_id', matches.away_team_id,
                  'stage', matches.stage,
                  'round_number', matches.round_number,
                  'position', matches.position,
                  'kickoff_at', matches.kickoff_at,
                  'venue', matches.venue,
                  'status', matches.status,
                  'home_score', matches.home_score,
                  'away_score', matches.away_score,
                  'winner_team_id', matches.winner_team_id,
                  'next_match_id', matches.next_match_id,
                  'next_match_slot', matches.next_match_slot,
                  'started_at', matches.started_at,
                  'ended_at', matches.ended_at,
                  'updated_at', matches.updated_at
                )
                order by matches.round_number, matches.position
              ),
              '[]'::jsonb
            )
            from public.football_matches matches
            where matches.tournament_id = tournaments.id
          )
        )
        order by tournaments.created_at desc
      ),
      '[]'::jsonb
    )
  )
  into result
  from public.football_tournaments tournaments
  where tournaments.event_id = target_event_id;

  return result;
end;
$$;

revoke all on function public.get_public_football_for_viewer(text, text)
from public;

grant execute on function public.get_public_football_for_viewer(text, text)
to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'football_matches'
  ) then
    alter publication supabase_realtime add table public.football_matches;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'football_tournaments'
  ) then
    alter publication supabase_realtime add table public.football_tournaments;
  end if;
end $$;
