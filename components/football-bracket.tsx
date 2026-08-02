import { ChevronRight } from "lucide-react";

import { TeamBadge } from "@/components/team-badge";
import {
  footballStageLabels,
  footballStatusLabels,
  type FootballMatch,
  type FootballTournament,
} from "@/lib/football-types";
import type { Team } from "@/lib/sample-data";

function BracketTeam({
  score,
  team,
  winner,
}: {
  score: number;
  team?: Team;
  winner: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 ${
        winner ? "bg-emerald-50" : "bg-white"
      }`}
    >
      {team ? (
        <TeamBadge
          badge={team.badge}
          badgeUrl={team.badgeUrl}
          className="h-7 w-7 shrink-0 text-xs"
          colour={team.colour}
          name={team.name}
        />
      ) : (
        <span className="h-7 w-7 shrink-0 rounded-md bg-slate-100" />
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
        {team?.name ?? "Winner TBD"}
      </span>
      <span className="text-base font-black text-slate-950">{score}</span>
    </div>
  );
}

function BracketMatchCard({
  match,
  teams,
}: {
  match: FootballMatch;
  teams: Team[];
}) {
  const homeTeam = teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === match.awayTeamId);

  return (
    <div className="overflow-hidden rounded-lg border border-white/20 bg-white shadow-lg shadow-slate-950/10">
      <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-white">
        <span>Match {match.position}</span>
        <span
          className={
            ["live", "halftime"].includes(match.status)
              ? "text-rose-300"
              : "text-slate-300"
          }
        >
          {footballStatusLabels[match.status]}
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        <BracketTeam
          score={match.homeScore}
          team={homeTeam}
          winner={match.winnerTeamId === homeTeam?.id}
        />
        <BracketTeam
          score={match.awayScore}
          team={awayTeam}
          winner={match.winnerTeamId === awayTeam?.id}
        />
      </div>
    </div>
  );
}

export function FootballBracket({
  teams,
  tournament,
}: {
  teams: Team[];
  tournament: FootballTournament;
}) {
  const rounds = [...new Set(tournament.matches.map((match) => match.roundNumber))]
    .sort((a, b) => a - b)
    .map((roundNumber) => ({
      roundNumber,
      matches: tournament.matches
        .filter((match) => match.roundNumber === roundNumber)
        .sort((a, b) => a.position - b.position),
    }));

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 sm:p-6">
      <div className="flex min-w-max items-stretch gap-3">
        {rounds.map((round, index) => (
          <div className="flex items-stretch gap-3" key={round.roundNumber}>
            <section className="flex w-64 flex-col">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
                {footballStageLabels[round.matches[0]?.stage ?? "friendly"]}
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
              <div className="flex items-center text-cyan-400/60">
                <ChevronRight className="h-6 w-6" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

