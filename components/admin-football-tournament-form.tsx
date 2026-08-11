"use client";

import { Brackets, Check, ListOrdered } from "lucide-react";
import { useState } from "react";

import { createFootballTournament } from "@/app/admin/events/[eventId]/football/actions";
import { TeamBadge } from "@/components/team-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/sample-data";

export function AdminFootballTournamentForm({
  eventId,
  teams,
}: {
  eventId: string;
  teams: Team[];
}) {
  const [format, setFormat] = useState<"league" | "knockout">("league");
  const [startStage, setStartStage] = useState<
    "quarter_final" | "semi_final" | "final"
  >(
    teams.length >= 8
      ? "quarter_final"
      : teams.length >= 4
        ? "semi_final"
        : "final",
  );

  return (
    <form action={createFootballTournament} className="space-y-6">
      <input name="event_id" type="hidden" value={eventId} />
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-800" htmlFor="name">
          Tournament name
        </label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Summer Cup"
          required
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-800">
          Tournament type
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={cn(
              "cursor-pointer rounded-lg border-2 p-4 transition",
              format === "league"
                ? "border-cyan-600 bg-cyan-50"
                : "border-slate-200 bg-white hover:border-slate-300",
            )}
          >
            <input
              checked={format === "league"}
              className="sr-only"
              name="format"
              onChange={() => setFormat("league")}
              type="radio"
              value="league"
            />
            <ListOrdered className="h-5 w-5 text-cyan-700" />
            <span className="mt-3 block font-semibold text-slate-950">
              League table
            </span>
            <span className="mt-1 block text-sm text-slate-600">
              Every team plays every other team. Win 3, draw 1, loss 0.
            </span>
          </label>
          <label
            className={cn(
              "cursor-pointer rounded-lg border-2 p-4 transition",
              format === "knockout"
                ? "border-cyan-600 bg-cyan-50"
                : "border-slate-200 bg-white hover:border-slate-300",
            )}
          >
            <input
              checked={format === "knockout"}
              className="sr-only"
              name="format"
              onChange={() => setFormat("knockout")}
              type="radio"
              value="knockout"
            />
            <Brackets className="h-5 w-5 text-cyan-700" />
            <span className="mt-3 block font-semibold text-slate-950">
              Knockout cup
            </span>
            <span className="mt-1 block text-sm text-slate-600">
              Quarter-finals, semi-finals and final with winner progression.
            </span>
          </label>
        </div>
      </fieldset>

      {format === "knockout" ? (
        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-slate-800"
            htmlFor="start-stage"
          >
            Opening round
          </label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            id="start-stage"
            name="start_stage"
            onChange={(event) =>
              setStartStage(event.target.value as typeof startStage)
            }
            value={startStage}
          >
            <option value="quarter_final">Quarter-finals — 8 teams</option>
            <option value="semi_final">Semi-finals — 4 teams</option>
            <option value="final">Final only — 2 teams</option>
          </select>
          <p className="text-xs text-slate-500">
            Select exactly{" "}
            {startStage === "quarter_final"
              ? "8"
              : startStage === "semi_final"
                ? "4"
                : "2"}{" "}
            teams below.
          </p>
        </div>
      ) : (
        <input name="start_stage" type="hidden" value="" />
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-800">
          Football teams
        </legend>
        <p className="text-sm text-slate-500">
          Teams are seeded for knockout matches in the order shown.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {teams.map((team) => (
            <label
              className="group flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-cyan-300"
              key={team.id}
            >
              <input
                className="peer sr-only"
                defaultChecked
                name="team_ids"
                type="checkbox"
                value={team.id}
              />
              <span className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 text-transparent peer-checked:border-cyan-600 peer-checked:bg-cyan-600 peer-checked:text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
              <TeamBadge
                badge={team.badge}
                badgeUrl={team.badgeUrl}
                className="h-9 w-9 text-sm"
                colour={team.colour}
                name={team.name}
              />
              <span className="font-medium text-slate-900">{team.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Button className="w-full sm:w-auto" type="submit">
        Create tournament & fixtures
      </Button>
    </form>
  );
}
