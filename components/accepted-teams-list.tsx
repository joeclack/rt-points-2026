import { TeamBadge } from "@/components/team-badge";
import type { Team } from "@/lib/sample-data";

export function AcceptedTeamsList({ teams }: { teams: Team[] }) {
  const acceptedTeams = [...teams].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">
          Accepted teams
        </h2>
        <span className="text-xs font-medium text-slate-500">
          {acceptedTeams.length} confirmed
        </span>
      </div>

      {acceptedTeams.length ? (
        <div className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2">
          {acceptedTeams.map((team) => {
            const players = [...team.players].sort(
              (a, b) => a.slot - b.slot,
            );

            return (
              <div className="min-w-0 bg-white px-4 py-4" key={team.id}>
                <div className="flex min-w-0 items-center gap-3">
                  <TeamBadge
                    badge={team.badge}
                    badgeUrl={team.badgeUrl}
                    className="h-9 w-9 shrink-0 text-xs"
                    colour={team.colour}
                    name={team.name}
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-900">
                      {team.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {players.length
                        ? `${players.length} member${players.length === 1 ? "" : "s"}`
                        : "Member list unavailable"}
                    </p>
                  </div>
                </div>

                {players.length ? (
                  <ol className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    {players.map((player) => (
                      <li
                        className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 text-sm"
                        key={`${team.id}-${player.slot}`}
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">
                          {player.slot}
                        </span>
                        <span className="min-w-0 break-words text-slate-700">
                          {player.name}
                        </span>
                        {player.slot === 1 ? (
                          <span className="text-xs text-slate-400">
                            Team leader
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
          No teams have been accepted yet.
        </div>
      )}
    </section>
  );
}
