# Supabase Setup

The app expects a Supabase project with Auth enabled.

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
supabase/migrations/003_event_viewer_access_codes.sql
supabase/migrations/004_event_admin_collaborators.sql
supabase/migrations/005_football_tournaments.sql
supabase/migrations/006_remove_game_points_and_reset_users.sql
supabase/migrations/007_team_join_requests.sql
```

Migration `006` is intentionally destructive when upgrading an existing
project. It removes the legacy Game Points tables and column, then deletes all
events and all Supabase Auth users so the football-only app starts clean. Do
not run it against an environment whose existing accounts or event data must be
kept.

The schema creates:

- Supabase Auth-backed profiles
- Events
- Event admins
- Football teams
- Football tournaments, tournament teams, matches and match audit rows
- Public five-player team join requests with private admin review
- Public read policies for visible events
- Admin-only write policies for owned/admin events
- Supabase Realtime publication for football matches and tournaments

The third migration adds optional viewer access codes. The fourth adds
event-admin collaborators while keeping event ownership and deletion restricted
to the original owner. The fifth adds football tournaments, tournament teams,
fixtures, live scores, knockout progression fields, audit history,
access-code-aware public reads, RLS and Realtime publication.
The seventh adds public team applications, five-player rosters, profanity
validation and atomic admin acceptance or rejection.

## Auth Flow

- Admins sign up or log in with Supabase Auth.
- Logged-in admins can create tournaments.
- Public viewers can search visible tournaments and submit a team without an account.
- Event admins can create tournaments and run football matches.
- Future officials can use the same Auth foundation with event or match assignment.

## Current Local Behaviour

If Supabase env vars are not set, the app falls back to local sample events so the Phase 1/2 shell remains browsable.

Set `RT_POINTS_USE_SAMPLE_DATA=true` for a local visual preview that ignores
configured Supabase credentials without changing or removing `.env`.
