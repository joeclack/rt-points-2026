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

## Auth Flow

- Admins sign up or log in with Supabase Auth.
- Logged-in admins can create events.
- Public viewers can search visible events without an account.
- Future officials can use the same Auth foundation with event or match assignment.

## Current Local Behaviour

If Supabase env vars are not set, the app falls back to local sample events so the Phase 1/2 shell remains browsable.
