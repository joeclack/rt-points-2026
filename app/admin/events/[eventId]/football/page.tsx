import {
  CalendarPlus,
  ExternalLink,
  Plus,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import Link from "next/link";

import { addFootballMatch } from "@/app/admin/events/[eventId]/football/actions";
import { AdminFootballMatchCard } from "@/components/admin-football-match-card";
import { AdminFootballTournamentForm } from "@/components/admin-football-tournament-form";
import { AdminTeamJoinRequests } from "@/components/admin-team-join-requests";
import { AdminTeamControls } from "@/components/admin-team-controls";
import { FootballAdminRealtimeRefresh } from "@/components/football-admin-realtime-refresh";
import { FootballBracket } from "@/components/football-bracket";
import { FootballStandings } from "@/components/football-standings";
import { KickoffInput } from "@/components/kickoff-input";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdminUser } from "@/lib/auth";
import { getAdminEventById } from "@/lib/events";
import { getAdminFootballTournaments } from "@/lib/football";
import { getPendingTeamJoinRequests } from "@/lib/team-join-requests";

export default async function AdminEventFootballPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
    tournament?: string;
  }>;
}) {
  const user = await requireAdminUser();
  const { eventId } = await params;
  const { error, message, tournament: selectedTournamentId } =
    await searchParams;
  const [event, tournaments, joinRequests] = await Promise.all([
    getAdminEventById(eventId, user?.id, { includeTeams: true }),
    getAdminFootballTournaments(eventId),
    getPendingTeamJoinRequests(eventId),
  ]);
  const selectedTournament =
    tournaments.find(
      (tournament) => tournament.id === selectedTournamentId,
    ) ?? tournaments[0];
  const tournamentTeams = selectedTournament
    ? event.teams.filter((team) =>
        selectedTournament.teamIds.includes(team.id),
      )
    : [];
  const matches = selectedTournament
    ? [...selectedTournament.matches].sort(
        (a, b) =>
          Number(["live", "halftime"].includes(b.status)) -
            Number(["live", "halftime"].includes(a.status)) ||
          a.roundNumber - b.roundNumber ||
          a.position - b.position,
      )
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <FootballAdminRealtimeRefresh eventId={event.id} />
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
        <div>
          <StatusPill tone="live">Football admin</StatusPill>
          <h1 className="mt-4 text-3xl font-bold text-slate-950">
            {event.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tournaments, fixtures and live match control.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/events/${event.slug}/football`}>
            <ExternalLink className="h-4 w-4" />
            Public match centre
          </Link>
        </Button>
      </header>

      {message ? (
        <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <AdminTeamJoinRequests eventId={event.id} requests={joinRequests} />

      <AdminTeamControls eventId={event.id} teams={event.teams} />

      {event.teams.length < 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Add teams first</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-slate-600">
              Add at least two football teams before creating fixtures.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <details
            className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            open={tournaments.length === 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
              <span>
                <span className="block font-bold text-slate-950">
                  Create a tournament
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  Generate a league schedule or complete knockout bracket.
                </span>
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
                <Plus className="h-5 w-5" />
              </span>
            </summary>
            <div className="border-t border-slate-200 p-5">
              <AdminFootballTournamentForm
                eventId={event.id}
                teams={event.teams}
              />
            </div>
          </details>

          {tournaments.length > 0 ? (
            <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
              {tournaments.map((tournament) => (
                <Button
                  asChild
                  key={tournament.id}
                  variant={
                    tournament.id === selectedTournament?.id
                      ? "default"
                      : "outline"
                  }
                >
                  <Link
                    href={`/admin/events/${event.id}/football?tournament=${tournament.id}`}
                  >
                    {tournament.name}
                  </Link>
                </Button>
              ))}
            </div>
          ) : null}

          {selectedTournament ? (
            <>
              <section className="mb-6 rounded-xl bg-slate-950 p-5 text-white shadow-lg sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill
                        tone={
                          selectedTournament.status === "live"
                            ? "live"
                            : selectedTournament.status === "completed"
                              ? "neutral"
                              : "planned"
                        }
                      >
                        {selectedTournament.status}
                      </StatusPill>
                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                        {selectedTournament.format === "league"
                          ? "League table"
                          : "Knockout cup"}
                      </span>
                    </div>
                    <h2 className="mt-3 text-2xl font-black">
                      {selectedTournament.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-300">
                      {tournamentTeams.length} teams · {matches.length} matches
                    </p>
                  </div>
                  <Trophy className="h-10 w-10 text-cyan-300" />
                </div>
              </section>

              {selectedTournament.format === "league" ? (
                <div className="mb-6">
                  <FootballStandings
                    teams={event.teams}
                    tournament={selectedTournament}
                  />
                </div>
              ) : (
                <div className="mb-6">
                  <FootballBracket
                    teams={event.teams}
                    tournament={selectedTournament}
                  />
                </div>
              )}

              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    Match control
                  </h2>
                  <p className="text-sm text-slate-500">
                    Live matches are kept at the top.
                  </p>
                </div>
                <StatusPill tone="neutral">
                  {matches.length} match{matches.length === 1 ? "" : "es"}
                </StatusPill>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {matches.map((match) => (
                  <AdminFootballMatchCard
                    eventId={event.id}
                    key={match.id}
                    match={match}
                    teams={event.teams}
                  />
                ))}
              </div>

              <details className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4 font-semibold text-slate-900">
                  <CalendarPlus className="h-5 w-5 text-cyan-700" />
                  Add an extra match
                </summary>
                <form
                  action={addFootballMatch}
                  className="grid gap-4 border-t border-slate-200 p-4 sm:grid-cols-2"
                >
                  <input name="event_id" type="hidden" value={event.id} />
                  <input
                    name="tournament_id"
                    type="hidden"
                    value={selectedTournament.id}
                  />
                  <div>
                    <label
                      className="mb-1 block text-sm font-medium"
                      htmlFor="home-team"
                    >
                      Home team
                    </label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      id="home-team"
                      name="home_team_id"
                      required
                    >
                      {tournamentTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className="mb-1 block text-sm font-medium"
                      htmlFor="away-team"
                    >
                      Away team
                    </label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      defaultValue={tournamentTeams[1]?.id}
                      id="away-team"
                      name="away_team_id"
                      required
                    >
                      {tournamentTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className="mb-1 block text-sm font-medium"
                      htmlFor="extra-stage"
                    >
                      Match type
                    </label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      id="extra-stage"
                      name="stage"
                    >
                      <option value="league">League match</option>
                      <option value="quarter_final">Quarter-final</option>
                      <option value="semi_final">Semi-final</option>
                      <option value="third_place">Third-place play-off</option>
                      <option value="final">Final</option>
                      <option value="friendly">Extra match</option>
                    </select>
                  </div>
                  <div>
                    <label
                      className="mb-1 block text-sm font-medium"
                      htmlFor="extra-kickoff"
                    >
                      Kickoff
                    </label>
                    <KickoffInput id="extra-kickoff" />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      className="mb-1 block text-sm font-medium"
                      htmlFor="extra-venue"
                    >
                      Pitch / venue
                    </label>
                    <Input
                      id="extra-venue"
                      name="venue"
                      placeholder="Main pitch"
                    />
                  </div>
                  <Button className="sm:col-span-2" type="submit">
                    <ShieldCheck className="h-4 w-4" />
                    Add match
                  </Button>
                </form>
              </details>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <Trophy className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 font-bold text-slate-950">
                No tournaments yet
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Create one above and all fixtures will appear here.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
