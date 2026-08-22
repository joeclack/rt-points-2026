import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminBasketballMatchCard } from "@/components/admin-basketball-match-card";
import { BasketballAdminRealtimeRefresh } from "@/components/basketball-admin-realtime-refresh";
import { Button } from "@/components/ui/button";
import { requireAdminUser } from "@/lib/auth";
import { getAdminBasketballFocusedMatch } from "@/lib/basketball";

export default async function FocusedBasketballMatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; matchId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const user = await requireAdminUser();
  const { eventId, matchId } = await params;
  const { error, message } = await searchParams;
  const focusedMatch = await getAdminBasketballFocusedMatch(
    eventId,
    matchId,
    user?.id,
  );

  if (!focusedMatch) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <BasketballAdminRealtimeRefresh eventId={focusedMatch.event.id} />
      <header className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            {focusedMatch.tournamentName}
          </p>
          <h1 className="truncate text-xl font-semibold text-slate-950">
            Live game control
          </h1>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/admin/events/${focusedMatch.event.id}/basketball?tournament=${focusedMatch.match.tournamentId}`}>
            <ArrowLeft className="h-4 w-4" />
            All games
          </Link>
        </Button>
      </header>

      {message ? <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      {error ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}

      <AdminBasketballMatchCard
        eventId={focusedMatch.event.id}
        focused
        match={focusedMatch.match}
        teams={focusedMatch.event.teams}
      />
    </div>
  );
}
