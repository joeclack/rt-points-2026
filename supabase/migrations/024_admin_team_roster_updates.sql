create or replace function public.update_team_roster(
  p_event_id uuid,
  p_team_id uuid,
  p_players jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.teams%rowtype;
  v_request_id uuid;
  v_existing_count integer;
  v_player_count integer;
  v_is_new_roster boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if not public.is_event_admin(p_event_id) then
    raise exception 'Tournament admin access is required'
      using errcode = '42501';
  end if;

  select *
  into v_team
  from public.teams
  where id = p_team_id
    and event_id = p_event_id;

  if not found then
    raise exception 'Team not found';
  end if;

  if jsonb_typeof(coalesce(p_players, '[]'::jsonb)) <> 'array' then
    raise exception 'Player names must be submitted as an array';
  end if;

  select id
  into v_request_id
  from public.team_join_requests
  where event_id = p_event_id
    and created_team_id = p_team_id
    and status = 'accepted'
  order by reviewed_at desc nulls last, created_at desc
  limit 1
  for update;

  if v_request_id is null then
    if jsonb_array_length(coalesce(p_players, '[]'::jsonb)) = 0 then
      return 0;
    end if;

    insert into public.team_join_requests (
      event_id,
      team_name,
      team_colour,
      status,
      created_team_id,
      reviewed_by,
      reviewed_at
    ) values (
      p_event_id,
      v_team.name,
      v_team.colour,
      'accepted',
      p_team_id,
      auth.uid(),
      now()
    )
    returning id into v_request_id;

    v_is_new_roster := true;
  end if;

  select count(*)
  into v_existing_count
  from public.team_join_request_players
  where request_id = v_request_id;

  with raw_players as (
    select item
    from jsonb_array_elements(coalesce(p_players, '[]'::jsonb)) as submitted(item)
  )
  select count(*)
  into v_player_count
  from raw_players;

  if v_player_count <> v_existing_count then
    if not v_is_new_roster then
      raise exception 'Submit every player in this roster';
    end if;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_players, '[]'::jsonb)) as submitted(item)
    where not (item ? 'slot')
      or not (item ? 'name')
      or (item ->> 'slot') !~ '^[0-9]+$'
  ) then
    raise exception 'Every submitted player needs a slot and name';
  end if;

  if exists (
    with submitted_players as (
      select
        (item ->> 'slot')::smallint as slot,
        trim(item ->> 'name') as name
      from jsonb_array_elements(coalesce(p_players, '[]'::jsonb)) as submitted(item)
    )
    select 1
    from submitted_players
    where slot < 1
      or slot > 20
      or length(name) not between 2 and 80
  ) then
    raise exception 'Every player name must be between 2 and 80 characters';
  end if;

  if exists (
    with submitted_players as (
      select trim(item ->> 'name') as name
      from jsonb_array_elements(coalesce(p_players, '[]'::jsonb)) as submitted(item)
    )
    select 1
    from submitted_players
    where public.contains_profanity(name)
  ) then
    raise exception 'A player name contains language that is not allowed';
  end if;

  if (
    with submitted_players as (
      select
        (item ->> 'slot')::smallint as slot,
        trim(item ->> 'name') as name
      from jsonb_array_elements(coalesce(p_players, '[]'::jsonb)) as submitted(item)
    )
    select count(*) <> count(distinct slot)
      or count(*) <> count(distinct lower(name))
    from submitted_players
  ) then
    raise exception 'Enter different player names';
  end if;

  if not v_is_new_roster and exists (
    with submitted_players as (
      select (item ->> 'slot')::smallint as slot
      from jsonb_array_elements(coalesce(p_players, '[]'::jsonb)) as submitted(item)
    )
    select 1
    from submitted_players
    where not exists (
      select 1
      from public.team_join_request_players existing_players
      where existing_players.request_id = v_request_id
        and existing_players.slot = submitted_players.slot
    )
  ) then
    raise exception 'Submitted player slots do not match this roster';
  end if;

  if v_is_new_roster then
    insert into public.team_join_request_players (request_id, slot, name)
    select
      v_request_id,
      (item ->> 'slot')::smallint,
      trim(item ->> 'name')
    from jsonb_array_elements(coalesce(p_players, '[]'::jsonb)) as submitted(item);
  else
    with submitted_players as (
      select
        (item ->> 'slot')::smallint as slot,
        trim(item ->> 'name') as name
      from jsonb_array_elements(coalesce(p_players, '[]'::jsonb)) as submitted(item)
    )
    update public.team_join_request_players
    set name = submitted_players.name
    from submitted_players
    where team_join_request_players.request_id = v_request_id
      and team_join_request_players.slot = submitted_players.slot;
  end if;

  return v_player_count;
end;
$$;

revoke all on function public.update_team_roster(uuid, uuid, jsonb) from public;
grant execute on function public.update_team_roster(uuid, uuid, jsonb) to authenticated;
