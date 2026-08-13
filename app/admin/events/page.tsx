import { CalendarDays, Plus } from "lucide-react";
import Link from "next/link";

import { AdminEventNav } from "@/components/admin-event-nav";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdminUser } from "@/lib/auth";
import { getAdminEvents } from "@/lib/events";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const user = await requireAdminUser();
  const { error, message } = await searchParams;
  const events = await getAdminEvents(user?.id);
  const activeEvents = events.filter((event) => event.status !== "finished");
  const archivedEvents = events.filter((event) => event.status === "finished");

  function EventCards({ archived = false }: { archived?: boolean }) {
    const items = archived ? archivedEvents : activeEvents;

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StatusPill tone={archived ? "neutral" : "live"}>
                    {archived ? "Archived" : event.visibility}
                  </StatusPill>
                  <StatusPill tone="neutral">
                    {event.adminRole === "admin" ? "Shared" : "Owner"}
                  </StatusPill>
                </div>
                <span className="text-sm text-muted-foreground">
                  {event.sport === "basketball" ? "Basketball" : "Football"}
                </span>
              </div>
              <CardTitle>{event.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <CalendarDays className="h-4 w-4" />
                {event.dateLabel} / {event.location}
              </p>
              <div className={`grid gap-2 ${archived ? "" : "sm:grid-cols-2"}`}>
                <Button asChild>
                  <Link href={`/admin/events/${event.id}`}>
                    Manage tournament
                  </Link>
                </Button>
                {!archived ? (
                  <Button asChild variant="outline">
                    <Link href={`/events/${event.slug}`}>View public page</Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 md:py-8">
        <AdminEventNav />

        <header className="mb-7">
          <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
            Tournaments
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {activeEvents.length === 1
              ? "1 tournament"
              : `${activeEvents.length} tournaments`}
          </p>
        </header>

        {message ? (
          <p className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        {activeEvents.length ? (
          <EventCards />
        ) : (
          <div className="border-y border-slate-200 py-16 text-center">
            <h2 className="font-semibold text-slate-950">
              No active tournaments
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create your first football or basketball tournament.
            </p>
            <Button asChild className="mt-5">
              <Link href="/admin/events/new">
                <Plus className="h-4 w-4" />
                New tournament
              </Link>
            </Button>
          </div>
        )}

        {archivedEvents.length ? (
          <section className="mt-10 border-t border-slate-200 pt-7">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">
              Archived
            </h2>
            <EventCards archived />
          </section>
        ) : null}
      </section>
    </main>
  );
}
