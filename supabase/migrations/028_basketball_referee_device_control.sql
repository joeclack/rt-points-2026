alter table public.basketball_matches
add column if not exists controller_device_id text,
add column if not exists controller_claimed_at timestamptz;

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
  v_controller_device_id text;
  v_controller_claimed_at timestamptz;
  v_side text;
  v_delta integer;
  v_device_id text := nullif(trim(p_payload ->> 'device_id'), '');
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

  if p_command not in ('claim_control', 'take_control', 'release_control') then
    if p_expected_version is not null
      and p_expected_version <> v_match.control_version then
      raise exception 'Game changed on another device. Refresh and try again';
    end if;

    if v_match.controller_device_id is not null
      and v_match.controller_device_id is distinct from v_device_id then
      raise exception 'Another referee device currently controls this game';
    end if;
  end if;

  v_status := v_match.status;
  v_home_score := v_match.home_score;
  v_away_score := v_match.away_score;
  v_winner_team_id := v_match.winner_team_id;
  v_started_at := v_match.started_at;
  v_ended_at := v_match.ended_at;
  v_tipoff_at := v_match.tipoff_at;
  v_court := v_match.court;
  v_controller_device_id := v_match.controller_device_id;
  v_controller_claimed_at := v_match.controller_claimed_at;

  case p_command
    when 'claim_control' then
      if v_device_id is null then
        raise exception 'Referee device ID is required';
      end if;
      if v_controller_device_id is not null
        and v_controller_device_id <> v_device_id then
        raise exception 'Another referee device currently controls this game';
      end if;
      v_controller_device_id := v_device_id;
      v_controller_claimed_at := v_now;

    when 'take_control' then
      if v_device_id is null then
        raise exception 'Referee device ID is required';
      end if;
      v_controller_device_id := v_device_id;
      v_controller_claimed_at := v_now;

    when 'release_control' then
      if v_device_id is null
        or v_controller_device_id is distinct from v_device_id then
        raise exception 'This device does not control the game';
      end if;
      v_controller_device_id := null;
      v_controller_claimed_at := null;

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

    when 'set_score' then
      if v_status <> 'live' then
        raise exception 'Start or reopen the game to correct its score';
      end if;
      v_home_score := (p_payload ->> 'home_score')::integer;
      v_away_score := (p_payload ->> 'away_score')::integer;
      if v_home_score is null
        or v_away_score is null
        or v_home_score < 0
        or v_away_score < 0 then
        raise exception 'Scores must be whole numbers of zero or more';
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

  if v_controller_device_id is not null
    and v_controller_device_id = v_device_id then
    v_controller_claimed_at := v_now;
  end if;

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
    controller_device_id = v_controller_device_id,
    controller_claimed_at = v_controller_claimed_at,
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
