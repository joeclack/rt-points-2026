import { Trophy } from "lucide-react";

import { TeamBadge } from "@/components/team-badge";
import type { Team } from "@/lib/sample-data";

export function TournamentWinnerBanner({
  team,
  tournamentName,
}: {
  team: Team;
  tournamentName: string;
}) {
  return (
    <section className="mb-7 border-y border-amber-200 bg-amber-50 px-4 py-4 sm:px-5">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center text-amber-700">
          <Trophy className="h-7 w-7" />
        </div>
        <TeamBadge
          badge={team.badge}
          badgeUrl={team.badgeUrl}
          className="h-11 w-11 shrink-0"
          colour={team.colour}
          name={team.name}
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-amber-800">
            Tournament winner
          </p>
          <h2 className="truncate text-lg font-semibold text-slate-950">
            {team.name}
          </h2>
          <p className="truncate text-xs text-slate-500">{tournamentName}</p>
        </div>
      </div>
    </section>
  );
}
