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
      and events.status <> 'finished'
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
      and events.status <> 'finished'
  )
  and (
    not exists (
      select 1
      from public.event_viewer_access_codes
      join public.events
        on events.id = event_viewer_access_codes.event_id
      where events.slug = event_slug
        and events.visibility = 'public'
        and events.status <> 'finished'
    )
    or exists (
      select 1
      from public.event_viewer_access_codes
      join public.events
        on events.id = event_viewer_access_codes.event_id
      where events.slug = event_slug
        and events.visibility = 'public'
        and events.status <> 'finished'
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
    'team_size', events.team_size,
    'sport', events.sport,
    'status', events.status,
    'football_match_minutes', events.football_match_minutes,
    'teams', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', teams.id,
          'name', teams.name,
          'colour', teams.colour,
          'badge_text', teams.badge_text,
          'badge_url', teams.badge_url
        ) order by teams.created_at
      ) filter (where teams.id is not null),
      '[]'::jsonb
    )
  )
  into result
  from public.events
  left join public.teams on teams.event_id = events.id
  where events.slug = event_slug
    and events.visibility = 'public'
    and events.status <> 'finished'
    and public.verify_event_viewer_access(event_slug, submitted_code)
  group by events.id;

  return result;
end;
$$;

revoke all on function public.event_requires_viewer_access(text) from public;
revoke all on function public.verify_event_viewer_access(text, text) from public;
revoke all on function public.get_public_event_for_viewer(text, text) from public;
grant execute on function public.event_requires_viewer_access(text) to anon, authenticated;
grant execute on function public.verify_event_viewer_access(text, text) to anon, authenticated;
grant execute on function public.get_public_event_for_viewer(text, text) to anon, authenticated;

drop policy if exists "Public can read visible events" on public.events;
create policy "Public can read active visible events"
on public.events for select
using (
  (visibility = 'public' and status <> 'finished')
  or owner_id = auth.uid()
  or public.is_event_admin(id)
);

drop policy if exists "Public can read teams for unlocked visible events" on public.teams;
create policy "Public can read teams for active unlocked events"
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
          and events.status <> 'finished'
          and not exists (
            select 1 from public.event_viewer_access_codes
            where event_viewer_access_codes.event_id = events.id
          )
        )
      )
  )
);

drop policy if exists "Public can read football tournaments for unlocked events"
on public.football_tournaments;
create policy "Public can read football tournaments for active unlocked events"
on public.football_tournaments for select
using (
  exists (
    select 1 from public.events
    where events.id = football_tournaments.event_id
      and (
        events.owner_id = auth.uid()
        or public.is_event_admin(events.id)
        or (
          events.visibility = 'public'
          and events.status <> 'finished'
          and not exists (
            select 1 from public.event_viewer_access_codes
            where event_viewer_access_codes.event_id = events.id
          )
        )
      )
  )
);

drop policy if exists "Public can read football tournament teams for unlocked events"
on public.football_tournament_teams;
create policy "Public can read football tournament teams for active unlocked events"
on public.football_tournament_teams for select
using (
  exists (
    select 1
    from public.football_tournaments
    join public.events on events.id = football_tournaments.event_id
    where football_tournaments.id = football_tournament_teams.tournament_id
      and (
        events.owner_id = auth.uid()
        or public.is_event_admin(events.id)
        or (
          events.visibility = 'public'
          and events.status <> 'finished'
          and not exists (
            select 1 from public.event_viewer_access_codes
            where event_viewer_access_codes.event_id = events.id
          )
        )
      )
  )
);

drop policy if exists "Public can read football matches for unlocked events"
on public.football_matches;
create policy "Public can read football matches for active unlocked events"
on public.football_matches for select
using (
  exists (
    select 1 from public.events
    where events.id = football_matches.event_id
      and (
        events.owner_id = auth.uid()
        or public.is_event_admin(events.id)
        or (
          events.visibility = 'public'
          and events.status <> 'finished'
          and not exists (
            select 1 from public.event_viewer_access_codes
            where event_viewer_access_codes.event_id = events.id
          )
        )
      )
  )
);

drop policy if exists "Public can read basketball tournaments for unlocked events"
on public.basketball_tournaments;
create policy "Public can read basketball tournaments for active unlocked events"
on public.basketball_tournaments for select
using (
  exists (
    select 1 from public.events
    where events.id = basketball_tournaments.event_id
      and (
        events.owner_id = auth.uid()
        or public.is_event_admin(events.id)
        or (
          events.visibility = 'public'
          and events.status <> 'finished'
          and not exists (
            select 1 from public.event_viewer_access_codes
            where event_id = events.id
          )
        )
      )
  )
);

drop policy if exists "Public can read basketball tournament teams for unlocked events"
on public.basketball_tournament_teams;
create policy "Public can read basketball tournament teams for active unlocked events"
on public.basketball_tournament_teams for select
using (
  exists (
    select 1
    from public.basketball_tournaments
    join public.events on events.id = basketball_tournaments.event_id
    where basketball_tournaments.id = basketball_tournament_teams.tournament_id
      and (
        events.owner_id = auth.uid()
        or public.is_event_admin(events.id)
        or (
          events.visibility = 'public'
          and events.status <> 'finished'
          and not exists (
            select 1 from public.event_viewer_access_codes
            where event_id = events.id
          )
        )
      )
  )
);

drop policy if exists "Public can read basketball matches for unlocked events"
on public.basketball_matches;
create policy "Public can read basketball matches for active unlocked events"
on public.basketball_matches for select
using (
  exists (
    select 1 from public.events
    where events.id = basketball_matches.event_id
      and (
        events.owner_id = auth.uid()
        or public.is_event_admin(events.id)
        or (
          events.visibility = 'public'
          and events.status <> 'finished'
          and not exists (
            select 1 from public.event_viewer_access_codes
            where event_id = events.id
          )
        )
      )
  )
);
