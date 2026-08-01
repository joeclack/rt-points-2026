import { CalendarDays, Plus } from "lucide-react";
import Link from "next/link";

import { AdminEventNav } from "@/components/admin-event-nav";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdminUser } from "@/lib/auth";
import { getAdminEvents } from "@/lib/events";

export default async function AdminEventsPage() {
  const user = await requireAdminUser();
  const events = await getAdminEvents(user?.id);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto w-full max-w-6xl px-6 pb-24 pt-6 md:py-8">
        <AdminEventNav />
        <header className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
          <div>
            <StatusPill tone="neutral">Admin</StatusPill>
            <h1 className="mt-4 text-3xl font-bold tracking-normal text-slate-950">
              Your events
            </h1>
            <p className="mt-2 hidden text-slate-600 sm:block">
              Create events and manage the trackers inside them.
            </p>
          </div>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/admin/events/new">
              <Plus className="h-4 w-4" />
              Create event
            </Link>
          </Button>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <StatusPill tone="live">{event.visibility}</StatusPill>
                  <span className="text-sm text-muted-foreground">
                    {event.trackers.length} tracker
                    {event.trackers.length === 1 ? "" : "s"}
                  </span>
                </div>
                <CardTitle>{event.name}</CardTitle>
                <CardDescription>{event.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <CalendarDays className="h-4 w-4" />
                  {event.dateLabel} · {event.location}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button asChild>
                    <Link href={`/admin/events/${event.id}`}>Manage event</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/events/${event.slug}`}>View public page</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
