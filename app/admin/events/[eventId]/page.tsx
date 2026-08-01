import { Monitor, ShieldCheck, Trophy } from "lucide-react";
import Link from "next/link";

import { updateViewerAccessCode } from "@/app/admin/events/actions";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdminUser } from "@/lib/auth";
import { getAdminEventById } from "@/lib/events";

export default async function AdminEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const user = await requireAdminUser();
  const { eventId } = await params;
  const { error, message } = await searchParams;
  const event = await getAdminEventById(eventId, user?.id, {
    includeTeams: false,
  });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
        <div>
          <StatusPill tone="live">Event admin</StatusPill>
          <h1 className="mt-4 text-3xl font-bold tracking-normal text-slate-950">
            {event.name}
          </h1>
        </div>
      </header>

      {message ? (
        <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Viewer access code</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={updateViewerAccessCode}
              className="grid gap-2 sm:grid-cols-[1fr_auto]"
            >
              <input name="event_id" type="hidden" value={event.id} />
              <Input
                name="access_code"
                defaultValue={event.viewerAccessCode ?? ""}
                placeholder="Leave blank for public access"
              />
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>

          <Card>
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-cyan-600 text-white">
                <Trophy className="h-6 w-6" />
              </div>
              <CardTitle>Game Points</CardTitle>
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
    </div>
  );
}
