import { AdminGamePointsPageActions } from "@/components/admin-game-points-page-actions";
import { AdminGamePointsControls } from "@/components/admin-game-points-controls";
import { StatusPill } from "@/components/status-pill";
import { requireAdminUser } from "@/lib/auth";
import { getAdminEventById } from "@/lib/events";

export default async function AdminEventGamePointsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const user = await requireAdminUser();
  const { eventId } = await params;
  const { error, message } = await searchParams;
  const event = await getAdminEventById(eventId, user?.id, {
    includeTeams: true,
  });

  return (
    <>
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end">
        <div>
          <StatusPill tone="live">Game Points Admin</StatusPill>
          <h1 className="mt-4 text-3xl font-bold tracking-normal text-slate-950">
            {event.name}
          </h1>
        </div>
        <AdminGamePointsPageActions eventId={event.id} />
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

      <div>
        <AdminGamePointsControls eventId={event.id} initialTeams={event.teams} />
      </div>
    </>
  );
}
