import { GamePointsScoreboard } from "@/components/game-points-scoreboard";
import { getPublicEventBySlug } from "@/lib/events";

export default async function EventGamePointsPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  const event = await getPublicEventBySlug(eventSlug);

  return (
    <main className="display-surface min-h-screen overflow-hidden text-white">
      <GamePointsScoreboard
        eventId={event.id}
        eventName={event.name}
        initialTeams={event.teams}
      />
    </main>
  );
}
