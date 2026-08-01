create or replace function public.is_event_owner(target_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.events
    where events.id = target_event_id
      and events.owner_id = auth.uid()
  );
$$;

drop policy if exists "Owners and admins can delete events"
on public.events;

create policy "Only owners can delete events"
on public.events for delete
to authenticated
using (owner_id = auth.uid());

create or replace function public.prevent_event_owner_change()
returns trigger
language plpgsql
as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'Event ownership cannot be changed';
  end if;

  return new;
end;
$$;

create trigger events_prevent_owner_change
before update on public.events
for each row execute function public.prevent_event_owner_change();

create or replace function public.validate_event_admin_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_owner_id uuid;
begin
  select owner_id
  into event_owner_id
  from public.events
  where id = new.event_id;

  if event_owner_id is null then
    raise exception 'Event not found';
  end if;

  if new.user_id = event_owner_id and new.role <> 'owner' then
    raise exception 'The event owner must keep the owner role';
  end if;

  if new.user_id <> event_owner_id and new.role <> 'admin' then
    raise exception 'Collaborators can only have the admin role';
  end if;

  return new;
end;
$$;

create trigger event_admins_validate_role
before insert or update on public.event_admins
for each row execute function public.validate_event_admin_role();

create or replace function public.prevent_owner_admin_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'owner' and exists (
    select 1
    from public.events
    where events.id = old.event_id
      and events.owner_id = old.user_id
  ) then
    raise exception 'The event owner cannot be removed';
  end if;

  return old;
end;
$$;

create trigger event_admins_prevent_owner_removal
before delete on public.event_admins
for each row execute function public.prevent_owner_admin_removal();

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

create or replace function public.get_event_admin_members(target_event_id uuid)
returns table (
  user_id uuid,
  display_name text,
  email text,
  role public.event_admin_role
)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
begin
  if auth.uid() is null or not public.is_event_admin(target_event_id) then
    raise exception 'Event admin access is required'
      using errcode = '42501';
  end if;

  return query
  select
    event_admins.user_id,
    coalesce(
      nullif(trim(profiles.display_name), ''),
      split_part(users.email, '@', 1)
    ),
    users.email::text,
    event_admins.role
  from public.event_admins
  join public.profiles
    on profiles.id = event_admins.user_id
  join auth.users
    on users.id = event_admins.user_id
  where event_admins.event_id = target_event_id
  order by
    case when event_admins.role = 'owner' then 0 else 1 end,
    2,
    3;
end;
$$;

revoke all on function public.is_event_owner(uuid) from public;
revoke all on function public.search_event_admin_candidates(uuid, text) from public;
revoke all on function public.get_event_admin_members(uuid) from public;

grant execute on function public.is_event_owner(uuid) to authenticated;
grant execute on function public.search_event_admin_candidates(uuid, text)
to authenticated;
grant execute on function public.get_event_admin_members(uuid)
to authenticated;
