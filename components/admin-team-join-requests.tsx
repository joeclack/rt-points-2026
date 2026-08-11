import { Check, Clock3, UserRound, UsersRound, X } from "lucide-react";

import {
  acceptTeamJoinRequest,
  rejectTeamJoinRequest,
} from "@/app/admin/events/[eventId]/join-requests/actions";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import type { TeamJoinRequest } from "@/lib/team-join-requests";

export function AdminTeamJoinRequests({
  eventId,
  requests,
}: {
  eventId: string;
  requests: TeamJoinRequest[];
}) {
  return (
    <section className="mb-6" id="requests">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
            <UsersRound className="h-5 w-5" />
            Team requests
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Review squads submitted through the public tournament page.
          </p>
        </div>
        <StatusPill tone={requests.length > 0 ? "planned" : "neutral"}>
          {requests.length} pending
        </StatusPill>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
          <p className="font-semibold text-slate-950">No pending requests</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
          {requests.map((request) => (
            <article className="p-4 sm:p-5" key={request.id}>
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      aria-label={`Team colour ${request.teamColour}`}
                      className="h-5 w-5 shrink-0 rounded border border-black/10"
                      style={{ backgroundColor: request.teamColour }}
                    />
                    <h3 className="text-lg font-bold text-slate-950">
                      {request.teamName}
                    </h3>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(request.createdAt))}
                    </span>
                  </div>

                  <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {request.players.map((player) => (
                      <li
                        className="flex min-w-0 items-center gap-2 rounded bg-slate-50 px-3 py-2 text-sm"
                        key={player.slot}
                      >
                        <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate font-medium text-slate-800">
                          {player.name}
                        </span>
                        {player.slot === 1 ? (
                          <span className="ml-auto shrink-0 text-xs font-medium text-cyan-700">
                            Leader
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="grid shrink-0 grid-cols-2 gap-2 lg:w-44 lg:grid-cols-1">
                  <form action={acceptTeamJoinRequest}>
                    <input name="event_id" type="hidden" value={eventId} />
                    <input name="request_id" type="hidden" value={request.id} />
                    <Button className="w-full" type="submit">
                      <Check className="h-4 w-4" />
                      Accept
                    </Button>
                  </form>
                  <form action={rejectTeamJoinRequest}>
                    <input name="event_id" type="hidden" value={eventId} />
                    <input name="request_id" type="hidden" value={request.id} />
                    <Button className="w-full" type="submit" variant="outline">
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
