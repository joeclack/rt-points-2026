alter table public.football_matches
add column control_version bigint not null default 0 check (control_version >= 0),
add column controller_device_id text,
add column controller_claimed_at timestamptz;

create table public.football_match_commands (
  id text primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  tournament_id uuid not null references public.football_tournaments(id) on delete cascade,
  match_id uuid not null references public.football_matches(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  command text not null,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index football_match_commands_match_created_at_idx
on public.football_match_commands (match_id, created_at desc);

alter table public.football_match_commands enable row level security;

create policy "Event admins can read football match commands"
on public.football_match_commands for select
to authenticated
using (public.is_event_admin(event_id));

alter table public.football_match_events
drop constraint football_match_events_event_type_check;

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

create or replace function public.apply_football_match_command(
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
  v_match public.football_matches%rowtype;
  v_next_match public.football_matches%rowtype;
  v_existing public.football_match_commands%rowtype;
  v_tournament_format text;
  v_status text;
  v_home_score integer;
  v_away_score integer;
  v_winner_team_id uuid;
  v_started_at timestamptz;
  v_second_half_started_at timestamptz;
  v_stoppage_started_at timestamptz;
  v_first_half_stoppage_seconds integer;
  v_second_half_stoppage_seconds integer;
  v_ended_at timestamptz;
  v_controller_device_id text;
  v_controller_claimed_at timestamptz;
  v_stoppage_seconds integer := 0;
  v_delta integer;
  v_side text;
  v_event_type text;
  v_note text;
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
  from public.football_matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found';
  end if;

  if not public.is_event_admin(v_match.event_id) then
    raise exception 'You do not have access to control this match';
  end if;

  select *
  into v_existing
  from public.football_match_commands
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
      raise exception 'Match changed on another device. Refresh and try again';
    end if;

    if v_match.controller_device_id is not null
      and v_match.controller_device_id is distinct from v_device_id then
      raise exception 'Another referee device currently controls this match';
    end if;
  end if;

  select format
  into v_tournament_format
  from public.football_tournaments
  where id = v_match.tournament_id;

  v_status := v_match.status;
  v_home_score := v_match.home_score;
  v_away_score := v_match.away_score;
  v_winner_team_id := v_match.winner_team_id;
  v_started_at := v_match.started_at;
  v_second_half_started_at := v_match.second_half_started_at;
  v_stoppage_started_at := v_match.stoppage_started_at;
  v_first_half_stoppage_seconds := v_match.first_half_stoppage_seconds;
  v_second_half_stoppage_seconds := v_match.second_half_stoppage_seconds;
  v_ended_at := v_match.ended_at;
  v_controller_device_id := v_match.controller_device_id;
  v_controller_claimed_at := v_match.controller_claimed_at;

  if v_stoppage_started_at is not null then
    v_stoppage_seconds := greatest(
      0,
      floor(extract(epoch from (v_now - v_stoppage_started_at)))::integer
    );
  end if;

  case p_command
    when 'claim_control' then
      if v_device_id is null then
        raise exception 'Referee device ID is required';
      end if;
      if v_controller_device_id is not null
        and v_controller_device_id <> v_device_id then
        raise exception 'Another referee device currently controls this match';
      end if;
      v_controller_device_id := v_device_id;
      v_controller_claimed_at := v_now;
      v_event_type := 'claim_control';
      v_note := 'Referee device claimed match control';

    when 'take_control' then
      if v_device_id is null then
        raise exception 'Referee device ID is required';
      end if;
      v_controller_device_id := v_device_id;
      v_controller_claimed_at := v_now;
      v_event_type := 'take_control';
      v_note := 'Referee device took over match control';

    when 'release_control' then
      if v_device_id is null
        or v_controller_device_id is distinct from v_device_id then
        raise exception 'This device does not control the match';
      end if;
      v_controller_device_id := null;
      v_controller_claimed_at := null;
      v_event_type := 'release_control';
      v_note := 'Referee device released match control';

    when 'score_delta' then
      if v_status not in ('live', 'halftime') then
        raise exception 'Start or reopen the match to change its score';
      end if;
      v_side := p_payload ->> 'side';
      v_delta := (p_payload ->> 'delta')::integer;
      if v_side is null
        or v_side not in ('home', 'away')
        or v_delta is null
        or v_delta not in (-1, 1) then
        raise exception 'Score change is invalid';
      end if;
      if v_side = 'home' then
        v_home_score := greatest(0, v_home_score + v_delta);
      else
        v_away_score := greatest(0, v_away_score + v_delta);
      end if;
      v_event_type := 'score';
      v_note := case when v_side = 'home' then 'Home' else 'Away' end
        || ' score ' || case when v_delta > 0 then 'increased' else 'decreased' end;

    when 'set_score' then
      if v_status not in ('live', 'halftime') then
        raise exception 'Start or reopen the match to correct its score';
      end if;
      v_home_score := (p_payload ->> 'home_score')::integer;
      v_away_score := (p_payload ->> 'away_score')::integer;
      if v_home_score is null
        or v_away_score is null
        or v_home_score < 0
        or v_away_score < 0 then
        raise exception 'Scores must be whole numbers of zero or more';
      end if;
      v_event_type := 'score';
      v_note := 'Exact score correction';

    when 'start' then
      if v_status <> 'scheduled'
        or v_match.home_team_id is null
        or v_match.away_team_id is null then
        raise exception 'This match is not ready to start';
      end if;
      v_status := 'live';
      v_started_at := v_now;
      v_second_half_started_at := null;
      v_stoppage_started_at := null;
      v_first_half_stoppage_seconds := 0;
      v_second_half_stoppage_seconds := 0;
      v_ended_at := null;
      v_event_type := 'kickoff';
      v_note := 'Match started';

    when 'halftime' then
      if v_status <> 'live' or v_second_half_started_at is not null then
        raise exception 'Only the first half can reach half-time';
      end if;
      v_first_half_stoppage_seconds :=
        v_first_half_stoppage_seconds + v_stoppage_seconds;
      v_stoppage_started_at := null;
      v_status := 'halftime';
      v_event_type := 'halftime';
      v_note := 'Half-time';

    when 'start_second_half' then
      if v_status <> 'halftime' then
        raise exception 'Only a half-time match can resume';
      end if;
      v_status := 'live';
      v_second_half_started_at := v_now;
      v_stoppage_started_at := null;
      v_event_type := 'resume';
      v_note := 'Second half started';

    when 'start_stoppage' then
      if v_status <> 'live' then
        raise exception 'Stoppage time can only be tracked during a live match';
      end if;
      if v_stoppage_started_at is not null then
        raise exception 'A stoppage is already being tracked';
      end if;
      v_stoppage_started_at := v_now;
      v_event_type := 'start_stoppage';
      v_note := 'Stoppage tracking started';

    when 'end_stoppage' then
      if v_status <> 'live' or v_stoppage_started_at is null then
        raise exception 'No stoppage is currently being tracked';
      end if;
      if v_second_half_started_at is null then
        v_first_half_stoppage_seconds :=
          v_first_half_stoppage_seconds + v_stoppage_seconds;
      else
        v_second_half_stoppage_seconds :=
          v_second_half_stoppage_seconds + v_stoppage_seconds;
      end if;
      v_stoppage_started_at := null;
      v_event_type := 'end_stoppage';
      v_note := 'Stoppage tracking ended after ' || v_stoppage_seconds || ' seconds';

    when 'finish' then
      if v_status not in ('live', 'halftime') then
        raise exception 'Only a started match can finish';
      end if;
      if v_tournament_format = 'knockout' and v_home_score = v_away_score then
        raise exception 'Knockout matches need a winner before full-time';
      end if;
      if v_stoppage_started_at is not null then
        if v_second_half_started_at is null then
          v_first_half_stoppage_seconds :=
            v_first_half_stoppage_seconds + v_stoppage_seconds;
        else
          v_second_half_stoppage_seconds :=
            v_second_half_stoppage_seconds + v_stoppage_seconds;
        end if;
      end if;
      v_stoppage_started_at := null;
      v_status := 'full_time';
      v_winner_team_id := case
        when v_home_score = v_away_score then null
        when v_home_score > v_away_score then v_match.home_team_id
        else v_match.away_team_id
      end;
      v_ended_at := v_now;
      v_event_type := 'full_time';
      v_note := 'Full-time result published';

    when 'reopen' then
      if v_status <> 'full_time' then
        raise exception 'Only a completed match can be reopened';
      end if;
      if v_match.next_match_id is not null then
        select *
        into v_next_match
        from public.football_matches
        where id = v_match.next_match_id
        for update;

        if found and v_next_match.status <> 'scheduled' then
          raise exception 'The next knockout match has started, so this result can no longer be reopened';
        end if;

        if found and v_match.winner_team_id is not null then
          if v_match.next_match_slot = 'home'
            and v_next_match.home_team_id = v_match.winner_team_id then
            update public.football_matches
            set home_team_id = null
            where id = v_match.next_match_id;
          elsif v_match.next_match_slot = 'away'
            and v_next_match.away_team_id = v_match.winner_team_id then
            update public.football_matches
            set away_team_id = null
            where id = v_match.next_match_id;
          end if;
        end if;
      end if;
      v_status := 'live';
      v_winner_team_id := null;
      v_second_half_started_at := v_now;
      v_stoppage_started_at := null;
      v_ended_at := null;
      v_event_type := 'reopen';
      v_note := 'Result reopened for correction';

    else
      raise exception 'Match action is invalid';
  end case;

  if v_controller_device_id is not null
    and v_controller_device_id = v_device_id then
    v_controller_claimed_at := v_now;
  end if;

  update public.football_matches
  set
    status = v_status,
    home_score = v_home_score,
    away_score = v_away_score,
    winner_team_id = v_winner_team_id,
    started_at = v_started_at,
    second_half_started_at = v_second_half_started_at,
    stoppage_started_at = v_stoppage_started_at,
    first_half_stoppage_seconds = v_first_half_stoppage_seconds,
    second_half_stoppage_seconds = v_second_half_stoppage_seconds,
    ended_at = v_ended_at,
    controller_device_id = v_controller_device_id,
    controller_claimed_at = v_controller_claimed_at,
    control_version = control_version + 1
  where id = p_match_id
  returning * into v_match;

  if p_command = 'finish'
    and v_winner_team_id is not null
    and v_match.next_match_id is not null then
    if v_match.next_match_slot = 'home' then
      update public.football_matches
      set home_team_id = v_winner_team_id
      where id = v_match.next_match_id and status = 'scheduled';
    else
      update public.football_matches
      set away_team_id = v_winner_team_id
      where id = v_match.next_match_id and status = 'scheduled';
    end if;
  end if;

  if p_command in ('start', 'reopen') then
    update public.football_tournaments
    set status = 'live'
    where id = v_match.tournament_id;
  elsif p_command = 'finish' then
    update public.football_tournaments
    set status = case
      when exists (
        select 1
        from public.football_matches remaining
        where remaining.tournament_id = v_match.tournament_id
          and remaining.status not in ('full_time', 'cancelled')
      ) then 'live'
      else 'completed'
    end
    where id = v_match.tournament_id;
  end if;

  insert into public.football_match_events (
    event_id,
    tournament_id,
    match_id,
    actor_id,
    event_type,
    home_score,
    away_score,
    note
  ) values (
    v_match.event_id,
    v_match.tournament_id,
    v_match.id,
    v_actor_id,
    v_event_type,
    v_match.home_score,
    v_match.away_score,
    v_note
  );

  v_result := jsonb_build_object(
    'command_id', p_command_id,
    'match', to_jsonb(v_match)
  );

  insert into public.football_match_commands (
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

revoke all on function public.apply_football_match_command(uuid, text, text, bigint, jsonb) from public;
grant execute on function public.apply_football_match_command(uuid, text, text, bigint, jsonb) to authenticated;
