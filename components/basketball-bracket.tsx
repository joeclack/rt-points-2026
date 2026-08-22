import { ChevronRight } from "lucide-react";

import { TeamBadge } from "@/components/team-badge";
import {
  basketballStageLabels,
  type BasketballMatch,
  type BasketballTournament,
} from "@/lib/basketball-types";
import type { Team } from "@/lib/sample-data";

const basketballStatusLabels: Record<BasketballMatch["status"], string> = {
  cancelled: "Cancelled",
  full_time: "Final",
  live: "Live",
  postponed: "Postponed",
  scheduled: "Scheduled",
};

function BracketTeam({
  score,
  team,
  winner,
}: {
  score: number;
  team: Team;
  winner: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 ${
        winner ? "bg-emerald-50" : "bg-white"
      }`}
    >
      <TeamBadge
        badge={team.badge}
        badgeUrl={team.badgeUrl}
        className="h-7 w-7 shrink-0 text-xs"
        colour={team.colour}
        name={team.name}
      />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
        {team.name}
      </span>
      <span className="text-base font-black text-slate-950">{score}</span>
    </div>
  );
}

function BracketMatchCard({
  match,
  teams,
}: {
  match: BasketballMatch;
  teams: Team[];
}) {
  const homeTeam = teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === match.awayTeamId);

  if (!homeTeam || !awayTeam) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[0.65rem] font-semibold uppercase text-slate-600">
        <span>Game {match.position}</span>
        <span
          className={match.status === "live" ? "text-red-600" : "text-slate-500"}
        >
          {basketballStatusLabels[match.status]}
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        <BracketTeam
          score={match.homeScore}
          team={homeTeam}
          winner={match.winnerTeamId === homeTeam.id}
        />
        <BracketTeam
          score={match.awayScore}
          team={awayTeam}
          winner={match.winnerTeamId === awayTeam.id}
        />
      </div>
    </div>
  );
}

export function BasketballBracket({
  teams,
  tournament,
}: {
  teams: Team[];
  tournament: BasketballTournament;
}) {
  const allocatedMatches = tournament.matches.filter(
    (match) =>
      match.homeTeamId &&
      match.awayTeamId &&
      teams.some((team) => team.id === match.homeTeamId) &&
      teams.some((team) => team.id === match.awayTeamId),
  );
  const rounds = [...new Set(allocatedMatches.map((match) => match.roundNumber))]
    .sort((a, b) => a - b)
    .map((roundNumber) => ({
      roundNumber,
      matches: allocatedMatches
        .filter((match) => match.roundNumber === roundNumber)
        .sort((a, b) => a.position - b.position),
    }));

  if (rounds.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex min-w-max items-stretch gap-3">
        {rounds.map((round, index) => (
          <div className="flex items-stretch gap-3" key={round.roundNumber}>
            <section className="flex w-64 flex-col">
              <h3 className="mb-3 text-xs font-semibold uppercase text-slate-500">
                {basketballStageLabels[round.matches[0]?.stage ?? "friendly"]}
              </h3>
              <div className="flex flex-1 flex-col justify-around gap-4">
                {round.matches.map((match) => (
                  <BracketMatchCard
                    key={match.id}
                    match={match}
                    teams={teams}
                  />
                ))}
              </div>
            </section>
            {index < rounds.length - 1 ? (
              <div className="flex items-center text-slate-300">
                <ChevronRight className="h-6 w-6" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
