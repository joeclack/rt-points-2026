import {
  BadgePlus,
  Plus,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

import {
  createTeam,
  resetScores,
} from "@/app/admin/events/[eventId]/game-points/actions";
import { AdminGamePointsControls } from "@/components/admin-game-points-controls";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { requireAdminUser } from "@/lib/auth";
import { getAdminEventById } from "@/lib/events";

export default async function AdminEventGamePointsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  await requireAdminUser();
  const { eventId } = await params;
  const { error, message } = await searchParams;
  const event = await getAdminEventById(eventId);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto w-full max-w-7xl px-6 py-8">
        <header className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end">
          <div>
            <StatusPill tone="live">Game Points Admin</StatusPill>
            <h1 className="mt-4 text-3xl font-bold tracking-normal text-slate-950">
              {event.name}
            </h1>
            <p className="mt-2 text-slate-600">
              Create teams, adjust live scores, and manage the audience
              scoreboard for this event.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  Add team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add team</DialogTitle>
                  <DialogDescription>
                    Create a team for this event and choose its display badge.
                  </DialogDescription>
                </DialogHeader>
                <form action={createTeam} className="space-y-4">
                  <input name="event_id" type="hidden" value={event.id} />
                  <label className="block text-sm font-medium text-slate-700">
                    Team name
                    <Input
                      className="mt-1"
                      name="name"
                      placeholder="Zion"
                      required
                    />
                  </label>
                  <div className="grid grid-cols-[72px_1fr] gap-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Colour
                      <Input
                        className="mt-1 h-10 p-1"
                        name="colour"
                        type="color"
                        defaultValue="#14b8a6"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Badge
                      <Input
                        className="mt-1 uppercase"
                        maxLength={3}
                        name="badge_text"
                        placeholder="Z"
                      />
                    </label>
                  </div>
                  <label className="block text-sm font-medium text-slate-700">
                    Badge image URL
                    <Input
                      className="mt-1"
                      name="badge_url"
                      placeholder="https://..."
                      type="url"
                    />
                  </label>
                  <Button className="w-full" type="submit">
                    <Plus className="h-4 w-4" />
                    Add team
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">
                  <RotateCcw className="h-4 w-4" />
                  Reset scores
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset scores</DialogTitle>
                  <DialogDescription>
                    Set every team in this event back to zero.
                  </DialogDescription>
                </DialogHeader>
                <form action={resetScores} className="space-y-3">
                  <input name="event_id" type="hidden" value={event.id} />
                  <Input
                    name="confirm"
                    placeholder="Type RESET"
                    aria-label="Type RESET to confirm"
                  />
                  <Button className="w-full" type="submit" variant="secondary">
                    <RotateCcw className="h-4 w-4" />
                    Reset all scores
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button asChild variant="outline">
              <Link href={`/events/${event.slug}/game-points`}>
                Public display
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/admin/events/${event.id}`}>Event dashboard</Link>
            </Button>
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

        <div>
          <AdminGamePointsControls eventId={event.id} initialTeams={event.teams} />
        </div>
      </section>
    </main>
  );
}
