import { calculateFootballStandings } from "@/lib/football-types";
import type { FootballTournament } from "@/lib/football-types";
import type { Team } from "@/lib/sample-data";

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
            P · W · D · L · GD · Pts
          </p>
        </div>
        {hasLiveResults ? (
          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-rose-700">
            Live table
          </span>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="w-10 px-3 py-2 text-center">#</th>
              <th className="px-3 py-2 text-left">Team</th>
              <th className="px-2 py-2 text-center">P</th>
              <th className="px-2 py-2 text-center">W</th>
              <th className="px-2 py-2 text-center">D</th>
              <th className="px-2 py-2 text-center">L</th>
              {!compact ? (
                <>
                  <th className="px-2 py-2 text-center">GF</th>
                  <th className="px-2 py-2 text-center">GA</th>
                </>
              ) : null}
              <th className="px-2 py-2 text-center">GD</th>
              <th className="px-3 py-2 text-center">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {standings.map((standing, index) => (
              <tr key={standing.team.id}>
                <td className="px-3 py-3 text-center font-semibold text-slate-500">
                  {index + 1}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: standing.team.colour }}
                    />
                    <span className="font-semibold text-slate-900">
                      {standing.team.name}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-3 text-center">{standing.played}</td>
                <td className="px-2 py-3 text-center">{standing.won}</td>
                <td className="px-2 py-3 text-center">{standing.drawn}</td>
                <td className="px-2 py-3 text-center">{standing.lost}</td>
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
                <td className="px-2 py-3 text-center">
                  {standing.goalDifference > 0 ? "+" : ""}
                  {standing.goalDifference}
                </td>
                <td className="px-3 py-3 text-center text-base font-black text-slate-950">
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

