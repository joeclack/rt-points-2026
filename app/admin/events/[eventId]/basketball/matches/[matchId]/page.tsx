import { notFound } from "next/navigation";

import { BasketballAdminRealtimeRefresh } from "@/components/basketball-admin-realtime-refresh";
import { BasketballRefereeConsole } from "@/components/basketball-referee-console";
import { requireAdminUser } from "@/lib/auth";
import { getAdminBasketballFocusedMatch } from "@/lib/basketball";

export const metadata = {
  robots: { follow: false, index: false },
  title: "Referee mode",
};

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
    <div>
      <BasketballAdminRealtimeRefresh eventId={focusedMatch.event.id} />
      <BasketballRefereeConsole
        error={error}
        eventId={focusedMatch.event.id}
        gameMinutes={focusedMatch.gameMinutes}
        match={focusedMatch.match}
        message={message}
        returnHref={`/admin/events/${focusedMatch.event.id}/basketball?tournament=${focusedMatch.match.tournamentId}`}
        teams={focusedMatch.event.teams}
        tournamentName={focusedMatch.tournamentName}
      />
    </div>
  );
}
