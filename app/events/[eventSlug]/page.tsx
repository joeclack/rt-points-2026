import { ListOrdered, ShieldCheck, Trophy } from "lucide-react";
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
import { getEventBySlug } from "@/lib/sample-data";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  const event = getEventBySlug(eventSlug);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-10">
      <div className="mb-8 max-w-3xl">
        <StatusPill tone="live">{event.visibility}</StatusPill>
        <h1 className="mt-4 text-5xl font-bold tracking-normal text-slate-950">
          {event.name}
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          {event.description}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-cyan-600 text-white">
              <Trophy className="h-6 w-6" />
            </div>
            <CardTitle>Game Points</CardTitle>
            <CardDescription>
              Live team rankings, points, podium display, and final standings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href={`/events/${event.slug}/game-points`}>
                Open live scoreboard
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
              Fixtures, live match scores, officials, results, and standings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/events/${event.slug}/football`}>
                View football placeholder
              </Link>
            </Button>
          </CardContent>
        </Card>
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
              <span
                className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white"
                style={{ backgroundColor: team.colour }}
              >
                {team.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
