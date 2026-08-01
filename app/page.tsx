import { CalendarDays } from "lucide-react";
import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { searchPublicEvents } from "@/lib/events";

export default async function HomePage() {
  const events = await searchPublicEvents();

  return (
    <main className="min-h-screen">
      <section className="mx-auto w-full max-w-5xl px-6 py-8">
        <header className="mb-8 flex items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold tracking-normal text-slate-950">
            Find event
          </h1>
          <Button asChild size="sm" variant="outline">
            <Link href="/login">Log in</Link>
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Public events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="flex flex-col gap-3 rounded-md border border-border p-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-950">
                        {event.name}
                      </h2>
                      <StatusPill tone="live">{event.visibility}</StatusPill>
                    </div>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                      <CalendarDays className="h-4 w-4" />
                      {event.dateLabel} · {event.location}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
