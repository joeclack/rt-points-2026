alter table public.football_matches
add column clock_paused_at timestamptz,
add column first_half_stoppage_seconds integer not null default 0
  check (first_half_stoppage_seconds >= 0),
add column second_half_stoppage_seconds integer not null default 0
  check (second_half_stoppage_seconds >= 0);

alter table public.football_match_events
drop constraint if exists football_match_events_event_type_check;

alter table public.football_match_events
add constraint football_match_events_event_type_check check (
  event_type in (
    'score',
    'kickoff',
    'halftime',
    'resume',
    'pause_clock',
    'resume_clock',
    'start_stoppage',
    'end_stoppage',
    'claim_control',
    'take_control',
    'release_control',
    'full_time',
    'reopen',
    'schedule'
  )
);

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
                  'clock_paused_at', matches.clock_paused_at,
                  'first_half_stoppage_seconds', matches.first_half_stoppage_seconds,
                  'second_half_stoppage_seconds', matches.second_half_stoppage_seconds,
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

revoke all on function public.get_public_football_for_viewer(text, text) from public;
grant execute on function public.get_public_football_for_viewer(text, text) to anon, authenticated;
