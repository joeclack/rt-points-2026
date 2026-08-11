import { ListOrdered, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { EventAccessCodeForm } from "@/components/event-access-code-form";
import { TeamBadge } from "@/components/team-badge";
import { TeamJoinForm } from "@/components/team-join-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string }>;
  searchParams: Promise<{
    error?: string;
    join_error?: string;
    join_message?: string;
  }>;
}) {
  const { eventSlug } = await params;
  const { error, join_error: joinError, join_message: joinMessage } =
    await searchParams;
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
        nextPath={`/events/${eventSlug}`}
      />
    );
  }

  const event = await getPublicEventBySlug(eventSlug, savedAccessCode);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-10">
      <div className="mb-8 max-w-3xl">
        <h1 className="text-5xl font-bold tracking-normal text-slate-950">
          {event.name}
        </h1>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-slate-950 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle>Football</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href={`/events/${event.slug}/football`}>
                Open match centre
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <TeamJoinForm
          error={joinError}
          eventSlug={event.slug}
          message={joinMessage}
        />
      </div>

      <div className="mt-6 rounded-lg border border-border bg-white p-6">
        <div className="flex items-center gap-3">
          <ListOrdered className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-950">Teams</h2>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {event.teams.map((team) => (
            <div
              key={team.id}
              className="flex items-center justify-between rounded-md bg-slate-50 px-4 py-3"
            >
              <span className="font-medium text-slate-800">{team.name}</span>
              <TeamBadge
                badge={team.badge}
                badgeUrl={team.badgeUrl}
                className="h-8 w-8 text-sm"
                colour={team.colour}
                name={team.name}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
