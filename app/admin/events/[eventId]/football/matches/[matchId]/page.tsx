import { notFound, redirect } from "next/navigation";

import { FootballAdminRealtimeRefresh } from "@/components/football-admin-realtime-refresh";
import { FootballRefereeConsole } from "@/components/football-referee-console";
import { requireAdminUser } from "@/lib/auth";
import { getAdminEventById } from "@/lib/events";
import { getAdminFootballTournaments } from "@/lib/football";

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
    <div>
      <FootballAdminRealtimeRefresh eventId={event.id} />
      <FootballRefereeConsole
        error={error}
        eventId={event.id}
        match={match}
        matchMinutes={event.footballMatchMinutes}
        message={message}
        returnHref={`/admin/events/${event.id}/football?tournament=${tournament.id}`}
        teams={event.teams}
        tournamentName={tournament.name}
      />
    </div>
  );
}
