import { Monitor, Settings, ShieldCheck, Trophy } from "lucide-react";
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
import { requireAdminUser } from "@/lib/auth";
import { getAdminEventById } from "@/lib/events";

export default async function AdminEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const user = await requireAdminUser();
  const { eventId } = await params;
  const event = await getAdminEventById(eventId, user?.id, {
    includeTeams: false,
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto w-full max-w-6xl px-6 py-8">
        <header className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
          <div>
            <StatusPill tone="live">Event admin</StatusPill>
            <h1 className="mt-4 text-3xl font-bold tracking-normal text-slate-950">
              {event.name}
            </h1>
            <p className="mt-2 text-slate-600">
              Manage the trackers, teams, visibility, and public pages for this
              event.
            </p>
          </div>
          <Button variant="outline">
            <Settings className="h-4 w-4" />
            Event settings
          </Button>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-cyan-600 text-white">
                <Trophy className="h-6 w-6" />
              </div>
              <CardTitle>Game Points</CardTitle>
              <CardDescription>
                Manage teams, score controls, colours, badges, and standings.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <Button asChild>
                <Link href={`/admin/events/${event.id}/game-points`}>
                  Manage scores
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/events/${event.slug}/game-points`}>
                  <Monitor className="h-4 w-4" />
                  Public display
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-slate-950 text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <CardTitle>Football</CardTitle>
              <CardDescription>
                Future match tracking for fixtures, officials, live scores, and
                tables.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/events/${event.slug}/football`}>
                  View placeholder
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
