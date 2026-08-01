import { CalendarDays, ShieldCheck, Trophy } from "lucide-react";

import { EventAccessCodeForm } from "@/components/event-access-code-form";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  eventRequiresViewerAccess,
  getPublicEventBySlug,
  getPublicEventShellBySlug,
  verifyViewerAccess,
} from "@/lib/events";
import { getViewerAccessCode } from "@/lib/viewer-access";

const futureAreas = [
  {
    title: "Fixtures",
    icon: CalendarDays,
  },
  {
    title: "Officials",
    icon: ShieldCheck,
  },
  {
    title: "Standings",
    icon: Trophy,
  },
];

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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-10">
      <div className="mb-8 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-normal text-slate-950">
          Football for {event.name}
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {futureAreas.map((area) => (
          <Card key={area.title}>
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-slate-950 text-white">
                <area.icon className="h-6 w-6" />
              </div>
              <CardTitle>{area.title}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </main>
  );
}
