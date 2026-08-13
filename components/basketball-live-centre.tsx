"use client";

import { ArrowLeft, ChevronDown, MapPin, Wifi } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AcceptedTeamsList } from "@/components/accepted-teams-list";
import { BasketballStandings } from "@/components/basketball-standings";
import { TeamBadge } from "@/components/team-badge";
import { TournamentWinnerBanner } from "@/components/tournament-winner-banner";
import {
  basketballStageLabels,
  getBasketballTournamentWinner,
  type BasketballMatch,
  type BasketballTournament,
} from "@/lib/basketball-types";
import type { Team } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/client";

type Props = {
  accessCode: string;
  eventId: string;
  eventName: string;
  eventSlug: string;
  initialTeams: Team[];
  initialTournaments: BasketballTournament[];
};

type PublicBasketballPayload = {
  tournaments: Array<{
    id: string;
    event_id: string;
    name: string;
    format: BasketballTournament["format"];
    start_stage: BasketballTournament["startStage"];
    status: BasketballTournament["status"];
    game_minutes: number;
    team_ids: string[];
    matches: Array<{
      id: string;
      tournament_id: string;
      event_id: string;
      home_team_id: string | null;
      away_team_id: string | null;
      stage: BasketballMatch["stage"];
      round_number: number;
      position: number;
      tipoff_at: string | null;
      court: string | null;
      status: BasketballMatch["status"];
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

function mapPayload(payload: PublicBasketballPayload) {
  return payload.tournaments.map(
    (tournament): BasketballTournament => ({
      id: tournament.id,
      eventId: tournament.event_id,
      name: tournament.name,
      format: tournament.format,
      startStage: tournament.start_stage,
      status: tournament.status,
      gameMinutes: tournament.game_minutes,
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
        tipoffAt: match.tipoff_at,
        court: match.court,
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

function isAllocated(match: BasketballMatch, teams: Team[]) {
  return Boolean(
    teams.some((team) => team.id === match.homeTeamId) &&
      teams.some((team) => team.id === match.awayTeamId),
  );
}

function formatTipoff(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
      }).format(new Date(value))
    : "TBC";
}

function gameClock(startedAt: string | null, gameMinutes: number, now: number) {
  const elapsed = startedAt
    ? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
    : 0;
  const remaining = Math.max(0, gameMinutes * 60 - elapsed);

  return `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
}

function GameRow({ match, teams }: { match: BasketballMatch; teams: Team[] }) {
  const home = teams.find((team) => team.id === match.homeTeamId);
  const away = teams.find((team) => team.id === match.awayTeamId);
  const final = match.status === "full_time";

  if (!home || !away) return null;

  return (
    <article className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 px-4 py-3 sm:grid-cols-[6rem_minmax(0,1fr)]">
      <div className="text-xs text-slate-500">
        <p className="font-medium text-slate-700">
          {final ? "FINAL" : formatTipoff(match.tipoffAt)}
        </p>
        <p className="mt-1">{basketballStageLabels[match.stage]}</p>
      </div>
      <div className="min-w-0 space-y-2">
        {[
          { score: match.homeScore, team: home },
          { score: match.awayScore, team: away },
        ].map(({ score, team }) => (
          <div className="flex min-w-0 items-center gap-2" key={team.id}>
            <TeamBadge
              badge={team.badge}
              badgeUrl={team.badgeUrl}
              className="h-6 w-6 shrink-0 text-[0.6rem]"
              colour={team.colour}
              name={team.name}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {team.name}
            </span>
            {final ? <strong>{score}</strong> : null}
          </div>
        ))}
      </div>
    </article>
  );
}

function LiveGame({
  gameMinutes,
  match,
  now,
  teams,
}: {
  gameMinutes: number;
  match: BasketballMatch;
  now: number;
  teams: Team[];
}) {
  const home = teams.find((team) => team.id === match.homeTeamId);
  const away = teams.find((team) => team.id === match.awayTeamId);

  if (!home || !away) return null;

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs">
        <span>{basketballStageLabels[match.stage]}</span>
        <span className="font-semibold text-orange-700">LIVE</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-7 sm:gap-4 sm:px-4 sm:py-8">
        {[home, away].map((team, index) => (
          <div
            className={
              index
                ? "col-start-3 row-start-1 min-w-0 text-center"
                : "min-w-0 text-center"
            }
            key={team.id}
          >
            <TeamBadge
              badge={team.badge}
              badgeUrl={team.badgeUrl}
              className="mx-auto h-12 w-12 sm:h-14 sm:w-14"
              colour={team.colour}
              name={team.name}
            />
            <p className="mt-2 truncate text-sm font-medium sm:text-base">
              {team.name}
            </p>
          </div>
        ))}
        <div className="col-start-2 row-start-1 text-center">
          <p className="text-sm font-semibold tabular-nums text-orange-700">
            {gameClock(match.startedAt, gameMinutes, now)}
          </p>
          <p className="mt-1 whitespace-nowrap text-3xl font-bold tabular-nums sm:text-4xl">
            {match.homeScore}
            <span className="mx-1.5 text-slate-300 sm:mx-2">-</span>
            {match.awayScore}
          </p>
        </div>
      </div>
      {match.court ? (
        <p className="flex items-center justify-center gap-1 border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          <MapPin className="h-3 w-3" />
          {match.court}
        </p>
      ) : null}
    </article>
  );
}

export function BasketballLiveCentre({
  accessCode,
  eventId,
  eventName,
  eventSlug,
  initialTeams,
  initialTournaments,
}: Props) {
  const [tournaments, setTournaments] = useState(initialTournaments);
  const [showAll, setShowAll] = useState(false);
  const [now, setNow] = useState(0);
  const tournament = tournaments[0];
  const winner = tournament
    ? getBasketballTournamentWinner(tournament, initialTeams)
    : null;
  const liveGames = useMemo(
    () =>
      tournament?.matches.filter(
        (match) => match.status === "live" && isAllocated(match, initialTeams),
      ) ?? [],
    [initialTeams, tournament],
  );
  const upcoming = useMemo(
    () =>
      tournament?.matches.filter(
        (match) =>
          match.status === "scheduled" && isAllocated(match, initialTeams),
      ) ?? [],
    [initialTeams, tournament],
  );
  const results = useMemo(
    () =>
      tournament?.matches
        .filter(
          (match) =>
            match.status === "full_time" && isAllocated(match, initialTeams),
        )
        .reverse() ?? [],
    [initialTeams, tournament],
  );

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function refresh() {
      const { data } = await supabase.rpc("get_public_basketball_for_viewer", {
        event_slug: eventSlug,
        submitted_code: accessCode,
      });

      if (active && data) {
        setTournaments(
          mapPayload(data as unknown as PublicBasketballPayload),
        );
      }
    }

    const channel = supabase
      .channel(`basketball:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "basketball_matches",
          filter: `event_id=eq.${eventId}`,
        },
        () => void refresh(),
      )
      .subscribe();
    const interval = window.setInterval(() => void refresh(), 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [accessCode, eventId, eventSlug]);

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link aria-label="Back" href={`/events/${eventSlug}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-500">{eventName}</p>
              <h1 className="truncate text-lg font-semibold">
                Basketball centre
              </h1>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-700">
            <Wifi className="h-3 w-3" />
            Live updates
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-7 px-4 py-6">
        {tournament ? (
          <>
            <section>
              <h2 className="text-2xl font-semibold">{tournament.name}</h2>
              <p className="text-sm text-slate-500">
                {tournament.gameMinutes}-minute games
              </p>
            </section>

            {winner ? (
              <TournamentWinnerBanner
                team={winner}
                tournamentName={tournament.name}
              />
            ) : null}

            <section>
              <h2 className="mb-3 text-base font-semibold">
                {liveGames.length === 1 ? "Live game" : "Live games"}
              </h2>
              {liveGames.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {liveGames.map((match) => (
                    <LiveGame
                      gameMinutes={tournament.gameMinutes}
                      key={match.id}
                      match={match}
                      now={now}
                      teams={initialTeams}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                  No game is live right now.
                </div>
              )}
            </section>

            {upcoming.length ? (
              <section>
                <h2 className="mb-3 text-base font-semibold">Upcoming games</h2>
                <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {upcoming
                    .slice(0, showAll ? undefined : 4)
                    .map((match) => (
                      <GameRow key={match.id} match={match} teams={initialTeams} />
                    ))}
                  {!showAll && upcoming.length > 4 ? (
                    <button
                      className="flex w-full items-center justify-center gap-2 border-t border-slate-200 px-4 py-3 text-sm"
                      onClick={() => setShowAll(true)}
                      type="button"
                    >
                      Show {upcoming.length - 4} more
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}

            {tournament.format === "league" ? (
              <BasketballStandings
                teams={initialTeams}
                tournament={tournament}
              />
            ) : null}

            {results.length ? (
              <section>
                <h2 className="mb-3 text-base font-semibold">Results</h2>
                <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {results.map((match) => (
                    <GameRow key={match.id} match={match} teams={initialTeams} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white px-5 py-12 text-center">
            Games coming soon.
          </div>
        )}

        <AcceptedTeamsList teams={initialTeams} />
      </div>
    </main>
  );
}
