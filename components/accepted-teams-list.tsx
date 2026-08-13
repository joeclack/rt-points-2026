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
          {acceptedTeams.map((team) => (
            <div
              className="flex min-w-0 items-center gap-3 bg-white px-4 py-3"
              key={team.id}
            >
              <TeamBadge
                badge={team.badge}
                badgeUrl={team.badgeUrl}
                className="h-9 w-9 shrink-0 text-xs"
                colour={team.colour}
                name={team.name}
              />
              <span className="truncate text-sm font-medium text-slate-800">
                {team.name}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
          No teams have been accepted yet.
        </div>
      )}
    </section>
  );
}
