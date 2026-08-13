import { notFound, redirect } from "next/navigation";

import { EventAccessCodeForm } from "@/components/event-access-code-form";
import { FootballLiveCentre } from "@/components/football-live-centre";
import {
  getPublicEventBySlug,
  getPublicEventShellBySlug,
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
  const savedAccessCode = await getViewerAccessCode(eventSlug);
  const [event, tournaments] = await Promise.all([
    getPublicEventBySlug(eventSlug, savedAccessCode),
    getPublicFootballTournaments(eventSlug, savedAccessCode),
  ]);

  if (!event) {
    const shellEvent = await getPublicEventShellBySlug(eventSlug);

    return (
      <EventAccessCodeForm
        eventName={shellEvent.name}
        eventSlug={eventSlug}
        error={error}
        nextPath={`/events/${eventSlug}/football`}
      />
    );
  }

  if (event.sport !== "football") {
    redirect(`/events/${event.slug}/basketball`);
  }

  if (!tournaments) {
    notFound();
  }

  return (
    <FootballLiveCentre
      accessCode={savedAccessCode}
      eventId={event.id}
      eventName={event.name}
      eventSlug={event.slug}
      matchMinutes={event.footballMatchMinutes}
      initialTeams={event.teams}
      initialTournaments={tournaments}
    />
  );
}
