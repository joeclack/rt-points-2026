import { notFound } from "next/navigation";

import { FootballAdminRealtimeRefresh } from "@/components/football-admin-realtime-refresh";
import { FootballRefereeConsole } from "@/components/football-referee-console";
import { requireAdminUser } from "@/lib/auth";
import { getAdminFootballFocusedMatch } from "@/lib/football";

export const metadata = {
  robots: { follow: false, index: false },
  title: "Referee mode",
};

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
  const focusedMatch = await getAdminFootballFocusedMatch(
    eventId,
    matchId,
    user?.id,
  );

  if (!focusedMatch) {
    notFound();
  }

  return (
    <div>
      <FootballAdminRealtimeRefresh eventId={focusedMatch.event.id} />
      <FootballRefereeConsole
        error={error}
        eventId={focusedMatch.event.id}
        match={focusedMatch.match}
        matchMinutes={focusedMatch.event.footballMatchMinutes}
        message={message}
        returnHref={`/admin/events/${focusedMatch.event.id}/football?tournament=${focusedMatch.match.tournamentId}`}
        teams={focusedMatch.event.teams}
        tournamentName={focusedMatch.tournamentName}
      />
    </div>
  );
}
