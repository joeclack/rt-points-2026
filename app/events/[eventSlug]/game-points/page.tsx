import { EventAccessCodeForm } from "@/components/event-access-code-form";
import { GamePointsScoreboard } from "@/components/game-points-scoreboard";
import {
  eventRequiresViewerAccess,
  getPublicEventBySlug,
  getPublicEventShellBySlug,
  verifyViewerAccess,
} from "@/lib/events";
import { getViewerAccessCode } from "@/lib/viewer-access";

export default async function EventGamePointsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventSlug } = await params;
  const { error } = await searchParams;
  const shellEvent = await getPublicEventShellBySlug(eventSlug);
  const requiresAccess = await eventRequiresViewerAccess(eventSlug);
  const savedAccessCode = await getViewerAccessCode(eventSlug);
  const hasAccess =
    !requiresAccess ||
    (savedAccessCode
      ? await verifyViewerAccess(eventSlug, savedAccessCode)
      : false);

  if (!hasAccess) {
    return (
      <EventAccessCodeForm
        eventName={shellEvent.name}
        eventSlug={eventSlug}
        error={error}
        nextPath={`/events/${eventSlug}/game-points`}
      />
    );
  }

  const event = await getPublicEventBySlug(eventSlug, savedAccessCode);

  return (
    <main className="display-surface min-h-screen overflow-hidden text-white">
      <GamePointsScoreboard
        eventId={event.id}
        eventName={event.name}
        eventSlug={event.slug}
        accessCode={savedAccessCode}
        initialTeams={event.teams}
      />
    </main>
  );
}
