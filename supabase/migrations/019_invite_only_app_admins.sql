create type public.app_admin_role as enum ('owner', 'admin');

create table public.app_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.app_admin_role not null default 'admin',
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

create or replace function public.is_app_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.app_admins
    where user_id = auth.uid()
  );
$$;

create or replace function public.is_app_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.app_admins
    where user_id = auth.uid()
      and role = 'owner'
  );
$$;

create policy "Admins can read their app access"
on public.app_admins for select
to authenticated
using (user_id = auth.uid() or public.is_app_owner());

create or replace function public.get_app_admin_members()
returns table (
  user_id uuid,
  display_name text,
  email text,
  role public.app_admin_role,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
begin
  if auth.uid() is null or not public.is_app_owner() then
    raise exception 'App owner access is required'
      using errcode = '42501';
  end if;

  return query
  select
    app_admins.user_id,
    coalesce(
      nullif(trim(profiles.display_name), ''),
      split_part(users.email, '@', 1)
    ),
    users.email::text,
    app_admins.role,
    app_admins.created_at
  from public.app_admins
  join public.profiles
    on profiles.id = app_admins.user_id
  join auth.users
    on users.id = app_admins.user_id
  order by
    case when app_admins.role = 'owner' then 0 else 1 end,
    2,
    3;
end;
$$;

-- This is the only automatic elevation path. It works whether Joe's Auth user
-- already exists when the migration runs or is invited afterwards.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;

  if lower(new.email) = 'joebclack@gmail.com' then
    insert into public.app_admins (user_id, role)
    values (new.id, 'owner')
    on conflict (user_id) do update set role = 'owner';
  end if;

  return new;
end;
$$;

insert into public.app_admins (user_id, role)
select users.id, 'owner'
from auth.users
join public.profiles
  on profiles.id = users.id
where lower(users.email) = 'joebclack@gmail.com'
on conflict (user_id) do update set role = 'owner';

create or replace function public.is_event_admin(target_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_app_admin() and exists (
    select 1
    from public.event_admins
    where event_id = target_event_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_event_owner(target_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_app_admin() and exists (
    select 1
    from public.events
    where events.id = target_event_id
      and events.owner_id = auth.uid()
  );
$$;

drop policy if exists "Authenticated users can create events"
on public.events;

create policy "App admins can create events"
on public.events for insert
to authenticated
with check (owner_id = auth.uid() and public.is_app_admin());

drop policy if exists "Owners and admins can update events"
on public.events;

create policy "Event admins can update events"
on public.events for update
to authenticated
using (public.is_app_admin() and (owner_id = auth.uid() or public.is_event_admin(id)))
with check (public.is_app_admin() and (owner_id = auth.uid() or public.is_event_admin(id)));

drop policy if exists "Only owners can delete events"
on public.events;

create policy "App admin owners can delete events"
on public.events for delete
to authenticated
using (owner_id = auth.uid() and public.is_app_admin());

drop policy if exists "Event owners can manage event admin rows"
on public.event_admins;

create policy "App admin event owners can manage event admin rows"
on public.event_admins for all
to authenticated
using (public.is_event_owner(event_id))
with check (public.is_event_owner(event_id));

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

  if not public.is_event_owner(p_event_id) then
    raise exception 'Only an authorised tournament owner can change its archive status';
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

create or replace function public.search_event_admin_candidates(
  target_event_id uuid,
  search_query text
)
returns table (
  user_id uuid,
  display_name text,
  email text,
  has_access boolean
)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
declare
  normalized_query text := lower(trim(search_query));
begin
  if auth.uid() is null or not public.is_event_owner(target_event_id) then
    raise exception 'Only the event owner can search for collaborators'
      using errcode = '42501';
  end if;

  if length(normalized_query) < 2 then
    return;
  end if;

  return query
  select
    profiles.id,
    coalesce(
      nullif(trim(profiles.display_name), ''),
      split_part(users.email, '@', 1)
    ),
    users.email::text,
    exists (
      select 1
      from public.event_admins
      where event_admins.event_id = target_event_id
        and event_admins.user_id = profiles.id
    )
  from public.profiles
  join auth.users
    on users.id = profiles.id
  join public.app_admins
    on app_admins.user_id = profiles.id
  join public.events
    on events.id = target_event_id
  where profiles.id <> events.owner_id
    and (
      position(normalized_query in lower(coalesce(profiles.display_name, ''))) > 0
      or position(normalized_query in lower(coalesce(users.email, ''))) > 0
    )
  order by 2, 3
  limit 10;
end;
$$;

revoke all on function public.is_app_admin() from public;
revoke all on function public.is_app_owner() from public;
revoke all on function public.get_app_admin_members() from public;

grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.is_app_owner() to authenticated;
grant execute on function public.get_app_admin_members() to authenticated;
