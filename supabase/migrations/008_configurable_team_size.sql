alter table public.events
add column team_size smallint not null default 5
check (team_size between 2 and 20);

alter table public.team_join_request_players
drop constraint if exists team_join_request_players_slot_check;

alter table public.team_join_request_players
add constraint team_join_request_players_slot_check
check (slot between 1 and 20);

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
    'teams', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', teams.id,
          'name', teams.name,
          'colour', teams.colour,
          'badge_text', teams.badge_text,
          'badge_url', teams.badge_url
        )
        order by teams.created_at
      ) filter (where teams.id is not null),
      '[]'::jsonb
    )
  )
  into result
  from public.events
  left join public.teams
    on teams.event_id = events.id
  where events.slug = event_slug
    and events.visibility = 'public'
    and public.verify_event_viewer_access(event_slug, submitted_code)
  group by events.id;

  return result;
end;
$$;

create or replace function public.submit_team_join_request(
  event_slug text,
  submitted_code text,
  submitted_team_name text,
  submitted_team_colour text,
  submitted_player_names text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event_id uuid;
  required_team_size smallint;
  new_request_id uuid;
  normalized_team_name text := trim(coalesce(submitted_team_name, ''));
  normalized_player_names text[];
begin
  select events.id, events.team_size
  into target_event_id, required_team_size
  from public.events
  where events.slug = event_slug
    and events.visibility = 'public'
    and events.football_enabled = true
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

  if exists (
    select 1
    from public.teams
    where teams.event_id = target_event_id
      and lower(trim(teams.name)) = lower(normalized_team_name)
  ) then
    raise exception 'A team with this name is already in the tournament';
  end if;

  if exists (
    select 1
    from public.team_join_requests
    where team_join_requests.event_id = target_event_id
      and team_join_requests.status = 'pending'
      and lower(trim(team_join_requests.team_name)) = lower(normalized_team_name)
  ) then
    raise exception 'A request for this team name is already pending';
  end if;

  insert into public.team_join_requests (
    event_id,
    team_name,
    team_colour
  )
  values (
    target_event_id,
    normalized_team_name,
    lower(submitted_team_colour)
  )
  returning id into new_request_id;

  insert into public.team_join_request_players (request_id, slot, name)
  select new_request_id, slot::smallint, player_name
  from unnest(normalized_player_names) with ordinality as players(player_name, slot);

  return new_request_id;
end;
$$;

revoke all on function public.get_public_event_for_viewer(text, text) from public;
revoke all on function public.submit_team_join_request(text, text, text, text, text[]) from public;

grant execute on function public.get_public_event_for_viewer(text, text)
to anon, authenticated;

grant execute on function public.submit_team_join_request(text, text, text, text, text[])
to anon, authenticated;
