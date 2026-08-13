import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  MapPin,
  Monitor,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { EventAccessCodeForm } from "@/components/event-access-code-form";
import {
  getPublicEventBySlug,
  getPublicEventShellBySlug,
} from "@/lib/events";
import { getViewerAccessCode } from "@/lib/viewer-access";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventSlug } = await params;
  const { error } = await searchParams;
  const savedAccessCode = await getViewerAccessCode(eventSlug);
  const event = await getPublicEventBySlug(eventSlug, savedAccessCode);

  if (!event) {
    const shellEvent = await getPublicEventShellBySlug(eventSlug);

    return (
      <EventAccessCodeForm
        eventName={shellEvent.name}
        eventSlug={eventSlug}
        error={error}
        nextPath={`/events/${eventSlug}`}
      />
    );
  }

  const actions = [
    {
      description:
        event.sport === "basketball"
          ? "Games, live points, results and standings"
          : "Fixtures, live scores, results and standings",
      href: `/events/${event.slug}/${event.sport}`,
      icon: Monitor,
      label: "View tournament",
    },
    {
      description: `Enter a ${event.teamSize}-player team for approval`,
      href: `/events/${event.slug}/join`,
      icon: UsersRound,
      label: "Submit team",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
          href="/"
        >
          <ArrowLeft className="h-4 w-4" />
          Tournaments
        </Link>

        <header className="border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-semibold text-slate-950 sm:text-4xl">
            {event.name}
          </h1>
          {event.description ? (
            <p className="mt-3 max-w-2xl text-slate-600">{event.description}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {event.dateLabel}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {event.location}
            </span>
          </div>
        </header>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="divide-y divide-slate-100">
            {actions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  className="flex items-center gap-4 px-4 py-5 transition-colors hover:bg-slate-50 sm:px-5"
                  href={action.href}
                  key={action.label}
                >
                  <Icon className="h-5 w-5 shrink-0 text-slate-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-950">
                      {action.label}
                    </span>
                    <span className="mt-0.5 block text-sm text-slate-500">
                      {action.description}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
