import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminFootballMatchCard } from "@/components/admin-football-match-card";
import { FootballAdminRealtimeRefresh } from "@/components/football-admin-realtime-refresh";
import { Button } from "@/components/ui/button";
import { requireAdminUser } from "@/lib/auth";
import { getAdminEventById } from "@/lib/events";
import { getAdminFootballTournaments } from "@/lib/football";

export default async function FocusedFootballMatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; matchId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const user = await requireAdminUser();
  const { eventId, matchId } = await params;
  const { error, message } = await searchParams;
  const [event, tournaments] = await Promise.all([
    getAdminEventById(eventId, user?.id),
    getAdminFootballTournaments(eventId),
  ]);

  if (event.sport !== "football") {
    redirect(`/admin/events/${eventId}/basketball`);
  }

  const tournament = tournaments.find((item) =>
    item.matches.some((match) => match.id === matchId),
  );
  const match = tournament?.matches.find((item) => item.id === matchId);

  if (!tournament || !match) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <FootballAdminRealtimeRefresh eventId={event.id} />
      <header className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{tournament.name}</p>
          <h1 className="truncate text-xl font-semibold text-slate-950">
            Live match control
          </h1>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/admin/events/${event.id}/football?tournament=${tournament.id}`}>
            <ArrowLeft className="h-4 w-4" />
            All matches
          </Link>
        </Button>
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

      <AdminFootballMatchCard
        eventId={event.id}
        focused
        match={match}
        matchMinutes={event.footballMatchMinutes}
        teams={event.teams}
      />
    </div>
  );
}
