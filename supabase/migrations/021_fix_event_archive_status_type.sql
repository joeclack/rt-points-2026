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
  v_target_status public.event_status := case
    when p_archived then 'finished'::public.event_status
    else 'draft'::public.event_status
  end;
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
  set status = v_target_status
  where id = p_event_id
    and status is distinct from v_target_status
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
