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
    'team_signups_enabled', events.team_signups_enabled,
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
          'badge_url', teams.badge_url,
          'players', coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'slot', players.slot,
                  'name', players.name
                ) order by players.slot
              )
              from public.team_join_requests requests
              join public.team_join_request_players players
                on players.request_id = requests.id
              where requests.created_team_id = teams.id
                and requests.status = 'accepted'
            ),
            '[]'::jsonb
          )
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

revoke all on function public.get_public_event_for_viewer(text, text) from public;
grant execute on function public.get_public_event_for_viewer(text, text) to anon, authenticated;
