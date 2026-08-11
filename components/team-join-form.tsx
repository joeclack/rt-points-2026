import { Send, UsersRound } from "lucide-react";

import { submitTeamJoinRequest } from "@/app/events/[eventSlug]/join/actions";
import { Button } from "@/components/ui/button";
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
  message,
}: {
  eventSlug: string;
  error?: string;
  message?: string;
}) {
  const playerFields = [
    { label: "Your name (team leader)", name: "player_1" },
    { label: "Player 2", name: "player_2" },
    { label: "Player 3", name: "player_3" },
    { label: "Player 4", name: "player_4" },
    { label: "Player 5", name: "player_5" },
  ];

  return (
    <Card id="join">
      <CardHeader>
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-cyan-100 text-cyan-800">
          <UsersRound className="h-5 w-5" />
        </div>
        <CardTitle>Submit your team</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={submitTeamJoinRequest} className="space-y-5">
          <input name="event_slug" type="hidden" value={eventSlug} />

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
              Five-player squad
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

          {message ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <Button className="w-full" type="submit">
            <Send className="h-4 w-4" />
            Send join request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
