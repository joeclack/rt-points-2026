"use client";

import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MapPin,
  Radio,
  Trophy,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AcceptedTeamsList } from "@/components/accepted-teams-list";
import { FootballBracket } from "@/components/football-bracket";
import { FootballStandings } from "@/components/football-standings";
import { TeamBadge } from "@/components/team-badge";
import { TournamentWinnerBanner } from "@/components/tournament-winner-banner";
import { getFootballClock } from "@/lib/football-clock";
import {
  footballStageLabels,
  getFootballTournamentWinner,
  isLiveFootballMatch,
  type FootballMatch,
  type FootballTournament,
} from "@/lib/football-types";
import type { Team } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const INITIAL_VISIBLE_MATCHES = 4;

type FootballLiveCentreProps = {
  accessCode: string;
  eventId: string;
  eventName: string;
  eventSlug: string;
  matchMinutes: number;
  initialTeams: Team[];
  initialTournaments: FootballTournament[];
};

type PublicFootballPayload = {
  tournaments: Array<{
    id: string;
    event_id: string;
    name: string;
    format: "league" | "knockout";
    start_stage: "quarter_final" | "semi_final" | "final" | null;
    status: "scheduled" | "live" | "completed";
    win_points: number;
    draw_points: number;
    loss_points: number;
    team_ids: string[];
    matches: Array<{
      id: string;
      tournament_id: string;
      event_id: string;
      home_team_id: string | null;
      away_team_id: string | null;
      stage: FootballMatch["stage"];
      round_number: number;
      position: number;
      kickoff_at: string | null;
      venue: string | null;
      status: FootballMatch["status"];
      home_score: number;
      away_score: number;
      winner_team_id: string | null;
      next_match_id: string | null;
      next_match_slot: "home" | "away" | null;
      started_at: string | null;
      second_half_started_at: string | null;
      stoppage_started_at: string | null;
      first_half_stoppage_seconds: number;
      second_half_stoppage_seconds: number;
      ended_at: string | null;
      updated_at: string;
    }>;
  }>;
};

function mapPublicFootball(payload: PublicFootballPayload) {
  return payload.tournaments.map(
    (tournament): FootballTournament => ({
      id: tournament.id,
      eventId: tournament.event_id,
      name: tournament.name,
      format: tournament.format,
      startStage: tournament.start_stage,
      status: tournament.status,
      winPoints: tournament.win_points,
      drawPoints: tournament.draw_points,
      lossPoints: tournament.loss_points,
      teamIds: tournament.team_ids,
      matches: tournament.matches.map((match) => ({
        id: match.id,
        tournamentId: match.tournament_id,
        eventId: match.event_id,
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        stage: match.stage,
        roundNumber: match.round_number,
        position: match.position,
        kickoffAt: match.kickoff_at,
        venue: match.venue,
        status: match.status,
        homeScore: match.home_score,
        awayScore: match.away_score,
        winnerTeamId: match.winner_team_id,
        nextMatchId: match.next_match_id,
        nextMatchSlot: match.next_match_slot,
        startedAt: match.started_at,
        secondHalfStartedAt: match.second_half_started_at,
        stoppageStartedAt: match.stoppage_started_at,
        firstHalfStoppageSeconds: match.first_half_stoppage_seconds,
        secondHalfStoppageSeconds: match.second_half_stoppage_seconds,
        controlVersion: 0,
        controllerDeviceId: null,
        controllerClaimedAt: null,
        endedAt: match.ended_at,
        updatedAt: match.updated_at,
      })),
    }),
  );
}

