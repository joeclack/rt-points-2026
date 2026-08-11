# Project Plan

This project is now football-only. The app should stay focused on live football tournaments, admin match control and public match centre viewing.

## Current Product

- Public football event search.
- Public five-player team applications.
- Profanity checks for team and player names.
- Admin team-request approval and rejection.
- Supabase Auth for admins.
- Event creation and event-admin collaboration.
- Optional viewer access codes.
- Football team management.
- League and knockout tournament generation.
- Fixture scheduling and venue labels.
- Live match score control.
- Half-time, resume, full-time and reopen flows.
- Knockout winner progression.
- League standings and knockout brackets.
- Public live football match centre with realtime updates and polling fallback.

## Guiding Principles

- Keep event setup fast for organisers.
- Make live match controls large, clear and hard to misuse.
- Keep public pages phone-first, readable and obviously live.
- Treat teams as football teams, shared across all tournaments in an event.
- Use Supabase RLS as the source of access control.
- Keep public viewers account-free.
- Keep future official access compatible with the current Auth foundation.

## Active Routes

- `/` - public event search
- `/login` - admin login
- `/signup` - admin signup
- `/admin/events` - admin event list
- `/admin/events/new` - create event
- `/admin/events/[eventId]` - event dashboard, admins and viewer access
- `/admin/events/[eventId]/football` - teams, tournaments, fixtures and match control
- `/events/[eventSlug]` - public event detail
- `/events/[eventSlug]/football` - public match centre

## Data Model

- `profiles`
- `events`
- `event_admins`
- `event_viewer_access_codes`
- `teams`
- `team_join_requests`
- `team_join_request_players`
- `football_tournaments`
- `football_tournament_teams`
- `football_matches`
- `football_match_events`

## Done

- Event-first admin/public structure.
- Supabase Auth.
- Event-admin ownership and collaborator model.
- Public access-code gating.
- Football team management.
- Public team submission and private admin review.
- Round-robin fixtures.
- Knockout fixture trees.
- Match lifecycle controls.
- Score correction controls.
- Winner progression for knockouts.
- Live/provisional league standings.
- Public match centre.
- Supabase Realtime plus five-second refresh fallback.
- Tests for fixture generation and standings.

## Deferred

- Dedicated official accounts and match assignments.
- Group stages feeding into knockout brackets.
- Penalty shoot-out detail.
- Player, scorer, card and substitution events.
- Organisation workspaces.
- Analytics.
- Payments.
- Native mobile app.
