import { EventAccessCodeForm } from "@/components/event-access-code-form";
import { FootballLiveCentre } from "@/components/football-live-centre";
import {
  eventRequiresViewerAccess,
  getPublicEventBySlug,
  getPublicEventShellBySlug,
  verifyViewerAccess,
} from "@/lib/events";
import { getPublicFootballTournaments } from "@/lib/football";
import { getViewerAccessCode } from "@/lib/viewer-access";

export default async function EventFootballPage({
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
        nextPath={`/events/${eventSlug}/football`}
      />
    );
  }

  const event = await getPublicEventBySlug(eventSlug, savedAccessCode);
  const tournaments = await getPublicFootballTournaments(
    eventSlug,
    savedAccessCode,
  );

  return (
    <FootballLiveCentre
      accessCode={savedAccessCode}
      eventId={event.id}
      eventName={event.name}
      eventSlug={event.slug}
      initialTeams={event.teams}
      initialTournaments={tournaments}
    />
  );
}
