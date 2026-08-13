import { notFound, redirect } from "next/navigation";

import { BasketballLiveCentre } from "@/components/basketball-live-centre";
import { EventAccessCodeForm } from "@/components/event-access-code-form";
import { getPublicBasketballTournaments } from "@/lib/basketball";
import { getPublicEventBySlug, getPublicEventShellBySlug } from "@/lib/events";
import { getViewerAccessCode } from "@/lib/viewer-access";

export default async function BasketballPage({ params, searchParams }: { params: Promise<{ eventSlug: string }>; searchParams: Promise<{ error?: string }> }) {
  const { eventSlug } = await params; const { error } = await searchParams; const code = await getViewerAccessCode(eventSlug);
  const [event, tournaments] = await Promise.all([getPublicEventBySlug(eventSlug, code), getPublicBasketballTournaments(eventSlug, code)]);
  if (!event) { const shell = await getPublicEventShellBySlug(eventSlug); return <EventAccessCodeForm eventName={shell.name} eventSlug={eventSlug} error={error} nextPath={`/events/${eventSlug}/basketball`} />; }
  if (event.sport !== "basketball") redirect(`/events/${event.slug}/football`);
  if (!tournaments) notFound();
  return <BasketballLiveCentre accessCode={code} eventId={event.id} eventName={event.name} eventSlug={event.slug} initialTeams={event.teams} initialTournaments={tournaments} />;
}
