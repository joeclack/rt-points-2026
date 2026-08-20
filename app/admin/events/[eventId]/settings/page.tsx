import { Archive, RotateCcw } from "lucide-react";

import {
  archiveEvent,
  restoreEvent,
  updateEventDetails,
  updateTeamSignups,
} from "@/app/admin/events/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdminUser } from "@/lib/auth";
import { getAdminEventById } from "@/lib/events";

function dateInputValue(dateLabel: string) {
  const date = new Date(`${dateLabel} 12:00:00 UTC`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export default async function AdminEventSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const user = await requireAdminUser();
  const { eventId } = await params;
  const { error, message } = await searchParams;
  const event = await getAdminEventById(eventId, user?.id);
  const isOwner = event.adminRole === "owner";

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-6 border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-semibold text-slate-950">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Update the tournament details shown to visitors.
        </p>
      </header>

      {message ? <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p> : null}
      {error ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}

      <Card>
        <CardHeader><CardTitle className="text-lg">Tournament details</CardTitle></CardHeader>
        <CardContent>
          <form action={updateEventDetails} className="grid gap-4 sm:grid-cols-2">
            <input name="event_id" type="hidden" value={event.id} />
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Name</span>
              <Input defaultValue={event.name} name="name" required />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Description</span>
              <Input defaultValue={event.description} name="description" />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Date</span>
              <Input defaultValue={dateInputValue(event.dateLabel)} name="event_date" required type="date" />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Location</span>
              <Input defaultValue={event.location} name="location" required />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Players per team</span>
              <Input defaultValue={event.teamSize} max={20} min={2} name="team_size" required type="number" />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Sport</span>
              <Input
                disabled
                value={event.sport === "basketball" ? "Basketball" : "Football"}
              />
            </label>
            {event.sport === "football" ? (
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Match length (minutes)
                </span>
                <Input
                  defaultValue={event.footballMatchMinutes}
                  max={180}
                  min={2}
                  name="football_match_minutes"
                  required
                  step={2}
                  type="number"
                />
                <span className="block text-xs text-slate-500">
                  Total playing time, split into two equal halves.
                </span>
              </label>
            ) : null}
            <PendingSubmitButton className="sm:col-span-2 sm:w-fit" pendingLabel="Saving..." type="submit">
              Save changes
            </PendingSubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg">Team signups</CardTitle>
            <span
              className={
                event.teamSignupsEnabled
                  ? "text-sm font-medium text-emerald-700"
                  : "text-sm font-medium text-slate-500"
              }
            >
              {event.teamSignupsEnabled ? "Open" : "Closed"}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <form action={updateTeamSignups} className="space-y-4">
            <input name="event_id" type="hidden" value={event.id} />
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-4">
              <input
                className="peer sr-only"
                defaultChecked={event.teamSignupsEnabled}
                name="team_signups_enabled"
                type="checkbox"
              />
              <span
                aria-hidden="true"
                className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-slate-300 transition-colors after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-emerald-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-slate-950 peer-focus-visible:ring-offset-2"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-950">
                  Accept team signups
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  Allow new teams to submit join requests for this tournament.
                </span>
              </span>
            </label>
            <PendingSubmitButton pendingLabel="Saving..." type="submit">
              Save signup setting
            </PendingSubmitButton>
          </form>
        </CardContent>
      </Card>

      {isOwner ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">
              {event.status === "finished"
                ? "Restore tournament"
                : "Archive tournament"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-slate-500">
              {event.status === "finished"
                ? "Restore public access and return this tournament to the active list."
                : "Hide this tournament from public pages while preserving its teams, fixtures and results."}
            </p>
            <form action={event.status === "finished" ? restoreEvent : archiveEvent}>
              <input name="event_id" type="hidden" value={event.id} />
              <PendingSubmitButton
                pendingLabel={event.status === "finished" ? "Restoring..." : "Archiving..."}
                type="submit"
                variant="outline"
              >
                {event.status === "finished" ? (
                  <RotateCcw className="h-4 w-4" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                {event.status === "finished" ? "Restore tournament" : "Archive tournament"}
              </PendingSubmitButton>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
