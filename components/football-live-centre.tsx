"use client";

import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  MapPin,
  Radio,
  Trophy,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FootballBracket } from "@/components/football-bracket";
import { FootballStandings } from "@/components/football-standings";
import { TeamBadge } from "@/components/team-badge";
import {
  footballStageLabels,
  isLiveFootballMatch,
  type FootballMatch,
  type FootballTournament,
} from "@/lib/football-types";
import type { Team } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type FootballLiveCentreProps = {
  accessCode: string;
  eventId: string;
  eventName: string;
  eventSlug: string;
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
        endedAt: match.ended_at,
        updatedAt: match.updated_at,
      })),
    }),
  );
}

function formatKickoff(iso: string | null) {
  if (!iso) {
    return "Kickoff TBC";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function PublicTeam({ team }: { team?: Team }) {
  return (
    <div className="flex min-w-0 flex-col items-center px-1">
      {team ? (
        <TeamBadge
          badge={team.badge}
          badgeUrl={team.badgeUrl}
          className="h-16 w-16 text-2xl shadow-xl ring-4 ring-white/10 sm:h-20 sm:w-20"
          colour={team.colour}
          name={team.name}
        />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-slate-400 sm:h-20 sm:w-20">
          TBD
        </span>
      )}
      <p className="mt-3 max-w-full truncate text-center text-lg font-bold text-white sm:text-2xl">
        {team?.name ?? "Winner TBD"}
      </p>
    </div>
  );
}

function LiveMatchHero({
  highlighted,
  match,
  teams,
}: {
  highlighted: boolean;
  match: FootballMatch;
  teams: Team[];
}) {
  const homeTeam = teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === match.awayTeamId);

  return (
    <article
      className={cn(
        "football-pitch relative overflow-hidden rounded-3xl border border-white/10 bg-emerald-950 px-4 py-6 shadow-2xl shadow-cyan-950/30 transition sm:px-8 sm:py-10",
        highlighted && "ring-4 ring-cyan-300/50",
      )}
    >
      <div className="relative z-10 min-h-[15rem] sm:min-h-[18rem]">
        <span className="absolute right-0 top-0 text-xs font-bold uppercase tracking-wider text-emerald-100/80">
          {footballStageLabels[match.stage]}
        </span>

        <div className="absolute inset-x-0 top-1/2 grid -translate-y-1/2 grid-cols-2">
          <PublicTeam team={homeTeam} />
          <PublicTeam team={awayTeam} />
        </div>

        <div
          aria-label={`${match.homeScore} to ${match.awayScore}`}
          className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 sm:gap-2"
        >
            <span className="text-5xl font-black tracking-tighter text-white sm:text-7xl">
              {match.homeScore}
            </span>
            <span className="text-lg font-black text-emerald-200/70 sm:text-2xl">
              –
            </span>
            <span className="text-5xl font-black tracking-tighter text-white sm:text-7xl">
              {match.awayScore}
            </span>
        </div>

        {match.venue ? (
          <p className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-100/70">
            <MapPin className="h-3.5 w-3.5" />
            {match.venue}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function FixtureCard({
  match,
  teams,
}: {
  match: FootballMatch;
  teams: Team[];
}) {
  const homeTeam = teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === match.awayTeamId);
  const isResult = match.status === "full_time";

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-2 text-[0.65rem] font-bold uppercase tracking-wider">
        <span className="text-cyan-200">
          {footballStageLabels[match.stage]}
          {match.stage === "league" ? ` · R${match.roundNumber}` : ""}
        </span>
        <span className="text-slate-400">
          {isResult ? "Full-time" : formatKickoff(match.kickoffAt)}
        </span>
      </div>
      <div className="space-y-2">
        {[
          { team: homeTeam, score: match.homeScore },
          { team: awayTeam, score: match.awayScore },
        ].map(({ team, score }, index) => (
          <div className="flex items-center gap-3" key={`${match.id}-${index}`}>
            {team ? (
              <TeamBadge
                badge={team.badge}
                badgeUrl={team.badgeUrl}
                className="h-8 w-8 shrink-0 text-xs"
                colour={team.colour}
                name={team.name}
              />
            ) : (
              <span className="h-8 w-8 rounded-md bg-white/10" />
            )}
            <span className="min-w-0 flex-1 truncate font-semibold text-white">
              {team?.name ?? "Winner TBD"}
            </span>
            <span className="text-xl font-black text-white">
              {isResult ? score : "–"}
            </span>
          </div>
        ))}
      </div>
      {match.venue ? (
        <p className="mt-3 flex items-center gap-1 text-xs text-slate-400">
          <MapPin className="h-3 w-3" />
          {match.venue}
        </p>
      ) : null}
    </article>
  );
}

export function FootballLiveCentre({
  accessCode,
  eventId,
  eventName,
  eventSlug,
  initialTeams,
  initialTournaments,
}: FootballLiveCentreProps) {
  const [tournaments, setTournaments] = useState(initialTournaments);
  const [selectedTournamentId, setSelectedTournamentId] = useState(
    initialTournaments[0]?.id ?? "",
  );
  const isSampleData = eventId.startsWith("evt_");
  const [connectionState, setConnectionState] = useState<
    "connecting" | "live" | "offline" | "demo"
  >(isSampleData ? "demo" : "connecting");
  const [highlightedMatchId, setHighlightedMatchId] = useState<string | null>(
    null,
  );

  const tournament =
    tournaments.find((item) => item.id === selectedTournamentId) ??
    tournaments[0];
  const liveMatches = useMemo(
    () =>
      tournament?.matches
        .filter((match) => isLiveFootballMatch(match.status))
        .sort((a, b) => a.position - b.position) ?? [],
    [tournament],
  );
  const upcomingMatches = useMemo(
    () =>
      tournament?.matches
        .filter((match) => match.status === "scheduled")
        .sort(
          (a, b) =>
            (a.kickoffAt ? new Date(a.kickoffAt).getTime() : Infinity) -
              (b.kickoffAt ? new Date(b.kickoffAt).getTime() : Infinity) ||
            a.roundNumber - b.roundNumber ||
            a.position - b.position,
        ) ?? [],
    [tournament],
  );
  const results = useMemo(
    () =>
      tournament?.matches
        .filter((match) => match.status === "full_time")
        .sort(
          (a, b) =>
            new Date(b.endedAt ?? 0).getTime() -
            new Date(a.endedAt ?? 0).getTime(),
        ) ?? [],
    [tournament],
  );

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

  return (
    <main className="football-display min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              aria-label="Back to event"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-slate-300 transition hover:bg-white/10 hover:text-white"
              href={`/events/${eventSlug}`}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">
                {eventName}
              </p>
              <h1 className="truncate text-xl font-black sm:text-2xl">
                Football match centre
              </h1>
            </div>
          </div>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider",
              connectionState === "live"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : connectionState === "demo"
                  ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                : connectionState === "offline"
                  ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                  : "border-white/10 bg-white/5 text-slate-400",
            )}
          >
            {connectionState === "offline" ? (
              <WifiOff className="h-3 w-3" />
            ) : (
              <Wifi className="h-3 w-3" />
            )}
            {connectionState === "live"
              ? "Live"
              : connectionState === "demo"
                ? "Demo"
              : connectionState === "offline"
                ? "Refreshing"
                : "Connecting"}
          </span>
        </header>

        {tournaments.length > 1 ? (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            {tournaments.map((item) => (
              <button
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition",
                  item.id === tournament?.id
                    ? "border-cyan-300 bg-cyan-300 text-slate-950"
                    : "border-white/10 bg-white/[0.06] text-slate-300",
                )}
                key={item.id}
                onClick={() => setSelectedTournamentId(item.id)}
                type="button"
              >
                {item.name}
              </button>
            ))}
          </div>
        ) : null}

        {!tournament ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.05] px-5 py-16 text-center">
            <Trophy className="mx-auto h-12 w-12 text-cyan-300" />
            <h2 className="mt-5 text-2xl font-black">Fixtures coming soon</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
              The event organisers have not published a football tournament
              yet. Keep this page open and it will refresh automatically.
            </p>
          </section>
        ) : (
          <>
            <section className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
                  {tournament.format === "league" ? (
                    <Radio className="h-3.5 w-3.5" />
                  ) : (
                    <Trophy className="h-3.5 w-3.5" />
                  )}
                  {tournament.format === "league"
                    ? "League table"
                    : "Knockout cup"}
                </div>
                <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                  {tournament.name}
                </h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                {tournament.status}
              </span>
            </section>

            {liveMatches.length > 0 ? (
              <section className="mb-8 space-y-4">
                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-rose-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
                  Live now
                </h2>
                <div className="grid gap-4">
                  {liveMatches.map((match) => (
                    <LiveMatchHero
                      highlighted={highlightedMatchId === match.id}
                      key={match.id}
                      match={match}
                      teams={initialTeams}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <CalendarClock className="h-4 w-4 text-cyan-300" />
                  No match is live right now
                </p>
                {upcomingMatches[0] ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Next: {formatKickoff(upcomingMatches[0].kickoffAt)}
                  </p>
                ) : null}
              </section>
            )}

            <section className="mb-8">
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

            {upcomingMatches.length > 0 ? (
              <section className="mb-8">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-cyan-200">
                  <CalendarClock className="h-4 w-4" />
                  Fixtures
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {upcomingMatches.map((match) => (
                    <FixtureCard
                      key={match.id}
                      match={match}
                      teams={initialTeams}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {results.length > 0 ? (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                  Results
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {results.map((match) => (
                    <FixtureCard
                      key={match.id}
                      match={match}
                      teams={initialTeams}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
