import { calculateBasketballStandings, type BasketballTournament } from "@/lib/basketball-types";
import type { Team } from "@/lib/sample-data";

export function BasketballStandings({ tournament, teams }: { tournament: BasketballTournament; teams: Team[] }) {
  const rows = calculateBasketballStandings(tournament, teams);
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3"><h2 className="font-semibold">Standings</h2><p className="text-xs text-slate-500">Wins, losses and points difference</p></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2 text-left">Team</th><th>W</th><th>L</th><th>PF</th><th>PA</th><th>Diff</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.team.id}><td className="px-3 py-3 font-medium">{row.team.name}</td><td className="text-center">{row.won}</td><td className="text-center">{row.lost}</td><td className="text-center">{row.pointsFor}</td><td className="text-center">{row.pointsAgainst}</td><td className="text-center font-semibold">{row.difference > 0 ? "+" : ""}{row.difference}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
