drop function if exists public.get_app_admin_members();

create function public.get_app_admin_members()
returns table (
  user_id uuid,
  display_name text,
  email text,
  role public.app_admin_role,
  created_at timestamptz,
  invitation_pending boolean
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
    app_admins.created_at,
    users.last_sign_in_at is null
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

create or replace function public.prevent_event_owner_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_id <> old.owner_id and not (
    new.owner_id = auth.uid()
    and public.is_app_owner()
    and exists (
      select 1
      from public.app_admins
      where app_admins.user_id = old.owner_id
        and app_admins.role = 'admin'
        and app_admins.invited_by = auth.uid()
    )
  ) then
    raise exception 'Event ownership cannot be changed';
  end if;

  return new;
end;
$$;

create or replace function public.remove_app_admin(p_target_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_target_role public.app_admin_role;
  v_invited_by uuid;
  v_event_id uuid;
  v_transferred_count integer := 0;
begin
  if v_owner_id is null or not public.is_app_owner() then
    raise exception 'App owner access is required'
      using errcode = '42501';
  end if;

  if p_target_user_id is null or p_target_user_id = v_owner_id then
    raise exception 'The app owner cannot be removed'
      using errcode = '42501';
  end if;

  select app_admins.role, app_admins.invited_by
  into v_target_role, v_invited_by
  from public.app_admins
  where app_admins.user_id = p_target_user_id
  for update;

  if not found then
    raise exception 'Administrator not found';
  end if;

  if v_target_role <> 'admin' or v_invited_by is distinct from v_owner_id then
    raise exception 'You can only remove administrators you invited'
      using errcode = '42501';
  end if;

  for v_event_id in
    update public.events
    set owner_id = v_owner_id
    where owner_id = p_target_user_id
    returning id
  loop
    insert into public.event_admins (event_id, user_id, role)
    values (v_event_id, v_owner_id, 'owner')
    on conflict (event_id, user_id)
    do update set role = excluded.role;

    delete from public.event_admins
    where event_id = v_event_id
      and user_id = p_target_user_id;

    v_transferred_count := v_transferred_count + 1;
  end loop;

  delete from public.event_admins
  where user_id = p_target_user_id;

  delete from public.app_admins
  where user_id = p_target_user_id;

  return v_transferred_count;
end;
$$;

revoke all on function public.get_app_admin_members() from public;
revoke all on function public.remove_app_admin(uuid) from public;

grant execute on function public.get_app_admin_members() to authenticated;
grant execute on function public.remove_app_admin(uuid) to authenticated;
