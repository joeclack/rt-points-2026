"use client";

import { Send, UsersRound } from "lucide-react";
import type { FormEvent } from "react";

import { submitTeamJoinRequest } from "@/app/events/[eventSlug]/join/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function TeamJoinForm({
  eventSlug,
  error,
  teamSize,
}: {
  eventSlug: string;
  error?: string;
  teamSize: number;
}) {
  const playerFields = Array.from({ length: teamSize }, (_, index) => ({
    label: index === 0 ? "Your name (team leader)" : `Player ${index + 1}`,
    name: `player_${index + 1}`,
  }));

  function prepareSubmission(event: FormEvent<HTMLFormElement>) {
    const input = event.currentTarget.elements.namedItem("submission_id");
    if (input instanceof HTMLInputElement && !input.value) {
      input.value = crypto.randomUUID();
    }
  }

  return (
    <Card id="join">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersRound className="h-5 w-5 text-slate-500" />
          Submit your team
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={submitTeamJoinRequest}
          className="space-y-5"
          onSubmit={prepareSubmission}
        >
          <input name="event_slug" type="hidden" value={eventSlug} />
          <input name="team_size" type="hidden" value={teamSize} />
          <input name="submission_id" type="hidden" />

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Team name
              </span>
              <Input
                maxLength={60}
                minLength={2}
                name="team_name"
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Team colour
              </span>
              <Input
                aria-label="Team colour"
                className="cursor-pointer p-1"
                defaultValue="#14b8a6"
                name="team_colour"
                type="color"
              />
            </label>
          </div>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-slate-950">
              {teamSize}-player squad
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {playerFields.map((field, index) => (
                <label
                  className={index === 0 ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}
                  key={field.name}
                >
                  <span className="text-sm font-medium text-slate-700">
                    {field.label}
                  </span>
                  <Input
                    autoComplete="name"
                    maxLength={80}
                    minLength={2}
                    name={field.name}
                    required
                  />
                </label>
              ))}
            </div>
          </fieldset>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <PendingSubmitButton
            className="w-full"
            pendingLabel="Submitting..."
            type="submit"
          >
            <Send className="h-4 w-4" />
            Send join request
          </PendingSubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
