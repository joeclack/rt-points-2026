# Project Plan

This plan turns the product spec into implementation phases for `rt-points-2026`.

The first release should prove the live scoring experience with **Team Game Points** inside an admin-created event. Football tracking should be planned into the event structure, but not built until the core product is stable.

## Guiding Principles

- Build the smallest complete live scoring product first.
- Keep the admin flow fast and hard to misuse during a live event.
- Make the audience view feel live, clear, and projector-ready.
- Make events the top-level container for all trackers.
- Use Supabase Auth for admin accounts and future official access.
- Let public viewers search for visible events without requiring an account.
- Use shared concepts that can support both tracker types later: events, teams, participants, public views, admins, officials, and realtime updates.
- Avoid building full football functionality until the points tracker is working end to end.

## Phase 0: Product Setup

Goal: make the product direction concrete before implementation starts.

### Steps

- Confirm working product name.
- Confirm first target user: event organiser, school/church leader, or sports organiser.
- Confirm first tracker to build: Team Game Points.
- Confirm hosting target: Vercel.
- Confirm UI direction: shadcn/ui for admin, custom display layer for audience.
- Confirm realtime provider: Supabase.
- Confirm admin access model: Supabase Auth.
- Confirm public access model: searchable public events without viewer accounts.

### Output

- Final product name or working name.
- Confirmed MVC scope.
- Confirmed first event format.
- Confirmed admin auth model.
- Confirmed public event search model.
- Confirmed deployment target.

## Phase 1: App Foundation

Goal: create the base application structure.

### Steps

- Scaffold a Next.js app.
- Add TypeScript.
- Add Tailwind CSS.
- Add shadcn/ui.
- Add core app layout.
- Add basic navigation for event search, admin entry, and tracker selection inside events.
- Add routes for public event search, admin auth, event management, and tracker views.
- Add shared design tokens for colours, spacing, typography, and UI states.
- Add Vercel-ready configuration.

### Initial Routes

- `/` - public event search and product entry
- `/login` - admin login
- `/signup` - admin signup
- `/admin/events` - admin event list
- `/admin/events/new` - create event flow
- `/admin/events/[eventId]` - event admin dashboard
- `/events/[eventSlug]` - public event detail page
- `/events/[eventSlug]/game-points` - public game points scoreboard
- `/admin/events/[eventId]/game-points` - admin game points dashboard
- `/events/[eventSlug]/football` - placeholder future football public page

### Output

- Running app shell.
- Public event search shell.
- Admin auth route shells.
- Event management route shells.
- Game Points admin and public route shells.
- Football route clearly marked as future scope.

## Phase 2: Auth, Events, And Supabase Setup

Goal: define the event-first data structure, add Supabase Auth, and connect the app to real event and team data.

### Steps

- Create Supabase project.
- Add environment variables locally and in Vercel.
- Add Supabase Auth client/server helpers.
- Add admin signup/login/logout flows.
- Define database tables for events, team game points, and future football expansion.
- Add row-level security policies.
- Add event ownership rules.
- Add public read rules for visible events.
- Add seed data for a sample event such as `The Jesus Generation` and teams.
- Add basic data access helpers.
- Add realtime subscription helper.
- Add public event search helper.
- Add admin event list helper.
- Add create event action.

### Suggested MVC Tables

- `profiles`
- `events`
- `event_admins`
- `teams`
- `game_points_scores`
- `score_events`

### Future Tables To Plan For

- `matches`
- `fixtures`
- `officials`
- `match_events`
- `standings`

### Output

- Supabase schema for the MVC.
- Supabase Auth wired into the app.
- Admin can create an account and log in.
- Admin can create an event.
- Public users can search visible events.
- Local app connected to Supabase.
- Seed event with sample teams.
- Read/write helpers for events, teams, and scores.

## Phase 3: Team Game Points Admin

Goal: build the organiser control panel.

### Steps

- Build admin dashboard layout.
- Show admin-owned events.
- Add create event screen.
- Show current event details after event selection.
- List all teams with current points.
- Add quick controls for `+1`, `-1`, custom add/subtract, and set exact points.
- Add team create/edit dialog.
- Add team colour picker.
- Add team badge/image upload flow.
- Add reset all scores action with confirmation.
- Add basic loading, error, and empty states.
- Add toast feedback for saved changes.

### Admin Requirements

- Controls must be large enough to use under pressure.
- Current score must be obvious.
- Score changes should complete quickly.
- Destructive actions must require confirmation.
- The screen must work on laptop and tablet sizes.

### Output

- Functional admin dashboard for an event's Team Game Points tracker.
- Admin can create an event and manage that event.
- Teams can be created and edited inside an event.
- Scores can be updated reliably inside an event.
- Team styling can be changed.

## Phase 4: Public Event Search And Audience Scoreboard

Goal: let viewers find an event and open its live display experience.

### Steps

