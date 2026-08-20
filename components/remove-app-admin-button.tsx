"use client";

import { UserMinus } from "lucide-react";

import { removeAppAdmin } from "@/app/admin/admins/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type RemoveAppAdminButtonProps = {
  displayName: string;
  email: string;
  invitationPending: boolean;
  userId: string;
};

export function RemoveAppAdminButton({
  displayName,
  email,
  invitationPending,
  userId,
}: RemoveAppAdminButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          aria-label={`Remove ${displayName}`}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          size="icon"
          title={`Remove ${displayName}`}
          type="button"
          variant="ghost"
        >
          <UserMinus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {invitationPending ? "Cancel invitation?" : `Remove ${displayName}?`}
          </DialogTitle>
          <DialogDescription>
            {invitationPending
              ? `The invitation for ${email} will stop working and the pending admin account will be deleted.`
              : `${displayName}'s sign-in account and all admin access will be deleted. Any tournaments they own will be transferred to your account.`}
          </DialogDescription>
        </DialogHeader>
        <form action={removeAppAdmin} className="flex justify-end gap-3">
          <input name="user_id" type="hidden" value={userId} />
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Keep admin
            </Button>
          </DialogClose>
          <PendingSubmitButton
            className="bg-red-600 text-white hover:bg-red-700"
            pendingLabel="Removing..."
            type="submit"
          >
            <UserMinus className="h-4 w-4" />
            {invitationPending ? "Cancel invitation" : "Remove admin"}
          </PendingSubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