function formatKickoff(iso: string | null) {
  if (!iso) {
    return "TBC";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function isAllocatedMatch(match: FootballMatch, teams: Team[]) {
  return Boolean(
    match.homeTeamId &&
      match.awayTeamId &&
      teams.some((team) => team.id === match.homeTeamId) &&
      teams.some((team) => team.id === match.awayTeamId),
  );
}

function PublicTeam({ team }: { team: Team }) {
  return (
    <div className="flex min-w-0 flex-col items-center px-1">
      <TeamBadge
        badge={team.badge}
        badgeUrl={team.badgeUrl}
        className="h-14 w-14 text-lg sm:h-16 sm:w-16"
        colour={team.colour}
        name={team.name}
      />
      <p className="mt-3 max-w-full truncate text-center text-sm font-semibold text-slate-900 sm:text-base">
        {team.name}
      </p>
    </div>
  );
}

function LiveMatch({
  clockNow,
  highlighted,
  match,
  matchMinutes,
  teams,
}: {
  clockNow: number | null;
  highlighted: boolean;
  match: FootballMatch;
  matchMinutes: number;
  teams: Team[];
}) {
  const homeTeam = teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === match.awayTeamId);

  if (!homeTeam || !awayTeam) {
    return null;
  }

  const clock = clockNow
    ? getFootballClock(match, matchMinutes, clockNow)
    : null;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border border-slate-200 bg-white transition-colors",
        highlighted && "bg-emerald-50",
      )}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <span className="text-xs font-medium text-slate-500">
          {footballStageLabels[match.stage]}
        </span>
        <div className="text-center">
          <p
            className={`font-mono text-base font-semibold tabular-nums ${
              clock?.isTrackingStoppage || clock?.isInAddedTime
                ? "text-amber-700"
                : "text-slate-950"
            }`}
          >
            {match.status === "halftime"
              ? "HT"
              : clock?.addedTimePlayedLabel ?? clock?.clockLabel ?? "0:00"}
          </p>
          <p className="text-[0.65rem] font-medium text-slate-500">
            {match.status === "halftime"
              ? "Half-time"
              : clock?.isTrackingStoppage
                ? "Stoppage being tracked"
                : clock?.isInAddedTime
                  ? `of ${clock.addedTimeNeededLabel} added`
                : clock?.periodLabel ?? "First half"}
          </p>
          {clock ? (
            <p className="text-[0.65rem] font-semibold text-amber-700">
              Added time needed {clock.addedTimeNeededLabel}
            </p>
          ) : null}
        </div>
        <span className="flex items-center justify-self-end gap-1.5 text-xs font-semibold text-red-600">
          <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
          {match.status === "halftime"
            ? "HALF-TIME"
            : match.stoppageStartedAt
              ? "STOPPAGE"
              : "LIVE"}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-7 sm:gap-8 sm:px-10 sm:py-9">
        <PublicTeam team={homeTeam} />
        <div
          aria-label={`${match.homeScore} to ${match.awayScore}`}
          className="flex items-center gap-2 text-4xl font-bold text-slate-950 sm:text-5xl"
        >
          <span>{match.homeScore}</span>
          <span className="text-2xl font-normal text-slate-300">-</span>
          <span>{match.awayScore}</span>
        </div>
        <PublicTeam team={awayTeam} />
      </div>

      {match.venue ? (
        <p className="flex items-center justify-center gap-1.5 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5" />
          {match.venue}
        </p>
      ) : null}
    </article>
  );
}

function MatchRow({ match, teams }: { match: FootballMatch; teams: Team[] }) {
  const homeTeam = teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === match.awayTeamId);
  const isResult = match.status === "full_time";

  if (!homeTeam || !awayTeam) {
    return null;
  }

  return (
    <article className="grid grid-cols-[5.5rem_minmax(0,1fr)_1.5rem] items-center gap-3 px-4 py-3 sm:grid-cols-[8rem_minmax(0,1fr)_2rem]">
      <div className="text-xs text-slate-500">
        <p className="font-medium text-slate-700">
          {isResult ? "FT" : formatKickoff(match.kickoffAt)}
        </p>
        <p className="mt-1 hidden sm:block">
          {footballStageLabels[match.stage]}
          {match.stage === "league" ? ` / R${match.roundNumber}` : ""}
        </p>
      </div>

      <div className="min-w-0 space-y-2">
        {[
          { team: homeTeam, score: match.homeScore },
          { team: awayTeam, score: match.awayScore },
        ].map(({ team, score }, index) => (
          <div className="flex items-center gap-2" key={`${match.id}-${index}`}>
            <TeamBadge
              badge={team.badge}
              badgeUrl={team.badgeUrl}
              className="h-6 w-6 shrink-0 text-[0.6rem]"
              colour={team.colour}
              name={team.name}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
              {team.name}
            </span>
            {isResult ? (
              <span className="font-semibold text-slate-950">{score}</span>
            ) : null}
          </div>
        ))}
      </div>

      <span className="flex justify-center text-slate-300">
        {isResult ? null : <ChevronRight className="h-4 w-4" />}
      </span>
    </article>
  );
}

