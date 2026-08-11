-- This migration is intentionally destructive.
-- Resetting auth users also requires clearing events because every event must
-- have an owner. Truncating events cascades to teams, tournaments, matches,
-- access codes, collaborators, and their history.

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

revoke all on function public.get_public_event_for_viewer(text, text)
from public;

grant execute on function public.get_public_event_for_viewer(text, text)
to anon, authenticated;

drop trigger if exists teams_create_default_game_points_score
on public.teams;

drop function if exists public.create_default_game_points_score();

drop table if exists public.score_events;
drop table if exists public.game_points_scores;

alter table public.events
drop column if exists game_points_enabled;

truncate table public.events cascade;

-- Deleting auth users cascades to profiles, identities, and sessions. Run this
-- migration only when a complete account reset is intended.
delete from auth.users;
