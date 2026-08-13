alter table public.events
add column football_match_minutes integer not null default 20
check (
  football_match_minutes between 2 and 180
  and football_match_minutes % 2 = 0
);

alter table public.football_matches
add column second_half_started_at timestamptz;

create or replace function public.get_public_event_for_viewer(
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
  result jsonb;
begin
  select jsonb_build_object(
    'id', events.id,
    'name', events.name,
    'slug', events.slug,
    'description', events.description,
    'date_label', events.date_label,
    'location', events.location,
    'visibility', events.visibility,
    'football_enabled', events.football_enabled,
    'team_size', events.team_size,
    'sport', events.sport,
    'status', events.status,
    'football_match_minutes', events.football_match_minutes,
    'teams', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', teams.id,
          'name', teams.name,
          'colour', teams.colour,
          'badge_text', teams.badge_text,
          'badge_url', teams.badge_url
        ) order by teams.created_at
      ) filter (where teams.id is not null),
      '[]'::jsonb
    )
  )
  into result
  from public.events
  left join public.teams on teams.event_id = events.id
  where events.slug = event_slug
    and events.visibility = 'public'
    and public.verify_event_viewer_access(event_slug, submitted_code)
  group by events.id;

  return result;
end;
$$;

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
    and events.visibility = 'public'
    and events.sport = 'football';

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
              jsonb_agg(tournament_teams.team_id order by tournament_teams.seed),
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
                  'second_half_started_at', matches.second_half_started_at,
                  'ended_at', matches.ended_at,
                  'updated_at', matches.updated_at
                ) order by matches.round_number, matches.position
              ),
              '[]'::jsonb
            )
            from public.football_matches matches
            where matches.tournament_id = tournaments.id
          )
        ) order by tournaments.created_at desc
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

revoke all on function public.get_public_event_for_viewer(text, text) from public;
revoke all on function public.get_public_football_for_viewer(text, text) from public;
grant execute on function public.get_public_event_for_viewer(text, text) to anon, authenticated;
grant execute on function public.get_public_football_for_viewer(text, text) to anon, authenticated;
