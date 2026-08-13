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

export default async function AdminEventsPage() {
  const user = await requireAdminUser();
  const events = await getAdminEvents(user?.id);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 md:py-8">
        <AdminEventNav />

        <header className="mb-7">
          <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
            Tournaments
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {events.length === 1
              ? "1 tournament"
              : `${events.length} tournaments`}
          </p>
        </header>

        {events.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <StatusPill tone="live">{event.visibility}</StatusPill>
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
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button asChild>
                      <Link href={`/admin/events/${event.id}`} prefetch>
                        Manage tournament
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={`/events/${event.slug}`}>View public page</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="border-y border-slate-200 py-16 text-center">
            <h2 className="font-semibold text-slate-950">No tournaments yet</h2>
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
      </section>
    </main>
  );
}
