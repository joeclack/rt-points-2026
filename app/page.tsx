import { ArrowRight, CalendarDays, LogIn, Search } from "lucide-react";
import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchPublicEvents } from "@/lib/events";

export default async function HomePage() {
  const events = await searchPublicEvents();

  return (
    <main className="min-h-screen">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-10">
        <div className="mb-10 max-w-3xl">
          <StatusPill tone="neutral">rt-points-2026</StatusPill>
          <h1 className="mt-5 text-4xl font-bold tracking-normal text-slate-950 sm:text-6xl">
            Find a live event or manage your own.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Viewers can search public events without an account. Admins log in
            to create events, manage teams, and run live trackers.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Search public events</CardTitle>
                  <CardDescription>
                    Open an event to view Game Points and future Football pages.
                  </CardDescription>
                </div>
                <Search className="h-5 w-5 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-2">
                <Input
                  aria-label="Search events"
                  defaultValue="The Jesus Generation"
                  placeholder="Search by event name"
                />
                <Button type="button">Search</Button>
              </div>
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
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {event.description}
                      </p>
                      <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                        <CalendarDays className="h-4 w-4" />
                        {event.dateLabel} · {event.location}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-slate-950 text-white">
                <LogIn className="h-6 w-6" />
              </div>
              <CardTitle>Admin access</CardTitle>
              <CardDescription>
                Sign in with Supabase Auth to create and manage events.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/signup">Create account</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
