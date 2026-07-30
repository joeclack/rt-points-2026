# Project Plan

This plan turns the product spec into implementation phases for `rt-points-2026`.

The first release should prove the live scoring experience with **Team Game Points**. Football tracking should be planned into the structure, but not built until the core product is stable.

## Guiding Principles

- Build the smallest complete live scoring product first.
- Keep the admin flow fast and hard to misuse during a live event.
- Make the audience view feel live, clear, and projector-ready.
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
- Decide whether the first version needs real user accounts or a simpler protected admin entry.

### Output

- Final product name or working name.
- Confirmed MVC scope.
- Confirmed first event format.
- Confirmed deployment target.

## Phase 1: App Foundation

Goal: create the base application structure.

### Steps

- Scaffold a Next.js app.
- Add TypeScript.
- Add Tailwind CSS.
- Add shadcn/ui.
- Add core app layout.
- Add basic navigation for tracker selection.
- Add routes for admin and public views.
- Add shared design tokens for colours, spacing, typography, and UI states.
- Add Vercel-ready configuration.

### Initial Routes

- `/` - tracker selection or landing entry
- `/game-points` - public game points entry
- `/game-points/admin` - admin dashboard
- `/game-points/display` - public audience scoreboard
- `/football` - placeholder future tracker page

### Output

- Running app shell.
- Tracker choice screen.
- Empty admin and audience routes.
- Football route clearly marked as future scope.

## Phase 2: Data Model And Supabase Setup

Goal: define the data structure for the Team Game Points MVC while leaving room for Football later.

### Steps

- Create Supabase project.
- Add environment variables locally and in Vercel.
- Define database tables for the first version.
- Add seed data for a sample event and teams.
- Add basic data access helpers.
- Add realtime subscription helper.
- Decide initial security model.

### Suggested MVC Tables

- `events`
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
- Local app connected to Supabase.
- Seed event with sample teams.
- Read/write helpers for teams and scores.

## Phase 3: Team Game Points Admin

Goal: build the organiser control panel.

### Steps

- Build admin dashboard layout.
- Show current event details.
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

- Functional admin dashboard for Team Game Points.
- Teams can be created and edited.
- Scores can be updated reliably.
- Team styling can be changed.

## Phase 4: Public Audience Scoreboard

Goal: create the live display experience.

### Steps

- Build public scoreboard route.
- Load current event and team scores.
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

Goal: make the app usable for a real event without overbuilding accounts.

### Steps

- Add protected admin entry.
- Decide whether MVC uses password access, Supabase Auth, or invite-only admin links.
- Add event settings screen.
- Add start, pause, finish, and reset event controls.
- Add final standings state.
- Add copy/share links for audience display.
- Add guardrails for invalid score changes.

### Output

- Admin-only management flow.
- Public shareable audience link.
- Event lifecycle controls.

## Phase 7: Polish And Validation

Goal: prepare the MVC for real usage.

### Steps

- Review responsive layouts.
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
2. Supabase schema.
3. Seed event and teams.
4. Admin team list.
5. Admin score controls.
6. Public audience scoreboard.
7. Realtime updates.
8. Team editing and badges.
9. Reset/final standings.
10. Deployment to Vercel.
11. Live event test.
12. Football planning.

## MVC Completion Criteria

The MVC is complete when:

- An organiser can open the admin dashboard.
- Teams can be created and edited.
- Scores can be changed during a live event.
- Audience screens update in real time.
- Rankings are clear and visually polished.
- A winner/final standings view can be shown.
- The app is deployed on Vercel.
- The app can be used for a real small event without manual database changes.

## Deferred Until After MVC

- Full football tracker.
- Multiple simultaneous event management.
- Advanced auth and roles.
- Score history UI.
- Undo and redo.
- Tournament brackets.
- Analytics.
- Payments.
- Public event discovery.
- Native mobile app.