- Build public event search route.
- Search visible events by name.
- Build public event detail route.
- Show enabled trackers for the selected event.
- Build public scoreboard route for the selected event.
- Load selected event and team scores.
- Sort teams by points.
- Show a podium for top three teams.
- Show remaining teams in a clear ranking list if needed.
- Add team colour and badge support.
- Add large score typography.
- Add responsive layout for desktop, projector, TV, and mobile.
- Add subtle score-change animation.
- Add winner/final standings display state.

### Audience Requirements

- Readable from a distance.
- Clear winner and ranking hierarchy.
- No admin controls visible.
- No setup text or technical language.
- Must look good on a large display.

### Output

- Public event search page.
- Public event detail page.
- Public audience scoreboard.
- Live-looking ranking display.
- Projector-friendly layout.
- Winner/final standings view.

## Phase 5: Realtime Experience

Goal: make score updates feel instant and reliable across devices.

### Steps

- Load initial state from Supabase.
- Subscribe to score updates.
- Update audience view without page refresh.
- Update admin view when another admin/device changes a score.
- Add visual feedback when a score changes.
- Add connection state handling.
- Add fallback refresh behaviour for reconnects.
- Test with admin and audience views open at the same time.

### Realtime Requirements

- Audience screens should update immediately after an admin score change.
- A late-joining audience screen should load the latest state.
- Reconnected clients should recover current scores.
- The app should avoid duplicate or out-of-order score displays.

### Output

- Reliable live score updates.
- Score-change animations.
- Basic connection resilience.

## Phase 6: Admin Access And Event Controls

Goal: make the app usable for a real event with account-based admin access and public viewer access.

### Steps

- Add protected admin entry.
- Use Supabase Auth for admin access.
- Add login, signup, logout, and protected route handling.
- Add event settings screen.
- Add event visibility setting for public search.
- Add start, pause, finish, and reset event controls.
- Add final standings state.
- Add copy/share links for audience display.
- Add guardrails for invalid score changes.

### Output

- Account-based admin management flow.
- Public shareable audience link.
- Public event search path.
- Event lifecycle controls.

## Phase 7: Polish And Validation

Goal: prepare the MVC for real usage.

### Steps

- Review responsive layouts.
- Test public event search.
- Test logged-out viewers can open public events.
- Test logged-out users cannot access admin pages.
- Test admins only see their events.
- Test with sample teams and real-looking names/badges.
- Test score changes from multiple browser windows.
- Test on mobile width.
- Test on projector/large display width.
- Check empty, loading, and error states.
- Check reset and final standings flows.
- Run lint/type checks.
- Fix obvious UX friction.

### Output

- MVC ready for a live test event.
- Known issues documented.
- Basic validation completed.

## Phase 8: Vercel Deployment

Goal: deploy the MVC and make it shareable.

### Steps

- Create Vercel project.
- Add Supabase environment variables.
- Deploy main branch.
- Confirm production build works.
- Confirm login/signup works.
- Confirm public event search works.
- Confirm admin route works.
- Confirm audience route works.
- Confirm realtime updates work on production.
- Add custom domain later if needed.

### Output

- Production Vercel URL.
- Working public audience link.
- Working admin route.
- Deployment checklist completed.

## Phase 9: Football Planning

Goal: plan the second tracker after the points tracker proves the core product.

### Steps

- Define football user roles: admin, official, spectator.
- Define fixture model.
- Define match status workflow.
- Define official score submission flow.
- Define admin correction flow.
- Define standings calculation rules.
- Define public match centre layout.
- Define MVP football scope.

### Football MVC Features

- Create teams.
- Create fixtures.
- Assign officials.
- Start a match.
- Update live score.
- Mark halftime and full-time.
- Publish final result.
- Generate standings.
- Show public fixtures, results, and live matches.

### Output

- Football tracker specification.
- Football data model.
- Football implementation plan.

## Suggested Build Order

1. App foundation.
2. Supabase Auth.
3. Event schema.
4. Public event search.
5. Admin event creation.
6. Seed event and teams.
7. Admin team list.
8. Admin score controls.
9. Public audience scoreboard.
10. Realtime updates.
11. Team editing and badges.
12. Reset/final standings.
13. Deployment to Vercel.
14. Live event test.
15. Football planning.

## MVC Completion Criteria

The MVC is complete when:

- An organiser can open the admin dashboard.
- An organiser can create an account and log in.
- An organiser can create an event such as `The Jesus Generation`.
- Public viewers can search for visible events.
- Public viewers can open a selected event without logging in.
- Teams can be created and edited inside an event.
- Scores can be changed during a live event.
- Audience screens update in real time.
- Rankings are clear and visually polished.
- A winner/final standings view can be shown.
- The app is deployed on Vercel.
- The app can be used for a real small event without manual database changes.

## Deferred Until After MVC

- Full football tracker.
- Multi-admin event invitations.
- Official accounts and match assignments.
- Organisation/team workspaces.
- Score history UI.
- Undo and redo.
- Tournament brackets.
- Analytics.
- Payments.
- Native mobile app.
