# rt-points-2026

A real-time scoring and tracking platform for live events, team games, and football competitions.

## Product Vision

Build one unified live scoring platform with two main tracker types:

1. **Team Game Points** - a live points leaderboard for games, youth events, school competitions, house points, quizzes, camps, and team challenges.
2. **Football** - a live match tracking system for fixtures, teams, officials, scores, match status, results, and standings.

The app should feel simple enough to run during a live event, but broad enough to grow into a proper competition management tool.

## Core Product Goal

Organisers should be able to create an event, manage teams, update scores in real time, and publish a clean live display for spectators.

Officials should eventually be able to update live football match scores from the field, with admins able to review, correct, and publish results.

## Tracker 1: Team Game Points

This is the first MVC.

Use this mode when teams collect points across games, rounds, or challenges.

### Core Features

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

This is the future sports-tracking mode.

Use this mode for football competitions where teams play scheduled matches and officials update live scores.

### Future Features

- Manage football teams
- Create fixtures and schedules
- Assign officials to matches
- Track match status: upcoming, live, halftime, full-time
- Update live match score
- Submit score updates from officials
- Allow admin review and correction
- Generate standings and league tables
- Show public fixtures and results
- Show a public live match centre
- Support tournament groups or knockout rounds later

## Main App Experience

The app should start with a clear tracker choice:

- **Game Points**
- **Football**

Each tracker should have its own admin workflow and public display, while sharing the same visual identity, team data patterns, event structure, and real-time update feel.

## MVC Scope

The first version should focus only on **Team Game Points**.

### MVC Screens

- Start screen with tracker choice
- Admin login or protected admin entry
- Admin dashboard
- Team score controls
- Team settings dialog
- Image or badge upload dialog
- Audience scoreboard
- Winner or final standings view

### MVC Features

- One active event
- Multiple teams
- Team name, colour, badge, and score
- Admin score controls
- Public audience view
- Live score updates across devices
- Podium-style ranking display
- Reset scores
- Responsive admin experience
- Projector-friendly audience view

## Out Of Scope For MVC

- Multiple simultaneous events
- Full football fixture management
- Complex user accounts
- Role-based permissions
- Score history
- Undo and redo
- Tournament brackets
- Payments or subscriptions
- Public event discovery
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
- Vercel for hosting and preview deployments

## Realtime Principle

The app should feel live.

Audience screens should load the current state immediately, then receive score updates in real time without needing refreshes. Score changes should have subtle visual feedback so spectators can see that something changed.

## Product Positioning

A real-time scoring and match management app for small competitions, schools, clubs, churches, tournaments, game nights, and live events.

The product starts as a team points tracker, but should be designed to grow into a broader live competition platform.
