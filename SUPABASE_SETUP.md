# Supabase Setup

Phase 2 expects a Supabase project with Auth enabled.

## Environment Variables

Set these locally in `.env.local` and in Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Database

Run the SQL in:

```text
supabase/migrations/001_initial_event_auth_schema.sql
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

## Auth Flow

- Admins sign up or log in with Supabase Auth.
- Logged-in admins can create events.
- Public viewers can search visible events without an account.
- Future officials can use the same Auth foundation with event or match assignment.

## Current Local Behaviour

If Supabase env vars are not set, the app falls back to local sample events so the Phase 1/2 shell remains browsable.
