"use client";

import { Plus, RotateCcw } from "lucide-react";
import { useState } from "react";

import {
  createTeam,
  resetScores,
} from "@/app/admin/events/[eventId]/game-points/actions";
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

type AdminGamePointsPageActionsProps = {
  eventId: string;
};

export function AdminGamePointsPageActions({
  eventId,
}: AdminGamePointsPageActionsProps) {
  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const [resetScoresOpen, setResetScoresOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog open={addTeamOpen} onOpenChange={setAddTeamOpen}>
        <DialogTrigger asChild>
          <Button className="hidden sm:inline-flex">
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
          <form
            action={createTeam}
            className="space-y-4"
            onSubmit={() => setAddTeamOpen(false)}
          >
            <input name="event_id" type="hidden" value={eventId} />
            <label className="block text-sm font-medium text-slate-700">
              Team name
              <Input className="mt-1" name="name" placeholder="Zion" required />
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

      <Dialog open={resetScoresOpen} onOpenChange={setResetScoresOpen}>
        <DialogTrigger asChild>
          <Button className="hidden sm:inline-flex" variant="secondary">
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
          <form
            action={resetScores}
            className="space-y-3"
            onSubmit={() => setResetScoresOpen(false)}
          >
            <input name="event_id" type="hidden" value={eventId} />
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
    </div>
  );
}
