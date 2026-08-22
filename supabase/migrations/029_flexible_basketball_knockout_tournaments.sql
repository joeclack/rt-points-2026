create or replace function public.create_basketball_tournament_atomic(
  p_tournament_id uuid,
  p_event_id uuid,
  p_name text,
  p_format text,
  p_start_stage text,
  p_game_minutes integer,
  p_team_ids uuid[],
  p_fixtures jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'Authentication is required';
  end if;
  if not public.is_event_admin(p_event_id) then
    raise exception 'You do not have access to manage this tournament';
  end if;
  if not exists (
    select 1 from public.events where id = p_event_id and sport = 'basketball'
  ) then
    raise exception 'Basketball tournament not found';
  end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 100 then
    raise exception 'Tournament name is required';
  end if;
  if p_format not in ('league', 'knockout') then
    raise exception 'Choose a format';
  end if;
  if p_game_minutes not between 1 and 60 then
    raise exception 'Game length must be between 1 and 60 minutes';
  end if;
  if cardinality(p_team_ids) < 2
    or cardinality(p_team_ids) <> (
      select count(distinct selected.team_id)
      from unnest(p_team_ids) as selected(team_id)
    ) then
    raise exception 'Choose at least two different teams';
  end if;
  if (select count(*) from public.teams where event_id = p_event_id and id = any(p_team_ids)) <> cardinality(p_team_ids) then
    raise exception 'One or more teams are invalid';
  end if;

  if p_format = 'knockout' then
    if p_start_stage not in ('quarter_final', 'semi_final', 'final') then
      raise exception 'Choose a knockout bracket';
    end if;
  elsif p_start_stage is not null then
    raise exception 'Round-robin tournaments cannot have an opening knockout round';
  end if;

  if exists (select 1 from public.basketball_tournaments where id = p_tournament_id) then
    if exists (
      select 1
      from public.basketball_tournaments
      where id = p_tournament_id
        and event_id = p_event_id
        and created_by = v_actor_id
    ) then
      return p_tournament_id;
    end if;
    raise exception 'Tournament creation ID has already been used';
  end if;

  insert into public.basketball_tournaments (
    id, event_id, name, format, start_stage, game_minutes, created_by
  ) values (
    p_tournament_id,
    p_event_id,
    trim(p_name),
    p_format,
    case when p_format = 'knockout' then p_start_stage else null end,
    p_game_minutes,
    v_actor_id
  );

  insert into public.basketball_tournament_teams (tournament_id, team_id, seed)
  select p_tournament_id, team_id, seed::integer
  from unnest(p_team_ids) with ordinality as selected(team_id, seed);

  insert into public.basketball_matches (
    id,
    tournament_id,
    event_id,
    home_team_id,
    away_team_id,
    stage,
    round_number,
    position,
    next_match_id,
    next_match_slot
  )
  select
    fixture.id,
    p_tournament_id,
    p_event_id,
    fixture.home_team_id,
    fixture.away_team_id,
    fixture.stage,
    fixture.round_number,
    fixture.position,
    fixture.next_match_id,
    fixture.next_match_slot
  from jsonb_to_recordset(p_fixtures) as fixture(
    id uuid,
    home_team_id uuid,
    away_team_id uuid,
    stage text,
    round_number integer,
    position integer,
    next_match_id uuid,
    next_match_slot text
  );

  if not exists (
    select 1 from public.basketball_matches where tournament_id = p_tournament_id
  ) then
    raise exception 'Tournament fixtures are required';
  end if;

  return p_tournament_id;
end;
$$;

revoke all on function public.create_basketball_tournament_atomic(uuid, uuid, text, text, text, integer, uuid[], jsonb) from public;
grant execute on function public.create_basketball_tournament_atomic(uuid, uuid, text, text, text, integer, uuid[], jsonb) to authenticated;
