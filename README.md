# rt-points-2026

A real-time football tournament and match management app for live events.

## Product Goal

Invited organisers can create a football or basketball tournament, review team applications, manage teams, generate competitions, run live matches, correct scores and publish a clean public match centre for spectators.

Players can search for a public tournament and submit a five-player team for admin approval without creating an account. Spectators can view live fixtures, scores, results, standings and knockout brackets.

## Core Features

- Supabase Auth for event admins.
- Owner-controlled email invitations and app-level admin access.
- Owner-controlled invitation cancellation and admin removal.
- Event ownership and shared admin access.
- Optional viewer access codes for public pages.
- Football teams with names, colours and badges.
- Five-player public team applications with profanity validation.
- Admin acceptance and rejection of team applications.
- Approval-free manual team creation for admins.
- Multiple tournaments per event.
- Round-robin league fixture generation.
- Knockout brackets starting at quarter-finals, semi-finals or final.
- Live, half-time and full-time match workflow.
- Touch-friendly score controls and exact-score correction.
- Knockout winner progression.
- Reopen completed results while downstream matches are still safe.
- Football match event audit history.
- Live/provisional league standings.
- Public phone-first football match centre.
- Supabase Realtime updates with a five-second refresh fallback.

## Main Routes

- `/` - public football event search
- `/login` - admin login
- `/invite/accept` - invited admin account setup
- `/admin/admins` - owner-only admin invitations
- `/admin/events` - admin event list
- `/admin/events/new` - create event
- `/admin/events/[eventId]` - event admin dashboard
- `/admin/events/[eventId]/football` - teams, tournaments, fixtures and live-match admin
- `/events/[eventSlug]` - public event detail
- `/events/[eventSlug]/football` - public live football match centre

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, RLS and Realtime
- Vercel-ready deployment

## Local Development

```bash
npm install
npm run dev
```

If Supabase env vars are not configured, the app falls back to sample football event data for local browsing.

Set `RT_POINTS_USE_SAMPLE_DATA=true` to force sample data even when Supabase credentials exist.

## Validation

```bash
npm run test
npm run typecheck
```

The current tests cover football fixture generation, football standings and
application-level profanity detection.
