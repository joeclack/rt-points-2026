# Supabase Setup

The app expects a Supabase project with Auth enabled.

## Environment Variables

Set these locally in `.env.local` and in Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Use the base project URL, for example `https://project-ref.supabase.co`.
Do not include `/rest/v1`.

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is still accepted as a temporary fallback for
older projects, but new setup should use the publishable key.

`SUPABASE_SECRET_KEY` must only be configured in trusted server environments.
Never prefix it with `NEXT_PUBLIC_` or expose it to the browser. The legacy
`SUPABASE_SERVICE_ROLE_KEY` is accepted as a fallback, but new projects should
use a current `sb_secret_...` key.

Set `NEXT_PUBLIC_SITE_URL` to the deployed app origin in Vercel. The app uses it
to send invitees back to `/invite/accept`.

## Database

Run the SQL in:

```text
supabase/migrations/001_initial_event_auth_schema.sql
supabase/migrations/003_event_viewer_access_codes.sql
supabase/migrations/004_event_admin_collaborators.sql
supabase/migrations/005_football_tournaments.sql
supabase/migrations/006_remove_game_points_and_reset_users.sql
supabase/migrations/007_team_join_requests.sql
supabase/migrations/008_configurable_team_size.sql
supabase/migrations/009_basketball_tournaments.sql
supabase/migrations/010_team_request_realtime.sql
supabase/migrations/011_football_match_clock.sql
supabase/migrations/012_archive_tournaments.sql
supabase/migrations/013_football_stoppage_clock.sql
supabase/migrations/014_realistic_football_stoppage_tracking.sql
supabase/migrations/015_resilient_football_match_commands.sql
supabase/migrations/016_resilient_team_and_event_commands.sql
supabase/migrations/017_resilient_basketball_commands.sql
supabase/migrations/018_atomic_football_tournament_creation.sql
supabase/migrations/019_invite_only_app_admins.sql
supabase/migrations/020_remove_invited_app_admins.sql
supabase/migrations/021_fix_event_archive_status_type.sql
supabase/migrations/022_team_signup_controls.sql
```

Migration `006` is intentionally destructive when upgrading an existing
project. It removes the legacy Game Points tables and column, then deletes all
events and all Supabase Auth users so the football-only app starts clean. Do
not run it against an environment whose existing accounts or event data must be
kept.

The schema creates:

- Supabase Auth-backed profiles
- Invite-only app administrators
- Events
- Event admins
- Football teams
- Football tournaments, tournament teams, matches and match audit rows
- Public five-player team join requests with private admin review
- Public read policies for visible events
- Admin-only write policies for owned/admin events
- Supabase Realtime publication for football matches and tournaments
- Supabase Realtime updates for pending team requests

The third migration adds optional viewer access codes. The fourth adds
event-admin collaborators while keeping event ownership and deletion restricted
to the original owner. The fifth adds football tournaments, tournament teams,
fixtures, live scores, knockout progression fields, audit history,
access-code-aware public reads, RLS and Realtime publication.
The seventh adds public team applications, five-player rosters, profanity
validation and atomic admin acceptance or rejection.

Migration `019` adds app-level admin membership, makes tournament creation
invite-only, and seeds `joebclack@gmail.com` as the app owner. If that email
already exists in Supabase Auth, it is promoted when the migration runs. If it
does not exist yet, invite it once from **Authentication > Users > Add user >
Send invitation** after applying the migration; the Auth trigger will seed it
as owner automatically.

Migration `020` lets the app owner cancel pending invitations and remove invited
admins. Removing an accepted admin transfers their owned tournaments to the app
owner before deleting their authentication account and tournament access.

Migration `021` fixes archive and restore operations by keeping tournament status
comparisons typed as the `event_status` enum.

Migration `022` adds the team signup setting and enforces closed signups for all
new public join requests. Existing tournaments remain open until an admin closes
them from tournament settings.

## Invite-only Auth

In the Supabase Dashboard:

1. Open **Authentication > Providers > Email** and turn off **Allow new users
   to sign up**. Admin API invitations still work when public signup is off.
2. Open **Authentication > URL Configuration**. Set the production Site URL and
   add `http://localhost:3000/invite/accept` plus the production
   `/invite/accept` URL to the redirect allow list.
3. Open **Authentication > Email Templates > Invite user**.
   - Subject: `You have been invited to TJG Tournaments`
   - Body: use `supabase/templates/invite.html`
4. Add `SUPABASE_SECRET_KEY` and `NEXT_PUBLIC_SITE_URL` locally and in Vercel.

Only the seeded app owner can open `/admin/admins` and send invitations. The
secret key is used exclusively in the server action. Invited admins can create
their own tournaments; an event owner must still grant them access to an
existing tournament.

Keep the template's `{{ .RedirectTo }}` and `{{ .TokenHash }}` placeholders
unchanged. They let the app verify the invitation into its cookie-based Supabase
session before the invitee sets a password.

## Password Recovery Email

In the Supabase Dashboard, open **Authentication > Email Templates > Reset password**.

- Subject: `Reset your password`
- Body: use `supabase/templates/recovery.html`

This template also uses `{{ .ConfirmationURL }}`. Keep the placeholder unchanged
when pasting the HTML into the dashboard.

## Auth Flow

- The app owner invites admins by email.
- Invitees accept the email link, choose a password and then use Supabase Auth.
- Only app admins can enter the admin area or create tournaments.
- Public viewers can search visible tournaments and submit a team without an account.
- Event admins can create tournaments and run football matches.
- Future officials can use the same Auth foundation with event or match assignment.

## Current Local Behaviour

If Supabase env vars are not set, the app falls back to local sample events so the Phase 1/2 shell remains browsable.

Set `RT_POINTS_USE_SAMPLE_DATA=true` for a local visual preview that ignores
configured Supabase credentials without changing or removing `.env`.
