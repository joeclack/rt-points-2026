alter table public.team_join_requests
add column submission_id text;

create unique index team_join_requests_submission_id_idx
on public.team_join_requests (submission_id)
where submission_id is not null;

create or replace function public.submit_team_join_request(
  event_slug text,
  submitted_code text,
  submitted_team_name text,
  submitted_team_colour text,
  submitted_player_names text[],
  submitted_submission_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event_id uuid;
  required_team_size smallint;
  existing_request public.team_join_requests%rowtype;
  existing_player_names text[];
  new_request_id uuid;
  normalized_team_name text := trim(coalesce(submitted_team_name, ''));
  normalized_player_names text[];
  normalized_submission_id text := trim(coalesce(submitted_submission_id, ''));
begin
  if length(normalized_submission_id) not between 1 and 100 then
    raise exception 'Submission ID is required';
  end if;

  -- Serialize retries before checking whether this submission already exists.
  perform pg_advisory_xact_lock(hashtextextended(normalized_submission_id, 0));

  select id, team_size
  into target_event_id, required_team_size
  from public.events
  where slug = event_slug
    and visibility = 'public'
    and status <> 'finished'
    and public.verify_event_viewer_access(event_slug, submitted_code);

  if target_event_id is null then
    raise exception 'Tournament not found or access denied';
  end if;

  if length(normalized_team_name) not between 2 and 60 then
    raise exception 'Team name must be between 2 and 60 characters';
  end if;

  if public.contains_profanity(normalized_team_name) then
    raise exception 'Team name contains language that is not allowed';
  end if;

  if coalesce(submitted_team_colour, '') !~ '^#[0-9a-fA-F]{6}$' then
    raise exception 'Choose a valid team colour';
  end if;

  if submitted_player_names is null
    or cardinality(submitted_player_names) <> required_team_size then
    raise exception 'Exactly % player names are required', required_team_size;
  end if;

  select array_agg(trim(player_name) order by slot)
  into normalized_player_names
  from unnest(submitted_player_names) with ordinality as players(player_name, slot);

  if exists (
    select 1
    from unnest(normalized_player_names) as players(player_name)
    where length(player_name) not between 2 and 80
  ) then
    raise exception 'Every player name must be between 2 and 80 characters';
  end if;

  if exists (
    select 1
    from unnest(normalized_player_names) as players(player_name)
    where public.contains_profanity(player_name)
  ) then
    raise exception 'A player name contains language that is not allowed';
  end if;

  if (
    select count(distinct lower(player_name))
    from unnest(normalized_player_names) as players(player_name)
  ) <> required_team_size then
    raise exception 'Enter % different player names', required_team_size;
  end if;

  select *
  into existing_request
  from public.team_join_requests
  where submission_id = normalized_submission_id;

  if found then
    select array_agg(name order by slot)
    into existing_player_names
    from public.team_join_request_players
    where request_id = existing_request.id;

    if existing_request.event_id <> target_event_id
      or existing_request.team_name <> normalized_team_name
      or existing_request.team_colour <> lower(submitted_team_colour)
      or existing_player_names is distinct from normalized_player_names then
      raise exception 'Submission ID has already been used';
    end if;

    return existing_request.id;
  end if;

  if exists (
    select 1
    from public.teams
    where event_id = target_event_id
      and lower(trim(name)) = lower(normalized_team_name)
  ) then
    raise exception 'A team with this name is already in the tournament';
  end if;

  if exists (
    select 1
    from public.team_join_requests
    where event_id = target_event_id
      and status = 'pending'
      and lower(trim(team_name)) = lower(normalized_team_name)
  ) then
    raise exception 'A request for this team name is already pending';
  end if;

  insert into public.team_join_requests (
    event_id,
    team_name,
    team_colour,
    submission_id
  ) values (
    target_event_id,
    normalized_team_name,
    lower(submitted_team_colour),
    normalized_submission_id
  )
  returning id into new_request_id;

  insert into public.team_join_request_players (request_id, slot, name)
  select new_request_id, slot::smallint, player_name
  from unnest(normalized_player_names) with ordinality as players(player_name, slot);

  return new_request_id;
end;
$$;

revoke all on function public.submit_team_join_request(text, text, text, text, text[]) from public, anon, authenticated;
revoke all on function public.submit_team_join_request(text, text, text, text, text[], text) from public;
grant execute on function public.submit_team_join_request(text, text, text, text, text[], text) to anon, authenticated;

create or replace function public.set_event_archived(
  p_event_id uuid,
  p_archived boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'Tournament not found';
  end if;

  if v_event.owner_id <> auth.uid() then
    raise exception 'Only the tournament owner can change its archive status';
  end if;

  update public.events
  set status = case when p_archived then 'finished' else 'draft' end
  where id = p_event_id
    and status is distinct from case when p_archived then 'finished' else 'draft' end
  returning * into v_event;

  if not found then
    select * into v_event from public.events where id = p_event_id;
  end if;

  return jsonb_build_object(
    'id', v_event.id,
    'slug', v_event.slug,
    'sport', v_event.sport,
    'status', v_event.status
  );
end;
$$;

revoke all on function public.set_event_archived(uuid, boolean) from public;
grant execute on function public.set_event_archived(uuid, boolean) to authenticated;
