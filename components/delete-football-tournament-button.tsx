"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { deleteFootballTournament } from "@/app/admin/events/[eventId]/football/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
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

export function DeleteFootballTournamentButton({
  eventId,
  matchCount,
  tournamentId,
  tournamentName,
}: {
  eventId: string;
  matchCount: number;
  tournamentId: string;
  tournamentName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button
          className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
          type="button"
          variant="outline"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete tournament</DialogTitle>
          <DialogDescription>
            This will delete {tournamentName}, including {matchCount} fixture
            {matchCount === 1 ? "" : "s"}, scores and match history.
          </DialogDescription>
        </DialogHeader>
        <form
          action={deleteFootballTournament}
          className="space-y-4"
          onSubmit={() => setOpen(false)}
        >
          <input name="event_id" type="hidden" value={eventId} />
          <input name="tournament_id" type="hidden" value={tournamentId} />
          <Input
            aria-label="Type DELETE to confirm tournament deletion"
            name="confirm"
            placeholder="Type DELETE"
          />
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <PendingSubmitButton pendingLabel="Deleting..." type="submit">
              <Trash2 className="h-4 w-4" />
              Delete tournament
            </PendingSubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
