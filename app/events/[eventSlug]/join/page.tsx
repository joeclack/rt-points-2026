import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { EventAccessCodeForm } from "@/components/event-access-code-form";
import { TeamJoinForm } from "@/components/team-join-form";
import {
  getPublicEventBySlug,
  getPublicEventShellBySlug,
} from "@/lib/events";
import { getViewerAccessCode } from "@/lib/viewer-access";

export default async function TeamJoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string }>;
  searchParams: Promise<{ error?: string; join_error?: string }>;
}) {
  const { eventSlug } = await params;
  const { error, join_error: joinError } = await searchParams;
  const savedAccessCode = await getViewerAccessCode(eventSlug);
  const event = await getPublicEventBySlug(eventSlug, savedAccessCode);

  if (!event) {
    const shellEvent = await getPublicEventShellBySlug(eventSlug);

    return (
      <EventAccessCodeForm
        eventName={shellEvent.name}
        eventSlug={eventSlug}
        error={error}
        nextPath={`/events/${eventSlug}/join`}
      />
    );
  }

  return (
    <main className="min-h-screen bg-brand-cream">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
          href={`/events/${event.slug}`}
        >
          <ArrowLeft className="h-4 w-4" />
          {event.name}
        </Link>
        <TeamJoinForm
          error={joinError}
          eventSlug={event.slug}
          teamSize={event.teamSize}
        />
      </div>
    </main>
  );
}