function MatchList({
  expanded,
  matches,
  onExpand,
  teams,
}: {
  expanded: boolean;
  matches: FootballMatch[];
  onExpand: () => void;
  teams: Team[];
}) {
  const visibleMatches = expanded
    ? matches
    : matches.slice(0, INITIAL_VISIBLE_MATCHES);
  const hiddenCount = matches.length - visibleMatches.length;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="divide-y divide-slate-100">
        {visibleMatches.map((match) => (
          <MatchRow key={match.id} match={match} teams={teams} />
        ))}
      </div>
      {hiddenCount > 0 ? (
        <button
          className="flex w-full items-center justify-center gap-2 border-t border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          onClick={onExpand}
          type="button"
        >
          Show {hiddenCount} more
          <ChevronDown className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export function FootballLiveCentre({
  accessCode,
  eventId,
  eventName,
  eventSlug,
  matchMinutes,
  initialTeams,
  initialTournaments,
}: FootballLiveCentreProps) {
  const [tournaments, setTournaments] = useState(initialTournaments);
  const [selectedTournamentId, setSelectedTournamentId] = useState(
    initialTournaments[0]?.id ?? "",
  );
  const [showAllFixtures, setShowAllFixtures] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const isSampleData = eventId.startsWith("evt_");
  const [connectionState, setConnectionState] = useState<
    "connecting" | "live" | "offline" | "demo"
  >(isSampleData ? "demo" : "connecting");
  const [highlightedMatchId, setHighlightedMatchId] = useState<string | null>(
    null,
  );
  const [clockNow, setClockNow] = useState<number | null>(null);

  const tournament =
    tournaments.find((item) => item.id === selectedTournamentId) ??
    tournaments[0];
  const winner = tournament
    ? getFootballTournamentWinner(tournament, initialTeams)
    : null;
  const liveMatches = useMemo(
    () =>
      tournament?.matches
        .filter(
          (match) =>
            isLiveFootballMatch(match.status) &&
            isAllocatedMatch(match, initialTeams),
        )
        .sort((a, b) => a.position - b.position) ?? [],
    [initialTeams, tournament],
  );
  const upcomingMatches = useMemo(
    () =>
      tournament?.matches
        .filter(
          (match) =>
            match.status === "scheduled" &&
            isAllocatedMatch(match, initialTeams),
        )
        .sort(
          (a, b) =>
            (a.kickoffAt ? new Date(a.kickoffAt).getTime() : Infinity) -
              (b.kickoffAt ? new Date(b.kickoffAt).getTime() : Infinity) ||
            a.roundNumber - b.roundNumber ||
            a.position - b.position,
        ) ?? [],
    [initialTeams, tournament],
  );
  const results = useMemo(
    () =>
      tournament?.matches
        .filter(
          (match) =>
            match.status === "full_time" &&
            isAllocatedMatch(match, initialTeams),
        )
        .sort(
          (a, b) =>
            new Date(b.endedAt ?? 0).getTime() -
            new Date(a.endedAt ?? 0).getTime(),
        ) ?? [],
    [initialTeams, tournament],
  );

  useEffect(() => {
    if (!liveMatches.some((match) => match.status === "live")) {
      setClockNow(null);
      return;
    }

    const tick = () => setClockNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 1000);

    return () => window.clearInterval(interval);
  }, [liveMatches]);

  useEffect(() => {
    if (isSampleData) {
      return;
    }

    let mounted = true;
    let refreshTimeout: number | undefined;

    async function refreshFootball(updatedMatchId?: string) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc(
          "get_public_football_for_viewer",
          {
            event_slug: eventSlug,
            submitted_code: accessCode,
          },
        );

        if (!mounted || error || !data) {
          return;
        }

        setTournaments(
          mapPublicFootball(data as unknown as PublicFootballPayload),
        );
        setConnectionState("live");

        if (updatedMatchId) {
          setHighlightedMatchId(updatedMatchId);
          window.setTimeout(() => {
            if (mounted) {
              setHighlightedMatchId(null);
            }
          }, 1400);
        }
      } catch {
        if (mounted) {
          setConnectionState("offline");
        }
      }
    }

    function queueRefresh(matchId?: string) {
      if (refreshTimeout) {
        window.clearTimeout(refreshTimeout);
      }

      refreshTimeout = window.setTimeout(() => {
        void refreshFootball(matchId);
      }, 100);
    }

    try {
      const supabase = createClient();
      const channel = supabase
        .channel(`football:${eventId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "football_matches",
            filter: `event_id=eq.${eventId}`,
          },
          (payload) => {
            const matchId =
              "id" in payload.new && typeof payload.new.id === "string"
                ? payload.new.id
                : undefined;
            queueRefresh(matchId);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "football_tournaments",
            filter: `event_id=eq.${eventId}`,
          },
          () => queueRefresh(),
        )
        .subscribe((status) => {
          if (mounted) {
            setConnectionState(
              status === "SUBSCRIBED" ? "live" : "connecting",
            );
          }
        });
      const fallbackInterval = window.setInterval(() => {
        void refreshFootball();
      }, 5000);

      return () => {
        mounted = false;

        if (refreshTimeout) {
          window.clearTimeout(refreshTimeout);
        }

        window.clearInterval(fallbackInterval);
        void supabase.removeChannel(channel);
      };
    } catch {
      setConnectionState("offline");
      return undefined;
    }
  }, [accessCode, eventId, eventSlug, isSampleData]);

  function selectTournament(tournamentId: string) {
    setSelectedTournamentId(tournamentId);
    setShowAllFixtures(false);
    setShowAllResults(false);
  }

  return (
    <main className="min-h-screen bg-brand-cream text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              aria-label="Back to tournament"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
              href={`/events/${eventSlug}`}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500">
                {eventName}
              </p>
              <h1 className="truncate text-lg font-semibold text-slate-950 sm:text-xl">
                Match centre
              </h1>
            </div>
          </div>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1.5 text-xs font-medium",
              connectionState === "live"
                ? "text-emerald-700"
                : connectionState === "offline"
                  ? "text-amber-700"
                  : "text-slate-500",
            )}
          >
            {connectionState === "offline" ? (
              <WifiOff className="h-3.5 w-3.5" />
            ) : (
              <Wifi className="h-3.5 w-3.5" />
            )}
            {connectionState === "live"
              ? "Live updates"
              : connectionState === "demo"
                ? "Demo data"
                : connectionState === "offline"
                  ? "Refreshing"
                  : "Connecting"}
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-5 sm:px-6 sm:pt-7">
        {tournaments.length > 1 ? (
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            {tournaments.map((item) => (
              <button
                className={cn(
                  "shrink-0 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  item.id === tournament?.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
                key={item.id}
                onClick={() => selectTournament(item.id)}
                type="button"
              >
                {item.name}
              </button>
            ))}
          </div>
        ) : null}

        {!tournament ? (
          <section className="rounded-lg border border-slate-200 bg-white px-5 py-14 text-center">
            <Trophy className="mx-auto h-9 w-9 text-slate-400" />
            <h2 className="mt-4 text-xl font-semibold">Fixtures coming soon</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              The organisers have not published a football tournament yet. This
              page will refresh automatically.
            </p>
          </section>
        ) : (
          <>
            <section className="mb-6 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  {tournament.format === "league" ? (
                    <Radio className="h-3.5 w-3.5" />
                  ) : (
                    <Trophy className="h-3.5 w-3.5" />
                  )}
                  {tournament.format === "league" ? "League" : "Knockout"}
                </div>
                <h2 className="mt-1 truncate text-2xl font-semibold text-slate-950">
                  {tournament.name}
                </h2>
              </div>
              <span className="shrink-0 text-xs font-medium capitalize text-slate-500">
                {tournament.status}
              </span>
            </section>

            {winner ? (
              <TournamentWinnerBanner
                team={winner}
                tournamentName={tournament.name}
              />
            ) : null}

            <section className="mb-7">
              <h2 className="mb-3 text-base font-semibold text-slate-950">
                {liveMatches.length === 1 ? "Live match" : "Live matches"}
              </h2>
              {liveMatches.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {liveMatches.map((match) => (
                    <LiveMatch
                      clockNow={clockNow}
                      highlighted={highlightedMatchId === match.id}
                      key={match.id}
                      match={match}
                      matchMinutes={matchMinutes}
                      teams={initialTeams}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <CalendarClock className="h-4 w-4 text-slate-400" />
                    No match is live right now
                  </p>
                  {upcomingMatches[0] ? (
                    <p className="mt-1.5 pl-6 text-xs text-slate-500">
                      Next fixture: {formatKickoff(upcomingMatches[0].kickoffAt)}
                    </p>
                  ) : null}
                </div>
              )}
            </section>

            {upcomingMatches.length > 0 ? (
              <section className="mb-7">
                <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-950">
                  <CalendarClock className="h-4 w-4 text-slate-500" />
                  Fixtures
                </h2>
                <MatchList
                  expanded={showAllFixtures}
                  matches={upcomingMatches}
                  onExpand={() => setShowAllFixtures(true)}
                  teams={initialTeams}
                />
              </section>
            ) : null}

            <section className="mb-7">
              {tournament.format === "league" ? (
                <FootballStandings
                  compact
                  teams={initialTeams}
                  tournament={tournament}
                />
              ) : (
                <FootballBracket
                  teams={initialTeams}
                  tournament={tournament}
                />
              )}
            </section>

            {results.length > 0 ? (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-950">
                  <CheckCircle2 className="h-4 w-4 text-slate-500" />
                  Results
                </h2>
                <MatchList
                  expanded={showAllResults}
                  matches={results}
                  onExpand={() => setShowAllResults(true)}
                  teams={initialTeams}
                />
              </section>
            ) : null}
          </>
        )}

        <div className="mt-7">
          <AcceptedTeamsList teams={initialTeams} />
        </div>
      </div>
    </main>
  );
}
