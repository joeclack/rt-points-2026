# rt-points-2026

A real-time scoring and tracking platform for live events, team games, and football competitions.

## Product Vision

Build one unified live scoring platform with two main tracker types:

1. **Team Game Points** - a live points leaderboard for games, youth events, school competitions, house points, quizzes, camps, and team challenges.
2. **Football** - a live match tracking system for fixtures, teams, officials, scores, match status, results, and standings.

The app should feel simple enough to run during a live event, but broad enough to grow into a proper competition management tool.

## Core Product Goal

Organisers should be able to create an account, log in to an admin area, create an event, manage teams, update scores in real time, and publish a clean live display for spectators.

Event admins can run live football matches from the field, correct scores, and publish results. A narrower official-only role can be added later on the same Auth foundation.

Spectators should be able to search for public events, select the event they want, and view its live game points, football fixtures, live scores, results, and standings.

## Event Model

The event is the main container for everything in the product.

An admin creates an event such as **The Jesus Generation**. That event can contain one or both tracker types:

- **Game Points** - team games, points, rankings, podiums, and winner views.
- **Football** - teams, fixtures, officials, live match scores, results, and standings.

Each event should have:

- Event name
- Public search visibility
- Optional description
- Optional date or date range
- Event owner/admin
- Enabled tracker types
- Teams
- Public viewer pages
- Admin management pages

This keeps the product flexible: the same event can run team games and football without becoming two disconnected products.

## Auth And Access

Admin access should use Supabase Auth.

Admins must have an account and be logged in before they can create or manage events. Admins can only manage events they own or have been invited to manage.

Public viewers should not need an account for the MVC. They should be able to search for visible events, open the selected event, and view live public pages.

Future official access can also use Supabase Auth, with officials invited to specific football matches or events.

## Tracker 1: Team Game Points

This is the first MVC.

Use this mode when teams collect points across games, rounds, or challenges.

### Core Features

- Create or select an event
- Create and manage teams
- Set team names, colours, and badges
- Add points
- Subtract points
- Set exact points
- Reset all scores
- Show a public live audience scoreboard
- Show rankings based on current points
- Highlight first, second, and third place
- Display a final winner or standings view

### Example Use Cases

- Youth events
- School competitions
- Church games
- Quiz nights
- House points
- Camps and team challenges
- Live event competitions

## Tracker 2: Football

This is the live tournament and match-tracking mode.

Use this mode for football competitions where shared event teams play scheduled matches and admins update live scores.

### Core Features

- Create multiple tournaments inside an event
- Reuse names, colours and badges from the event's Game Points teams
- Create a round-robin league with automatic fixtures
- Create a knockout cup starting at the quarter-finals, semi-finals or final
- Automatically move knockout winners into the next round
- Add extra fixtures and set kickoff times and venues
- Track match status: upcoming, live, half-time and full-time
- Update and correct scores live
- Reopen a completed result when the next knockout round has not started
- Generate a live/provisional league table
- Show a public phone-first match centre, fixtures, results and bracket
- Push match updates with Supabase Realtime and a five-second refresh fallback

### Deferred Football Features

- Dedicated official accounts and match assignments
- Group stages feeding into a knockout bracket
- Penalty shoot-out detail
- Player, scorer, card and substitution events

## Main App Experience

The app should start with a clear event-first flow:

- Public viewers search for an event.
- Public viewers open the selected event.
- Admins log in.
- Admins create or manage their events.

Inside an event, the app should show a clear tracker choice:

- **Game Points**
- **Football**

Each tracker should have its own admin workflow and public display, while sharing the same event, visual identity, team data patterns, and real-time update feel.

## Implemented Scope

The current app includes event creation, public discovery, **Team Game Points**, and the first complete **Football** tournament slice.

### MVC Screens

- Public event search
- Public event detail page
- Admin signup/login
- Admin event list
- Create event flow
- Event admin dashboard
- Team score controls
- Team settings dialog
- Image or badge upload dialog
- Public audience scoreboard for selected event
- Winner or final standings view
- Football tournament admin
- Football fixture and live-match controls
- Public football match centre
- League tables and knockout brackets

### MVC Features

- Supabase Auth for admin signup/login
- Admin creates an event
- Public viewers can search visible events
- Public viewers can open an event without logging in
- One or more admin-owned events
- Multiple teams per event
- Team name, colour, badge, and score
- Admin score controls
- Public audience view
- Live score updates across devices
- Podium-style ranking display
- Reset scores
- Responsive admin experience
- Projector-friendly audience view
- Shared event teams across both trackers
- League and knockout tournament generation
- Live football scores, fixtures, results and standings

## Out Of Scope

- Complex organisation accounts
- Official accounts and assignments
- Player-level football events
- Undo and redo
- Payments or subscriptions
- Advanced analytics

## Design Direction

Use a clean, modern interface that separates the admin and audience experiences.

### Admin Experience

The admin side should be practical, calm, and fast to operate during a live event.

- Clear team cards
- Large point controls
- Obvious current scores
- Simple edit dialogs
- Confirmation for destructive actions
- Toasts for important feedback
- Minimal clutter

### Audience Experience

The audience side should feel bold, live, and event-ready.

- Large typography
- Clear rankings
- Team colours and badges
- Podium layout for the top teams
- Motion or animation when scores change
- Strong projector and TV readability
- Winner celebration state

## Preferred Direction

Implementation details can change, but the intended direction is:

- Next.js app
- shadcn/ui for admin interface components
- Tailwind CSS for styling
- Supabase for database and realtime updates
- Supabase Auth for admin login and future official access
- Vercel for hosting and preview deployments

## Realtime Principle

The app should feel live.

Audience screens should load the current state immediately, then receive score updates in real time without needing refreshes. Score changes should have subtle visual feedback so spectators can see that something changed.

## Product Positioning

A real-time scoring and match management app for small competitions, schools, clubs, churches, tournaments, game nights, and live events.

The product starts as a team points tracker, but should be designed to grow into a broader live competition platform.
