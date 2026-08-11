create table public.team_join_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  team_name text not null check (
    length(trim(team_name)) between 2 and 60
  ),
  team_colour text not null check (
    team_colour ~ '^#[0-9a-fA-F]{6}$'
  ),
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'rejected')
  ),
  created_team_id uuid references public.teams(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.team_join_request_players (
  request_id uuid not null references public.team_join_requests(id) on delete cascade,
  slot smallint not null check (slot between 1 and 5),
  name text not null check (length(trim(name)) between 2 and 80),
  primary key (request_id, slot)
);

create index team_join_requests_event_status_created_at_idx
on public.team_join_requests (event_id, status, created_at);

create unique index team_join_requests_one_pending_name_idx
on public.team_join_requests (event_id, lower(trim(team_name)))
where status = 'pending';

alter table public.team_join_requests enable row level security;
alter table public.team_join_request_players enable row level security;

create policy "Tournament admins can read team join requests"
on public.team_join_requests for select
to authenticated
using (public.is_event_admin(event_id));

create policy "Tournament admins can read team join request players"
on public.team_join_request_players for select
to authenticated
using (
  exists (
    select 1
    from public.team_join_requests
    where team_join_requests.id = team_join_request_players.request_id
      and public.is_event_admin(team_join_requests.event_id)
  )
);

-- Keep this list in sync with lib/profanity.ts. This database check prevents
-- callers from bypassing the application-level validation through the API.
create or replace function public.contains_profanity(input_text text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  normalized text;
  token text;
  blocked_terms constant text[] := array[
    'arsehole',
    'asshole',
    'bastard',
    'bitch',
    'bollocks',
    'bullshit',
    'cunt',
    'dickhead',
    'fuck',
    'fucker',
    'fucking',
    'motherfucker',
    'nigger',
    'nigga',
    'piss',
    'prick',
    'shit',
    'shithead',
    'slut',
    'twat',
    'wanker',
    'whore'
  ];
begin
  normalized := lower(translate(coalesce(input_text, ''), '013457@$!', 'oieastasi'));

  foreach token in array regexp_split_to_array(normalized, '[^a-z]+')
  loop
    if token = any(blocked_terms) then
      return true;
    end if;
  end loop;

  return false;
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
  new_request_id uuid;
  normalized_team_name text := trim(coalesce(submitted_team_name, ''));
  normalized_player_names text[];
begin
  select events.id
  into target_event_id
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
    or cardinality(submitted_player_names) <> 5 then
    raise exception 'Exactly five player names are required';
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
  ) <> 5 then
    raise exception 'Enter five different player names';
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

create or replace function public.review_team_join_request(
  target_request_id uuid,
  expected_event_id uuid,
  decision text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record public.team_join_requests%rowtype;
  new_team_id uuid;
begin
  if decision is null or decision not in ('accepted', 'rejected') then
    raise exception 'Review decision must be accepted or rejected';
  end if;

  select *
  into request_record
  from public.team_join_requests
  where id = target_request_id
  for update;

  if request_record.id is null then
    raise exception 'Team request not found';
  end if;

  if request_record.event_id <> expected_event_id then
    raise exception 'Team request does not belong to this tournament';
  end if;

  if not public.is_event_admin(request_record.event_id) then
    raise exception 'Tournament admin access is required'
      using errcode = '42501';
  end if;

  if request_record.status <> 'pending' then
    raise exception 'This team request has already been reviewed';
  end if;

  if decision = 'accepted' then
    if exists (
      select 1
      from public.teams
      where teams.event_id = request_record.event_id
        and lower(trim(teams.name)) = lower(trim(request_record.team_name))
    ) then
      raise exception 'A team with this name is already in the tournament';
    end if;

    insert into public.teams (event_id, name, colour)
    values (
      request_record.event_id,
      request_record.team_name,
      request_record.team_colour
    )
    returning id into new_team_id;
  end if;

  update public.team_join_requests
  set
    status = decision,
    created_team_id = new_team_id,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = target_request_id;

  return new_team_id;
end;
$$;

revoke all on function public.contains_profanity(text) from public;
revoke all on function public.submit_team_join_request(text, text, text, text, text[]) from public;
revoke all on function public.review_team_join_request(uuid, uuid, text) from public;

grant execute on function public.submit_team_join_request(text, text, text, text, text[])
to anon, authenticated;

grant execute on function public.review_team_join_request(uuid, uuid, text)
to authenticated;
