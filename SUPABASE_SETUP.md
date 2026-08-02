# Supabase Setup

Phase 2 expects a Supabase project with Auth enabled.

## Environment Variables

Set these locally in `.env.local` and in Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Use the base project URL, for example `https://project-ref.supabase.co`.
Do not include `/rest/v1`.

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is still accepted as a temporary fallback for
older projects, but new setup should use the publishable key.

## Database

Run the SQL in:

```text
supabase/migrations/001_initial_event_auth_schema.sql
supabase/migrations/002_enable_game_points_realtime.sql
supabase/migrations/003_event_viewer_access_codes.sql
supabase/migrations/004_event_admin_collaborators.sql
supabase/migrations/005_football_tournaments.sql
```

The schema creates:

- Supabase Auth-backed profiles
- Events
- Event admins
- Event teams
- Game Points scores
- Score event audit rows
- Public read policies for visible events
- Admin-only write policies for owned/admin events

The second migration enables Realtime broadcasts for team and score changes.
The public scoreboard also refreshes every five seconds as a fallback.

The third migration adds optional viewer access codes. The fourth adds
event-admin collaborators while keeping event ownership and deletion restricted
to the original owner. The fifth adds football tournaments, shared tournament
teams, fixtures, live scores, knockout progression fields, audit history,
access-code-aware public reads, RLS and Realtime publication.

## Auth Flow

- Admins sign up or log in with Supabase Auth.
- Logged-in admins can create events.
- Public viewers can search visible events without an account.
- Event admins can create tournaments and run football matches.
- Future officials can use the same Auth foundation with event or match assignment.

## Current Local Behaviour

If Supabase env vars are not set, the app falls back to local sample events so the Phase 1/2 shell remains browsable.

Set `RT_POINTS_USE_SAMPLE_DATA=true` for a local visual preview that ignores
configured Supabase credentials without changing or removing `.env`.
