import { calculateFootballStandings } from "@/lib/football-types";
import type { FootballTournament } from "@/lib/football-types";
import type { Team } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

export function FootballStandings({
  compact = false,
  teams,
  tournament,
}: {
  compact?: boolean;
  teams: Team[];
  tournament: FootballTournament;
}) {
  const standings = calculateFootballStandings(tournament, teams);
  const hasLiveResults = tournament.matches.some((match) =>
    ["live", "halftime"].includes(match.status),
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="font-bold text-slate-950">League table</h2>
          <p className="text-xs text-slate-500">
            P · W · D · L{compact ? "" : " · GD"} · Pts
          </p>
        </div>
        {hasLiveResults ? (
          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-rose-700">
            Live table
          </span>
        ) : null}
      </div>
      <div className={compact ? "overflow-hidden" : "overflow-x-auto"}>
        <table
          className={cn(
            "w-full text-sm",
            compact ? "table-fixed" : "min-w-[34rem]",
          )}
        >
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th
                className={cn(
                  "py-2 text-center",
                  compact ? "w-7 px-1" : "w-10 px-3",
                )}
              >
                #
              </th>
              <th
                className={cn(
                  "py-2 text-left",
                  compact ? "w-[34%] px-2" : "px-3",
                )}
              >
                Team
              </th>
              <th className={cn("py-2 text-center", compact ? "w-7 px-1" : "px-2")}>
                P
              </th>
              <th className={cn("py-2 text-center", compact ? "w-7 px-1" : "px-2")}>
                W
              </th>
              <th className={cn("py-2 text-center", compact ? "w-7 px-1" : "px-2")}>
                D
              </th>
              <th className={cn("py-2 text-center", compact ? "w-7 px-1" : "px-2")}>
                L
              </th>
              {!compact ? (
                <>
                  <th className="px-2 py-2 text-center">GF</th>
                  <th className="px-2 py-2 text-center">GA</th>
                </>
              ) : null}
              <th
                className={cn(
                  "px-2 py-2 text-center",
                  compact && "hidden sm:table-cell",
                )}
              >
                GD
              </th>
              <th
                className={cn(
                  "py-2 text-center",
                  compact ? "w-10 px-1" : "px-3",
                )}
              >
                Pts
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {standings.map((standing, index) => (
              <tr key={standing.team.id}>
                <td
                  className={cn(
                    "py-3 text-center font-semibold text-slate-500",
                    compact ? "px-1" : "px-3",
                  )}
                >
                  {index + 1}
                </td>
                <td className={cn("py-3", compact ? "px-2" : "px-3")}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: standing.team.colour }}
                    />
                    <span className="truncate font-semibold text-slate-900">
                      {standing.team.name}
                    </span>
                  </div>
                </td>
                <td className={cn("py-3 text-center", compact ? "px-1" : "px-2")}>
                  {standing.played}
                </td>
                <td className={cn("py-3 text-center", compact ? "px-1" : "px-2")}>
                  {standing.won}
                </td>
                <td className={cn("py-3 text-center", compact ? "px-1" : "px-2")}>
                  {standing.drawn}
                </td>
                <td className={cn("py-3 text-center", compact ? "px-1" : "px-2")}>
                  {standing.lost}
                </td>
                {!compact ? (
                  <>
                    <td className="px-2 py-3 text-center">
                      {standing.goalsFor}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {standing.goalsAgainst}
                    </td>
                  </>
                ) : null}
                <td
                  className={cn(
                    "px-2 py-3 text-center",
                    compact && "hidden sm:table-cell",
                  )}
                >
                  {standing.goalDifference > 0 ? "+" : ""}
                  {standing.goalDifference}
                </td>
                <td
                  className={cn(
                    "py-3 text-center text-base font-black text-slate-950",
                    compact ? "px-1" : "px-3",
                  )}
                >
                  {standing.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
