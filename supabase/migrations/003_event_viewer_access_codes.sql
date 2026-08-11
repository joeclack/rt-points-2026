create table if not exists public.event_viewer_access_codes (
  event_id uuid primary key references public.events(id) on delete cascade,
  access_code text not null check (length(trim(access_code)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger event_viewer_access_codes_set_updated_at
before update on public.event_viewer_access_codes
for each row execute function public.set_updated_at();

alter table public.event_viewer_access_codes enable row level security;

create policy "Event admins can read viewer access codes"
on public.event_viewer_access_codes for select
to authenticated
using (public.is_event_admin(event_id));

create policy "Event admins can manage viewer access codes"
on public.event_viewer_access_codes for all
to authenticated
using (public.is_event_admin(event_id))
with check (public.is_event_admin(event_id));

create or replace function public.event_requires_viewer_access(event_slug text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.events
    join public.event_viewer_access_codes
      on event_viewer_access_codes.event_id = events.id
    where events.slug = event_slug
      and events.visibility = 'public'
  );
$$;

create or replace function public.verify_event_viewer_access(
  event_slug text,
  submitted_code text
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.events
    where events.slug = event_slug
      and events.visibility = 'public'
  )
  and (
    not exists (
      select 1
      from public.event_viewer_access_codes
      join public.events
        on events.id = event_viewer_access_codes.event_id
      where events.slug = event_slug
        and events.visibility = 'public'
    )
    or exists (
      select 1
      from public.event_viewer_access_codes
      join public.events
        on events.id = event_viewer_access_codes.event_id
      where events.slug = event_slug
        and events.visibility = 'public'
        and event_viewer_access_codes.access_code = trim(submitted_code)
    )
  );
$$;

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

drop policy if exists "Public can read teams for visible events"
on public.teams;

create policy "Public can read teams for unlocked visible events"
on public.teams for select
using (
  exists (
    select 1 from public.events
    where events.id = teams.event_id
      and (
        events.owner_id = auth.uid()
        or public.is_event_admin(events.id)
        or (
          events.visibility = 'public'
          and not exists (
            select 1
            from public.event_viewer_access_codes
            where event_viewer_access_codes.event_id = events.id
          )
        )
      )
  )
);
