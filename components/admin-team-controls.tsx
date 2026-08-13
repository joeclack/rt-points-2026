"use client";

import { Pencil, Plus, Save, Trash2, Users } from "lucide-react";
import { useState } from "react";

import {
  createTeam,
  deleteTeam,
  updateTeam,
} from "@/app/admin/events/[eventId]/teams/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { TeamBadge } from "@/components/team-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Team } from "@/lib/sample-data";

type AdminTeamControlsProps = {
  eventId: string;
  teams: Team[];
};

export function AdminTeamControls({ eventId, teams }: AdminTeamControlsProps) {
  const [settingsTeamId, setSettingsTeamId] = useState<string | null>(null);

  return (
    <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Teams
          </CardTitle>
          <span className="text-sm font-medium text-slate-500">
            {teams.length} total
          </span>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 p-6 text-center">
              <p className="font-semibold text-slate-950">No teams yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Add at least two teams to create football fixtures.
              </p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {teams.map((team) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
                  key={team.id}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <TeamBadge
                      badge={team.badge}
                      badgeUrl={team.badgeUrl}
                      className="h-9 w-9 shrink-0 text-sm"
                      colour={team.colour}
                      name={team.name}
                    />
                    <span className="truncate text-sm font-semibold text-slate-950">
                      {team.name}
                    </span>
                  </div>
                  <Dialog
                    open={settingsTeamId === team.id}
                    onOpenChange={(open) =>
                      setSettingsTeamId(open ? team.id : null)
                    }
                  >
                    <DialogTrigger asChild>
                      <Button
                        aria-label={`Edit ${team.name}`}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{team.name} settings</DialogTitle>
                        <DialogDescription>
                          Update this team&apos;s football display details or remove
                          it from the tournament.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-5">
                        <form
                          action={updateTeam}
                          className="space-y-3"
                          onSubmit={() => setSettingsTeamId(null)}
                        >
                          <input name="event_id" type="hidden" value={eventId} />
                          <input name="team_id" type="hidden" value={team.id} />
                          <Input
                            aria-label="Team name"
                            defaultValue={team.name}
                            name="name"
                            required
                          />
                          <div className="grid grid-cols-[72px_1fr] gap-3">
                            <Input
                              aria-label="Team colour"
                              className="h-10 p-1"
                              defaultValue={team.colour}
                              name="colour"
                              type="color"
                            />
                            <Input
                              aria-label="Team badge"
                              className="uppercase"
                              defaultValue={team.badge}
                              maxLength={3}
                              name="badge_text"
                            />
                          </div>
                          <Input
                            aria-label="Team badge image URL"
                            defaultValue={team.badgeUrl ?? ""}
                            name="badge_url"
                            placeholder="Badge image URL"
                            type="url"
                          />
                          <PendingSubmitButton
                            className="w-full"
                            pendingLabel="Saving..."
                            type="submit"
                          >
                            <Save className="h-4 w-4" />
                            Save team
                          </PendingSubmitButton>
                        </form>

                        <form
                          action={deleteTeam}
                          className="space-y-3 border-t border-slate-200 pt-5"
                          onSubmit={() => setSettingsTeamId(null)}
                        >
                          <input name="event_id" type="hidden" value={eventId} />
                          <input name="team_id" type="hidden" value={team.id} />
                          <Input
                            aria-label="Type DELETE to confirm team deletion"
                            name="confirm"
                            placeholder="Type DELETE"
                          />
                          <PendingSubmitButton
                            className="w-full"
                            pendingLabel="Deleting..."
                            type="submit"
                            variant="secondary"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete team
                          </PendingSubmitButton>
                        </form>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add team</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTeam} className="space-y-3">
            <input name="event_id" type="hidden" value={eventId} />
            <Input name="name" placeholder="Team name" required />
            <div className="grid grid-cols-[72px_1fr] gap-3">
              <Input
                aria-label="Team colour"
                className="h-10 p-1"
                defaultValue="#14b8a6"
                name="colour"
                type="color"
              />
              <Input
                className="uppercase"
                maxLength={3}
                name="badge_text"
                placeholder="Badge"
              />
            </div>
            <Input name="badge_url" placeholder="Badge image URL" type="url" />
            <PendingSubmitButton
              className="w-full"
              pendingLabel="Adding..."
              type="submit"
            >
              <Plus className="h-4 w-4" />
              Add team
            </PendingSubmitButton>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
