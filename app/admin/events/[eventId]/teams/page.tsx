import { AdminTeamJoinRequests } from "@/components/admin-team-join-requests";
import { AdminTeamControls } from "@/components/admin-team-controls";
import { TeamRequestsRealtimeRefresh } from "@/components/team-requests-realtime-refresh";
import { requireAdminUser } from "@/lib/auth";
import { getAdminEventById } from "@/lib/events";
import { getPendingTeamJoinRequests } from "@/lib/team-join-requests";

export const dynamic = "force-dynamic";

export default async function AdminEventTeamsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const user = await requireAdminUser();
  const { eventId } = await params;
  const { error, message } = await searchParams;
  const [event, requests] = await Promise.all([
    getAdminEventById(eventId, user?.id),
    getPendingTeamJoinRequests(eventId),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <TeamRequestsRealtimeRefresh eventId={event.id} />
      <header className="mb-6 border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-semibold text-slate-950">Teams</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review submissions and manage approved teams.
        </p>
      </header>

      {message ? (
        <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <AdminTeamJoinRequests eventId={event.id} requests={requests} />
      <AdminTeamControls
        eventId={event.id}
        teams={event.teams}
        teamSize={event.teamSize}
      />
    </div>
  );
}
