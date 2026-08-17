alter table public.basketball_matches
add column control_version bigint not null default 0 check (control_version >= 0);

create table public.basketball_match_commands (
  id text primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  tournament_id uuid not null references public.basketball_tournaments(id) on delete cascade,
  match_id uuid not null references public.basketball_matches(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  command text not null,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index basketball_match_commands_match_created_at_idx
on public.basketball_match_commands (match_id, created_at desc);

alter table public.basketball_match_commands enable row level security;

create policy "Event admins can read basketball match commands"
on public.basketball_match_commands for select
to authenticated
using (public.is_event_admin(event_id));

create or replace function public.apply_basketball_match_command(
  p_match_id uuid,
  p_command text,
  p_command_id text,
  p_expected_version bigint default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_match public.basketball_matches%rowtype;
  v_next_match public.basketball_matches%rowtype;
  v_existing public.basketball_match_commands%rowtype;
  v_status text;
  v_home_score integer;
  v_away_score integer;
  v_winner_team_id uuid;
  v_started_at timestamptz;
  v_ended_at timestamptz;
  v_tipoff_at timestamptz;
  v_court text;
  v_side text;
  v_delta integer;
  v_result jsonb;
begin
  if v_actor_id is null then
    raise exception 'Authentication is required';
  end if;

  if coalesce(trim(p_command_id), '') = '' then
    raise exception 'Command ID is required';
  end if;

  select *
  into v_match
  from public.basketball_matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Game not found';
  end if;

  if not public.is_event_admin(v_match.event_id) then
    raise exception 'You do not have access to control this game';
  end if;

  select *
  into v_existing
  from public.basketball_match_commands
  where id = p_command_id;

  if found then
    if v_existing.match_id <> p_match_id
      or v_existing.actor_id <> v_actor_id
      or v_existing.command <> p_command then
      raise exception 'Command ID has already been used';
    end if;

    return v_existing.result;
  end if;

  if p_command <> 'score_delta'
    and p_expected_version is not null
    and p_expected_version <> v_match.control_version then
    raise exception 'Game changed on another device. Refresh and try again';
  end if;

  v_status := v_match.status;
  v_home_score := v_match.home_score;
  v_away_score := v_match.away_score;
  v_winner_team_id := v_match.winner_team_id;
  v_started_at := v_match.started_at;
  v_ended_at := v_match.ended_at;
  v_tipoff_at := v_match.tipoff_at;
  v_court := v_match.court;

  case p_command
    when 'score_delta' then
      if v_status <> 'live' then
        raise exception 'Start the game before scoring';
      end if;

      v_side := p_payload ->> 'side';
      v_delta := (p_payload ->> 'delta')::integer;
      if v_side is null
        or v_side not in ('home', 'away')
        or v_delta is null
        or v_delta not in (-1, 1, 2, 3) then
        raise exception 'Score change is invalid';
      end if;

      if v_side = 'home' then
        v_home_score := greatest(0, v_home_score + v_delta);
      else
        v_away_score := greatest(0, v_away_score + v_delta);
      end if;

    when 'schedule' then
      if v_status not in ('scheduled', 'postponed') then
        raise exception 'Tip-off can only be changed before a game';
      end if;

      begin
        v_tipoff_at := nullif(trim(p_payload ->> 'tipoff_at'), '')::timestamptz;
      exception when invalid_datetime_format then
        raise exception 'Choose a valid tip-off time';
      end;
      v_court := nullif(trim(p_payload ->> 'court'), '');

    when 'start' then
      if v_status <> 'scheduled'
        or v_match.home_team_id is null
        or v_match.away_team_id is null then
        raise exception 'This game is not ready to start';
      end if;
      v_status := 'live';
      v_started_at := v_now;
      v_ended_at := null;

    when 'finish' then
      if v_status <> 'live' then
        raise exception 'Only a live game can finish';
      end if;
      if v_home_score = v_away_score then
        raise exception 'Basketball games need a winner. Play next basket wins.';
      end if;

      v_winner_team_id := case
        when v_home_score > v_away_score then v_match.home_team_id
        else v_match.away_team_id
      end;
      v_status := 'full_time';
      v_ended_at := v_now;

      if v_match.next_match_id is not null then
        select *
        into v_next_match
        from public.basketball_matches
        where id = v_match.next_match_id
        for update;

        if not found or v_next_match.tournament_id <> v_match.tournament_id then
          raise exception 'Next knockout game is invalid';
        end if;
        if v_next_match.status <> 'scheduled' then
          raise exception 'The next knockout game has already started';
        end if;
        if v_match.next_match_slot = 'home'
          and v_next_match.home_team_id is not null
          and v_next_match.home_team_id <> v_winner_team_id then
          raise exception 'The next knockout game already has a different home team';
        end if;
        if v_match.next_match_slot = 'away'
          and v_next_match.away_team_id is not null
          and v_next_match.away_team_id <> v_winner_team_id then
          raise exception 'The next knockout game already has a different away team';
        end if;
      end if;

    when 'reopen' then
      if v_status <> 'full_time' then
        raise exception 'Only a finished game can be reopened';
      end if;

      if v_match.next_match_id is not null then
        select *
        into v_next_match
        from public.basketball_matches
        where id = v_match.next_match_id
        for update;

        if found and v_next_match.status <> 'scheduled' then
          raise exception 'The next knockout game has started, so this result cannot be reopened';
        end if;

        if found and v_match.winner_team_id is not null then
          if v_match.next_match_slot = 'home'
            and v_next_match.home_team_id = v_match.winner_team_id then
            update public.basketball_matches
            set home_team_id = null, control_version = control_version + 1
            where id = v_match.next_match_id;
          elsif v_match.next_match_slot = 'away'
            and v_next_match.away_team_id = v_match.winner_team_id then
            update public.basketball_matches
            set away_team_id = null, control_version = control_version + 1
            where id = v_match.next_match_id;
          end if;
        end if;
      end if;

      v_status := 'live';
      v_winner_team_id := null;
      v_ended_at := null;

    else
      raise exception 'Game action is invalid';
  end case;

  update public.basketball_matches
  set
    status = v_status,
    home_score = v_home_score,
    away_score = v_away_score,
    winner_team_id = v_winner_team_id,
    started_at = v_started_at,
    ended_at = v_ended_at,
    tipoff_at = v_tipoff_at,
    court = v_court,
    control_version = control_version + 1
  where id = p_match_id
  returning * into v_match;

  if p_command = 'finish'
    and v_winner_team_id is not null
    and v_match.next_match_id is not null then
    if v_match.next_match_slot = 'home' then
      update public.basketball_matches
      set home_team_id = v_winner_team_id,
          control_version = control_version + 1
      where id = v_match.next_match_id;
    else
      update public.basketball_matches
      set away_team_id = v_winner_team_id,
          control_version = control_version + 1
      where id = v_match.next_match_id;
    end if;
  end if;

  if p_command in ('start', 'reopen') then
    update public.basketball_tournaments
    set status = 'live'
    where id = v_match.tournament_id;
  elsif p_command = 'finish' then
    update public.basketball_tournaments
    set status = case
      when exists (
        select 1
        from public.basketball_matches remaining
        where remaining.tournament_id = v_match.tournament_id
          and remaining.status not in ('full_time', 'cancelled')
      ) then 'live'
      else 'completed'
    end
    where id = v_match.tournament_id;
  end if;

  v_result := jsonb_build_object(
    'command_id', p_command_id,
    'match', to_jsonb(v_match)
  );

  insert into public.basketball_match_commands (
    id,
    event_id,
    tournament_id,
    match_id,
    actor_id,
    command,
    payload,
    result
  ) values (
    p_command_id,
    v_match.event_id,
    v_match.tournament_id,
    v_match.id,
    v_actor_id,
    p_command,
    coalesce(p_payload, '{}'::jsonb),
    v_result
  );

  return v_result;
end;
$$;

revoke all on function public.apply_basketball_match_command(uuid, text, text, bigint, jsonb) from public;
grant execute on function public.apply_basketball_match_command(uuid, text, text, bigint, jsonb) to authenticated;

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
  v_expected_teams integer;
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
    v_expected_teams := case p_start_stage
      when 'quarter_final' then 8
      when 'semi_final' then 4
      when 'final' then 2
      else null
    end;
    if v_expected_teams is null or cardinality(p_team_ids) <> v_expected_teams then
      raise exception 'The selected knockout round has the wrong number of teams';
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
