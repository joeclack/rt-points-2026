import { ChevronRight, Clock3, MapPin } from "lucide-react";

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

function formatTipoff(tipoffAt: string | null) {
  if (!tipoffAt) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(tipoffAt));
}

function sourceLabel(
  match: BasketballMatch,
  side: "home" | "away",
  tournament: BasketballTournament,
) {
  const source = tournament.matches.find(
    (candidate) =>
      candidate.nextMatchId === match.id && candidate.nextMatchSlot === side,
  );

  return source
    ? `Winner of ${basketballStageLabels[source.stage]} ${source.position}`
    : "To be confirmed";
}

function BracketTeam({
  score,
  team,
  label,
  winner,
}: {
  score: number;
  team: Team | undefined;
  label: string;
  winner: boolean;
}) {
  return (
    <div
      className={`flex min-h-12 items-center gap-2 px-3 py-2 ${
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
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-[0.6rem] font-bold text-slate-400">
          ?
        </span>
      )}
      <span
        className={`min-w-0 flex-1 break-words text-sm font-semibold leading-tight ${
          team ? "text-slate-800" : "text-slate-500"
        }`}
      >
        {team?.name ?? label}
      </span>
      <span className="text-base font-black text-slate-950">
        {team ? score : "-"}
      </span>
    </div>
  );
}

function BracketMatchCard({
  match,
  teams,
  tournament,
}: {
  match: BasketballMatch;
  teams: Team[];
  tournament: BasketballTournament;
}) {
  const homeTeam = teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === match.awayTeamId);
  const tipoff = formatTipoff(match.tipoffAt);

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
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
          label={sourceLabel(match, "home", tournament)}
          score={match.homeScore}
          team={homeTeam}
          winner={match.winnerTeamId === homeTeam?.id}
        />
        <BracketTeam
          label={sourceLabel(match, "away", tournament)}
          score={match.awayScore}
          team={awayTeam}
          winner={match.winnerTeamId === awayTeam?.id}
        />
      </div>
      {tipoff || match.court ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 px-3 py-2 text-[0.68rem] font-medium text-slate-500">
          {tipoff ? (
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3 w-3" />
              {tipoff}
            </span>
          ) : null}
          {match.court ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {match.court}
            </span>
          ) : null}
        </div>
      ) : null}
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
  const knockoutMatches = tournament.matches.filter(
    (match) => match.stage !== "league",
  );
  const rounds = [...new Set(knockoutMatches.map((match) => match.roundNumber))]
    .sort((a, b) => a - b)
    .map((roundNumber) => ({
      roundNumber,
      matches: knockoutMatches
        .filter((match) => match.roundNumber === roundNumber)
        .sort((a, b) => a.position - b.position),
    }));

  if (rounds.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            Tournament timeline
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            All rounds stay visible. Winners move forward as soon as results are confirmed.
          </p>
        </div>
        <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400 sm:pb-0.5">
          Swipe across
        </span>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-stretch gap-3">
          {rounds.map((round, index) => (
            <div className="flex items-stretch gap-3" key={round.roundNumber}>
            <section className="flex w-[min(18rem,calc(100vw-3rem))] shrink-0 flex-col sm:w-72">
                <h3 className="mb-3 text-xs font-semibold uppercase text-slate-500">
                  {round.matches.length > 0
                    ? basketballStageLabels[round.matches[0].stage]
                    : `Round ${round.roundNumber}`}
                </h3>
                <div className="flex flex-1 flex-col justify-around gap-4">
                  {round.matches.map((match) => (
                    <BracketMatchCard
                      key={match.id}
                      match={match}
                      teams={teams}
                      tournament={tournament}
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
    </section>
  );
}
